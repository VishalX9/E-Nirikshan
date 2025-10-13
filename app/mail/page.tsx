'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

interface Mail {
  _id: string;
  from: { _id: string; name: string; email: string };
  to: string;
  subject: string;
  body: string;
  status: 'sent' | 'failed';
  createdAt: string;
}

export default function MailPage() {
  const router = useRouter();
  const { user, loading } = useAuth({ requireAuth: true, redirectTo: '/login' });
  const { showToast } = useToast();

  const [mails, setMails] = useState<Mail[]>([]);
  const [loadingMails, setLoadingMails] = useState(false);
  const [sending, setSending] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [formData, setFormData] = useState({ to: '', subject: '', body: '' });

  useEffect(() => {
    if (user) fetchMails();
  }, [user]);

  const fetchMails = async () => {
    if (!user) return;
    try {
      setLoadingMails(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/mail?from=${user._id || user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setMails(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMails(false);
    }
  };

  const handleEnhanceMail = async () => {
    if (!formData.body && !formData.subject) {
      showToast({ title: 'Missing content', description: 'Please write some content to enhance', variant: 'error' });
      return;
    }

    try {
      setEnhancing(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'enhance', subject: formData.subject, body: formData.body, to: formData.to }),
      });

      let data;
      try { data = await res.json(); } 
      catch { throw new Error('Server returned invalid JSON'); }

      if (data.success) {
        setFormData({ ...formData, subject: data.enhancedSubject, body: data.enhancedBody });
      } else {
        throw new Error(data.error || 'Enhancement failed');
      }
    } catch (error: any) {
      showToast({ title: 'Enhancement failed', description: error.message, variant: 'error' });
    } finally {
      setEnhancing(false);
    }
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.to || !formData.subject || !formData.body) {
      showToast({ title: 'Missing fields', description: 'Please fill all fields', variant: 'error' });
      return;
    }
    if (!user) return;

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'send', from: user._id || user.id, ...formData }),
      });

      let data;
      try { data = await res.json(); } 
      catch { throw new Error('Server returned invalid JSON'); }

      if (data.success) {
        showToast({ title: 'Email sent', description: 'Your email has been sent successfully', variant: 'success' });
        setFormData({ to: '', subject: '', body: '' });
        setShowCompose(false);
        fetchMails();
      } else throw new Error(data.error || 'Send failed');
    } catch (error: any) {
      showToast({ title: 'Send failed', description: error.message, variant: 'error' });
    } finally { setSending(false); }
  };

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center animate-pulse text-lg text-muted-foreground">Loading...</div>;

  return (
    <AppShell title="" description="Enhance and send emails with AI assistance">
      <div className="space-y-8">
        {showCompose && (
          <div className="bg-card rounded-2xl border border-muted/30 shadow-lg animate-slide-up">
            <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 px-6 py-5 border-b border-muted/30">
              <h2 className="text-2xl font-bold text-foreground">Compose New Email</h2>
              <p className="text-sm text-muted-foreground mt-1">Create and send your message</p>
            </div>
            <form onSubmit={handleSendMail} className="p-6 space-y-6">
              <input type="email" placeholder="Recipient" value={formData.to} required
                onChange={e => setFormData({ ...formData, to: e.target.value })}
                className="w-full border border-input rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              <input type="text" placeholder="Subject" value={formData.subject} required
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                className="w-full border border-input rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              <textarea placeholder="Message" value={formData.body} required
                onChange={e => setFormData({ ...formData, body: e.target.value })}
                className="w-full border border-input rounded-xl px-4 py-3 bg-background min-h-[220px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              <div className="flex gap-4">
                <button type="button" onClick={handleEnhanceMail} disabled={enhancing}
                  className="flex-1 px-4 py-3 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-500/10 font-semibold">
                  {enhancing ? 'Enhancing...' : '✨ Enhance with AI'}
                </button>
                <button type="submit" disabled={sending}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold">
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sent mails */}
        <div className="bg-card rounded-2xl border border-muted/30 shadow-md overflow-hidden animate-slide-up">
          <div className="px-6 py-5 border-b bg-muted/20 flex justify-between items-center">
            <h2 className="text-xl font-bold text-foreground">Sent Mails</h2>
            <button onClick={() => setShowCompose(!showCompose)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
              {showCompose ? '✕ Cancel' : '✉️ Compose'}
            </button>
          </div>
          <div className="divide-y">
            {loadingMails ? <div className="p-8 text-center animate-pulse">Loading mails...</div> :
              mails.length === 0 ? <div className="p-16 text-center text-muted-foreground">No mails sent yet</div> :
                mails.map(mail => (
                  <div key={mail._id} className="p-5 hover:bg-muted/20 transition-all cursor-pointer">
                    <p className="font-bold text-lg truncate">{mail.subject}</p>
                    <p className="text-sm text-muted-foreground">To: {mail.to}</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${mail.status === 'sent' ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
                      {mail.status === 'sent' ? '✓ Sent' : '✕ Failed'}
                    </span>
                    <p className="text-xs text-muted-foreground">{new Date(mail.createdAt).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{mail.body}</p>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </AppShell>
  );
}
