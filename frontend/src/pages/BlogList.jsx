import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Calendar, BookOpen, Search, X } from 'lucide-react';
import api from '../api';

export default function BlogList() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTag, setActiveTag] = useState(null);

    useEffect(() => {
        api.get('/blog')
            .then(res => {
                setPosts(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching blog posts', err);
                setLoading(false);
            });
    }, []);

    // Collect all unique tags
    const allTags = useMemo(() => {
        const tagSet = new Set();
        posts.forEach(p => p.tags?.forEach(t => tagSet.add(t)));
        return Array.from(tagSet).sort();
    }, [posts]);

    // Filter posts by search + tag
    const filteredPosts = useMemo(() => {
        return posts.filter(p => {
            const matchesSearch = !searchQuery || 
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesTag = !activeTag || p.tags?.includes(activeTag);
            return matchesSearch && matchesTag;
        });
    }, [posts, searchQuery, activeTag]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            {/* Header */}
            <header className="space-y-4 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-sm font-bold text-primary mb-2"
                >
                    <BookOpen className="w-4 h-4" />
                    MarathonHub Blog
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-display font-black text-white tracking-tighter uppercase italic"
                >
                    RUNNERS <span className="text-gradient">BLOG</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg text-slate-400 font-medium max-w-2xl mx-auto"
                >
                    Tips, panduan, dan artikel tentang fotografi sukan larian di Malaysia.
                </motion.p>
            </header>

            {/* Search + Filter */}
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari artikel..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveTag(null)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                !activeTag
                                    ? 'bg-primary text-white'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                        >
                            Semua
                        </button>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                    activeTag === tag
                                        ? 'bg-primary text-white'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Posts grid */}
            <div className="space-y-6">
                {filteredPosts.map((post, i) => {
                    const isFeatured = i === 0;
                    return (
                        <motion.article
                            key={post.slug}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={`group relative rounded-2xl border transition-all duration-300 ${
                                isFeatured
                                    ? 'bg-gradient-to-br from-primary/5 to-pink-500/5 border-primary/20 hover:border-primary/40 p-8 md:p-10'
                                    : 'glass-card p-6 md:p-8 hover:border-primary/30'
                            }`}
                        >
                            <Link to={`/blog/${post.slug}`} className="block space-y-4">
                                {/* Meta */}
                                <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-400">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-primary/70" />
                                        {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                    <span className="w-px h-3.5 bg-white/10" />
                                    <span className="inline-flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-primary/70" />
                                        {post.reading_time}
                                    </span>
                                    {isFeatured && (
                                        <>
                                            <span className="w-px h-3.5 bg-white/10" />
                                            <span className="px-2 py-0.5 bg-primary/15 text-primary text-xs font-bold rounded-md uppercase tracking-wider">
                                                Terkini
                                            </span>
                                        </>
                                    )}
                                </div>

                                {/* Title */}
                                <h2 className={`font-display font-black text-white tracking-tight group-hover:text-primary transition-colors leading-tight ${
                                    isFeatured ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-xl md:text-2xl'
                                }`}>
                                    {post.title}
                                </h2>

                                {/* Excerpt */}
                                <p className={`text-slate-300 leading-relaxed ${isFeatured ? 'text-lg' : ''}`}>
                                    {post.excerpt}
                                </p>

                                {/* Tags + CTA */}
                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex flex-wrap gap-2">
                                        {post.tags && post.tags.slice(0, isFeatured ? 4 : 3).map(tag => (
                                            <span key={tag} className="px-3 py-1 bg-white/5 rounded-lg text-xs font-semibold text-slate-300">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        Baca <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </div>
                            </Link>
                        </motion.article>
                    );
                })}

                {filteredPosts.length === 0 && posts.length > 0 && (
                    <div className="text-center text-slate-400 py-12 glass-card rounded-2xl">
                        <Search className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                        <p className="text-lg">Tiada artikel yang sepadan.</p>
                        <p className="text-sm text-slate-500 mt-1">Cuba kata kunci lain atau tapis tag berbeza.</p>
                    </div>
                )}
                {posts.length === 0 && (
                    <div className="text-center text-slate-400 py-12 glass-card rounded-2xl">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                        <p className="text-lg">Tiada artikel buat masa ini.</p>
                        <p className="text-sm text-slate-500 mt-1">Nantikan kemaskini terbaru kami.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
