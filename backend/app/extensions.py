from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()

# In-memory token blacklist (replace with Redis in production)
blacklisted_tokens: set = set()
