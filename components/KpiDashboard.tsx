'use client';

import { useMemo } from 'react';

interface User {
  _id: string;
  name: string;
  email: string;
  designation?: string;
  department?: string;
  role: 'admin' | 'employee';
}

interface Kpi {
  _id: string;
  kpiName: string;
  metric: string;
  target: number;
  weightage: number;
  achievedValue: number;
  score: number;
  period: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'not_started' | 'in_progress' | 'completed' | 'at_risk';
  progress: number;
  deadline?: string;
  progressNotes?: string;
  assignedTo: User;
  assignedBy?: User;
}

interface KpiDashboardProps {
  kpis: Kpi[];
  currentUser: User | null;
}

export default function KpiDashboard({ kpis, currentUser }: KpiDashboardProps) {
  const isAdmin = currentUser?.role === 'admin';

  const stats = useMemo(() => {
    const total = kpis.length;
    const completed = kpis.filter(k => k.status === 'completed' || k.status === 'Completed').length;
    const inProgress = kpis.filter(k => k.status === 'in_progress' || k.status === 'In Progress').length;
    const atRisk = kpis.filter(k => k.status === 'at_risk').length;
    const notStarted = kpis.filter(k => k.status === 'not_started' || k.status === 'Pending').length;
    
    const avgScore = total > 0 
      ? kpis.reduce((sum, k) => sum + k.score, 0) / total 
      : 0;
    
    const avgProgress = total > 0 
      ? kpis.reduce((sum, k) => sum + k.progress, 0) / total 
      : 0;

    return {
      total,
      completed,
      inProgress,
      atRisk,
      notStarted,
      avgScore,
      avgProgress,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }, [kpis]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total KPIs */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total KPIs</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-blue-100 rounded-full p-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-emerald-600 font-medium">{stats.completed} Completed</span>
          <span className="text-gray-400 mx-2">•</span>
          <span className="text-sky-600 font-medium">{stats.inProgress} In Progress</span>
        </div>
      </div>

      {/* Average Score */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Average Score</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.avgScore.toFixed(1)}</p>
          </div>
          <div className="bg-emerald-100 rounded-full p-3">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.avgScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Average Progress */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Average Progress</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.avgProgress.toFixed(0)}%</p>
          </div>
          <div className="bg-sky-100 rounded-full p-3">
            <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-sky-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.avgProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* At Risk */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">At Risk</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.atRisk}</p>
          </div>
          <div className={`${stats.atRisk > 0 ? 'bg-red-100' : 'bg-gray-100'} rounded-full p-3`}>
            <svg className={`w-6 h-6 ${stats.atRisk > 0 ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-gray-600">{stats.notStarted} Not Started</span>
        </div>
      </div>
    </div>
  );
}
