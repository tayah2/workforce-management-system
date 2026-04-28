from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.check_in import CheckIn
from app.models.user import User
from app.services.payroll_service import calculate_payroll
from app.services.export_service import export_payroll_to_excel

payroll_bp = Blueprint('payroll', __name__, url_prefix='/api/payroll')


def _get_checkins_for_period(user_ids, start_dt, end_dt):
    query = CheckIn.query.filter(
        CheckIn.user_id.in_(user_ids),
        CheckIn.check_out_time.isnot(None),
    )
    if start_dt:
        query = query.filter(CheckIn.check_in_time >= start_dt)
    if end_dt:
        query = query.filter(CheckIn.check_in_time <= end_dt)
    return query.all()


def _parse_payroll_params():
    """Parse and validate common payroll query params. Returns (start_dt, end_dt, user_id, error_response)."""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    user_id_param = request.args.get('user_id')

    start_dt = end_dt = None

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
        except ValueError:
            return None, None, None, (jsonify({'error': 'start_date must be ISO format'}), 400)

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
        except ValueError:
            return None, None, None, (jsonify({'error': 'end_date must be ISO format'}), 400)

    user_id = None
    if user_id_param:
        try:
            user_id = int(user_id_param)
        except ValueError:
            return None, None, None, (jsonify({'error': 'user_id must be an integer'}), 400)

    return start_dt, end_dt, user_id, None


@payroll_bp.route('/', methods=['GET'])
@jwt_required()
def get_payroll():
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    start_dt, end_dt, user_id, err = _parse_payroll_params()
    if err:
        return err

    if current_user.role == 'admin':
        if user_id:
            users = [User.query.get_or_404(user_id)]
        else:
            users = User.query.filter_by(is_active=True).all()
    else:
        # Employees can only see their own payroll
        users = [current_user]

    user_ids = [u.id for u in users]
    all_checkins = _get_checkins_for_period(user_ids, start_dt, end_dt)

    # Group check-ins by user
    checkins_by_user = {u.id: [] for u in users}
    for c in all_checkins:
        if c.user_id in checkins_by_user:
            checkins_by_user[c.user_id].append(c)

    payroll_data = []
    totals = {'total_hours': 0, 'total_pay': 0, 'shift_count': 0}

    for user in users:
        result = calculate_payroll(user, checkins_by_user[user.id])
        payroll_data.append(result)
        totals['total_hours'] += result['total_hours']
        totals['total_pay'] += result['total_pay']
        totals['shift_count'] += result['shift_count']

    return jsonify({
        'payroll': payroll_data,
        'summary': {
            'total_hours': round(totals['total_hours'], 2),
            'total_pay': round(totals['total_pay'], 2),
            'shift_count': totals['shift_count'],
            'employee_count': len(users),
        },
        'period': {
            'start_date': start_dt.isoformat() if start_dt else None,
            'end_date': end_dt.isoformat() if end_dt else None,
        },
    }), 200


@payroll_bp.route('/export', methods=['GET'])
@jwt_required()
def export_payroll():
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    start_dt, end_dt, user_id, err = _parse_payroll_params()
    if err:
        return err

    if current_user.role == 'admin':
        if user_id:
            users = [User.query.get_or_404(user_id)]
        else:
            users = User.query.filter_by(is_active=True).all()
    else:
        users = [current_user]

    user_ids = [u.id for u in users]
    all_checkins = _get_checkins_for_period(user_ids, start_dt, end_dt)

    checkins_by_user = {u.id: [] for u in users}
    for c in all_checkins:
        if c.user_id in checkins_by_user:
            checkins_by_user[c.user_id].append(c)

    payroll_data = [
        calculate_payroll(user, checkins_by_user[user.id])
        for user in users
    ]

    stream = export_payroll_to_excel(payroll_data)
    filename = 'payroll_report.xlsx'

    return send_file(
        stream,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename,
    )
