#!/usr/bin/env bash
# fill_cart.sh — Add items to a customer's cart via the API
# Usage: ./tests/fill_cart.sh [BASE_URL] [CUSTOMER_ID]
#   CUSTOMER_ID defaults to 1 (gingertea from seed data)

BASE_URL="${1:-http://localhost:5000}"
CUSTOMER_ID="${2:-1}"

green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
sep()   { printf '%.0s-' {1..60}; echo; }

add_to_cart() {
    local product_id="$1" quantity="$2" label="$3"

    sep
    bold "Adding to cart: $label (product $product_id, qty $quantity)"

    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"product_id\": $product_id, \"quantity\": $quantity}" \
        "$BASE_URL/api/cart/$CUSTOMER_ID")

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"

    if [[ "$http_code" =~ ^2 ]]; then
        green "OK (HTTP $http_code)"
    else
        red "FAIL (HTTP $http_code)"
    fi
}

bold "=== Filling Cart for Customer $CUSTOMER_ID ==="
echo "Base URL: $BASE_URL"
echo
echo "Seed customers: 1=gingertea, 2=kaizansatta, 3=anshhh"
echo

# Add a mix of products from the seed data (product IDs 1-10)
add_to_cart 1  3  "Bananas Bunch x3"
add_to_cart 2  1  "Gala Apples Bag x1"
add_to_cart 5  2  "Sliced Turkey Breast x2"
add_to_cart 8  1  "Sliced American Cheese Pack x1"
add_to_cart 9  1  "Whole Milk Gallon x1"
add_to_cart 10 2  "Large Eggs Dozen x2"

sep
bold "=== Done ==="
echo
echo "Fetching cart for customer $CUSTOMER_ID:"
curl -s "$BASE_URL/api/cart/$CUSTOMER_ID" | python3 -m json.tool 2>/dev/null
