from datetime import datetime, timezone
from app.extensions import db


class PointTransaction(db.Model):
    __tablename__ = 'point_transactions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    points = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'points': self.points,
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f'<PointTransaction user={self.user_id} pts={self.points}>'


class Badge(db.Model):
    __tablename__ = 'badges'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=False)
    icon = db.Column(db.String(10), nullable=False, default='🏅')
    criteria_type = db.Column(db.String(80), nullable=False)
    criteria_value = db.Column(db.Integer, nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    user_badges = db.relationship('UserBadge', backref='badge', lazy='dynamic')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'icon': self.icon,
            'criteria_type': self.criteria_type,
            'criteria_value': self.criteria_value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f'<Badge {self.name}>'


class UserBadge(db.Model):
    __tablename__ = 'user_badges'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    badge_id = db.Column(db.Integer, db.ForeignKey('badges.id'), nullable=False)
    earned_at = db.Column(
        db.DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'badge_id': self.badge_id,
            'earned_at': self.earned_at.isoformat() if self.earned_at else None,
        }

    def __repr__(self) -> str:
        return f'<UserBadge user={self.user_id} badge={self.badge_id}>'


class Streak(db.Model):
    __tablename__ = 'streaks'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    current_streak = db.Column(db.Integer, nullable=False, default=0)
    longest_streak = db.Column(db.Integer, nullable=False, default=0)
    last_work_date = db.Column(db.Date, nullable=True)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'current_streak': self.current_streak,
            'longest_streak': self.longest_streak,
            'last_work_date': (
                self.last_work_date.isoformat() if self.last_work_date else None
            ),
        }

    def __repr__(self) -> str:
        return f'<Streak user={self.user_id} current={self.current_streak}>'
