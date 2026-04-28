"""
Authentication routes — register, login, token refresh, logout, and /me.

JWT access tokens expire after 1 hour; refresh tokens after 30 days.
Logged-out tokens are kept in an in-memory blacklist (lost on server restart).
"""

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)

from app.extensions import db, blacklisted_tokens
from app.models.user import User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Create a new employee account.

    Requires a company registration code (REGISTRATION_CODE config value)
    so that only authorised staff can self-register. Admins must be created
    directly in the database or via a seeded account.
    """
    data = request.get_json(silent=True) or {}

    # Validate all required fields are present and non-empty
    required = ('username', 'email', 'password', 'first_name', 'last_name')
    for field in required:
        if not data.get(field, '').strip():
            return jsonify({'error': f'Field "{field}" is required'}), 400

    # Enforce the company registration code when one is configured
    expected_code = current_app.config.get('REGISTRATION_CODE', '')
    if expected_code:
        submitted_code = data.get('registration_code', '').strip()
        if submitted_code != expected_code:
            return jsonify({'error': 'Invalid company registration code'}), 403

    username = data['username'].strip().lower()
    email = data['email'].strip().lower()

    # Self-registration always creates an employee; admin accounts require a superuser
    role = 'employee'

    # Reject if username or email is already in use
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    hourly_rate = data.get('hourly_rate', 12.50)
    try:
        hourly_rate = float(hourly_rate)
        if hourly_rate < 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({'error': 'hourly_rate must be a non-negative number'}), 400

    user = User(
        username=username,
        email=email,
        first_name=data['first_name'].strip(),
        last_name=data['last_name'].strip(),
        role=role,
        hourly_rate=hourly_rate,
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully', 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate with username + password. Returns access and refresh JWTs."""
    data = request.get_json(silent=True) or {}

    username = data.get('username', '').strip().lower()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    user = User.query.filter_by(username=username).first()

    # Use a generic error message to avoid leaking whether the username exists
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is inactive'}), 403

    # Store user ID as a string — Flask-JWT-Extended requires string identity
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict(),
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Exchange a valid refresh token for a new access token."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({'error': 'Account not found or inactive'}), 403
    access_token = create_access_token(identity=str(user_id))
    return jsonify({'access_token': access_token}), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Blacklist the current token's JTI so it cannot be reused."""
    jti = get_jwt()['jti']
    blacklisted_tokens.add(jti)
    return jsonify({'message': 'Successfully logged out'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Return the profile of the currently authenticated user."""
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    return jsonify({'user': user.to_dict()}), 200
