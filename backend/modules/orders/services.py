from typing import List, Dict

from . import repository


def get_customer_orders(customer_id: int) -> List[Dict]:
    """Get all completed orders for a customer."""
    return repository.fetch_customer_orders(customer_id)