from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.check_in import CheckIn
from app.models.gamification import Badge, UserBadge
from app.models.user import User
from app.services.gamification_service import (
    get_leaderboard,
    get_user_gamification_profile,
)
from app.utils.decorators import admin_required

VALID_CRITERIA_TYPES = [
    'completed_shifts', 'gps_verified_shifts', 'gps_checkins',
    'streak_days', 'night_shifts', 'early_shifts', 'overtime_hours', 'total_points',
]

gamification_bp = Blueprint('gamification', __name__, url_prefix='/api/gamification')


@gamification_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    current_user_id = int(get_jwt_identity())
    data = get_user_gamification_profile(current_user_id)
    return jsonify({'profile': data}), 200


@gamification_bp.route('/leaderboard', methods=['GET'])
@jwt_required()
def leaderboard():
    try:
        limit = min(50, max(1, int(request.args.get('limit', 10))))
    except ValueError:
        limit = 10
    data = get_leaderboard(limit=limit)
    return jsonify({'leaderboard': data}), 200


@gamification_bp.route('/badges', methods=['GET'])
@jwt_required()
def list_badges():
    current_user_id = int(get_jwt_identity())

    earned_badge_ids = {
        ub.badge_id
        for ub in UserBadge.query.filter_by(user_id=current_user_id).all()
    }

    all_badges = Badge.query.order_by(Badge.criteria_value.asc()).all()
    result = []
    for badge in all_badges:
        entry = badge.to_dict()
        entry['earned'] = badge.id in earned_badge_ids
        if badge.id in earned_badge_ids:
            ub = UserBadge.query.filter_by(
                user_id=current_user_id, badge_id=badge.id
            ).first()
            entry['earned_at'] = ub.earned_at.isoformat() if ub and ub.earned_at else None
        else:
            entry['earned_at'] = None
        result.append(entry)

    return jsonify({'badges': result}), 200


@gamification_bp.route('/weekly-challenge', methods=['GET'])
@jwt_required()
def weekly_challenge():
    """Return this week's challenge and the current user's progress."""
    current_user_id = int(get_jwt_identity())

    # Challenge: complete 5 GPS-verified shifts this week
    week_start = datetime.now(timezone.utc) - timedelta(days=7)

    verified_this_week = CheckIn.query.filter(
        CheckIn.user_id == current_user_id,
        CheckIn.check_out_time.isnot(None),
        CheckIn.is_check_in_verified == True,  # noqa: E712
        CheckIn.check_in_time >= week_start,
    ).count()

    challenge = {
        'title': 'GPS Perfect Week',
        'description': 'Complete 5 GPS-verified shifts this week',
        'icon': '📍',
        'target': 5,
        'progress': verified_this_week,
        'completed': verified_this_week >= 5,
        'reward_points': 50,
        'expires': (
            datetime.now(timezone.utc)
            + timedelta(days=7 - datetime.now(timezone.utc).weekday())
        ).isoformat(),
    }
    return jsonify({'challenge': challenge}), 200


# ============================================================
# Admin badge management
# ============================================================

@gamification_bp.route('/badges', methods=['POST'])
@admin_required
def create_badge():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    icon = (data.get('icon') or '🏅').strip()
    criteria_type = (data.get('criteria_type') or '').strip()
    criteria_value = data.get('criteria_value')

    if not name:
        return jsonify({'error': 'name is required'}), 400
    if not description:
        return jsonify({'error': 'description is required'}), 400
    if criteria_type not in VALID_CRITERIA_TYPES:
        return jsonify({'error': f'criteria_type must be one of: {", ".join(VALID_CRITERIA_TYPES)}'}), 400
    try:
        criteria_value = int(criteria_value)
        if criteria_value < 1:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({'error': 'criteria_value must be a positive integer'}), 400

    if Badge.query.filter_by(name=name).first():
        return jsonify({'error': 'A badge with this name already exists'}), 409

    badge = Badge(name=name, description=description, icon=icon,
                  criteria_type=criteria_type, criteria_value=criteria_value)
    db.session.add(badge)
    db.session.commit()
    return jsonify({'message': 'Badge created', 'badge': badge.to_dict()}), 201


@gamification_bp.route('/badges/<int:badge_id>', methods=['PUT'])
@admin_required
def update_badge(badge_id):
    badge = Badge.query.get_or_404(badge_id)
    data = request.get_json(silent=True) or {}

    if 'name' in data:
        name = data['name'].strip()
        if not name:
            return jsonify({'error': 'name cannot be empty'}), 400
        existing = Badge.query.filter_by(name=name).first()
        if existing and existing.id != badge_id:
            return jsonify({'error': 'A badge with this name already exists'}), 409
        badge.name = name

    if 'description' in data:
        badge.description = data['description'].strip()
    if 'icon' in data:
        badge.icon = data['icon'].strip() or '🏅'
    if 'criteria_type' in data:
        if data['criteria_type'] not in VALID_CRITERIA_TYPES:
            return jsonify({'error': f'criteria_type must be one of: {", ".join(VALID_CRITERIA_TYPES)}'}), 400
        badge.criteria_type = data['criteria_type']
    if 'criteria_value' in data:
        try:
            badge.criteria_value = int(data['criteria_value'])
            if badge.criteria_value < 1:
                raise ValueError
        except (TypeError, ValueError):
            return jsonify({'error': 'criteria_value must be a positive integer'}), 400

    db.session.commit()
    return jsonify({'message': 'Badge updated', 'badge': badge.to_dict()}), 200


@gamification_bp.route('/badges/<int:badge_id>', methods=['DELETE'])
@admin_required
def delete_badge(badge_id):
    badge = Badge.query.get_or_404(badge_id)
    UserBadge.query.filter_by(badge_id=badge_id).delete()
    db.session.delete(badge)
    db.session.commit()
    return jsonify({'message': 'Badge deleted'}), 200


@gamification_bp.route('/badges/all', methods=['GET'])
@admin_required
def list_all_badges_admin():
    """Admin view — all badges with earned counts."""
    badges = Badge.query.order_by(Badge.criteria_value.asc()).all()
    result = []
    for badge in badges:
        entry = badge.to_dict()
        entry['earned_count'] = UserBadge.query.filter_by(badge_id=badge.id).count()
        result.append(entry)
    return jsonify({'badges': result}), 200
