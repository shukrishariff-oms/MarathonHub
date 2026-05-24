import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, ScanFace, ExternalLink, AlertCircle, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

/**
 * FaceSearchPanel — runner upload selfie, kita fan-out search ke semua
 * photographer assigned ke event ni, return matches per photographer.
 *
 * Kenapa client-side compress: Photohawk cap selfie ~10MB, tapi browser
 * upload selfie modern (12MP HEIC dari iPhone) selalu 5-8MB. Compress
 * sebelum upload kurangkan latency (3G/5G upload slow) + jamin under cap.
 *
 * UX flow:
 *   1. Drop/pilih selfie → preview
 *   2. Click "Cari Gambar Kau" → upload + spinner
 *   3. Result: photographer cards w/ match count, deep-link ke gallery
 */

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_DIMENSION = 1280;
const COMPRESS_QUALITY = 0.85;

/**
 * Compress + resize selfie to keep upload payload under Photohawk's cap.
 * iPhone HEIC won't decode in <canvas> — for those, just send raw.
 * Other formats get downsized to 1280px longest side at 85% JPEG quality.
 */
async function compressImage(file) {
    if (file.type === 'image/heic' || file.type === 'image/heif') {
        return file;
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.onerror = reject;
        img.onerror = reject;
        img.onload = () => {
            try {
                let { width, height } = img;
                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    if (width > height) {
                        height = Math.round(height * (MAX_DIMENSION / width));
                        width = MAX_DIMENSION;
                    } else {
                        width = Math.round(width * (MAX_DIMENSION / height));
                        height = MAX_DIMENSION;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        resolve(new File([blob], 'selfie.jpg', { type: 'image/jpeg' }));
                    },
                    'image/jpeg',
                    COMPRESS_QUALITY,
                );
            } catch (err) {
                console.warn('Compress failed, sending raw:', err);
                resolve(file);
            }
        };
        reader.readAsDataURL(file);
    });
}

