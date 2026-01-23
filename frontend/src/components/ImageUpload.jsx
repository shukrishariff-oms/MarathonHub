
import { useState } from 'react';
import { Upload, X, Loader } from 'lucide-react';
import api from '../api';

export default function ImageUpload({ label, value, onChange, placeholder = "Upload Image" }) {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onChange(res.data.url);
        } catch (error) {
            console.error(error);
            alert("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        onChange('');
    };

    return (
        <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">{label}</label>

            {value ? (
                <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/20">
                    <img src={value} alt="Uploaded" className="w-full h-48 object-cover" />
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                        <span className="text-white font-bold text-sm">Change Image</span>
                    </div>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                            <Loader className="w-8 h-8 text-primary animate-spin mb-2" />
                        ) : (
                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        )}
                        <p className="text-sm text-slate-400 font-bold">
                            {uploading ? "Uploading..." : placeholder}
                        </p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                </label>
            )}
        </div>
    );
}
