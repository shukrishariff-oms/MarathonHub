// Tiny helper: parse JSON without crashing the page on bad data.
// Returns `fallback` (default: empty array) if input is null/undefined/invalid.
//
// Why: Several DB columns are stored as JSON strings (distances_json,
// coverage_areas_json, km_coverage_json, highlight_images_json). One
// malformed row used to crash entire pages because raw JSON.parse threw
// inside the render path. This helper swallows the error, logs to console
// for debugging, and lets the page render with a safe fallback.

export function safeParse(jsonStr, fallback = []) {
    if (jsonStr == null || jsonStr === '') return fallback;
    try {
        const parsed = JSON.parse(jsonStr);
        return parsed == null ? fallback : parsed;
    } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('safeParse: failed to parse JSON, returning fallback', { jsonStr, err });
        }
        return fallback;
    }
}

export default safeParse;
