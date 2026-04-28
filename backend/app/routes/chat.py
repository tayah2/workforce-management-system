from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.absence import Absence
from app.models.check_in import CheckIn
from app.models.gamification import PointTransaction
from app.models.shift import Shift
from app.models.user import User

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')


def _total_hours_this_month(user_id: int) -> float:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    checkins = CheckIn.query.filter(
        CheckIn.user_id == user_id,
        CheckIn.check_in_time >= month_start,
        CheckIn.check_out_time.isnot(None),
    ).all()
    return round(sum(c.calculate_hours() for c in checkins), 2)


def _total_checkins_this_month(user_id: int) -> int:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return CheckIn.query.filter(
        CheckIn.user_id == user_id,
        CheckIn.check_in_time >= month_start,
    ).count()


def _total_points(user_id: int) -> int:
    result = (
        PointTransaction.query
        .with_entities(PointTransaction.points)
        .filter_by(user_id=user_id)
        .all()
    )
    return sum(r[0] for r in result)


def _next_shift(user_id: int):
    now = datetime.now(timezone.utc)
    shift = (
        Shift.query
        .filter(
            Shift.user_id == user_id,
            Shift.status.in_(['scheduled', 'confirmed']),
            Shift.scheduled_start > now,
        )
        .order_by(Shift.scheduled_start.asc())
        .first()
    )
    if shift:
        return shift.scheduled_start.strftime('%A %d %B at %H:%M')
    return None


def _pending_absence_count(user_id: int) -> int:
    return Absence.query.filter_by(user_id=user_id, status='pending').count()


@chat_bp.route('/', methods=['POST'])
@jwt_required()
def chat():
    try:
        import anthropic
    except ImportError:
        return jsonify({'error': 'AI chat service is not available. Please install the anthropic package.'}), 503

    current_user_id = int(get_jwt_identity())
    user = User.query.get_or_404(current_user_id)

    data = request.get_json(silent=True) or {}

    message = (data.get('message') or '').strip()
    if not message:
        return jsonify({'error': 'message is required'}), 400

    history = data.get('history', [])
    if not isinstance(history, list):
        return jsonify({'error': 'history must be a list'}), 400

    # Validate history entries
    validated_history = []
    for entry in history:
        if not isinstance(entry, dict):
            continue
        role = entry.get('role', '')
        content = entry.get('content', '')
        if role in ('user', 'assistant') and isinstance(content, str) and content.strip():
            validated_history.append({'role': role, 'content': content.strip()})

    # Build user context
    name = f'{user.first_name} {user.last_name}'
    role = user.role
    rate = f'{user.hourly_rate:.2f}'
    hours = _total_hours_this_month(user.id)
    checkin_count = _total_checkins_this_month(user.id)
    points = _total_points(user.id)
    next_shift = _next_shift(user.id) or 'None scheduled'
    absence_count = _pending_absence_count(user.id)

    system_prompt = (
        f'You are a helpful AI assistant for {name}, a care worker at a UK care agency '
        f'using the WMS platform. '
        f'You help staff with: shift queries, payroll questions, leave/absence policies, '
        f'and general workplace support. '
        f'If someone is having a personal or medical emergency, direct them to contact '
        f'emergency services or their manager immediately. '
        f'Be warm, concise, and professional. Always suggest they use the messaging system '
        f'to contact their manager for specific issues.\n\n'
        f'Staff context:\n'
        f'- Name: {name}\n'
        f'- Role: {role}\n'
        f'- Hourly rate: £{rate}/hr\n'
        f'- Check-ins this month: {checkin_count}\n'
        f'- Hours worked this month: {hours}\n'
        f'- Points earned: {points}\n'
        f'- Next shift: {next_shift}\n'
        f'- Pending absence requests: {absence_count}'
    )

    # Build messages list: history + current user message
    messages = validated_history + [{'role': 'user', 'content': message}]

    try:
        client = anthropic.Anthropic()
        response = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=800,
            system=system_prompt,
            messages=messages,
        )
        reply = response.content[0].text
        return jsonify({'reply': reply}), 200
    except anthropic.APIConnectionError:
        return jsonify({'error': 'Could not connect to AI service. Please try again later.'}), 503
    except anthropic.RateLimitError:
        return jsonify({'error': 'AI service is temporarily busy. Please try again in a moment.'}), 429
    except anthropic.APIStatusError as exc:
        return jsonify({'error': f'AI service error: {exc.status_code}'}), 502
    except Exception as exc:
        return jsonify({'error': 'An unexpected error occurred with the AI service.'}), 500
