from datetime import datetime, timezone
from app.extensions import db


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    from_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    to_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    subject = db.Column(db.String(200), nullable=True)
    body = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        from app.models.user import User
        frm = User.query.get(self.from_user_id)
        to = User.query.get(self.to_user_id)
        return {
            'id': self.id,
            'from_user_id': self.from_user_id,
            'from_name': f'{frm.first_name} {frm.last_name}' if frm else None,
            'from_role': frm.role if frm else None,
            'to_user_id': self.to_user_id,
            'to_name': f'{to.first_name} {to.last_name}' if to else None,
            'subject': self.subject,
            'body': self.body,
            'is_read': self.is_read,
            'parent_id': self.parent_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
