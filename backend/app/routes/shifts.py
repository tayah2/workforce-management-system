from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.location import Location
from app.models.shift import Shift
from app.models.user import User

shifts_bp = Blueprint('shifts', __name__, url_prefix='/api/shifts')

VALID_STATUSES = {'open', 'scheduled', 'confirmed', 'cancelled'}


def _parse_iso_datetime(value: str, field_name: str):
    try:
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt, None
    except (ValueError, TypeError):
        return None, (jsonify({'error': f'{field_name} must be a valid ISO datetime'}), 400)


@shifts_bp.route('/', methods=['GET'])
@jwt_required()
def list_shifts():
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    query = Shift.query

    if current_user.role != 'admin':
        query = query.filter(
            Shift.user_id == current_user_id,
            Shift.status != 'cancelled',
            Shift.scheduled_start >= datetime.now(timezone.utc),
        )
    else:
        user_id_filter = request.args.get('user_id')
        if user_id_filter:
            try:
                query = query.filter(Shift.user_id == int(user_id_filter))
            except ValueError:
                return jsonify({'error': 'user_id must be an integer'}), 400

        location_id_filter = request.args.get('location_id')
        if location_id_filter:
            try:
                query = query.filter(Shift.location_id == int(location_id_filter))
            except ValueError:
                return jsonify({'error': 'location_id must be an integer'}), 400

        start_date = request.args.get('start_date')
        if start_date:
            dt, err = _parse_iso_datetime(start_date, 'start_date')
            if err:
                return err
            query = query.filter(Shift.scheduled_start >= dt)

        end_date = request.args.get('end_date')
        if end_date:
            dt, err = _parse_iso_datetime(end_date, 'end_date')
            if err:
                return err
            query = query.filter(Shift.scheduled_start <= dt)

    shifts = query.order_by(Shift.scheduled_start.asc()).all()
    return jsonify({'shifts': [s.to_dict() for s in shifts]}), 200


@shifts_bp.route('/open', methods=['GET'])
@jwt_required()
def list_open_shifts():
    """Return all open (unclaimed) shifts available for any employee to pick up."""
    now = datetime.now(timezone.utc)
    shifts = (
        Shift.query
        .filter(
            Shift.status == 'open',
            Shift.user_id.is_(None),
            Shift.scheduled_start > now,
        )
        .order_by(Shift.scheduled_start.asc())
        .all()
    )
    return jsonify({'shifts': [s.to_dict() for s in shifts]}), 200


@shifts_bp.route('/<int:shift_id>/claim', methods=['POST'])
@jwt_required()
def claim_shift(shift_id: int):
    """Employee claims an open shift — assigns it to themselves."""
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role == 'admin':
        return jsonify({'error': 'Admins cannot claim shifts'}), 403

    shift = Shift.query.get_or_404(shift_id)

    if shift.status != 'open':
        return jsonify({'error': 'This shift is no longer available'}), 409
    if shift.user_id is not None:
        return jsonify({'error': 'This shift has already been claimed'}), 409

    # Check the employee doesn't already have a shift overlapping this one
    conflict = Shift.query.filter(
        Shift.user_id == current_user_id,
        Shift.status.in_(['scheduled', 'confirmed']),
        Shift.scheduled_start < shift.scheduled_end,
        Shift.scheduled_end > shift.scheduled_start,
    ).first()
    if conflict:
        return jsonify({'error': 'You already have a shift overlapping this time'}), 409

    shift.user_id = current_user_id
    shift.status = 'confirmed'
    db.session.commit()

    return jsonify({
        'message': 'Shift claimed successfully! It has been added to your schedule.',
        'shift': shift.to_dict(),
    }), 200


@shifts_bp.route('/<int:shift_id>/release', methods=['POST'])
@jwt_required()
def release_shift(shift_id: int):
    """Employee releases a shift they claimed (puts it back as open)."""
    current_user_id = int(get_jwt_identity())
    shift = Shift.query.get_or_404(shift_id)

    if shift.user_id != current_user_id:
        return jsonify({'error': 'You can only release your own shifts'}), 403
    if shift.status == 'cancelled':
        return jsonify({'error': 'Cannot release a cancelled shift'}), 400

    shift.user_id = None
    shift.status = 'open'
    db.session.commit()
    return jsonify({'message': 'Shift released back to the pool', 'shift': shift.to_dict()}), 200


