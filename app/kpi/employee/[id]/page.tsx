'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';

interface User {
  _id: string;
  name: string;
  email: string;
  designation?: string;
  department?: string;
  role: string;
  employerType?: 'Field' | 'HQ';
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
  status: string;
  progress: number;
  deadline?: string;
  progressNotes?: string;
  description?: string;
  assignedTo: User;
  assignedBy?: User;
  eofficeScore?: number;
  createdAt: string;
  updatedAt: string;
  isProjectSpecific?: boolean;
  projectId?: string;
  projectName?: string;
  originalWeightage?: number;
  isDefault?: boolean;
}

interface ProjectGroup {
  projectId: string;
  projectName: string;
  kpis: Kpi[];
}

export default function EmployeeKpiDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [employee, setEmployee] = useState<User | null>(null);
  const [allKpis, setAllKpis] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<{
    outputScore: number;
    behaviouralScore: number;
    totalScore: number;
  } | null>(null);

  // NEW: Project selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('default');
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);

  useEffect(() => {
    fetchEmployeeKpis();
  }, [userId]);

  const fetchEmployeeKpis = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch employee details
      const userRes = await fetch(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await userRes.json();
      if (userData.success) setEmployee(userData.data);

      // Fetch ALL KPIs for this employee
      const kpiRes = await fetch(`/api/kpi?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const kpiData = await kpiRes.json();
      
      if (kpiData.success) {
        const kpis = kpiData.data as Kpi[];
        setAllKpis(kpis);

        // Group KPIs by project
        const groups: ProjectGroup[] = [];
        const projectMap = new Map<string, Kpi[]>();

        // Default KPIs
        const defaultKPIs = kpis.filter(k => k.isDefault === true);
        if (defaultKPIs.length > 0) {
          groups.push({
            projectId: 'default',
            projectName: 'Default KPIs',
            kpis: defaultKPIs
          });
        }

        // Project-specific KPIs
        kpis.forEach(kpi => {
          if (kpi.isProjectSpecific && kpi.projectId) {
            if (!projectMap.has(kpi.projectId)) {
              projectMap.set(kpi.projectId, []);
            }
            projectMap.get(kpi.projectId)!.push(kpi);
          }
        });

        // Convert map to array
        projectMap.forEach((kpiList, projectId) => {
          const projectName = kpiList[0]?.projectName || `Project ${projectId.slice(0, 6)}`;
          groups.push({
            projectId,
            projectName,
            kpis: kpiList
          });
        });

        setProjectGroups(groups);

        // Auto-select the first available project group
        if (groups.length > 0) {
          setSelectedProjectId(groups[0].projectId);
        }
      }

      // Fetch scores
      const scoresRes = await fetch(`/api/scores?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const scoresData = await scoresRes.json();
      setScores(scoresData);
    } catch (error) {
      console.error('Error fetching employee KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase().replace(' ', '_')) {
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'in_progress': return 'bg-sky-100 text-sky-800';
      case 'not_started':
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'at_risk': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AppShell title="Employee KPIs" description="View employee KPI details">
        <div className="flex h-screen items-center justify-center">
          <p className="animate-pulse text-gray-500">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (!employee) {
    return (
      <AppShell title="Employee KPIs" description="View employee KPI details">
        <div className="flex h-screen items-center justify-center">
          <p className="text-gray-500">Employee not found</p>
        </div>
      </AppShell>
    );
  }

  // Get currently selected project's KPIs
  const selectedProject = projectGroups.find(g => g.projectId === selectedProjectId);
  const displayKpis = selectedProject?.kpis || [];

  // Calculate stats based on selected project only
  const totalWeightage = displayKpis.reduce((sum, k) => sum + k.weightage, 0);
  const totalScore = displayKpis.reduce((sum, k) => sum + k.score, 0);
  const hasWeightMismatch = Math.abs(totalWeightage - 100) > 0.5;

  // Check for duplicate KPI names in selected project
  const kpiNames = new Map<string, number>();
  displayKpis.forEach(kpi => {
    kpiNames.set(kpi.kpiName, (kpiNames.get(kpi.kpiName) || 0) + 1);
  });
  const duplicateKPIs = Array.from(kpiNames.entries())
    .filter(([_, count]) => count > 1)
    .map(([name]) => name);

  const isProjectSpecific = selectedProjectId !== 'default';

  return (
    <AppShell title="">
      <div className="min-h-screen p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back to KPI Management
          </button>
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
                <p className="text-gray-600 mt-1">{employee.designation}</p>
                <p className="text-sm text-gray-500">{employee.department} • {employee.email}</p>
                <div className="mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    employee.employerType === 'Field' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {employee.employerType || 'Not Set'} Employee
                  </span>
                </div>
              </div>
              <div className="text-right bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                <p className="text-sm text-blue-700 font-medium">Output Performance Score</p>
                <p className="text-4xl font-bold text-blue-900 mt-2">
                  {scores?.outputScore.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-blue-700 mt-1">out of 70 points</p>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-blue-600">Total Weighted Score</p>
                  <p className="text-lg font-semibold text-blue-800">
                    {totalScore.toFixed(2)}/{totalWeightage.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Selector */}
        {projectGroups.length > 1 && (
          <div className="mb-6 bg-white rounded-lg border shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              View KPIs for:
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {projectGroups.map(group => (
                <option key={group.projectId} value={group.projectId}>
                  {group.projectName} ({group.kpis.length} KPIs)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* KPI Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm text-gray-500">Total KPIs</p>
            <p className="text-2xl font-bold text-gray-900">{displayKpis.length}</p>
          </div>
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-emerald-600">
              {displayKpis.filter(k => k.status.toLowerCase() === 'completed').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-sky-600">
              {displayKpis.filter(k => k.status.toLowerCase().replace(' ', '_') === 'in_progress').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm text-gray-500">At Risk</p>
            <p className="text-2xl font-bold text-red-600">
              {displayKpis.filter(k => k.status.toLowerCase() === 'at_risk').length}
            </p>
          </div>
        </div>

        {/* Warnings */}
        {hasWeightMismatch && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-amber-900 text-sm">Weight Mismatch Detected</p>
                <p className="text-sm text-amber-800 mt-1">
                  Total KPI weightage is <strong>{totalWeightage.toFixed(2)}%</strong> (expected 100%). This may affect score accuracy.
                </p>
              </div>
            </div>
          </div>
        )}

        {duplicateKPIs.length > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-red-900 text-sm">Duplicate KPIs Found</p>
                <p className="text-sm text-red-800 mt-1">
                  The following KPIs appear multiple times: <strong>{duplicateKPIs.join(', ')}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Project-Specific Banner */}
        {isProjectSpecific && selectedProject && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-blue-900">AI-Optimized KPI Weights</p>
                <p className="text-sm text-blue-700 mt-1">
                  These KPI weights have been adjusted for project "{selectedProject.projectName}" using AI analysis.
                </p>
              </div>
              <button 
                onClick={fetchEmployeeKpis}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* KPIs List */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-xl font-bold text-gray-900">
              {isProjectSpecific ? `${selectedProject?.projectName} - KPI Metrics` : 'Individual KPI Metrics'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Detailed breakdown of each performance indicator
            </p>
          </div>
          
          {displayKpis.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No KPIs found for this selection</p>
            </div>
          ) : (
            <div className="divide-y">
              {displayKpis.map((kpi) => (
                <div key={kpi._id} className="p-6 hover:bg-gray-50/50 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">{kpi.kpiName}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(kpi.status)}`}>
                          {kpi.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        {kpi.isProjectSpecific && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            AI-Optimized
                          </span>
                        )}
                      </div>
                      {kpi.description && (
                        <p className="text-sm text-gray-600 mt-1">{kpi.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500">Period: {kpi.period}</span>
                        {kpi.deadline && (
                          <span className="text-sm text-gray-500">
                            Deadline: {new Date(kpi.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500 font-medium">Target</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {kpi.target} {kpi.metric}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-blue-700 font-medium">Achieved</p>
                      <p className="text-lg font-semibold text-blue-900">
                        {kpi.achievedValue} {kpi.metric}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-sm text-blue-700 font-medium">Weightage</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-lg font-semibold text-blue-900">{kpi.weightage.toFixed(2)}%</p>
                        {kpi.isProjectSpecific && typeof kpi.originalWeightage !== 'undefined' && (
                          <span className="text-xs text-blue-600">
                            (was {kpi.originalWeightage}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-sm text-emerald-700 font-medium">Score Obtained</p>
                      <p className="text-lg font-semibold text-emerald-900">
                        {kpi.score.toFixed(2)}
                        <span className="text-sm font-normal text-emerald-700">/{kpi.weightage.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 font-medium">Progress</span>
                      <span className="font-bold text-gray-900">{kpi.progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          kpi.progress >= 80 ? 'bg-emerald-500' :
                          kpi.progress >= 40 ? 'bg-sky-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${kpi.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Additional Info */}
                  {kpi.progressNotes && (
                    <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                      <p className="text-sm text-blue-700 font-medium">Progress Notes</p>
                      <p className="text-sm text-gray-700 mt-1">{kpi.progressNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Section */}
        {displayKpis.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Weightage</p>
                <p className={`text-2xl font-bold ${hasWeightMismatch ? 'text-red-600' : 'text-gray-900'}`}>
                  {totalWeightage.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Score (Weighted)</p>
                <p className="text-2xl font-bold text-blue-900">
                  {totalScore.toFixed(2)}/{totalWeightage.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Output Score (70-point scale)</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {scores?.outputScore.toFixed(2) || '0.00'}/70
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}