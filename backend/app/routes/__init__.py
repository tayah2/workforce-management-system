from .auth import auth_bp
from .users import users_bp
from .locations import locations_bp
from .attendance import attendance_bp
from .payroll import payroll_bp
from .gamification import gamification_bp
from .reports import reports_bp
from .dashboard import dashboard_bp
from .shifts import shifts_bp
from .absences import absences_bp
from .documents import documents_bp
from .messages import messages_bp
from .training import training_bp
from .notifications import notifications_bp
from .chat import chat_bp

__all__ = [
    'auth_bp',
    'users_bp',
    'locations_bp',
    'attendance_bp',
    'payroll_bp',
    'gamification_bp',
    'reports_bp',
    'dashboard_bp',
    'shifts_bp',
    'absences_bp',
    'documents_bp',
    'messages_bp',
    'training_bp',
    'notifications_bp',
    'chat_bp',
]
