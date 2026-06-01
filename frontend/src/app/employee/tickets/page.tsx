'use client';

import { useEffect, useState } from 'react';
import { FiCheckCircle, FiClock, FiMapPin, FiAlertCircle, FiChevronRight, FiCalendar } from 'react-icons/fi';
import Link from 'next/link';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  scheduledDate: string | null;
  hospitalName: string | null;
  location: string | null;
  driveUrl: string | null;
  customer: { companyName: string; address: string };
  createdAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  LOW: 'bg-slate-100 text-slate-500',
};

export default function EmployeeTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tickets/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setTickets(res.ok ? (await res.json()) : []);
    } catch { setTickets([]); }
    finally { setLoading(false); }
  };

  const filteredTickets = tickets.filter(t => !filterDate || (t.scheduledDate && t.scheduledDate.startsWith(filterDate)));
  const pending = filteredTickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const done = filteredTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');

  const TicketCard = ({ ticket }: { ticket: Ticket }) => {
    const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
    return (
      <Link
        href={`/employee/tickets/${ticket.id}`}
        className={`block rounded-2xl border shadow-sm transition-all hover:shadow-md group ${isResolved ? 'bg-slate-50 border-slate-100 opacity-70' : 'bg-white border-slate-100'}`}
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-1.5">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${PRIORITY_COLORS[ticket.priority]}`}>
                  {ticket.priority}
                </span>
                {isResolved ? (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-700 flex items-center gap-1">
                    <FiCheckCircle className="w-2.5 h-2.5" /> Completed
                  </span>
                ) : (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-yellow-100 text-yellow-700">
                    Pending
                  </span>
                )}
              </div>
              <h3 className={`font-bold text-sm leading-tight ${isResolved ? 'text-slate-500 line-through' : 'text-slate-800 group-hover:text-blue-600'} transition-colors`}>
                {ticket.title}
              </h3>
            </div>
            <FiChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors w-5 h-5 shrink-0 mt-0.5" />
          </div>

          <div className="space-y-1.5">
            {ticket.hospitalName && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <FiMapPin className="text-emerald-500 w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">{ticket.hospitalName}</span>
              </div>
            )}
            {ticket.location && (
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <div className="w-3.5 shrink-0" />
                <span className="line-clamp-1">{ticket.location}</span>
              </div>
            )}
            {ticket.scheduledDate && (
              <div className="flex items-center gap-2 text-xs text-purple-600 font-semibold">
                <FiCalendar className="w-3.5 h-3.5 shrink-0" />
                {new Date(ticket.scheduledDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            )}
            {!ticket.hospitalName && !ticket.scheduledDate && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <FiClock className="w-3.5 h-3.5" />
                Assigned {new Date(ticket.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Service Tickets</h1>
            <p className="text-slate-500 text-sm mt-1">Your assigned service visits and tasks.</p>
          </div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-blue-500 transition-colors shadow-sm"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-100 shadow-sm">
            <FiCheckCircle className="w-12 h-12 mx-auto mb-4 text-slate-200" />
            <p className="font-medium">No tickets assigned to you yet.</p>
            <p className="text-sm mt-1">Check back later or contact your admin.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="text-yellow-500 w-4 h-4" />
                  <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Pending ({pending.length})</h2>
                </div>
                {pending.map(t => <TicketCard key={t.id} ticket={t} />)}
              </div>
            )}

            {done.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="text-emerald-500 w-4 h-4" />
                  <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider">Completed ({done.length})</h2>
                </div>
                {done.map(t => <TicketCard key={t.id} ticket={t} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
