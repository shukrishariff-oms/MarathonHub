import { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import { motion } from 'framer-motion';
import { Facebook, Instagram, Youtube, Twitter } from 'lucide-react';
import api from '../api';

export default function Layout() {
    const [socialLinks, setSocialLinks] = useState({
        facebook: '',
        instagram: '',
        tiktok: '',
        x: ''
    });

    useEffect(() => {
        api.get('/site-settings')
            .then(res => {
                if (res.data.social_links) {
                    setSocialLinks(res.data.social_links);
                }
            })
            .catch(err => console.error('Failed to load social links', err));
    }, []);
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
                            {socialLinks.facebook && (
                                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                                    <Facebook className="w-5 h-5" />
                                </a>
                            )}
                            {socialLinks.instagram && (
                                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                                    <Instagram className="w-5 h-5" />
                                </a>
                            )}
                            {socialLinks.tiktok && (
                                <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                                </a>
                            )}
                            {socialLinks.x && (
                                <a href={socialLinks.x} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                </a>
                            )}
                            
                            <span className="text-white/20">|</span>
                            
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
