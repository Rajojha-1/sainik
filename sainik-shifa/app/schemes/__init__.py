from flask import Blueprint, render_template, request
from flask_login import login_required, current_user
from ..models import Scheme

bp = Blueprint("schemes", __name__, url_prefix="/schemes")


@bp.route("/")
@login_required
def list_schemes():
    category = request.args.get("category")
    query = Scheme.query
    if category:
        query = query.filter_by(category=category)
    schemes = query.order_by(Scheme.title).all()
    return render_template("schemes/list.html", schemes=schemes, category=category)


@bp.route("/suggested")
@login_required
def suggested():
    tags = ["family"] if current_user.is_family else ["soldier", "pension"]
    schemes = Scheme.query.filter(
        Scheme.eligibility_tags.ilike(f"%{tags[0]}%")
    ).all()
    return render_template("schemes/suggested.html", schemes=schemes)
