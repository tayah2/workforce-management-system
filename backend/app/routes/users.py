from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.user import User
from app.utils.decorators import admin_required

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


@users_bp.route('/', methods=['GET'])
@jwt_required()
def list_users():
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role == 'admin':
        users = User.query.all()
        return jsonify({'users': [u.to_dict() for u in users]}), 200
    else:
        return jsonify({'users': [current_user.to_dict()]}), 200


@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role != 'admin' and current_user.id != user_id:
        return jsonify({'error': 'Access denied'}), 403

    user = User.query.get_or_404(user_id)
    return jsonify({'user': user.to_dict()}), 200


@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)
    user = User.query.get_or_404(user_id)

    if current_user.role != 'admin' and current_user.id != user_id:
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json(silent=True) or {}

    if current_user.role == 'admin':
        # Admins may change any allowed field
        if 'role' in data:
            if data['role'] not in ('admin', 'employee'):
                return jsonify({'error': 'role must be "admin" or "employee"'}), 400
            user.role = data['role']

        if 'hourly_rate' in data:
            try:
                rate = float(data['hourly_rate'])
                if rate < 0:
                    raise ValueError
                user.hourly_rate = rate
            except (TypeError, ValueError):
                return jsonify({'error': 'hourly_rate must be a non-negative number'}), 400

        if 'is_active' in data:
            user.is_active = bool(data['is_active'])

    # Both admin and the employee themselves may update name / email
    if 'first_name' in data and data['first_name'].strip():
        user.first_name = data['first_name'].strip()

    if 'last_name' in data and data['last_name'].strip():
        user.last_name = data['last_name'].strip()

    if 'email' in data:
        new_email = data['email'].strip().lower()
        existing = User.query.filter_by(email=new_email).first()
        if existing and existing.id != user_id:
            return jsonify({'error': 'Email already in use'}), 409
        user.email = new_email

    db.session.commit()
    return jsonify({'message': 'User updated', 'user': user.to_dict()}), 200


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    current_user_id = int(get_jwt_identity())
    if current_user_id == user_id:
        return jsonify({'error': 'Cannot deactivate your own account'}), 400

    user = User.query.get_or_404(user_id)
    user.is_active = False
    db.session.commit()
    return jsonify({'message': 'User deactivated'}), 200
