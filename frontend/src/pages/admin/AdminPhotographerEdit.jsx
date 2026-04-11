import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';
import api from '../../api';

export default function AdminPhotographerEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        bio: '',
        logo_url: '',
        website_url: '',
        instagram_url: '',
        facebook_url: '',
        x_url: '',
        coverage_areas_json: '[]',
        is_public: true,
        display_order: 0
    });
    const [coverageInput, setCoverageInput] = useState('');

    useEffect(() => {
        if (isEditing) {
            api.get(`/photographers/${id}`)
                .then(res => {
                    const data = res.data;
                    setFormData(data);
                    setCoverageInput(JSON.parse(data.coverage_areas_json || '[]').join(', '));
                })
                .catch(err => console.error(err));
        }
    }, [id, isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const coverageArray = coverageInput.split(',').map(s => s.trim()).filter(Boolean);

        const payload = {
            ...formData,
            coverage_areas_json: JSON.stringify(coverageArray)
        };
        // remove updated_at/created_at/assignments if present in formData from fetch, 
        // but generic update ignores extra fields mostly. Better to be specific in real apps.
        // For now simplistic approach.

        try {
            if (isEditing) {
                await api.put(`/admin/photographers/${id}`, payload);
            } else {
                await api.post('/admin/photographers', payload);
            }
            navigate('/admin/photographers');
        } catch (error) {
            console.error("Failed to save photographer", error);
            alert("Failed to save photographer");
        }
    };

    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const res = await api.post('/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, logo_url: res.data.url }));
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Link
                to="/admin/photographers"
                className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-primary transition-colors w-fit"
            >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Photographers
            </Link>
            <h1 className="text-2xl font-bold text-white">{isEditing ? 'Edit Photographer' : 'Add Photographer'}</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 p-6 rounded-2xl shadow-xl border border-white/10 backdrop-blur-sm">
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 p-4 bg-black/20 border border-white/5 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="block text-sm font-bold text-slate-300">Show on Public Page</label>
                            <p className="text-xs text-slate-500">Toggle to hide or show on main list</p>
                        </div>
                        <input type="checkbox" name="is_public" checked={formData.is_public} onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))} className="w-6 h-6 text-primary bg-black/20 border-white/10 rounded focus:ring-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-300">Display Order</label>
                        <p className="text-xs text-slate-500 mb-1">Lower numbers appear first (0 is default)</p>
                        <input type="number" name="display_order" value={formData.display_order} onChange={handleChange} className="block w-full bg-black/20 border-white/10 rounded-lg text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-bold text-slate-300">Name</label>
                        <input type="text" name="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3 placeholder-slate-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-300">Brand Name</label>
                        <input type="text" name="brand" value={formData.brand || ''} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                    </div>
                </div>

                {/* Socials */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-bold text-slate-300">Website URL</label>
                        <input type="url" name="website_url" value={formData.website_url || ''} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                    </div>

                    {/* Image Upload Field */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">Logo Image</label>
                        <div className="flex items-start gap-4">
                            {formData.logo_url && (
                                <div className="relative group shrink-0">
                                    <img
                                        src={formData.logo_url}
                                        alt="Logo Preview"
                                        className="w-20 h-20 object-contain bg-white/5 rounded-lg border border-white/10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            <div className="flex-1">
                                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-white/10 rounded-xl hover:border-primary/50 hover:bg-white/5 transition-all group">
                                    {uploading ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5 text-slate-400 group-hover:text-primary mb-1" />
                                            <span className="text-[10px] text-slate-400 group-hover:text-white font-medium uppercase tracking-wide">Click to upload</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                </label>
                                <input
                                    type="text"
                                    name="logo_url"
                                    value={formData.logo_url || ''}
                                    onChange={handleChange}
                                    placeholder="Or paste URL..."
                                    className="mt-2 block w-full bg-black/20 border-white/10 rounded-xl text-white text-xs p-2 placeholder-slate-600 focus:ring-primary focus:border-primary border"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-300">Instagram URL</label>
                        <input type="url" name="instagram_url" value={formData.instagram_url || ''} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-300">Facebook URL</label>
                        <input type="url" name="facebook_url" value={formData.facebook_url || ''} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-300">Bio</label>
                    <textarea name="bio" rows={3} value={formData.bio || ''} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-300">Coverage Areas (comma separated)</label>
                    <input type="text" value={coverageInput} onChange={(e) => setCoverageInput(e.target.value)} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                    <button type="button" onClick={() => navigate('/admin/photographers')} className="bg-white/5 py-2 px-4 border border-white/10 rounded-xl shadow-sm text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors focus:outline-none">
                        Cancel
                    </button>
                    <button type="submit" className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-bold rounded-xl text-ohmai-charcoal bg-primary hover:bg-primary/90 focus:outline-none transition-colors">
                        Save
                    </button>
                </div>
            </form>
        </div>
    );
}
