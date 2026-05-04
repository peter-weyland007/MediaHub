import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import AppLayout from '@/components/layout/AppLayout';
import PageNotFound from '@/lib/PageNotFound';
import Dashboard from '@/pages/Dashboard';
import Movies from '@/pages/Movies';
import MovieDetails from '@/pages/MovieDetails';
import TvShows from '@/pages/TvShows';
import TvShowDetails from '@/pages/TvShowDetails';
import TvSeasonDetails from '@/pages/TvSeasonDetails';
import TvEpisodeDetails from '@/pages/TvEpisodeDetails';
import TvCleanupQueue from '@/pages/TvCleanupQueue';
import MusicPage from '@/pages/MusicPage';
import Requests from '@/pages/Requests';
import PlexLibrary from '@/pages/PlexLibrary';
import Indexers from '@/pages/Indexers';
import SettingsPage from '@/pages/SettingsPage';
import QualityManager from '@/pages/QualityManager';
import LoginPage from '@/pages/LoginPage';
import AdminUsersPage from '@/pages/AdminUsersPage';

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/movies" element={<Movies />} />
                <Route path="/movies/:id" element={<MovieDetails />} />
                <Route path="/tv-shows" element={<TvShows />} />
                <Route path="/tv-shows/:id" element={<TvShowDetails />} />
                <Route path="/tv-shows/:id/seasons/:seasonNumber" element={<TvSeasonDetails />} />
                <Route path="/tv-shows/:id/episodes/:episodeId" element={<TvEpisodeDetails />} />
                <Route path="/tv-cleanup" element={<TvCleanupQueue />} />
                <Route path="/music" element={<MusicPage />} />
                <Route path="/requests" element={<Requests />} />
                <Route path="/library" element={<PlexLibrary />} />
                <Route path="/indexers" element={<Indexers />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/quality" element={<QualityManager />} />
                <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
              </Route>
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
