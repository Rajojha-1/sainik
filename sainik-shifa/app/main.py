from flask import Blueprint, render_template
from flask_login import current_user, login_required
from .models import Scheme

bp = Blueprint("main", __name__)


@bp.route("/")
def home():
    return render_template("home.html")


@bp.route("/dashboard")
@login_required
def dashboard():
    # Simple personalization: Recommend first scheme matching user type
    tags = ["family"] if current_user.is_family else ["soldier", "pension"]
    suggestions = Scheme.query.filter(
        Scheme.eligibility_tags.ilike(f"%{tags[0]}%")
    ).all()
    return render_template("dashboard.html", suggestions=suggestions)
