import { useState, useEffect } from 'react';
import { Search, Filter, Calendar as CalendarIcon, SlidersHorizontal, X, Footprints, MapPin, Mountain } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import EventCard from '../components/EventCard';
import { safeParse } from '../utils/safeJson';

// Race-type options for filter pills (matches admin enum).
const RACE_TYPE_OPTIONS = [
    { key: 'road', label: 'Road' },
    { key: 'trail', label: 'Trail' },
    { key: 'fun_run', label: 'Fun Run' },
    { key: 'ultra', label: 'Ultra' },
];

// Normalize distance labels to canonical KM values for filtering.
// Admin-entered strings vary ("Full Marathon", "42KM", "42 km") — match all.
const DISTANCE_OPTIONS = [
    { key: '42KM', label: '42KM', aliases: ['42km', '42 km', 'full marathon', 'fm', '42'] },
    { key: '21KM', label: '21KM', aliases: ['21km', '21 km', 'half marathon', 'hm', '21'] },
    { key: '10KM', label: '10KM', aliases: ['10km', '10 km', '10'] },
    { key: '5KM', label: '5KM', aliases: ['5km', '5 km', '5'] },
];

function eventHasDistance(event, distanceKey) {
    const distances = safeParse(event.distances_json, []);
    if (!distances.length) return false;
    const opt = DISTANCE_OPTIONS.find(o => o.key === distanceKey);
    if (!opt) return false;
    const needle = [opt.key.toLowerCase(), ...opt.aliases];
    return distances.some(d => {
        const norm = String(d).trim().toLowerCase();
        return needle.some(n => norm === n || norm.includes(n));
    });
}

