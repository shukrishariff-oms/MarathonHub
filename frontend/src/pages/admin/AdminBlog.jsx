import { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Search, ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function AdminBlog() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = () => {
        api.get('/admin/blog')
            .then(res => {
                setPosts(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const handleDelete = async (slug, title) => {
        if (window.confirm(`Padam blog post "${title}"?`)) {
            try {
                await api.delete(`/admin/blog/${slug}`);
                setPosts(posts.filter(p => p.slug !== slug));
            } catch (error) {
                alert('Gagal padam blog post');
                console.error(error);
            }
        }
    };

    const filtered = posts.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (p.title || '').toLowerCase().includes(q)
            || (p.slug || '').toLowerCase().includes(q)
            || (p.author || '').toLowerCase().includes(q);
    });

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
                    <div>
                        <h1 className="text-2xl font-bold text-white">Manage Blog</h1>
                        <p className="text-sm text-slate-400 mt-1">{posts.length} post(s)</p>
                    </div>
                    <Link
                        to="/admin/blog/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-bold text-ohmai-charcoal bg-primary hover:bg-primary/90 transition-all"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Post
                    </Link>
                </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title, slug..."
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                />
            </div>

            {loading ? (
                <div className="text-white text-center py-12">Loading...</div>
            ) : (
                <div className="bg-white/5 shadow-xl overflow-hidden rounded-2xl border border-white/10">
                    {filtered.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-sm">
                            {searchQuery ? `Tiada post match "${searchQuery}"` : 'Tiada blog post lagi. Cipta yang pertama!'}
                        </div>
                    ) : (
                        <ul className="divide-y divide-white/10">
                            {filtered.map((post) => (
                                <li key={post.slug} className="p-4 hover:bg-white/5 transition-colors flex justify-between items-center">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex-shrink-0 bg-primary/20 p-2 rounded-lg">
                                            <FileText className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-bold text-white truncate">{post.title}</h3>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                <span>/{post.slug}</span>
                                                {post.date && <span>• {post.date}</span>}
                                                {post.author && <span>• {post.author}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pl-4 border-l border-white/10 flex-shrink-0">
                                        <Link
                                            to={`/admin/blog/edit/${post.slug}`}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(post.slug, post.title)}
                                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                                        >
                                            <Trash className="h-4 w-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
