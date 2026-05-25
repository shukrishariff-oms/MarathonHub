import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Globe, Instagram, Facebook, Twitter, MapPin, ExternalLink, Camera, Info, Calendar, ArrowRight, User } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import api from '../api';
import { safeParse } from '../utils/safeJson';

export default function PhotographerDetail() {
    const { id } = useParams();
    const [photographer, setPhotographer] = useState(null);
    const [loading, setLoading] = useState(true);

    const { scrollY } = useScroll();
    const yHero = useTransform(scrollY, [0, 500], [0, 200]);
    const opacityHero = useTransform(scrollY, [0, 300], [1, 0]);
    const scaleHero = useTransform(scrollY, [0, 500], [1, 1.1]);

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
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 border-4 border-primary/20 rounded-full animate-ping" />
                <div className="w-16 h-16 border-4 border-white/5 border-t-primary rounded-full animate-spin z-10 relative" />
            </div>
            <p className="text-primary font-bold tracking-[0.2em] uppercase text-sm mt-4">Syncing portfolio...</p>
        </div>
    );

    if (!photographer) return (
        <div className="text-center py-32 mt-10 rounded-[2.5rem] bg-ohmai-charcoal border border-white/5 shadow-2xl max-w-4xl mx-auto">
            <Info className="w-16 h-16 text-slate-500 mx-auto mb-6" />
            <h3 className="text-2xl font-display font-black text-white mb-2 uppercase italic">Photographer Not Found</h3>
            <p className="text-slate-400 font-medium">This profile might have been archived or removed from the manifest.</p>
            <Link to="/photographers" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-primary text-ohmai-charcoal font-bold rounded-xl hover:bg-primary-light transition-colors uppercase italic">
                Return to Roster
            </Link>
        </div>
    );

    return (
        <div className="space-y-24 pb-24 relative overflow-hidden">
            {/* Immersive Parallax Hero */}
            <motion.section 
                style={{ y: yHero, opacity: opacityHero }}
                className="relative h-[80vh] min-h-[600px] flex items-end pb-24 -mx-4 sm:-mx-8 lg:-mx-16 px-4 sm:px-8 lg:px-16"
            >
                {/* Background Parallax Elements */}
                <motion.div style={{ scale: scaleHero }} className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-ohmai-charcoal" />
                    {photographer.logo_url && (
                        <>
                            <img
                                src={photographer.logo_url}
                                alt={`${photographer.name} — race photographer brand background`}
                                loading="lazy"
                                decoding="async"
                                aria-hidden="true"
                                className="w-full h-full object-cover opacity-[0.03] grayscale mix-blend-screen blur-sm"
                            />
                        </>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] via-[#0B0F1A]/80 to-transparent" />
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
                </motion.div>

                {/* Massive Background Text */}
                <div className="absolute bottom-1/2 translate-y-1/2 left-0 w-full overflow-hidden pointer-events-none z-0">
                    <h1 className="text-[12vw] font-display font-black text-white/[0.02] whitespace-nowrap uppercase italic leading-none animate-[shimmer_20s_linear_infinite]">
                        {photographer.brand || photographer.name} {photographer.name}
                    </h1>
                </div>

                <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-end">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", damping: 20 }}
                        className="relative group shrink-0"
                    >
                        <div className="absolute -inset-2 bg-gradient-to-tr from-primary to-accent rounded-[2.5rem] blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-700 animate-pulse" />
                        {photographer.logo_url ? (
                            <img
                                src={photographer.logo_url}
                                alt={`${photographer.name} — official Malaysia race photographer`}
                                loading="eager"
                                decoding="async"
                                className="relative h-48 w-48 lg:h-64 lg:w-64 rounded-[2.5rem] object-cover border-4 border-white/5 shadow-2xl group-hover:scale-[1.02] transition-transform duration-500"
                            />
                        ) : (
                            <div className="relative h-48 w-48 lg:h-64 lg:w-64 rounded-[2.5rem] bg-white/5 flex items-center justify-center border-4 border-white/5 shadow-2xl backdrop-blur-md">
                                <Camera className="w-24 h-24 text-slate-500" />
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex-1 space-y-6 pb-4"
                    >
                        <div className="space-y-2">
                            {photographer.brand && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm tracking-widest uppercase mb-2">
                                    {photographer.brand}
                                </motion.div>
                            )}
                            <h1 className="text-5xl lg:text-7xl font-display font-black text-white tracking-tighter uppercase italic leading-none drop-shadow-lg">
                                {photographer.name}
                            </h1>
                        </div>

                        <div className="flex gap-4">
                            {photographer.website_url && (
                                <a href={photographer.website_url} target="_blank" rel="noopener noreferrer" className="p-4 bg-white/5 rounded-2xl text-slate-400 hover:text-primary hover:bg-white/10 transition-all hover:-translate-y-1 hover:shadow-lg border border-white/10">
                                    <Globe className="h-6 w-6" />
                                </a>
                            )}
                            {photographer.instagram_url && (
                                <a href={photographer.instagram_url} target="_blank" rel="noopener noreferrer" className="p-4 bg-white/5 rounded-2xl text-slate-400 hover:text-pink-500 hover:bg-white/10 transition-all hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(236,72,153,0.2)] border border-white/10">
                                    <Instagram className="h-6 w-6" />
                                </a>
                            )}
                            {photographer.facebook_url && (
                                <a href={photographer.facebook_url} target="_blank" rel="noopener noreferrer" className="p-4 bg-white/5 rounded-2xl text-slate-400 hover:text-blue-500 hover:bg-white/10 transition-all hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(59,130,246,0.2)] border border-white/10">
                                    <Facebook className="h-6 w-6" />
                                </a>
                            )}
                        </div>
                    </motion.div>
                </div>
            </motion.section>

            {/* Profile Intel */}
            <div className="max-w-7xl mx-auto space-y-24 px-4 sm:px-8">
                
                <section className="grid lg:grid-cols-3 gap-12 lg:gap-20">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="lg:col-span-2 space-y-6"
                    >
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-4">
                            <span className="w-8 h-px bg-slate-700"></span> About the Artist
                        </h3>
                        <div className="relative">
                            <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-accent to-transparent rounded-full opacity-50" />
                            <p className="text-xl lg:text-2xl text-slate-300 font-medium leading-relaxed italic">
                                {photographer.bio || "Crafting visual narratives from starting pistol to finish line tape. Every frame is a dedicated freeze-frame of dedication."}
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="space-y-6 bg-ohmai-charcoal border border-white/5 rounded-[2rem] p-8 shadow-xl"
                    >
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Coverage Zones</h3>
                        <div className="flex flex-wrap gap-3">
                            {safeParse(photographer.coverage_areas_json).map((area, idx) => (
                                <span key={idx} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-slate-200 font-bold border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-default">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    {area}
                                </span>
                            ))}
                            {(!photographer.coverage_areas_json || safeParse(photographer.coverage_areas_json).length === 0) && (
                                <span className="text-slate-500 italic">No specific zones listed.</span>
                            )}
                        </div>
                    </motion.div>
                </section>

                {/* Film-Strip Assignments Section */}
                <section className="space-y-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-6"
                    >
                        <h2 className="text-4xl lg:text-5xl font-display font-black text-white tracking-tighter uppercase italic">
                            Assignment <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Archive</span>
                        </h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                    </motion.div>

                    <div className="grid gap-8 lg:grid-cols-2">
                        {photographer.assignments && photographer.assignments.length > 0 ? (
                            photographer.assignments.map((assignment, idx) => {
                                const event = assignment.event;
                                if (!event) return null;

                                return (
                                    <motion.div
                                        key={assignment.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        whileHover={{ y: -5 }}
                                        transition={{ delay: idx * 0.1, duration: 0.4 }}
                                        className="group relative bg-[#0B0F1A] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
                                    >
                                        {/* Abstract Cover / Film Frame */}
                                        <div className="w-full md:w-48 h-48 md:h-auto bg-gradient-to-br from-white/5 to-white/10 relative overflow-hidden flex-shrink-0">
                                            {/* Film track holes */}
                                            <div className="absolute top-0 bottom-0 left-2 w-2 flex flex-col justify-around py-4 z-10">
                                                {[...Array(6)].map((_, i) => <div key={i} className="w-2 h-3 bg-[#0B0F1A] rounded-sm opacity-50" />)}
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 mix-blend-overlay group-hover:scale-110 transition-transform duration-700" />
                                            {event.logo_url ? (
                                                <img
                                                    src={event.logo_url}
                                                    alt={`${event.name} — race event covered by ${photographer.name}`}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                                                />
                                            ) : (
                                                <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-white/10 group-hover:text-primary/20 transition-colors duration-500" />
                                            )}
                                        </div>

                                        <div className="p-8 flex flex-col flex-grow relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
                                            
                                            <div className="flex items-center gap-2 text-primary mb-4">
                                                <Calendar className="w-4 h-4" />
                                                <span className="text-xs font-black uppercase tracking-widest">
                                                    {new Date(event.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                                </span>
                                            </div>

                                            <h3 className="text-2xl font-display font-black text-white group-hover:text-primary transition-colors leading-tight mb-6 uppercase italic pr-4">
                                                {event.name}
                                            </h3>

                                            <div className="mt-auto space-y-4">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Coverage</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {safeParse(assignment.km_coverage_json).map((km, i) => (
                                                        <span key={i} className="px-3 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20 inline-block">
                                                            {km}
                                                        </span>
                                                    ))}
                                                    {(!assignment.km_coverage_json || safeParse(assignment.km_coverage_json).length === 0) && (
                                                        <span className="text-slate-500 text-xs italic">General</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Button - Glows on hover */}
                                            <a
                                                href={assignment.gallery_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => {
                                                    api.post('/track', {
                                                        path: assignment.gallery_url,
                                                        entity_type: 'photographer',
                                                        entity_id: photographer.id
                                                    }).catch(console.error);
                                                }}
                                                className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:w-auto group-hover:px-6 transition-all duration-300 overflow-hidden"
                                            >
                                                <div className="flex items-center gap-2 text-transparent group-hover:text-ohmai-charcoal font-black uppercase italic whitespace-nowrap">
                                                    <span>View Gallery</span>
                                                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-ohmai-charcoal shrink-0" />
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-slate-400 absolute group-hover:opacity-0 transition-opacity" />
                                            </a>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="col-span-full py-32 rounded-[2.5rem] text-center bg-white/5 border border-white/5 border-dashed relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <Camera className="w-20 h-20 text-slate-600 mx-auto mb-6 group-hover:scale-110 group-hover:text-primary/50 transition-all duration-500" />
                                <h3 className="text-2xl font-display font-black text-white mb-2 uppercase italic">No History Found</h3>
                                <p className="text-slate-400 font-medium">This visual artist has not been assigned to any events yet.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
