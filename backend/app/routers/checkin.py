from pathlib import Path
from typing import List, Optional
from datetime import datetime, timedelta, timezone, date as DateType
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Form, File, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import RegistrationBatch, Guest, GuestPhoto
from ..schemas import BatchSubmission, BatchResponse

router = APIRouter()

UPLOAD_DIR   = Path("uploads")
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp"}

# ── file-size constants ──────────────────────────────────────────────────────
CHUNK_SIZE     = 256 * 1024        # 256 KB per read chunk
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB hard limit per file


# ──────────────── helpers ────────────────

def _validate_batch(batch_id: UUID, db: Session, lock: bool = False):
    q = db.query(RegistrationBatch).filter(RegistrationBatch.id == batch_id)
    if lock:
        q = q.with_for_update()
    batch = q.first()
    if not batch:
        raise HTTPException(status_code=404, detail="链接不存在")
    now = datetime.now(timezone.utc)
    if batch.status == "closed":
        raise HTTPException(status_code=410, detail="链接已关闭")
    expires = batch.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        raise HTTPException(status_code=410, detail="链接已过期")
    return batch


def _parse_date(s: Optional[str]) -> Optional[DateType]:
    if not s or not s.strip():
        return None
    # Accept YYYY-MM-DD or YYYY-MM-DDTHH:MM
    try:
        return DateType.fromisoformat(s.strip()[:10])
    except ValueError:
        return None


async def _save_photos(photos: List[UploadFile], guest_id) -> List[GuestPhoto]:
    """
    流式写入磁盘，边读边写，同时强制限制单张照片不超过 MAX_FILE_BYTES。
    若某张超限，删除已写入的部分文件并抛出 413 错误，
    同时清理本次已保存的其他文件，避免垃圾残留。
    """
    records: List[GuestPhoto] = []
    saved_paths: List[Path] = []

    guest_dir = UPLOAD_DIR / str(guest_id)
    guest_dir.mkdir(parents=True, exist_ok=True)

    try:
        for i, photo in enumerate(photos):
            if not photo.filename:
                continue
            ext = Path(photo.filename).suffix.lower() or ".jpg"
            if ext not in ALLOWED_EXTS:
                continue

            filename  = f"{i + 1}{ext}"
            file_path = guest_dir / filename
            total     = 0

            with open(file_path, "wb") as f:
                while True:
                    chunk = await photo.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_FILE_BYTES:
                        # 关闭并删除超限文件
                        f.close()
                        file_path.unlink(missing_ok=True)
                        raise HTTPException(
                            status_code=413,
                            detail=(
                                f"第 {i + 1} 张照片超过 10 MB 限制，"
                                "请压缩后重新上传 / "
                                f"Photo {i + 1} exceeds the 10 MB limit"
                            ),
                        )
                    f.write(chunk)

            saved_paths.append(file_path)
            records.append(
                GuestPhoto(
                    guest_id=guest_id,
                    filename=str(file_path),
                    original_filename=photo.filename,
                )
            )

    except HTTPException:
        # 清理本次已保存的其他文件
        for p in saved_paths:
            p.unlink(missing_ok=True)
        raise

    return records


# ──────────────── public routes ────────────────

@router.get("/check-in/{batch_id}", response_model=BatchResponse)
def get_batch_info(batch_id: UUID, db: Session = Depends(get_db)):
    batch = _validate_batch(batch_id, db)
    guest_count = db.query(Guest).filter(Guest.batch_id == batch_id).count()
    return BatchResponse(
        id=batch.id,
        title=batch.title,
        room_number=batch.room_number,
        created_at=batch.created_at,
        expires_at=batch.expires_at,
        status=batch.status,
        guest_count=guest_count,
    )


@router.post("/check-in/simple")
async def submit_simple(
    request: Request,
    # ── Required ──
    name: str = Form(...),
    address: str = Form(...),
    phone_country_code: str = Form(...),
    phone_number: str = Form(...),
    photos: List[UploadFile] = File(...),
    # ── Optional ──
    arrival_datetime: Optional[str] = Form(None),
    departure_datetime: Optional[str] = Form(None),
    occupation: Optional[str] = Form(None),
    age: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),      # 'M' | 'F'
    nationality: Optional[str] = Form(None),
    passport_number: Optional[str] = Form(None),
    # ── Routing ──
    batch_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    if len(photos) < 1:
        raise HTTPException(status_code=400, detail="请至少上传1张证件照片")
    if len(photos) > 9:
        raise HTTPException(status_code=400, detail="最多上传9张照片")

    now = datetime.now(timezone.utc)

    if batch_id:
        try:
            bid = UUID(batch_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的批次ID")
        batch = _validate_batch(bid, db, lock=True)
    else:
        batch = RegistrationBatch(
            title=f"直接登记 {now.strftime('%Y-%m-%d %H:%M')}",
            room_number=None,
            expires_at=now + timedelta(seconds=1),
            status="closed",
        )
        db.add(batch)
        db.flush()

    today = now.date()
    phone_full = f"{phone_country_code}-{phone_number.strip()}"
    client_ip = request.client.host if request.client else None

    age_int = 0
    try:
        age_int = int(age) if age and age.strip() else 0
    except ValueError:
        age_int = 0

    guest = Guest(
        batch_id=batch.id,
        is_primary=True,
        submission_ip=client_ip,
        furigana=name,
        name=name,
        gender=gender if gender in ("M", "F") else "M",
        phone=phone_full,
        date_of_birth=today,
        age=age_int,
        address=address,
        occupation=occupation.strip() if occupation and occupation.strip() else "-",
        nationality=nationality.strip() if nationality and nationality.strip() else "-",
        passport_number=passport_number.strip() if passport_number and passport_number.strip() else "-",
        previous_stay="-",
        destination="-",
        arrival_date=_parse_date(arrival_datetime) or today,
        departure_date=_parse_date(departure_datetime) or today,
    )
    db.add(guest)
    db.flush()

    photo_records = await _save_photos(photos, guest.id)
    db.add_all(photo_records)
    db.commit()

    return {"message": "登记成功", "count": 1, "guest_id": str(guest.id)}
