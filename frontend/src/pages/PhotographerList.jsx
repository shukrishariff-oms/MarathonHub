import { useState, useEffect } from 'react';
import { Search, Camera, Instagram, Globe, Facebook, Twitter, ArrowRight, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

export default function PhotographerList() {
    const [photographers, setPhotographers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPhotographers();
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
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="space-y-12 pb-20">
            <header className="space-y-4">
                <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-4xl font-display font-black text-white tracking-tighter uppercase italic"
                >
                    PHOTOGRAPHY <span className="text-gradient pr-2">PARTNERS</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-slate-400 font-medium"
                >
                    Meet the creators capturing every stride and octane celebration.
                </motion.p>
            </header>

            {/* Search */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-2 md:p-3 max-w-2xl sticky top-24 z-40"
            >
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        className="w-full pl-12 pr-4 py-3 bg-ohmai-charcoal-light border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium placeholder:text-slate-500 text-white"
                        placeholder="Search by name, brand, or agency..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </motion.div>

            {/* Grid */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-32 space-y-4"
                    >
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-slate-500 font-bold tracking-wide">Connecting to network...</p>
                    </motion.div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {photographers.map(p => (
                            <motion.div key={p.id} variants={itemVariants}>
                                <Link to={`/photographers/${p.id}`} className="block group h-full">
                                    <div className="glass-card h-full p-6 flex flex-col hover:bg-white/95 transition-all duration-500">
                                        <div className="flex items-center gap-5 mb-6">
                                            {p.logo_url ? (
                                                <div className="relative">
                                                    <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-accent rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                                                    <img src={p.logo_url} alt={p.name} className="relative h-20 w-20 rounded-2xl object-cover border-2 border-white/10 shadow-lg" />
                                                </div>
                                            ) : (
                                                <div className="h-20 w-20 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border-2 border-primary/10 shadow-inner">
                                                    <User className="h-10 w-10 text-primary/40" />
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-display font-black text-white leading-tight group-hover:text-primary transition-colors uppercase italic">
                                                    {p.name}
                                                </h3>
                                                {p.brand && <p className="text-sm font-bold text-primary/80 uppercase tracking-widest">{p.brand}</p>}
                                            </div>
                                        </div>

                                        <div className="space-y-4 flex-grow">
                                            <div className="flex flex-wrap gap-2">
                                                {JSON.parse(p.coverage_areas_json || '[]').slice(0, 3).map((area, idx) => (
                                                    <span key={idx} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-slate-400 border border-white/5 group-hover:border-primary/10 group-hover:text-primary transition-colors">
                                                        {area}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/5">
                                            <span className="text-xs font-bold text-slate-500 group-hover:text-primary transition-colors flex items-center gap-1">
                                                VIEW PORTFOLIO
                                            </span>
                                            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                        {photographers.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="col-span-full py-32 text-center glass-card border-dashed"
                            >
                                <Camera className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                                <h3 className="text-xl font-display font-bold text-slate-900 mb-2">No photographers found</h3>
                                <p className="text-slate-500 font-medium">Try searching for a different name or brand.</p>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
