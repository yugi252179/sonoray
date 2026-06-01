'use client';

import { useEffect, useState } from 'react';
import {
  FiPlus, FiX, FiUser, FiMapPin, FiCalendar, FiClock, FiAlertCircle,
  FiCheckCircle, FiTrash2, FiFilter, FiSearch, FiExternalLink
} from 'react-icons/fi';

interface Employee { id: string; firstName: string; lastName: string; }
interface Customer { id: string; companyName: string; }
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
  customer: { companyName: string };
  assignedTo: { firstName: string; lastName: string } | null;
  createdAt: string;
  serviceReports?: Array<{
    id: string;
    workDone: string | null;
    breakdownDetails: string | null;
    partsReplaced: string | null;
    driveUrl: string | null;
    createdAt: string;
  }>;
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
  LOW: 'bg-slate-100 text-slate-500 border-slate-200',
};
const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-yellow-50 text-yellow-700',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-slate-50 text-slate-500',
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    customerId: '',
    assignedToId: '',
    priority: 'MEDIUM',
    scheduledDate: '',
    hospitalName: '',
    location: '',
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const token = () => localStorage.getItem('token');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tRes, eRes, cRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tickets`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/employees`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/hospitals`, { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      if (tRes.ok) setTickets(await tRes.json());
      if (eRes.ok) setEmployees(await eRes.json());
      if (cRes.ok) setCustomers(await cRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tickets`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ title: '', description: '', customerId: '', assignedToId: '', priority: 'MEDIUM', scheduledDate: '', hospitalName: '', location: '' });
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.message || 'Error creating ticket');
      }
    } catch (e) { alert('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ticket and all its service reports?')) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tickets/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
    });
    fetchAll();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tickets/${id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchAll();
  };

  const filtered = tickets
    .filter(t => filterStatus === 'ALL' || t.status === filterStatus)
    .filter(t => !filterDate || (t.scheduledDate && t.scheduledDate.startsWith(filterDate)))
    .filter(t =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.customer?.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.hospitalName || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : '').toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Service Tickets</h1>
          <p className="text-slate-500 mt-1 text-sm">Assign and manage field service tasks for engineers.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-200 font-bold text-sm"
        >
          <FiPlus className="stroke-[3px]" /> Assign Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets, engineers, hospitals..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-600 focus:border-blue-500 transition-colors h-[42px]"
        />
        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
        <span className="text-xs text-slate-400 font-bold ml-auto">{filtered.length} tickets</span>
      </div>

      {/* Ticket Cards */}
      {loading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => <div key={i} className="h-36 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
          <FiAlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No tickets found. Assign one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(ticket => (
            <div key={ticket.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${PRIORITY_COLORS[ticket.priority] || ''}`}>
                      {ticket.priority}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[ticket.status] || ''}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">#{ticket.id.slice(0, 8)}</span>
                  </div>

                  <h3 className="font-bold text-slate-800 mb-1 text-sm">{ticket.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-3">{ticket.description}</p>

                  {ticket.serviceReports && ticket.serviceReports.length > 0 && (
                    <div className="mt-3 mb-3 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Engineer's Report</p>
                      {ticket.serviceReports[0].workDone && (
                        <p className="text-xs text-slate-600"><span className="font-bold text-slate-700">Work Done:</span> {ticket.serviceReports[0].workDone}</p>
                      )}
                      {ticket.serviceReports[0].breakdownDetails && (
                        <p className="text-xs text-slate-600"><span className="font-bold text-slate-700">Details:</span> {ticket.serviceReports[0].breakdownDetails}</p>
                      )}
                      {ticket.serviceReports[0].partsReplaced && (
                        <p className="text-xs text-slate-600"><span className="font-bold text-slate-700">Parts Replaced:</span> {ticket.serviceReports[0].partsReplaced}</p>
                      )}
                      {ticket.serviceReports[0].driveUrl && (
                        <a href={ticket.serviceReports[0].driveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline mt-1 bg-blue-50 px-2 py-1 rounded-lg">
                          <FiExternalLink className="w-3 h-3" /> View Uploaded File/Report
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <FiUser className="text-blue-500" />
                      {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : <span className="text-rose-400 font-semibold">Unassigned</span>}
                    </span>
                    {ticket.hospitalName && (
                      <span className="flex items-center gap-1">
                        <FiMapPin className="text-emerald-500" /> {ticket.hospitalName}
                      </span>
                    )}
                    {ticket.scheduledDate && (
                      <span className="flex items-center gap-1">
                        <FiCalendar className="text-purple-500" />
                        {new Date(ticket.scheduledDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                    {ticket.driveUrl && (
                      <a href={ticket.driveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                        <FiExternalLink /> Drive Report
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
                    <select
                      value={ticket.status}
                      onChange={e => handleStatusChange(ticket.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 outline-none font-bold text-slate-600 cursor-pointer"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  )}
                  {ticket.status === 'RESOLVED' && (
                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold px-2 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
                      <FiCheckCircle /> Done
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(ticket.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
              <div>
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <FiPlus /> Assign Service Ticket
                </h2>
                <p className="text-blue-100 text-xs mt-0.5 font-medium">Schedule a field visit for an engineer</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-blue-700 rounded-xl transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Title */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Ticket Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Annual Preventive Maintenance"
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe the issue or task..."
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              {/* Hospital Name */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block flex items-center gap-1">
                  <FiMapPin className="text-emerald-500" /> Hospital / Customer Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Apollo Hospital, Velachery"
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.hospitalName}
                  onChange={e => setForm(p => ({ ...p, hospitalName: e.target.value }))}
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Full Address / Location</label>
                <textarea
                  rows={2}
                  placeholder="Full address of the site visit..."
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  value={form.location}
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Assign to Engineer */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Assign Engineer *</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={form.assignedToId}
                    onChange={e => setForm(p => ({ ...p, assignedToId: e.target.value }))}
                  >
                    <option value="">Select engineer...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Priority</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Scheduled Date & Time */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block flex items-center gap-1">
                  <FiClock className="text-purple-500" /> Scheduled Date & Time *
                </label>
                <input
                  required
                  type="datetime-local"
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.scheduledDate}
                  onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))}
                />
                <p className="text-[10px] text-slate-400 mt-1">You can assign multiple tickets on the same date to the same or different engineers.</p>
              </div>

              {/* Customer selection */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Linked Customer Record (Optional)</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.customerId}
                  onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}
                >
                  <option value="">None / Walk-in</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Assigning...' : <><FiCheckCircle /> Assign Ticket</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
