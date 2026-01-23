import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
        coverage_areas_json: '[]'
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
                    <div>
                        <label className="block text-sm font-bold text-slate-300">Logo Image URL</label>
                        <input type="text" name="logo_url" value={formData.logo_url || ''} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 rounded-xl text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-3" />
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
