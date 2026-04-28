from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models.user import User


def admin_required(fn):
    """Decorator that requires the current JWT user to have the 'admin' role."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def employee_required(fn):
    """Decorator that requires an active JWT user (any role)."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'Account is inactive or not found'}), 403
        return fn(*args, **kwargs)
    return wrapper
