'use client';

import { useEffect, useState } from 'react';
import { FiX, FiMail, FiPhone, FiTag, FiClock, FiMapPin, FiCalendar } from 'react-icons/fi';

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
}

export default function EmployeeProfileModal({ isOpen, onClose, employeeId }: EmployeeProfileModalProps) {
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchEmployeeDetails();
    }
  }, [isOpen, employeeId]);

  const fetchEmployeeDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/employees/${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployee(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-5">
             <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-200">
                {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : '??'}
             </div>
             <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  {employee ? `${employee.firstName} ${employee.lastName}` : 'Loading...'}
                </h2>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-black px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md uppercase tracking-tighter">
                    {employee?.user?.role?.replace('_', ' ') || 'EMPLOYEE'}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md uppercase tracking-tighter">
                    Active
                  </span>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fetching Personnel Data...</p>
            </div>
          ) : employee && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Basic Info */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm font-bold text-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-500">
                      <FiMail className="w-5 h-5" />
                    </div>
                    {employee.user.email}
                  </div>
                  <div className="flex items-center gap-4 text-sm font-bold text-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-500">
                      <FiPhone className="w-5 h-5" />
                    </div>
                    {employee.phone || 'N/A'}
                  </div>
                  <div className="flex items-center gap-4 text-sm font-bold text-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-500">
                      <FiTag className="w-5 h-5" />
                    </div>
                    {employee.department?.name || 'General'}
                  </div>
                </div>
              </div>

              {/* Stats/Summary */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Attendance</p>
                    <p className="text-xl font-black text-blue-700">{employee.attendance.length}</p>
                    <p className="text-[10px] font-bold text-blue-500/60 mt-1">Total Days</p>
                  </div>
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Gps Logs</p>
                    <p className="text-xl font-black text-emerald-700">{employee.gpsLogs.length}</p>
                    <p className="text-[10px] font-bold text-emerald-500/60 mt-1">Recent Updates</p>
                  </div>
                </div>
              </div>

              {/* Attendance History */}
              <div className="col-span-full space-y-6">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Recent Attendance</h3>
                 <div className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">In</th>
                          <th className="px-6 py-3">Out</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employee.attendance.length === 0 ? (
                          <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 font-bold text-xs">No records available</td></tr>
                        ) : (
                          employee.attendance.map((att: any) => (
                            <tr key={att.id} className="text-xs font-bold text-slate-600">
                              <td className="px-6 py-4 flex items-center gap-2">
                                <FiCalendar className="text-slate-400" />
                                {new Date(att.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-emerald-600">
                                {new Date(att.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-6 py-4 text-blue-600">
                                {att.punchOutTime ? new Date(att.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                 </div>
              </div>

              {/* Location History */}
              <div className="col-span-full space-y-6">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Recent Live Tracking</h3>
                 <div className="space-y-3">
                   {employee.gpsLogs.length === 0 ? (
                     <div className="text-center py-6 text-slate-400 font-bold text-xs italic">No tracking data found</div>
                   ) : (
                     employee.gpsLogs.map((log: any) => (
                        <div key={log.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-blue-500 shrink-0">
                             <FiMapPin className="w-4 h-4" />
                           </div>
                           <div className="flex-1 min-w-0">
                             <p className="text-xs font-bold text-slate-800 line-clamp-1">{log.address || 'Unknown Location'}</p>
                             <div className="flex gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase">
                               <span className="flex items-center gap-1"><FiClock /> {new Date(log.timestamp).toLocaleString()}</span>
                               <span className="flex items-center gap-1">🔋 {log.batteryLevel}%</span>
                             </div>
                           </div>
                        </div>
                     ))
                   )}
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
