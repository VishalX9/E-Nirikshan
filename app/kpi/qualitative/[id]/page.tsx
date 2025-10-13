'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';

// --- INTERFACES ---
interface User {
  _id: string;
  name: string;
  email: string;
  designation?: string;
  department?: string;
  role: 'Admin' | 'Employee';
}
interface Kpi {
  _id: string;
  kpiName: string;
  metric: string;
  description?: string;
  target: number;
  weightage: number;
  achievedValue: number;
  score: number;
  period: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  progressNotes?: string;
  qualitativeScore?: number;
  selfEvaluation?: string;
  supervisorComments?: string;
  userId: User;
  assignedBy?: User;
  lastUpdated?: string;
}

// --- HELPER COMPONENTS ---
const KpiStatusBadge = ({ status }: { status: Kpi['status'] }) => {
  const styles = useMemo(() => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-800';
      case 'In Progress': return 'bg-sky-100 text-sky-800';
      case 'Pending': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, [status]);
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles}`}>{status}</span>;
};

const ProgressBar = ({ achieved, target }: { achieved: number; target: number }) => {
  const progress = target === 0 ? 0 : Math.min((achieved / target) * 100, 100);
  const progressColor = progress >= 80 ? 'bg-emerald-500' : progress >= 40 ? 'bg-sky-500' : 'bg-amber-500';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 font-medium">Progress</span>
        <span className="font-bold text-gray-700">{progress.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className={`${progressColor} h-2 rounded-full transition-all duration-500 ease-out`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function KpiPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  // Modals
  const [selectedKpi, setSelectedKpi] = useState<Kpi | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSelfEvalModal, setShowSelfEvalModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [progressForm, setProgressForm] = useState({
    achievedValue: 0,
    progressNotes: '',
    status: 'In Progress' as Kpi['status'],
  });
  const [selfEvalForm, setSelfEvalForm] = useState({
    qualitativeScore: 0,
    selfEvaluation: '',
  });
  const [newKpiForm, setNewKpiForm] = useState({
    userId: '',
    kpiName: '',
    metric: '',
    target: 0,
    description: '',
  });
  // Admin Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      fetchKpis();
      if (currentUser.role === 'Admin') {
        fetchUsers();
      }
    }
  }, [currentUser]);

  const fetchKpis = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = currentUser.role === 'Employee' ? `/api/kpi?userId=${currentUser._id} &isProjectSpecific=true` : `/api/kpi`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setKpis(data.data);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.filter((user: User) => user.role === 'Employee'));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedKpi) return;
    setModalError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/kpi/${selectedKpi._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(progressForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setShowProgressModal(false);
      fetchKpis();
    } catch (error: any) {
      setModalError(error.message.includes('Unauthorized') ? "You don't have permission to perform this action." : error.message);
    }
  };

  const handleSelfEvaluation = async () => {
    if (!selectedKpi) return;
    setModalError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/kpi/${selectedKpi._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(selfEvalForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setShowSelfEvalModal(false);
      fetchKpis();
    } catch (error: any) {
      setModalError(error.message.includes('Unauthorized') ? "You don't have permission to perform this action." : error.message);
    }
  };

  const handleAssignKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKpiForm.userId || !newKpiForm.kpiName || !newKpiForm.target) {
      setModalError('Please fill out all required fields.');
      return;
    }
    setModalError(null);
    setIsAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...newKpiForm, assignedBy: currentUser?._id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setShowAssignModal(false);
      setNewKpiForm({ userId: '', kpiName: '', metric: '', target: 0, description: '' });
      fetchKpis();
    } catch (error: any) {
      setModalError(error.message || 'Failed to assign KPI.');
    } finally {
      setIsAssigning(false);
    }
  };

  const generateReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kpis: filteredKpis }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const blob = new Blob([data.pdf], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'kpi_report.pdf';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error generating report:', error);
      setModalError('Failed to generate report.');
    }
  };

  const openProgressModal = (kpi: Kpi) => {
    setSelectedKpi(kpi);
    setProgressForm({
      achievedValue: kpi.achievedValue,
      progressNotes: kpi.progressNotes || '',
      status: kpi.status,
    });
    setModalError(null);
    setShowProgressModal(true);
  };

  const openSelfEvalModal = (kpi: Kpi) => {
    setSelectedKpi(kpi);
    setSelfEvalForm({
      qualitativeScore: kpi.qualitativeScore || 0,
      selfEvaluation: kpi.selfEvaluation || '',
    });
    setModalError(null);
    setShowSelfEvalModal(true);
  };

  const filteredKpis = useMemo(() => {
    return kpis.filter(kpi => {
      const matchesSearch = (kpi.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || kpi.kpiName?.toLowerCase().includes(searchQuery.toLowerCase())) ?? false;
      const matchesStatus = statusFilter === 'All' || kpi.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [kpis, searchQuery, statusFilter]);

  if (loading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="animate-pulse text-gray-500">Loading Dashboard...</p>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'Admin';

  const NoKpisFound = ({ isAdminView }: { isAdminView: boolean }) => (
    <div className="bg-white rounded-lg border p-12 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <h3 className="text-lg font-semibold text-gray-700">No KPIs Found</h3>
      <p className="text-sm text-gray-500 mt-1">
        {isAdminView ? "Assign the first KPI to an employee to get started." : "No KPIs have been assigned to you yet."}
      </p>
    </div>
  );

  // --- ADMIN VIEW ---
  const AdminDashboard = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search by employee or KPI name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option>All</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
        <button
          onClick={generateReport}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export PDF Report
        </button>
      </div>
      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        {filteredKpis.length === 0 ? <NoKpisFound isAdminView={true} /> : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Employee</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">KPI</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Progress</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Self-Evaluation</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredKpis.map(kpi => (
                <tr key={kpi._id} className="border-b hover:bg-gray-50/50">
                  <td className="p-3">
                    <p className="font-semibold text-gray-800">{kpi.userId.name}</p>
                    <p className="text-xs text-gray-500">{kpi.userId.department || 'N/A'}</p>
                  </td>
                  <td className="p-3 text-sm text-gray-700">{kpi.kpiName}</td>
                  <td className="p-3 w-48"><ProgressBar achieved={kpi.achievedValue} target={kpi.target} /></td>
                  <td className="p-3"><KpiStatusBadge status={kpi.status} /></td>
                  <td className="p-3 text-sm text-gray-700">{kpi.selfEvaluation ? `${kpi.qualitativeScore}/10: ${kpi.selfEvaluation.slice(0, 20)}...` : 'N/A'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openProgressModal(kpi)} className="text-sm font-semibold text-gray-600 hover:text-blue-600">Edit</button>
                      <span className="text-gray-300">|</span>
                      <Link href={`/kpi/qualitative/${kpi._id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Evaluate</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // --- EMPLOYEE VIEW ---
  const EmployeeDashboard = () => (
    <div>
      {filteredKpis.length === 0 ? <NoKpisFound isAdminView={false} /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredKpis.map(kpi => (
            <div key={kpi._id} className="bg-white rounded-xl border shadow-sm flex flex-col">
              <div className="p-5 flex-grow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-800">{kpi.kpiName}</h3>
                  <KpiStatusBadge status={kpi.status} />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-around text-center bg-gray-50 p-3 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Target</p>
                      <p className="text-xl font-bold text-gray-700">{kpi.target}</p>
                    </div>
                    <div className="h-8 border-l border-gray-200"></div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Achieved</p>
                      <p className="text-xl font-bold text-sky-600">{kpi.achievedValue}</p>
                    </div>
                  </div>
                  <ProgressBar achieved={kpi.achievedValue} target={kpi.target} />
                  {kpi.selfEvaluation && (
                    <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-300">
                      <p className="text-xs font-bold text-green-800">Your Self-Evaluation</p>
                      <p className="text-sm italic text-gray-700">Score: {kpi.qualitativeScore}/10 - "{kpi.selfEvaluation}"</p>
                    </div>
                  )}
                  {kpi.supervisorComments && (
                    <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-300">
                      <p className="text-xs font-bold text-blue-800">Manager Feedback</p>
                      <p className="text-sm italic text-gray-700">"{kpi.supervisorComments}"</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t bg-gray-50/50 rounded-b-xl flex gap-4">
                <button
                  onClick={() => openProgressModal(kpi)}
                  className="flex-1 text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Update Progress
                </button>
                <button
                  onClick={() => openSelfEvalModal(kpi)}
                  className="flex-1 text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Self-Evaluation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <AppShell title="KPI Dashboard" description="Track and manage key performance indicators">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">KPI Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome, {currentUser.name} ({currentUser.role})
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setModalError(null);
                setShowAssignModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Assign KPI
            </button>
          )}
        </div>
        {isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}
        {/* --- MODALS --- */}
        {showProgressModal && selectedKpi && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border shadow-2xl max-w-lg w-full">
              <div className="bg-gray-50 px-6 py-5 border-b rounded-t-2xl flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Update Progress</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedKpi.kpiName}</p>
                </div>
                <button onClick={() => setShowProgressModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Achieved Value</label>
                  <input
                    type="number"
                    value={progressForm.achievedValue}
                    onChange={e => setProgressForm({ ...progressForm, achievedValue: Number(e.target.value) })}
                    className="w-full border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Progress Notes</label>
                  <textarea
                    value={progressForm.progressNotes}
                    onChange={e => setProgressForm({ ...progressForm, progressNotes: e.target.value })}
                    className="w-full border-gray-300 rounded-lg px-4 py-2 min-h-[100px] resize-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Status</label>
                  <select
                    value={progressForm.status}
                    onChange={e => setProgressForm({ ...progressForm, status: e.target.value as any })}
                    className="w-full bg-white border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>
                {modalError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{modalError}</p>}
              </div>
              <div className="flex gap-4 p-4 bg-gray-50 rounded-b-2xl border-t">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="flex-1 px-4 py-2.5 border bg-white rounded-lg hover:bg-gray-100 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateProgress}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-sm"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
        {showSelfEvalModal && selectedKpi && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border shadow-2xl max-w-lg w-full">
              <div className="bg-gray-50 px-6 py-5 border-b rounded-t-2xl flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Self-Evaluation</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedKpi.kpiName}</p>
                </div>
                <button onClick={() => setShowSelfEvalModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Qualitative Score (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={selfEvalForm.qualitativeScore}
                    onChange={e => setSelfEvalForm({ ...selfEvalForm, qualitativeScore: Number(e.target.value) })}
                    className="w-full border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Self-Evaluation Comments</label>
                  <textarea
                    value={selfEvalForm.selfEvaluation}
                    onChange={e => setSelfEvalForm({ ...selfEvalForm, selfEvaluation: e.target.value })}
                    className="w-full border-gray-300 rounded-lg px-4 py-2 min-h-[100px] resize-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {modalError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{modalError}</p>}
              </div>
              <div className="flex gap-4 p-4 bg-gray-50 rounded-b-2xl border-t">
                <button
                  type="button"
                  onClick={() => setShowSelfEvalModal(false)}
                  className="flex-1 px-4 py-2.5 border bg-white rounded-lg hover:bg-gray-100 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSelfEvaluation}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-sm"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form onSubmit={handleAssignKpi} className="bg-white rounded-2xl border shadow-2xl max-w-lg w-full">
              <div className="bg-gray-50 px-6 py-5 border-b rounded-t-2xl flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Assign New KPI</h3>
                  <p className="text-sm text-gray-500 mt-1">Fill the details to assign a KPI to an employee.</p>
                </div>
                <button type="button" onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Employee <span className="text-red-500">*</span></label>
                  <select
                    value={newKpiForm.userId}
                    onChange={e => setNewKpiForm({ ...newKpiForm, userId: e.target.value })}
                    className="w-full bg-white border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="" disabled>Select an employee</option>
                    {users.map(user => <option key={user._id} value={user._id}>{user.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">KPI Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newKpiForm.kpiName}
                    onChange={e => setNewKpiForm({ ...newKpiForm, kpiName: e.target.value })}
                    className="w-full border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Metric</label>
                  <input
                    type="text"
                    value={newKpiForm.metric}
                    onChange={e => setNewKpiForm({ ...newKpiForm, metric: e.target.value })}
                    className="w-full border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Target Value <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={newKpiForm.target}
                    onChange={e => setNewKpiForm({ ...newKpiForm, target: Number(e.target.value) })}
                    className="w-full border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Description</label>
                  <textarea
                    value={newKpiForm.description}
                    onChange={e => setNewKpiForm({ ...newKpiForm, description: e.target.value })}
                    className="w-full border-gray-300 rounded-lg px-4 py-2 min-h-[100px] resize-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {modalError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{modalError}</p>}
              </div>
              <div className="flex gap-4 p-4 bg-gray-50 rounded-b-2xl border-t">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2.5 border bg-white rounded-lg hover:bg-gray-100 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {isAssigning ? 'Assigning...' : 'Assign KPI'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
