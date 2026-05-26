import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../api';
import ImageUpload from '../../components/ImageUpload';
import { safeParse } from '../../utils/safeJson';

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
        is_highlight: false,
        cover_image_url: '',
        highlight_images_json: '[]',
        // Race calendar
        state: '',
        race_type: '',
        start_time: '',
        registration_url: '',
        registration_close_at: '',
        fee_min: '',
        fee_max: '',
        categories_json: '[]',
        bib_pickup_info: '',
        gpx_url: '',
        organizer_url: '',
        participant_count: '',
        weather_temp_c: '',
        winners_json: '[]',
        recap_summary: '',
    });
    const [distancesInput, setDistancesInput] = useState('');
    const [highlightImagesInput, setHighlightImagesInput] = useState('');
    const [categoriesInput, setCategoriesInput] = useState(''); // "FM 42K|95|open\nHM 21K|75|filling"
    const [winnersInput, setWinnersInput] = useState(''); // "FM|Hadi Rosli|2:21:18\nHM|..."

    useEffect(() => {
        if (isEditing) {
            api.get(`/events/${id}`)
                .then(res => {
                    const data = res.data;
                    // Format date for input datetime-local if used (must be YYYY-MM-DDTHH:MM)
                    // But simply using the standard API response which is ISO
                    // Let's assume date comes as ISO string
                    setFormData({
                        ...data,
                        date: data.date ? (() => {
                            // Ensure UTC interpretation
                            const dateStr = data.date.endsWith('Z') ? data.date : data.date + 'Z';
                            const d = new Date(dateStr);
                            // Shift by timezone offset to get "Local Wall Time" in UTC components
                            // So that toISOString() outputs the local time string
                            const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                            return localIso;
                        })() : ''
                    });

                    setDistancesInput(safeParse(data.distances_json).join(', '));

                    const images = safeParse(data.highlight_images_json);
                    setHighlightImagesInput(images.join('\n'));

                    // Parse categories: [{label, fee, slots_state}] → "FM 42K|95|open"
                    const cats = safeParse(data.categories_json);
                    if (Array.isArray(cats) && cats.length) {
                        setCategoriesInput(cats.map(c =>
                            `${c.label || ''}|${c.fee || ''}|${c.slots_state || 'open'}`
                        ).join('\n'));
                    }
                    // Parse winners: [{category, name, time}] → "FM|Hadi Rosli|2:21:18"
                    const wins = safeParse(data.winners_json);
                    if (Array.isArray(wins) && wins.length) {
                        setWinnersInput(wins.map(w =>
                            `${w.category || ''}|${w.name || ''}|${w.time || ''}`
                        ).join('\n'));
                    }
                })
                .catch(err => console.error(err));
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

            // Parse categories input: "FM 42K|95|open" → {label, fee, slots_state}
            const categoriesArray = categoriesInput.split('\n')
                .map(s => s.trim())
                .filter(Boolean)
                .map(line => {
                    const [label, fee, slots_state] = line.split('|').map(x => (x || '').trim());
                    return {
                        label: label || '',
                        fee: fee ? parseInt(fee, 10) : null,
                        slots_state: slots_state || 'open',
                    };
                })
                .filter(c => c.label);

            // Parse winners: "FM|Hadi Rosli|2:21:18" → {category, name, time}
            const winnersArray = winnersInput.split('\n')
                .map(s => s.trim())
                .filter(Boolean)
                .map(line => {
                    const [category, name, time] = line.split('|').map(x => (x || '').trim());
                    return { category, name, time };
                })
                .filter(w => w.name);

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
                highlight_images_json: JSON.stringify(highlightImagesArray),
                categories_json: JSON.stringify(categoriesArray),
                winners_json: JSON.stringify(winnersArray),
                // Convert empty-string numerics to null so backend doesn't choke
                fee_min: formData.fee_min === '' ? null : parseInt(formData.fee_min, 10),
                fee_max: formData.fee_max === '' ? null : parseInt(formData.fee_max, 10),
                participant_count: formData.participant_count === '' ? null : parseInt(formData.participant_count, 10),
                weather_temp_c: formData.weather_temp_c === '' ? null : parseInt(formData.weather_temp_c, 10),
                registration_close_at: formData.registration_close_at
                    ? new Date(formData.registration_close_at).toISOString()
                    : null,
                // Empty strings → null for optional URL/text fields
                state: formData.state || null,
                race_type: formData.race_type || null,
                start_time: formData.start_time || null,
                registration_url: formData.registration_url || null,
                bib_pickup_info: formData.bib_pickup_info || null,
                gpx_url: formData.gpx_url || null,
                organizer_url: formData.organizer_url || null,
                recap_summary: formData.recap_summary || null,
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

                {/* ── Race Calendar fields ─────────────────────────────── */}
                <div className="pt-4 border-t border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">🏃 Race Calendar Info</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300">Negeri</label>
                            <select name="state" value={formData.state || ''} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3">
                                <option value="" className="bg-slate-900">— Pilih —</option>
                                <option value="Selangor" className="bg-slate-900">Selangor</option>
                                <option value="KL" className="bg-slate-900">Kuala Lumpur</option>
                                <option value="Penang" className="bg-slate-900">Penang</option>
                                <option value="Johor" className="bg-slate-900">Johor</option>
                                <option value="Sabah" className="bg-slate-900">Sabah</option>
                                <option value="Sarawak" className="bg-slate-900">Sarawak</option>
                                <option value="Perak" className="bg-slate-900">Perak</option>
                                <option value="Pahang" className="bg-slate-900">Pahang</option>
                                <option value="Negeri Sembilan" className="bg-slate-900">Negeri Sembilan</option>
                                <option value="Melaka" className="bg-slate-900">Melaka</option>
                                <option value="Kedah" className="bg-slate-900">Kedah</option>
                                <option value="Perlis" className="bg-slate-900">Perlis</option>
                                <option value="Kelantan" className="bg-slate-900">Kelantan</option>
                                <option value="Terengganu" className="bg-slate-900">Terengganu</option>
                                <option value="Putrajaya" className="bg-slate-900">Putrajaya</option>
                                <option value="Labuan" className="bg-slate-900">Labuan</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300">Jenis</label>
                            <select name="race_type" value={formData.race_type || ''} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3">
                                <option value="" className="bg-slate-900">— Pilih —</option>
                                <option value="road" className="bg-slate-900">Road</option>
                                <option value="trail" className="bg-slate-900">Trail</option>
                                <option value="fun_run" className="bg-slate-900">Fun Run</option>
                                <option value="ultra" className="bg-slate-900">Ultra</option>
                                <option value="virtual" className="bg-slate-900">Virtual</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300">Masa Mula (display)</label>
                            <input type="text" name="start_time" value={formData.start_time || ''} onChange={handleChange} placeholder="5:30 AM" className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300">Yuran Min (RM)</label>
                            <input type="number" name="fee_min" value={formData.fee_min || ''} onChange={handleChange} placeholder="35" className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300">Yuran Max (RM)</label>
                            <input type="number" name="fee_max" value={formData.fee_max || ''} onChange={handleChange} placeholder="95" className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300">Reg. Tutup</label>
                            <input type="datetime-local" name="registration_close_at" value={formData.registration_close_at || ''} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3 [color-scheme:dark]" />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-300">Link Pendaftaran</label>
                        <input type="url" name="registration_url" value={formData.registration_url || ''} onChange={handleChange} placeholder="https://..." className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-300">Kategori (satu baris satu, format: <code className="text-primary">Label|Yuran|Status</code>)</label>
                        <textarea
                            value={categoriesInput}
                            onChange={(e) => setCategoriesInput(e.target.value)}
                            rows={4}
                            placeholder={"FM 42K|95|open\nHM 21K|75|filling\n10K|50|open\n5K|35|full"}
                            className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3 font-mono text-xs"
                        />
                        <p className="mt-1 text-xs text-slate-400">Status: open / early_bird / filling / full</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300">Link Organizer</label>
                            <input type="url" name="organizer_url" value={formData.organizer_url || ''} onChange={handleChange} placeholder="https://..." className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300">GPX Route URL</label>
                            <input type="url" name="gpx_url" value={formData.gpx_url || ''} onChange={handleChange} placeholder="https://..." className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-300">Bib Pickup Info</label>
                        <textarea
                            name="bib_pickup_info"
                            value={formData.bib_pickup_info || ''}
                            onChange={handleChange}
                            rows={2}
                            placeholder="5–6 Jun 2026, PICC Putrajaya, 9 AM – 8 PM"
                            className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3"
                        />
                    </div>
                </div>

                {/* ── Recap fields (auto-shown when event lepas) ─────── */}
                <div className="pt-4 border-t border-white/10">
                    <h3 className="text-lg font-bold text-white mb-1">🏆 Recap Info</h3>
                    <p className="text-xs text-slate-400 mb-4">Isi lepas event habis. Auto-tunjuk kat page event bila tarikh lepas.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300">Bilangan Peserta</label>
                            <input type="number" name="participant_count" value={formData.participant_count || ''} onChange={handleChange} placeholder="32400" className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300">Cuaca (°C)</label>
                            <input type="number" name="weather_temp_c" value={formData.weather_temp_c || ''} onChange={handleChange} placeholder="28" className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-300">Pemenang (satu baris satu, format: <code className="text-primary">Kategori|Nama|Masa</code>)</label>
                        <textarea
                            value={winnersInput}
                            onChange={(e) => setWinnersInput(e.target.value)}
                            rows={4}
                            placeholder={"FM Lelaki|Hadi Rosli|2:21:18\nFM Wanita|Faridatul Akma|2:48:30\nHM Lelaki|...|"}
                            className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3 font-mono text-xs"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-300">Recap Summary</label>
                        <textarea
                            name="recap_summary"
                            value={formData.recap_summary || ''}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Ceritakan sikit tentang event ni — cuaca, highlights, anything memorable..."
                            className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3"
                        />
                    </div>
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
