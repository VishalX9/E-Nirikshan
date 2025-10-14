'use client';

import { FormEvent, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

interface ProjectOption {
  _id: string;
  name: string;
}

interface DprItem {
  _id: string;
  date: string;
  content: string;
  summary?: string;
  projectId?: { name: string } | null;
}

const emptyDpr = {
  date: new Date().toISOString().split('T')[0],
  content: '',
  projectId: '',
};

interface MailComposition {
  to: string;
  subject: string;
  body: string;
  composedBy: string;
  timestamp: number;
}

const MAIL_STORAGE_KEY = 'ems_dpr_mail_draft';

export default function DPRPage() {
  const { token, loading, user } = useAuth({ requireAuth: true, redirectTo: '/login' });
  const { showToast } = useToast();
  const [dprs, setDprs] = useState<DprItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [newDPR, setNewDPR] = useState(emptyDpr);
  const [summary, setSummary] = useState('');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComposeMailOpen, setIsComposeMailOpen] = useState(false);
  const [mailDraft, setMailDraft] = useState<MailComposition>({
    to: '',
    subject: '',
    body: '',
    composedBy: user?.email || '',
    timestamp: Date.now(),
  });

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [dprsRes, projectsRes] = await Promise.all([
          fetch('/api/dpr', { headers }),
          fetch('/api/projects', { headers }),
        ]);

        const [dprsData, projectsData] = await Promise.all([dprsRes.json(), projectsRes.json()]);

        if (!dprsRes.ok) throw new Error(dprsData.error || 'Failed to load DPRs');
        if (!projectsRes.ok) throw new Error(projectsData.error || 'Failed to load projects');

        setDprs(dprsData.dprs || []);
        setProjects(projectsData.projects || []);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load data';
        showToast({ title: 'DPR error', description: message, variant: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, showToast]);

  useEffect(() => {
    const storedMail = localStorage.getItem(MAIL_STORAGE_KEY);
    if (storedMail) {
      try {
        const parsed = JSON.parse(storedMail) as MailComposition;
        setMailDraft(parsed);
      } catch {
        localStorage.removeItem(MAIL_STORAGE_KEY);
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MAIL_STORAGE_KEY) {
        if (e.newValue === null) {
          setMailDraft({
            to: '',
            subject: '',
            body: '',
            composedBy: user?.email || '',
            timestamp: Date.now(),
          });
        } else {
          try {
            const parsed = JSON.parse(e.newValue) as MailComposition;
            setMailDraft(parsed);
          } catch {
            console.error('Failed to parse mail draft from storage');
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.email]);

  const generateSummary = async () => {
    if (!token || !newDPR.content.trim()) {
      showToast({ title: 'Content missing', description: 'Enter your progress before generating.', variant: 'error' });
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const response = await fetch('/api/ai/dpr-summary', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newDPR.content }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate summary');

      setSummary(data.summary || '');
      setIsSummaryModalOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate summary';
      showToast({ title: 'AI error', description: message, variant: 'error' });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !newDPR.content.trim()) {
      showToast({ title: 'Missing progress update', description: 'Describe your daily progress before submitting.', variant: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/dpr', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...newDPR, summary }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit DPR');

      showToast({ title: 'Submitted to E-Office ✅', description: 'Your daily progress report has been submitted successfully.', variant: 'success' });
      setNewDPR({ ...emptyDpr, date: new Date().toISOString().split('T')[0] });
      setSummary('');

      const refreshed = await fetch('/api/dpr', { headers: { Authorization: `Bearer ${token}` } });
      const refreshedData = await refreshed.json();
      setDprs(refreshedData.dprs || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit DPR';
      showToast({ title: 'Submission failed', description: message, variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      showToast({ title: 'Copied to clipboard', variant: 'success', description: 'AI summary copied successfully.' });
    } catch {
      showToast({ title: 'Copy failed', variant: 'error', description: 'Unable to copy summary. Please try manually.' });
    }
  };

  const openComposeMail = () => {
    setMailDraft({
      to: '',
      subject: summary ? `DPR Summary - ${new Date().toLocaleDateString()}` : '',
      body: summary || '',
      composedBy: user?.email || '',
      timestamp: Date.now(),
    });
    setIsComposeMailOpen(true);
  };

  const updateMailDraft = (field: keyof MailComposition, value: string) => {
    const updated = { ...mailDraft, [field]: value, timestamp: Date.now() };
    setMailDraft(updated);
    localStorage.setItem(MAIL_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleSendMail = () => {
    if (user?.role !== 'admin') {
      showToast({ 
        title: 'Access denied', 
        description: 'Only administrators can send emails.', 
        variant: 'error' 
      });
      return;
    }

    showToast({ 
      title: 'Mail sent successfully', 
      description: `Email sent to ${mailDraft.to}`, 
      variant: 'success' 
    });
    
    localStorage.removeItem(MAIL_STORAGE_KEY);
    setMailDraft({
      to: '',
      subject: '',
      body: '',
      composedBy: user?.email || '',
      timestamp: Date.now(),
    });
    setIsComposeMailOpen(false);
  };

  const clearMailDraft = () => {
    localStorage.removeItem(MAIL_STORAGE_KEY);
    setMailDraft({
      to: '',
      subject: '',
      body: '',
      composedBy: user?.email || '',
      timestamp: Date.now(),
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-slate-500">
        Loading reports...
      </div>
    );
  }

  return (
    <AppShell
      title="Daily Progress Reports"
      description="Log daily accomplishments, request AI summaries, and keep leadership informed."
      actions={
        <button
          type="button"
          onClick={() =>
            setNewDPR({
              date: new Date().toISOString().split('T')[0],
              content: '',
              projectId: '',
            })
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
        >
          Reset form
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Submit daily update</h2>
              <p className="text-sm text-slate-500">Capture today’s progress and optionally link it to a project.</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-slate-600">
              {dprs.length} reports logged
            </span>
          </div>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600" htmlFor="dpr-date">
                  Date
                </label>
                <input
                  id="dpr-date"
                  type="date"
                  value={newDPR.date}
                  onChange={(event) => setNewDPR((prev) => ({ ...prev, date: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600" htmlFor="dpr-project">
                  Project (optional)
                </label>
                <select
                  id="dpr-project"
                  value={newDPR.projectId}
                  onChange={(event) => setNewDPR((prev) => ({ ...prev, projectId: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600" htmlFor="dpr-content">
                Progress update
              </label>
              <textarea
                id="dpr-content"
                rows={8}
                value={newDPR.content}
                onChange={(event) => setNewDPR((prev) => ({ ...prev, content: event.target.value }))}
                placeholder="Outline key accomplishments, blockers, and next steps..."
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generateSummary}
                className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50"
                disabled={isGeneratingSummary}
              >
                {isGeneratingSummary ? 'Generating summary...' : 'Generate AI summary'}
              </button>
              <button
                type="button"
                onClick={openComposeMail}
                className="inline-flex items-center justify-center rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-600 transition hover:border-purple-300 hover:bg-purple-100"
              >
                Compose Mail
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit DPR'}
              </button>
            </div>
            {summary && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-800">Latest AI summary</p>
                <p className="mt-1 text-sm text-slate-600">{summary}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSummaryModalOpen(true)}
                    className="rounded-lg border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-100"
                  >
                    View in modal
                  </button>
                  <button
                    type="button"
                    onClick={copySummary}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
                  >
                    Copy summary
                  </button>
                </div>
              </div>
            )}
          </form>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent submissions</h2>
              <p className="text-sm text-slate-500">Latest updates from your team.</p>
            </div>
            {isLoading && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-slate-500">Loading...</span>
            )}
          </div>
          <div className="mt-4 space-y-4">
            {dprs.slice(0, 10).map((dpr) => (
              <article key={dpr._id} className="rounded-xl border border-slate-100 bg-gray-50 p-4 text-sm text-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {new Date(dpr.date).toLocaleDateString()}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">{dpr.content}</p>
                  </div>
                  {dpr.projectId && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {dpr.projectId.name}
                    </span>
                  )}
                </div>
                {dpr.summary && (
                  <button
                    type="button"
                    onClick={() => {
                      setSummary(dpr.summary || '');
                      setIsSummaryModalOpen(true);
                    }}
                    className="mt-3 inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View AI summary
                  </button>
                )}
              </article>
            ))}
            {dprs.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No submissions yet. Use the form to log today’s progress.
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        title="AI generated summary"
        description="Review the generated insight and copy it for reporting."
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsSummaryModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:bg-gray-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={copySummary}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Copy summary
            </button>
          </>
        }
      >
        <p className="whitespace-pre-wrap text-sm text-slate-700">{summary || 'No summary available'}</p>
      </Modal>

      <Modal
        open={isComposeMailOpen}
        onClose={() => setIsComposeMailOpen(false)}
        title="Compose Mail"
        description={user?.role === 'admin' ? 'Draft and send email with DPR summary' : 'Draft email (only admin can send)'}
        footer={
          <>
            <button
              type="button"
              onClick={clearMailDraft}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:bg-gray-100"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsComposeMailOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:bg-gray-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSendMail}
              disabled={user?.role !== 'admin' || !mailDraft.to || !mailDraft.subject || !mailDraft.body}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {user?.role === 'admin' ? 'Send Mail' : 'Send (Admin Only)'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {mailDraft.composedBy && mailDraft.composedBy !== user?.email && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-semibold">Live Draft</p>
              <p className="text-xs mt-1">Being composed by: {mailDraft.composedBy}</p>
              <p className="text-xs">Last updated: {new Date(mailDraft.timestamp).toLocaleTimeString()}</p>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="mail-to">
              To
            </label>
            <input
              id="mail-to"
              type="email"
              value={mailDraft.to}
              onChange={(e) => updateMailDraft('to', e.target.value)}
              placeholder="recipient@example.com"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="mail-subject">
              Subject
            </label>
            <input
              id="mail-subject"
              type="text"
              value={mailDraft.subject}
              onChange={(e) => updateMailDraft('subject', e.target.value)}
              placeholder="Email subject"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="mail-body">
              Message
            </label>
            <textarea
              id="mail-body"
              rows={10}
              value={mailDraft.body}
              onChange={(e) => updateMailDraft('body', e.target.value)}
              placeholder="Compose your message here..."
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
