"""Lightweight Google Maps API client placeholder."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class GoogleMapsConfig:
    api_key: str
    base_url: str = "https://maps.googleapis.com/maps/api"


class GoogleMapsClient:
    """Placeholder Google Maps client. Extend when adding real requests."""

    def __init__(self, config: GoogleMapsConfig) -> None:
        self.config = config

    def geocode(self, address: str) -> Dict:
        """Stub geocoding call; replace with actual HTTP request later."""
        return {
            "address": address,
            "lat": None,
            "lng": None,
            "status": "NOT_IMPLEMENTED",
        }

    def estimate_travel_time(self, origin: str, destination: str) -> Optional[int]:
        """Return placeholder ETA in minutes until real integration lands."""
        return None
