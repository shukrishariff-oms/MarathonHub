import { motion } from 'framer-motion';
import { Calendar, MapPin, Tag, Trophy, Users, Cloud, Download, ExternalLink, AlertCircle } from 'lucide-react';
import { safeParse } from '../utils/safeJson';

/**
 * Auto-switching block kat EventDetail.
 *
 * Bila event belum lepas → tunjuk Upcoming view: kategori + harga, link daftar,
 * countdown, GPX, bib pickup.
 *
 * Bila event dah lepas (computed_status='Past') atau ada recap_summary →
 * tunjuk Recap view: peserta, cuaca, pemenang, summary paragraf.
 *
 * Same URL, same page, content shift secara automatik. SEO compound — Google
 * Google "putrajaya night run 2026" → satu URL je, sama untuk pre + post event.
 */
export default function RaceCalendarBlock({ event }) {
    if (!event) return null;

    const isPast = event.status === 'Past' || event.recap_summary || event.participant_count;
    const isUpcoming = !isPast;

    const categories = safeParse(event.categories_json, []);
    const winners = safeParse(event.winners_json, []);

    // Days until registration closes (countdown)
    let daysToClose = null;
    if (isUpcoming && event.registration_close_at) {
        const close = new Date(event.registration_close_at);
        const diff = Math.ceil((close - new Date()) / (1000 * 60 * 60 * 24));
        if (diff >= 0) daysToClose = diff;
    }

    const slotsBadge = (state) => {
        const map = {
            open: { label: 'Slot Kosong', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            early_bird: { label: 'Early Bird', cls: 'bg-primary/10 text-primary border-primary/20' },
            filling: { label: '85% Penuh', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
            full: { label: 'Full', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
        };
        const m = map[state] || map.open;
        return <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border ${m.cls}`}>{m.label}</span>;
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Quick action bar — registration CTA for upcoming */}
            {isUpcoming && event.registration_url && (
                <div className="glass-card p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm">
                        {daysToClose !== null ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-slate-400">Pendaftaran tutup</span>
                                <span className="text-emerald-400 font-bold">{daysToClose} hari lagi</span>
                            </>
                        ) : (
                            <>
                                <span className="w-2 h-2 rounded-full bg-primary" />
                                <span className="text-slate-300 font-medium">Pendaftaran masih dibuka</span>
                            </>
                        )}
                    </div>
                    <a
                        href={event.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="premium-btn-primary text-sm"
                    >
                        Daftar Sekarang
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            )}

            {/* Recap stats banner */}
            {isPast && (event.participant_count || event.weather_temp_c) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {event.participant_count && (
                        <div className="glass-card p-4 text-center">
                            <Users className="w-5 h-5 text-primary mx-auto mb-2" />
                            <div className="text-2xl md:text-3xl font-black text-white">{event.participant_count.toLocaleString()}</div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Peserta</div>
                        </div>
                    )}
                    {event.weather_temp_c && (
                        <div className="glass-card p-4 text-center">
                            <Cloud className="w-5 h-5 text-primary mx-auto mb-2" />
                            <div className="text-2xl md:text-3xl font-black text-white">{event.weather_temp_c}°C</div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Cuaca</div>
                        </div>
                    )}
                    {event.state && (
                        <div className="glass-card p-4 text-center">
                            <MapPin className="w-5 h-5 text-primary mx-auto mb-2" />
                            <div className="text-lg md:text-xl font-black text-white truncate">{event.state}</div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Negeri</div>
                        </div>
                    )}
                    {event.race_type && (
                        <div className="glass-card p-4 text-center">
                            <Tag className="w-5 h-5 text-primary mx-auto mb-2" />
                            <div className="text-lg md:text-xl font-black text-white capitalize">{event.race_type.replace('_', ' ')}</div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Jenis</div>
                        </div>
                    )}
                </div>
            )}

            {/* Categories + pricing — show for both upcoming and recap */}
            {categories.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-display font-black text-white tracking-tighter italic uppercase flex items-center gap-3">
                        <Tag className="w-6 h-6 text-primary" />
                        Kategori {isUpcoming ? '& Yuran' : ''}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {categories.map((c, i) => (
                            <div key={i} className="glass-card p-4 hover:border-primary/30 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
                                        {c.label}
                                    </span>
                                    {c.slots_state && slotsBadge(c.slots_state)}
                                </div>
                                {c.fee != null && (
                                    <div className="text-3xl font-display font-black text-gradient">
                                        RM {c.fee}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Winners — recap only */}
            {isPast && winners.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-display font-black text-white tracking-tighter italic uppercase flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-primary" />
                        Pemenang
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {winners.map((w, i) => (
                            <div key={i} className="glass-card p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
                                    🥇
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white truncate">{w.name || '—'}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">
                                        {w.category || ''}{w.category && w.time && ' · '}<span className="font-mono">{w.time || ''}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recap summary paragraph */}
            {isPast && event.recap_summary && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-display font-black text-white tracking-tighter italic uppercase">
                        📝 Recap
                    </h2>
                    <div className="glass-card p-6">
                        <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                            {event.recap_summary}
                        </p>
                    </div>
                </div>
            )}

            {/* Bib pickup + GPX + organizer — upcoming */}
            {isUpcoming && (event.bib_pickup_info || event.gpx_url || event.organizer_url || event.start_time) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {event.start_time && (
                        <div className="glass-card p-5">
                            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                Masa Mula
                            </div>
                            <div className="text-lg font-display font-bold text-white">{event.start_time}</div>
                        </div>
                    )}
                    {event.bib_pickup_info && (
                        <div className="glass-card p-5">
                            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-primary" />
                                Bib Pickup
                            </div>
                            <div className="text-sm text-slate-200 whitespace-pre-line">{event.bib_pickup_info}</div>
                        </div>
                    )}
                    {event.gpx_url && (
                        <a
                            href={event.gpx_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="glass-card p-5 hover:border-primary/30 transition-colors"
                        >
                            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                                <Download className="w-4 h-4 text-primary" />
                                Peta Laluan (GPX)
                            </div>
                            <div className="text-sm text-primary font-bold">Download untuk Strava / Garmin →</div>
                        </a>
                    )}
                    {event.organizer_url && (
                        <a
                            href={event.organizer_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="glass-card p-5 hover:border-primary/30 transition-colors"
                        >
                            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                                <ExternalLink className="w-4 h-4 text-primary" />
                                Organizer
                            </div>
                            <div className="text-sm text-primary font-bold truncate">{event.organizer || 'Lawat website organizer'}</div>
                        </a>
                    )}
                </div>
            )}
        </motion.section>
    );
}
