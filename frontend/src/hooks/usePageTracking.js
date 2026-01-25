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
        } else if (path.match(/^\/events\/\d+/)) {
            entity_type = 'event';
            entity_id = parseInt(path.split('/')[2]);
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

        api.post('/track', {
            path,
            entity_type: entity_type || 'page',
            entity_id
        }).catch(err => console.error("Tracking failed", err));

    }, [location]);
}
