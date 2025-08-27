from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from ..extensions import db
from ..models import Grievance

bp = Blueprint("grievances", __name__, url_prefix="/grievances")


@bp.route("/")
@login_required
def list_grievances():
    my_tickets = Grievance.query.filter_by(user_id=current_user.id).order_by(Grievance.created_at.desc()).all()
    return render_template("grievances/list.html", grievances=my_tickets)


@bp.route("/new", methods=["GET", "POST"])
@login_required
def new_grievance():
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        priority = request.form.get("priority", "medium")
        if not title or not description:
            flash("Title and description are required", "warning")
            return render_template("grievances/new.html")
        g = Grievance(user_id=current_user.id, title=title, description=description, priority=priority)
        db.session.add(g)
        db.session.commit()
        flash("Grievance submitted", "success")
        return redirect(url_for("grievances.list_grievances"))
    return render_template("grievances/new.html")


@bp.route("/<int:gid>")
@login_required
def view_grievance(gid: int):
    g = Grievance.query.get_or_404(gid)
    if g.user_id != current_user.id:
        flash("Unauthorized", "danger")
        return redirect(url_for("grievances.list_grievances"))
    return render_template("grievances/view.html", grievance=g)


@bp.route("/<int:gid>/status", methods=["POST"])  # simple status update for demo
@login_required
def update_status(gid: int):
    g = Grievance.query.get_or_404(gid)
    if g.user_id != current_user.id:
        flash("Unauthorized", "danger")
        return redirect(url_for("grievances.list_grievances"))
    new_status = request.form.get("status", g.status)
    g.status = new_status
    db.session.commit()
    flash("Status updated", "success")
    return redirect(url_for("grievances.view_grievance", gid=gid))
