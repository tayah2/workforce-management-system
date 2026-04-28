from flask import Flask, jsonify
from flask_jwt_extended import JWTManager

from app.config import config_map
from app.extensions import blacklisted_tokens, cors, db, jwt


def create_app(config_name: str = 'development') -> Flask:
    app = Flask(__name__)

    # Load configuration
    cfg_class = config_map.get(config_name, config_map['default'])
    app.config.from_object(cfg_class)

    # Don't redirect /api/users → /api/users/ (strips Authorization on CORS redirects)
    app.url_map.strict_slashes = False

    # Initialise extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r'/api/*': {'origins': app.config.get('FRONTEND_URL', '*')}},
        supports_credentials=True,
    )

    # JWT token blacklist check
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        return jwt_payload['jti'] in blacklisted_tokens

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has been revoked'}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid token'}), 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization token is missing'}), 401

    # Register blueprints
    from app.routes import (
        absences_bp,
        attendance_bp,
        auth_bp,
        chat_bp,
        dashboard_bp,
        documents_bp,
        gamification_bp,
        locations_bp,
        messages_bp,
        notifications_bp,
        payroll_bp,
        reports_bp,
        shifts_bp,
        training_bp,
        users_bp,
    )

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(locations_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(payroll_bp)
    app.register_blueprint(gamification_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(shifts_bp)
    app.register_blueprint(absences_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(training_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(chat_bp)

    # Health check
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'version': '1.0.0'}), 200

    return app
