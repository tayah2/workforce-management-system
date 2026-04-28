from typing import List
from app.models.user import User
from app.models.check_in import CheckIn

OVERTIME_THRESHOLD_HOURS = 8.0
OVERTIME_MULTIPLIER = 1.5


def calculate_payroll(user: User, checkins: List[CheckIn]) -> dict:
    """
    Calculate payroll for a user based on a list of completed check-ins.

    Overtime rule: any hours worked beyond 8 hours in a single shift are paid at
    1.5x the hourly rate.

    Returns a dict containing:
        total_hours, regular_hours, overtime_hours,
        regular_pay, overtime_pay, total_pay, shift_count
    """
    total_hours = 0.0
    regular_hours = 0.0
    overtime_hours = 0.0

    completed = [c for c in checkins if c.check_out_time is not None]

    for checkin in completed:
        shift_hours = checkin.calculate_hours()
        total_hours += shift_hours

        if shift_hours <= OVERTIME_THRESHOLD_HOURS:
            regular_hours += shift_hours
        else:
            regular_hours += OVERTIME_THRESHOLD_HOURS
            overtime_hours += shift_hours - OVERTIME_THRESHOLD_HOURS

    rate = user.hourly_rate
    regular_pay = round(regular_hours * rate, 2)
    overtime_pay = round(overtime_hours * rate * OVERTIME_MULTIPLIER, 2)
    total_pay = round(regular_pay + overtime_pay, 2)

    return {
        'user_id': user.id,
        'username': user.username,
        'full_name': f'{user.first_name} {user.last_name}',
        'hourly_rate': rate,
        'shift_count': len(completed),
        'total_hours': round(total_hours, 2),
        'regular_hours': round(regular_hours, 2),
        'overtime_hours': round(overtime_hours, 2),
        'regular_pay': regular_pay,
        'overtime_pay': overtime_pay,
        'total_pay': total_pay,
    }
