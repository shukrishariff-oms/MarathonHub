import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Camera, Calendar, MapPin, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import EventCarousel from '../components/EventCarousel';
import EventCard from '../components/EventCard';

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('');
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [recentEvents, setRecentEvents] = useState([]);
    const [highlightedEvents, setHighlightedEvents] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/events?status=Upcoming&limit=3')
            .then(res => setUpcomingEvents(res.data))
            .catch(err => console.error(err));

        api.get('/events?status=Past&limit=3')
            .then(res => setRecentEvents(res.data))
            .catch(err => console.error(err));

        // Fetch ALL highlighted events for carousel
        api.get('/events?is_highlight=true')
            .then(res => {
                if (res.data && res.data.length > 0) {
                    setHighlightedEvents(res.data);
                }
            })
            .catch(err => console.error(err));
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/events?search=${searchTerm}`);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    return (
        <div className="space-y-24 pb-20">
            {/* Event Carousel for Highlighted Events */}
            {highlightedEvents.length > 0 ? (
                <div className="mb-24">
                    <EventCarousel events={highlightedEvents} />
                </div>
            ) : (
                /* Standard Hero only if no Highlighted Events */
                <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden rounded-[3rem] bg-ohmai-charcoal text-white p-8 md:p-16">
                    {/* Abstract Background Elements */}
                    <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />

                    <div className="relative z-10 max-w-4xl w-full text-center space-y-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-primary text-xs font-bold uppercase tracking-widest"
                        >
                            <Sparkles className="w-4 h-4" />
                            Capture the Moment
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-5xl md:text-7xl lg:text-8xl font-display font-black tracking-tighter leading-none uppercase italic"
                        >
                            Larian <span className="text-gradient pr-4">Hub</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium"
                        >
                            The extreme hub for racing events and high-octane photography.
                            Relive the fire from your last finish line.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="max-w-2xl mx-auto mt-12"
                        >
                            <form onSubmit={handleSearch} className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-ohmai-orange to-accent rounded-3xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative flex items-center bg-ohmai-charcoal-light border border-white/5 rounded-2xl p-2 shadow-2xl">
                                    <Search className="absolute left-6 w-5 h-5 text-slate-500" />
                                    <input
                                        type="text"
                                        className="w-full pl-14 pr-4 py-4 bg-transparent text-white placeholder:text-slate-500 outline-none font-medium"
                                        placeholder="Search events, locations, or brands..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="premium-btn-primary py-3 px-8 hidden sm:flex"
                                    >
                                        Explore
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* Upcoming Events */}
            <motion.section
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
            >
                <div className="flex items-end justify-between mb-10">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-display font-black text-white tracking-tight italic uppercase">Upcoming Challenges</h2>
                        <p className="text-slate-400 font-medium">Ready for your next start line?</p>
                    </div>
                    <Link to="/events" className="group flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all duration-300">
                        Browse all <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {upcomingEvents.map(event => (
                        <motion.div key={event.id} variants={itemVariants}>
                            <EventCard event={event} />
                        </motion.div>
                    ))}
                    {upcomingEvents.length === 0 && (
                        <div className="col-span-full py-20 text-center glass-card bg-slate-50/50">
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-bold">No upcoming events scheduled yet.</p>
                        </div>
                    )}
                </div>
            </motion.section>

            {/* Recent Events & Photos */}
            <motion.section
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
            >
                <div className="flex items-end justify-between mb-10">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-display font-black text-white tracking-tight italic uppercase">Recent Galleries</h2>
                        <p className="text-slate-400 font-medium">Find your race day photos here.</p>
                    </div>
                    <Link to="/events?status=Past" className="group flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all duration-300">
                        View history <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {recentEvents.map(event => (
                        <motion.div key={event.id} variants={itemVariants}>
                            <EventCard event={event} />
                        </motion.div>
                    ))}
                    {recentEvents.length === 0 && (
                        <div className="col-span-full py-20 text-center glass-card border-dashed">
                            <Camera className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-bold">Galleries will appear here after the races.</p>
                        </div>
                    )}
                </div>
            </motion.section>

            {/* CTA Section */}
            <section className="relative py-24 px-8 rounded-[3rem] border border-white/5 bg-ohmai-charcoal-light overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 skew-x-12 transform origin-top pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-1/3 h-full bg-accent/5 -skew-x-12 transform origin-bottom pointer-events-none" />

                <div className="relative z-10 text-center space-y-8 max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter uppercase italic">
                        Be <span className="text-gradient">Extreme</span>
                    </h2>
                    <p className="text-xl text-slate-400 font-medium">
                        Join the fastest growing platform for race photographers and athletes.
                    </p>
                    <div className="flex flex-wrap justify-center gap-6 pt-4">
                        <button className="premium-btn-primary">
                            Partner With Us
                        </button>
                        <Link to="/photographers" className="premium-btn-outline">
                            View Photographers
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
