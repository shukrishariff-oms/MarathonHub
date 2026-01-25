import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Trash, ExternalLink, ArrowLeft, Star } from 'lucide-react';
import api from '../../api';

export default function AdminAssignments() {
    const { eventId } = useParams();
    const [event, setEvent] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [photographers, setPhotographers] = useState([]);
    const [loading, setLoading] = useState(true);

    // New Assignment Form State
    const [newPhotographerId, setNewPhotographerId] = useState('');
    const [newGalleryUrl, setNewGalleryUrl] = useState('');
    const [newKmCoverage, setNewKmCoverage] = useState(''); // Comma separated
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        // Fetch Event, Assignments, and All Photographers
        const fetchData = async () => {
            try {
                const [eventRes, photogRes] = await Promise.all([
                    api.get(`/events/${eventId}`),
                    api.get('/photographers?limit=1000') // get all for dropdown
                ]);
                setEvent(eventRes.data);
                // Sort assignments: Pinned first, then by ID (or whatever default)
                const sortedAssignments = (eventRes.data.assignments || []).sort((a, b) => {
                    if (a.is_pinned === b.is_pinned) return 0;
                    return a.is_pinned ? -1 : 1;
                });
                setAssignments(sortedAssignments);
                setPhotographers(photogRes.data);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch data", error);
                setLoading(false);
            }
        };
        fetchData();
    }, [eventId]);

    const handleAddAssignment = async (e) => {
        e.preventDefault();
        if (!newPhotographerId || !newGalleryUrl) return alert("Photographer and Gallery URL are required");

        const kmList = newKmCoverage.split(',').map(s => s.trim()).filter(Boolean);

        // Check if photographer already assigned?
        // Backend allows multiples? Schema doesn't enforce uniqueness on (event, photographer) pair but maybe UI should warn.
        // For now allow it.

        const payload = {
            event_id: parseInt(eventId),
            photographer_id: parseInt(newPhotographerId),
            gallery_url: newGalleryUrl,
            km_coverage_json: JSON.stringify(kmList),
            note: newNote
        };

        try {
            const res = await api.post('/admin/assignments', payload);
            // Refresh assignments list.
            // The list returned in 'event' might need refetching, or we just append
            // But the response `res` is just the assignment object.
            // It DOES NOT have the nested `photographer` object fully populated depending on the return schema.
            // My schemas.Assignment response DOES NOT have nested photographer.
            // So I need to find the photographer object from my list and merge it for display, or reload the page.
            // Reload is easier.
            window.location.reload();
        } catch (error) {
            console.error("Failed to add assignment", error);
            alert("Failed to add assignment");
        }
    };

    const handleDelete = async (assignmentId) => {
        if (window.confirm("Remove this assignment?")) {
            try {
                await api.delete(`/admin/assignments/${assignmentId}`);
                setAssignments(assignments.filter(a => a.id !== assignmentId));
            } catch (error) {
                console.error(error);
                alert("Failed to remove assignment");
            }
        }
    };

    const handleTogglePin = async (assignmentId) => {
        try {
            const res = await api.patch(`/admin/assignments/${assignmentId}/toggle-pin`);
            // Update local state
            const updatedAssignments = assignments.map(a =>
                a.id === assignmentId ? { ...a, is_pinned: res.data.is_pinned } : a
            );

            // Re-sort
            updatedAssignments.sort((a, b) => {
                if (a.is_pinned === b.is_pinned) return 0;
                return a.is_pinned ? -1 : 1;
            });

            setAssignments(updatedAssignments);
        } catch (error) {
            console.error("Failed to toggle pin", error);
            alert("Failed to toggle pin");
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!event) return <div>Event not found</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4">
                <Link
                    to="/admin/events"
                    className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-primary transition-colors w-fit"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Events
                </Link>
                <h1 className="text-2xl font-bold text-white mt-2">Manage Assignments: {event.name}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Assignments List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold text-white">Current Assignments</h2>
                    <div className="bg-white/5 shadow-xl overflow-hidden rounded-2xl border border-white/10">
                        <ul className="divide-y divide-white/10">
                            {assignments.map(assign => {
                                // Find photographer name if valid
                                const pName = assign.photographer ? assign.photographer.name : "Unknown Photographer";
                                const pLogo = assign.photographer ? assign.photographer.logo_url : null;

                                return (
                                    <li key={assign.id} className={`p-4 flex justify-between items-start transition-colors ${assign.is_pinned ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-white/5'}`}>
                                        <div className="flex items-start space-x-3">
                                            {pLogo ? <img src={pLogo} className="h-10 w-10 rounded-full border border-white/10 object-cover" alt="" /> : <div className="h-10 w-10 bg-white/10 rounded-full border border-white/10" />}

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold text-white">{pName}</h3>
                                                    {assign.is_pinned && <Star className="w-3 h-3 text-primary fill-primary" />}
                                                </div>
                                                <a href={assign.gallery_url} target="_blank" className="text-xs text-primary hover:underline flex items-center mt-1 break-all gap-1">
                                                    {assign.gallery_url} <ExternalLink className="h-3 w-3 shrink-0" />
                                                </a>
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {JSON.parse(assign.km_coverage_json || '[]').map((km, idx) => (
                                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10">
                                                            {km}
                                                        </span>
                                                    ))}
                                                </div>
                                                {assign.note && <p className="text-xs text-slate-500 mt-1 italic">{assign.note}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleTogglePin(assign.id)}
                                                className={`p-2 rounded-lg transition-colors ${assign.is_pinned ? 'text-primary hover:text-primary/80 bg-primary/10' : 'text-slate-500 hover:text-primary hover:bg-primary/10'}`}
                                                title={assign.is_pinned ? "Unpin photographer" : "Pin to top"}
                                            >
                                                <Star className={`h-4 w-4 ${assign.is_pinned ? 'fill-primary' : ''}`} />
                                            </button>
                                            <button onClick={() => handleDelete(assign.id)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-400/10 rounded-lg transition-colors">
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                            {assignments.length === 0 && <li className="p-8 text-slate-500 text-center text-sm">No photographers assigned yet.</li>}
                        </ul>
                    </div>
                </div>

                {/* Add Form */}
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 h-fit shadow-xl">
                    <h2 className="text-lg font-bold text-white mb-4">Assign Photographer</h2>
                    <form onSubmit={handleAddAssignment} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300">Photographer</label>
                            <select
                                required
                                value={newPhotographerId}
                                onChange={e => setNewPhotographerId(e.target.value)}
                                className="mt-1 block w-full bg-black/20 pl-3 pr-10 py-3 text-base border-white/10 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-xl border text-white"
                            >
                                <option value="" className="bg-slate-900">Select a photographer...</option>
                                {photographers
                                    .filter(p => !assignments.some(a => (a.photographer_id || (a.photographer && a.photographer.id)) === p.id))
                                    .map(p => (
                                        <option key={p.id} value={p.id} className="bg-slate-900">{p.name} {p.brand ? `(${p.brand})` : ''}</option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300">Gallery Link</label>
                            <input
                                required
                                type="url"
                                value={newGalleryUrl}
                                onChange={e => setNewGalleryUrl(e.target.value)}
                                placeholder="https://..."
                                className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3 placeholder-slate-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300">Coverage (comma separated)</label>
                            <input
                                type="text"
                                value={newKmCoverage}
                                onChange={e => setNewKmCoverage(e.target.value)}
                                placeholder="e.g. 5KM, 10KM, Finish"
                                className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3 placeholder-slate-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300">Note (Optional)</label>
                            <input
                                type="text"
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                                className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3"
                            />
                        </div>

                        <button type="submit" className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-bold rounded-xl text-ohmai-charcoal bg-primary hover:bg-primary/90 focus:outline-none transition-colors">
                            Assign
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
