MAX_ORDERS = 10
MAX_WEIGHT = 200


def can_add(trip_orders, trip_weight, order_weight):
    return (
        len(trip_orders) < MAX_ORDERS and
        trip_weight + order_weight <= MAX_WEIGHT
    )
