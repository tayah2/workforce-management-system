"""
WSGI entry point for production deployment (e.g., Gunicorn, uWSGI).

Usage:
    gunicorn "wsgi:app" --bind 0.0.0.0:5000 --workers 4
"""
import os
from app import create_app
from app.extensions import db
from app.seeds import seed_database

config_name = os.environ.get('FLASK_ENV', 'production')
app = create_app(config_name)

with app.app_context():
    db.create_all()
    seed_database()
