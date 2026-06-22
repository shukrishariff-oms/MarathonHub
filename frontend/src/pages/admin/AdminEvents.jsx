import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash, Search, ArrowLeft, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';

const TABS = [
    { key: 'Upcoming', label: 'Upcoming' },
    { key: 'Past', label: 'Past' },
    { key: 'All', label: 'All' },
];

// Canonical venue keywords (cities/states). Matched as substring against
// event.location, so "Putrajaya" tangkap "Dataran Putrajaya" juga.
// Order = display priority for chips.
const VENUE_KEYWORDS = [
    'Kuala Lumpur',
    'Putrajaya',
    'Shah Alam',
    'Cyberjaya',
    'Selangor',
    'Penang',
    'Negeri Sembilan',
    'Cameron Highlands',
    'Pahang',
    'Johor',
    'Melaka',
    'Perak',
    'Kedah',
    'Terengganu',
    'Kelantan',
    'Sabah',
    'Sarawak',
];

const matchesVenue = (event, keyword) => {
    if (!keyword) return true;
    return (event.location || '').toLowerCase().includes(keyword.toLowerCase());
};

export default function AdminEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Upcoming');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVenue, setSelectedVenue] = useState(null); // null = all venues
    const [updating, setUpdating] = useState(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = () => {
        api.get('/events?limit=200&status=All')
            .then(res => {
                setEvents(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this event?")) {
            try {
                await api.delete(`/admin/events/${id}`);
                setEvents(events.filter(e => e.id !== id));
            } catch (error) {
                alert("Failed to delete event");
                console.error(error);
            }
        }
    };

    const toggleHighlight = async (event) => {
        if (updating) return;
        setUpdating(event.id);

        try {
            const newStatus = !event.is_highlight;
            const payload = {
                name: event.name,
                date: event.date,
                location: event.location,
                organizer: event.organizer,
                description: event.description || "",
                distances_json: event.distances_json || "[]",
                status: event.status,
                is_highlight: newStatus,
                cover_image_url: event.cover_image_url,
                highlight_images_json: event.highlight_images_json || "[]"
            };

            await api.put(`/admin/events/${event.id}`, payload);

            setEvents(events.map(e => e.id === event.id ? { ...e, is_highlight: newStatus } : e));
        } catch (error) {
            console.error("Failed to toggle highlight", error);
            const errorMessage = error.response?.data?.detail
                ? (typeof error.response.data.detail === 'string' ? error.response.data.detail : JSON.stringify(error.response.data.detail))
                : "Failed to update highlight status";
            alert(`Error: ${errorMessage}`);
        } finally {
            setUpdating(null);
        }
    };

    // Counts for tab badges (based on event date, not status field)
    const counts = useMemo(() => {
        const now = Date.now();
        let upcoming = 0;
        let past = 0;
        for (const e of events) {
            const ts = new Date(e.date.endsWith('Z') ? e.date : e.date + 'Z').getTime();
            if (ts >= now) upcoming++;
            else past++;
        }
        return { Upcoming: upcoming, Past: past, All: events.length };
    }, [events]);

    // Venue counts (scoped to active tab so chips reflect current view).
    // Only show chips with at least 1 match. "Other" = events that don't
    // match any keyword.
    const venueChips = useMemo(() => {
        const now = Date.now();
        const scoped = events.filter(e => {
            const ts = new Date(e.date.endsWith('Z') ? e.date : e.date + 'Z').getTime();
            if (activeTab === 'Upcoming' && ts < now) return false;
            if (activeTab === 'Past' && ts >= now) return false;
            return true;
        });

        const chips = [];
        let otherCount = 0;
        for (const e of scoped) {
            const matched = VENUE_KEYWORDS.some(k => matchesVenue(e, k));
            if (!matched) otherCount++;
        }
        for (const k of VENUE_KEYWORDS) {
            const c = scoped.filter(e => matchesVenue(e, k)).length;
            if (c > 0) chips.push({ key: k, label: k, count: c });
        }
        if (otherCount > 0) chips.push({ key: '__other__', label: 'Other', count: otherCount });
        return chips;
    }, [events, activeTab]);

    // Filter + sort
    const visibleEvents = useMemo(() => {
        const now = Date.now();
        const q = searchQuery.trim().toLowerCase();

        let list = events.filter(e => {
            const ts = new Date(e.date.endsWith('Z') ? e.date : e.date + 'Z').getTime();
            if (activeTab === 'Upcoming' && ts < now) return false;
            if (activeTab === 'Past' && ts >= now) return false;

            // Venue chip filter
            if (selectedVenue) {
                if (selectedVenue === '__other__') {
                    if (VENUE_KEYWORDS.some(k => matchesVenue(e, k))) return false;
                } else {
                    if (!matchesVenue(e, selectedVenue)) return false;
                }
            }

            if (q) {
                const hay = `${e.name} ${e.location || ''} ${e.organizer || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        list.sort((a, b) => {
            const ta = new Date(a.date.endsWith('Z') ? a.date : a.date + 'Z').getTime();
            const tb = new Date(b.date.endsWith('Z') ? b.date : b.date + 'Z').getTime();
            // Upcoming + All: earliest first; Past: most recent first
            return activeTab === 'Past' ? tb - ta : ta - tb;
        });

        return list;
    }, [events, activeTab, searchQuery, selectedVenue]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <Link
                    to="/admin"
                    className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-primary transition-colors w-fit"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Dashboard
                </Link>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Manage Events</h1>
                        <p className="text-sm text-slate-400 mt-1">
                            {events.filter(e => e.is_highlight).length} event(s) highlighted for carousel
                        </p>
                    </div>
                    <Link
                        to="/admin/events/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-bold text-ohmai-charcoal bg-primary hover:bg-primary/90 transition-all"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Event
                    </Link>
                </div>
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="inline-flex bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
                    {TABS.map(tab => {
                        const active = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${active ? 'bg-primary text-ohmai-charcoal' : 'text-slate-400 hover:text-white'}`}
                            >
                                {tab.label}
                                <span className={`ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] ${active ? 'bg-ohmai-charcoal/20 text-ohmai-charcoal' : 'bg-white/10 text-slate-400'}`}>
                                    {counts[tab.key] ?? 0}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search name, location, organizer..."
                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                </div>
            </div>

            {/* Venue chips */}
            {venueChips.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Venue:</span>
                    <button
                        onClick={() => setSelectedVenue(null)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${selectedVenue === null ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
                    >
                        All
                    </button>
                    {venueChips.map(chip => {
                        const active = selectedVenue === chip.key;
                        return (
                            <button
                                key={chip.key}
                                onClick={() => setSelectedVenue(active ? null : chip.key)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${active ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
                            >
                                {chip.label}
                                <span className={`ml-1.5 ${active ? 'text-primary/70' : 'text-slate-500'}`}>
                                    {chip.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {loading ? (
                <div className="text-white text-center py-12">Loading...</div>
            ) : (
                <div className="bg-white/5 shadow-xl overflow-hidden rounded-2xl border border-white/10">
                    {visibleEvents.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-sm">
                            {searchQuery
                                ? `No events match "${searchQuery}"`
                                : activeTab === 'Upcoming'
                                    ? 'No upcoming events. Add one to get started.'
                                    : 'No past events.'}
                        </div>
                    ) : (
                        <ul className="divide-y divide-white/10">
                            {visibleEvents.map((event) => {
                                const ts = new Date(event.date.endsWith('Z') ? event.date : event.date + 'Z').getTime();
                                const isPast = ts < Date.now();
                                return (
                                    <li key={event.id} className="p-4 hover:bg-white/5 transition-colors flex justify-between items-center">
                                        <div>
                                            <h3 className={`text-lg font-bold ${isPast ? 'text-slate-300' : 'text-white'}`}>{event.name}</h3>
                                            <div className="flex items-center space-x-4 text-sm text-slate-400 mt-1">
                                                <div className="flex items-center gap-1">
                                                    <span>{new Date(event.date.endsWith('Z') ? event.date : event.date + 'Z').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                </div>
                                                <span className={`px-2.5 py-0.5 inline-flex text-[10px] font-bold uppercase tracking-wider rounded-full ${event.status === 'Upcoming' ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/10 text-slate-400 border border-white/10'}`}>
                                                    {event.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-4">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleHighlight(event);
                                                }}
                                                className={`p-2 rounded-lg transition-all ${event.is_highlight ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-slate-600 hover:text-yellow-400 hover:bg-white/5'} ${updating === event.id ? 'opacity-50 cursor-wait scale-90' : ''}`}
                                                title={event.is_highlight ? "Remove from Highlights" : "Add to Highlights"}
                                                disabled={updating === event.id}
                                            >
                                                <Star className={`h-5 w-5 ${event.is_highlight ? 'fill-yellow-400' : ''} ${updating === event.id ? 'animate-pulse' : ''}`} />
                                            </button>
                                            <Link
                                                to={`/admin/events/${event.id}/assignments`}
                                                className="text-sm font-medium text-slate-400 hover:text-primary transition-colors"
                                            >
                                                Assignments
                                            </Link>
                                            <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                                                <Link
                                                    to={`/admin/events/edit/${event.id}`}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(event.id)}
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div >
    );
}
