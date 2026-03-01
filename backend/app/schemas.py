from pydantic import BaseModel, field_validator
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID


class GuestCreate(BaseModel):
    furigana: str
    name: str
    gender: str  # 'M' | 'F'
    phone: Optional[str] = None
    date_of_birth: date
    age: int
    address: str
    occupation: str
    nationality: str
    passport_number: str
    previous_stay: str
    destination: str
    arrival_date: date
    departure_date: date

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        if v not in ("M", "F"):
            raise ValueError("gender must be M or F")
        return v


class GuestResponse(GuestCreate):
    id: UUID
    batch_id: UUID
    is_primary: bool
    submitted_at: datetime

    class Config:
        from_attributes = True


class BatchSubmission(BaseModel):
    guests: List[GuestCreate]


class BatchCreate(BaseModel):
    title: str
    room_number: Optional[str] = None
    expires_hours: int = 24


class BatchResponse(BaseModel):
    id: UUID
    title: str
    room_number: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    status: str
    guest_count: int = 0

    class Config:
        from_attributes = True


class BatchDetail(BatchResponse):
    guests: List[GuestResponse] = []


class AdminLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class StatsNationality(BaseModel):
    nationality: str
    count: int


class StatsAge(BaseModel):
    age_group: str
    count: int


class StatsTrend(BaseModel):
    date: str
    count: int
