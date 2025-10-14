'use client';

import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

const initialDprPrompt = '';
const initialAparPrompt = {
  achievements: '',
  challenges: '',
  goals: '',
};

export default function AIWorkspacePage() {
  const { token, loading } = useAuth({ requireAuth: true, redirectTo: '/login' });
  const { showToast } = useToast();

  const [dprPrompt, setDprPrompt] = useState(initialDprPrompt);
  const [aparPrompt, setAparPrompt] = useState(initialAparPrompt);
  const [aiResult, setAiResult] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingDpr, setIsGeneratingDpr] = useState(false);
  const [isGeneratingApar, setIsGeneratingApar] = useState(false);

  const openModalWithContent = (title: string, content: string) => {
    setModalTitle(title);
    setAiResult(content);
    setIsModalOpen(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(aiResult);
      showToast({ title: 'Copied', description: 'Result copied to clipboard.', variant: 'success' });
    } catch {
      showToast({ title: 'Copy failed', description: 'Unable to copy to clipboard.', variant: 'error' });
    }
  };

  const generateDprSummary = async () => {
    if (!token) return;
    if (!dprPrompt.trim()) {
      showToast({ title: 'Add progress details', description: 'Describe the daily update before generating.', variant: 'error' });
      return;
    }

    setIsGeneratingDpr(true);
    try {
      const response = await fetch('/api/ai/dpr-summary', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: dprPrompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate summary');
      const content = data.summary || '';
      setAiResult(content);
      openModalWithContent('AI DPR summary', content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate summary';
      showToast({ title: 'Generation failed', description: message, variant: 'error' });
    } finally {
      setIsGeneratingDpr(false);
    }
  };

  const generateAparDraft = async () => {
    if (!token) return;
    const { achievements, challenges, goals } = aparPrompt;
    if (!achievements.trim() || !challenges.trim() || !goals.trim()) {
      showToast({ title: 'Provide complete context', description: 'Fill in achievements, challenges, and goals.', variant: 'error' });
      return;
    }

    setIsGeneratingApar(true);
    try {
      const response = await fetch('/api/ai/apar-draft', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year: new Date().getFullYear(),
          period: 'Annual',
          achievements,
          challenges,
          goals,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate draft');
      const content = data.draft || '';
      setAiResult(content);
      openModalWithContent('AI APAR draft', content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate draft';
      showToast({ title: 'Generation failed', description: message, variant: 'error' });
    } finally {
      setIsGeneratingApar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-slate-500">
        Loading AI workspace...
      </div>
    );
  }

  return (
    <AppShell
      title="AI Assistants"
      description="Leverage AI to summarize daily progress and draft performance reports."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-slate-900">DPR summary generator</h2>
            <p className="text-sm text-slate-500">Paste your daily update and receive a concise summary ready for reports.</p>
          </div>
          <textarea
            rows={10}
            value={dprPrompt}
            onChange={(event) => setDprPrompt(event.target.value)}
            placeholder="Share progress highlights, blockers, and next steps..."
            className="mt-4 h-52 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDprPrompt(initialDprPrompt)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:border-slate-300 hover:bg-gray-100"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={generateDprSummary}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
              disabled={isGeneratingDpr}
            >
              {isGeneratingDpr ? 'Generating...' : 'Generate summary'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-slate-900">APAR draft assistant</h2>
            <p className="text-sm text-slate-500">Compile achievements, challenges, and goals to craft a polished draft.</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <textarea
              rows={4}
              value={aparPrompt.achievements}
              onChange={(event) => setAparPrompt((prev) => ({ ...prev, achievements: event.target.value }))}
              placeholder="Achievements"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <textarea
              rows={4}
              value={aparPrompt.challenges}
              onChange={(event) => setAparPrompt((prev) => ({ ...prev, challenges: event.target.value }))}
              placeholder="Challenges"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <textarea
              rows={4}
              value={aparPrompt.goals}
              onChange={(event) => setAparPrompt((prev) => ({ ...prev, goals: event.target.value }))}
              placeholder="Goals"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setAparPrompt(initialAparPrompt)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:border-slate-300 hover:bg-gray-100"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={generateAparDraft}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
              disabled={isGeneratingApar}
            >
              {isGeneratingApar ? 'Generating...' : 'Generate draft'}
            </button>
          </div>
        </section>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        description="Copy or refine the generated content for your official reports."
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:bg-gray-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={copyToClipboard}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Copy
            </button>
          </>
        }
      >
        <textarea
          value={aiResult}
          onChange={(event) => setAiResult(event.target.value)}
          rows={16}
          className="h-72 w-full rounded-xl border border-slate-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </Modal>
    </AppShell>
  );
}
