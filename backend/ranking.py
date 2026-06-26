"""Pure functions for ranking logic.

Kept side-effect-free so they can be unit-tested without a DB. Any DB work
happens in the submissions route, which composes these helpers.

Distance buckets use tolerant ranges — runners' GPS often shows 5.03km or
10.12km, so we widen the bucket to absorb rounding. Anything outside the
named buckets becomes "OTHER" (still leaderboardable, just unranked vs
named categories).
"""
from __future__ import annotations
from typing import Optional, Tuple, List
from datetime import datetime, timedelta


# (label, min_km, max_km) — pace leaderboard ranks inside a single bucket.
DISTANCE_BUCKETS: List[Tuple[str, float, float]] = [
    ("5K", 4.0, 7.0),
    ("10K", 9.0, 12.0),
    ("HM", 19.0, 23.0),   # half marathon
    ("FM", 40.0, 45.0),   # full marathon
]


def classify_distance(distance_km: float) -> str:
    """Return the bucket label for a distance, or 'OTHER' if it doesn't fit.

    Tolerance is generous — GPS noise + manual entry can shift a 10K to
    10.3km easily. We don't want to demote a real 10K runner just because
    their watch rounded up.
    """
    if distance_km is None or distance_km <= 0:
        return "OTHER"
    for label, lo, hi in DISTANCE_BUCKETS:
        if lo <= distance_km <= hi:
            return label
    return "OTHER"


def compute_pace_min_per_km(time_seconds: int, distance_km: float) -> float:
    """Pace in minutes per km. Returns 0.0 if inputs invalid (caller checks)."""
    if not time_seconds or not distance_km or distance_km <= 0:
        return 0.0
    return round((time_seconds / 60.0) / distance_km, 2)


def format_time(seconds: int) -> str:
    """Human-readable finish time: '00:42:15' or '42:15' for sub-hour."""
    if seconds is None or seconds <= 0:
        return "-"
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def find_matching_event(
    activity_date: Optional[datetime],
    activity_location: Optional[str],
    events: list,  # List[models.Event] — kept untyped to avoid circular import
) -> Optional[int]:
    """Try to auto-map a submission to a MarathonHub event.

    MVP heuristic: same date (±1 day) AND fuzzy location match. Returns the
    event_id if a unique match is found, else None — admin resolves
    ambiguity manually.

    Location match is naive substring check (lowercased). Good enough for
    MVP — most events have a distinctive city/state in their location.
    """
    if not activity_date:
        return None

    candidates = []
    activity_day = activity_date.date()
    loc_norm = (activity_location or "").lower().strip()

    for ev in events:
        if not ev.date:
            continue
        ev_day = ev.date.date() if isinstance(ev.date, datetime) else ev.date
        if abs((ev_day - activity_day).days) > 1:
            continue
        if loc_norm:
            ev_loc = (ev.location or "").lower()
            # Tokenize by space/comma, look for any shared >=3-char token
            loc_tokens = {t for t in loc_norm.replace(",", " ").split() if len(t) >= 3}
            ev_tokens = {t for t in ev_loc.replace(",", " ").split() if len(t) >= 3}
            if not (loc_tokens & ev_tokens):
                continue
        candidates.append(ev.id)

    if len(candidates) == 1:
        return candidates[0]
    # Ambiguous or zero — admin decides
    return None
