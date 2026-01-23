import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function HighlightCarousel({ images = [], eventName, eventDate }) {
    // If no images, default to a placeholder or empty
    const displayImages = images.length > 0 ? images : ['https://via.placeholder.com/800x600/333/fff?text=No+Highlight+Images'];

    return (
        <section className="relative w-full h-[85vh] md:h-[90vh] overflow-hidden bg-black">
            {/* Background Gradient Overlay for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/50 to-transparent z-20 pointer-events-none" />

            {/* Horizontal Scroll Container */}
            <div className="relative w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                {displayImages.map((img, index) => (
                    <div
                        key={index}
                        className="relative min-w-full h-full snap-center flex-shrink-0"
                    >
                        <img
                            src={img}
                            alt={`Highlight ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                        {/* Optional: Darken individual images slightly? */}
                        <div className="absolute inset-0 bg-black/20" />
                    </div>
                ))}
            </div>

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 w-full z-30 pb-24 md:pb-32 px-6 container mx-auto">
                <div className="max-w-4xl mx-auto text-center md:text-left">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center px-3 py-1 rounded-full bg-primary/20 border border-primary/50 backdrop-blur-sm mb-4"
                    >
                        <span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />
                        <span className="text-primary text-xs font-bold uppercase tracking-wider">Featured Event</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-tight mb-2 uppercase italic tracking-tighter drop-shadow-lg"
                    >
                        {eventName}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-xl md:text-2xl text-slate-200 font-medium mb-8"
                    >
                        {eventDate && new Date(eventDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <button
                            onClick={() => document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-primary text-ohmai-charcoal font-black text-lg px-8 py-4 rounded-full shadow-lg shadow-primary/25 hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
                        >
                            Explore Gallery
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* Slide Indicators */}
            {displayImages.length > 1 && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex space-x-2">
                    {displayImages.map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-white/50" />
                        // Note: Active indicator logic would require tracking scroll state, 
                        // keeping it simple for now or strictly purely relying on browser scroll snap
                    ))}
                    {/* For a true active indicator we'd need an IntersectionObserver or onScroll handler */}
                </div>
            )}
        </section>
    );
}
