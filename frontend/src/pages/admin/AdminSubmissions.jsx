import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, ExternalLink, Image as ImageIcon, Copy, Filter, Calendar, MapPin, Clock, TrendingUp } from 'lucide-react';
import api from '../../api';

const TABS = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: '', label: 'All' },
];

// Approx. base URL for serving uploaded screenshots.
// api already knows the API host; we just need the public-files host.
const filesBaseUrl = () => {
    const base = api.defaults?.baseURL || '';
    // Strip trailing /api
    return base.replace(/\/api\/?$/, '');
};

const fmtPace = (sec, km) => {
    if (!sec || !km) return '—';
    const m = (sec / 60) / km;
    return `${m.toFixed(2)} min/km`;
};

const fmtTime = (sec) => {
    if (!sec) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
};

const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AdminSubmissions() {
    const [subs, setSubs] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [reviewing, setReviewing] = useState(null);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    useEffect(() => {
        fetchSubmissions();
        fetchEvents();
    }, [activeTab]);

    const fetchSubmissions = () => {
        setLoading(true);
        const params = activeTab ? `?status=${activeTab}&limit=200` : '?limit=200';
        api.get(`/admin/submissions${params}`)
            .then(res => {
                setSubs(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const fetchEvents = () => {
        api.get('/events?limit=200&status=All').then(res => setEvents(res.data || [])).catch(() => {});
    };

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return subs;
        return subs.filter(s =>
            (s.runner?.name || '').toLowerCase().includes(q) ||
            (s.runner?.email || '').toLowerCase().includes(q) ||
            (s.activity_location || '').toLowerCase().includes(q) ||
            (s.event_name || '').toLowerCase().includes(q)
        );
    }, [subs, searchQuery]);

    const openReview = (sub) => setReviewing(sub);
    const closeReview = () => setReviewing(null);

    const onApprove = async (formData) => {
        setApproving(true);
        try {
            const res = await api.post(`/admin/submissions/${reviewing.id}/approve`, formData);
            closeReview();
            fetchSubmissions();
            if (res.data?.promo_code) {
                alert(`✅ Approved + promo code issued: ${res.data.promo_code.code}`);
            } else {
                alert('✅ Approved (no promo issued).');
            }
        } catch (err) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setApproving(false);
        }
    };

    const onReject = async (reason) => {
        if (!window.confirm('Reject this submission?')) return;
        setRejecting(true);
        try {
            await api.post(`/admin/submissions/${reviewing.id}/reject`, { reason });
            closeReview();
            fetchSubmissions();
        } catch (err) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setRejecting(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Submissions</h1>
                    <p className="text-slate-400 text-sm mt-1">Review runner activities → auto-rank + cross-ref event → issue promo</p>
                </div>
                <div className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-full">
                    {subs.length} {activeTab || 'total'}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto">
                {TABS.map(t => (
                    <button
                        key={t.key || 'all'}
                        onClick={() => setActiveTab(t.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                            activeTab === t.key
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
                <div className="flex-1" />
                <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search name / email / event…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                    />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading…</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
                    {activeTab === 'pending' ? '🎉 No pending submissions.' : 'Nothing here.'}
                </div>
            ) : (
                <div className="bg-slate-900/30 rounded-xl border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="text-left px-4 py-3">Runner</th>
                                    <th className="text-left px-4 py-3">Type</th>
                                    <th className="text-left px-4 py-3">Event / Date</th>
                                    <th className="text-left px-4 py-3">Stats</th>
                                    <th className="text-left px-4 py-3">Submitted</th>
                                    <th className="text-left px-4 py-3">Status</th>
                                    <th className="text-right px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filtered.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-800/30">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{s.runner?.name || '—'}</div>
                                            <div className="text-xs text-slate-500">{s.runner?.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {s.submission_type === 'url' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/15 text-blue-300 rounded text-xs">
                                                    <ExternalLink size={10} /> URL
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded text-xs">
                                                    <ImageIcon size={10} /> Screenshot
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {s.event_name ? (
                                                <div className="font-medium">{s.event_name}</div>
                                            ) : (
                                                <div className="text-slate-500 italic">unmapped</div>
                                            )}
                                            {s.activity_date && (
                                                <div className="text-xs text-slate-500">{fmtDate(s.activity_date)}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {s.distance_km ? (
                                                <>
                                                    <div>{s.distance_km}km · {fmtTime(s.time_seconds)}</div>
                                                    <div className="text-slate-500">{fmtPace(s.time_seconds, s.distance_km)}{s.category && ` · ${s.category}`}</div>
                                                </>
                                            ) : (
                                                <span className="text-slate-500">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(s.submitted_at)}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={s.status} />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => openReview(s)}
                                                className="px-3 py-1.5 bg-cyan-500/15 text-cyan-300 rounded text-xs font-medium hover:bg-cyan-500/25"
                                            >
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {reviewing && (
                <ReviewModal
                    sub={reviewing}
                    events={events}
                    onClose={closeReview}
                    onApprove={onApprove}
                    onReject={onReject}
                    approving={approving}
                    rejecting={rejecting}
                />
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        pending: 'bg-amber-500/15 text-amber-300',
        approved: 'bg-emerald-500/15 text-emerald-300',
        rejected: 'bg-rose-500/15 text-rose-300',
    };
    return (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${map[status] || 'bg-slate-700 text-slate-300'}`}>
            {status}
        </span>
    );
}

function ReviewModal({ sub, events, onClose, onApprove, onReject, approving, rejecting }) {
    const [form, setForm] = useState({
        event_id: sub.event_id || '',
        activity_date: sub.activity_date ? new Date(sub.activity_date).toISOString().slice(0, 16) : '',
        activity_location: sub.activity_location || '',
        distance_km: sub.distance_km || '',
        time_seconds: sub.time_seconds || '',
        elevation_gain_m: sub.elevation_gain_m || '',
        admin_notes: sub.admin_notes || '',
        issue_promo: true,
    });
    const [rejectMode, setRejectMode] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [timeStr, setTimeStr] = useState(() => {
        if (sub.time_seconds) {
            const h = Math.floor(sub.time_seconds / 3600);
            const m = Math.floor((sub.time_seconds % 3600) / 60);
            const s = sub.time_seconds % 60;
            return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
        }
        return '';
    });

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submitApprove = () => {
        // Parse time back to seconds
        let timeSec = null;
        if (timeStr) {
            const parts = timeStr.split(':').map(Number);
            if (parts.length === 3) timeSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
            else if (parts.length === 2) timeSec = parts[0] * 60 + parts[1];
        }
        if (!form.activity_date || !form.distance_km || !timeSec) {
            alert('Activity date, distance, and time are required.');
            return;
        }
        onApprove({
            event_id: form.event_id ? Number(form.event_id) : null,
            activity_date: new Date(form.activity_date).toISOString(),
            activity_location: form.activity_location || null,
            distance_km: Number(form.distance_km),
            time_seconds: timeSec,
            elevation_gain_m: form.elevation_gain_m ? Number(form.elevation_gain_m) : 0,
            admin_notes: form.admin_notes || null,
            issue_promo: form.issue_promo,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#0F1626] border border-slate-700 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-lg font-bold">Review submission #{sub.id}</div>
                            <div className="text-sm text-slate-400">
                                {sub.runner?.name} · {sub.runner?.email}
                            </div>
                        </div>
                        <StatusBadge status={sub.status} />
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Evidence */}
                    <div>
                        <div className="text-xs uppercase text-slate-500 mb-2">Evidence</div>
                        {sub.submission_type === 'url' ? (
                            <a
                                href={sub.strava_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 break-all"
                            >
                                <ExternalLink size={14} /> {sub.strava_url}
                            </a>
                        ) : (
                            <a
                                href={`${filesBaseUrl()}${sub.screenshot_path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                            >
                                <img
                                    src={`${filesBaseUrl()}${sub.screenshot_path}`}
                                    alt="Submission screenshot"
                                    className="max-h-72 rounded border border-slate-700"
                                />
                            </a>
                        )}
                    </div>

                    {sub.status === 'pending' && !rejectMode && (
                        <div className="space-y-3">
                            <div className="text-xs uppercase text-slate-500">Verify &amp; key in stats</div>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="block">
                                    <span className="text-xs text-slate-400">MarathonHub event</span>
                                    <select
                                        value={form.event_id}
                                        onChange={e => update('event_id', e.target.value)}
                                        className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
                                    >
                                        <option value="">— Auto-detect / skip —</option>
                                        {events.map(ev => (
                                            <option key={ev.id} value={ev.id}>{ev.name} ({fmtDate(ev.date)})</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="text-xs text-slate-400">Activity date</span>
                                    <input
                                        type="datetime-local"
                                        value={form.activity_date}
                                        onChange={e => update('activity_date', e.target.value)}
                                        className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-slate-400">Location (optional)</span>
                                    <input
                                        type="text"
                                        value={form.activity_location}
                                        onChange={e => update('activity_location', e.target.value)}
                                        placeholder="e.g. Dataran Putrajaya, KL"
                                        className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-slate-400">Distance (km)</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.distance_km}
                                        onChange={e => update('distance_km', e.target.value)}
                                        placeholder="10.2"
                                        className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-slate-400">Time (hh:mm:ss)</span>
                                    <input
                                        type="text"
                                        value={timeStr}
                                        onChange={e => setTimeStr(e.target.value)}
                                        placeholder="0:42:00"
                                        className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-slate-400">Elevation gain (m)</span>
                                    <input
                                        type="number"
                                        value={form.elevation_gain_m}
                                        onChange={e => update('elevation_gain_m', e.target.value)}
                                        placeholder="0"
                                        className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
                                    />
                                </label>
                                <label className="block col-span-2">
                                    <span className="text-xs text-slate-400">Admin notes (optional)</span>
                                    <input
                                        type="text"
                                        value={form.admin_notes}
                                        onChange={e => update('admin_notes', e.target.value)}
                                        className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
                                    />
                                </label>
                                <label className="flex items-center gap-2 col-span-2">
                                    <input
                                        type="checkbox"
                                        checked={form.issue_promo}
                                        onChange={e => update('issue_promo', e.target.checked)}
                                    />
                                    <span className="text-sm">Issue promo code on approval</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {sub.status === 'pending' && rejectMode && (
                        <div className="space-y-2">
                            <div className="text-xs uppercase text-slate-500">Rejection reason (optional)</div>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                rows={3}
                                placeholder="e.g. screenshot illegible, wrong date…"
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                    )}

                    {sub.status !== 'pending' && sub.promo_code && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                            <div className="text-xs text-emerald-300 uppercase tracking-wide">Promo issued</div>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="text-lg font-mono font-bold text-emerald-200">{sub.promo_code.code}</code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(sub.promo_code.code)}
                                    className="p-1.5 hover:bg-emerald-500/20 rounded"
                                    title="Copy code"
                                >
                                    <Copy size={14} />
                                </button>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {sub.promo_code.discount_pct}% off · expires {fmtDate(sub.promo_code.expires_at)}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-700 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                    >
                        Close
                    </button>

                    {sub.status === 'pending' && !rejectMode && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setRejectMode(true)}
                                disabled={rejecting}
                                className="px-4 py-2 bg-rose-500/15 text-rose-300 rounded-lg text-sm font-medium hover:bg-rose-500/25 flex items-center gap-1.5"
                            >
                                <XCircle size={14} /> Reject
                            </button>
                            <button
                                onClick={submitApprove}
                                disabled={approving}
                                className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg text-sm font-medium hover:bg-emerald-500/30 flex items-center gap-1.5"
                            >
                                <CheckCircle size={14} /> {approving ? 'Approving…' : 'Approve'}
                            </button>
                        </div>
                    )}

                    {sub.status === 'pending' && rejectMode && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setRejectMode(false)}
                                className="px-4 py-2 text-sm text-slate-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onReject(rejectReason)}
                                disabled={rejecting}
                                className="px-4 py-2 bg-rose-500/20 text-rose-300 rounded-lg text-sm font-medium hover:bg-rose-500/30"
                            >
                                {rejecting ? 'Rejecting…' : 'Confirm reject'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