export default function FaceSearchPanel({ event, assignments }) {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [busy, setBusy] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);
    const cameraRef = useRef(null);

    // Cleanup object URL when preview changes / unmount
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    // Hide entirely if there's nothing searchable for this event.
    if (!assignments || assignments.length === 0) return null;

    const reset = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(null);
        setPreviewUrl(null);
        setResults(null);
        setError(null);
    };

    const pickFile = (f) => {
        if (!f) return;
        if (!ACCEPTED_TYPES.includes(f.type) && !f.type.startsWith('image/')) {
            setError('Format gambar tak disokong. Cuba JPG, PNG, atau WEBP.');
            return;
        }
        // 20MB hard cap before compression
        if (f.size > 20 * 1024 * 1024) {
            setError('Saiz gambar terlalu besar (max 20MB). Pilih yang lain.');
            return;
        }
        setError(null);
        setResults(null);
        setFile(f);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(f));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        pickFile(e.dataTransfer.files?.[0]);
    };

    const handleSearch = async () => {
        if (!file || busy) return;
        setBusy(true);
        setError(null);
        setResults(null);
        try {
            const compressed = await compressImage(file);
            const fd = new FormData();
            fd.append('selfie', compressed);
            const res = await api.post(`/events/${event.id}/face-search`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 60000,
            });
            setResults(res.data);
        } catch (err) {
            console.error('Face search failed:', err);
            const detail = err?.response?.data?.detail;
            setError(detail || 'Tak dapat search sekarang. Cuba lagi sebentar.');
        } finally {
            setBusy(false);
        }
    };

    const totalMatches = results?.total_matches ?? 0;
    const allResults = results?.results ?? [];
    // Bucket results by coverage_status for fair, photographer-friendly display.
    // Backend tags every result so we don't have to guess from match_count alone.
    const matchesResults = allResults.filter(r => r.coverage_status === 'MATCHES');
    const indexingResults = allResults.filter(r => r.coverage_status === 'INDEXING');
    const browseOnlyResults = allResults.filter(r => r.coverage_status === 'BROWSE_ONLY');
    const noMatchResults = allResults.filter(r => r.coverage_status === 'NO_MATCH');

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-ohmai-charcoal to-ohmai-charcoal"
        >
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 p-6 md:p-10 space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        <ScanFace className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl md:text-2xl font-display font-black text-white tracking-tighter italic uppercase">
                                Cari Gambar Kau
                            </h2>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary">
                                Beta
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 font-medium">
                            Upload selfie sekali, kami scan {assignments.length} photographer event ni, terus tahu siapa ada gambar kau.
                        </p>
                    </div>
                </div>

                {/* Upload zone OR preview */}
                {!previewUrl && (
                    <div className="space-y-3">
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                            className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all p-6 md:p-10 text-center ${
                                dragging
                                    ? 'border-primary bg-primary/5'
                                    : 'border-white/10 hover:border-primary/40 bg-white/[0.02]'
                            }`}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => pickFile(e.target.files?.[0])}
                            />
                            <Upload className="w-10 h-10 text-primary/60 mx-auto mb-3" />
                            <p className="text-white font-bold text-base mb-1">
                                Pilih gambar dari galeri
                            </p>
                            <p className="text-xs text-slate-500 font-medium">
                                JPG, PNG, atau WEBP — sampai 20MB
                            </p>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 font-bold uppercase tracking-widest">
                            <div className="flex-1 h-px bg-white/5" />
                            atau
                            <div className="flex-1 h-px bg-white/5" />
                        </div>

                        {/* Camera capture — capture="user" hints front-cam on mobile.
                            On desktop the button just falls back to a file picker. */}
                        <button
                            type="button"
                            onClick={() => cameraRef.current?.click()}
                            className="w-full py-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-3 text-white font-bold text-sm"
                        >
                            <Camera className="w-5 h-5 text-primary" />
                            Buka Kamera & Selfie
                        </button>
                        <input
                            ref={cameraRef}
                            type="file"
                            accept="image/*"
                            capture="user"
                            className="hidden"
                            onChange={(e) => pickFile(e.target.files?.[0])}
                        />
                    </div>
                )}

                {previewUrl && (
                    <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/[0.02] border border-white/10 rounded-2xl p-4">
                        <img
                            src={previewUrl}
                            alt="Selfie preview"
                            className="w-24 h-24 rounded-xl object-cover border-2 border-primary/30"
                        />
                        <div className="flex-1 text-center sm:text-left">
                            <p className="text-white font-bold text-sm mb-1">
                                Selfie ready
                            </p>
                            <p className="text-xs text-slate-500 font-medium">
                                {file && (file.size / 1024 / 1024).toFixed(2)} MB · auto-compress sebelum upload
                            </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={reset}
                                disabled={busy}
                                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-bold text-xs hover:bg-white/10 transition-colors disabled:opacity-40"
                            >
                                Tukar
                            </button>
                            <button
                                onClick={handleSearch}
                                disabled={busy}
                                className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-primary text-ohmai-charcoal font-black text-xs uppercase tracking-widest flex items-center gap-2 justify-center hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {busy ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Mencari...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Cari Sekarang
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* Results */}
                <AnimatePresence>
                    {results && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/5">
                                <p className="text-sm text-slate-300 font-medium">
                                    {totalMatches > 0 ? (
                                        <>
                                            <span className="text-primary font-black">{totalMatches}</span> gambar match dari{' '}
                                            <span className="text-primary font-black">{matchesResults.length}</span> photographer
                                        </>
                                    ) : (
                                        <span className="text-slate-400">
                                            Tak jumpa match automatik. Cuba selfie yang clear, atau browse manual photographer di bawah.
                                        </span>
                                    )}
                                </p>
                                {totalMatches > 0 && (
                                    <button
                                        onClick={reset}
                                        className="text-xs text-slate-400 hover:text-primary font-bold flex items-center gap-1"
                                    >
                                        <X className="w-3 h-3" /> Cari semula
                                    </button>
                                )}
                            </div>

                            {matchesResults.length > 0 && (
                                <div className="space-y-3">
                                    {matchesResults.map((r) => {
                                        const guids = (r.matches || []).map(m => m.guid).filter(Boolean);
                                        const deepLink = guids.length
                                            ? `${r.gallery_url}?guids=${guids.slice(0, 20).join(',')}`
                                            : r.gallery_url;
                                        // Cap visible thumbnails to 6 per photog —
                                        // enough to confirm match, not enough to skip
                                        // paying for the rest.
                                        const visibleThumbs = (r.matches || [])
                                            .filter(m => m.thumbnail_url)
                                            .slice(0, 6);
                                        const moreCount = r.match_count - visibleThumbs.length;
                                        const trackClick = () => {
                                            api.post('/track', {
                                                path: deepLink,
                                                entity_type: 'photographer',
                                                entity_id: r.photographer.id,
                                                event_id: event.id,
                                            }).catch(() => {});
                                        };
                                        return (
                                            <div
                                                key={r.assignment_id}
                                                className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden"
                                            >
                                                {/* Photog header */}
                                                <a
                                                    href={deepLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={trackClick}
                                                    className="group flex items-center gap-3 p-4 hover:bg-white/[0.03] transition-colors"
                                                >
                                                    {r.photographer.logo_url ? (
                                                        <img
                                                            src={r.photographer.logo_url}
                                                            alt={r.photographer.name}
                                                            className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                            <Camera className="w-5 h-5 text-primary/60" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-black text-sm uppercase italic truncate">
                                                            {r.photographer.name}
                                                        </p>
                                                        <p className="text-[11px] text-primary font-bold uppercase tracking-widest">
                                                            {r.match_count} gambar match · klik untuk beli ↗
                                                        </p>
                                                    </div>
                                                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors flex-shrink-0" />
                                                </a>

                                                {/* Thumbnail strip — preview-only, watermarked,
                                                    download-protected. Clicks bounce to gallery,
                                                    NOT a full-res lightbox. */}
                                                {visibleThumbs.length > 0 && (
                                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-black/20">
                                                        {visibleThumbs.map((m, i) => (
                                                            <a
                                                                key={m.guid || i}
                                                                href={deepLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={trackClick}
                                                                onContextMenu={(e) => e.preventDefault()}
                                                                draggable={false}
                                                                className="relative aspect-square overflow-hidden rounded-md group select-none"
                                                                style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                                                                title="Klik untuk beli di photographer"
                                                            >
                                                                <img
                                                                    src={m.thumbnail_url}
                                                                    alt="match preview"
                                                                    loading="lazy"
                                                                    draggable={false}
                                                                    onContextMenu={(e) => e.preventDefault()}
                                                                    onDragStart={(e) => e.preventDefault()}
                                                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                                                    style={{ WebkitUserDrag: 'none', WebkitTouchCallout: 'none' }}
                                                                />
                                                                {/* Diagonal watermark — repeating pattern,
                                                                    can't be cropped out cleanly. */}
                                                                <div
                                                                    className="absolute inset-0 pointer-events-none flex items-center justify-center"
                                                                    style={{
                                                                        background: `repeating-linear-gradient(
                                                                            -25deg,
                                                                            transparent 0,
                                                                            transparent 20px,
                                                                            rgba(0,0,0,0.18) 20px,
                                                                            rgba(0,0,0,0.18) 21px
                                                                        )`,
                                                                    }}
                                                                />
                                                                <div
                                                                    className="absolute inset-0 pointer-events-none flex items-center justify-center"
                                                                    style={{ transform: 'rotate(-25deg)' }}
                                                                >
                                                                    <span className="text-white/70 text-[8px] font-black uppercase tracking-widest whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                                                        MARATHONHUB · BELI DI {r.photographer.name.toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                {/* Hover overlay → CTA */}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-1">
                                                                    <span className="text-[8px] font-black text-primary uppercase tracking-widest">
                                                                        Beli ↗
                                                                    </span>
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                                {moreCount > 0 && (
                                                    <a
                                                        href={deepLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={trackClick}
                                                        className="block px-4 py-2 text-center text-[11px] text-primary font-bold uppercase tracking-widest bg-primary/5 hover:bg-primary/10 transition-colors border-t border-white/5"
                                                    >
                                                        + {moreCount} gambar lagi · buka gallery {r.photographer.name} ↗
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* INDEXING — engine ran, 0 match, event baru habis < 72h.
                                Photographer mungkin masih upload, jadi kita beritahu
                                runner: jangan assume photographer takde gambar dia. */}
                            {indexingResults.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[11px] text-amber-300/80 font-bold uppercase tracking-widest pt-1 flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Photographer mungkin masih upload ({indexingResults.length})
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-medium -mt-1">
                                        Event baru je habis. Cuba semak balik dalam beberapa jam, atau browse gallery sendiri ↓
                                    </p>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {indexingResults.map((r) => (
                                            <a
                                                key={r.assignment_id}
                                                href={r.gallery_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => {
                                                    api.post('/track', {
                                                        path: r.gallery_url,
                                                        entity_type: 'photographer',
                                                        entity_id: r.photographer.id,
                                                        event_id: event.id,
                                                    }).catch(() => {});
                                                }}
                                                className="group flex items-center gap-3 p-4 rounded-2xl bg-amber-400/[0.04] border border-amber-400/20 hover:border-amber-400/50 transition-all"
                                            >
                                                {r.photographer.logo_url ? (
                                                    <img
                                                        src={r.photographer.logo_url}
                                                        alt={r.photographer.name}
                                                        className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                                                        <Camera className="w-5 h-5 text-amber-400/60" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-black text-sm uppercase italic truncate">
                                                        {r.photographer.name}
                                                    </p>
                                                    <p className="text-[11px] text-amber-300 font-bold uppercase tracking-widest">
                                                        Mungkin masih upload · browse manual
                                                    </p>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors flex-shrink-0" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* BROWSE_ONLY — gallery host takde face search built-in
                                (geosnapshot, pixieset, custom). Photographer tetap
                                deserve nampak — runner browse manual. */}
                            {browseOnlyResults.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest pt-1">
                                        Photographer tanpa face-search ({browseOnlyResults.length})
                                    </p>
                                    <p className="text-[11px] text-slate-500 font-medium -mt-1">
                                        Platform mereka tak sokong face search. Browse gallery sendiri.
                                    </p>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {browseOnlyResults.map((r) => (
                                            <a
                                                key={r.assignment_id}
                                                href={r.gallery_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => {
                                                    api.post('/track', {
                                                        path: r.gallery_url,
                                                        entity_type: 'photographer',
                                                        entity_id: r.photographer.id,
                                                        event_id: event.id,
                                                    }).catch(() => {});
                                                }}
                                                className="group flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-primary/40 hover:bg-white/[0.04] transition-all"
                                            >
                                                {r.photographer.logo_url ? (
                                                    <img
                                                        src={r.photographer.logo_url}
                                                        alt={r.photographer.name}
                                                        className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <Camera className="w-5 h-5 text-primary/60" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-black text-sm uppercase italic truncate">
                                                        {r.photographer.name}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                                                        {r.photo_count
                                                            ? `${r.photo_count.toLocaleString()} keping · cari manual`
                                                            : 'Browse manual ↗'}
                                                    </p>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors flex-shrink-0" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* NO_MATCH — engine ran, event > 72h, 0 hits. Truly no match.
                                Compact list (collapsed by default) so runner tau dah scan
                                semua, takde tertinggal. */}
                            {noMatchResults.length > 0 && (
                                <details className="group">
                                    <summary className="text-xs text-slate-500 hover:text-slate-300 font-bold cursor-pointer list-none flex items-center gap-2">
                                        <span className="group-open:rotate-90 transition-transform">▶</span>
                                        Photographer takde match ({noMatchResults.length})
                                    </summary>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {noMatchResults.map(r => (
                                            <span
                                                key={r.assignment_id}
                                                className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-slate-500 font-medium"
                                            >
                                                {r.photographer.name}
                                            </span>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {/* Resolver / per-engine errors — surfaced quietly so
                                we don't alarm runners over a single broken gallery. */}
                            {results.errors?.length > 0 && (
                                <details className="group">
                                    <summary className="text-xs text-amber-400/70 hover:text-amber-300 font-bold cursor-pointer list-none flex items-center gap-2">
                                        <AlertCircle className="w-3 h-3" />
                                        {results.errors.length} amaran teknikal
                                    </summary>
                                    <ul className="mt-2 space-y-1 text-[11px] text-amber-200/60 font-mono">
                                        {results.errors.slice(0, 5).map((e, i) => (
                                            <li key={i}>· {e}</li>
                                        ))}
                                    </ul>
                                </details>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <p className="text-[10px] text-slate-600 font-medium text-center pt-2">
                    Privasi: selfie kau tak disimpan kat MarathonHub. Kami hantar terus ke engine search photographer untuk match je.
                </p>
            </div>
        </motion.section>
    );
}
