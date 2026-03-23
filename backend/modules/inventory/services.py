from typing import Dict, List, Optional

from . import repository

LOW_STOCK_THRESHOLD = 20


def get_inventory() -> List[Dict]:
    inventory = repository.fetch_inventory()
    for item in inventory:
        item["price"] = float(item["price"])
        item["lowStockThreshold"] = LOW_STOCK_THRESHOLD
    return inventory


def update_inventory(product_id: int, quantity: int) -> Optional[Dict]:
    if not repository.inventory_item_exists(product_id):
        return None

    repository.update_quantity(product_id, quantity)
    item = repository.fetch_inventory_item(product_id)
    if item is None:
        return None

    item["price"] = float(item["price"])
    item["lowStockThreshold"] = LOW_STOCK_THRESHOLD
    return item
