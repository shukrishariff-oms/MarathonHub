import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Flag, ExternalLink, Timer, Trophy, Info, Camera, User } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';

export default function EventDetail() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/events/${id}`)
            .then(res => {
                setEvent(res.data);
                if (res.data.assignments) {
                    setAssignments(res.data.assignments);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [id]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-white/5 border-t-primary rounded-full animate-spin" />
            <p className="text-slate-400 font-bold tracking-wide uppercase italic">Syncing event pulse...</p>
        </div>
    );

    if (!event) return (
        <div className="text-center py-32 glass-card">
            <Info className="w-16 h-16 text-slate-200 mx-auto mb-6" />
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Event Not Found</h3>
            <p className="text-slate-500 font-medium">The event you're looking for doesn't exist or has been removed.</p>
        </div>
    );

    const formattedDate = new Date(event.date).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="space-y-16 pb-20">
            {/* Premium Header/Hero */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2.5rem] bg-ohmai-charcoal border border-white/5 text-white"
            >
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-accent/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.03)_0%,transparent_70%)] pointer-events-none" />

                <div className="relative z-10 p-8 md:p-16 flex flex-col md:flex-row gap-12 items-end justify-between">
                    <div className="space-y-6 max-w-2xl">
                        <div className="flex flex-wrap gap-3">
                            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border ${event.status === 'Upcoming'
                                ? 'bg-primary/10 border-primary/20 text-primary'
                                : 'bg-white/5 border-white/10 text-slate-400'
                                }`}>
                                {event.status}
                            </span>
                            <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-indigo-300">
                                {event.organizer}
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-7xl font-display font-black tracking-tighter leading-[0.9] uppercase italic pr-4">
                            {event.name}
                        </h1>

                        <div className="flex flex-wrap gap-8 pt-4">
                            <div className="flex items-center gap-3 text-slate-400">
                                <Calendar className="w-5 h-5 text-primary" />
                                <span className="font-bold text-slate-100">{formattedDate}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-400">
                                <MapPin className="w-5 h-5 text-primary" />
                                <span className="font-bold text-slate-100">{event.location}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full md:w-auto min-w-[280px]">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <Timer className="w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest">Race Distances</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {JSON.parse(event.distances_json || '[]').map((dist, idx) => (
                                <div key={idx} className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors">
                                    <span className="text-xl font-display font-black text-white">{dist}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Description */}
            <section className="grid md:grid-cols-3 gap-12 items-start">
                <div className="md:col-span-2 space-y-6">
                    <h2 className="text-2xl font-display font-black text-white flex items-center gap-3 uppercase italic tracking-tighter">
                        <Trophy className="w-6 h-6 text-primary" />
                        About the Event
                    </h2>
                    <div className="prose prose-invert max-w-none">
                        <p className="text-lg text-slate-400 font-medium leading-relaxed italic border-l-4 border-primary/20 pl-6">
                            {event.description}
                        </p>
                    </div>
                </div>

                <div className="glass-card p-8 bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Event Stats</h3>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold">Photographers</span>
                            <span className="text-slate-900 font-black">{assignments.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold">Organizer</span>
                            <span className="text-slate-900 font-black">{event.organizer}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Photographers Section */}
            <section className="space-y-10">
                <div className="flex items-end justify-between">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-display font-black text-white tracking-tighter italic uppercase">Race Media</h2>
                        <p className="text-slate-400 font-medium font-display">Experience the fire through the lens.</p>
                    </div>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {assignments.map((assignment, idx) => {
                        const kmList = JSON.parse(assignment.km_coverage_json || '[]');
                        const photographer = assignment.photographer;

                        return (
                            <motion.div
                                key={assignment.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="glass-card p-1 group overflow-hidden flex flex-col"
                            >
                                <div className="p-6 flex-grow">
                                    <div className="flex items-start gap-4 mb-6">
                                        {photographer.logo_url ? (
                                            <img src={photographer.logo_url} alt={photographer.name} className="h-14 w-14 rounded-xl object-cover border-2 border-white shadow-md" />
                                        ) : (
                                            <div className="h-14 w-14 rounded-xl bg-primary/5 flex items-center justify-center border-2 border-primary/10">
                                                <Camera className="w-7 h-7 text-primary/30" />
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <Link to={`/photographers/${photographer.id}`} className="text-lg font-black text-white hover:text-primary transition-colors block leading-tight uppercase italic">
                                                {photographer.name}
                                            </Link>
                                            {photographer.brand && <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">{photographer.brand}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Coverage Areas</span>
                                            <div className="flex flex-wrap gap-2">
                                                {kmList.map((km, i) => (
                                                    <span key={i} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-50 text-primary-700 border border-primary/10">
                                                        {km}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {assignment.note && (
                                            <p className="text-sm text-slate-400 font-medium italic bg-white/5 p-4 rounded-xl border border-white/5">
                                                "{assignment.note}"
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <a
                                    href={assignment.gallery_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-5 bg-primary text-ohmai-charcoal flex justify-center items-center gap-3 font-black group-hover:scale-[1.02] transition-transform uppercase italic"
                                >
                                    Get Your Photos
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </motion.div>
                        );
                    })}
                    {assignments.length === 0 && (
                        <div className="col-span-full py-24 text-center glass-card bg-slate-50/50 border-dashed">
                            <Camera className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">No galleries yet</h3>
                            <p className="text-slate-500 font-medium">Official race photos will appear here after the event.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
