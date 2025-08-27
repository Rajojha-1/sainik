from flask import Flask
from .config import Config
from .extensions import db, login_manager
from .models import User, Item, Scheme, Grievance, CartItem
import os


def create_app() -> Flask:
    app = Flask(__name__, instance_relative_config=True, template_folder="../templates", static_folder="../static")
    app.config.from_object(Config)

    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"

    # Register blueprints
    from .auth import bp as auth_bp
    from .csd import bp as csd_bp
    from .grievances import bp as grievances_bp
    from .schemes import bp as schemes_bp
    from .main import bp as main_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(csd_bp)
    app.register_blueprint(grievances_bp)
    app.register_blueprint(schemes_bp)
    app.register_blueprint(main_bp)

    @login_manager.user_loader
    def load_user(user_id: str):
        return User.query.get(int(user_id))

    @app.before_request
    def ensure_database_seeded():
        # Create tables and seed only once per process
        if not hasattr(app, "_db_seeded"):
            with app.app_context():
                db.create_all()
                _seed_initial_data(app)
                app._db_seeded = True

    return app


def _seed_initial_data(app: Flask) -> None:
    default_username = os.getenv("DEFAULT_USERNAME", "army")
    default_password = os.getenv("DEFAULT_PASSWORD", "armt")

    if User.query.filter_by(username=default_username).first() is None:
        user = User(
            username=default_username,
            is_family=False,
        )
        user.set_password(default_password)
        db.session.add(user)

    if Item.query.count() == 0:
        items = [
            Item(name="Toothpaste (Herbal)", description="CSD essentials - 200g", price=45.0, stock=200),
            Item(name="Detergent Powder", description="1kg pack", price=120.0, stock=150),
            Item(name="Cooking Oil", description="1L refined", price=160.0, stock=100),
            Item(name="Tea (Assam Blend)", description="500g pack", price=220.0, stock=80),
            Item(name="Biscuits (Marie)", description="10 packs", price=90.0, stock=300),
        ]
        db.session.add_all(items)

    if Scheme.query.count() == 0:
        schemes = [
            Scheme(title="Army Education Scholarship", category="education", description="Scholarship for wards of serving soldiers", eligibility_tags="family,education,wards"),
            Scheme(title="Pensioner Medical Benefit", category="medical", description="Enhanced medical coverage for retired personnel", eligibility_tags="pension,medical"),
            Scheme(title="Army Housing Assistance", category="housing", description="Subsidized housing loan for serving soldiers", eligibility_tags="soldier,housing"),
            Scheme(title="Post-Retirement Pension Support", category="pension", description="Timely pension disbursal and support", eligibility_tags="pension"),
        ]
        db.session.add_all(schemes)

    db.session.commit()
