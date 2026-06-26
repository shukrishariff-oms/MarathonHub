import { useState, useEffect } from 'react';
import { Copy, ExternalLink, Search } from 'lucide-react';
import api from '../../api';

const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const copyText = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        alert('Copied: ' + text);
    } catch (e) {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch {}
        document.body.removeChild(ta);
    }
};

export default function AdminPromoCodes() {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterActive, setFilterActive] = useState('all'); // all|active|inactive

    useEffect(() => { fetchCodes(); }, []);

    const fetchCodes = () => {
        setLoading(true);
        api.get('/admin/promo-codes?limit=500')
            .then(res => { setCodes(res.data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
    };

    const filtered = codes.filter(c => {
        if (filterActive === 'active' && !c.is_active) return false;
        if (filterActive === 'inactive' && c.is_active) return false;
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
            (c.code || '').toLowerCase().includes(q) ||
            (c.runner_name || '').toLowerCase().includes(q) ||
            (c.event_name || '').toLowerCase().includes(q)
        );
    });

    const exportCSV = () => {
        const headers = ['code', 'runner_name', 'event_name', 'discount_pct', 'expires_at', 'used_count', 'max_uses', 'is_active', 'created_at'];
        const rows = filtered.map(c => [
            c.code,
            c.runner_name || '',
            c.event_name || '',
            c.discount_pct,
            c.expires_at,
            c.used_count,
            c.max_uses,
            c.is_active ? 1 : 0,
            c.created_at,
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `promo-codes-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Promo codes</h1>
                    <p className="text-slate-400 text-sm mt-1">Auto-issued codes for verified runners. Share manually for MVP — sync to ohmaishoot.com/shop coming in Phase 4.</p>
                </div>
                <button
                    onClick={exportCSV}
                    disabled={filtered.length === 0}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sm rounded-lg disabled:opacity-50"
                >
                    Export CSV ({filtered.length})
                </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
                <button
                    onClick={() => setFilterActive('all')}
                    className={`px-3 py-1.5 rounded text-sm ${filterActive === 'all' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700'}`}
                >
                    All ({codes.length})
                </button>
                <button
                    onClick={() => setFilterActive('active')}
                    className={`px-3 py-1.5 rounded text-sm ${filterActive === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700'}`}
                >
                    Active ({codes.filter(c => c.is_active).length})
                </button>
                <button
                    onClick={() => setFilterActive('inactive')}
                    className={`px-3 py-1.5 rounded text-sm ${filterActive === 'inactive' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700'}`}
                >
                    Inactive ({codes.filter(c => !c.is_active).length})
                </button>
                <div className="flex-1" />
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search code / runner / event…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading…</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
                    No codes yet. Approve a submission to issue one.
                </div>
            ) : (
                <div className="bg-slate-900/30 rounded-xl border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="text-left px-4 py-3">Code</th>
                                    <th className="text-left px-4 py-3">Runner</th>
                                    <th className="text-left px-4 py-3">Event</th>
                                    <th className="text-left px-4 py-3">Discount</th>
                                    <th className="text-left px-4 py-3">Expires</th>
                                    <th className="text-left px-4 py-3">Uses</th>
                                    <th className="text-left px-4 py-3">Issued</th>
                                    <th className="text-left px-4 py-3">Active</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-800/30">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <code className="font-mono font-bold text-cyan-300">{c.code}</code>
                                                <button
                                                    onClick={() => copyText(c.code)}
                                                    className="p-1 hover:bg-slate-700 rounded text-slate-400"
                                                    title="Copy code"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{c.runner_name || '—'}</td>
                                        <td className="px-4 py-3 text-slate-400">{c.event_name || '—'}</td>
                                        <td className="px-4 py-3">{c.discount_pct}%</td>
                                        <td className="px-4 py-3 text-slate-400">{fmtDate(c.expires_at)}</td>
                                        <td className="px-4 py-3 text-slate-400">{c.used_count} / {c.max_uses}</td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(c.created_at)}</td>
                                        <td className="px-4 py-3">
                                            {c.is_active ? (
                                                <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full" />
                                            ) : (
                                                <span className="inline-block w-2 h-2 bg-rose-400 rounded-full" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
