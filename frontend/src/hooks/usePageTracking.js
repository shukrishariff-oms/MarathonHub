import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';

export default function usePageTracking() {
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;
        let entity_type = 'other';
        let entity_id = null;

        if (path === '/') {
            entity_type = 'home';
        } else if (path.startsWith('/events/') && path.split('/').length === 3) {
            // /events/:id or /events (list)
            // wait, /events is list. /events/123 is detail
            const parts = path.split('/');
            const id = parseInt(parts[2]);
            if (!isNaN(id)) {
                entity_type = 'event';
                entity_id = id;
            } else if (parts.length === 2 && parts[1] === 'events') {
                // /events
                entity_type = 'event_list';
            }
        } else if (path.startsWith('/photographers')) {
            const parts = path.split('/');
            if (parts.length === 3) {
                const id = parseInt(parts[2]);
                if (!isNaN(id)) {
                    entity_type = 'photographer';
                    entity_id = id;
                }
            } else {
                entity_type = 'photographer_list';
            }
        }

        // Don't track admin pages or login
        if (path.startsWith('/admin')) return;

        api.post('/track', {
            path,
            entity_type: entity_type || 'page',
            entity_id
        }).catch(err => console.error("Tracking failed", err));

    }, [location]);
}
