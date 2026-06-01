'use client';

import { useState } from 'react';
import { FiX, FiCalendar, FiClock, FiUser } from 'react-icons/fi';

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employees: any[];
}

export default function MarkAttendanceModal({ isOpen, onClose, onSuccess, employees }: MarkAttendanceModalProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [punchIn, setPunchIn] = useState('09:00');
  const [punchOut, setPunchOut] = useState('18:00');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const punchInTime = new Date(`${date}T${punchIn}:00`);
      const punchOutTime = punchOut ? new Date(`${date}T${punchOut}:00`) : null;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/status-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeId,
          date,
          status: 'PRESENT',
          punchInTime: punchInTime.toISOString(),
          punchOutTime: punchOutTime ? punchOutTime.toISOString() : null
        })
      });

      if (res.ok) {
        onSuccess();
        onClose();
        alert('Attendance marked successfully');
      } else {
        const data = await res.json();
        alert(data.message || 'Error marking attendance');
      }
    } catch (error) {
      console.error(error);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col border border-slate-100 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
        <div className="p-8 pb-4 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Manual Entry</h2>
            <p className="text-slate-500 text-sm font-medium">Record attendance for staff.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Employee</label>
            <div className="relative group">
              <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <select
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-bold text-slate-700 appearance-none"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">Choose an engineer...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Work Date</label>
            <div className="relative group">
              <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="date"
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-bold text-slate-700"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Punch In</label>
              <div className="relative group">
                <FiClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="time"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-bold text-slate-700"
                  value={punchIn}
                  onChange={(e) => setPunchIn(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Punch Out</label>
              <div className="relative group">
                <FiClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="time"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-bold text-slate-700"
                  value={punchOut}
                  onChange={(e) => setPunchOut(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 sticky bottom-0 bg-white">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Processing...' : 'Confirm Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

