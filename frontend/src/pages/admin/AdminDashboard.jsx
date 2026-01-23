import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Users, Briefcase, LogOut, ExternalLink, BarChart3, Settings, ArrowRight } from 'lucide-react';
import api from '../../api';

// Simple checkauth or just rely on API error to redirect
export default function AdminDashboard() {
    const [stats, setStats] = useState({ events: 0, upcoming: 0, photographers: 0 }); // Placeholder stats
    const navigate = useNavigate();

    // In a real app we'd fetch stats from a dashboard endpoint. 
    // I'll leave stats as placeholders or fetch counts via list endpoints efficiently.

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/admin/login');
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Cards */}
                <Link to="/admin/events" className="group bg-white/5 border border-white/10 overflow-hidden shadow-lg rounded-2xl hover:bg-white/10 hover:border-primary/50 transition-all duration-300">
                    <div className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 bg-primary/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                <Calendar className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <dl>
                                    <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Manage</dt>
                                    <dd className="mt-1 text-2xl font-black text-white italic">EVENTS</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-black/20 px-6 py-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-400 group-hover:text-primary transition-colors">View All Events</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                    </div>
                </Link>

                <Link to="/admin/photographers" className="group bg-white/5 border border-white/10 overflow-hidden shadow-lg rounded-2xl hover:bg-white/10 hover:border-accent/50 transition-all duration-300">
                    <div className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 bg-accent/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                <Users className="h-6 w-6 text-accent" />
                            </div>
                            <div className="flex-1">
                                <dl>
                                    <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Manage</dt>
                                    <dd className="mt-1 text-2xl font-black text-white italic">PARTNERS</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-black/20 px-6 py-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-400 group-hover:text-accent transition-colors">View All Photographers</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-accent transition-colors" />
                    </div>
                </Link>

                <Link to="/admin/analytics" className="group bg-white/5 border border-white/10 overflow-hidden shadow-lg rounded-2xl hover:bg-white/10 hover:border-blue-400/50 transition-all duration-300">
                    <div className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 bg-blue-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                <BarChart3 className="h-6 w-6 text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <dl>
                                    <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Insights</dt>
                                    <dd className="mt-1 text-2xl font-black text-white italic">ANALYTIC</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-black/20 px-6 py-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-400 group-hover:text-blue-400 transition-colors">View Reports</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                </Link>

                <Link to="/admin/settings" className="group bg-white/5 border border-white/10 overflow-hidden shadow-lg rounded-2xl hover:bg-white/10 hover:border-emerald-400/50 transition-all duration-300">
                    <div className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 bg-emerald-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                <Settings className="h-6 w-6 text-emerald-400" />
                            </div>
                            <div className="flex-1">
                                <dl>
                                    <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">System</dt>
                                    <dd className="mt-1 text-2xl font-black text-white italic">SETTINGS</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-black/20 px-6 py-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-400 group-hover:text-emerald-400 transition-colors">Configure</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                </Link>
            </div>

            {/* Quick Actions / Recent (Placeholder) */}
            <div className="mt-8">
                <h2 className="text-lg font-bold text-slate-300 mb-4">Recent Activity</h2>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-slate-500 text-sm">
                    No recent activity to display.
                </div>
            </div>
        </div>
    );
}
