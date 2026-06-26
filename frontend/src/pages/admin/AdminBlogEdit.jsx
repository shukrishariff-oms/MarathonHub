import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Eye, EyeOff, X } from 'lucide-react';
import api from '../../api';

export default function AdminBlogEdit() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const isEditing = !!slug;

    const [form, setForm] = useState({
        title: '',
        slug: '',
        date: new Date().toISOString().slice(0, 10),
        author: 'MarathonHub Editorial',
        reading_time: '5 min read',
        excerpt: '',
        description: '',
        tags: [],
        content: '',
    });
    const [tagInput, setTagInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEditing) {
            setLoading(true);
            api.get(`/admin/blog/${slug}`)
                .then(res => {
                    const d = res.data;
                    setForm({
                        title: d.title || '',
                        slug: d.slug || '',
                        date: d.date || '',
                        author: d.author || 'MarathonHub Editorial',
                        reading_time: d.reading_time || '5 min read',
                        excerpt: d.excerpt || '',
                        description: d.description || '',
                        tags: d.tags || [],
                        content: d.content_markdown || '',
                    });
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setError('Blog post not found');
                    setLoading(false);
                });
        }
    }, [isEditing, slug]);

    // Auto-generate slug from title
    const handleTitleChange = (val) => {
        setForm(prev => ({
            ...prev,
            title: val,
            slug: isEditing ? prev.slug : val.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .slice(0, 90)
        }));
    };

    const handleTagAdd = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!form.tags.includes(tagInput.trim())) {
                setForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
            }
            setTagInput('');
        }
    };

    const handleTagRemove = (tag) => {
        setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    const handlePreview = async () => {
        if (!preview) {
            try {
                const res = await api.post('/admin/blog', form);
                // Just render locally — fetch the rendered version
                const listRes = await api.get('/admin/blog');
                const found = listRes.data.find(p => p.slug === form.slug);
                if (found && found.content) {
                    setPreviewHtml(found.content);
                }
            } catch {
                // If slug exists, just get existing preview
                try {
                    const res = await api.get(`/admin/blog/${form.slug}`);
                    setPreviewHtml(res.data.content || '');
                } catch {
                    setPreviewHtml('<p>Preview not available</p>');
                }
            }
            setPreview(true);
        } else {
            setPreview(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) {
            setError('Title dan content wajib diisi');
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (isEditing) {
                await api.put(`/admin/blog/${slug}`, form);
            } else {
                await api.post('/admin/blog', form);
            }
            navigate('/admin/blog');
        } catch (err) {
            const msg = err.response?.data?.detail || 'Gagal save blog post';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-white text-center py-12">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <Link
                to="/admin/blog"
                className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-primary transition-colors w-fit"
            >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Blog
            </Link>

            <h1 className="text-2xl font-bold text-white">
                {isEditing ? `Edit: ${form.title}` : 'New Blog Post'}
            </h1>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Title *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                            placeholder="Blog post title"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Slug</label>
                        <input
                            type="text"
                            value={form.slug}
                            onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                            placeholder="auto-dari-title"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Date</label>
                        <input
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Author</label>
                        <input
                            type="text"
                            value={form.author}
                            onChange={(e) => setForm(prev => ({ ...prev, author: e.target.value }))}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reading Time</label>
                        <input
                            type="text"
                            value={form.reading_time}
                            onChange={(e) => setForm(prev => ({ ...prev, reading_time: e.target.value }))}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                            placeholder="5 min read"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Excerpt</label>
                    <input
                        type="text"
                        value={form.excerpt}
                        onChange={(e) => setForm(prev => ({ ...prev, excerpt: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                        placeholder="Ringkasan pendek untuk senarai blog..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">SEO Description</label>
                    <input
                        type="text"
                        value={form.description}
                        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                        placeholder="Meta description untuk SEO..."
                    />
                </div>

                {/* Tags */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {form.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium">
                                {tag}
                                <button type="button" onClick={() => handleTagRemove(tag)} className="hover:text-white transition-colors">
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagAdd}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                        placeholder="Taip tag, tekan Enter untuk tambah..."
                    />
                </div>

                {/* Markdown Editor */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Content (Markdown) *</label>
                        <button
                            type="button"
                            onClick={handlePreview}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all"
                        >
                            {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            {preview ? 'Edit' : 'Preview'}
                        </button>
                    </div>

                    {preview ? (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-h-[300px] prose prose-invert max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        </div>
                    ) : (
                        <textarea
                            value={form.content}
                            onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                            rows={20}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 resize-y"
                            placeholder="# Tajuk Artikel&#10;&#10;Tulis kandungan dalam format markdown..."
                            required
                        />
                    )}
                </div>

                {/* Submit */}
                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center px-6 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-ohmai-charcoal bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : (isEditing ? 'Update Post' : 'Create Post')}
                    </button>
                    <Link
                        to="/admin/blog"
                        className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Batal
                    </Link>
                </div>
            </form>
        </div>
    );
}
