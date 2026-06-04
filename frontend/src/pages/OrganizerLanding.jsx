import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Camera, TrendingUp, Users, Zap, CheckCircle, ArrowRight, MessageCircle } from 'lucide-react';
import api from '../api';

export default function OrganizerLanding() {
    const [settings, setSettings] = useState({
        whatsapp_number: '60123456789', // fallback
        organizer_packages: [
            {
                name: "Basic Listing",
                price: "PERCUMA",
                features: ["Senarai event di MarathonHub", "Link ke semua jurugambar", "Basic SEO indexing"],
                highlight: false,
                cta: "Submit Event"
            },
            {
                name: "Premium Coverage",
                price: "RM 500 / event",
                features: [
                    "Semua dalam Basic",
                    "Featured di halaman utama (7 hari)",
                    "Artikel blog khas tentang event anda",
                    "Ruang banner sponsor di page event",
                    "Priority support"
                ],
                highlight: true,
                cta: "Pilih Pakej Ini"
            },
            {
                name: "Official Media Partner",
                price: "Custom Quote",
                features: [
                    "Semua dalam Premium",
                    "Exclusive photo aggregation rights",
                    "Custom landing page untuk event",
                    "Post-event analytics report",
                    "Dedicated account manager"
                ],
                highlight: false,
                cta: "Hubungi Kami"
            }
        ]
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/site-settings')
            .then(res => {
                setSettings(prev => ({
                    ...prev,
                    ...res.data
                }));
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load site settings', err);
                setLoading(false);
            });
    }, []);

    const whatsappNumber = settings.whatsapp_number || '60123456789';
    const packages = settings.organizer_packages || [];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-24 pb-20">
            {/* Hero Section */}
            <section className="text-center space-y-6 pt-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-sm font-bold text-primary mb-2"
                >
                    <Users className="w-4 h-4" />
                    Untuk Event Organizer
                </motion.div>
                
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter leading-tight"
                >
                    Pastikan Peserta Anda <br />
                    <span className="text-gradient">Jumpa Gambar Mereka.</span>
                </motion.h1>
                
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg md:text-xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed"
                >
                    Jangan biarkan gambar race anda hilang dalam ratusan album berbeza. MarathonHub kumpulkan semua gallery dalam satu tempat, tingkatkan SEO event anda, dan kekalkan hype post-race selama berminggu-minggu.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                >
                    <a
                        href={`https://wa.me/${whatsappNumber}?text=Hai%20MarathonHub,%20saya%20event%20organizer%20dan%20berminat%20untuk%20collaborate.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="premium-btn py-4 px-8 rounded-xl inline-flex items-center gap-3 text-lg font-bold"
                    >
                        <MessageCircle className="w-5 h-5" />
                        Hubungi Kami Sekarang
                    </a>
                    <Link to="/events" className="text-slate-400 hover:text-white font-semibold inline-flex items-center gap-2 transition-colors">
                        Lihat Contoh Event Page <ArrowRight className="w-4 h-4" />
                    </Link>
                </motion.div>
            </section>

            {/* The Problem */}
            <section className="space-y-8">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
                        Masalah Biasa Selepas Race
                    </h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Peserta puas hati masa race, tapi frust bila tak jumpa gambar. Ini kesan kepada event anda.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        {
                            icon: <Camera className="w-6 h-6 text-red-400" />,
                            title: "Gambar Bersepah",
                            desc: "3-10 jurugambar cover satu event, tapi setiap sorang ada album berbeza di platform berlainan. Runner pening nak cari."
                        },
                        {
                            icon: <TrendingUp className="w-6 h-6 text-red-400" />,
                            title: "Hype Mati Cepat",
                            desc: "Bila runner tak jumpa gambar, mereka tak share di media sosial. Momentum post-race hilang dalam 48 jam."
                        },
                        {
                            icon: <Users className="w-6 h-6 text-red-400" />,
                            title: "Sponsor Tak Nampak",
                            desc: "Gambar event sepatutnya jadi marketing percuma untuk penaja, tapi bila tak jumpa, ROI sponsor jatuh."
                        }
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="glass-card p-6 rounded-2xl border border-red-500/10 hover:border-red-500/30 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                                {item.icon}
                            </div>
                            <h3 className="text-xl font-display font-bold text-white mb-2">{item.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* The Solution */}
            <section className="space-y-8">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
                        Bagaimana MarathonHub Selesaikan Ini
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {[
                        {
                            icon: <Zap className="w-6 h-6 text-primary" />,
                            title: "Satu Halaman, Semua Gallery",
                            desc: "Kami kumpulkan link ke semua jurugambar yang cover event anda dalam satu page yang kemas. Runner tak perlu cari susah-susah."
                        },
                        {
                            icon: <TrendingUp className="w-6 h-6 text-primary" />,
                            title: "SEO Dominance",
                            desc: "Bila runner Google 'Gambar [Nama Event] 2026', page MarathonHub anda akan keluar di halaman pertama, bukan Facebook post yang dah lama."
                        },
                        {
                            icon: <Camera className="w-6 h-6 text-primary" />,
                            title: "Face-Search Integration",
                            desc: "Sokong jurugambar yang guna teknologi face-search. Runner upload selfie, terus jumpa gambar mereka di route."
                        },
                        {
                            icon: <Users className="w-6 h-6 text-primary" />,
                            title: "Sponsor Visibility",
                            desc: "Kami sediakan ruang khas untuk logo penaja anda di page event. Setiap runner yang cari gambar akan nampak brand anda."
                        }
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="glass-card p-6 rounded-2xl flex gap-4"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                {item.icon}
                            </div>
                            <div>
                                <h3 className="text-lg font-display font-bold text-white mb-2">{item.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Packages */}
            <section className="space-y-8">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
                        Pakej Coverage Kami
                    </h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Pilih tahap coverage yang sesuai dengan bajet dan skala event anda.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {packages.map((pkg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={`glass-card p-8 rounded-2xl flex flex-col ${
                                pkg.highlight ? 'border-primary/40 bg-primary/5 relative' : 'border-white/10'
                            }`}
                        >
                            {pkg.highlight && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-wider">
                                    Paling Popular
                                </div>
                            )}
                            <h3 className="text-xl font-display font-bold text-white mb-2">{pkg.name}</h3>
                            <div className="text-3xl font-black text-white mb-6">{pkg.price}</div>
                            
                            <ul className="space-y-3 mb-8 flex-grow">
                                {pkg.features && pkg.features.map((feat, j) => (
                                    <li key={j} className="flex items-start gap-3 text-sm text-slate-300">
                                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                        <span>{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <a
                                href={`https://wa.me/${whatsappNumber}?text=Hai,%20saya%20berminat%20dengan%20pakej%20${encodeURIComponent(pkg.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full py-3 rounded-xl font-bold text-center transition-all ${
                                    pkg.highlight 
                                        ? 'bg-primary text-white hover:bg-primary/90' 
                                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                                }`}
                            >
                                {pkg.cta}
                            </a>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="text-center space-y-6 py-12 glass-card rounded-3xl border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
                <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
                    Sedia Untuk Tingkatkan Experience Peserta Anda?
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto">
                    Biarkan kami uruskan bahagian gambar. Anda fokus pada apa yang penting: menjalankan event yang hebat.
                </p>
                <a
                    href={`https://wa.me/${whatsappNumber}?text=Hai%20MarathonHub,%20saya%20event%20organizer%20dan%20berminat%20untuk%20collaborate.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="premium-btn py-4 px-8 rounded-xl inline-flex items-center gap-3 text-lg font-bold"
                >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp Kami Sekarang
                </a>
            </section>
        </div>
    );
}
