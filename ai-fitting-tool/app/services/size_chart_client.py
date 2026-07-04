import logging
import os

import httpx

logger = logging.getLogger(__name__)


def fetch_size_chart(product_id: str) -> dict:
    """Fetch size chart from the Lumiafrica backend for a product."""
    if not product_id:
        return {}

    backend_url = os.getenv("BACKEND_API_URL", "http://localhost:8080").rstrip("/")
    url = f"{backend_url}/products/{product_id}/size-chart"

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict):
                    return data.get("chart", {})
    except Exception as exc:
        logger.warning("Failed to fetch size chart for %s: %s", product_id, exc)

    return {}
