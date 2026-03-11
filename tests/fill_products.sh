#!/usr/bin/env bash
# fill_products.sh — Add sample products to the catalog via the API
# Usage: ./tests/fill_products.sh [BASE_URL]

BASE_URL="${1:-http://localhost:5000}"

green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
sep()   { printf '%.0s-' {1..60}; echo; }

add_product() {
    local name="$1" price="$2" weight="$3" cat_id="$4" qty="$5"

    sep
    bold "Adding: $name"

    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$name\", \"price\": $price, \"weight\": $weight, \"category_id\": $cat_id, \"quantity\": $qty}" \
        "$BASE_URL/api/products")

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"

    if [[ "$http_code" =~ ^2 ]]; then
        green "OK (HTTP $http_code)"
    else
        red "FAIL (HTTP $http_code)"
    fi
}

bold "=== Filling Products ==="
echo "Base URL: $BASE_URL"
echo
echo "Existing categories from seed data:"
echo "  1 = Fresh Produce"
echo "  2 = Deli Meats"
echo "  3 = Dairy"
echo

# Fresh Produce (category 1)
add_product "Organic Kale Bunch"      3.49  0.75  1  50
add_product "Sweet Potatoes Bag"      4.99  3.00  1  65
add_product "Avocados Pack of 4"      5.99  1.20  1  40
add_product "Fresh Blueberries Pint"  4.49  0.50  1  55
add_product "Red Bell Peppers"        2.99  0.60  1  70

# Deli Meats (category 2)
add_product "Peppered Salami"         6.49  0.75  2  30
add_product "Smoked Chicken Breast"   8.49  1.00  2  25
add_product "Prosciutto Sliced"       9.99  0.50  2  20

# Dairy (category 3)
add_product "Greek Yogurt Tub"        5.99  2.00  3  80
add_product "Butter Unsalted Block"   4.29  0.50  3  60
add_product "Mozzarella Fresh Ball"   6.99  1.00  3  35

sep
bold "=== Done ==="
echo
echo "Verify by fetching all products:"
curl -s "$BASE_URL/api/products" | python3 -m json.tool 2>/dev/null
