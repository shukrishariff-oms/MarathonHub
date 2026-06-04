import { useEffect } from 'react';
import api from '../api';

export default function AnalyticsScripts() {
    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const res = await api.get('/site-settings');
                const { google_analytics_id, meta_pixel_id } = res.data;

                // Inject Google Analytics (GA4)
                if (google_analytics_id && !document.getElementById('ga-script')) {
                    const script1 = document.createElement('script');
                    script1.id = 'ga-script';
                    script1.async = true;
                    script1.src = `https://www.googletagmanager.com/gtag/js?id=${google_analytics_id}`;
                    document.head.appendChild(script1);

                    const script2 = document.createElement('script');
                    script2.id = 'ga-init';
                    script2.innerHTML = `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${google_analytics_id}');
                    `;
                    document.head.appendChild(script2);
                }

                // Inject Meta Pixel
                if (meta_pixel_id && !document.getElementById('meta-pixel')) {
                    const script = document.createElement('script');
                    script.id = 'meta-pixel';
                    script.innerHTML = `
                        !function(f,b,e,v,n,t,s)
                        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                        n.queue=[];t=b.createElement(e);t.async=!0;
                        t.src=v;s=b.getElementsByTagName(e)[0];
                        s.parentNode.insertBefore(t,s)}(window, document,'script',
                        'https://connect.facebook.net/en_US/fbevents.js');
                        fbq('init', '${meta_pixel_id}');
                        fbq('track', 'PageView');
                    `;
                    document.head.appendChild(script);

                    // Add noscript fallback for Meta Pixel
                    const noscript = document.createElement('noscript');
                    const img = document.createElement('img');
                    img.height = 1;
                    img.width = 1;
                    img.style.display = 'none';
                    img.src = `https://www.facebook.com/tr?id=${meta_pixel_id}&ev=PageView&noscript=1`;
                    noscript.appendChild(img);
                    document.body.appendChild(noscript);
                }
            } catch (err) {
                console.error('Failed to load analytics settings', err);
            }
        };

        loadAnalytics();
    }, []);

    return null; // This component doesn't render anything visible
}
