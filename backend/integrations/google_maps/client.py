"""Google Maps API client wrapper."""

from __future__ import annotations

import logging
import requests
from dataclasses import dataclass
from typing import Dict, Optional, List, Any

logger = logging.getLogger(__name__)


@dataclass
class GoogleMapsConfig:
    api_key: str
    base_url: str = "https://maps.googleapis.com/maps/api"


class GoogleMapsClient:
   

    def __init__(self, config: GoogleMapsConfig) -> None:
        self.config = config

    def geocode(self, address: str) -> Dict[str, Any]:
       
        url = f"{self.config.base_url}/geocode/json"
        params = {
            "address": address,
            "key": self.config.api_key
        }
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "OK" and data.get("results"):
                location = data["results"][0]["geometry"]["location"]
                return {
                    "address": address,
                    "lat": location["lat"],
                    "lng": location["lng"],
                    "status": "OK",
                }
            return {
                "address": address,
                "lat": None,
                "lng": None,
                "status": data.get("status", "UNKNOWN_ERROR"),
            }
        except Exception as e:
            logger.error(f"Geocoding error for {address}: {e}")
            return {
                "address": address,
                "lat": None,
                "lng": None,
                "status": "ERROR",
                "error": str(e)
            }

    def estimate_travel_time(self, origin: str, destination: str) -> Optional[int]:
       
        matrix = self.get_distance_matrix([origin], [destination])
        try:
            if matrix and matrix.get("status") == "OK":
                element = matrix["rows"][0]["elements"][0]
                if element.get("status") == "OK":
                   
                    duration_sec = element.get("duration_in_traffic", element.get("duration", {}))
                    if isinstance(duration_sec, dict) and "value" in duration_sec:
                        return duration_sec["value"] // 60
        except (KeyError, IndexError) as e:
            logger.error(f"Error parsing distance matrix response: {e}")
            
        return None

    def get_distance_matrix(self, origins: List[str], destinations: List[str]) -> Dict[str, Any]:
       
        url = f"{self.config.base_url}/distancematrix/json"
        params = {
            "origins": "|".join(origins),
            "destinations": "|".join(destinations),
            "departure_time": "now",  # traffic aware
            "key": self.config.api_key
        }
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Distance Matrix API error: {e}")
            return {"status": "ERROR", "error": str(e)}

    def get_directions(self, origin: str, destination: str) -> Dict[str, Any]:
        url = f"{self.config.base_url}/directions/json"
        params = {
            "origin": origin,
            "destination": destination,
            "departure_time": "now",
            "key": self.config.api_key,
        }
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if data.get("status") == "OK" and data.get("routes"):
                route = data["routes"][0]
                leg = route["legs"][0]

                duration_block = leg.get("duration_in_traffic", leg.get("duration", {}))
                duration_sec = duration_block.get("value", 0) if isinstance(duration_block, dict) else 0
                distance_m = leg.get("distance", {}).get("value", 0)

                return {
                    "status": "OK",
                    "encoded_polyline": route["overview_polyline"]["points"],
                    "duration_sec": duration_sec,
                    "distance_m": distance_m,
                    "origin": {
                        "lat": leg["start_location"]["lat"],
                        "lng": leg["start_location"]["lng"],
                        "address": leg.get("start_address", origin),
                    },
                    "destination": {
                        "lat": leg["end_location"]["lat"],
                        "lng": leg["end_location"]["lng"],
                        "address": leg.get("end_address", destination),
                    },
                }

            return {"status": data.get("status", "UNKNOWN_ERROR")}
        except Exception as e:
            logger.error(f"Directions API error: {e}")
            return {"status": "ERROR", "error": str(e)}

    def optimize_route(self, origin: str, waypoints: List[str], destination: Optional[str] = None) -> Dict[str, Any]:
        
        url = f"{self.config.base_url}/directions/json"
        
       
        waypoint_str = "optimize:true|" + "|".join(waypoints) if waypoints else ""
        
        params = {
            "origin": origin,
            "destination": destination if destination else origin,
            "waypoints": waypoint_str,
            "departure_time": "now",
            "key": self.config.api_key
        }
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "OK" and data.get("routes"):
                route = data["routes"][0]
                waypoint_order = route.get("waypoint_order", [])
                
                # Calculate total duration in traffic and distance
                total_duration = 0
                total_distance = 0
                for leg in route["legs"]:
                    duration_sec = leg.get("duration_in_traffic", leg.get("duration", {}))
                    if isinstance(duration_sec, dict) and "value" in duration_sec:
                        total_duration += duration_sec["value"]
                    
                    dist_val = leg.get("distance", {})
                    if isinstance(dist_val, dict) and "value" in dist_val:
                        total_distance += dist_val["value"]
                
                ordered_waypoints = [waypoints[i] for i in waypoint_order] if waypoints else []
                
                return {
                    "status": "OK",
                    "ordered_waypoints": ordered_waypoints,
                    "waypoint_order": waypoint_order,
                    "total_duration_mins": total_duration // 60,
                    "total_distance_meters": total_distance,
                    "legs": route["legs"],
                    "overview_polyline": route.get("overview_polyline", {}).get("points"),
                }
            
            return {"status": data.get("status", "UNKNOWN_ERROR")}
        except Exception as e:
            logger.error(f"Optimize Route error: {e}")
            return {"status": "ERROR", "error": str(e)}
