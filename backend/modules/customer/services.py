from typing import Dict, Optional

from flask import g

from exceptions import AuthError
from models import CustomerAddress, CustomerPreference, CustomerProfile

from . import repository


def _serialize_profile(profile: CustomerProfile) -> Dict:
    return {
        "userId": profile.user_id,
        "defaultAddressId": profile.default_address_id,
        "substitutionPreference": profile.substitution_preference,
        "notes": profile.notes,
        "createdAt": profile.created_at.isoformat(),
        "updatedAt": profile.updated_at.isoformat(),
    }


def _serialize_address(address: CustomerAddress) -> Dict:
    return {
        "id": address.id,
        "userId": address.user_id,
        "label": address.label,
        "streetLine1": address.street_line_1,
        "streetLine2": address.street_line_2,
        "city": address.city,
        "state": address.state,
        "postalCode": address.postal_code,
        "deliveryInstructions": address.delivery_instructions,
        "isDefault": address.is_default,
        "createdAt": address.created_at.isoformat(),
        "updatedAt": address.updated_at.isoformat(),
    }


def _serialize_preference(pref: CustomerPreference) -> Dict:
    return {
        "id": pref.id,
        "userId": pref.user_id,
        "type": pref.preference_type,
        "value": pref.preference_value,
        "source": pref.source,
        "createdAt": pref.created_at.isoformat(),
        "updatedAt": pref.updated_at.isoformat(),
    }


def _ensure_profile(user_id: int) -> CustomerProfile:
    profile = repository.fetch_profile(user_id)
    if profile:
        return profile
    profile = repository.create_profile(user_id)
    if not profile:
        raise AuthError("Unable to create customer profile", 500)
    return profile


def _auth_payload(payload: Optional[Dict] = None) -> Dict:
    ctx = payload or getattr(g, "auth_payload", None)
    if ctx is None:
        raise AuthError("Missing auth context", 401)
    return ctx


def _require_user_access(target_user_id: int) -> Dict:
    payload = _auth_payload()
    if payload["customerID"] != target_user_id:
        raise AuthError("Forbidden", 403)
    return payload


def get_customer_context(user_id: int) -> Dict:
    _require_user_access(user_id)
    profile = _ensure_profile(user_id)
    addresses = repository.fetch_addresses(user_id)
    preferences = repository.fetch_preferences(user_id)
    return {
        "profile": _serialize_profile(profile),
        "addresses": [_serialize_address(addr) for addr in addresses],
        "preferences": [_serialize_preference(pref) for pref in preferences],
    }


def update_profile(
    user_id: int,
    substitution_preference: Optional[str],
    substitution_provided: bool,
    notes: Optional[str],
    notes_provided: bool,
    default_address_id: Optional[int],
    default_provided: bool,
) -> Dict:
    _require_user_access(user_id)
    current_profile = _ensure_profile(user_id)

    new_sub_pref = (
        substitution_preference
        if substitution_provided
        else current_profile.substitution_preference
    )
    new_notes = notes if notes_provided else current_profile.notes
    new_default = current_profile.default_address_id

    if default_provided:
        if default_address_id is None:
            repository.clear_default_address(user_id)
            new_default = None
        else:
            existing = repository.fetch_address(user_id, default_address_id)
            if existing is None:
                raise AuthError("Default address not found", 404)
            repository.clear_default_address(user_id)
            repository.set_default_address(user_id, existing.id)
            new_default = existing.id

    profile = repository.update_profile(user_id, new_sub_pref, new_notes, new_default)
    return _serialize_profile(profile)


def add_address(
    user_id: int,
    label: str,
    street_line_1: str,
    street_line_2: Optional[str],
    city: str,
    state: str,
    postal_code: str,
    delivery_instructions: Optional[str],
    is_default: bool,
) -> Dict:
    _require_user_access(user_id)
    profile = _ensure_profile(user_id)

    existing_addresses = repository.fetch_addresses(user_id)
    make_default = is_default or len(existing_addresses) == 0

    if make_default:
        repository.clear_default_address(user_id)

    address = repository.insert_address(
        user_id,
        label,
        street_line_1,
        street_line_2,
        city,
        state,
        postal_code,
        delivery_instructions,
        make_default,
    )

    if make_default:
        repository.set_default_address(user_id, address.id)
        repository.update_profile(
            user_id,
            profile.substitution_preference,
            profile.notes,
            address.id,
        )

    return _serialize_address(address)


def update_address(
    user_id: int,
    address_id: int,
    label: str,
    street_line_1: str,
    street_line_2: Optional[str],
    city: str,
    state: str,
    postal_code: str,
    delivery_instructions: Optional[str],
    is_default: bool,
) -> Dict:
    _require_user_access(user_id)
    existing = repository.fetch_address(user_id, address_id)
    if existing is None:
        raise AuthError("Address not found", 404)

    make_default = is_default or existing.is_default
    if make_default:
        repository.clear_default_address(user_id)

    updated = repository.update_address(
        user_id,
        address_id,
        label,
        street_line_1,
        street_line_2,
        city,
        state,
        postal_code,
        delivery_instructions,
        make_default,
    )
    if updated is None:
        raise AuthError("Address not found", 404)

    if make_default:
        repository.set_default_address(user_id, updated.id)
        profile = _ensure_profile(user_id)
        repository.update_profile(
            user_id,
            profile.substitution_preference,
            profile.notes,
            updated.id,
        )

    return _serialize_address(updated)


def set_default_address(user_id: int, address_id: int) -> Dict:
    _require_user_access(user_id)
    address = repository.fetch_address(user_id, address_id)
    if address is None:
        raise AuthError("Address not found", 404)

    repository.clear_default_address(user_id)
    repository.set_default_address(user_id, address.id)
    profile = _ensure_profile(user_id)
    repository.update_profile(
        user_id,
        profile.substitution_preference,
        profile.notes,
        address.id,
    )
    return {"status": "updated"}


def delete_address(user_id: int, address_id: int) -> Dict:
    _require_user_access(user_id)

    existing = repository.fetch_address(user_id, address_id)
    if existing is None:
        raise AuthError("Address not found", 404)
    profile = _ensure_profile(user_id)

    was_default = existing.is_default
    repository.delete_address(user_id, address_id)

    if was_default:
        remaining = repository.fetch_addresses(user_id)
        new_default = remaining[0].id if remaining else None
        repository.update_profile(
            user_id,
            profile.substitution_preference,
            profile.notes,
            new_default,
        )
        if new_default:
            repository.clear_default_address(user_id)
            repository.set_default_address(user_id, new_default)

    return {"status": "deleted"}
