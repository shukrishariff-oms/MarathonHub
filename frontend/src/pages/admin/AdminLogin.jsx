import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import api from '../../api';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/admin');
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/admin/login', { username, password });
            localStorage.setItem('token', response.data.access_token);
            navigate('/admin');
        } catch (err) {
            setError('Invalid username or password');
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0F1A] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="bg-primary/20 p-3 rounded-2xl">
                        <Camera className="h-10 w-10 text-primary" />
                    </div>
                </div>
                <h2 className="text-center text-3xl font-display font-black text-white tracking-tight uppercase italic">
                    Admin <span className="text-gradient">Portal</span>
                </h2>
                <p className="mt-2 text-center text-sm text-slate-400 font-medium tracking-widest uppercase">
                    MarathonHub
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white/5 py-8 px-4 shadow-2xl border border-white/10 sm:rounded-2xl sm:px-10 backdrop-blur-sm">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm text-red-400 font-bold">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div>
                            <label htmlFor="username" className="block text-sm font-bold text-slate-300">
                                Username
                            </label>
                            <div className="mt-1">
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    className="appearance-none block w-full px-3 py-3 border border-white/10 rounded-xl shadow-sm placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-black/20 text-white"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-bold text-slate-300">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="appearance-none block w-full px-3 py-3 border border-white/10 rounded-xl shadow-sm placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-black/20 text-white"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-ohmai-charcoal bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform hover:scale-[1.02]"
                            >
                                Sign in
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
