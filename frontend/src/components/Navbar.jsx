import { Link, useLocation } from 'react-router-dom';
import { Camera, Calendar, Menu, X, Globe, User, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (path) => location.pathname === path;

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Events', path: '/events' },
        { name: 'Photographers', path: '/photographers' },
    ];

    return (
        <nav
            className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'glass-nav py-3' : 'bg-transparent py-5'
                }`}
        >
            <div className="w-[90%] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-3 group">
                            {/* Logo standalone — no frame, just a soft glow on hover */}
                            <img
                                src="/ohmaishoot-logo.png"
                                alt="ohmaishoot!"
                                className="h-10 w-auto object-contain drop-shadow-[0_2px_8px_rgba(251,191,36,0.25)] transition-transform duration-300 group-hover:scale-110"
                            />
                            <span className="text-2xl font-display font-black tracking-tight italic lowercase leading-none">
                                <span className="text-gradient">ohmaishoot</span><span className="text-primary">!</span>
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center space-x-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${isActive(link.path)
                                        ? 'bg-white/10 text-primary'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        {localStorage.getItem('token') ? (
                            <Link to="/admin" className="premium-btn-outline py-2 px-4 text-xs">
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </Link>
                        ) : (
                            <Link to="/admin/login" className="premium-btn-outline py-2 px-4 text-xs">
                                <User className="w-4 h-4" />
                                Admin Access
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 focus:outline-none"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="md:hidden absolute top-full left-0 w-full glass-nav border-t border-white/20 shadow-2xl overflow-hidden"
                    >
                        <div className="px-4 py-6 space-y-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center px-4 py-3 rounded-xl text-base font-bold transition-colors ${isActive(link.path)
                                        ? 'bg-primary text-ohmai-charcoal shadow-lg shadow-primary/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="pt-4 mt-4 border-t border-slate-100">
                                <Link
                                    to="/admin/login"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 text-slate-600 font-medium hover:text-primary transition-colors"
                                >
                                    <User className="w-5 h-5" />
                                    Admin Access
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
