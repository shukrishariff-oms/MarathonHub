import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Upload, Link as LinkIcon, CheckCircle, Trophy, Camera, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

const fileBaseUrl = () => (api.defaults?.baseURL || '').replace(/\/api\/?$/, '');

export default function Submit() {
    const [tab, setTab] = useState('url'); // 'url' | 'screenshot'
    const [form, setForm] = useState({
        name: '', email: '', strava_url: '',
        instagram_handle: '', strava_handle: '',
        suggested_event_id: '',
    });
    const [screenshotFile, setScreenshotFile] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState(null);
    const [screenshotPath, setScreenshotPath] = useState(null);
    const [events, setEvents] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(null); // { id, runner, type }
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get('/events?limit=100&status=All').then(r => setEvents(r.data || [])).catch(() => {});
    }, []);

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const onFileChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setScreenshotFile(f);
        setScreenshotPreview(URL.createObjectURL(f));
        setScreenshotPath(null);
    };

    const uploadScreenshot = async () => {
        if (!screenshotFile) return null;
        const fd = new FormData();
        fd.append('file', screenshotFile);
        const res = await api.post('/submissions/upload', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data.path;
    };

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            let payload = { ...form };
            if (tab === 'screenshot') {
                const path = screenshotPath || await uploadScreenshot();
                if (!path) throw new Error('Screenshot upload failed.');
                payload.screenshot_path = path;
                payload.strava_url = null;
            } else {
                payload.strava_url = form.strava_url;
                payload.screenshot_path = null;
            }
            if (payload.suggested_event_id) {
                payload.suggested_event_id = Number(payload.suggested_event_id);
            } else {
                delete payload.suggested_event_id;
            }
            const res = await api.post('/submissions', payload);
            setSubmitted(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Submission failed.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#0B0F1A] text-white pt-28 pb-20 px-4">
                <div className="max-w-xl mx-auto">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center"
                    >
                        <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Submission received!</h2>
                        <p className="text-slate-300 mb-1">
                            Hey <span className="font-bold text-white">{submitted.runner?.name}</span>, your activity is in the queue.
                        </p>
                        <p className="text-slate-400 text-sm mb-6">
                            We'll verify and notify you by email. Check the leaderboard in a bit to see where you rank.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <RouterLink
                                to="/leaderboard"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-bold"
                            >
                                <Trophy size={16} /> View leaderboard
                            </RouterLink>
                            <button
                                onClick={() => {
                                    setSubmitted(null);
                                    setForm({ name: '', email: '', strava_url: '', instagram_handle: '', strava_handle: '', suggested_event_id: '' });
                                    setScreenshotFile(null); setScreenshotPreview(null); setScreenshotPath(null);
                                }}
                                className="px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded-lg text-sm"
                            >
                                Submit another
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0F1A] text-white pt-28 pb-20 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/15 border border-cyan-500/30 rounded-full text-xs font-bold uppercase tracking-wider text-cyan-300 mb-4">
                        <Trophy size={12} /> Run. Submit. Win.
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">
                        Submit your run
                    </h1>
                    <p className="text-slate-400 max-w-lg mx-auto">
                        Paste your Strava link or upload a screenshot. Verified runners get a promo code for ohmaishoot.com race photos.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center bg-slate-900/50 border border-slate-800 rounded-xl p-1 mb-6 max-w-md mx-auto">
                    <button
                        onClick={() => setTab('url')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition ${
                            tab === 'url' ? 'bg-cyan-500 text-slate-900' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <LinkIcon size={14} /> Strava URL
                    </button>
                    <button
                        onClick={() => setTab('screenshot')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition ${
                            tab === 'screenshot' ? 'bg-cyan-500 text-slate-900' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Camera size={14} /> Screenshot
                    </button>
                </div>

                <form onSubmit={submit} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
                    {/* Evidence */}
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
                            {tab === 'url' ? 'Strava activity URL' : 'Activity screenshot'}
                        </label>
                        {tab === 'url' ? (
                            <input
                                type="url"
                                required
                                value={form.strava_url}
                                onChange={e => update('strava_url', e.target.value)}
                                placeholder="https://www.strava.com/activities/1234567890"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                            />
                        ) : (
                            <div>
                                <label className="block cursor-pointer">
                                    <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                                    <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-lg p-8 text-center transition">
                                        {screenshotPreview ? (
                                            <div className="space-y-3">
                                                <img src={screenshotPreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                                                <div className="text-xs text-slate-400">Click to change</div>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                                                <div className="text-sm text-slate-300">Click to upload</div>
                                                <div className="text-xs text-slate-500 mt-1">PNG, JPG, WebP</div>
                                            </>
                                        )}
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Identity */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Full name</span>
                            <input
                                type="text" required value={form.name}
                                onChange={e => update('name', e.target.value)}
                                placeholder="Ahmad Kamal"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                            />
                        </label>
                        <label className="block">
                            <span className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Email</span>
                            <input
                                type="email" required value={form.email}
                                onChange={e => update('email', e.target.value)}
                                placeholder="[email protected]"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                            />
                        </label>
                    </div>

                    {/* Optional */}
                    <details className="text-sm">
                        <summary className="text-slate-400 cursor-pointer hover:text-slate-300">Optional — handle & event</summary>
                        <div className="grid sm:grid-cols-2 gap-4 mt-4">
                            <label className="block">
                                <span className="block text-xs text-slate-500 mb-1.5">Instagram (optional)</span>
                                <input
                                    type="text" value={form.instagram_handle}
                                    onChange={e => update('instagram_handle', e.target.value)}
                                    placeholder="@yourhandle"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                                />
                            </label>
                            <label className="block">
                                <span className="block text-xs text-slate-500 mb-1.5">Strava handle (optional)</span>
                                <input
                                    type="text" value={form.strava_handle}
                                    onChange={e => update('strava_handle', e.target.value)}
                                    placeholder="ahmad_k"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                                />
                            </label>
                            <label className="block sm:col-span-2">
                                <span className="block text-xs text-slate-500 mb-1.5">Event (if known — admin still verifies)</span>
                                <select
                                    value={form.suggested_event_id}
                                    onChange={e => update('suggested_event_id', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="">— Not sure / not listed —</option>
                                    {events.map(ev => (
                                        <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })})</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </details>

                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-sm text-rose-300">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit" disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-slate-900 rounded-lg font-bold text-base"
                    >
                        {submitting ? 'Submitting…' : <>Submit for review <ArrowRight size={16} /></>}
                    </button>

                    <p className="text-xs text-slate-500 text-center">
                        We verify each submission manually — usually within 24h.
                    </p>
                </form>
            </div>
        </div>
    );
}
