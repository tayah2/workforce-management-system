from datetime import datetime, timezone
from app.extensions import db


class Document(db.Model):
    __tablename__ = 'documents'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(80), nullable=False, default='general')
    # categories: policy / procedure / form / health_safety / training / hr
    content = db.Column(db.Text, nullable=True)  # markdown body
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        from app.models.user import User
        u = User.query.get(self.uploaded_by)
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'content': self.content,
            'is_active': self.is_active,
            'uploaded_by': self.uploaded_by,
            'uploaded_by_name': f'{u.first_name} {u.last_name}' if u else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
