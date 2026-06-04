import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import { motion } from 'framer-motion';

export default function Layout() {
    return (
        <div className="min-h-screen bg-ohmai-charcoal flex flex-col selection:bg-primary/30 selection:text-white">
            <Navbar />

            <main className="flex-grow pt-24 pb-12">
                <div className="w-[90%] mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Outlet />
                    </motion.div>
                </div>
            </main>

            <footer className="mt-auto py-12 bg-ohmai-charcoal border-t border-white/5">
                <div className="w-[90%] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-display font-black text-white tracking-tighter uppercase italic">
                                Marathon<span className="text-gradient">Hub</span>
                            </span>
                        </div>

                        <p className="text-sm text-slate-500 font-medium">
                            &copy; {new Date().getFullYear()} MarathonHub. Crafted for the extreme community.
                        </p>

                        <div className="flex items-center gap-4">
                            <Link to="/for-organizers" className="text-sm font-semibold text-slate-400 hover:text-primary transition-colors">
                                Event Organizer?
                            </Link>
                            <span className="text-white/20">|</span>
                            <Link to="/admin/login" className="text-sm font-semibold text-slate-400 hover:text-primary transition-colors">
                                Admin Portal
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
