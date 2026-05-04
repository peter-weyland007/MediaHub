import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MonitorPlay, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const { login, isAuthenticated, isLoadingAuth, authChecked } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (authChecked && isAuthenticated) {
    return <Navigate to={location.state?.from || '/'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(username, password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
            <MonitorPlay className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">MediaHub Login</h1>
            <p className="text-sm text-muted-foreground">Sign in to manage the app.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Username</label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {isLoadingAuth && !authChecked ? <p className="text-sm text-muted-foreground">Checking session…</p> : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          <LogIn className="w-4 h-4" />
          {submitting ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </div>
  );
}
