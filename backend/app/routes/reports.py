from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from app.extensions import db
from app.models.check_in import CheckIn
from app.models.gamification import PointTransaction, Streak
from app.models.location import Location
from app.models.user import User
from app.services.export_service import export_attendance_to_excel
from app.services.payroll_service import calculate_payroll
from app.utils.decorators import admin_required

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


def _parse_date_range():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    start_dt = end_dt = None

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
        except ValueError:
            return None, None, (jsonify({'error': 'start_date must be ISO format'}), 400)

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
        except ValueError:
            return None, None, (jsonify({'error': 'end_date must be ISO format'}), 400)

    return start_dt, end_dt, None


@reports_bp.route('/attendance-summary', methods=['GET'])
@admin_required
def attendance_summary():
    start_dt, end_dt, err = _parse_date_range()
    if err:
        return err

    query = CheckIn.query
    if start_dt:
        query = query.filter(CheckIn.check_in_time >= start_dt)
    if end_dt:
        query = query.filter(CheckIn.check_in_time <= end_dt)

    all_checkins = query.all()
    completed = [c for c in all_checkins if c.check_out_time]

    total_hours = sum(c.calculate_hours() for c in completed)
    verified_checkins = sum(1 for c in all_checkins if c.is_check_in_verified)
    verified_checkouts = sum(1 for c in completed if c.is_check_out_verified)

    # Unique employees
    employee_ids = {c.user_id for c in all_checkins}

    return jsonify({
        'summary': {
            'total_checkins': len(all_checkins),
            'completed_shifts': len(completed),
            'open_shifts': len(all_checkins) - len(completed),
            'total_hours': round(total_hours, 2),
            'unique_employees': len(employee_ids),
            'gps_verified_checkins': verified_checkins,
            'gps_verified_checkouts': verified_checkouts,
        },
        'period': {
            'start_date': start_dt.isoformat() if start_dt else None,
            'end_date': end_dt.isoformat() if end_dt else None,
        },
    }), 200


@reports_bp.route('/daily-activity', methods=['GET'])
@admin_required
def daily_activity():
    try:
        days = min(90, max(1, int(request.args.get('days', 7))))
    except ValueError:
        days = 7

    since = datetime.now(timezone.utc) - timedelta(days=days)
    checkins = (
        CheckIn.query
        .filter(CheckIn.check_in_time >= since)
        .order_by(CheckIn.check_in_time.asc())
        .all()
    )

    # Aggregate by date
    daily: dict = {}
    for c in checkins:
        day_key = c.check_in_time.date().isoformat()
        if day_key not in daily:
            daily[day_key] = {
                'date': day_key,
                'checkins': 0,
                'completed_shifts': 0,
                'hours_worked': 0.0,
            }
        daily[day_key]['checkins'] += 1
        if c.check_out_time:
            daily[day_key]['completed_shifts'] += 1
            daily[day_key]['hours_worked'] += c.calculate_hours()

    result = sorted(daily.values(), key=lambda x: x['date'])
    for row in result:
        row['hours_worked'] = round(row['hours_worked'], 2)

    return jsonify({'daily_activity': result, 'days': days}), 200


@reports_bp.route('/export', methods=['GET'])
@admin_required
def export_attendance():
    start_dt, end_dt, err = _parse_date_range()
    if err:
        return err

    query = CheckIn.query
    if start_dt:
        query = query.filter(CheckIn.check_in_time >= start_dt)
    if end_dt:
        query = query.filter(CheckIn.check_in_time <= end_dt)

    checkins = query.order_by(CheckIn.check_in_time.desc()).all()

    attendance_data = []
    for c in checkins:
        record = c.to_dict()
        user = User.query.get(c.user_id)
        if user:
            record['user'] = user.to_dict()
        loc = Location.query.get(c.location_id)
        if loc:
            record['location'] = loc.to_dict()
            record['location_name'] = loc.name
        attendance_data.append(record)

    stream = export_attendance_to_excel(attendance_data)

    return send_file(
        stream,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='attendance_report.xlsx',
    )


# ============================================================
# Analytics endpoints
# ============================================================

def _default_range():
    """Default to last 30 days."""
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=30)
    return start, end


