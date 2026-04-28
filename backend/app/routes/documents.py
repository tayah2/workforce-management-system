from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.document import Document
from app.models.notification import Notification
from app.models.user import User

documents_bp = Blueprint('documents', __name__, url_prefix='/api/documents')

VALID_CATEGORIES = {'policy', 'procedure', 'form', 'health_safety', 'training', 'hr', 'general'}


def _notify_all_employees(title: str, doc_id: int) -> None:
    employees = User.query.filter_by(role='employee', is_active=True).all()
    for emp in employees:
        notif = Notification(
            user_id=emp.id,
            type='document_added',
            title=f'New document: {title}',
            body=None,
            link='/documents',
        )
        db.session.add(notif)


@documents_bp.route('/', methods=['GET'])
@jwt_required()
def list_documents():
    query = Document.query.filter_by(is_active=True)

    category_filter = request.args.get('category')
    if category_filter:
        query = query.filter(Document.category == category_filter)

    docs = query.order_by(Document.created_at.desc()).all()
    return jsonify({'documents': [d.to_dict() for d in docs]}), 200


@documents_bp.route('/', methods=['POST'])
@jwt_required()
def create_document():
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

    doc = Document(
        title=title,
        description=(data.get('description') or '').strip() or None,
        category=category,
        content=data.get('content') or None,
        is_active=True,
        uploaded_by=current_user_id,
    )
    db.session.add(doc)
    db.session.flush()

    _notify_all_employees(title, doc.id)
    db.session.commit()

    return jsonify({'document': doc.to_dict()}), 201


@documents_bp.route('/<int:doc_id>', methods=['GET'])
@jwt_required()
def get_document(doc_id: int):
    doc = Document.query.get_or_404(doc_id)
    if not doc.is_active:
        return jsonify({'error': 'Document not found'}), 404
    return jsonify({'document': doc.to_dict()}), 200


@documents_bp.route('/<int:doc_id>', methods=['PUT'])
@jwt_required()
def update_document(doc_id: int):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    doc = Document.query.get_or_404(doc_id)
    data = request.get_json(silent=True) or {}

    if 'title' in data:
        title = (data['title'] or '').strip()
        if not title:
            return jsonify({'error': 'title cannot be empty'}), 400
        doc.title = title

    if 'description' in data:
        doc.description = (data['description'] or '').strip() or None

    if 'category' in data:
        category = (data['category'] or '').strip()
        if category not in VALID_CATEGORIES:
            return jsonify({'error': f'category must be one of: {", ".join(sorted(VALID_CATEGORIES))}'}), 400
        doc.category = category

    if 'content' in data:
        doc.content = data['content'] or None

    if 'is_active' in data:
        doc.is_active = bool(data['is_active'])

    doc.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({'document': doc.to_dict()}), 200


@documents_bp.route('/<int:doc_id>', methods=['DELETE'])
@jwt_required()
def delete_document(doc_id: int):
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    doc = Document.query.get_or_404(doc_id)
    doc.is_active = False
    doc.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({'message': 'Document archived successfully'}), 200


@documents_bp.route('/categories', methods=['GET'])
@jwt_required()
def list_categories():
    rows = (
        db.session.query(Document.category)
        .filter(Document.is_active == True)
        .distinct()
        .order_by(Document.category.asc())
        .all()
    )
    categories = [r[0] for r in rows]
    return jsonify({'categories': categories}), 200
