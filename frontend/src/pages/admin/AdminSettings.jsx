import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminSettings() {
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
                <h1 className="text-3xl font-bold text-white">Settings</h1>
            </div>

            <div className="bg-white/5 border border-white/10 shadow-xl rounded-2xl p-6">
                <p className="text-slate-400">System settings coming soon...</p>
            </div>
        </div>
    );
}
