import csv
import io
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from ..auth import verify_token
from ..database import get_db
from ..models import Guest, GuestPhoto, RegistrationBatch
from ..schemas import BatchCreate, BatchResponse, GuestResponse

router = APIRouter()

# CSV 列顺序：必填在前，选填在后，最后是元数据
CSV_HEADERS = [
    "登记时间", "批次", "房间",
    "姓名", "电话", "住址", "照片数量",
    "入住日期", "离开日期", "职业", "年龄", "性别", "国籍", "护照号",
]


def _guest_to_row(g: Guest, b: RegistrationBatch) -> dict:
    return {
        "id": str(g.id),
        "batch_id": str(g.batch_id),
        "batch_title": b.title,
        "room_number": b.room_number,
        "submitted_at": g.submitted_at.isoformat() if g.submitted_at else None,
        "name": g.name,
        "phone": g.phone,
        "address": g.address,
        "photos": [p.filename for p in g.photos],
        "arrival_date": str(g.arrival_date) if g.arrival_date else None,
        "departure_date": str(g.departure_date) if g.departure_date else None,
        "occupation": g.occupation,
        "age": g.age,
        "gender": g.gender,
        "nationality": g.nationality,
        "passport_number": g.passport_number,
    }


def _write_csv_rows(writer, guests_with_batch):
    writer.writerow(CSV_HEADERS)
    for g, b in guests_with_batch:
        submitted = g.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if g.submitted_at else ""
        gender_label = {"M": "男", "F": "女"}.get(g.gender or "", g.gender or "")
        writer.writerow([
            submitted, b.title, b.room_number or "",
            g.name or "", g.phone or "", g.address or "",
            len(g.photos),
            str(g.arrival_date) if g.arrival_date else "",
            str(g.departure_date) if g.departure_date else "",
            g.occupation or "", g.age or "", gender_label,
            g.nationality or "", g.passport_number or "",
        ])


@router.get("/guests/all")
def list_all_guests(db: Session = Depends(get_db), _: str = Depends(verify_token)):
    """Return every guest record joined with its batch info and photos, newest first."""
    rows = (
        db.query(Guest, RegistrationBatch)
        .options(joinedload(Guest.photos))
        .join(RegistrationBatch, Guest.batch_id == RegistrationBatch.id)
        .order_by(Guest.submitted_at.desc())
        .all()
    )
    return [_guest_to_row(g, b) for g, b in rows]


