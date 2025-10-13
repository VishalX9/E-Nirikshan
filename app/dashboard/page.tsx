"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

interface DashboardStats {
  pendingAPAR?: number;
  pendingKPI?: number;
  activeProjects: number;
  kpiScore?: number;
  aparScore?: number;
  totalScore?: number;
  totalAparScore?: number; // The original APAR score (70-100)
}

export default function DashboardPage() {
  const { user, token, loading } = useAuth({ requireAuth: true, redirectTo: '/login' });
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({ activeProjects: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!token) return;

    const fetchDashboardData = async () => {
      setIsRefreshing(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        if (isAdmin) {
          const [aparRes, kpiRes, projectsRes] = await Promise.all([
            fetch('/api/apar', { headers }),
            fetch('/api/kpi', { headers }),
            fetch('/api/projects', { headers }),
          ]);

          if (!aparRes.ok) throw new Error('Failed to load APAR data');
          if (!kpiRes.ok) throw new Error('Failed to load KPI data');
          if (!projectsRes.ok) throw new Error('Failed to load projects data');

          const [aparData, kpiData, projectsData] = await Promise.all([
            aparRes.json(),
            kpiRes.json(),
            projectsRes.json(),
          ]);

          const pendingAPAR = aparData.data?.filter((a: any) => a.status === 'submitted').length || 0;
          // Count KPIs that need admin action (submitted but not yet completed/approved)
          const pendingKPI = kpiData.data?.filter((k: any) => 
            (k.status === 'submitted' || k.status === 'Submitted') && 
            k.progress < 100
          ).length || 0;
          const activeProjects = projectsData.projects?.filter((p: any) => p.status === 'active' && !p.archived).length || 0;

          setStats({
            pendingAPAR,
            pendingKPI,
            activeProjects,
          });
        } else {
          // Employee view - fetch their personal data
          const userId = user?._id || user?.id;
          
          const [scoresRes, projectsRes, aparRes] = await Promise.all([
            fetch('/api/scores', { headers }),
            fetch('/api/projects', { headers }),
            fetch(`/api/apar?userId=${userId}`, { headers }),
          ]);

          if (!scoresRes.ok) throw new Error('Failed to load scores data');
          if (!projectsRes.ok) throw new Error('Failed to load projects data');
          if (!aparRes.ok) throw new Error('Failed to load APAR data');

          const [scoresData, projectsData, aparData] = await Promise.all([
            scoresRes.json(),
            projectsRes.json(),
            aparRes.json(),
          ]);

          const activeProjects = projectsData.projects?.filter((p: any) => p.status === 'active' && !p.archived).length || 0;
          
          // Get KPI score (out of 70)
          const kpiScore = typeof scoresData.outputScore === 'number' && !isNaN(scoresData.outputScore) ? scoresData.outputScore : 0;
          
          // Get APAR score from the latest reviewed/finalized APAR
          let aparScore30 = 0;
          let totalAparScore = 0;
          
          if (aparData.success && aparData.data && aparData.data.length > 0) {
            // Find the most recent reviewed or finalized APAR
            const reviewedApars = aparData.data.filter((a: any) => 
              a.status === 'reviewed' || a.status === 'finalized'
            );
            
            if (reviewedApars.length > 0) {
              // Get the most recent one
              const latestApar = reviewedApars[0];
              totalAparScore = latestApar.finalScore || 0; // Original score (70-100)
              aparScore30 = (totalAparScore * 30) / 100; // Calculate 30%
            }
          }
          
          // Total score = KPI (70%) + APAR (30%)
          const totalScore = kpiScore + aparScore30;

          setStats({
            activeProjects,
            kpiScore,
            aparScore: aparScore30,
            totalAparScore,
            totalScore,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load dashboard data';
        showToast({ title: 'Dashboard error', description: message, variant: 'error' });
      } finally {
        setIsRefreshing(false);
      }
    };

    fetchDashboardData();
    
    // Refresh every 5 seconds to pick up new APAR scores
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [token, showToast, isAdmin, user]);

  const pieData = [
    { name: 'KPI (70%)', value: stats.kpiScore || 0, color: '#3b82f6' },
    { name: 'APAR (30%)', value: stats.aparScore || 0, color: '#10b981' },
  ];

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-slate-600">
        Loading dashboard...
      </div>
    );
  }

  if (isAdmin) {
    return (
      <AppShell
        title="Admin Dashboard"
        description="Manage performance evaluations and track team progress"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Link
            href="/apar"
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending APAR</p>
                <p className="mt-3 text-4xl font-bold text-slate-900">{stats.pendingAPAR || 0}</p>
              </div>
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl font-bold text-amber-600">
                📋
              </span>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
              Review APARs
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0 opacity-0 transition group-hover:opacity-100" />
          </Link>

          <Link
            href="/kpi"
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending KPI</p>
                <p className="mt-3 text-4xl font-bold text-slate-900">{stats.pendingKPI || 0}</p>
              </div>
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-600">
                📊
              </span>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
              Review KPIs
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0 opacity-0 transition group-hover:opacity-100" />
          </Link>

          <Link
            href="/projects"
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Projects</p>
                <p className="mt-3 text-4xl font-bold text-slate-900">{stats.activeProjects}</p>
              </div>
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-bold text-emerald-600">
                🚀
              </span>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
              Manage Projects
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0 opacity-0 transition group-hover:opacity-100" />
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Employee Dashboard"
      description="Track your performance and manage your tasks"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Link
              href="/kpi"
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Your KPI</p>
                  <p className="mt-3 text-4xl font-bold text-slate-900">{stats.kpiScore?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-slate-500">Out of 70</p>
                </div>
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-600">
                  📊
                </span>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                View Details
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0 opacity-0 transition group-hover:opacity-100" />
            </Link>

            <Link
              href="/projects"
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Your Projects</p>
                  <p className="mt-3 text-4xl font-bold text-slate-900">{stats.activeProjects}</p>
                  <p className="text-xs text-slate-500">Active</p>
                </div>
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-bold text-emerald-600">
                  🚀
                </span>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                View Details
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0 opacity-0 transition group-hover:opacity-100" />
            </Link>

            <Link
              href="/dpr"
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Your DPR</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">Daily Reports</p>
                </div>
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-2xl font-bold text-purple-600">
                  📝
                </span>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                Submit DPR
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500/0 via-purple-500/40 to-purple-500/0 opacity-0 transition group-hover:opacity-100" />
            </Link>

            <Link
              href="/apar"
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Your APAR</p>
                  <p className="mt-3 text-4xl font-bold text-slate-900">{stats.aparScore?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-slate-500">Out of 30</p>
                  {stats.totalAparScore && stats.totalAparScore > 0 && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Original: {stats.totalAparScore.toFixed(0)}/100
                    </p>
                  )}
                </div>
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl font-bold text-amber-600">
                  📋
                </span>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                View APAR
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0 opacity-0 transition group-hover:opacity-100" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Overall Performance</h2>
            <p className="text-sm text-slate-500">KPI (70%) + APAR (30%)</p>
          </div>
          
          <div className="mt-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm font-medium text-slate-500">Total Score</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats.totalScore?.toFixed(1) || '0.0'}</p>
            <p className="text-xs text-slate-500">Out of 100</p>
          </div>
          
          <div className="mt-6 space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">KPI Score:</span>
              <span className="font-semibold text-blue-600">{stats.kpiScore?.toFixed(1) || '0.0'}/70</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">APAR Score:</span>
              <span className="font-semibold text-emerald-600">{stats.aparScore?.toFixed(1) || '0.0'}/30</span>
            </div>
            {stats.totalAparScore && stats.totalAparScore > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-slate-600">APAR (Original):</span>
                <span className="font-semibold text-amber-600">{stats.totalAparScore.toFixed(0)}/100</span>
              </div>
            )}
          </div>
          
          {isRefreshing && (
            <div className="mt-4 text-center">
              <span className="text-xs text-slate-400">Refreshing...</span>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
