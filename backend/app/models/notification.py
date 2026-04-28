from datetime import datetime, timezone
from app.extensions import db


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False)
    # types: absence_request / absence_approved / absence_rejected /
    #        new_message / shift_available / document_added / gps_failure
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=True)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    link = db.Column(db.String(200), nullable=True)  # frontend path to navigate to
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'title': self.title,
            'body': self.body,
            'is_read': self.is_read,
            'link': self.link,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
