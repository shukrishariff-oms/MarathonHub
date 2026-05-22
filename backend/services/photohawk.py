"""Photohawk client — gallery resolver + searchByImage proxy.

Photohawk publishes a public, no-auth API at search.api.photohawk.com.
This module:
  * extracts engine_guid (gallery UUID) from a gallery URL
  * calls /galleries/searchByImage with a selfie + engine list
  * returns parsed match results

Endpoints discovered from runtimeConfig in Photohawk gallery pages:
  NEXT_PUBLIC_SEARCH_API_ENDPOINT  = https://search.api.photohawk.com
  NEXT_PUBLIC_CLOUDFRONT_ENDPOINT  = https://assets.photohawk.com
  NEXT_PUBLIC_IMGIX_MEDIA_ENDPOINT = https://photohawk-prod.imgix.net
"""
from __future__ import annotations

import base64
import gzip
import json
import re
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass

SEARCH_API = "https://search.api.photohawk.com"
ASSETS_CDN = "https://assets.photohawk.com"
IMGIX_CDN = "https://photohawk-prod.imgix.net"
TIMEOUT = 30
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")


@dataclass
class GalleryMeta:
    engine_guid: str
    gallery_name: str
    total_items: int | None
    canonical_url: str
    tenant_alias: str | None
    tenant_guid: str | None
    cover_guid: str | None = None


class PhotohawkError(Exception):
    pass


def _gunzip(b: bytes) -> bytes:
    return gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b


