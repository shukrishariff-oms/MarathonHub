import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { safeParse } from '../utils/safeJson';

export default function EventCard({ event }) {
    const formattedDate = new Date(event.date.endsWith('Z') ? event.date : event.date + 'Z').toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Share handler — Web Share API kalau ada (mobile native sheet),
    // fallback ke WhatsApp kalau desktop. Stop propagation supaya tak
    // trigger Link wrapper navigate ke event page.
    const handleShare = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const url = `${window.location.origin}/events/${event.slug || event.id}`;
        const title = event.name;
        const text = `${event.name}\n📅 ${formattedDate}${event.location ? `\n📍 ${event.location}` : ''}\n\nDetails: ${url}`;

        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
                return;
            } catch (err) {
                if (err?.name === 'AbortError') return; // user dismissed
                // fall through to WhatsApp
            }
        }
        // Desktop fallback — buka WhatsApp Web/Desktop
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <motion.div
            whileHover={{ y: -6 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="h-full"
        >
            <Link to={`/events/${event.slug || event.id}`} className="block h-full">
                <div className={`glass-card relative h-full flex flex-col group p-1 overflow-hidden border transition-all duration-300 ${
                    event.status === 'Cancelled'
                        ? 'border-red-500/20 hover:border-red-500/40 opacity-75'
                        : 'border-white/5 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10'
                    }`}>
                    {/* Subtle glow on hover */}
                    <div className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/0 via-primary/5 to-accent/10" />

                    <div className="relative p-5 flex-grow">
                        <div className="flex justify-between items-center mb-4">
                            <span className={`z-10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                                event.status === 'Cancelled'
                                ? 'bg-red-500/90 text-white shadow-lg shadow-red-500/20'
                                : event.status === 'Upcoming'
                                ? 'bg-primary/90 text-ohmai-charcoal'
                                : 'bg-white/10 text-slate-400 border border-white/10'
                                }`}>
                                {event.status}
                            </span>
                            <div className="z-10 flex items-center text-slate-300 gap-1.5 bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="text-xs font-semibold">{formattedDate}</span>
                            </div>
                        </div>

                        {event.cover_image_url && (
                            <div className="absolute inset-0 z-0">
                                <img
                                    src={event.cover_image_url}
                                    alt={`${event.name} race photos${event.location ? ' — ' + event.location : ''}`}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-ohmai-charcoal via-ohmai-charcoal/80 to-transparent" />
                            </div>
                        )}

                        <div className="relative z-10 w-full">


                            <h3 className={`text-xl font-display font-black text-white leading-tight group-hover:text-primary transition-colors uppercase italic pr-2 ${
                                event.status === 'Cancelled' ? 'line-through text-slate-500' : ''
                            }`}>
                                {event.name}
                            </h3>

                            <div className="mt-3 flex items-center text-slate-400 gap-1.5">
                                <MapPin className="w-4 h-4 text-primary/60" />
                                <p className="text-sm font-medium line-clamp-1">{event.location}</p>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                {safeParse(event.distances_json).map((dist, idx) => (
                                    <span key={idx} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-slate-300 border border-white/5 group-hover:border-primary/20 group-hover:bg-primary/5 transition-colors">
                                        {dist}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="px-5 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between group-hover:bg-primary/5 transition-colors">
                        <button
                            type="button"
                            onClick={handleShare}
                            aria-label={`Share ${event.name}`}
                            title="Share event"
                            className="z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-primary bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/30 transition-all active:scale-95"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                            Share
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                                VIEW DETAILS
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