@reports_bp.route('/location-analytics', methods=['GET'])
@admin_required
def location_analytics():
    start_dt, end_dt, err = _parse_date_range()
    if err:
        return err
    if not start_dt or not end_dt:
        start_dt, end_dt = _default_range()

    locations = Location.query.filter_by(is_active=True).all()
    result = []

    for loc in locations:
        checkins = CheckIn.query.filter(
            CheckIn.location_id == loc.id,
            CheckIn.check_in_time >= start_dt,
            CheckIn.check_in_time <= end_dt,
        ).all()

        completed = [c for c in checkins if c.check_out_time]
        total_hours = sum(c.calculate_hours() for c in completed)
        verified = sum(1 for c in checkins if c.is_check_in_verified)

        # Payroll cost: sum each employee's pay at their rate
        payroll_cost = 0.0
        by_user: dict = {}
        for c in completed:
            by_user.setdefault(c.user_id, []).append(c)
        for user_id, shifts in by_user.items():
            user = User.query.get(user_id)
            if user:
                pay = calculate_payroll(user, shifts)
                payroll_cost += pay['total_pay']

        # Most active employee at this location
        top_user_id = max(by_user, key=lambda uid: len(by_user[uid])) if by_user else None
        top_user = User.query.get(top_user_id) if top_user_id else None

        result.append({
            'location_id': loc.id,
            'location_name': loc.name,
            'address': loc.address,
            'total_shifts': len(checkins),
            'completed_shifts': len(completed),
            'total_hours': round(total_hours, 2),
            'payroll_cost': round(payroll_cost, 2),
            'gps_rate': round(verified / len(checkins) * 100, 1) if checkins else 0,
            'top_employee': f'{top_user.first_name} {top_user.last_name}' if top_user else None,
            'unique_staff': len(by_user),
        })

    result.sort(key=lambda x: x['total_hours'], reverse=True)

    return jsonify({
        'locations': result,
        'period': {'start': start_dt.isoformat(), 'end': end_dt.isoformat()},
        'totals': {
            'total_hours': round(sum(r['total_hours'] for r in result), 2),
            'total_cost': round(sum(r['payroll_cost'] for r in result), 2),
            'total_shifts': sum(r['total_shifts'] for r in result),
        },
    }), 200


@reports_bp.route('/staff-analytics', methods=['GET'])
@admin_required
def staff_analytics():
    start_dt, end_dt, err = _parse_date_range()
    if err:
        return err
    if not start_dt or not end_dt:
        start_dt, end_dt = _default_range()

    employees = User.query.filter_by(role='employee', is_active=True).all()
    result = []

    for emp in employees:
        checkins = CheckIn.query.filter(
            CheckIn.user_id == emp.id,
            CheckIn.check_in_time >= start_dt,
            CheckIn.check_in_time <= end_dt,
        ).all()

        completed = [c for c in checkins if c.check_out_time]
        total_hours = sum(c.calculate_hours() for c in completed)
        verified_in = sum(1 for c in checkins if c.is_check_in_verified)
        pay_data = calculate_payroll(emp, completed) if completed else {
            'total_hours': 0, 'regular_hours': 0, 'overtime_hours': 0,
            'regular_pay': 0, 'overtime_pay': 0, 'total_pay': 0,
        }

        # Gamification totals
        total_points = db.session.query(
            func.coalesce(func.sum(PointTransaction.points), 0)
        ).filter(PointTransaction.user_id == emp.id).scalar()

        streak = Streak.query.filter_by(user_id=emp.id).first()

        # Most visited location
        loc_counts: dict = {}
        for c in completed:
            loc_counts[c.location_id] = loc_counts.get(c.location_id, 0) + 1
        top_loc_id = max(loc_counts, key=loc_counts.get) if loc_counts else None
        top_loc = Location.query.get(top_loc_id) if top_loc_id else None

        result.append({
            'user_id': emp.id,
            'name': f'{emp.first_name} {emp.last_name}',
            'username': emp.username,
            'hourly_rate': emp.hourly_rate,
            'total_shifts': len(checkins),
            'completed_shifts': len(completed),
            'total_hours': round(total_hours, 2),
            'overtime_hours': round(pay_data['overtime_hours'], 2),
            'total_earnings': round(pay_data['total_pay'], 2),
            'gps_rate': round(verified_in / len(checkins) * 100, 1) if checkins else 0,
            'total_points': int(total_points),
            'current_streak': streak.current_streak if streak else 0,
            'top_location': top_loc.name if top_loc else None,
        })

    result.sort(key=lambda x: x['total_hours'], reverse=True)

    return jsonify({
        'staff': result,
        'period': {'start': start_dt.isoformat(), 'end': end_dt.isoformat()},
        'totals': {
            'total_hours': round(sum(r['total_hours'] for r in result), 2),
            'total_earnings': round(sum(r['total_earnings'] for r in result), 2),
            'total_shifts': sum(r['completed_shifts'] for r in result),
        },
    }), 200
