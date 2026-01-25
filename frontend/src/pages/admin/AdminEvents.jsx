import { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Search, ArrowLeft, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function AdminEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = () => {
        api.get('/events?limit=100&status=All')
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

    const [updating, setUpdating] = useState(null); // Track which event is being updated

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

            // Update local state
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

            {loading ? (
                <div className="text-white text-center py-12">Loading...</div>
            ) : (
                <div className="bg-white/5 shadow-xl overflow-hidden rounded-2xl border border-white/10">
                    <ul className="divide-y divide-white/10">
                        {events.map((event) => (
                            <li key={event.id} className="p-4 hover:bg-white/5 transition-colors flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{event.name}</h3>
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
                        ))}
                    </ul>
                </div>
            )}
        </div >
    );
}
