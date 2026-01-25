import { useState, useEffect } from 'react';
import { Search, Filter, Calendar as CalendarIcon, SlidersHorizontal } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import EventCard from '../components/EventCard';

export default function EventList() {
    const [events, setEvents] = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('All');
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const initialSearch = queryParams.get('search') || '';
        const initialStatus = queryParams.get('status') || 'All';

        setSearch(initialSearch);
        setStatus(initialStatus);
    }, [location.search]);

    useEffect(() => {
        fetchEvents();
    }, [search, status]);

    const fetchEvents = () => {
        setLoading(true);
        let url = `/events?limit=100`;
        if (status !== 'All') url += `&status=${status}`;
        if (search) url += `&search=${search}`;

        api.get(url)
            .then(res => {
                setEvents(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    // Group events by month
    const groupEventsByMonth = (events) => {
        const grouped = {};

        events.forEach(event => {
            const date = new Date(event.date.endsWith('Z') ? event.date : event.date + 'Z');
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            if (!grouped[monthKey]) {
                grouped[monthKey] = {
                    monthName,
                    events: [],
                    date: date
                };
            }
            grouped[monthKey].events.push(event);
        });

        // Convert to array and sort by date
        return Object.values(grouped).sort((a, b) => a.date - b.date);
    };

    const groupedEvents = groupEventsByMonth(events);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    return (
        <div className="space-y-12 pb-20">
            <header className="space-y-4">
                <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-4xl font-display font-black text-white tracking-tighter uppercase italic"
                >
                    EXPLORE <span className="text-gradient pr-2">EVENTS</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-slate-400 font-medium"
                >
                    Discover the most extreme racing events on the planet.
                </motion.p>
            </header>

            {/* Premium Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-2 md:p-3 flex flex-col md:flex-row gap-3 items-center sticky top-24 z-40"
            >
                <div className="relative flex-grow w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        className="w-full pl-12 pr-4 py-3 bg-ohmai-charcoal-light border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium placeholder:text-slate-500 text-white"
                        placeholder="Search by event name, location..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-48">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-ohmai-charcoal-light border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-white appearance-none cursor-pointer"
                        >
                            <option value="All">All Events</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="Past">Past Results</option>
                        </select>
                    </div>
                </div>
            </motion.div>

            {/* Events Grouped by Month */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-32 space-y-4"
                    >
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-slate-500 font-bold tracking-wide">Syncing events...</p>
                    </motion.div>
                ) : events.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-32 text-center glass-card border-dashed"
                    >
                        <CalendarIcon className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                        <h3 className="text-xl font-display font-bold text-white mb-2">No results found</h3>
                        <p className="text-slate-500 font-medium">Try adjusting your search or filters.</p>
                    </motion.div>
                ) : (
                    <div className="space-y-12">
                        {groupedEvents.map((group, groupIndex) => (
                            <motion.div
                                key={group.monthName}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: groupIndex * 0.1 }}
                                className="space-y-6"
                            >
                                {/* Month Header */}
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <CalendarIcon className="w-6 h-6 text-primary" />
                                        <h2 className="text-2xl font-display font-black text-white tracking-tight uppercase italic">
                                            {group.monthName}
                                        </h2>
                                    </div>
                                    <div className="flex-grow h-px bg-gradient-to-r from-white/10 to-transparent" />
                                    <span className="text-sm font-bold text-slate-500 bg-white/5 px-3 py-1 rounded-full">
                                        {group.events.length} {group.events.length === 1 ? 'event' : 'events'}
                                    </span>
                                </div>

                                {/* Events Grid for this month */}
                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
                                >
                                    {group.events.map(event => (
                                        <EventCard key={event.id} event={event} />
                                    ))}
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
