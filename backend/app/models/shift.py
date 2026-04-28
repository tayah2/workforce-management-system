from datetime import datetime, timezone

from app.extensions import db


class Shift(db.Model):
    __tablename__ = 'shifts'

    id = db.Column(db.Integer, primary_key=True)
    # nullable=True allows "open" shifts not yet assigned to anyone
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    scheduled_start = db.Column(db.DateTime, nullable=False)
    scheduled_end = db.Column(db.DateTime, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    # status: open | scheduled | confirmed | cancelled
    # "open" = unassigned, available for any employee to claim
    status = db.Column(db.String(20), nullable=False, default='scheduled')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def duration_hours(self):
        if self.scheduled_start and self.scheduled_end:
            delta = self.scheduled_end - self.scheduled_start
            return round(delta.total_seconds() / 3600, 2)
        return 0.0

    def to_dict(self):
        from app.models.location import Location
        from app.models.user import User
        loc = Location.query.get(self.location_id)
        emp = User.query.get(self.user_id) if self.user_id else None
        return {
            'id': self.id,
            'user_id': self.user_id,
            'employee_name': f'{emp.first_name} {emp.last_name}' if emp else None,
            'location_id': self.location_id,
            'location_name': loc.name if loc else None,
            'location_address': loc.address if loc else None,
            'scheduled_start': self.scheduled_start.isoformat() if self.scheduled_start else None,
            'scheduled_end': self.scheduled_end.isoformat() if self.scheduled_end else None,
            'duration_hours': self.duration_hours(),
            'notes': self.notes,
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f'<Shift id={self.id} user_id={self.user_id} status={self.status}>'
