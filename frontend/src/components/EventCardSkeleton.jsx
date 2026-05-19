import { motion } from 'framer-motion';

/**
 * Shimmer-style skeleton placeholder that mirrors the EventCard layout.
 * Use it on Home / EventList while data is in flight so the page feels
 * instant instead of blank.
 *
 * Usage:
 *   {loading
 *     ? Array.from({ length: 3 }).map((_, i) => <EventCardSkeleton key={i} />)
 *     : events.map(e => <EventCard event={e} />)}
 */
export default function EventCardSkeleton() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="h-full"
        >
            <div className="glass-card relative h-full flex flex-col p-1 overflow-hidden border border-white/5">
                {/* Animated shimmer overlay */}
                <div className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                <div className="relative p-5 flex-grow space-y-4">
                    {/* Header row: status pill + date pill */}
                    <div className="flex justify-between items-center">
                        <div className="h-5 w-20 rounded-full bg-white/10" />
                        <div className="h-5 w-32 rounded-lg bg-white/5" />
                    </div>

                    {/* Title (two lines) */}
                    <div className="space-y-2 pt-2">
                        <div className="h-6 w-3/4 rounded-md bg-white/10" />
                        <div className="h-6 w-1/2 rounded-md bg-white/10" />
                    </div>

                    {/* Location row */}
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-primary/30" />
                        <div className="h-3 w-2/5 rounded bg-white/5" />
                    </div>

                    {/* Distance pills */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        <div className="h-6 w-14 rounded-lg bg-white/5" />
                        <div className="h-6 w-16 rounded-lg bg-white/5" />
                        <div className="h-6 w-12 rounded-lg bg-white/5" />
                    </div>
                </div>

                {/* Footer bar */}
                <div className="px-5 py-4 bg-white/5 border-t border-white/5 flex items-center justify-end">
                    <div className="h-3 w-3 rounded-full bg-white/10" />
                </div>
            </div>
        </motion.div>
    );
}
