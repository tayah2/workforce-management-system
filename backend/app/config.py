import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-only-change-me')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-dev-only')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///wms.db')
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    JSON_SORT_KEYS = False
    # When set, new employee self-registrations must supply this code.
    # Leave blank (default) to allow open registration — useful for tests.
    REGISTRATION_CODE = os.environ.get('REGISTRATION_CODE', 'CARE2024')


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = False


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_ECHO = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)


config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}
