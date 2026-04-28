"""
Pytest configuration and shared fixtures for the WMS test suite.

IMPORTANT: The DATABASE_URL env var must be set BEFORE any app module is
imported, because Config.SQLALCHEMY_DATABASE_URI is evaluated at class-
definition time (module import time), not at fixture-run time.
"""
import os
import tempfile

# ── Set test env vars at module level, BEFORE any app imports ──────────────
_DB_FD, _DB_PATH = tempfile.mkstemp(suffix='_test.db')
os.environ['DATABASE_URL'] = f'sqlite:///{_DB_PATH}'
os.environ['SECRET_KEY'] = 'test-secret-key-for-tests'
os.environ['JWT_SECRET_KEY'] = 'test-jwt-secret-for-tests'
# Empty string disables code enforcement — tests that cover code validation set it themselves
os.environ['REGISTRATION_CODE'] = ''
# ───────────────────────────────────────────────────────────────────────────

import pytest
from app import create_app
from app.extensions import db as _db
from app.models.gamification import Badge
from app.models.location import Location
from app.models.user import User
from app.services.gamification_service import (
    CRITERIA_COMPLETED_SHIFTS,
    CRITERIA_GPS_CHECKINS,
    CRITERIA_GPS_VERIFIED_SHIFTS,
    CRITERIA_STREAK_DAYS,
)


@pytest.fixture(scope='session')
def app():
    test_app = create_app('development')
    test_app.config['TESTING'] = True
    test_app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'connect_args': {'check_same_thread': False},
        'pool_size': 1,
        'max_overflow': 0,
    }

    with test_app.app_context():
        _db.create_all()
        _seed_test_data()
        yield test_app
        _db.session.remove()
        _db.drop_all()

    try:
        os.close(_DB_FD)
    except OSError:
        pass
    try:
        os.unlink(_DB_PATH)
    except (OSError, PermissionError):
        pass

    for key in ('DATABASE_URL', 'SECRET_KEY', 'JWT_SECRET_KEY'):
        os.environ.pop(key, None)


def _seed_test_data():
    """Insert the minimum data required by all tests."""
    badge_defs = [
        Badge(
            name='First Shift',
            description='Complete your very first shift.',
            icon='🌟',
            criteria_type=CRITERIA_COMPLETED_SHIFTS,
            criteria_value=1,
        ),
        Badge(
            name='Perfect Week',
            description='5 GPS-verified shifts in 7 days.',
            icon='📅',
            criteria_type=CRITERIA_GPS_VERIFIED_SHIFTS,
            criteria_value=5,
        ),
        Badge(
            name='GPS Veteran',
            description='10 GPS-verified check-ins.',
            icon='🐦',
            criteria_type=CRITERIA_GPS_CHECKINS,
            criteria_value=10,
        ),
        Badge(
            name='Dedicated Worker',
            description='Complete 30 shifts.',
            icon='💪',
            criteria_type=CRITERIA_COMPLETED_SHIFTS,
            criteria_value=30,
        ),
        Badge(
            name='Team Player',
            description='Complete 100 shifts.',
            icon='🤝',
            criteria_type=CRITERIA_COMPLETED_SHIFTS,
            criteria_value=100,
        ),
        Badge(
            name='GPS Pro',
            description='50 GPS-verified check-ins.',
            icon='📍',
            criteria_type=CRITERIA_GPS_CHECKINS,
            criteria_value=50,
        ),
        Badge(
            name='Streak Master',
            description='7-day consecutive work streak.',
            icon='🔥',
            criteria_type=CRITERIA_STREAK_DAYS,
            criteria_value=7,
        ),
    ]
    for b in badge_defs:
        _db.session.add(b)

    location = Location(
        name='Test Care Home',
        address='1 Test Street, Leicester LE1 1AA',
        latitude=52.6369,
        longitude=-1.1398,
        radius=0.1,
        is_active=True,
    )
    _db.session.add(location)

    admin = User(
        username='testadmin',
        email='testadmin@test.com',
        first_name='Test',
        last_name='Admin',
        role='admin',
        hourly_rate=0.0,
    )
    admin.set_password('adminpass123')
    _db.session.add(admin)

    employee = User(
        username='testemployee',
        email='testemployee@test.com',
        first_name='Test',
        last_name='Employee',
        role='employee',
        hourly_rate=12.50,
    )
    employee.set_password('emppass123')
    _db.session.add(employee)

    _db.session.commit()


@pytest.fixture(scope='session')
def client(app):
    return app.test_client()


@pytest.fixture(scope='session')
def admin_token(client):
    resp = client.post('/api/auth/login', json={
        'username': 'testadmin',
        'password': 'adminpass123',
    })
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()['access_token']


@pytest.fixture(scope='session')
def employee_token(client):
    resp = client.post('/api/auth/login', json={
        'username': 'testemployee',
        'password': 'emppass123',
    })
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()['access_token']


@pytest.fixture(scope='session')
def location_id(app):
    with app.app_context():
        loc = Location.query.filter_by(name='Test Care Home').first()
        return loc.id
