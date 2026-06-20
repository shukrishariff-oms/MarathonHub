import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';

export default function usePageTracking() {
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;
        let entity_type = 'other';
        let entity_id = null;
        let event_id = null;

        if (path === '/') {
            entity_type = 'home';
        } else if (path.match(/^\/events\/\d+/)) {
            // Numeric event URL: /events/24 — full tracking here
            entity_type = 'event';
            entity_id = parseInt(path.split('/')[2]);
            event_id = entity_id;
        } else if (path.match(/^\/events\/[a-zA-Z0-9-]+/)) {
            // SEO slug URL: /events/putrajaya-10k-run-2026
            // Skip — EventDetail.jsx fires its own track call with event_id.
            // The hook can't extract ID from slug.
            return;
        } else if (path.match(/^\/events(\/)?$/)) {
            entity_type = 'event_list';
        } else if (path.match(/^\/photographers\/\d+/)) {
            entity_type = 'photographer';
            entity_id = parseInt(path.split('/')[2]);
        } else if (path.match(/^\/photographers(\/)?$/)) {
            entity_type = 'photographer_list';
        }

        // Don't track admin pages or login
        if (path.startsWith('/admin')) return;

        const payload = {
            path,
            entity_type: entity_type || 'page',
            entity_id
        };
        if (event_id !== null) payload.event_id = event_id;

        api.post('/track', payload).catch(err => console.error("Tracking failed", err));

    }, [location]);
}
