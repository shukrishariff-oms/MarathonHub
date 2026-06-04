import { useState, useEffect } from 'react';
import { ArrowLeft, Save, MessageCircle, Package, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function AdminSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [packages, setPackages] = useState([]);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/site-settings');
            const data = res.data;
            setWhatsappNumber(data.whatsapp_number || '');
            setPackages(data.organizer_packages || []);
        } catch (err) {
            console.error('Failed to load settings', err);
            setError('Gagal memuatkan tetapan. Sila cuba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError('');
            setSuccess(false);

            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            // Save WhatsApp number
            await api.put(`/admin/site-settings/whatsapp_number`, whatsappNumber, { headers });

            // Save packages
            await api.put(`/admin/site-settings/organizer_packages`, packages, { headers });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to save settings', err);
            setError('Gagal menyimpan tetapan. Pastikan anda telah login sebagai admin.');
        } finally {
            setSaving(false);
        }
    };

    const addPackage = () => {
        setPackages([
            ...packages,
            {
                name: 'Pakej Baru',
                price: 'RM 0',
                features: ['Ciri 1', 'Ciri 2'],
                highlight: false,
                cta: 'Hubungi Kami'
            }
        ]);
    };

    const updatePackage = (index, field, value) => {
        const newPackages = [...packages];
        newPackages[index][field] = value;
        setPackages(newPackages);
    };

    const updateFeature = (pkgIndex, featIndex, value) => {
        const newPackages = [...packages];
        newPackages[pkgIndex].features[featIndex] = value;
        setPackages(newPackages);
    };

    const addFeature = (pkgIndex) => {
        const newPackages = [...packages];
        newPackages[pkgIndex].features.push('Ciri baru');
        setPackages(newPackages);
    };

    const removeFeature = (pkgIndex, featIndex) => {
        const newPackages = [...packages];
        newPackages[pkgIndex].features.splice(featIndex, 1);
        setPackages(newPackages);
    };

    const removePackage = (index) => {
        const newPackages = [...packages];
        newPackages.splice(index, 1);
        setPackages(newPackages);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div className="flex flex-col gap-4">
                <Link
                    to="/admin"
                    className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-primary transition-colors w-fit"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-white">Site Settings</h1>
                <p className="text-slate-400 text-sm">Urus tetapan laman web MarathonHub tanpa perlu ubah kod.</p>
            </div>

            {success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Tetapan berjaya disimpan!
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* WhatsApp Setting */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Nombor WhatsApp Organizer</h2>
                        <p className="text-sm text-slate-400">Nombor ini akan digunakan untuk butang "Hubungi Kami" di halaman organizer.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">+</span>
                        <input
                            type="text"
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="60123456789"
                            className="w-full pl-8 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors font-mono"
                        />
                    </div>
                </div>
                <p className="text-xs text-slate-500">Format: Kod negara tanpa '+', contoh: 60123456789</p>
            </div>

            {/* Organizer Packages Setting */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Pakej Organizer</h2>
                            <p className="text-sm text-slate-400">Senarai pakej yang dipaparkan di halaman /for-organizers</p>
                        </div>
                    </div>
                    <button
                        onClick={addPackage}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-bold transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Pakej
                    </button>
                </div>

                <div className="space-y-4">
                    {packages.map((pkg, pkgIndex) => (
                        <div key={pkgIndex} className="bg-black/20 border border-white/5 rounded-xl p-5 space-y-4 relative group">
                            <button
                                onClick={() => removePackage(pkgIndex)}
                                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Buang pakej"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Pakej</label>
                                    <input
                                        type="text"
                                        value={pkg.name}
                                        onChange={(e) => updatePackage(pkgIndex, 'name', e.target.value)}
                                        className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Harga</label>
                                    <input
                                        type="text"
                                        value={pkg.price}
                                        onChange={(e) => updatePackage(pkgIndex, 'price', e.target.value)}
                                        className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ciri-ciri (Features)</label>
                                <div className="space-y-2">
                                    {pkg.features && pkg.features.map((feat, featIndex) => (
                                        <div key={featIndex} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={feat}
                                                onChange={(e) => updateFeature(pkgIndex, featIndex, e.target.value)}
                                                className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
                                            />
                                            <button
                                                onClick={() => removeFeature(pkgIndex, featIndex)}
                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => addFeature(pkgIndex)}
                                        className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 mt-2"
                                    >
                                        <Plus className="w-3 h-3" /> Tambah Ciri
                                    </button>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Teks Butang (CTA)</label>
                                    <input
                                        type="text"
                                        value={pkg.cta}
                                        onChange={(e) => updatePackage(pkgIndex, 'cta', e.target.value)}
                                        className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={pkg.highlight}
                                            onChange={(e) => updatePackage(pkgIndex, 'highlight', e.target.checked)}
                                            className="w-5 h-5 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/50"
                                        />
                                        <span className="text-sm text-slate-300">Highlight sebagai "Paling Popular"</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}

                    {packages.length === 0 && (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                            <Package className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                            <p className="text-slate-500">Tiada pakej lagi. Klik "Tambah Pakej" untuk mula.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20"
                >
                    {saving ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Menyimpan...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Simpan Semua Tetapan
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
