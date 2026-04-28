from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.check_in import CheckIn
from app.models.location import Location
from app.models.user import User
from app.services.gps_service import verify_location
from app.services.gamification_service import (
    award_shift_points,
    check_and_award_badges,
    update_streak,
)

attendance_bp = Blueprint('attendance', __name__, url_prefix='/api')


@attendance_bp.route('/checkin', methods=['POST'])
@jwt_required()
def checkin():
    current_user_id = int(get_jwt_identity())
    user = User.query.get_or_404(current_user_id)

    if not user.is_active:
        return jsonify({'error': 'Account is inactive'}), 403

    # Prevent double check-in
    open_checkin = CheckIn.query.filter_by(
        user_id=current_user_id, check_out_time=None
    ).first()
    if open_checkin:
        return jsonify({
            'error': 'You are already checked in',
            'open_checkin_id': open_checkin.id,
        }), 409

    data = request.get_json(silent=True) or {}

    location_id = data.get('location_id')
    if not location_id:
        return jsonify({'error': 'location_id is required'}), 400

    location = Location.query.filter_by(id=location_id, is_active=True).first()
    if not location:
        return jsonify({'error': 'Location not found or inactive'}), 404

    lat = data.get('latitude')
    lon = data.get('longitude')

    try:
        lat = float(lat) if lat is not None else None
        lon = float(lon) if lon is not None else None
    except (TypeError, ValueError):
        return jsonify({'error': 'latitude and longitude must be numeric'}), 400

    is_verified = verify_location(lat, lon, location) if lat is not None else False

    checkin_record = CheckIn(
        user_id=current_user_id,
        location_id=location_id,
        check_in_time=datetime.now(timezone.utc),
        check_in_latitude=lat,
        check_in_longitude=lon,
        is_check_in_verified=is_verified,
        notes=data.get('notes', ''),
    )
    db.session.add(checkin_record)
    db.session.commit()

    return jsonify({
        'message': 'Checked in successfully',
        'checkin': checkin_record.to_dict(),
        'is_verified': is_verified,
    }), 201


@attendance_bp.route('/checkout', methods=['POST'])
@jwt_required()
def checkout():
    current_user_id = int(get_jwt_identity())
    user = User.query.get_or_404(current_user_id)

    open_checkin = CheckIn.query.filter_by(
        user_id=current_user_id, check_out_time=None
    ).first()
    if not open_checkin:
        return jsonify({'error': 'You are not currently checked in'}), 400

    data = request.get_json(silent=True) or {}

    lat = data.get('latitude')
    lon = data.get('longitude')

    try:
        lat = float(lat) if lat is not None else None
        lon = float(lon) if lon is not None else None
    except (TypeError, ValueError):
        return jsonify({'error': 'latitude and longitude must be numeric'}), 400

    location = Location.query.get(open_checkin.location_id)
    is_verified = (
        verify_location(lat, lon, location)
        if (lat is not None and location)
        else False
    )

    break_minutes = data.get('break_minutes', 0)
    try:
        break_minutes = int(break_minutes)
        if break_minutes < 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({'error': 'break_minutes must be a non-negative integer'}), 400

    open_checkin.check_out_time = datetime.now(timezone.utc)
    open_checkin.check_out_latitude = lat
    open_checkin.check_out_longitude = lon
    open_checkin.is_check_out_verified = is_verified
    open_checkin.break_minutes = break_minutes

    db.session.flush()

    # Gamification
    points_earned = award_shift_points(user, open_checkin)
    update_streak(user, open_checkin)
    new_badges = check_and_award_badges(user)

    db.session.commit()

    hours_worked = open_checkin.calculate_hours()

    return jsonify({
        'message': 'Checked out successfully',
        'checkin': open_checkin.to_dict(),
        'hours_worked': hours_worked,
        'points_earned': points_earned,
        'is_verified': is_verified,
        'new_badges': [b.to_dict() for b in new_badges],
    }), 200


@attendance_bp.route('/attendance', methods=['GET'])
@jwt_required()
def list_attendance():
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    query = CheckIn.query

    # Employees can only see their own records
    if current_user.role != 'admin':
        query = query.filter(CheckIn.user_id == current_user_id)
    else:
        user_id_filter = request.args.get('user_id')
        if user_id_filter:
            try:
                query = query.filter(CheckIn.user_id == int(user_id_filter))
            except ValueError:
                return jsonify({'error': 'user_id must be an integer'}), 400

    location_id = request.args.get('location_id')
    if location_id:
        try:
            query = query.filter(CheckIn.location_id == int(location_id))
        except ValueError:
            return jsonify({'error': 'location_id must be an integer'}), 400

    start_date = request.args.get('start_date')
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(CheckIn.check_in_time >= start_dt)
        except ValueError:
            return jsonify({'error': 'start_date must be ISO format'}), 400

    end_date = request.args.get('end_date')
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(CheckIn.check_in_time <= end_dt)
        except ValueError:
            return jsonify({'error': 'end_date must be ISO format'}), 400

    # Pagination
    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(100, max(1, int(request.args.get('per_page', 20))))
    except ValueError:
        return jsonify({'error': 'page and per_page must be integers'}), 400

    paginated = (
        query
        .order_by(CheckIn.check_in_time.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    records = []
    for c in paginated.items:
        record = c.to_dict()
        user = User.query.get(c.user_id)
        if user:
            record['user'] = user.to_dict()
        loc = Location.query.get(c.location_id)
        if loc:
            record['location'] = loc.to_dict()
        records.append(record)

    return jsonify({
        'records': records,
        'total': paginated.total,
        'page': paginated.page,
        'per_page': per_page,
        'pages': paginated.pages,
    }), 200


@attendance_bp.route('/attendance/current', methods=['GET'])
@jwt_required()
def current_attendance():
    current_user_id = int(get_jwt_identity())
    open_checkin = CheckIn.query.filter_by(
        user_id=current_user_id, check_out_time=None
    ).first()

    if not open_checkin:
        return jsonify({'checkin': None, 'is_checked_in': False}), 200

    record = open_checkin.to_dict()
    loc = Location.query.get(open_checkin.location_id)
    if loc:
        record['location'] = loc.to_dict()

    return jsonify({'checkin': record, 'is_checked_in': True}), 200