export default function EventList() {
    const [events, setEvents] = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('All');
    const [monthFilter, setMonthFilter] = useState(''); // e.g. '2026-05'
    const [distanceFilter, setDistanceFilter] = useState(''); // e.g. '42KM'
    const [stateFilter, setStateFilter] = useState(''); // e.g. 'Selangor'
    const [raceTypeFilter, setRaceTypeFilter] = useState(''); // e.g. 'road'
    const [stats, setStats] = useState(null); // { upcoming, photographers, past, photos }
    const [availableStates, setAvailableStates] = useState([]); // distinct from backend
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const initialSearch = queryParams.get('search') || '';
        const initialStatus = queryParams.get('status') || 'All';
        const initialMonth = queryParams.get('month') || '';
        const initialDistance = queryParams.get('distance') || '';
        const initialState = queryParams.get('state') || '';
        const initialRaceType = queryParams.get('race_type') || '';

        setSearch(initialSearch);
        setStatus(initialStatus);
        setMonthFilter(initialMonth);
        setDistanceFilter(initialDistance);
        setStateFilter(initialState);
        setRaceTypeFilter(initialRaceType);
    }, [location.search]);

    // Load race-calendar stats + filter options once on mount
    useEffect(() => {
        api.get('/race-calendar/stats').then(r => setStats(r.data)).catch(() => {});
        api.get('/race-calendar/filters').then(r => {
            setAvailableStates(r.data.states || []);
        }).catch(() => {});
    }, []);

    // Helper: update URL when month filter changes (keeps filter shareable)
    const applyMonthFilter = (monthKey) => {
        const params = new URLSearchParams(location.search);
        if (monthKey) params.set('month', monthKey);
        else params.delete('month');
        navigate(`/events?${params.toString()}`, { replace: false });
    };

    const applyDistanceFilter = (distKey) => {
        const params = new URLSearchParams(location.search);
        if (distKey) params.set('distance', distKey);
        else params.delete('distance');
        navigate(`/events?${params.toString()}`, { replace: false });
    };

    const applyStateFilter = (st) => {
        const params = new URLSearchParams(location.search);
        if (st) params.set('state', st);
        else params.delete('state');
        navigate(`/events?${params.toString()}`, { replace: false });
    };

    const applyRaceTypeFilter = (rt) => {
        const params = new URLSearchParams(location.search);
        if (rt) params.set('race_type', rt);
        else params.delete('race_type');
        navigate(`/events?${params.toString()}`, { replace: false });
    };

    useEffect(() => {
        fetchEvents();
    }, [search, status, stateFilter, raceTypeFilter]);

    const fetchEvents = () => {
        setLoading(true);
        let url = `/events?limit=200`;
        if (status !== 'All') url += `&status=${status}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (stateFilter) url += `&state=${encodeURIComponent(stateFilter)}`;
        if (raceTypeFilter) url += `&race_type=${encodeURIComponent(raceTypeFilter)}`;

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

    const distanceFiltered = distanceFilter
        ? events.filter(e => eventHasDistance(e, distanceFilter))
        : events;
    const allGroupedEvents = groupEventsByMonth(distanceFiltered);
    // If a month filter is set, only show that month's group
    const groupedEvents = monthFilter
        ? allGroupedEvents.filter(g => {
            const key = `${g.date.getFullYear()}-${String(g.date.getMonth() + 1).padStart(2, '0')}`;
            return key === monthFilter;
        })
        : allGroupedEvents;

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
                    RACE <span className="text-gradient pr-2">CALENDAR</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-slate-400 font-medium"
                >
                    Larian akan datang & recap event lepas — cari, lari, dapat semula gambar.
                </motion.p>
            </header>

            {/* Stats hero banner */}
            {stats && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3"
                >
                    {[
                        { label: 'Race Akan Datang', value: stats.upcoming },
                        { label: 'Fotografer', value: stats.photographers },
                        { label: 'Race Habis (Recap)', value: stats.past },
                        { label: 'Gambar Indexed', value: stats.photos >= 1000 ? `${(stats.photos/1000).toFixed(1).replace('.0','')}K` : stats.photos },
                    ].map((s, i) => (
                        <div key={i} className="glass-card p-4 text-center">
                            <div className="text-3xl md:text-4xl font-black text-gradient">{s.value}</div>
                            <div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wider mt-1 font-bold">{s.label}</div>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Premium Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-2 md:p-3 flex flex-col md:flex-row gap-3 items-center"
            >
                <div className="relative flex-grow w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        className="w-full pl-12 pr-4 py-3 bg-ohmai-charcoal-light border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium placeholder:text-slate-500 text-white"
                        placeholder="Cari nama event atau organizer"
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
                            <option value="Recent">Recent</option>
                            <option value="Past">Past Results</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </motion.div>

            {/* Distance Filter Chips */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap items-center gap-2"
            >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mr-1">
                    <Footprints className="w-3.5 h-3.5" />
                    Jarak
                </div>
                {DISTANCE_OPTIONS.map(opt => {
                    const isActive = distanceFilter === opt.key;
                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => applyDistanceFilter(isActive ? '' : opt.key)}
                            className={`px-4 py-2 min-h-[40px] rounded-full text-sm font-bold transition-all active:scale-95 ${
                                isActive
                                    ? 'bg-primary text-ohmai-charcoal shadow-lg shadow-primary/30'
                                    : 'bg-white/5 text-slate-300 hover:bg-primary/20 hover:text-primary border border-white/5'
                            }`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
                {distanceFilter && (
                    <button
                        type="button"
                        onClick={() => applyDistanceFilter('')}
                        className="flex items-center gap-1 px-3 py-2 min-h-[36px] rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors active:scale-95"
                    >
                        <X className="w-3.5 h-3.5" />
                        Reset
                    </button>
                )}
            </motion.div>

            {/* Race Type Filter Chips */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.27 }}
                className="flex flex-wrap items-center gap-2"
            >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mr-1">
                    <Mountain className="w-3.5 h-3.5" />
                    Jenis
                </div>
                {RACE_TYPE_OPTIONS.map(opt => {
                    const isActive = raceTypeFilter === opt.key;
                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => applyRaceTypeFilter(isActive ? '' : opt.key)}
                            className={`px-4 py-2 min-h-[40px] rounded-full text-sm font-bold transition-all active:scale-95 ${
                                isActive
                                    ? 'bg-primary text-ohmai-charcoal shadow-lg shadow-primary/30'
                                    : 'bg-white/5 text-slate-300 hover:bg-primary/20 hover:text-primary border border-white/5'
                            }`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
                {raceTypeFilter && (
                    <button
                        type="button"
                        onClick={() => applyRaceTypeFilter('')}
                        className="flex items-center gap-1 px-3 py-2 min-h-[36px] rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors active:scale-95"
                    >
                        <X className="w-3.5 h-3.5" />
                        Reset
                    </button>
                )}
            </motion.div>

            {/* State Filter Chips (only show if backend has any) */}
            {availableStates.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap items-center gap-2"
                >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mr-1">
                        <MapPin className="w-3.5 h-3.5" />
                        Negeri
                    </div>
                    {availableStates.map(st => {
                        const isActive = stateFilter === st;
                        return (
                            <button
                                key={st}
                                type="button"
                                onClick={() => applyStateFilter(isActive ? '' : st)}
                                className={`px-4 py-2 min-h-[40px] rounded-full text-sm font-bold transition-all active:scale-95 ${
                                    isActive
                                        ? 'bg-primary text-ohmai-charcoal shadow-lg shadow-primary/30'
                                        : 'bg-white/5 text-slate-300 hover:bg-primary/20 hover:text-primary border border-white/5'
                                }`}
                            >
                                {st}
                            </button>
                        );
                    })}
                    {stateFilter && (
                        <button
                            type="button"
                            onClick={() => applyStateFilter('')}
                            className="flex items-center gap-1 px-3 py-2 min-h-[36px] rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors active:scale-95"
                        >
                            <X className="w-3.5 h-3.5" />
                            Reset
                        </button>
                    )}
                </motion.div>
            )}

            {/* Month Filter Chips — quick jump to any month */}
            {allGroupedEvents.length > 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.33 }}
                    className="flex flex-wrap items-center gap-2"
                >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mr-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Bulan
                    </div>
                    {allGroupedEvents.map(group => {
                        const key = `${group.date.getFullYear()}-${String(group.date.getMonth() + 1).padStart(2, '0')}`;
                        const isActive = monthFilter === key;
                        const shortLabel = group.date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => applyMonthFilter(isActive ? '' : key)}
                                title={isActive ? 'Tunjuk semua bulan' : `Tapis ${group.monthName} sahaja`}
                                className={`px-4 py-2 min-h-[40px] rounded-full text-sm font-bold transition-all active:scale-95 ${
                                    isActive
                                        ? 'bg-primary text-ohmai-charcoal shadow-lg shadow-primary/30'
                                        : 'bg-white/5 text-slate-300 hover:bg-primary/20 hover:text-primary border border-white/5'
                                }`}
                            >
                                {shortLabel}
                            </button>
                        );
                    })}
                    {monthFilter && (
                        <button
                            type="button"
                            onClick={() => applyMonthFilter('')}
                            className="flex items-center gap-1 px-3 py-2 min-h-[36px] rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors active:scale-95"
                        >
                            <X className="w-3.5 h-3.5" />
                            Reset
                        </button>
                    )}
                </motion.div>
            )}

            {/* Active Month Filter Banner */}
            <AnimatePresence>
                {monthFilter && !loading && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20"
                    >
                        <div className="flex items-center gap-2 text-sm font-bold text-primary">
                            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                            <span>
                                Menunjukkan acara untuk{' '}
                                {(() => {
                                    const [y, m] = monthFilter.split('-');
                                    const d = new Date(Number(y), Number(m) - 1, 1);
                                    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                })()}{' '}
                                sahaja
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => applyMonthFilter('')}
                            className="flex items-center justify-center gap-1 text-xs font-bold text-primary hover:text-white px-3 py-2 min-h-[36px] rounded-lg bg-white/5 hover:bg-primary/20 transition-colors active:scale-95 self-start sm:self-auto"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                    {(() => {
                                        const groupKey = `${group.date.getFullYear()}-${String(group.date.getMonth() + 1).padStart(2, '0')}`;
                                        const isActive = monthFilter === groupKey;
                                        return (
                                            <button
                                                type="button"
                                                onClick={() => applyMonthFilter(isActive ? '' : groupKey)}
                                                title={isActive ? 'Tunjuk semua bulan' : `Tapis ${group.monthName} sahaja`}
                                                className={`text-sm font-bold px-4 py-2 min-h-[40px] rounded-full transition-all cursor-pointer active:scale-95 ${
                                                    isActive
                                                        ? 'bg-primary text-ohmai-charcoal shadow-lg shadow-primary/30'
                                                        : 'text-slate-500 bg-white/5 hover:bg-primary/20 hover:text-primary'
                                                }`}
                                            >
                                                {group.events.length} {group.events.length === 1 ? 'event' : 'events'}
                                            </button>
                                        );
                                    })()}
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
