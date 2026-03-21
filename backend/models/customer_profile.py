from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class CustomerProfile:
    """Customer-level preferences and defaults."""

    user_id: int
    default_address_id: Optional[int]
    substitution_preference: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_row(cls, row: dict) -> "CustomerProfile":
        return cls(
            user_id=row["UserID"],
            default_address_id=row.get("DefaultAddressID"),
            substitution_preference=row.get("SubstitutionPreference"),
            notes=row.get("Notes"),
            created_at=row["CreatedAt"],
            updated_at=row["UpdatedAt"],
        )
