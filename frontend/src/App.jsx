import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import PhotographerList from './pages/PhotographerList';
import PhotographerDetail from './pages/PhotographerDetail';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import AdminEventEdit from './pages/admin/AdminEventEdit';
import AdminPhotographers from './pages/admin/AdminPhotographers';
import AdminPhotographerEdit from './pages/admin/AdminPhotographerEdit';
import AdminAssignments from './pages/admin/AdminAssignments';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminEventAnalytics from './pages/admin/AdminEventAnalytics';
import AdminSettings from './pages/admin/AdminSettings';

// Protected Route Wrapper
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/admin/login" replace />;
    }
    return children;
};

import AdminNavbar from './components/AdminNavbar';

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

import usePageTracking from './hooks/usePageTracking';

function App() {
    usePageTracking();
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="events" element={<EventList />} />
                <Route path="events/:id" element={<EventDetail />} />
                <Route path="photographers" element={<PhotographerList />} />
                <Route path="photographers/:id" element={<PhotographerDetail />} />
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
    );
}

export default App;
