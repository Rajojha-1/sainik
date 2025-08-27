from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from ..extensions import db
from ..models import Item, CartItem

bp = Blueprint("csd", __name__, url_prefix="/csd")


@bp.route("/catalog")
@login_required
def catalog():
    items = Item.query.order_by(Item.name).all()
    existing = {ci.item_id: ci for ci in current_user.cart_items}
    return render_template("csd/catalog.html", items=items, existing=existing)


@bp.route("/add", methods=["POST"])
@login_required
def add_to_cart():
    item_id = int(request.form.get("item_id", 0))
    quantity = int(request.form.get("quantity", 1))
    item = Item.query.get_or_404(item_id)
    if item.stock <= 0:
        flash("Item out of stock", "warning")
        return redirect(url_for("csd.catalog"))
    cart_item = CartItem.query.filter_by(user_id=current_user.id, item_id=item.id).first()
    if cart_item:
        cart_item.quantity += quantity
    else:
        cart_item = CartItem(user_id=current_user.id, item_id=item.id, quantity=quantity)
        db.session.add(cart_item)
    db.session.commit()
    flash("Added to cart", "success")
    return redirect(url_for("csd.catalog"))


@bp.route("/cart")
@login_required
def view_cart():
    items = [
        {"id": ci.id, "item": ci.item, "quantity": ci.quantity, "line_total": ci.quantity * ci.item.price}
        for ci in current_user.cart_items
    ]
    total = sum(x["line_total"] for x in items)
    return render_template("csd/cart.html", cart_items=items, total=total)


@bp.route("/update", methods=["POST"])
@login_required
def update_cart():
    ci_id = int(request.form.get("cart_item_id", 0))
    quantity = max(0, int(request.form.get("quantity", 1)))
    cart_item = CartItem.query.get_or_404(ci_id)
    if cart_item.user_id != current_user.id:
        flash("Unauthorized", "danger")
        return redirect(url_for("csd.view_cart"))
    if quantity == 0:
        db.session.delete(cart_item)
    else:
        cart_item.quantity = quantity
    db.session.commit()
    flash("Cart updated", "success")
    return redirect(url_for("csd.view_cart"))


@bp.route("/checkout", methods=["POST"])  # placeholder
@login_required
def checkout():
    for ci in list(current_user.cart_items):
        if ci.item.stock >= ci.quantity:
            ci.item.stock -= ci.quantity
            db.session.delete(ci)
    db.session.commit()
    flash("Checkout successful", "success")
    return redirect(url_for("csd.catalog"))
