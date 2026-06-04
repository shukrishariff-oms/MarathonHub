import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';

export default function BlogList() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <header className="space-y-4 text-center">
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

            <div className="grid gap-8">
                {posts.map((post, i) => (
                    <motion.article
                        key={post.slug}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card p-6 md:p-8 rounded-2xl group border border-white/5 hover:border-primary/30 transition-all duration-300"
                    >
                        <Link to={`/blog/${post.slug}`} className="block space-y-4">
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 font-semibold mb-2">
                                <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                <span>•</span>
                                <span>{post.reading_time}</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight group-hover:text-primary transition-colors">
                                {post.title}
                            </h2>
                            <p className="text-slate-300 leading-relaxed">
                                {post.excerpt}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-4">
                                {post.tags && post.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-white/5 rounded-lg text-xs font-semibold text-slate-300">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </Link>
                    </motion.article>
                ))}
                
                {posts.length === 0 && (
                    <div className="text-center text-slate-400 py-12 glass-card rounded-2xl">
                        <p>Tiada artikel buat masa ini. Nantikan kemaskini terbaru kami.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
