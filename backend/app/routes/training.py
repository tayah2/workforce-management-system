from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.training import TrainingCompletion, TrainingModule
from app.models.user import User

training_bp = Blueprint('training', __name__, url_prefix='/api/training')

VALID_CATEGORIES = {'general', 'health_safety', 'policy', 'procedure', 'hr', 'training'}


@training_bp.route('/modules', methods=['GET'])
@jwt_required()
def list_modules():
    current_user_id = int(get_jwt_identity())
    modules = (
        TrainingModule.query
        .filter_by(is_active=True)
        .order_by(TrainingModule.order_num.asc(), TrainingModule.id.asc())
        .all()
    )

    completed_ids = {
        c.module_id for c in TrainingCompletion.query.filter_by(user_id=current_user_id).all()
    }

    result = []
    for m in modules:
        d = m.to_dict()
        d['completed'] = m.id in completed_ids
        result.append(d)

    return jsonify({'modules': result}), 200


@training_bp.route('/modules', methods=['POST'])
@jwt_required()
def create_module():
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json(silent=True) or {}

    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'title is required'}), 400

    category = (data.get('category') or 'general').strip()
    if category not in VALID_CATEGORIES:
        return jsonify({'error': f'category must be one of: {", ".join(sorted(VALID_CATEGORIES))}'}), 400

    estimated_minutes = data.get('estimated_minutes', 15)
    try:
        estimated_minutes = int(estimated_minutes)
        if estimated_minutes < 1:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'error': 'estimated_minutes must be a positive integer'}), 400

    order_num = data.get('order_num', 0)
    try:
        order_num = int(order_num)
    except (ValueError, TypeError):
        return jsonify({'error': 'order_num must be an integer'}), 400

    module = TrainingModule(
        title=title,
        description=(data.get('description') or '').strip() or None,
        content=data.get('content') or None,
        category=category,
        estimated_minutes=estimated_minutes,
        order_num=order_num,
        is_active=True,
        created_by=current_user_id,
    )
    db.session.add(module)
    db.session.commit()

    return jsonify({'module': module.to_dict()}), 201


@training_bp.route('/modules/<int:module_id>', methods=['GET'])
@jwt_required()
def get_module(module_id: int):
    current_user_id = int(get_jwt_identity())
    module = TrainingModule.query.get_or_404(module_id)

    if not module.is_active:
        return jsonify({'error': 'Module not found'}), 404

    d = module.to_dict()
    completion = TrainingCompletion.query.filter_by(
        user_id=current_user_id, module_id=module_id
    ).first()
    d['completed'] = completion is not None
    d['completed_at'] = completion.completed_at.isoformat() if completion else None

    return jsonify({'module': d}), 200


@training_bp.route('/modules/<int:module_id>', methods=['PUT'])
@jwt_required()
def update_module(module_id: int):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    module = TrainingModule.query.get_or_404(module_id)
    data = request.get_json(silent=True) or {}

    if 'title' in data:
        title = (data['title'] or '').strip()
        if not title:
            return jsonify({'error': 'title cannot be empty'}), 400
        module.title = title

    if 'description' in data:
        module.description = (data['description'] or '').strip() or None

    if 'content' in data:
        module.content = data['content'] or None

    if 'category' in data:
        category = (data['category'] or '').strip()
        if category not in VALID_CATEGORIES:
            return jsonify({'error': f'category must be one of: {", ".join(sorted(VALID_CATEGORIES))}'}), 400
        module.category = category

    if 'estimated_minutes' in data:
        try:
            minutes = int(data['estimated_minutes'])
            if minutes < 1:
                raise ValueError
            module.estimated_minutes = minutes
        except (ValueError, TypeError):
            return jsonify({'error': 'estimated_minutes must be a positive integer'}), 400

    if 'order_num' in data:
        try:
            module.order_num = int(data['order_num'])
        except (ValueError, TypeError):
            return jsonify({'error': 'order_num must be an integer'}), 400

    if 'is_active' in data:
        module.is_active = bool(data['is_active'])

    db.session.commit()
    return jsonify({'module': module.to_dict()}), 200


@training_bp.route('/modules/<int:module_id>', methods=['DELETE'])
@jwt_required()
def delete_module(module_id: int):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    module = TrainingModule.query.get_or_404(module_id)
    module.is_active = False
    db.session.commit()

    return jsonify({'message': 'Training module archived successfully'}), 200


@training_bp.route('/modules/<int:module_id>/complete', methods=['POST'])
@jwt_required()
def mark_complete(module_id: int):
    current_user_id = int(get_jwt_identity())
    module = TrainingModule.query.get_or_404(module_id)

    if not module.is_active:
        return jsonify({'error': 'Module not found'}), 404

    existing = TrainingCompletion.query.filter_by(
        user_id=current_user_id, module_id=module_id
    ).first()

    if existing:
        return jsonify({'completion': existing.to_dict(), 'message': 'Already completed'}), 200

    completion = TrainingCompletion(user_id=current_user_id, module_id=module_id)
    db.session.add(completion)
    db.session.commit()

    return jsonify({'completion': completion.to_dict(), 'message': 'Module marked as complete'}), 201


@training_bp.route('/modules/<int:module_id>/complete', methods=['DELETE'])
@jwt_required()
def unmark_complete(module_id: int):
    current_user_id = int(get_jwt_identity())
    TrainingModule.query.get_or_404(module_id)

    completion = TrainingCompletion.query.filter_by(
        user_id=current_user_id, module_id=module_id
    ).first()

    if not completion:
        return jsonify({'error': 'No completion record found for this module'}), 404

    db.session.delete(completion)
    db.session.commit()

    return jsonify({'message': 'Completion removed successfully'}), 200


@training_bp.route('/progress', methods=['GET'])
@jwt_required()
def progress():
    current_user_id = int(get_jwt_identity())

    total = TrainingModule.query.filter_by(is_active=True).count()
    completions = TrainingCompletion.query.filter_by(user_id=current_user_id).all()

    completed_module_ids = {c.module_id for c in completions}
    # Only count completions that belong to active modules
    active_module_ids = {
        m.id for m in TrainingModule.query.filter_by(is_active=True).with_entities(TrainingModule.id).all()
    }
    completed_active = len(completed_module_ids & active_module_ids)

    pct = round((completed_active / total * 100), 1) if total > 0 else 0.0

    return jsonify({
        'total': total,
        'completed': completed_active,
        'pct': pct,
        'completions': [c.to_dict() for c in completions],
    }), 200
