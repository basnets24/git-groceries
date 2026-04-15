import sys
import os
from pprint import pprint

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from integrations.google_maps.client import GoogleMapsClient, GoogleMapsConfig

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

api_key = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Verify key isn't empty or the default placeholder
if not api_key or "placeholder_key" in api_key:
    print("============")
    print("WAIT! You need to put a real GOOGLE_MAPS_API_KEY in your .env file first.")
    print("============")
    sys.exit(1)

print("API Key found! Initializing client...\n")
config = GoogleMapsConfig(api_key=api_key)
client = GoogleMapsClient(config)

# 1. Test Geocoding
print("--- 1. Testing Geocode ---")
geo_result = client.geocode("San Jose State University, San Jose, CA")
pprint(geo_result)
print("\n")

# 2. Test Distance Matrix
print("--- 2. Testing Distance Matrix ---")
distance_matrix_res = client.get_distance_matrix(
    origins=["San Jose State University, San Jose, CA"],
    destinations=["Santana Row, San Jose, CA", "SAP Center, San Jose, CA"]
)
if distance_matrix_res.get("status") == "OK":
    print("Successfully retrieved travel times!")
else:
    pprint(distance_matrix_res)
print("\n")

# 3. Test Route Optimization
print("--- 3. Testing Route Optimization ---")
origin = "San Jose State University, San Jose, CA"
waypoints = [
    "Santana Row, San Jose, CA",
    "SAP Center, San Jose, CA",
    "San Pedro Square Market, San Jose, CA"
]
# Simulate a robot round-trip leaving and coming back to SJSU
optimize_res = client.optimize_route(origin=origin, waypoints=waypoints, destination=origin)

if optimize_res.get("status") == "OK":
    print("Original Waypoint list:")
    for w in waypoints:
        print(f" - {w}")
    print("\nOPTIMIZED Waypoint Order (Best route to hit all 3):")
    for idx, best_w in enumerate(optimize_res["ordered_waypoints"]):
        print(f" {idx+1}. {best_w}")
    print(f"\nTotal estimated driving time (traffic-aware): {optimize_res.get('total_duration_mins')} minutes")
else:
    pprint(optimize_res)

