from datetime import datetime, timedelta, timezone, date
from typing import List, Optional
from sqlalchemy import func

from app.extensions import db
from app.models.user import User
from app.models.check_in import CheckIn
from app.models.gamification import PointTransaction, Badge, UserBadge, Streak

# ---------------------------------------------------------------------------
# Badge criteria type constants
# ---------------------------------------------------------------------------
CRITERIA_COMPLETED_SHIFTS = 'completed_shifts'
CRITERIA_GPS_VERIFIED_SHIFTS = 'gps_verified_shifts'
CRITERIA_GPS_CHECKINS = 'gps_checkins'
CRITERIA_STREAK_DAYS = 'streak_days'

# ---------------------------------------------------------------------------
# Level system
# ---------------------------------------------------------------------------
LEVELS = [
    {'name': 'Bronze',   'min': 0,    'max': 99,   'num': 1, 'icon': '🥉'},
    {'name': 'Silver',   'min': 100,  'max': 499,  'num': 2, 'icon': '🥈'},
    {'name': 'Gold',     'min': 500,  'max': 1499, 'num': 3, 'icon': '🥇'},
    {'name': 'Platinum', 'min': 1500, 'max': 4999, 'num': 4, 'icon': '💎'},
    {'name': 'Diamond',  'min': 5000, 'max': None, 'num': 5, 'icon': '💠'},
]


def get_level(total_points: int) -> dict:
    for lvl in LEVELS:
        if lvl['max'] is None or total_points <= lvl['max']:
            xp_in_level = total_points - lvl['min']
            xp_needed = (lvl['max'] - lvl['min'] + 1) if lvl['max'] is not None else 0
            return {
                'name': lvl['name'],
                'num': lvl['num'],
                'icon': lvl['icon'],
                'xp_in_level': xp_in_level,
                'xp_needed': xp_needed,
                'progress_pct': round(xp_in_level / xp_needed * 100, 1) if xp_needed > 0 else 100,
            }
    return LEVELS[-1]

# Points per event
POINTS_SHIFT_COMPLETE = 10
POINTS_GPS_CHECKIN_BONUS = 5
POINTS_GPS_CHECKOUT_BONUS = 3


def _get_or_create_streak(user: User) -> Streak:
    streak = Streak.query.filter_by(user_id=user.id).first()
    if not streak:
        streak = Streak(user_id=user.id, current_streak=0, longest_streak=0)
        db.session.add(streak)
        db.session.flush()
    return streak


def award_shift_points(user: User, checkin: CheckIn) -> int:
    """
    Award points for a completed shift.
    Returns the total points awarded in this call.
    """
    total_awarded = 0

    # Base shift completion points
    _add_points(user, POINTS_SHIFT_COMPLETE, 'Completed shift')
    total_awarded += POINTS_SHIFT_COMPLETE

    # GPS check-in bonus
    if checkin.is_check_in_verified:
        _add_points(user, POINTS_GPS_CHECKIN_BONUS, 'GPS-verified check-in')
        total_awarded += POINTS_GPS_CHECKIN_BONUS

    # GPS check-out bonus
    if checkin.is_check_out_verified:
        _add_points(user, POINTS_GPS_CHECKOUT_BONUS, 'GPS-verified check-out')
        total_awarded += POINTS_GPS_CHECKOUT_BONUS

    return total_awarded


def _add_points(user: User, points: int, reason: str) -> None:
    transaction = PointTransaction(user_id=user.id, points=points, reason=reason)
    db.session.add(transaction)


def update_streak(user: User, checkin: CheckIn) -> None:
    """Update the consecutive-day work streak for the user."""
    if not checkin.check_out_time:
        return

    work_date = checkin.check_out_time.date()
    streak = _get_or_create_streak(user)

    if streak.last_work_date is None:
        # First ever shift
        streak.current_streak = 1
        streak.longest_streak = 1
    elif work_date == streak.last_work_date:
        # Same day — no change
        return
    elif work_date == streak.last_work_date + timedelta(days=1):
        # Consecutive day
        streak.current_streak += 1
        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak
    else:
        # Gap in days — reset streak
        streak.current_streak = 1

    streak.last_work_date = work_date


