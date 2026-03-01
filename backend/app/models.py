import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base


class RegistrationBatch(Base):
    __tablename__ = "registration_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    room_number = Column(String(100))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="active")  # 'active' | 'closed'

    guests = relationship("Guest", back_populates="batch", cascade="all, delete-orphan")


class Guest(Base):
    __tablename__ = "guests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("registration_batches.id"), nullable=False)
    is_primary = Column(Boolean, default=False)
    submission_ip = Column(String(45))
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    furigana = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    gender = Column(String(10), nullable=False)  # 'M' | 'F'
    phone = Column(String(50))
    date_of_birth = Column(Date, nullable=False)
    age = Column(Integer, nullable=False)
    address = Column(Text, nullable=False)
    occupation = Column(String(255), nullable=False)
    nationality = Column(String(100), nullable=False)
    passport_number = Column(String(100), nullable=False)
    previous_stay = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    arrival_date = Column(Date, nullable=False)
    departure_date = Column(Date, nullable=False)

    batch = relationship("RegistrationBatch", back_populates="guests")
    photos = relationship("GuestPhoto", back_populates="guest", cascade="all, delete-orphan")


class GuestPhoto(Base):
    __tablename__ = "guest_photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guest_id = Column(UUID(as_uuid=True), ForeignKey("guests.id"), nullable=False)
    filename = Column(String(512), nullable=False)
    original_filename = Column(String(255))
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    guest = relationship("Guest", back_populates="photos")
