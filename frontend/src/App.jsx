import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AdminNavbar from './components/AdminNavbar';
import usePageTracking from './hooks/usePageTracking';

// Public pages — eagerly loaded since most users land here.
import Home from './pages/Home';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import PhotographerList from './pages/PhotographerList';
import PhotographerDetail from './pages/PhotographerDetail';
import BlogList from './pages/BlogList';
import BlogDetail from './pages/BlogDetail';
import OrganizerLanding from './pages/OrganizerLanding';

// Admin pages — code-split into a separate chunk. Public visitors
// (the vast majority) never download admin code, cutting initial JS
// from ~786 KB to ~250-300 KB.
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'));
const AdminEventEdit = lazy(() => import('./pages/admin/AdminEventEdit'));
const AdminPhotographers = lazy(() => import('./pages/admin/AdminPhotographers'));
const AdminPhotographerEdit = lazy(() => import('./pages/admin/AdminPhotographerEdit'));
const AdminAssignments = lazy(() => import('./pages/admin/AdminAssignments'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminEventAnalytics = lazy(() => import('./pages/admin/AdminEventAnalytics'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/admin/login" replace />;
    }
    return children;
};

// Simple Admin Layout Wrapper
const AdminLayout = ({ children }) => (
    <div className="min-h-screen bg-[#0B0F1A] font-sans text-white">
        <AdminNavbar />
        <div className="pt-28 pb-10">
            <div className="max-w-7xl mx-auto p-4 sm:p-8">
                {children}
            </div>
        </div>
    </div>
);

// Lightweight loader shown while admin chunk is fetched.
const AdminFallback = () => (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center text-slate-400">
        <div className="animate-pulse text-sm">Loading…</div>
    </div>
);

function App() {
    usePageTracking();
    return (
        <Suspense fallback={<AdminFallback />}>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="events" element={<EventList />} />
                    <Route path="events/:slug" element={<EventDetail />} />
                    <Route path="photographers" element={<PhotographerList />} />
                    <Route path="photographers/:id" element={<PhotographerDetail />} />
                    <Route path="blog" element={<BlogList />} />
                    <Route path="blog/:slug" element={<BlogDetail />} />
                    <Route path="for-organizers" element={<OrganizerLanding />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />

                <Route path="/admin" element={<ProtectedRoute><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />

                <Route path="/admin/events" element={<ProtectedRoute><AdminLayout><AdminEvents /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/events/new" element={<ProtectedRoute><AdminLayout><AdminEventEdit /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/events/edit/:id" element={<ProtectedRoute><AdminLayout><AdminEventEdit /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/events/:eventId/assignments" element={<ProtectedRoute><AdminLayout><AdminAssignments /></AdminLayout></ProtectedRoute>} />

                <Route path="/admin/photographers" element={<ProtectedRoute><AdminLayout><AdminPhotographers /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/photographers/new" element={<ProtectedRoute><AdminLayout><AdminPhotographerEdit /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/photographers/edit/:id" element={<ProtectedRoute><AdminLayout><AdminPhotographerEdit /></AdminLayout></ProtectedRoute>} />

                <Route path="/admin/analytics" element={<ProtectedRoute><AdminLayout><AdminAnalytics /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/analytics/event/:eventId" element={<ProtectedRoute><AdminLayout><AdminEventAnalytics /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />
            </Routes>
        </Suspense>
    );
}

export default App;
