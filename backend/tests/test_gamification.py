"""
Tests for gamification: points, badges, leaderboard.
"""
from datetime import datetime, timezone

import pytest

from app.extensions import db
from app.models.check_in import CheckIn
from app.models.gamification import Badge, PointTransaction, Streak, UserBadge
from app.models.user import User
from app.services.gamification_service import (
    award_shift_points,
    check_and_award_badges,
    get_leaderboard,
    get_user_gamification_profile,
    update_streak,
)


class TestPointsAwarded:
    def test_base_points_after_checkout(self, client, employee_token, location_id):
        """Checking out earns at least 10 base points."""
        # Check in
        client.post(
            '/api/checkin',
            json={'location_id': location_id, 'latitude': 52.6369, 'longitude': -1.1398},
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        # Check out with GPS verified
        co = client.post(
            '/api/checkout',
            json={'latitude': 52.6369, 'longitude': -1.1398, 'break_minutes': 0},
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        data = co.get_json()
        assert co.status_code == 200, data
        # Base 10 + 5 (gps check-in) + 3 (gps check-out) = 18
        assert data['points_earned'] == 18

    def test_points_without_gps(self, client, employee_token, location_id):
        """Check-out with no GPS verification earns exactly 10 base points."""
        # Check in with bad GPS
        client.post(
            '/api/checkin',
            json={'location_id': location_id, 'latitude': 0.0, 'longitude': 0.0},
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        # Check out with bad GPS
        co = client.post(
            '/api/checkout',
            json={'latitude': 0.0, 'longitude': 0.0},
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        data = co.get_json()
        assert co.status_code == 200, data
        assert data['points_earned'] == 10  # base only

    def test_award_shift_points_unit(self, app):
        """Unit test: award_shift_points returns correct totals."""
        with app.app_context():
            user = User.query.filter_by(username='testemployee').first()

            checkin_both = CheckIn(
                user_id=user.id,
                location_id=1,
                check_in_time=datetime.now(timezone.utc),
                check_out_time=datetime.now(timezone.utc),
                is_check_in_verified=True,
                is_check_out_verified=True,
                break_minutes=0,
            )
            db.session.add(checkin_both)
            db.session.flush()

            pts = award_shift_points(user, checkin_both)
            assert pts == 18  # 10 + 5 + 3

            checkin_none = CheckIn(
                user_id=user.id,
                location_id=1,
                check_in_time=datetime.now(timezone.utc),
                check_out_time=datetime.now(timezone.utc),
                is_check_in_verified=False,
                is_check_out_verified=False,
                break_minutes=0,
            )
            db.session.add(checkin_none)
            db.session.flush()

            pts_none = award_shift_points(user, checkin_none)
            assert pts_none == 10

            db.session.rollback()


class TestBadgeAwarding:
    def test_first_shift_badge_awarded(self, client, employee_token, location_id, app):
        """After completing at least one shift, the 'First Shift' badge should be awarded."""
        # Ensure the user has at least one completed shift
        client.post(
            '/api/checkin',
            json={'location_id': location_id, 'latitude': 52.6369, 'longitude': -1.1398},
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        client.post(
            '/api/checkout',
            json={'latitude': 52.6369, 'longitude': -1.1398},
            headers={'Authorization': f'Bearer {employee_token}'},
        )

        # Check the badges endpoint
        resp = client.get(
            '/api/gamification/badges',
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        assert resp.status_code == 200
        badges = resp.get_json()['badges']
        first_shift = next((b for b in badges if b['name'] == 'First Shift'), None)
        assert first_shift is not None
        assert first_shift['earned'] is True

    def test_badge_not_awarded_before_criteria(self, app):
        """Unit test: a badge is not awarded when criteria are not met."""
        with app.app_context():
            user = User.query.filter_by(username='testemployee').first()

            # 'Team Player' requires 100 shifts — should not be earned
            newly_earned = check_and_award_badges(user)
            badge_names = [b.name for b in newly_earned]
            assert 'Team Player' not in badge_names

    def test_check_and_award_badges_unit(self, app):
        """Unit test: check_and_award_badges returns Badge objects."""
        with app.app_context():
            user = User.query.filter_by(username='testemployee').first()
            result = check_and_award_badges(user)
            # Result is a list (may be empty at this point)
            assert isinstance(result, list)


class TestLeaderboard:
    def test_leaderboard_returns_ranked_list(self, client, employee_token):
        resp = client.get(
            '/api/gamification/leaderboard',
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'leaderboard' in data
        lb = data['leaderboard']
        assert isinstance(lb, list)

    def test_leaderboard_is_ordered_by_points(self, client, employee_token):
        resp = client.get(
            '/api/gamification/leaderboard',
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        lb = resp.get_json()['leaderboard']
        if len(lb) >= 2:
            for i in range(len(lb) - 1):
                assert lb[i]['total_points'] >= lb[i + 1]['total_points'], (
                    f"Leaderboard not ordered: rank {i+1} has {lb[i]['total_points']} pts "
                    f"but rank {i+2} has {lb[i+1]['total_points']} pts"
                )

    def test_leaderboard_contains_rank_field(self, client, employee_token):
        resp = client.get(
            '/api/gamification/leaderboard',
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        lb = resp.get_json()['leaderboard']
        for entry in lb:
            assert 'rank' in entry
            assert 'total_points' in entry
            assert 'username' in entry

    def test_leaderboard_limit_param(self, client, employee_token):
        resp = client.get(
            '/api/gamification/leaderboard?limit=1',
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        lb = resp.get_json()['leaderboard']
        assert len(lb) <= 1


class TestGamificationProfile:
    def test_profile_structure(self, client, employee_token):
        resp = client.get(
            '/api/gamification/profile',
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        assert resp.status_code == 200
        profile = resp.get_json()['profile']
        assert 'total_points' in profile
        assert 'rank' in profile
        assert 'streak' in profile
        assert 'badges' in profile
        assert 'recent_transactions' in profile

    def test_profile_points_non_negative(self, client, employee_token):
        resp = client.get(
            '/api/gamification/profile',
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        profile = resp.get_json()['profile']
        assert profile['total_points'] >= 0

    def test_get_user_gamification_profile_unit(self, app):
        """Unit test: get_user_gamification_profile returns expected keys."""
        with app.app_context():
            user = User.query.filter_by(username='testemployee').first()
            profile = get_user_gamification_profile(user.id)
            assert profile['user_id'] == user.id
            assert 'total_points' in profile
            assert 'streak' in profile
            assert isinstance(profile['badges'], list)
