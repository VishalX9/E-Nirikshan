'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

const DEPARTMENTS = [
  'Public Works',
  'PWD',
  'Transport',
  'Education',
  'Health',
  'Finance',
  'Administration',
  'IT & Technology',
  'Human Resources',
  'Other'
];

const POSITIONS = [
  'Officer',
  'Clerk',
  'Engineer',
  'Head',
  'Manager',
  'Assistant',
  'Supervisor',
  'Director',
  'Specialist',
  'Other'
];

export default function ProfilePage() {
  const { user, token, loading, refresh } = useAuth({ requireAuth: true, redirectTo: '/login' });
  const { showToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? '',
    department: user?.department ?? '',
    position: user?.position ?? '',
  });

  useEffect(() => {
    if (user && user.role !== 'admin') {
      setProfileForm({
        name: user.name,
        department: user.department ?? '',
        position: user.position ?? '',
      });
    } else if (user && user.role === 'admin') {
      setProfileForm({ name: user.name, department: '', position: '' });
    }
  }, [user]);

  const updateField = async (field: string, value: string) => {
    if (!token) return;

    setIsUpdating(true);
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');

      showToast({
        title: 'Profile updated',
        variant: 'success',
        description: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully.`,
      });
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update profile';
      showToast({ title: 'Update failed', description: message, variant: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNameUpdate = async () => {
    if (!profileForm.name.trim()) {
      showToast({ title: 'Invalid name', description: 'Name cannot be empty', variant: 'error' });
      return;
    }
    await updateField('name', profileForm.name);
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm font-medium text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="My Profile"
      description="Manage your personal information and keep your details up to date."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50 to-white px-6 py-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-2xl font-bold text-white shadow-lg">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">{user.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                <span
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    user.role === 'admin'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        user.role === 'admin'
                          ? 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                          : 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                      }
                    />
                  </svg>
                  {user.role}
                </span>
              </div>
            </div>
            <div className="p-6">
              <dl className="space-y-4">
                {user.role !== 'admin' && (
                  <>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                      <dt className="flex items-center gap-2 text-sm font-medium text-slate-600">Department</dt>
                      <dd className="text-sm font-semibold text-slate-900">{user.department || 'Not set'}</dd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                      <dt className="flex items-center gap-2 text-sm font-medium text-slate-600">Position</dt>
                      <dd className="text-sm font-semibold text-slate-900">{user.position || 'Not set'}</dd>
                    </div>
                  </>
                )}
                {user.employerType && user.role !== 'admin' && (
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                    <dt className="flex items-center gap-2 text-sm font-medium text-slate-600">Employer Type</dt>
                    <dd className="text-sm font-semibold text-slate-900">{user.employerType}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <dt className="flex items-center gap-2 text-sm font-medium text-slate-600">Member since</dt>
                  <dd className="text-sm font-semibold text-slate-900">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {user.role !== 'admin' && (
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-6 py-4">
                  <h2 className="text-base font-semibold text-slate-900">Edit Profile</h2>
                  <p className="mt-1 text-sm text-slate-600">Update your personal information</p>
                </div>
                <div className="p-6">
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="name" className="block text-xs font-medium text-slate-700 mb-1.5">
                        Full Name
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="name"
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                        />
                        <button
                          type="button"
                          onClick={handleNameUpdate}
                          disabled={isUpdating || profileForm.name === user.name}
                          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                          Update
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="department" className="block text-xs font-medium text-slate-700 mb-1.5">
                          Department
                        </label>
                        <select
                          id="department"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50"
                          value={profileForm.department}
                          onChange={(e) => {
                            setProfileForm((p) => ({ ...p, department: e.target.value }));
                            updateField('department', e.target.value);
                          }}
                        >
                          <option value="">Select Department</option>
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="position" className="block text-xs font-medium text-slate-700 mb-1.5">
                          Position
                        </label>
                        <select
                          id="position"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50"
                          value={profileForm.position}
                          onChange={(e) => {
                            setProfileForm((p) => ({ ...p, position: e.target.value }));
                            updateField('position', e.target.value);
                          }}
                        >
                          <option value="">Select Position</option>
                          {POSITIONS.map((pos) => (
                            <option key={pos} value={pos}>
                              {pos}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {isUpdating && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                        Updating...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