def _http_get(url: str, headers: dict | None = None) -> bytes:
    h = {"User-Agent": UA, "Accept-Encoding": "gzip, deflate"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return _gunzip(r.read())
    except urllib.error.HTTPError as e:
        body = _gunzip(e.read())[:300].decode("utf-8", "replace")
        raise PhotohawkError(f"HTTP {e.code} from {url}: {body}") from e
    except urllib.error.URLError as e:
        raise PhotohawkError(f"Network error fetching {url}: {e}") from e


def _origin_for_url(gallery_url: str) -> str:
    """Extract the Origin (scheme + host) of a gallery URL.
    Photohawk's searchByImage requires Origin to match the engine's tenant
    host, otherwise it 502s. So per-engine fan-out must use per-tenant origin.
    """
    from urllib.parse import urlparse
    p = urlparse(gallery_url)
    if not p.scheme or not p.netloc:
        # Fallback to a known-good host
        return "https://fazphoto.photohawk.com"
    return f"{p.scheme}://{p.netloc}"


def _http_post_json(url: str, payload: dict,
                    headers: dict | None = None) -> dict:
    body = json.dumps(payload).encode()
    h = {
        "User-Agent": UA,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if headers:
        h.update(headers)
    if "Origin" not in h:
        # Photohawk REQUIRES Origin to match a real tenant or it returns 502.
        # Default to a known-good tenant; callers should pass per-engine Origin.
        h["Origin"] = "https://fazphoto.photohawk.com"
    req = urllib.request.Request(url, data=body, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return json.loads(_gunzip(r.read()).decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        b = _gunzip(e.read())[:400].decode("utf-8", "replace")
        raise PhotohawkError(f"HTTP {e.code} from {url}: {b}") from e
    except urllib.error.URLError as e:
        raise PhotohawkError(f"Network error posting to {url}: {e}") from e


# ─── Gallery URL → engine_guid resolver ────────────────────────────────

_GALLERY_URL_RE = re.compile(
    r"^https?://(?P<host>[a-z0-9.\-]+)/galleries/(?P<slug>[a-z0-9\-_]+)/?",
    re.I,
)
_NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__"[^>]*>(.+?)</script>',
    re.S,
)
# Photohawk renders <meta property="og:image" content="https://mediav2....?
# tenant=<tenant_guid>&guid=<cover_guid>&resolution=1200"> on every gallery
# page. The cover GUID is hot-linkable (no auth needed), so we use it as
# the photographer card's hero thumbnail.
_OG_IMAGE_RE = re.compile(
    r'<meta property="og:image" content="https://mediav2\.photohawk\.com'
    r'\?tenant=([a-f0-9-]+)(?:&amp;|&)guid=([a-f0-9-]+)',
    re.I,
)


def is_photohawk_gallery_url(url: str) -> bool:
    """Accept any /galleries/<slug> URL. Some photographers use Photohawk
    custom domains (e.g. pix.serius.my). The actual Photohawk-ness is
    confirmed when we successfully extract __NEXT_DATA__ + engine_guid.
    """
    return bool(_GALLERY_URL_RE.match(url.strip()))


def resolve_gallery(url: str) -> GalleryMeta:
    """Fetch a Photohawk gallery page and extract its engine GUID + metadata.

    Works on any host (subdomain.photohawk.com OR custom domain like
    pix.serius.my) — Photohawk-ness is verified by successfully parsing
    __NEXT_DATA__ + finding engine.guid.
    """
    url = url.strip()
    m = _GALLERY_URL_RE.match(url)
    if not m:
        raise PhotohawkError(
            f"Not a recognisable gallery URL: {url} "
            f"(expected like https://host/galleries/event-slug)"
        )
    canonical = url.rstrip("/")
    html = _http_get(canonical).decode("utf-8", "replace")

    nd = _NEXT_DATA_RE.search(html)
    if not nd:
        raise PhotohawkError(
            f"Page loaded but no __NEXT_DATA__ blob found at {canonical}. "
            f"Page may not be a Photohawk gallery, or Photohawk has changed format."
        )
    try:
        data = json.loads(nd.group(1))
    except json.JSONDecodeError as e:
        raise PhotohawkError(f"__NEXT_DATA__ JSON parse failed: {e}") from e

    init = data.get("props", {}).get("pageProps", {}).get("initialState")
    if isinstance(init, str):
        try:
            init = json.loads(init)
        except json.JSONDecodeError as e:
            raise PhotohawkError(f"initialState JSON parse failed: {e}") from e

    if not isinstance(init, dict):
        raise PhotohawkError("initialState missing or invalid in page payload")

    engine = (init.get("engines", {}).get("detail", {})
              .get("engine") or {})
    guid = engine.get("guid")
    name = engine.get("name") or m.group("slug").replace("-", " ").title()
    total = engine.get("noItems")

    if not guid:
        raise PhotohawkError(
            f"Gallery loaded but engine guid not found at {canonical}. "
            f"Page might not be a Photohawk gallery (custom-built site?)"
        )

    acc = (init.get("account", {}).get("detail", {})
           .get("account") or {})
    tenant_alias = acc.get("alias")
    tenant_guid = acc.get("guid")

    # Extract cover image GUID from og:image meta tag (hot-linkable)
    cover_guid = None
    og = _OG_IMAGE_RE.search(html)
    if og:
        # tenant_guid from og:image should match the one from initialState;
        # prefer the og one since it's what mediav2 expects
        if not tenant_guid:
            tenant_guid = og.group(1)
        cover_guid = og.group(2)

    return GalleryMeta(
        engine_guid=guid,
        gallery_name=name,
        total_items=int(total) if isinstance(total, (int, float)) else None,
        canonical_url=canonical,
        tenant_alias=tenant_alias,
        tenant_guid=tenant_guid,
        cover_guid=cover_guid,
    )


def cover_thumbnail_url(tenant_guid: str, cover_guid: str,
                        resolution: int = 400) -> str:
    """Build a hot-linkable cover thumbnail URL.

    mediav2.photohawk.com is the public OG image endpoint Photohawk uses
    for social-media unfurls. It accepts no auth, just tenant+guid+resolution.
    Only works for the gallery's COVER guid (not arbitrary search hits).
    """
    return (f"https://mediav2.photohawk.com"
            f"?tenant={tenant_guid}&guid={cover_guid}&resolution={resolution}")


# ─── Search proxy ──────────────────────────────────────────────────────

def _selfie_to_data_url(selfie_bytes: bytes,
                       content_type: str = "image/jpeg") -> str:
    """Photohawk's `selfie` field accepts a data URL (base64-encoded image)."""
    b64 = base64.b64encode(selfie_bytes).decode()
    return f"data:{content_type};base64,{b64}"


def search_by_image(selfie_data_url: str, engine_guids: list[str],
                    threshold: float = 0.5,
                    origin: str | None = None) -> dict:
    """Call Photohawk's searchByImage. Returns raw response dict.

    `origin` MUST match a tenant host that owns at least one of the engines,
    otherwise Photohawk returns 502. Use _origin_for_url(gallery_url) to
    derive it from an album's gallery URL.

    Response shape:
      {
        "requestId": "...",
        "results": {
          "<engine_guid>": [
            {"guid": "<photo_guid>", "thumbnailUrl": "...", "matchScore": 0.85, ...}
          ]
        },
        "threshold": 0.5,
        "error": null|string
      }
    """
    payload = {
        "selfie": selfie_data_url,
        "engines": engine_guids,
        # Photohawk's threshold is on a 0-100 integer scale (NOT 0-1).
        # Caller passes 0.0-1.0 for ergonomics; convert here.
        "threshold": int(round(max(0.0, min(1.0, threshold)) * 100)),
    }
    headers = {"Origin": origin} if origin else None
    return _http_post_json(
        f"{SEARCH_API}/galleries/searchByImage", payload, headers=headers,
    )


def search_one_engine(selfie_data_url: str, engine_guid: str,
                      threshold: float = 0.5,
                      origin: str | None = None) -> list[dict]:
    """Search a single engine. Returns the match list (possibly empty)."""
    resp = search_by_image(
        selfie_data_url, [engine_guid], threshold, origin=origin,
    )
    if resp.get("error"):
        raise PhotohawkError(f"searchByImage error: {resp['error']}")
    results = resp.get("results") or {}
    return results.get(engine_guid, []) or []


def fan_out_search(selfie_data_url: str,
                   engines_with_origin: list[tuple[str, str]],
                   threshold: float = 0.5,
                   max_workers: int = 8) -> dict[str, dict]:
    """Search multiple engines in parallel.

    Args:
      engines_with_origin: list of (engine_guid, gallery_url) tuples. Each
        engine is queried with its own tenant origin (derived from gallery_url)
        because Photohawk's API rejects cross-tenant origins with 502.

    Returns dict mapping engine_guid → {"matches": [...], "error": str|None}.
    Per-engine fan-out (vs one batch call) gives:
      * correct origin per engine (Photohawk requirement)
      * one slow/failed engine doesn't block the rest
      * clean error attribution
    """
    out: dict[str, dict] = {}
    if not engines_with_origin:
        return out

    def _one(item: tuple[str, str]) -> tuple[str, dict]:
        guid, gallery_url = item
        try:
            origin = _origin_for_url(gallery_url)
            matches = search_one_engine(
                selfie_data_url, guid, threshold, origin=origin,
            )
            return guid, {"matches": matches, "error": None}
        except PhotohawkError as e:
            return guid, {"matches": [], "error": str(e)}

    workers = min(max_workers, len(engines_with_origin))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = [ex.submit(_one, item) for item in engines_with_origin]
        for fu in as_completed(futures):
            guid, result = fu.result()
            out[guid] = result
    return out
