import { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Search, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function AdminPhotographers() {
    const [photographers, setPhotographers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPhotographers();
    }, []);

    const fetchPhotographers = () => {
        api.get('/photographers?limit=100')
            .then(res => {
                const sortedData = res.data.sort((a, b) => a.name.localeCompare(b.name));
                setPhotographers(sortedData);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this photographer?")) {
            try {
                await api.delete(`/admin/photographers/${id}`);
                setPhotographers(photographers.filter(p => p.id !== id));
            } catch (error) {
                alert("Failed to delete photographer");
                console.error(error);
            }
        }
    };

    const filteredPhotographers = photographers.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <Link
                    to="/admin"
                    className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-primary transition-colors w-fit"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Dashboard
                </Link>
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-white">Manage Photographers</h1>
                    <div className="flex items-center gap-4">
                        <div className="relative w-64 bg-red-900/20 border border-red-500 rounded-xl">
                            <span className="text-red-500 text-xs absolute -top-4 left-0">DEBUG_SEARCH</span>
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white z-10" />
                            <input
                                type="text"
                                placeholder="Search photographers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-red-500/20 border border-red-500 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all w-full"
                            />
                        </div>
                        <Link
                            to="/admin/photographers/new"
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-bold text-ohmai-charcoal bg-primary hover:bg-primary/90 transition-all"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Photographer
                        </Link>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-white text-center py-12">Loading...</div>
            ) : (
                <div className="bg-white/5 shadow-xl overflow-hidden rounded-2xl border border-white/10">
                    <ul className="divide-y divide-white/10">
                        {filteredPhotographers.map((p) => (
                            <li key={p.id} className="p-4 hover:bg-white/5 transition-colors flex justify-between items-center">
                                <div className="flex items-center">
                                    {p.logo_url ? (
                                        <img src={p.logo_url} alt="" className="h-10 w-10 rounded-full mr-4 object-cover border border-white/10" />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold mr-4 border border-white/10">
                                            {p.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{p.name}</h3>
                                        {p.brand && <p className="text-sm text-slate-400">{p.brand}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                                    <Link
                                        to={`/admin/photographers/edit/${p.id}`}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(p.id)}
                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                                    >
                                        <Trash className="h-4 w-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
