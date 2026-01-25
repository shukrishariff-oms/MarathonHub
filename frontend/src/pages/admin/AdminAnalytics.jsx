import { useState, useEffect } from 'react';
import { ArrowLeft, BarChart, Activity, Users, Camera, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts';

export default function AdminAnalytics() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/analytics')
            .then(res => {
                setStats(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-white p-8">Loading analytics...</div>;
    if (!stats) return <div className="text-white p-8">Failed to load data</div>;

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
                {/* Popular Events */}
                <div className="bg-white/5 border border-white/10 shadow-xl rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Top Trending Events
                    </h2>
                    <div className="space-y-4">
                        {stats.popular_events.map((event, idx) => (
                            <div key={event.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${idx === 0 ? 'bg-primary text-black' : 'bg-white/10 text-slate-400'}`}>
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

                {/* Popular Photographers */}
                <div className="bg-white/5 border border-white/10 shadow-xl rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-primary" />
                        Top Photographers
                    </h2>
                    <div className="space-y-4">
                        {stats.popular_photographers.map((photog, idx) => (
                            <div key={photog.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${idx === 0 ? 'bg-primary text-black' : 'bg-white/10 text-slate-400'}`}>
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
        </div>
    );
}