def check_and_award_badges(user: User) -> List[Badge]:
    """
    Check all badge criteria and award any badges the user has newly earned.
    Returns a list of newly awarded Badge objects.
    """
    all_badges = Badge.query.all()
    earned_badge_ids = {
        ub.badge_id for ub in UserBadge.query.filter_by(user_id=user.id).all()
    }
    newly_earned: List[Badge] = []

    # Pre-compute stats we may need
    completed_shifts = CheckIn.query.filter(
        CheckIn.user_id == user.id,
        CheckIn.check_out_time.isnot(None),
    ).count()

    gps_verified_shifts = CheckIn.query.filter(
        CheckIn.user_id == user.id,
        CheckIn.check_out_time.isnot(None),
        CheckIn.is_check_in_verified == True,  # noqa: E712
    ).count()

    gps_checkins = CheckIn.query.filter(
        CheckIn.user_id == user.id,
        CheckIn.is_check_in_verified == True,  # noqa: E712
    ).count()

    streak = _get_or_create_streak(user)

    # "Perfect Week": 5 GPS-verified shifts in the last 7 calendar days
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_gps_shifts = CheckIn.query.filter(
        CheckIn.user_id == user.id,
        CheckIn.check_out_time.isnot(None),
        CheckIn.is_check_in_verified == True,  # noqa: E712
        CheckIn.check_in_time >= seven_days_ago,
    ).count()

    # Night shifts: check-in hour >= 18
    night_shifts = CheckIn.query.filter(
        CheckIn.user_id == user.id,
        CheckIn.check_out_time.isnot(None),
    ).all()
    night_shifts_count = sum(
        1 for c in night_shifts if c.check_in_time.hour >= 18
    )

    # Early shifts: check-in hour < 8
    early_shifts_count = sum(
        1 for c in night_shifts if c.check_in_time.hour < 8
    )

    # Overtime approximation: shifts > 8 hours (strip tz for safe subtraction)
    overtime_hours_count = sum(
        1 for c in night_shifts
        if (
            c.check_out_time.replace(tzinfo=None) - c.check_in_time.replace(tzinfo=None)
        ).total_seconds() / 3600 > 8
    )

    # Total points from transactions
    total_points_stat = (
        db.session.query(func.coalesce(func.sum(PointTransaction.points), 0))
        .filter(PointTransaction.user_id == user.id)
        .scalar()
    )

    stat_map = {
        CRITERIA_COMPLETED_SHIFTS: completed_shifts,
        CRITERIA_GPS_VERIFIED_SHIFTS: gps_verified_shifts,
        CRITERIA_GPS_CHECKINS: gps_checkins,
        CRITERIA_STREAK_DAYS: streak.current_streak,
        'perfect_week': recent_gps_shifts,
        'night_shifts': night_shifts_count,
        'early_shifts': early_shifts_count,
        'overtime_hours': overtime_hours_count,
        'total_points': int(total_points_stat),
    }

    for badge in all_badges:
        if badge.id in earned_badge_ids:
            continue

        # Determine which stat to compare
        if badge.name == 'Perfect Week':
            user_stat = stat_map['perfect_week']
        else:
            user_stat = stat_map.get(badge.criteria_type, 0)

        if user_stat >= badge.criteria_value:
            user_badge = UserBadge(user_id=user.id, badge_id=badge.id)
            db.session.add(user_badge)
            newly_earned.append(badge)

    return newly_earned


def get_user_gamification_profile(user_id: int) -> dict:
    """Return the full gamification profile for a user."""
    user = User.query.get_or_404(user_id)

    total_points = (
        db.session.query(func.coalesce(func.sum(PointTransaction.points), 0))
        .filter(PointTransaction.user_id == user_id)
        .scalar()
    )

    transactions = (
        PointTransaction.query
        .filter_by(user_id=user_id)
        .order_by(PointTransaction.created_at.desc())
        .limit(20)
        .all()
    )

    user_badges = (
        UserBadge.query
        .filter_by(user_id=user_id)
        .all()
    )
    badge_details = []
    for ub in user_badges:
        badge = Badge.query.get(ub.badge_id)
        if badge:
            entry = badge.to_dict()
            entry['earned_at'] = ub.earned_at.isoformat() if ub.earned_at else None
            badge_details.append(entry)

    streak = _get_or_create_streak(user)

    # Rank: count users with strictly more points
    rank_subq = (
        db.session.query(
            PointTransaction.user_id,
            func.coalesce(func.sum(PointTransaction.points), 0).label('pts'),
        )
        .group_by(PointTransaction.user_id)
        .subquery()
    )
    rank = (
        db.session.query(func.count())
        .select_from(rank_subq)
        .filter(rank_subq.c.pts > total_points)
        .scalar()
    ) + 1

    return {
        'user_id': user_id,
        'username': user.username,
        'full_name': f'{user.first_name} {user.last_name}',
        'total_points': int(total_points),
        'level': get_level(int(total_points)),
        'rank': rank,
        'streak': streak.to_dict(),
        'longest_streak': streak.longest_streak,
        'badges': badge_details,
        'recent_transactions': [t.to_dict() for t in transactions],
    }


def get_leaderboard(limit: int = 10) -> List[dict]:
    """Return the top-N employees ranked by total points."""
    rows = (
        db.session.query(
            PointTransaction.user_id,
            func.coalesce(func.sum(PointTransaction.points), 0).label('total_points'),
        )
        .group_by(PointTransaction.user_id)
        .order_by(func.sum(PointTransaction.points).desc())
        .limit(limit)
        .all()
    )

    leaderboard = []
    for rank, row in enumerate(rows, start=1):
        user = User.query.get(row.user_id)
        if not user:
            continue
        streak = _get_or_create_streak(user)
        badge_count = UserBadge.query.filter_by(user_id=user.id).count()
        leaderboard.append({
            'rank': rank,
            'user_id': user.id,
            'username': user.username,
            'full_name': f'{user.first_name} {user.last_name}',
            'total_points': int(row.total_points),
            'badge_count': badge_count,
            'current_streak': streak.current_streak,
        })

    return leaderboard
