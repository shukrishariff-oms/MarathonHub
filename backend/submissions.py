"""Submission + ranking + promo code routes (MVP viral loop).

Layout:
  Public (no auth):
    POST /api/submissions          submit a new activity
    POST /api/submissions/upload   upload a screenshot (returns path)
    GET  /api/leaderboard          ranked list with category filter
    GET  /api/runners/{id}         runner public profile
  Admin (auth required):
    GET    /api/admin/submissions          list with filters
    POST   /api/admin/submissions/{id}/approve  verify + rank + promo
    POST   /api/admin/submissions/{id}/reject   reject
    GET    /api/admin/promo-codes         list issued codes

Design notes:
  - No runner login — runner is upserted by email. Same email + name merges
    into one Runner row so a runner submitting twice doesn't double up.
  - "Rank" is computed on-the-fly from approved submissions — we don't
    maintain a separate materialized Rankings table at MVP scale.
  - Promo codes are issued ONLY at approval time, with a flag on the
    approve payload so admin can opt out for non-eligible activities.
"""
from __future__ import annotations
import os
import uuid
import shutil
import logging
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import (
    APIRouter, Depends, HTTPException, Request, UploadFile, File, Query,
)
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

import database, models, schemas, auth, ranking, promo

logger = logging.getLogger("marathonhub.submissions")
router = APIRouter()


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Public submit
# ---------------------------------------------------------------------------

