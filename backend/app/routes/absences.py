from datetime import date, datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.absence import Absence
from app.models.notification import Notification
from app.models.user import User

absences_bp = Blueprint('absences', __name__, url_prefix='/api/absences')

VALID_TYPES = {'sick', 'holiday', 'emergency', 'other'}
VALID_STATUSES = {'pending', 'approved', 'rejected'}


def _parse_date(value: str, field_name: str):
    try:
        return date.fromisoformat(value), None
    except (ValueError, TypeError):
        return None, (jsonify({'error': f'{field_name} must be a valid ISO date (YYYY-MM-DD)'}), 400)


def _notify_employee(user_id: int, absence: Absence, approved: bool) -> None:
    date_str = absence.date.isoformat() if absence.date else 'N/A'
    if approved:
        notif = Notification(
            user_id=user_id,
            type='absence_approved',
            title=f'Absence approved for {date_str}',
            body=absence.admin_notes or 'Your absence request has been approved.',
            link='/absences',
        )
    else:
        notif = Notification(
            user_id=user_id,
            type='absence_rejected',
            title=f'Absence not approved for {date_str}',
            body=absence.admin_notes or 'Your absence request has not been approved.',
            link='/absences',
        )
    db.session.add(notif)


@absences_bp.route('/', methods=['GET'])
@jwt_required()
def list_absences():
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    query = Absence.query

    if current_user.role != 'admin':
        query = query.filter(Absence.user_id == current_user_id)
    else:
        status_filter = request.args.get('status')
        if status_filter:
            if status_filter not in VALID_STATUSES:
                return jsonify({'error': f'status must be one of: {", ".join(VALID_STATUSES)}'}), 400
            query = query.filter(Absence.status == status_filter)

        user_id_filter = request.args.get('user_id')
        if user_id_filter:
            try:
                query = query.filter(Absence.user_id == int(user_id_filter))
            except ValueError:
                return jsonify({'error': 'user_id must be an integer'}), 400

    absences = query.order_by(Absence.date.desc()).all()
    return jsonify({'absences': [a.to_dict() for a in absences]}), 200


@absences_bp.route('/', methods=['POST'])
@jwt_required()
def create_absence():
    current_user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    if not data.get('date'):
        return jsonify({'error': 'date is required'}), 400

    absence_date, err = _parse_date(data['date'], 'date')
    if err:
        return err

    absence_type = data.get('type', '').strip()
    if absence_type not in VALID_TYPES:
        return jsonify({'error': f'type must be one of: {", ".join(VALID_TYPES)}'}), 400

    end_date = None
    if data.get('end_date'):
        end_date, err = _parse_date(data['end_date'], 'end_date')
        if err:
            return err
        if end_date < absence_date:
            return jsonify({'error': 'end_date must be on or after date'}), 400

    absence = Absence(
        user_id=current_user_id,
        date=absence_date,
        end_date=end_date,
        type=absence_type,
        reason=data.get('reason', '').strip() or None,
        status='pending',
    )
    db.session.add(absence)
    db.session.commit()

    return jsonify({'absence': absence.to_dict()}), 201


@absences_bp.route('/<int:absence_id>', methods=['GET'])
@jwt_required()
def get_absence(absence_id: int):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)
    absence = Absence.query.get_or_404(absence_id)

    if current_user.role != 'admin' and absence.user_id != current_user_id:
        return jsonify({'error': 'Access denied'}), 403

    return jsonify({'absence': absence.to_dict()}), 200


@absences_bp.route('/<int:absence_id>/approve', methods=['PUT'])
@jwt_required()
def approve_absence(absence_id: int):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    absence = Absence.query.get_or_404(absence_id)

    if absence.status != 'pending':
        return jsonify({'error': 'Only pending absence requests can be approved'}), 400

    data = request.get_json(silent=True) or {}
    absence.status = 'approved'
    absence.admin_notes = data.get('admin_notes', '').strip() or None
    absence.reviewed_by = current_user_id
    absence.reviewed_at = datetime.now(timezone.utc)

    _notify_employee(absence.user_id, absence, approved=True)
    db.session.commit()

    return jsonify({'absence': absence.to_dict()}), 200


@absences_bp.route('/<int:absence_id>/reject', methods=['PUT'])
@jwt_required()
def reject_absence(absence_id: int):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    absence = Absence.query.get_or_404(absence_id)

    if absence.status != 'pending':
        return jsonify({'error': 'Only pending absence requests can be rejected'}), 400

    data = request.get_json(silent=True) or {}
    absence.status = 'rejected'
    absence.admin_notes = data.get('admin_notes', '').strip() or None
    absence.reviewed_by = current_user_id
    absence.reviewed_at = datetime.now(timezone.utc)

    _notify_employee(absence.user_id, absence, approved=False)
    db.session.commit()

    return jsonify({'absence': absence.to_dict()}), 200


@absences_bp.route('/<int:absence_id>', methods=['DELETE'])
@jwt_required()
def delete_absence(absence_id: int):
    current_user_id = int(get_jwt_identity())
    absence = Absence.query.get_or_404(absence_id)

    if absence.user_id != current_user_id:
        return jsonify({'error': 'You can only cancel your own absence requests'}), 403

    if absence.status != 'pending':
        return jsonify({'error': 'Only pending absence requests can be cancelled'}), 400

    db.session.delete(absence)
    db.session.commit()

    return jsonify({'message': 'Absence request cancelled successfully'}), 200
