import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../api';
import ImageUpload from '../../components/ImageUpload';

export default function AdminEventEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        name: '',
        date: '',
        location: '',
        organizer: '',
        description: '',
        distances_json: '[]',
        status: 'Upcoming',
        status: 'Upcoming',
        is_highlight: false,
        cover_image_url: '',
        highlight_images_json: '[]'
    });
    const [distancesInput, setDistancesInput] = useState('');
    const [highlightImagesInput, setHighlightImagesInput] = useState('');

    useEffect(() => {
        if (isEditing) {
            api.get(`/events/${id}`)
                .then(res => {
                    const data = res.data;
                    // Format date for input datetime-local if used (must be YYYY-MM-DDTHH:MM)
                    // But simply using the standard API response which is ISO
                    // Let's assume date comes as ISO string
                        ...data,
                    date: data.date ? (() => {
                        const d = new Date(data.date);
                        const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                        return localIso;
                    })() : ''
                    });

    setDistancesInput(JSON.parse(data.distances_json || '[]').join(', '));

    const images = JSON.parse(data.highlight_images_json || '[]');
    setHighlightImagesInput(images.join('\n'));
})
                .catch (err => console.error(err));
        }
    }, [id, isEditing]);

const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
};

const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting form...');

    let payload = null;

    try {
        const distancesArray = distancesInput.split(',').map(s => s.trim()).filter(Boolean);
        const highlightImagesArray = highlightImagesInput.split('\n').map(s => s.trim()).filter(Boolean);

        console.log('FormData Date:', formData.date);

        // Validate Date
        let isoDate = null;
        if (formData.date) {
            const d = new Date(formData.date);
            if (!isNaN(d.getTime())) {
                isoDate = d.toISOString();
            } else {
                throw new Error("Invalid Date Format");
            }
        } else {
            // Use current date if missing or let backend handle it? 
            // Schema says 'date' is datetime, required in Pydantic? 
            // EventBase: date: datetime. So required.
            throw new Error("Date is required");
        }

        payload = {
            ...formData,
            date: isoDate, // Ensure ISO
            distances_json: JSON.stringify(distancesArray),
            highlight_images_json: JSON.stringify(highlightImagesArray)
        };
        console.log('Payload constructed:', payload);
    } catch (err) {
        console.error('Error constructing payload:', err);
        alert('Error constructing payload. Check date or JSON fields.');
        return;
    }

    try {
        if (isEditing) {
            await api.put(`/admin/events/${id}`, payload);
        } else {
            await api.post('/admin/events', payload);
        }
        alert("Success! Event saved.");
        navigate('/admin/events');
    } catch (error) {
        console.error("Failed to save event", error);
        if (error.response) {
            console.error("Server response:", error.response.data);
            alert("Failed: " + JSON.stringify(error.response.data));
        } else {
            alert("Failed to save event");
        }
    }
};

return (
    <div className="max-w-2xl mx-auto space-y-6">
        <Link
            to="/admin/events"
            className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-primary transition-colors w-fit"
        >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Events
        </Link>
        <h1 className="text-2xl font-bold text-white">{isEditing ? 'Edit Event' : 'Create Event'}</h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 p-6 rounded-2xl shadow-xl border border-white/10 backdrop-blur-sm">
            <div>
                <label className="block text-sm font-bold text-slate-300">Event Name</label>
                <input type="text" name="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3 placeholder-slate-500" />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-bold text-slate-300">Date & Time</label>
                    <input type="datetime-local" name="date" required value={formData.date} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3 [color-scheme:dark]" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full bg-black/20 pl-3 pr-10 py-3 text-base border-white/10 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-xl border text-white">
                        <option value="Upcoming" className="bg-slate-900">Upcoming</option>
                        <option value="Completed" className="bg-slate-900">Completed</option>
                        <option value="Past" className="bg-slate-900">Past</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-300">Location</label>
                <input type="text" name="location" required value={formData.location} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-300">Organizer</label>
                <input type="text" name="organizer" required value={formData.organizer} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-300">Description</label>
                <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
            </div>

            <div>
                <ImageUpload
                    label="Cover Image"
                    value={formData.cover_image_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, cover_image_url: url }))}
                    placeholder="Click to Upload Cover Image"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-300">Distances (comma separated, e.g. 5KM, 10KM, FM)</label>
                <input type="text" value={distancesInput} onChange={(e) => setDistancesInput(e.target.value)} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
            </div>

            <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex items-center space-x-3">
                    <input
                        id="is_highlight"
                        name="is_highlight"
                        type="checkbox"
                        checked={formData.is_highlight}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_highlight: e.target.checked }))}
                        className="h-5 w-5 text-primary border-white/10 rounded focus:ring-primary bg-black/20"
                    />
                    <label htmlFor="is_highlight" className="text-sm font-bold text-slate-300 select-none">
                        Highlight Event (Featured on Homepage)
                    </label>
                </div>

                {formData.is_highlight && (
                    <div>
                        <label className="block text-sm font-bold text-slate-300">Highlight Images (One URL per line)</label>
                        <textarea
                            value={highlightImagesInput}
                            onChange={(e) => setHighlightImagesInput(e.target.value)}
                            rows={4}
                            placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                            className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3 font-mono text-xs"
                        />
                        <p className="mt-1 text-xs text-slate-400">These images will be shown in the hero carousel.</p>
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => navigate('/admin/events')} className="bg-white/5 py-2 px-4 border border-white/10 rounded-xl shadow-sm text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors focus:outline-none">
                    Cancel
                </button>
                <button type="submit" className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-bold rounded-xl text-ohmai-charcoal bg-primary hover:bg-primary/90 focus:outline-none transition-colors">
                    Save
                </button>
            </div>
        </form>
    </div>
);
}
