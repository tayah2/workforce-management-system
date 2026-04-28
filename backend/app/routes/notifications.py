from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.notification import Notification

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def list_notifications():
    current_user_id = int(get_jwt_identity())
    query = Notification.query.filter_by(user_id=current_user_id)

    unread_only = request.args.get('unread', '').lower() in ('true', '1', 'yes')
    if unread_only:
        query = query.filter_by(is_read=False)

    notifications = query.order_by(Notification.created_at.desc()).all()
    return jsonify({'notifications': [n.to_dict() for n in notifications]}), 200


@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def unread_count():
    current_user_id = int(get_jwt_identity())
    count = Notification.query.filter_by(
        user_id=current_user_id, is_read=False
    ).count()
    return jsonify({'count': count}), 200


@notifications_bp.route('/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_read(notification_id: int):
    current_user_id = int(get_jwt_identity())
    notif = Notification.query.get_or_404(notification_id)

    if notif.user_id != current_user_id:
        return jsonify({'error': 'Access denied'}), 403

    notif.is_read = True
    db.session.commit()

    return jsonify({'notification': notif.to_dict()}), 200


@notifications_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_read():
    current_user_id = int(get_jwt_identity())
    updated = (
        Notification.query
        .filter_by(user_id=current_user_id, is_read=False)
        .update({'is_read': True})
    )
    db.session.commit()
    return jsonify({'message': f'{updated} notification(s) marked as read'}), 200


@notifications_bp.route('/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id: int):
    current_user_id = int(get_jwt_identity())
    notif = Notification.query.get_or_404(notification_id)

    if notif.user_id != current_user_id:
        return jsonify({'error': 'Access denied'}), 403

    db.session.delete(notif)
    db.session.commit()

    return jsonify({'message': 'Notification deleted successfully'}), 200