@shifts_bp.route('/', methods=['POST'])
@jwt_required()
def create_shift():
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json(silent=True) or {}

    location_id = data.get('location_id')
    if not location_id:
        return jsonify({'error': 'location_id is required'}), 400

    try:
        location_id = int(location_id)
    except (ValueError, TypeError):
        return jsonify({'error': 'location_id must be an integer'}), 400

    if not Location.query.get(location_id):
        return jsonify({'error': 'Location not found'}), 404

    for field in ('scheduled_start', 'scheduled_end'):
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    scheduled_start, err = _parse_iso_datetime(data['scheduled_start'], 'scheduled_start')
    if err:
        return err
    scheduled_end, err = _parse_iso_datetime(data['scheduled_end'], 'scheduled_end')
    if err:
        return err
    if scheduled_end <= scheduled_start:
        return jsonify({'error': 'scheduled_end must be after scheduled_start'}), 400

    # user_id is optional — if omitted, shift is "open" for anyone to claim
    target_user_id = None
    shift_status = 'open'
    if data.get('user_id'):
        try:
            target_user_id = int(data['user_id'])
        except (ValueError, TypeError):
            return jsonify({'error': 'user_id must be an integer'}), 400
        if not User.query.get(target_user_id):
            return jsonify({'error': 'User not found'}), 404
        shift_status = 'scheduled'

    shift = Shift(
        user_id=target_user_id,
        location_id=location_id,
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
        notes=data.get('notes'),
        status=shift_status,
        created_by=current_user_id,
    )
    db.session.add(shift)
    db.session.commit()

    return jsonify({'shift': shift.to_dict()}), 201


@shifts_bp.route('/<int:shift_id>', methods=['GET'])
@jwt_required()
def get_shift(shift_id: int):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)
    shift = Shift.query.get_or_404(shift_id)
    if current_user.role != 'admin' and shift.user_id != current_user_id:
        return jsonify({'error': 'Access denied'}), 403
    return jsonify({'shift': shift.to_dict()}), 200


@shifts_bp.route('/<int:shift_id>', methods=['PUT'])
@jwt_required()
def update_shift(shift_id: int):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)
    shift = Shift.query.get_or_404(shift_id)

    if current_user.role != 'admin' and shift.user_id != current_user_id:
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json(silent=True) or {}

    if current_user.role == 'admin':
        if 'user_id' in data:
            if data['user_id'] is None:
                shift.user_id = None
                shift.status = 'open'
            else:
                try:
                    new_uid = int(data['user_id'])
                except (ValueError, TypeError):
                    return jsonify({'error': 'user_id must be an integer'}), 400
                if not User.query.get(new_uid):
                    return jsonify({'error': 'User not found'}), 404
                shift.user_id = new_uid
        if 'location_id' in data:
            try:
                shift.location_id = int(data['location_id'])
            except (ValueError, TypeError):
                return jsonify({'error': 'location_id must be an integer'}), 400
        if 'scheduled_start' in data:
            dt, err = _parse_iso_datetime(data['scheduled_start'], 'scheduled_start')
            if err:
                return err
            shift.scheduled_start = dt
        if 'scheduled_end' in data:
            dt, err = _parse_iso_datetime(data['scheduled_end'], 'scheduled_end')
            if err:
                return err
            shift.scheduled_end = dt
        if 'notes' in data:
            shift.notes = data['notes']
        if 'status' in data:
            if data['status'] not in VALID_STATUSES:
                return jsonify({'error': f'status must be one of: {", ".join(VALID_STATUSES)}'}), 400
            shift.status = data['status']
    else:
        if 'status' not in data or data['status'] != 'confirmed':
            return jsonify({'error': 'Employees may only set status to confirmed'}), 403
        if shift.status == 'cancelled':
            return jsonify({'error': 'Cannot confirm a cancelled shift'}), 400
        shift.status = 'confirmed'

    db.session.commit()
    return jsonify({'shift': shift.to_dict()}), 200


@shifts_bp.route('/<int:shift_id>', methods=['DELETE'])
@jwt_required()
def delete_shift(shift_id: int):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    shift = Shift.query.get_or_404(shift_id)
    shift.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Shift cancelled', 'shift': shift.to_dict()}), 200
