import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';
import api from '../api';

export default function BlogDetail() {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.get(`/blog/${slug}`)
            .then(res => {
                setPost(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(true);
                setLoading(false);
            });
    }, [slug]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="text-center py-20">
                <h2 className="text-3xl font-display font-black text-white mb-4">Artikel Tidak Dijumpai</h2>
                <p className="text-slate-400 mb-8">Maaf, artikel yang anda cari tiada atau telah dialih.</p>
                <Link to="/blog" className="premium-btn py-3 px-6 rounded-xl inline-flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" />
                    Kembali ke Blog
                </Link>
            </div>
        );
    }

    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto pb-20"
        >
            <Link to="/blog" className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-semibold mb-8 group transition-colors">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Kembali ke Blog
            </Link>

            <header className="mb-10">
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-400 mb-5">
                    <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className="w-px h-4 bg-white/10" />
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {post.reading_time}
                    </span>
                    <span className="w-px h-4 bg-white/10" />
                    <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" />
                        {post.author}
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white tracking-tighter leading-tight">
                    {post.title}
                </h1>

                {/* Excerpt / description */}
                {post.description && (
                    <p className="mt-5 text-lg text-slate-300 leading-relaxed border-l-2 border-primary/40 pl-4">
                        {post.description}
                    </p>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-6">
                    {post.tags && post.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs font-bold text-slate-300">
                            #{tag}
                        </span>
                    ))}
                </div>
            </header>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-10" />

            {/* Article body */}
            <div
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t border-white/10">
                <div className="flex flex-wrap gap-2">
                    {post.tags && post.tags.map(tag => (
                        <Link key={tag} to="/blog" className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-slate-300 transition-colors">
                            #{tag}
                        </Link>
                    ))}
                </div>
            </footer>
        </motion.article>
    );
}
