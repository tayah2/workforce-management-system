from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from app.extensions import db
from app.models.check_in import CheckIn
from app.models.gamification import PointTransaction, Streak
from app.models.user import User

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def stats():
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    now = datetime.now(timezone.utc)

    if current_user.role == 'admin':
        total_employees = User.query.filter_by(role='employee', is_active=True).count()

        # Active now = employees with an open check-in
        active_now = CheckIn.query.filter(
            CheckIn.check_out_time.is_(None)
        ).count()

        # Today's check-ins
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_checkins = CheckIn.query.filter(
            CheckIn.check_in_time >= today_start
        ).count()

        # Month hours
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_checkins = CheckIn.query.filter(
            CheckIn.check_in_time >= month_start,
            CheckIn.check_out_time.isnot(None),
        ).all()
        month_hours = round(sum(c.calculate_hours() for c in month_checkins), 2)

        return jsonify({
            'role': 'admin',
            'total_employees': total_employees,
            'active_now': active_now,
            'today_checkins': today_checkins,
            'month_hours': month_hours,
        }), 200

    else:
        # Employee view
        week_start = now - timedelta(days=7)
        week_checkins = CheckIn.query.filter(
            CheckIn.user_id == current_user_id,
            CheckIn.check_in_time >= week_start,
            CheckIn.check_out_time.isnot(None),
        ).all()
        week_hours = round(sum(c.calculate_hours() for c in week_checkins), 2)

        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_checkins = CheckIn.query.filter(
            CheckIn.user_id == current_user_id,
            CheckIn.check_in_time >= month_start,
            CheckIn.check_out_time.isnot(None),
        ).all()
        month_hours = round(sum(c.calculate_hours() for c in month_checkins), 2)

        # Currently checked in?
        open_checkin = CheckIn.query.filter_by(
            user_id=current_user_id, check_out_time=None
        ).first()
        is_checked_in = open_checkin is not None

        # Total points
        total_points = (
            db.session.query(
                func.coalesce(func.sum(PointTransaction.points), 0)
            )
            .filter(PointTransaction.user_id == current_user_id)
            .scalar()
        )

        streak = Streak.query.filter_by(user_id=current_user_id).first()
        current_streak = streak.current_streak if streak else 0

        return jsonify({
            'role': 'employee',
            'week_hours': week_hours,
            'month_hours': month_hours,
            'is_checked_in': is_checked_in,
            'current_checkin_id': open_checkin.id if open_checkin else None,
            'current_points': int(total_points),
            'streak': current_streak,
        }), 200