@router.get("/export/all")
def export_all_csv(db: Session = Depends(get_db), _: str = Depends(verify_token)):
    """Export ALL guests across all batches as a single UTF-8 CSV (with BOM for Excel)."""
    rows = (
        db.query(Guest, RegistrationBatch)
        .options(joinedload(Guest.photos))
        .join(RegistrationBatch, Guest.batch_id == RegistrationBatch.id)
        .order_by(Guest.submitted_at.desc())
        .all()
    )
    output = io.StringIO()
    writer = csv.writer(output)
    _write_csv_rows(writer, rows)
    output.seek(0)

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"all_guests_{now}.csv"
    return StreamingResponse(
        iter(["\ufeff" + output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/batches", response_model=List[BatchResponse])
def list_batches(db: Session = Depends(get_db), _: str = Depends(verify_token)):
    batches = (
        db.query(RegistrationBatch)
        .order_by(RegistrationBatch.created_at.desc())
        .all()
    )
    result = []
    for batch in batches:
        count = (
            db.query(func.count(Guest.id))
            .filter(Guest.batch_id == batch.id)
            .scalar()
        )
        result.append(
            BatchResponse(
                id=batch.id,
                title=batch.title,
                room_number=batch.room_number,
                created_at=batch.created_at,
                expires_at=batch.expires_at,
                status=batch.status,
                guest_count=count,
            )
        )
    return result


@router.post("/batches", response_model=BatchResponse)
def create_batch(
    data: BatchCreate,
    db: Session = Depends(get_db),
    _: str = Depends(verify_token),
):
    expires_at = datetime.now(timezone.utc) + timedelta(hours=data.expires_hours)
    batch = RegistrationBatch(
        title=data.title,
        room_number=data.room_number,
        expires_at=expires_at,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return BatchResponse(
        id=batch.id,
        title=batch.title,
        room_number=batch.room_number,
        created_at=batch.created_at,
        expires_at=batch.expires_at,
        status=batch.status,
        guest_count=0,
    )


@router.put("/batches/{batch_id}/close")
def close_batch(
    batch_id: UUID,
    db: Session = Depends(get_db),
    _: str = Depends(verify_token),
):
    batch = db.query(RegistrationBatch).filter(RegistrationBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    batch.status = "closed"
    db.commit()
    return {"message": "Batch closed"}


@router.get("/batches/{batch_id}/guests", response_model=List[GuestResponse])
def list_batch_guests(
    batch_id: UUID,
    db: Session = Depends(get_db),
    _: str = Depends(verify_token),
):
    return db.query(Guest).filter(Guest.batch_id == batch_id).all()


@router.get("/batches/{batch_id}/export")
def export_csv(
    batch_id: UUID,
    db: Session = Depends(get_db),
    _: str = Depends(verify_token),
):
    batch = db.query(RegistrationBatch).filter(RegistrationBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    guests = db.query(Guest).filter(Guest.batch_id == batch_id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "ID", "主客", "フリガナ", "お名前", "性别", "電話",
            "生年月日", "年齢", "住所", "職業", "国籍",
            "旅券番号", "前泊地", "行先地", "到着日", "出発日",
            "登録日時", "IP",
        ]
    )
    for g in guests:
        writer.writerow(
            [
                str(g.id), "○" if g.is_primary else "", g.furigana, g.name,
                g.gender, g.phone or "", g.date_of_birth, g.age, g.address,
                g.occupation, g.nationality, g.passport_number, g.previous_stay,
                g.destination, g.arrival_date, g.departure_date,
                g.submitted_at.strftime("%Y-%m-%d %H:%M:%S"), g.submission_ip or "",
            ]
        )
    output.seek(0)

    safe_title = batch.title.replace("/", "-").replace(" ", "_")
    filename = f"guests_{safe_title}_{str(batch_id)[:8]}.csv"
    return StreamingResponse(
        iter(["\ufeff" + output.getvalue()]),  # BOM for Excel UTF-8
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/guests/{guest_id}")
def delete_guest(
    guest_id: UUID,
    db: Session = Depends(get_db),
    _: str = Depends(verify_token),
):
    guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="住客记录不存在")

    # 删除磁盘上的照片文件
    for photo in guest.photos:
        p = Path(photo.filename)
        p.unlink(missing_ok=True)

    db.delete(guest)
    db.commit()
    return {"message": "删除成功"}


@router.delete("/batches/{batch_id}/all")
def delete_batch_all(
    batch_id: UUID,
    db: Session = Depends(get_db),
    _: str = Depends(verify_token),
):
    """删除某批次下的所有住客记录及其照片，同时删除批次本身。"""
    batch = db.query(RegistrationBatch).filter(RegistrationBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    guests = db.query(Guest).options(joinedload(Guest.photos)).filter(Guest.batch_id == batch_id).all()
    for g in guests:
        for photo in g.photos:
            Path(photo.filename).unlink(missing_ok=True)
        db.delete(g)

    db.delete(batch)
    db.commit()
    return {"message": f"已删除批次及 {len(guests)} 条住客记录"}


@router.get("/export/photos")
def export_all_photos(db: Session = Depends(get_db), _: str = Depends(verify_token)):
    """
    将所有住客的照片打包成一个 ZIP 文件流式下载。
    ZIP 内目录结构：{登记时间}_{姓名}/{序号.扩展名}
    """
    rows = (
        db.query(Guest, RegistrationBatch)
        .options(joinedload(Guest.photos))
        .join(RegistrationBatch, Guest.batch_id == RegistrationBatch.id)
        .order_by(Guest.submitted_at.desc())
        .all()
    )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for g, b in rows:
            if not g.photos:
                continue

            # 用登记时间+姓名作为子目录，去掉非法字符
            date_str = g.submitted_at.strftime("%Y%m%d_%H%M%S") if g.submitted_at else "unknown"
            safe_name = (g.name or "guest").replace("/", "-").replace("\\", "-")
            folder = f"{date_str}_{safe_name}"

            for photo in g.photos:
                photo_path = Path(photo.filename)
                if not photo_path.exists():
                    continue
                arcname = f"{folder}/{photo_path.name}"
                zf.write(photo_path, arcname)

    buf.seek(0)
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"all_photos_{now}.zip"

    return StreamingResponse(
        iter([buf.read()]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'},
    )
