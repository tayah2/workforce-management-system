import math
from app.models.location import Location


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth using the
    Haversine formula.  Returns the distance in kilometres.
    """
    R = 6371.0  # Earth radius in km

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def verify_location(user_lat: float, user_lon: float, location: Location) -> bool:
    """
    Return True if the user's coordinates are within the location's allowed radius.
    """
    if user_lat is None or user_lon is None:
        return False
    distance = haversine(user_lat, user_lon, location.latitude, location.longitude)
    return distance <= location.radius
