from typing import Dict, List, Optional

from . import repository


def get_all_categories() -> List[Dict]:
    categories = repository.fetch_all_categories()
    return categories


def get_products(
    category_ids: Optional[List[int]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_weight: Optional[float] = None,
    max_weight: Optional[float] = None,
) -> List[Dict]:
    products = repository.fetch_active_products(category_ids, min_price, max_price, min_weight, max_weight)
    for product in products:
        product["price"] = float(product["price"])
        product["weight"] = float(product["weight"])
        product["quantityInStock"] = int(product["quantityInStock"])
        product["image"] = ""
        product["description"] = ""
    return products


def category_exists(category_id: int) -> bool:
    return repository.category_exists(category_id)


def create_product(
    name: str,
    price: float,
    weight: float,
    category_id: int,
    quantity: int,
) -> Optional[Dict]:
    product_id = repository.insert_product(name, price, weight, category_id)
    repository.insert_inventory_item(product_id, quantity)
    product = repository.fetch_product_by_id(product_id)
    if product is None:
        return None
    product["price"] = float(product["price"])
    product["weight"] = float(product["weight"])
    return product

def delete_product(product_id: int) -> bool:
    return repository.deactivate_product(product_id)
