import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Camera, Calendar, MapPin, Sparkles, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import EventCarousel from '../components/EventCarousel';
import EventCard from '../components/EventCard';
import EventCardSkeleton from '../components/EventCardSkeleton';

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('');
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [recentEvents, setRecentEvents] = useState([]);
    const [highlightedEvents, setHighlightedEvents] = useState([]);
    const [loadingUpcoming, setLoadingUpcoming] = useState(true);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Pull more upcoming events so we can split them into
        // "This Week" (≤7 days away) and the regular Upcoming row.
        api.get('/events?status=Upcoming&limit=20')
            .then(res => setUpcomingEvents(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoadingUpcoming(false));

        api.get('/events?status=Past&limit=3')
            .then(res => setRecentEvents(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoadingRecent(false));

        // Fetch ALL highlighted events for carousel
        api.get('/events?is_highlight=true')
            .then(res => {
                if (res.data && res.data.length > 0) {
                    setHighlightedEvents(res.data);
                }
            })
            .catch(err => console.error(err));
    }, []);

    // Auto-curated "This Week's Races" — events with date in the next
    // 7 days. No admin work needed; updates itself daily.
    const { thisWeekEvents, laterUpcoming } = useMemo(() => {
        const now = new Date();
        const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const thisWeek = [];
        const later = [];
        for (const ev of upcomingEvents) {
            const d = ev.date ? new Date(ev.date) : null;
            if (d && d <= cutoff) thisWeek.push(ev);
            else later.push(ev);
        }
        return { thisWeekEvents: thisWeek, laterUpcoming: later.slice(0, 3) };
    }, [upcomingEvents]);

    // Friendly countdown label — "Esok", "3 hari lagi", "Hari ini"
    const daysFromNow = (dateStr) => {
        if (!dateStr) return null;
        const target = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
        const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
        if (diff <= 0) return 'Hari ini';
        if (diff === 1) return 'Esok';
        return `${diff} hari lagi`;
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/events?search=${searchTerm}`);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    return (
        <div className="space-y-24 pb-20">
            {/* SEO Hero — primary semantic H1 for search engines + AI search.
                Sentiasa render (above carousel/standard hero) supaya crawlers
                jumpa H1 + keywords on every page load. Decorative hero below
                guna div aria-hidden untuk elak double-H1. */}
            <section
                aria-labelledby="seo-hero-h1"
                className="relative pt-2 md:pt-6 pb-2"
            >
                <div className="max-w-4xl mx-auto text-center space-y-6 px-2">
                    <h1
                        id="seo-hero-h1"
                        className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-display font-black text-white tracking-tighter leading-[1.05] uppercase italic"
                    >
                        Official <span className="text-gradient">Marathon</span> &amp; Running Event Photos <span className="text-gradient">Malaysia</span>
                    </h1>
                    <p className="text-base md:text-lg text-slate-300 font-medium max-w-3xl mx-auto leading-relaxed">
                        Search and download official marathon, fun run, cycling, and running event photos across Malaysia.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <Link
                            to="/events"
                            aria-label="Search marathon and running event photos across Malaysia"
                            className="premium-btn-primary inline-flex items-center gap-2"
                        >
                            <Search className="w-4 h-4" aria-hidden="true" />
                            Search Event Photos
                        </Link>
                        <Link
                            to="/events"
                            aria-label="Browse latest marathon and running events in Malaysia"
                            className="premium-btn-outline inline-flex items-center gap-2"
                        >
                            Browse Latest Events
                            <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Event Carousel for Highlighted Events */}
            {highlightedEvents.length > 0 ? (
                <div className="mb-24">
                    <EventCarousel events={highlightedEvents} />
                </div>
            ) : (
                /* Standard Hero only if no Highlighted Events */
                <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden rounded-[3rem] bg-ohmai-charcoal text-white p-8 md:p-16">
                    {/* Abstract Background Elements */}
                    <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />

                    <div className="relative z-10 max-w-4xl w-full text-center space-y-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-primary text-xs font-bold uppercase tracking-widest"
                        >
                            <Sparkles className="w-4 h-4" />
                            Capture the Moment
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-5xl md:text-7xl lg:text-8xl font-display font-black tracking-tighter leading-none uppercase italic"
                        >
                            Marathon<span className="text-gradient pr-4">Hub</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium"
                        >
                            The extreme hub for racing events and high-octane photography.
                            Relive the fire from your last finish line.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="max-w-2xl mx-auto mt-12"
                        >
                            <form onSubmit={handleSearch} className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-ohmai-orange to-accent rounded-3xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative flex items-center bg-ohmai-charcoal-light border border-white/5 rounded-2xl p-2 shadow-2xl">
                                    <Search className="absolute left-6 w-5 h-5 text-slate-500" />
                                    <input
                                        type="text"
                                        className="w-full pl-14 pr-4 py-4 bg-transparent text-white placeholder:text-slate-500 outline-none font-medium"
                                        placeholder="Cari nama event atau organizer"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="premium-btn-primary py-3 px-8 hidden sm:flex"
                                    >
                                        Explore
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* This Week's Races — auto-curated, ≤7 days away */}
            {thisWeekEvents.length > 0 && (
                <motion.section
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                >
                    <div className="flex items-end justify-between mb-10">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
                                <Flame className="w-3.5 h-3.5" />
                                Minggu Ni
                            </div>
                            <h2 className="text-3xl font-display font-black text-white tracking-tight italic uppercase">This Week's Races</h2>
                            <p className="text-slate-400 font-medium">Acara dalam 7 hari akan datang.</p>
                        </div>
                    </div>

                    <div className="grid gap-8 md:grid-cols-3">
                        {thisWeekEvents.slice(0, 6).map(event => {
                            const countdown = daysFromNow(event.date);
                            return (
                                <motion.div key={event.id} variants={itemVariants} className="relative">
                                    {countdown && (
                                        <div className="absolute -top-3 -right-3 z-10 px-3 py-1.5 rounded-full bg-primary text-ohmai-charcoal text-xs font-black uppercase tracking-wide shadow-lg shadow-primary/30">
                                            {countdown}
                                        </div>
                                    )}
                                    <EventCard event={event} />
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.section>
            )}

            {/* Upcoming Events */}
            <motion.section
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
            >
                <div className="flex items-end justify-between mb-10">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-display font-black text-white tracking-tight italic uppercase">Upcoming Challenges</h2>
                        <p className="text-slate-400 font-medium">Ready for your next start line?</p>
                    </div>
                    <Link to="/events" className="group flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all duration-300">
                        Browse all <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {loadingUpcoming
                        ? Array.from({ length: 3 }).map((_, i) => <EventCardSkeleton key={`sk-up-${i}`} />)
                        : laterUpcoming.map(event => (
                            <motion.div key={event.id} variants={itemVariants}>
                                <EventCard event={event} />
                            </motion.div>
                        ))}
                    {!loadingUpcoming && laterUpcoming.length === 0 && thisWeekEvents.length === 0 && (
                        <div className="col-span-full py-20 text-center glass-card bg-slate-50/50">
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-bold">No upcoming events scheduled yet.</p>
                        </div>
                    )}
                </div>
            </motion.section>

            {/* Recent Events & Photos */}
            <motion.section
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
            >
                <div className="flex items-end justify-between mb-10">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-display font-black text-white tracking-tight italic uppercase">Recent Galleries</h2>
                        <p className="text-slate-400 font-medium">Find your race day photos here.</p>
                    </div>
                    <Link to="/events?status=Past" className="group flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all duration-300">
                        View history <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {loadingRecent
                        ? Array.from({ length: 3 }).map((_, i) => <EventCardSkeleton key={`sk-re-${i}`} />)
                        : recentEvents.map(event => (
                            <motion.div key={event.id} variants={itemVariants}>
                                <EventCard event={event} />
                            </motion.div>
                        ))}
                    {!loadingRecent && recentEvents.length === 0 && (
                        <div className="col-span-full py-20 text-center glass-card border-dashed">
                            <Camera className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-bold">Galleries will appear here after the races.</p>
                        </div>
                    )}
                </div>
            </motion.section>

            {/* SEO: About MarathonHub — entity-rich Malay+English copy
                aimed at Google + ChatGPT/Claude/Perplexity. Plain prose
                (no fancy framer-motion) so the crawler-prerendered HTML
                already contains the keywords on first paint. */}
            <section
                aria-labelledby="about-heading"
                className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 space-y-8"
            >
                <div className="text-center space-y-3">
                    <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
                        About MarathonHub
                    </p>
                    <h2 id="about-heading" className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter uppercase italic">
                        Malaysia&rsquo;s Official Marathon &amp; Running Event Photo Platform
                    </h2>
                </div>

                <div className="prose prose-invert max-w-none text-slate-300 font-medium leading-relaxed space-y-5 text-base md:text-lg">
                    <p>
                        <strong>MarathonHub</strong> is the official directory of
                        marathon, running, and cycling event photography in
                        Malaysia, built and operated by{' '}
                        <strong>OhMaiShoot</strong>. We connect runners,
                        cyclists, and weekend warriors with the verified race
                        photographers who covered their event &mdash; so finding
                        and downloading your official race photos takes seconds,
                        not hours.
                    </p>
                    <p>
                        Every event listed on MarathonHub is matched to one or
                        more <strong>official Malaysian race photographers</strong>:
                        full marathons, half marathons, 10K, 5K fun runs, trail
                        runs, ultra-marathons, road cycling events, MTB rides,
                        triathlons, and corporate runs. Search by event name,
                        bib number, or upload a selfie for free face-search and
                        we route you straight to the official photographer&rsquo;s
                        gallery.
                    </p>
                    <p>
                        We cover races across the country &mdash; Kuala Lumpur,
                        Putrajaya, Selangor, Penang, Kedah, Johor, Sabah, and
                        Sarawak &mdash; from major events like Standard Chartered
                        KL Marathon and Twincity Marathon to community
                        Sunday-morning fun runs and university ultra series.
                        New events go live on MarathonHub as their galleries
                        are uploaded.
                    </p>
                    <p>
                        MarathonHub is part of the <strong>OhMaiShoot</strong>{' '}
                        running &amp; sports photography ecosystem. We do not
                        host or sell photos directly; instead we send traffic
                        to the photographer who shot your race. That keeps the
                        photographer&rsquo;s pricing, watermark, and gallery
                        rules intact, and means you always buy from the original
                        creator &mdash; never a third party reseller.
                    </p>
                </div>

                <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <li className="rounded-2xl bg-white/5 border border-white/5 p-4">
                        <p className="text-primary font-bold uppercase text-xs tracking-widest mb-1">
                            For Runners
                        </p>
                        <p className="text-slate-300 font-medium leading-relaxed">
                            Find your official marathon, half-marathon, 10K, and fun-run photos by event, bib, or face-search.
                        </p>
                    </li>
                    <li className="rounded-2xl bg-white/5 border border-white/5 p-4">
                        <p className="text-primary font-bold uppercase text-xs tracking-widest mb-1">
                            For Cyclists
                        </p>
                        <p className="text-slate-300 font-medium leading-relaxed">
                            Browse photos from road cycling events, MTB rides, and gran-fondos covered by Malaysian sports photographers.
                        </p>
                    </li>
                    <li className="rounded-2xl bg-white/5 border border-white/5 p-4">
                        <p className="text-primary font-bold uppercase text-xs tracking-widest mb-1">
                            For Photographers
                        </p>
                        <p className="text-slate-300 font-medium leading-relaxed">
                            Get your race-day galleries discovered. Apply via OhMaiShoot to be listed on MarathonHub.
                        </p>
                    </li>
                </ul>
            </section>

            {/* SEO + GEO: FAQ section — visible to humans, machine-readable
                JSON-LD for Google rich results + AI search engines. */}
            <section
                aria-labelledby="faq-heading"
                className="rounded-[3rem] border border-white/5 bg-ohmai-charcoal-light p-8 md:p-14"
            >
                <div className="max-w-3xl mx-auto space-y-10">
                    <div className="text-center space-y-3">
                        <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
                            FAQ
                        </p>
                        <h2 id="faq-heading" className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter uppercase italic">
                            How MarathonHub Works
                        </h2>
                        <p className="text-slate-400 font-medium">
                            Quick answers about searching and downloading official marathon and running event photos in Malaysia.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <details className="group rounded-2xl bg-white/5 border border-white/5 p-5 open:border-primary/30 transition-colors">
                            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-white font-bold">
                                <span>How do I search my marathon photos?</span>
                                <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-45">+</span>
                            </summary>
                            <p className="mt-3 text-slate-300 font-medium leading-relaxed">
                                Open the event page on MarathonHub, then use either the bib-number search or upload a selfie for free face-search.
                                MarathonHub then routes you to the official photographer&rsquo;s gallery where your race photos can be previewed and bought.
                            </p>
                        </details>

                        <details className="group rounded-2xl bg-white/5 border border-white/5 p-5 open:border-primary/30 transition-colors">
                            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-white font-bold">
                                <span>When are race photos uploaded after the event?</span>
                                <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-45">+</span>
                            </summary>
                            <p className="mt-3 text-slate-300 font-medium leading-relaxed">
                                Most official race photographers in Malaysia upload finish-line and on-course photos within 24&ndash;72 hours of the event.
                                Larger marathons may take up to a week. MarathonHub auto-updates each event page as the official galleries go live.
                            </p>
                        </details>

                        <details className="group rounded-2xl bg-white/5 border border-white/5 p-5 open:border-primary/30 transition-colors">
                            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-white font-bold">
                                <span>Are the marathon photos free to view?</span>
                                <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-45">+</span>
                            </summary>
                            <p className="mt-3 text-slate-300 font-medium leading-relaxed">
                                Yes &mdash; previews are free. Each runner can browse low-resolution watermarked previews on the official photographer&rsquo;s gallery for free.
                                High-resolution downloads are sold by each photographer at their own price (typically RM10&ndash;RM50 per photo, packages cheaper).
                            </p>
                        </details>

                        <details className="group rounded-2xl bg-white/5 border border-white/5 p-5 open:border-primary/30 transition-colors">
                            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-white font-bold">
                                <span>How do I download my running event photos?</span>
                                <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-45">+</span>
                            </summary>
                            <p className="mt-3 text-slate-300 font-medium leading-relaxed">
                                On the event page, click <em>Get Your Photos</em> next to the photographer covering your race.
                                You will be taken to the official photographer&rsquo;s gallery where you can search by bib number, browse,
                                buy, and download your high-resolution marathon photos directly &mdash; no MarathonHub account needed.
                            </p>
                        </details>

                        <details className="group rounded-2xl bg-white/5 border border-white/5 p-5 open:border-primary/30 transition-colors">
                            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-white font-bold">
                                <span>Which races does MarathonHub cover in Malaysia?</span>
                                <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-45">+</span>
                            </summary>
                            <p className="mt-3 text-slate-300 font-medium leading-relaxed">
                                MarathonHub indexes official marathon, half marathon, fun run, trail run, and cycling events across Malaysia &mdash;
                                including Kuala Lumpur, Putrajaya, Penang, Kedah, Johor, Sabah, and Sarawak. Browse the
                                <Link to="/events" className="text-primary hover:underline mx-1">events directory</Link>
                                for the full list.
                            </p>
                        </details>
                    </div>
                </div>

                {/* JSON-LD: FAQPage + WebSite SearchAction for Google rich
                    results and AI search engines (Perplexity, Gemini, ChatGPT). */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@graph': [
                                {
                                    '@type': 'WebSite',
                                    '@id': 'https://marathonhub.ohmaishoot.com/#website',
                                    url: 'https://marathonhub.ohmaishoot.com/',
                                    name: 'MarathonHub',
                                    description:
                                        'Official Marathon & Running Event Photos Malaysia. Search and download marathon, fun run, cycling, and running event photos across Malaysia.',
                                    inLanguage: ['en-MY', 'ms-MY'],
                                    publisher: {
                                        '@type': 'Organization',
                                        name: 'OhMaiShoot',
                                        url: 'https://ohmaishoot.com/',
                                    },
                                    potentialAction: {
                                        '@type': 'SearchAction',
                                        target: {
                                            '@type': 'EntryPoint',
                                            urlTemplate:
                                                'https://marathonhub.ohmaishoot.com/events?search={search_term_string}',
                                        },
                                        'query-input': 'required name=search_term_string',
                                    },
                                },
                                {
                                    '@type': 'FAQPage',
                                    mainEntity: [
                                        {
                                            '@type': 'Question',
                                            name: 'How do I search my marathon photos?',
                                            acceptedAnswer: {
                                                '@type': 'Answer',
                                                text: 'Open the event page on MarathonHub, then use bib-number search or upload a selfie for free face-search. MarathonHub routes you to the official photographer’s gallery where your race photos can be previewed and bought.',
                                            },
                                        },
                                        {
                                            '@type': 'Question',
                                            name: 'When are race photos uploaded after the event?',
                                            acceptedAnswer: {
                                                '@type': 'Answer',
                                                text: 'Most official race photographers in Malaysia upload photos within 24–72 hours of the event. MarathonHub auto-updates each event page as official galleries go live.',
                                            },
                                        },
                                        {
                                            '@type': 'Question',
                                            name: 'Are the marathon photos free to view?',
                                            acceptedAnswer: {
                                                '@type': 'Answer',
                                                text: 'Yes — low-resolution watermarked previews are free on each photographer’s official gallery. High-resolution downloads are sold by each photographer at their own price.',
                                            },
                                        },
                                        {
                                            '@type': 'Question',
                                            name: 'How do I download my running event photos?',
                                            acceptedAnswer: {
                                                '@type': 'Answer',
                                                text: 'On an event page, click Get Your Photos next to the photographer covering your race. You will be taken to the official photographer’s gallery to search by bib number, buy, and download high-resolution marathon photos directly.',
                                            },
                                        },
                                        {
                                            '@type': 'Question',
                                            name: 'Which races does MarathonHub cover in Malaysia?',
                                            acceptedAnswer: {
                                                '@type': 'Answer',
                                                text: 'MarathonHub covers official marathon, half marathon, fun run, trail run, and cycling events across Malaysia — including Kuala Lumpur, Putrajaya, Penang, Kedah, Johor, Sabah, and Sarawak.',
                                            },
                                        },
                                    ],
                                },
                            ],
                        }),
                    }}
                />
            </section>

            {/* CTA Section */}
            <section className="relative py-24 px-8 rounded-[3rem] border border-white/5 bg-ohmai-charcoal-light overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 skew-x-12 transform origin-top pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-1/3 h-full bg-accent/5 -skew-x-12 transform origin-bottom pointer-events-none" />

                <div className="relative z-10 text-center space-y-8 max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter uppercase italic">
                        Be <span className="text-gradient">Extreme</span>
                    </h2>
                    <p className="text-xl text-slate-400 font-medium">
                        Join the fastest growing platform for race photographers and athletes.
                    </p>
                    <div className="flex flex-wrap justify-center gap-6 pt-4">
                        <button className="premium-btn-primary">
                            Partner With Us
                        </button>
                        <Link to="/photographers" className="premium-btn-outline">
                            View Photographers
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
