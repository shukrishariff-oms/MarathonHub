import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventCarousel({ events = [] }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    // Auto-advance carousel every 5 seconds
    useEffect(() => {
        if (events.length <= 1) return;

        const timer = setInterval(() => {
            next();
        }, 5000);

        return () => clearInterval(timer);
    }, [currentIndex, events.length]);

    const next = () => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % events.length);
    };

    const prev = () => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
    };

    const goToSlide = (index) => {
        setDirection(index > currentIndex ? 1 : -1);
        setCurrentIndex(index);
    };

    if (events.length === 0) return null;

    const currentEvent = events[currentIndex];

    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            x: direction > 0 ? -1000 : 1000,
            opacity: 0
        })
    };

    return (
        <section className="relative w-full h-[65vh] md:h-[70vh] overflow-hidden bg-ohmai-charcoal rounded-[3rem] mx-4 md:mx-8">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        className="absolute inset-0"
                    >
                        {currentEvent.cover_image_url ? (
                            <>
                                <img
                                    src={currentEvent.cover_image_url}
                                    alt={currentEvent.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40" />
                            </>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/50 to-transparent z-10 pointer-events-none" />

            {/* Navigation Buttons */}
            {events.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 group"
                        aria-label="Previous event"
                    >
                        <ChevronLeft className="w-6 h-6 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 group"
                        aria-label="Next event"
                    >
                        <ChevronRight className="w-6 h-6 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
                    </button>
                </>
            )}

            {/* Content */}
            <div className="absolute bottom-0 left-0 w-full z-20 pb-16 md:pb-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                        >
                            {/* Featured Badge */}
                            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/20 border border-primary/50 backdrop-blur-sm">
                                <span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />
                                <span className="text-primary text-xs md:text-sm font-bold uppercase tracking-wider">Featured Event</span>
                            </div>

                            {/* Event Name */}
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight uppercase italic tracking-tighter drop-shadow-2xl">
                                {currentEvent.name}
                            </h1>

                            {/* Event Date */}
                            <p className="text-lg md:text-xl text-slate-200 font-medium">
                                {new Date(currentEvent.date.endsWith('Z') ? currentEvent.date : currentEvent.date + 'Z').toLocaleDateString(undefined, {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>

                            {/* Event Description */}
                            {currentEvent.description && (
                                <p className="text-sm md:text-base text-slate-300 max-w-2xl line-clamp-2">
                                    {currentEvent.description}
                                </p>
                            )}

                            {/* CTA Button */}
                            <div className="pt-4">
                                <a
                                    href={`/events/${currentEvent.id}`}
                                    className="inline-block bg-primary text-ohmai-charcoal font-black text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-full shadow-lg shadow-primary/25 hover:bg-white hover:scale-105 transition-all duration-300"
                                >
                                    Explore Gallery
                                </a>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Slide Indicators (Dots) */}
            {events.length > 1 && (
                <div className="absolute bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex space-x-2">
                    {events.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex
                                ? 'w-8 bg-primary'
                                : 'w-2 bg-white/40 hover:bg-white/60'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
