from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import create_access_token, verify_token
from ..config import settings
from ..database import get_db
from ..models import Guest, RegistrationBatch
from ..schemas import AdminLogin, StatsAge, StatsNationality, StatsTrend, Token

router = APIRouter()


@router.post("/login", response_model=Token)
def login(data: AdminLogin):
    if data.username != settings.admin_username or data.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="ユーザー名またはパスワードが違います")
    token = create_access_token({"sub": data.username})
    return Token(access_token=token, token_type="bearer")


@router.get("/stats/nationality", response_model=List[StatsNationality])
def stats_nationality(db: Session = Depends(get_db), _: str = Depends(verify_token)):
    results = (
        db.query(Guest.nationality, func.count(Guest.id).label("count"))
        .group_by(Guest.nationality)
        .order_by(func.count(Guest.id).desc())
        .limit(20)
        .all()
    )
    return [StatsNationality(nationality=r.nationality, count=r.count) for r in results]


@router.get("/stats/age", response_model=List[StatsAge])
def stats_age(db: Session = Depends(get_db), _: str = Depends(verify_token)):
    groups = [
        ("0–17", 0, 17),
        ("18–29", 18, 29),
        ("30–44", 30, 44),
        ("45–59", 45, 59),
        ("60+", 60, 200),
    ]
    return [
        StatsAge(
            age_group=label,
            count=db.query(func.count(Guest.id))
            .filter(Guest.age >= mn, Guest.age <= mx)
            .scalar() or 0,
        )
        for label, mn, mx in groups
    ]


@router.get("/stats/trend", response_model=List[StatsTrend])
def stats_trend(db: Session = Depends(get_db), _: str = Depends(verify_token)):
    since = datetime.now(timezone.utc) - timedelta(days=30)
    results = (
        db.query(
            func.date(Guest.submitted_at).label("date"),
            func.count(Guest.id).label("count"),
        )
        .filter(Guest.submitted_at >= since)
        .group_by(func.date(Guest.submitted_at))
        .order_by(func.date(Guest.submitted_at))
        .all()
    )
    return [StatsTrend(date=str(r.date), count=r.count) for r in results]
