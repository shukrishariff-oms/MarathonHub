import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Camera, LayoutDashboard, Calendar, Activity } from 'lucide-react';
import api from '../../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminEventAnalytics() {
    const { eventId } = useParams();
    const [data, setData] = useState({ hourly_visits: [], photographers: [] });
    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [analyticsRes, eventRes] = await Promise.all([
                    api.get(`/admin/analytics/event/${eventId}`),
                    api.get(`/events/${eventId}`)
                ]);
                setData(analyticsRes.data);
                setEvent(eventRes.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load event data", err);
                setLoading(false);
            }
        };
        fetchData();
    }, [eventId]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-white/5 border-t-primary rounded-full animate-spin" />
            <p className="text-slate-400 font-bold tracking-wide uppercase italic">Loading event data...</p>
        </div>
    );

    if (!event) return <div className="text-white">Event not found</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4">
                <Link
                    to="/admin/analytics"
                    className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-primary transition-colors w-fit"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Analytics
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">{event.name}</h1>
                    <p className="text-slate-400 mt-1">Performance Overview</p>
                </div>
            </div>

            {/* Hourly Traffic Chart */}
            <div className="bg-white/5 border border-white/10 shadow-xl rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Hourly Traffic (Activity by Hour)
                </h2>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.hourly_visits}>
                            <defs>
                                <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis
                                dataKey="date"
                                stroke="#94a3b8"
                                tickFormatter={(str) => {
                                    const d = new Date(str);
                                    return `${d.getHours()}:00`;
                                }}
                                style={{ fontSize: 12 }}
                            />
                            <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#8b5cf6' }}
                                labelFormatter={(str) => new Date(str).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            />
                            <Area type="monotone" dataKey="count" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorHourly)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 shadow-xl rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-primary" />
                    Top Photographers for this Event
                </h2>

                <div className="space-y-4">
                    {data.photographers.length > 0 ? (
                        data.photographers.map((photog, idx) => (
                            <div key={photog.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-lg ${idx < 3 ? 'bg-primary text-black' : 'bg-white/5 text-slate-500'}`}>
                                        #{idx + 1}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        {photog.logo_url ? (
                                            <img src={photog.logo_url} alt={photog.name} className="w-10 h-10 rounded-lg object-cover bg-white/5" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                                <Camera className="w-5 h-5 text-slate-500" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-white leading-tight">{photog.name}</p>
                                            {photog.brand && <p className="text-xs text-primary/80 font-bold uppercase tracking-wider">{photog.brand}</p>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-white">{photog.views}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Interactions</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-16 text-center">
                            <LayoutDashboard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">No photographer interactions recorded yet.</p>
                            <p className="text-slate-600 text-sm mt-1">Clicks on "Get Your Photos" will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
