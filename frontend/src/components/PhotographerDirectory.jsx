/**
 * PhotographerDirectory — replaces FaceSearchPanel temporarily.
 *
 * Photohawk's Cloud Run face-search endpoint now requires Turnstile/token
 * auth that we can't replicate, so the upload-selfie-and-fan-out flow has
 * been disabled. To keep the page useful we render the same photographer
 * roster the old panel would have shown after an empty scan, but without
 * the upload step at all — runners click straight through to each gallery
 * and use the photographer's own face-search there.
 *
 * The original FaceSearchPanel.jsx is preserved unchanged on disk so we
 * can flip back to it the moment Photohawk reopens public access.
 */
import { motion } from 'framer-motion';
import { Camera, ExternalLink, ScanFace } from 'lucide-react';
import { safeParse } from '../utils/safeJson';
import api from '../api';

export default function PhotographerDirectory({ event, assignments }) {
    if (!assignments || assignments.length === 0) return null;

    // Pinned (OhmaiShoot etc.) first, then alphabetical.
    const sorted = [...assignments].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        const an = a.photographer?.name || '';
        const bn = b.photographer?.name || '';
        return an.localeCompare(bn);
    });

    const trackClick = (assignment) => {
        api.post('/track', {
            path: assignment.gallery_url,
            entity_type: 'photographer',
            entity_id: assignment.photographer?.id,
            event_id: event.id,
        }).catch(() => {});
    };

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
                        <h2 className="text-xl md:text-2xl font-display font-black text-white tracking-tighter italic uppercase mb-1">
                            Cari Gambar Kau
                        </h2>
                        <p className="text-sm text-slate-400 font-medium">
                            {assignments.length} photographer cover event ni. Klik gallery photographer untuk scan muka anda di platform mereka — semua sokong face-search atau search by bib.
                        </p>
                    </div>
                </div>

                {/* Photographer cards */}
                <div className="grid gap-3 md:grid-cols-2">
                    {sorted.map((a) => {
                        if (!a.gallery_url || !a.photographer) return null;
                        return (
                            <a
                                key={a.id}
                                href={a.gallery_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackClick(a)}
                                className={`group flex items-center gap-3 p-4 rounded-2xl transition-all ${
                                    a.is_pinned
                                        ? 'bg-primary/[0.08] border border-primary/40 hover:border-primary/70 hover:bg-primary/[0.12]'
                                        : 'bg-white/[0.02] border border-white/10 hover:border-primary/40 hover:bg-white/[0.04]'
                                }`}
                            >
                                {a.photographer.logo_url ? (
                                    <img
                                        src={a.photographer.logo_url}
                                        alt={a.photographer.name}
                                        className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <Camera className="w-5 h-5 text-primary/60" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-black text-sm uppercase italic truncate">
                                        {a.photographer.name}
                                    </p>
                                    {(() => {
                                        const coverage = safeParse(a.km_coverage_json);
                                        if (coverage.length > 0) {
                                            return (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {coverage.map((loc, i) => (
                                                        <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary-300 border border-primary/20">
                                                            {loc}
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest truncate mt-0.5">
                                        Cari di gallery mereka ↗
                                    </p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors flex-shrink-0" />
                            </a>
                        );
                    })}
                </div>

                <p className="text-[11px] text-slate-500 font-medium text-center pt-2 border-t border-white/5">
                    Semua link adalah photographer rasmi untuk event ni. MarathonHub tidak menjual atau menyimpan gambar — anda beli terus dari photographer.
                </p>
            </div>
        </motion.section>
    );
}
