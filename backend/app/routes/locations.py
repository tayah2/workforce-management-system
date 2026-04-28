from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.location import Location
from app.utils.decorators import admin_required

locations_bp = Blueprint('locations', __name__, url_prefix='/api/locations')


@locations_bp.route('/', methods=['GET'])
@jwt_required()
def list_locations():
    locations = Location.query.filter_by(is_active=True).all()
    return jsonify({'locations': [loc.to_dict() for loc in locations]}), 200


@locations_bp.route('/<int:location_id>', methods=['GET'])
@jwt_required()
def get_location(location_id):
    location = Location.query.get_or_404(location_id)
    return jsonify({'location': location.to_dict()}), 200


@locations_bp.route('/', methods=['POST'])
@admin_required
def create_location():
    data = request.get_json(silent=True) or {}

    required = ('name', 'address', 'latitude', 'longitude')
    for field in required:
        if field not in data:
            return jsonify({'error': f'Field "{field}" is required'}), 400

    try:
        lat = float(data['latitude'])
        lon = float(data['longitude'])
    except (TypeError, ValueError):
        return jsonify({'error': 'latitude and longitude must be numeric'}), 400

    radius = data.get('radius', 0.1)
    try:
        radius = float(radius)
        if radius <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({'error': 'radius must be a positive number'}), 400

    location = Location(
        name=data['name'].strip(),
        address=data['address'].strip(),
        latitude=lat,
        longitude=lon,
        radius=radius,
    )
    db.session.add(location)
    db.session.commit()
    return jsonify({'message': 'Location created', 'location': location.to_dict()}), 201


@locations_bp.route('/<int:location_id>', methods=['PUT'])
@admin_required
def update_location(location_id):
    location = Location.query.get_or_404(location_id)
    data = request.get_json(silent=True) or {}

    if 'name' in data:
        location.name = data['name'].strip()
    if 'address' in data:
        location.address = data['address'].strip()

    if 'latitude' in data:
        try:
            location.latitude = float(data['latitude'])
        except (TypeError, ValueError):
            return jsonify({'error': 'latitude must be numeric'}), 400

    if 'longitude' in data:
        try:
            location.longitude = float(data['longitude'])
        except (TypeError, ValueError):
            return jsonify({'error': 'longitude must be numeric'}), 400

    if 'radius' in data:
        try:
            r = float(data['radius'])
            if r <= 0:
                raise ValueError
            location.radius = r
        except (TypeError, ValueError):
            return jsonify({'error': 'radius must be a positive number'}), 400

    if 'is_active' in data:
        location.is_active = bool(data['is_active'])

    db.session.commit()
    return jsonify({'message': 'Location updated', 'location': location.to_dict()}), 200


@locations_bp.route('/<int:location_id>', methods=['DELETE'])
@admin_required
def delete_location(location_id):
    location = Location.query.get_or_404(location_id)
    location.is_active = False
    db.session.commit()
    return jsonify({'message': 'Location deactivated'}), 200
