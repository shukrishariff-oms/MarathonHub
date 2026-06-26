"""Promo code generation + lifecycle helpers.

Codes are short, human-typeable, and unique. Format:

    RUN-<evtag>-<rank:02d>-<rand>

Example: RUN-MY01-03-X7K2  (3rd place at event id 1)

The 4-char random suffix prevents collisions when many runners finish at
the same rank across the same event bucket — SQLAlchemy UNIQUE constraint
on the column catches any residual collision as a safety net.
"""
from __future__ import annotations
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional


# Disambiguate from hex (0/O, 1/I) for readability when codes are typed
# in at the cashier / pasted into a chat.
_RAND_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _event_tag(event_id: Optional[int]) -> str:
    """Short alphanumeric tag for the event id. 'MY01', 'SG12', etc."""
    if event_id is None:
        return "GEN"
    return f"E{event_id:02d}"


def generate_promo_code(
    event_id: Optional[int],
    rank: Optional[int],
    submission_id: int,
) -> str:
    """Make a unique-ish code. Suffix uses submission_id + 4 random chars
    so that two runners tying at the same rank still get different codes.

    Random suffix absorbs the bulk of entropy; submission_id is just for
    human traceability when debugging.
    """
    tag = _event_tag(event_id)
    rank_part = f"{rank:02d}" if rank else "00"
    suffix = "".join(secrets.choice(_RAND_ALPHABET) for _ in range(4))
    sub_part = submission_id % 1000  # 0..999 — keeps total length reasonable
    return f"RUN-{tag}-{rank_part}-{sub_part:03d}{suffix}"


def default_expiry(days: int = 30) -> datetime:
    """Default code lifetime — overridable via SiteSetting later."""
    return datetime.utcnow() + timedelta(days=days)


def default_discount_pct() -> int:
    """MVP default. Will move to SiteSetting ('promo_default_discount_pct')."""
    return 15
