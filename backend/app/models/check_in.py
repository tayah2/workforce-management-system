from datetime import datetime, timezone
from app.extensions import db


class CheckIn(db.Model):
    __tablename__ = 'check_ins'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    location_id = db.Column(
        db.Integer, db.ForeignKey('locations.id'), nullable=False, index=True
    )

    check_in_time = db.Column(db.DateTime, nullable=False)
    check_out_time = db.Column(db.DateTime, nullable=True)

    check_in_latitude = db.Column(db.Float, nullable=True)
    check_in_longitude = db.Column(db.Float, nullable=True)
    check_out_latitude = db.Column(db.Float, nullable=True)
    check_out_longitude = db.Column(db.Float, nullable=True)

    is_check_in_verified = db.Column(db.Boolean, nullable=False, default=False)
    is_check_out_verified = db.Column(db.Boolean, nullable=False, default=False)

    break_minutes = db.Column(db.Integer, nullable=False, default=0)
    notes = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    def calculate_hours(self) -> float:
        """Return total hours worked, minus break time. Returns 0 if not checked out."""
        if not self.check_out_time or not self.check_in_time:
            return 0.0
        delta = self.check_out_time - self.check_in_time
        total_seconds = delta.total_seconds()
        break_seconds = (self.break_minutes or 0) * 60
        worked_seconds = max(0, total_seconds - break_seconds)
        return round(worked_seconds / 3600, 4)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'location_id': self.location_id,
            'check_in_time': (
                self.check_in_time.isoformat() if self.check_in_time else None
            ),
            'check_out_time': (
                self.check_out_time.isoformat() if self.check_out_time else None
            ),
            'check_in_latitude': self.check_in_latitude,
            'check_in_longitude': self.check_in_longitude,
            'check_out_latitude': self.check_out_latitude,
            'check_out_longitude': self.check_out_longitude,
            'is_check_in_verified': self.is_check_in_verified,
            'is_check_out_verified': self.is_check_out_verified,
            'break_minutes': self.break_minutes,
            'notes': self.notes,
            'hours_worked': self.calculate_hours(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f'<CheckIn user={self.user_id} time={self.check_in_time}>'
