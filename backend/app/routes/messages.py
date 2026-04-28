from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.message import Message
from app.models.notification import Notification
from app.models.user import User

messages_bp = Blueprint('messages', __name__, url_prefix='/api/messages')


def _create_message_notification(recipient: User, sender: User, msg: Message) -> None:
    subject = msg.subject or ''
    preview = subject if subject else msg.body[:50]
    notif = Notification(
        user_id=recipient.id,
        type='new_message',
        title=f'New message from {sender.first_name} {sender.last_name}: {preview}',
        body=None,
        link='/messages',
    )
    db.session.add(notif)


@messages_bp.route('/inbox', methods=['GET'])
@jwt_required()
def inbox():
    current_user_id = int(get_jwt_identity())
    msgs = (
        Message.query
        .filter(Message.to_user_id == current_user_id)
        .order_by(Message.created_at.desc())
        .all()
    )
    return jsonify({'messages': [m.to_dict() for m in msgs]}), 200


@messages_bp.route('/sent', methods=['GET'])
@jwt_required()
def sent():
    current_user_id = int(get_jwt_identity())
    msgs = (
        Message.query
        .filter(Message.from_user_id == current_user_id)
        .order_by(Message.created_at.desc())
        .all()
    )
    return jsonify({'messages': [m.to_dict() for m in msgs]}), 200


@messages_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def unread_count():
    current_user_id = int(get_jwt_identity())
    count = Message.query.filter(
        Message.to_user_id == current_user_id,
        Message.is_read == False,
    ).count()
    return jsonify({'count': count}), 200


@messages_bp.route('/', methods=['POST'])
@jwt_required()
def send_message():
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)
    data = request.get_json(silent=True) or {}

    to_user_id = data.get('to_user_id')
    if not to_user_id:
        return jsonify({'error': 'to_user_id is required'}), 400
    try:
        to_user_id = int(to_user_id)
    except (ValueError, TypeError):
        return jsonify({'error': 'to_user_id must be an integer'}), 400

    recipient = User.query.get(to_user_id)
    if not recipient or not recipient.is_active:
        return jsonify({'error': 'Recipient not found'}), 404

    # Employees may only message admin users
    if current_user.role == 'employee' and recipient.role != 'admin':
        return jsonify({'error': 'Employees can only send messages to admin users'}), 403

    body = (data.get('body') or '').strip()
    if not body:
        return jsonify({'error': 'body is required'}), 400

    parent_id = data.get('parent_id')
    if parent_id is not None:
        try:
            parent_id = int(parent_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'parent_id must be an integer'}), 400
        parent = Message.query.get(parent_id)
        if not parent:
            return jsonify({'error': 'Parent message not found'}), 404

    msg = Message(
        from_user_id=current_user_id,
        to_user_id=to_user_id,
        subject=(data.get('subject') or '').strip() or None,
        body=body,
        parent_id=parent_id or None,
    )
    db.session.add(msg)
    db.session.flush()

    _create_message_notification(recipient, current_user, msg)
    db.session.commit()

    return jsonify({'message': msg.to_dict()}), 201


@messages_bp.route('/<int:message_id>', methods=['GET'])
@jwt_required()
def get_message(message_id: int):
    current_user_id = int(get_jwt_identity())
    msg = Message.query.get_or_404(message_id)

    if msg.from_user_id != current_user_id and msg.to_user_id != current_user_id:
        return jsonify({'error': 'Access denied'}), 403

    # Auto-mark as read when recipient views it
    if msg.to_user_id == current_user_id and not msg.is_read:
        msg.is_read = True
        db.session.commit()

    return jsonify({'message': msg.to_dict()}), 200


@messages_bp.route('/<int:message_id>/reply', methods=['POST'])
@jwt_required()
def reply_message(message_id: int):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)
    parent = Message.query.get_or_404(message_id)

    # Only sender or recipient of the parent message may reply
    if parent.from_user_id != current_user_id and parent.to_user_id != current_user_id:
        return jsonify({'error': 'Access denied'}), 403

    # Determine the reply recipient (the other party in the thread)
    if parent.from_user_id == current_user_id:
        to_user_id = parent.to_user_id
    else:
        to_user_id = parent.from_user_id

    recipient = User.query.get(to_user_id)
    if not recipient or not recipient.is_active:
        return jsonify({'error': 'Recipient not found'}), 404

    # Employees may only message admin users
    if current_user.role == 'employee' and recipient.role != 'admin':
        return jsonify({'error': 'Employees can only send messages to admin users'}), 403

    data = request.get_json(silent=True) or {}
    body = (data.get('body') or '').strip()
    if not body:
        return jsonify({'error': 'body is required'}), 400

    # Auto-fill subject as Re: original if not provided
    subject = (data.get('subject') or '').strip() or None
    if subject is None and parent.subject:
        subject = f'Re: {parent.subject}'

    msg = Message(
        from_user_id=current_user_id,
        to_user_id=to_user_id,
        subject=subject,
        body=body,
        parent_id=message_id,
    )
    db.session.add(msg)
    db.session.flush()

    _create_message_notification(recipient, current_user, msg)
    db.session.commit()

    return jsonify({'message': msg.to_dict()}), 201
