from datetime import datetime, timezone
from app.extensions import db


class Absence(db.Model):
    __tablename__ = 'absences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)  # multi-day absences
    type = db.Column(db.String(20), nullable=False)  # sick / holiday / emergency / other
    reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending / approved / rejected
    admin_notes = db.Column(db.Text, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        from app.models.user import User
        u = User.query.get(self.user_id)
        r = User.query.get(self.reviewed_by) if self.reviewed_by else None
        return {
            'id': self.id,
            'user_id': self.user_id,
            'employee_name': f'{u.first_name} {u.last_name}' if u else None,
            'date': self.date.isoformat() if self.date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'type': self.type,
            'reason': self.reason,
            'status': self.status,
            'admin_notes': self.admin_notes,
            'reviewed_by_name': f'{r.first_name} {r.last_name}' if r else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
