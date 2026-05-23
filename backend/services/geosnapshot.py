"""GeoSnapShot integration.

GeoSnapShot doesn't expose a public face-search API the way Photohawk does
(uploads are gated behind a session-bound s3 presign + CSRF flow). For now
we just surface the photo count so the runner sees the gallery exists and
can click through manually.

Public endpoints used (no auth required):
  GET https://geosnapshot.com/api/v1/events/{event_id}/albums
    → {"albums": [{"id", "photosCount", "eventName", ...}, ...]}

Gallery URL shape: https://geosnapshot.com/e/<slug>/<event_id>
"""

from __future__ import annotations

import re
from typing import Optional
from urllib.parse import urlparse

import requests

API_BASE = "https://geosnapshot.com/api/v1"
HTTP_TIMEOUT = 8  # seconds — cap to avoid stalling face-search


class GeoSnapShotError(Exception):
    """Anything we couldn't resolve about a geosnapshot gallery."""


def is_geosnapshot_gallery_url(url: str) -> bool:
    """Return True if this looks like a geosnapshot.com event URL."""
    if not url:
        return False
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return False
    return host == "geosnapshot.com" or host.endswith(".geosnapshot.com")


def extract_event_id(url: str) -> Optional[str]:
    """Pull the numeric event id out of a geosnapshot gallery URL.

    Accepts:
      https://geosnapshot.com/e/<slug>/<event_id>
      https://geosnapshot.com/e/<slug>/<event_id>?...
      https://geosnapshot.com/e/<slug>/<event_id>/anything
    Returns the digits as a string, or None if we couldn't find one.
    """
    if not url:
        return None
    m = re.search(r"/e/[^/]+/(\d+)", url)
    return m.group(1) if m else None


def get_photo_count(event_id: str) -> int:
    """Return total photos across all albums for a geosnapshot event.

    Raises GeoSnapShotError on network/parse failure.
    """
    if not event_id:
        raise GeoSnapShotError("missing event_id")
    try:
        r = requests.get(
            f"{API_BASE}/events/{event_id}/albums",
            headers={"Accept": "application/json"},
            timeout=HTTP_TIMEOUT,
        )
    except requests.RequestException as e:
        raise GeoSnapShotError(f"network error: {e}")

    if r.status_code == 404:
        raise GeoSnapShotError("event not found on geosnapshot")
    if r.status_code != 200:
        raise GeoSnapShotError(f"geosnapshot returned HTTP {r.status_code}")

    try:
        data = r.json()
    except Exception:
        raise GeoSnapShotError("invalid JSON from geosnapshot")

    albums = data.get("albums") or []
    total = 0
    for a in albums:
        try:
            total += int(a.get("photosCount") or 0)
        except (TypeError, ValueError):
            continue
    return total


def resolve_gallery_count(gallery_url: str) -> int:
    """Convenience wrapper: URL → total photo count.

    Raises GeoSnapShotError on any failure.
    """
    eid = extract_event_id(gallery_url)
    if not eid:
        raise GeoSnapShotError("could not parse geosnapshot event id from URL")
    return get_photo_count(eid)