@router.post("/api/submissions/upload")
async def upload_screenshot(file: UploadFile = File(...)):
    """Public screenshot upload — saves under storage/screenshots/ and
    returns a server-relative path the frontend can attach to the
    subsequent /api/submissions call.

    NOTE: For MVP we accept anything image-ish. Admin verifies before
    approving, so an attacker uploading junk just wastes disk + admin
    review time. If abuse becomes real, swap to signed-URL + content-type
    sniffing + size cap.
    """
    if not file or not file.filename:
        raise HTTPException(400, "No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".heic"):
        raise HTTPException(400, f"Unsupported image type: {ext}")

    # Resolve to backend/storage/uploads/screenshots/ — subfolder of the
    # existing /api/uploads StaticFiles mount, so the URL we return is
    # already served by main.py without adding a second mount.
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    storage_dir = os.path.join(BASE_DIR, "storage", "uploads", "screenshots")
    # Local-dev fallback matches the main.py convention (storage one level up).
    if not os.path.exists(os.path.join(BASE_DIR, "storage")) and os.path.exists(os.path.join(BASE_DIR, "..", "storage")):
        storage_dir = os.path.join(BASE_DIR, "..", "storage", "uploads", "screenshots")
    os.makedirs(storage_dir, exist_ok=True)

    fname = f"{uuid.uuid4().hex}{ext}"
    fpath = os.path.join(storage_dir, fname)
    with open(fpath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Server-relative path so frontend can prefix the API host.
    return {"path": f"/api/uploads/screenshots/{fname}"}


@router.post("/api/submissions", response_model=schemas.SubmissionOut)
def submit(payload: schemas.SubmissionCreate, db: Session = Depends(get_db)):
    """Create a submission. Upserts runner by (email, name)."""
    has_url = bool((payload.strava_url or "").strip())
    has_img = bool((payload.screenshot_path or "").strip())
    if has_url == has_img:
        raise HTTPException(
            400,
            "Provide exactly ONE of strava_url or screenshot_path.",
        )

    if not (payload.name or "").strip() or not (payload.email or "").strip():
        raise HTTPException(400, "name and email are required.")
    if "@" not in (payload.email or ""):
        raise HTTPException(400, "email looks invalid.")

    # Upsert runner — same email + same (case-insensitive) name = same row.
    email_norm = payload.email.strip().lower()
    name_norm = payload.name.strip()
    runner = (
        db.query(models.Runner)
        .filter(models.Runner.email == email_norm)
        .filter(models.Runner.name.ilike(name_norm))
        .first()
    )
    if not runner:
        runner = models.Runner(
            name=name_norm,
            email=email_norm,
            instagram_handle=(payload.instagram_handle or None),
            strava_handle=(payload.strava_handle or None),
        )
        db.add(runner)
        db.flush()  # get runner.id without committing

    sub = models.Submission(
        runner_id=runner.id,
        submission_type="url" if has_url else "screenshot",
        strava_url=(payload.strava_url.strip() if has_url else None),
        screenshot_path=(payload.screenshot_path.strip() if has_img else None),
        event_id=payload.suggested_event_id,  # admin still verifies
        status="pending",
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    # Hydrate runner for the response (SubmissionOut.runner is nested).
    out = schemas.SubmissionOut.model_validate(sub)
    out.runner = schemas.RunnerOut.model_validate(runner)
    out.event_name = None  # no event mapped yet
    return out


@router.get("/api/leaderboard", response_model=schemas.LeaderboardResponse)
def leaderboard(
    category: str = Query("OVERALL", pattern="^(5K|10K|HM|FM|ELEVATION|OVERALL)$"),
    event_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Public leaderboard. Categories:
      - 5K/10K/HM/FM: fastest pace within the distance bucket
      - ELEVATION: most elevation gain (across any distance)
      - OVERALL: fastest raw time across all distances
    """
    q = db.query(models.Submission).filter(models.Submission.status == "approved")
    if event_id is not None:
        q = q.filter(models.Submission.event_id == event_id)

    event_name = None
    if event_id is not None:
        ev = db.query(models.Event).filter(models.Event.id == event_id).first()
        if ev:
            event_name = ev.name

    entries: List[schemas.LeaderboardEntry] = []
    if category == "ELEVATION":
        rows = (
            q.filter(models.Submission.elevation_gain_m.isnot(None))
            .order_by(models.Submission.elevation_gain_m.desc())
            .limit(limit).all()
        )
        for i, s in enumerate(rows, 1):
            entries.append(_entry_from_submission(s, i, category="ELEVATION"))
    elif category == "OVERALL":
        rows = q.order_by(models.Submission.time_seconds.asc()).limit(limit).all()
        for i, s in enumerate(rows, 1):
            entries.append(_entry_from_submission(s, i, category=ranking.classify_distance(s.distance_km)))
    else:
        # Pace within distance bucket — pre-filter by tolerant km range.
        bucket = next((b for b in ranking.DISTANCE_BUCKETS if b[0] == category), None)
        if bucket is None:
            raise HTTPException(400, f"Unknown category {category}")
        _, lo, hi = bucket
        rows = (
            q.filter(models.Submission.distance_km >= lo)
            .filter(models.Submission.distance_km <= hi)
            .filter(models.Submission.distance_km.isnot(None))
            .filter(models.Submission.time_seconds.isnot(None))
            .all()
        )
        # Sort by pace in Python — SQLite doesn't store the computed column.
        rows.sort(key=lambda s: ranking.compute_pace_min_per_km(s.time_seconds, s.distance_km))
        rows = rows[:limit]
        for i, s in enumerate(rows, 1):
            entries.append(_entry_from_submission(s, i, category=category))

    return schemas.LeaderboardResponse(
        category=category,
        event_id=event_id,
        event_name=event_name,
        entries=entries,
        total_entries=len(entries),
    )


def _entry_from_submission(s: models.Submission, rank: int, category: str) -> schemas.LeaderboardEntry:
    pace = ranking.compute_pace_min_per_km(s.time_seconds, s.distance_km)
    return schemas.LeaderboardEntry(
        rank=rank,
        submission_id=s.id,
        runner_id=s.runner_id,
        runner_name=s.runner.name if s.runner else "—",
        instagram_handle=(s.runner.instagram_handle if s.runner else None),
        event_id=s.event_id,
        event_name=(s.event.name if s.event else None),
        category=category,
        distance_km=s.distance_km or 0.0,
        time_seconds=s.time_seconds or 0,
        pace_min_per_km=pace,
        elevation_gain_m=s.elevation_gain_m or 0,
        promo_code=(s.promo_code.code if s.promo_code else None),
    )


@router.get("/api/runners/{runner_id}", response_model=schemas.RunnerOut)
def runner_profile(runner_id: int, db: Session = Depends(get_db)):
    r = db.query(models.Runner).filter(models.Runner.id == runner_id).first()
    if not r:
        raise HTTPException(404, "Runner not found")
    return r


# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------

def _admin_required(current_user: models.Admin = Depends(auth.get_current_user)) -> models.Admin:
    return current_user


@router.get("/api/admin/submissions")
def admin_list_submissions(
    status: Optional[str] = Query(None, pattern="^(pending|approved|rejected)$"),
    event_id: Optional[int] = None,
    runner_id: Optional[int] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _admin: models.Admin = Depends(_admin_required),
):
    q = db.query(models.Submission)
    if status:
        q = q.filter(models.Submission.status == status)
    if event_id is not None:
        q = q.filter(models.Submission.event_id == event_id)
    if runner_id is not None:
        q = q.filter(models.Submission.runner_id == runner_id)
    rows = q.order_by(models.Submission.submitted_at.desc()).limit(limit).all()

    out = []
    for s in rows:
        item = schemas.SubmissionOut.model_validate(s)
        if s.runner:
            item.runner = schemas.RunnerOut.model_validate(s.runner)
        if s.event:
            item.event_name = s.event.name
        item.pace_min_per_km = (
            ranking.compute_pace_min_per_km(s.time_seconds, s.distance_km)
            if s.time_seconds and s.distance_km else None
        )
        item.category = (
            ranking.classify_distance(s.distance_km) if s.distance_km else None
        )
        out.append(item)
    return out


@router.get("/api/admin/submissions/{submission_id}")
def admin_get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    _admin: models.Admin = Depends(_admin_required),
):
    s = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not s:
        raise HTTPException(404, "Submission not found")

    item = schemas.SubmissionOut.model_validate(s)
    if s.runner:
        item.runner = schemas.RunnerOut.model_validate(s.runner)
    if s.event:
        item.event_name = s.event.name
    item.pace_min_per_km = (
        ranking.compute_pace_min_per_km(s.time_seconds, s.distance_km)
        if s.time_seconds and s.distance_km else None
    )
    item.category = (
        ranking.classify_distance(s.distance_km) if s.distance_km else None
    )
    out = item.model_dump()
    # Include any issued promo
    if s.promo_code:
        out["promo_code"] = schemas.PromoCodeOut.model_validate(s.promo_code).model_dump()
    return out


@router.post("/api/admin/submissions/{submission_id}/approve")
def admin_approve_submission(
    submission_id: int,
    payload: schemas.SubmissionApprove,
    db: Session = Depends(get_db),
    admin: models.Admin = Depends(_admin_required),
):
    s = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not s:
        raise HTTPException(404, "Submission not found")
    if s.status != "pending":
        raise HTTPException(400, f"Submission is already {s.status}")

    if payload.distance_km <= 0 or payload.time_seconds <= 0:
        raise HTTPException(400, "distance_km and time_seconds must be positive.")

    # Optional event auto-cross-ref if admin didn't supply one.
    mapped_event_id = payload.event_id
    if mapped_event_id is None:
        all_events = db.query(models.Event).all()
        mapped_event_id = ranking.find_matching_event(
            payload.activity_date, payload.activity_location, all_events,
        )

    s.event_id = mapped_event_id
    s.activity_date = payload.activity_date
    s.activity_location = payload.activity_location
    s.distance_km = payload.distance_km
    s.time_seconds = payload.time_seconds
    s.elevation_gain_m = payload.elevation_gain_m or 0
    s.admin_notes = payload.admin_notes
    s.status = "approved"
    s.reviewed_at = datetime.utcnow()
    s.reviewed_by = admin.id

    # If a promo already exists (admin re-approving), keep it. Otherwise
    # issue a fresh one when requested.
    if payload.issue_promo and not s.promo_code:
        cat = ranking.classify_distance(payload.distance_km)
        rank = _compute_rank(s, cat, db)
        code = promo.generate_promo_code(mapped_event_id, rank, submission_id=s.id)
        # Collision safety: regenerate a couple of times if unique fails.
        for _ in range(3):
            existing = db.query(models.PromoCode).filter(models.PromoCode.code == code).first()
            if not existing:
                break
            code = promo.generate_promo_code(mapped_event_id, rank, submission_id=s.id)
        pc = models.PromoCode(
            code=code,
            runner_id=s.runner_id,
            submission_id=s.id,
            event_id=mapped_event_id,
            discount_pct=promo.default_discount_pct(),
            expires_at=promo.default_expiry(),
        )
        db.add(pc)

    db.commit()
    db.refresh(s)

    item = schemas.SubmissionOut.model_validate(s)
    if s.runner:
        item.runner = schemas.RunnerOut.model_validate(s.runner)
    if s.event:
        item.event_name = s.event.name
    item.pace_min_per_km = ranking.compute_pace_min_per_km(s.time_seconds, s.distance_km)
    item.category = ranking.classify_distance(s.distance_km)

    resp = {"submission": item}
    if s.promo_code:
        resp["promo_code"] = schemas.PromoCodeOut.model_validate(s.promo_code).model_dump()
    return resp


def _compute_rank(sub: models.Submission, category: str, db: Session) -> int:
    """Return 1-based rank of `sub` within its (category, event) cohort.

    Cohort is "same distance bucket, same event". For OVERALL / cross-bucket
    falls back to overall rank across all approved submissions in this
    event. Returns 1 if `sub` is fastest, etc.
    """
    if sub.event_id is None:
        # No event mapped → can't rank meaningfully. Return 0 (unranked).
        return 0
    q = (
        db.query(models.Submission)
        .filter(models.Submission.status == "approved")
        .filter(models.Submission.event_id == sub.event_id)
    )
    others = [o for o in q.all() if ranking.classify_distance(o.distance_km) == category]
    others.sort(key=lambda o: ranking.compute_pace_min_per_km(o.time_seconds, o.distance_km))
    for i, o in enumerate(others, 1):
        if o.id == sub.id:
            return i
    return len(others)


@router.post("/api/admin/submissions/{submission_id}/reject")
def admin_reject_submission(
    submission_id: int,
    payload: schemas.SubmissionReject,
    db: Session = Depends(get_db),
    admin: models.Admin = Depends(_admin_required),
):
    s = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not s:
        raise HTTPException(404, "Submission not found")
    if s.status != "pending":
        raise HTTPException(400, f"Submission is already {s.status}")
    s.status = "rejected"
    s.admin_notes = payload.reason
    s.reviewed_at = datetime.utcnow()
    s.reviewed_by = admin.id
    db.commit()
    return {"ok": True, "submission_id": s.id, "status": s.status}


@router.get("/api/admin/promo-codes")
def admin_list_promo_codes(
    event_id: Optional[int] = None,
    runner_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    _admin: models.Admin = Depends(_admin_required),
):
    q = db.query(models.PromoCode)
    if event_id is not None:
        q = q.filter(models.PromoCode.event_id == event_id)
    if runner_id is not None:
        q = q.filter(models.PromoCode.runner_id == runner_id)
    if is_active is not None:
        q = q.filter(models.PromoCode.is_active == is_active)
    rows = q.order_by(models.PromoCode.created_at.desc()).limit(limit).all()

    out = []
    for pc in rows:
        item = schemas.PromoCodeOut.model_validate(pc)
        if pc.runner:
            item.runner_name = pc.runner.name
        if pc.event:
            item.event_name = pc.event.name
        out.append(item)
    return out
