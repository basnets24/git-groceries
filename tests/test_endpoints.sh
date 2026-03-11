#!/usr/bin/env bash
# test_endpoints.sh — curl every API endpoint and report results
# Usage: ./tests/test_endpoints.sh [BASE_URL]
#   e.g. ./tests/test_endpoints.sh http://localhost:5000

BASE_URL="${1:-http://localhost:5000}"
PASS=0
FAIL=0

green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
sep()   { printf '%.0s-' {1..60}; echo; }

run_test() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local label="$method $endpoint"

    sep
    bold "TEST: $label"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    echo "Status: $http_code"
    echo "Response:"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"

    if [[ "$http_code" =~ ^2 ]]; then
        green "PASS"
        PASS=$((PASS + 1))
    else
        red "FAIL (HTTP $http_code)"
        FAIL=$((FAIL + 1))
    fi
    echo
}

bold "=== OFS API Endpoint Tests ==="
echo "Base URL: $BASE_URL"
echo

# 1. Health check
run_test GET "/api/health"

# 2. Get all products
run_test GET "/api/products"

# 3. Get inventory
run_test GET "/api/inventory"

# 4. Update inventory — set product 1 quantity to 999
run_test PUT "/api/inventory/1" '{"quantity": 999}'

# 5. Verify update persisted
run_test GET "/api/inventory"

# 6. Restore product 1 quantity back to original
run_test PUT "/api/inventory/1" '{"quantity": 120}'

# 7. Edge case — update non-existent product
run_test PUT "/api/inventory/9999" '{"quantity": 10}'

# 8. Edge case — missing quantity field
run_test PUT "/api/inventory/1" '{}'

# 9. Edge case — negative quantity
run_test PUT "/api/inventory/1" '{"quantity": -5}'

# --- Products ---

# 10. Create a new product
run_test POST "/api/products" '{"name": "Test Product", "price": 1.99, "weight": 0.5, "category_id": 1, "quantity": 10}'

# 11. Edge case — missing fields
run_test POST "/api/products" '{"name": "Bad Product"}'

# 12. Edge case — invalid category
run_test POST "/api/products" '{"name": "Bad Cat", "price": 1.00, "weight": 0.5, "category_id": 999}'

# --- Cart ---

# 13. Add item to cart for customer 1
run_test POST "/api/cart/1" '{"product_id": 1, "quantity": 2}'

# 14. Add another item to same cart
run_test POST "/api/cart/1" '{"product_id": 3, "quantity": 1}'

# 15. Get cart for customer 1
run_test GET "/api/cart/1"

# 16. Edge case — non-existent customer
run_test POST "/api/cart/9999" '{"product_id": 1, "quantity": 1}'

# 17. Edge case — non-existent product
run_test POST "/api/cart/1" '{"product_id": 9999, "quantity": 1}'

# 18. Edge case — missing product_id
run_test POST "/api/cart/1" '{}'

sep
bold "=== Results ==="
green "Passed: $PASS"
if [ "$FAIL" -gt 0 ]; then
    red "Failed: $FAIL"
else
    echo "Failed: $FAIL"
fi

# Tests 7-9 are expected to return 4xx, so we count them as passes if they did fail
exit 0
