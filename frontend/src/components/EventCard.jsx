import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EventCard({ event }) {
    const formattedDate = new Date(event.date).toLocaleDateString(undefined, {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    return (
        <motion.div
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
        >
            <Link to={`/events/${event.id}`} className="block h-full">
                <div className="glass-card h-full flex flex-col group p-1 overflow-hidden">
                    <div className="p-5 flex-grow">
                        <div className="flex justify-between items-center mb-4">
                            <span className={`z-10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${event.status === 'Upcoming'
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
                                <img src={event.cover_image_url} alt={event.name} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
                                <div className="absolute inset-0 bg-gradient-to-t from-ohmai-charcoal via-ohmai-charcoal/80 to-transparent" />
                            </div>
                        )}

                        <div className="relative z-10 w-full">


                            <h3 className="text-xl font-display font-black text-white leading-tight group-hover:text-primary transition-colors uppercase italic pr-2">
                                {event.name}
                            </h3>

                            <div className="mt-3 flex items-center text-slate-400 gap-1.5">
                                <MapPin className="w-4 h-4 text-primary/60" />
                                <p className="text-sm font-medium line-clamp-1">{event.location}</p>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                {JSON.parse(event.distances_json || '[]').map((dist, idx) => (
                                    <span key={idx} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-slate-300 border border-white/5 group-hover:border-primary/20 group-hover:bg-primary/5 transition-colors">
                                        {dist}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="px-5 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between group-hover:bg-primary/5 transition-colors">
                        <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                            VIEW DETAILS
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
