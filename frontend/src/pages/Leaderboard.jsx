import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Mountain, Search, Filter, Activity } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import api from '../api';

const CATEGORIES = [
    { key: 'OVERALL', label: 'Overall', icon: Trophy },
    { key: '5K', label: '5K', icon: Activity },
    { key: '10K', label: '10K', icon: Activity },
    { key: 'HM', label: 'Half Marathon', icon: Activity },
    { key: 'FM', label: 'Full Marathon', icon: Activity },
    { key: 'ELEVATION', label: 'Most Elevation', icon: Mountain },
];

const fmtTime = (sec) => {
    if (!sec) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
};

const fmtPace = (sec, km) => {
    if (!sec || !km) return '—';
    return `${((sec / 60) / km).toFixed(2)} min/km`;
};

const rankIcon = (rank) => {
    if (rank === 1) return <Trophy size={16} className="text-amber-400" />;
    if (rank === 2) return <Medal size={16} className="text-slate-300" />;
    if (rank === 3) return <Award size={16} className="text-amber-700" />;
    return <span className="text-slate-500 text-xs font-mono">{rank}</span>;
};

const rankBg = (rank) => {
    if (rank === 1) return 'bg-amber-500/10 border-amber-500/30';
    if (rank === 2) return 'bg-slate-400/5 border-slate-400/20';
    if (rank === 3) return 'bg-amber-700/10 border-amber-700/30';
    return 'bg-slate-900/30 border-slate-800';
};

export default function Leaderboard() {
    const [category, setCategory] = useState('OVERALL');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get(`/leaderboard?category=${category}&limit=50`)
            .then(res => { setData(res.data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
    }, [category]);

    return (
        <div className="min-h-screen bg-[#0B0F1A] text-white pt-28 pb-20 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-wider text-amber-300 mb-4">
                        <Trophy size={12} /> Top runners
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">Leaderboard</h1>
                    <p className="text-slate-400 max-w-lg mx-auto">
                        Verified runners ranked by pace & elevation. Submit your run to claim your spot.
                    </p>
                </div>

                {/* Category tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
                    {CATEGORIES.map(c => {
                        const Icon = c.icon;
                        const active = category === c.key;
                        return (
                            <button
                                key={c.key}
                                onClick={() => setCategory(c.key)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${
                                    active
                                        ? 'bg-cyan-500 text-slate-900'
                                        : 'bg-slate-900/50 text-slate-300 border border-slate-800 hover:bg-slate-800'
                                }`}
                            >
                                <Icon size={14} /> {c.label}
                            </button>
                        );
                    })}
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-500">Loading…</div>
                ) : !data || data.entries.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-2xl">
                        <Trophy size={32} className="mx-auto text-slate-700 mb-3" />
                        <div className="text-slate-300 font-bold mb-1">No runners yet</div>
                        <div className="text-sm text-slate-500 mb-6">Be the first to claim a spot on this board.</div>
                        <RouterLink
                            to="/submit"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-bold text-sm"
                        >
                            Submit your run
                        </RouterLink>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-xs text-slate-500 px-2 mb-2">
                            {data.total_entries} {data.total_entries === 1 ? 'runner' : 'runners'}
                            {data.event_name && <span> · {data.event_name}</span>}
                        </div>
                        {data.entries.map(e => (
                            <div
                                key={e.submission_id}
                                className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-xl ${rankBg(e.rank)}`}
                            >
                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                                    {rankIcon(e.rank)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold truncate">{e.runner_name}</div>
                                    <div className="text-xs text-slate-400 truncate">
                                        {e.event_name && <span>{e.event_name} · </span>}
                                        {category === 'ELEVATION' ? `${e.elevation_gain_m}m elevation` : `${e.distance_km}km · ${fmtTime(e.time_seconds)}`}
                                    </div>
                                </div>
                                <div className="text-right">
                                    {category === 'ELEVATION' ? (
                                        <div className="text-amber-400 font-bold">{e.elevation_gain_m}m</div>
                                    ) : (
                                        <>
                                            <div className="text-cyan-400 font-bold">{fmtPace(e.time_seconds, e.distance_km)}</div>
                                            <div className="text-xs text-slate-500">{fmtTime(e.time_seconds)}</div>
                                        </>
                                    )}
                                </div>
                                {e.promo_code && (
                                    <div className="hidden sm:block">
                                        <div className="px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded text-xs font-mono text-emerald-300">
                                            {e.promo_code}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {!loading && data && data.entries.length > 0 && (
                    <div className="text-center mt-10">
                        <RouterLink
                            to="/submit"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-sm border border-slate-700"
                        >
                            Join the board
                        </RouterLink>
                    </div>
                )}
            </div>
        </div>
    );
}
