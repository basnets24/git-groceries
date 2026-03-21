from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class CustomerPreference:
    """Key/value preference captured for a user."""

    id: int
    user_id: int
    preference_type: str
    preference_value: str
    source: Optional[str]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_row(cls, row: dict) -> "CustomerPreference":
        return cls(
            id=row["CustomerPreferenceID"],
            user_id=row["UserID"],
            preference_type=row["PreferenceType"],
            preference_value=row["PreferenceValue"],
            source=row.get("Source"),
            created_at=row["CreatedAt"],
            updated_at=row["UpdatedAt"],
        )
