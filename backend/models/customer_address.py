from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class CustomerAddress:
    """Delivery address saved by a customer."""

    id: int
    user_id: int
    label: str
    street_line_1: str
    street_line_2: Optional[str]
    city: str
    state: str
    postal_code: str
    delivery_instructions: Optional[str]
    is_default: bool
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_row(cls, row: dict) -> "CustomerAddress":
        return cls(
            id=row["CustomerAddressID"],
            user_id=row["UserID"],
            label=row["Label"],
            street_line_1=row["StreetLine1"],
            street_line_2=row.get("StreetLine2"),
            city=row["City"],
            state=row["State"],
            postal_code=row["PostalCode"],
            delivery_instructions=row.get("DeliveryInstructions"),
            is_default=bool(row["IsDefault"]),
            created_at=row["CreatedAt"],
            updated_at=row["UpdatedAt"],
        )
