#!/usr/bin/env bash
# test_customer_profiles.sh — exercise customer profile/addresses API
# Usage: ./tests/test_customer_profiles.sh [BASE_URL] [USER_ID]

set -euo pipefail

BASE_URL="${1:-http://localhost:5001}"
USER_ID="${2:-1}"

if [ -z "${JWT_TOKEN:-}" ]; then
  echo "ERROR: Please export JWT_TOKEN with a valid Bearer token for user $USER_ID"
  exit 1
fi

AUTH_HEADER="Authorization: Bearer $JWT_TOKEN"

print_section() {
  printf "\n=== %s ===\n" "$1"
}

pretty_json() {
  python3 -m json.tool 2>/dev/null || cat
}

run_curl() {
  local method="$1"
  local endpoint="$2"
  local data="${3:-}"

  print_section "$method $endpoint"
  if [ -n "$data" ]; then
    echo "Request: $data"
  fi

  if [ -n "$data" ]; then
    curl -sS -H "$AUTH_HEADER" -H "Content-Type: application/json" \
      -X "$method" -d "$data" "$BASE_URL$endpoint" | pretty_json
  else
    curl -sS -H "$AUTH_HEADER" "$BASE_URL$endpoint" | pretty_json
  fi
}

# 1. Fetch profile snapshot
run_curl GET "/api/customers/$USER_ID/profile"

# 2. Update substitution preference + notes
run_curl POST "/api/customers/$USER_ID/profile" \
  '{"substitutionPreference": "Allow close substitutes", "notes": "No peanuts"}'

# 3. Create a new address (non-default)
run_curl POST "/api/customers/$USER_ID/addresses" \
  '{"label": "Test Address", "streetLine1": "100 Demo St", "city": "San Jose", "state": "CA", "postalCode": "95112", "deliveryInstructions": "Call on arrival", "isDefault": false}'

# 4. Create another address and make default
run_curl POST "/api/customers/$USER_ID/addresses" \
  '{"label": "Default Address", "streetLine1": "200 Main St", "city": "San Jose", "state": "CA", "postalCode": "95126", "isDefault": true}'

# 5. Grab latest profile to see addresses/default
run_curl GET "/api/customers/$USER_ID/profile"

# 6. Update first address (set default)
FIRST_ADDR_ID=$(curl -sS -H "$AUTH_HEADER" "$BASE_URL/api/customers/$USER_ID/profile" | python3 -c "import sys,json;data=json.load(sys.stdin);print(data['addresses'][0]['id'])")
run_curl PUT "/api/customers/$USER_ID/addresses/$FIRST_ADDR_ID" \
  "{\"label\": \"Updated Address\", \"streetLine1\": \"100 Demo St\", \"city\": \"San Jose\", \"state\": \"CA\", \"postalCode\": \"95112\", \"isDefault\": true}"

# 7. Set default via dedicated endpoint
LAST_ADDR_ID=$(curl -sS -H "$AUTH_HEADER" "$BASE_URL/api/customers/$USER_ID/profile" | python3 -c "import sys,json;data=json.load(sys.stdin);print(data['addresses'][-1]['id'])")
run_curl PUT "/api/customers/$USER_ID/default-address" \
  "{\"addressId\": $LAST_ADDR_ID}"

# 8. Delete the first address
run_curl DELETE "/api/customers/$USER_ID/addresses/$FIRST_ADDR_ID"

# 9. Final profile snapshot
run_curl GET "/api/customers/$USER_ID/profile"
