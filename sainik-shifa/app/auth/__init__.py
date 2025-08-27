from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required
from ..extensions import db
from ..models import User

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for("main.dashboard"))
        flash("Invalid credentials", "danger")
    return render_template("auth/login.html")


@bp.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        is_family = request.form.get("is_family") == "on"
        if not username or not password:
            flash("Username and password required", "warning")
            return render_template("auth/signup.html")
        if User.query.filter_by(username=username).first():
            flash("Username already taken", "warning")
            return render_template("auth/signup.html")
        user = User(username=username, is_family=is_family)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        flash("Signup successful. Please login.", "success")
        return redirect(url_for("auth.login"))
    return render_template("auth/signup.html")


@bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("main.home"))
