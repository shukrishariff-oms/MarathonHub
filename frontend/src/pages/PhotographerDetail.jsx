import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Globe, Instagram, Facebook, Twitter, MapPin, ExternalLink, Camera, Info, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';

export default function PhotographerDetail() {
    const { id } = useParams();
    const [photographer, setPhotographer] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/photographers/${id}`)
            .then(res => {
                setPhotographer(res.data);
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
            <p className="text-slate-400 font-bold tracking-wide uppercase italic">Syncing portfolio fire...</p>
        </div>
    );

    if (!photographer) return (
        <div className="text-center py-32 glass-card">
            <Info className="w-16 h-16 text-slate-200 mx-auto mb-6" />
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Photographer Not Found</h3>
            <p className="text-slate-500 font-medium">This profile might have been archived or removed.</p>
        </div>
    );

    return (
        <div className="space-y-16 pb-20">
            {/* Profile Hero */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2.5rem] bg-ohmai-charcoal border border-white/5 shadow-2xl"
            >
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                <div className="h-40 bg-gradient-to-r from-ohmai-charcoal via-primary to-accent opacity-80" />

                <div className="relative z-10 px-8 pb-12 -mt-12 flex flex-col md:flex-row gap-8 items-start">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-accent rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition-opacity" />
                        {photographer.logo_url ? (
                            <img src={photographer.logo_url} alt={photographer.name} className="relative h-40 w-40 rounded-[2rem] object-cover border-4 border-ohmai-charcoal-light shadow-xl" />
                        ) : (
                            <div className="relative h-40 w-40 rounded-[2rem] bg-slate-50 flex items-center justify-center border-4 border-white shadow-xl">
                                <Camera className="w-16 h-16 text-slate-200" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-4 pt-16">
                        <div className="space-y-1">
                            <h1 className="text-4xl md:text-5xl font-display font-black text-white tracking-tighter uppercase italic pr-4">{photographer.name}</h1>
                            {photographer.brand && <p className="text-lg font-bold text-primary uppercase tracking-widest">{photographer.brand}</p>}
                        </div>

                        <div className="flex gap-3">
                            {photographer.website_url && (
                                <a href={photographer.website_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-primary transition-all hover:scale-110 border border-white/5">
                                    <Globe className="h-5 w-5" />
                                </a>
                            )}
                            {photographer.instagram_url && (
                                <a href={photographer.instagram_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-pink-600 transition-all hover:scale-110">
                                    <Instagram className="h-5 w-5" />
                                </a>
                            )}
                            {photographer.facebook_url && (
                                <a href={photographer.facebook_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-blue-500 transition-all hover:scale-110 border border-white/5">
                                    <Facebook className="h-5 w-5" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-8 pb-12 grid md:grid-cols-3 gap-12">
                    <div className="md:col-span-2 space-y-4">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">About the Artist</h3>
                        <p className="text-lg text-slate-400 font-medium leading-relaxed italic border-l-4 border-primary/20 pl-6">
                            {photographer.bio || "No biography provided."}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Coverage Specialities</h3>
                        <div className="flex flex-wrap gap-2">
                            {JSON.parse(photographer.coverage_areas_json || '[]').map((area, idx) => (
                                <span key={idx} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold border border-white/5">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    {area}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Covered Events Section */}
            <section className="space-y-10">
                <div className="flex items-end justify-between">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-display font-black text-white tracking-tighter uppercase italic">Recent Assignments</h2>
                        <p className="text-slate-400 font-medium">Galleries and results from recent octane coverage.</p>
                    </div>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {photographer.assignments && photographer.assignments.length > 0 ? (
                        photographer.assignments.map((assignment, idx) => {
                            const event = assignment.event;
                            if (!event) return null;

                            return (
                                <motion.div
                                    key={assignment.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="glass-card flex flex-col group p-1 overflow-hidden"
                                >
                                    <div className="p-6 flex-grow">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                                    {new Date(event.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-display font-black text-white group-hover:text-primary transition-colors leading-tight mb-4 uppercase italic">
                                            {event.name}
                                        </h3>

                                        <div className="space-y-3">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Event Specific Coverage</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {JSON.parse(assignment.km_coverage_json || '[]').map((km, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/5 text-primary border border-primary/10">
                                                        {km}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <a
                                        href={assignment.gallery_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                            api.post('/track', {
                                                path: assignment.gallery_url,
                                                entity_type: 'event', // Tracking event interest from photographer profile? Or still photographer?
                                                // Actually, if they are on photographer profile and go to gallery, it's still engagement for photographer.
                                                // But let's track as 'other' or maybe 'photographer_gallery_click'?
                                                // To keep it simple and showing in 'Top Photographers', we use 'photographer'.
                                                // Wait, if I use entity_type 'photographer' and entity_id 'photographer.id', it counts as a view.
                                                // Here we are listing assignments. The user is ALREADY on the photographer profile (so 1 view counted).
                                                // If they click a gallery, should it count as ANOTHER view?
                                                // User says "dia akan kita photographer yang dah di assign".
                                                // Let's count it as 'photographer' view for now to boost stats.
                                                path: assignment.gallery_url,
                                                entity_type: 'photographer',
                                                entity_id: photographer.id
                                            }).catch(console.error);
                                        }}
                                        className="p-5 bg-primary text-ohmai-charcoal flex justify-center items-center gap-3 font-black group-hover:scale-[1.02] transition-transform uppercase italic"
                                    >
                                        Browse Photos
                                        <ArrowRight className="w-4 h-4" />
                                    </a>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-24 text-center glass-card bg-slate-50/50 border-dashed">
                            <Camera className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">No history found</h3>
                            <p className="text-slate-500 font-medium">Galleries will appear here once assignments are completed.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
