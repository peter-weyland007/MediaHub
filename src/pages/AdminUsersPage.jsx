import React, { useEffect, useMemo, useState } from 'react';
import { Shield, UserPlus } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminUsersApi } from '@/lib/authApi';

const emptyForm = {
  username: '',
  password: '',
  role: 'viewer',
  enabled: true,
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminUsersApi.list();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const roleOptions = useMemo(() => ['admin', 'operator', 'viewer'], []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await adminUsersApi.create(form);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickUpdate = async (user, changes) => {
    setSaving(true);
    setError('');
    try {
      await adminUsersApi.update(user.id, {
        username: user.username,
        role: changes.role ?? user.role,
        enabled: changes.enabled ?? user.enabled,
      });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Admins can add users, assign roles, and disable access"
        icon={Shield}
        accentColor="bg-primary/10"
      />

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Add User</h2>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
              {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))} />
            Enabled
          </label>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={saving}>Create User</Button>
        </form>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Users</h2>
            <Button variant="outline" size="sm" onClick={load} disabled={loading || saving}>Refresh</Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users…</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="rounded-lg border border-border/60 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">Role: {user.role} • {user.enabled ? 'Enabled' : 'Disabled'}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={user.role} onChange={(e) => handleQuickUpdate(user, { role: e.target.value })}>
                      {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                    <Button variant="outline" size="sm" onClick={() => handleQuickUpdate(user, { enabled: !user.enabled })}>
                      {user.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
