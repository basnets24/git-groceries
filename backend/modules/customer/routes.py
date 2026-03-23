from flask import Blueprint, jsonify, request

from exceptions import ValidationError
from modules.auth.decorators import auth_required

from . import services

customer_bp = Blueprint("customer", __name__)


@customer_bp.route("/api/customers/<int:user_id>/profile", methods=["GET"])
@auth_required
def get_profile(user_id: int):
    data = services.get_customer_context(user_id)
    return jsonify(data)


@customer_bp.route("/api/customers/<int:user_id>/profile", methods=["POST"])
@auth_required
def create_or_update_profile(user_id: int):
    payload = request.get_json(silent=True) or {}
    substitution_preference = payload.get("substitutionPreference")
    notes = payload.get("notes")
    default_address_id = payload.get("defaultAddressId")
    substitution_provided = "substitutionPreference" in payload
    notes_provided = "notes" in payload
    default_provided = "defaultAddressId" in payload

    profile = services.update_profile(
        user_id=user_id,
        substitution_preference=substitution_preference,
        substitution_provided=substitution_provided,
        notes=notes,
        notes_provided=notes_provided,
        default_address_id=default_address_id,
        default_provided=default_provided,
    )
    return jsonify({"profile": profile}), 201


@customer_bp.route("/api/customers/<int:user_id>/addresses", methods=["POST"])
@auth_required
def create_address(user_id: int):
    payload = request.get_json(silent=True) or {}
    required = [
        "label",
        "streetLine1",
        "city",
        "state",
        "postalCode",
    ]
    missing = [field for field in required if not payload.get(field)]
    if missing:
        raise ValidationError(f"Missing required fields: {', '.join(missing)}")

    address = services.add_address(
        user_id=user_id,
        label=payload["label"],
        street_line_1=payload["streetLine1"],
        street_line_2=payload.get("streetLine2"),
        city=payload["city"],
        state=payload["state"],
        postal_code=payload["postalCode"],
        delivery_instructions=payload.get("deliveryInstructions"),
        is_default=bool(payload.get("isDefault", False)),
    )
    return jsonify({"address": address}), 201


@customer_bp.route(
    "/api/customers/<int:user_id>/addresses/<int:address_id>",
    methods=["PUT"],
)
@auth_required
def update_address(user_id: int, address_id: int):
    payload = request.get_json(silent=True) or {}
    required = [
        "label",
        "streetLine1",
        "city",
        "state",
        "postalCode",
    ]
    missing = [field for field in required if not payload.get(field)]
    if missing:
        raise ValidationError(f"Missing required fields: {', '.join(missing)}")

    address = services.update_address(
        user_id=user_id,
        address_id=address_id,
        label=payload["label"],
        street_line_1=payload["streetLine1"],
        street_line_2=payload.get("streetLine2"),
        city=payload["city"],
        state=payload["state"],
        postal_code=payload["postalCode"],
        delivery_instructions=payload.get("deliveryInstructions"),
        is_default=bool(payload.get("isDefault", False)),
    )
    return jsonify({"address": address})


@customer_bp.route(
    "/api/customers/<int:user_id>/default-address",
    methods=["PUT"],
)
@auth_required
def set_default_address(user_id: int):
    payload = request.get_json(silent=True) or {}
    address_id = payload.get("addressId")
    if not address_id:
        raise ValidationError("addressId is required")

    result = services.set_default_address(user_id, int(address_id))
    return jsonify(result)


@customer_bp.route(
    "/api/customers/<int:user_id>/addresses/<int:address_id>",
    methods=["DELETE"],
)
@auth_required
def delete_address(user_id: int, address_id: int):
    result = services.delete_address(user_id, address_id)
    return jsonify(result)
