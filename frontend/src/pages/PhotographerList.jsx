import { useState, useEffect } from 'react';
import { Search, Camera, ArrowRight, User, Aperture } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { safeParse } from '../utils/safeJson';

export default function PhotographerList() {
    const [photographers, setPhotographers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchPhotographers();
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const fetchPhotographers = () => {
        setLoading(true);
        let url = `/photographers?limit=100`;
        if (search) url += `&search=${search}`;

        api.get(url)
            .then(res => {
                setPhotographers(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 30, opacity: 0, scale: 0.95 },
        visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
    };

    return (
        <div className="relative space-y-16 pb-24 min-h-screen">
            {/* Dynamic Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none opacity-50" />
            
            <header className="relative z-10 space-y-6 text-center max-w-3xl mx-auto pt-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center space-y-2"
                >
                    <div className="relative group">
                        {/* Glow Effect */}
                        <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        <h1 className="relative text-6xl md:text-8xl font-display font-black tracking-tighter italic uppercase leading-none">
                            <span className="text-white">MARATHON</span>
                            <span className="text-primary drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">HUB</span>
                        </h1>
                    </div>
                </motion.div>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg text-slate-400 font-medium max-w-xl mx-auto mt-8"
                >
                    The hub for event photography. Find your triumph.
                </motion.p>

                {/* Enhanced Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative group mt-8 max-w-2xl mx-auto z-40"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex items-center bg-[#0B0F1A] rounded-full border border-white/10 shadow-2xl p-2 pl-6 overflow-hidden">
                        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors flex-shrink-0" />
                        <input
                            type="text"
                            className="w-full bg-transparent border-none focus:ring-0 outline-none px-4 py-3 font-medium placeholder:text-slate-600 text-white text-lg"
                            placeholder="Search by name, brand, or location..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="p-2 text-slate-500 hover:text-white transition-colors">
                                <span className="text-xs uppercase font-bold tracking-wider">Clear</span>
                            </button>
                        )}
                    </div>
                </motion.div>
            </header>

            {/* Content Area */}
            <div className="relative z-10 max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-32 space-y-4"
                        >
                            <div className="relative flex items-center justify-center">
                                <div className="absolute w-16 h-16 border-4 border-primary/20 rounded-full animate-ping" />
                                <div className="w-12 h-12 border-4 border-white/5 border-t-primary rounded-full animate-spin z-10 relative" />
                            </div>
                            <p className="text-primary font-bold tracking-[0.2em] uppercase text-sm mt-4">Scanning records...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="grid"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
                        >
                            {photographers.map(p => (
                                <motion.div key={p.id} variants={itemVariants} className="group h-full">
                                    <Link to={`/photographers/${p.id}`} className="block h-full relative outline-none">
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 rounded-[2rem] transform scale-95 group-hover:scale-100 transition-all duration-500 opacity-0 group-hover:opacity-100" />
                                        
                                        <div className="relative h-full bg-ohmai-charcoal border border-white/5 rounded-[2rem] p-6 lg:p-8 overflow-hidden transition-all duration-500 group-hover:-translate-y-2 group-hover:border-primary/30 group-hover:shadow-[0_20px_40px_-20px_rgba(var(--color-primary),0.3)] flex flex-col">
                                            {/* Shimmer Effect */}
                                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-45deg] group-hover:animate-shimmer pointer-events-none" />

                                            <div className="flex items-start gap-6 mb-8 relative z-10">
                                                {p.logo_url ? (
                                                    <div className="relative shrink-0">
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-primary to-accent rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                                                        <img
                                                            src={p.logo_url}
                                                            alt={`${p.name} — marathon photographer Malaysia`}
                                                            loading="lazy"
                                                            decoding="async"
                                                            className="relative h-24 w-24 rounded-[1.5rem] object-cover border-2 border-white/10 shadow-xl group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="relative shrink-0 h-24 w-24 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-primary border-2 border-white/5 group-hover:border-primary/30 transition-colors shadow-inner">
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-primary to-accent rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
                                                        <User className="h-10 w-10 text-slate-500 group-hover:text-primary transition-colors relative z-10" />
                                                    </div>
                                                )}
                                                
                                                <div className="space-y-2 mt-2">
                                                    {p.brand && <p className="text-[10px] font-black text-primary/80 uppercase tracking-widest leading-none">{p.brand}</p>}
                                                    <h3 className="text-2xl font-display font-black text-white leading-none group-hover:text-primary transition-colors uppercase italic pr-4">
                                                        {p.name}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="mt-auto space-y-6 relative z-10">
                                                <div className="flex flex-wrap gap-2">
                                                    {safeParse(p.coverage_areas_json).slice(0, 3).map((area, idx) => (
                                                        <span key={idx} className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white/5 text-slate-400 border border-white/10 group-hover:border-white/20 transition-colors">
                                                            {area}
                                                        </span>
                                                    ))}
                                                </div>

                                                <div className="flex items-center justify-between pt-6 border-t border-white/10 relative overflow-hidden">
                                                    <div className="relative z-10 flex items-center gap-2 group-hover:text-primary transition-colors">
                                                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-primary transition-colors">
                                                            Explore Profile
                                                        </span>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300 z-10">
                                                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-ohmai-charcoal" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                            
                            {photographers.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="col-span-full py-32 text-center"
                                >
                                    <div className="inline-flex justify-center items-center w-24 h-24 rounded-full bg-white/5 mb-6">
                                        <Camera className="w-10 h-10 text-slate-500" />
                                    </div>
                                    <h3 className="text-2xl font-display font-black text-white mb-2 uppercase italic tracking-tight">No Results Found</h3>
                                    <p className="text-slate-400 font-medium max-w-md mx-auto">We couldn't find any photographers matching your search criteria. Try a different keyword.</p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
