import { useState, useEffect } from 'react';
import { ArrowLeft, BarChart, Activity, Users, Camera, Calendar, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts';

export default function AdminAnalytics() {
    const [stats, setStats] = useState(null);
    const [rawLogs, setRawLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDebug, setShowDebug] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        Promise.all([
            api.get('/admin/analytics'),
            api.get('/admin/analytics/raw')
        ]).then(([resStats, resRaw]) => {
            setStats(resStats.data);
            setRawLogs(resRaw.data);
            setLoading(false);
        })
            .catch(err => {
                console.error("Analytics load error:", err);
                setError("Failed to load analytics data. Service may be updating.");
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-white/5 border-t-primary rounded-full animate-spin" />
            <p className="text-slate-400 font-bold tracking-wide uppercase italic">Crunching numbers...</p>
        </div>
    );

    if (error || !stats) return (
        <div className="text-center py-32 glass-card border-red-500/20">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <LayoutDashboard className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2">System Update in Progress</h3>
            <p className="text-slate-400 font-medium max-w-md mx-auto mb-6">{error || "Data is currently unavailable."}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-colors">
                Retry Connection
            </button>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4">
                <Link
                    to="/admin"
                    className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-primary transition-colors w-fit"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Dashboard
                </Link>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Analytics</h1>
                        <p className="text-slate-400 mt-1">Real-time traffic overview</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Lifetime Views</p>
                        <p className="text-4xl font-black text-primary">{stats.total_views.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Traffic Chart */}
            <div className="bg-white/5 border border-white/10 shadow-xl rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Traffic History (Last 30 Days)
                </h2>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.daily_visits}>
                            <defs>
                                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis
                                dataKey="date"
                                stroke="#94a3b8"
                                tickFormatter={(str) => {
                                    const d = new Date(str);
                                    return `${d.getDate()}/${d.getMonth() + 1}`;
                                }}
                                style={{ fontSize: 12 }}
                            />
                            <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#eab308' }}
                            />
                            <Area type="monotone" dataKey="count" stroke="#eab308" fillOpacity={1} fill="url(#colorVisits)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* All Events */}
                <div className="bg-white/5 border border-white/10 shadow-xl rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        All Events Traffic
                    </h2>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {stats.popular_events.map((event, idx) => (
                            <div key={event.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${idx < 3 ? 'bg-primary text-black' : 'bg-white/10 text-slate-400'}`}>
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <p className="font-medium text-white line-clamp-1">{event.name}</p>
                                        <Link to={`/events/${event.id}`} target="_blank" className="text-xs text-primary hover:underline">View Page</Link>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-white">{event.views}</p>
                                    <p className="text-xs text-slate-500">views</p>
                                </div>
                            </div>
                        ))}
                        {stats.popular_events.length === 0 && <p className="text-slate-500 text-center py-4">No data yet.</p>}
                    </div>
                </div>

                {/* All Photographers */}
                <div className="bg-white/5 border border-white/10 shadow-xl rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-primary" />
                        All Photographers Traffic
                    </h2>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {stats.popular_photographers.map((photog, idx) => (
                            <div key={photog.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${idx < 3 ? 'bg-primary text-black' : 'bg-white/10 text-slate-400'}`}>
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <p className="font-medium text-white line-clamp-1">{photog.name}</p>
                                        <Link to={`/photographers/${photog.id}`} target="_blank" className="text-xs text-primary hover:underline">View Profile</Link>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-white">{photog.views}</p>
                                    <p className="text-xs text-slate-500">views</p>
                                </div>
                            </div>
                        ))}
                        {stats.popular_photographers.length === 0 && <p className="text-slate-500 text-center py-4">No data yet.</p>}
                    </div>
                </div>
            </div>

            {/* Debug Toggle */}
            <div className="flex justify-center pt-8">
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors"
                >
                    {showDebug ? "Hide System Logs" : "Show System Logs"}
                </button>
            </div>

            {/* Raw Logs for Debugging */}
            {showDebug && (
                <div className="bg-white/5 border border-white/10 shadow-xl rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-slate-400" />
                        System Raw Logs (Debug)
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="text-xs uppercase bg-white/5 text-slate-200">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Time</th>
                                    <th className="px-4 py-3">Path</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3 rounded-tr-lg">ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {rawLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-primary">{log.path}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${log.entity_type === 'event' ? 'bg-blue-500/20 text-blue-400' :
                                                log.entity_type === 'photographer' ? 'bg-purple-500/20 text-purple-400' :
                                                    'bg-slate-700 text-slate-400'
                                                }`}>
                                                {log.entity_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{log.entity_id || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div >
    );
}
