from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='employee')
    hourly_rate = db.Column(db.Float, nullable=False, default=12.50)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(
        db.DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    check_ins = db.relationship('CheckIn', backref='user', lazy='dynamic')
    point_transactions = db.relationship(
        'PointTransaction', backref='user', lazy='dynamic'
    )
    user_badges = db.relationship('UserBadge', backref='user', lazy='dynamic')
    streak = db.relationship('Streak', backref='user', uselist=False)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_sensitive: bool = False) -> dict:
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f'{self.first_name} {self.last_name}',
            'role': self.role,
            'hourly_rate': self.hourly_rate,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        return data

    def __repr__(self) -> str:
        return f'<User {self.username}>'
