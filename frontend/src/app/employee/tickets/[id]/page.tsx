'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiMapPin, FiCheckCircle, FiCalendar, FiLink, FiAlertCircle, FiUser, FiArrowLeft, FiClock } from 'react-icons/fi';

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  scheduledDate: string | null;
  hospitalName: string | null;
  location: string | null;
  driveUrl: string | null;
  customer: { companyName: string; address: string; phone: string } | null;
  assignedTo: { firstName: string; lastName: string; phone: string } | null;
  createdAt: string;
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    workDone: '',
    breakdownDetails: '',
    partsReplaced: '',
    driveUrl: '',
  });

  useEffect(() => { fetchTicket(); }, [id]);

  const fetchTicket = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setTicket(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tickets/${id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push('/employee/tickets');
      } else {
        const err = await res.json();
        alert(err.message || 'Error completing ticket');
      }
    } catch { alert('Network error'); }
    finally { setSubmitting(false); }
  };

  const isResolved = ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED';

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafc] p-8 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!ticket) return (
    <div className="min-h-screen bg-[#f8fafc] p-8 text-center text-slate-400">Ticket not found.</div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-xl mx-auto space-y-4">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <FiArrowLeft /> Back to Tickets
        </button>

        {/* Ticket Header Card */}
        <div className={`rounded-3xl overflow-hidden shadow-sm border ${isResolved ? 'border-emerald-100' : 'border-slate-100'}`}>
          <div className={`p-6 text-white ${isResolved ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-blue-600 to-blue-800'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full tracking-wider">{ticket.priority}</span>
              <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full tracking-wider">{ticket.status.replace('_', ' ')}</span>
            </div>
            <h1 className="text-xl font-black mt-2 leading-snug">{ticket.title}</h1>
            <p className="text-blue-100 text-xs mt-1 opacity-90">#{ticket.id.slice(0, 12)}</p>
          </div>

          <div className="bg-white p-5 space-y-3">
            <p className="text-sm text-slate-600 leading-relaxed">{ticket.description}</p>

            {ticket.hospitalName && (
              <div className="flex items-center gap-3 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100">
                <FiMapPin className="text-emerald-600 w-4 h-4 shrink-0" />
                <div>
                  <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">Hospital / Site</p>
                  <p className="text-sm font-bold text-slate-800">{ticket.hospitalName}</p>
                </div>
              </div>
            )}

            {ticket.location && (
              <div className="flex items-start gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                <FiMapPin className="text-slate-400 w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Address</p>
                  <p className="text-sm text-slate-700">{ticket.location}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 font-bold hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <FiMapPin className="w-3 h-3" /> Open in Maps
                  </a>
                </div>
              </div>
            )}

            {ticket.scheduledDate && (
              <div className="flex items-center gap-3 bg-purple-50 px-4 py-3 rounded-xl border border-purple-100">
                <FiCalendar className="text-purple-600 w-4 h-4 shrink-0" />
                <div>
                  <p className="text-xs font-black text-purple-600 uppercase tracking-wider">Scheduled Visit</p>
                  <p className="text-sm font-bold text-slate-800">
                    {new Date(ticket.scheduledDate).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            )}

            {ticket.driveUrl && (
              <div className="flex items-center gap-3 bg-blue-50 px-4 py-3 rounded-xl border border-blue-100">
                <FiLink className="text-blue-600 w-4 h-4 shrink-0" />
                <div>
                  <p className="text-xs font-black text-blue-600 uppercase tracking-wider">Service Report</p>
                  <a href={ticket.driveUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-700 hover:underline">
                    Open Drive Document ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mark as Finished Section */}
        {!isResolved ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {!showForm ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
                  <FiCheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800">Service Complete?</h3>
                  <p className="text-xs text-slate-400 mt-1">Once you submit, this ticket will be marked as resolved.</p>
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                >
                  <FiCheckCircle /> Mark as Finished
                </button>
              </div>
            ) : (
              <form onSubmit={handleComplete} className="p-6 space-y-4">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <FiCheckCircle className="text-emerald-500" /> Complete This Ticket
                </h3>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Work Done *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe what was done during the visit..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                    value={form.workDone}
                    onChange={e => setForm(p => ({ ...p, workDone: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Issue / Breakdown Details</label>
                  <textarea
                    rows={2}
                    placeholder="What issue was reported by the customer?"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                    value={form.breakdownDetails}
                    onChange={e => setForm(p => ({ ...p, breakdownDetails: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Parts Replaced</label>
                  <input
                    type="text"
                    placeholder="e.g. Transducer cable, Power supply..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={form.partsReplaced}
                    onChange={e => setForm(p => ({ ...p, partsReplaced: e.target.value }))}
                  />
                </div>

                {/* Drive URL */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1">
                    <FiLink className="text-blue-500" /> Google Drive / Report URL
                  </label>
                  <input
                    type="url"
                    placeholder="Paste your Drive or report link here..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                    value={form.driveUrl}
                    onChange={e => setForm(p => ({ ...p, driveUrl: e.target.value }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Optional — paste a Google Drive link, PDF, or photo album link.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Submitting...' : <><FiCheckCircle /> Submit & Finish</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-emerald-50 rounded-3xl border border-emerald-100 p-6 text-center">
            <FiCheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-black text-emerald-700">Ticket Completed</h3>
            <p className="text-xs text-emerald-600 mt-1">This service ticket has been marked as resolved.</p>
          </div>
        )}
      </div>
    </div>
  );
}
