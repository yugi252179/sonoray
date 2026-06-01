'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { 
  FiCalendar, FiSearch, FiChevronLeft, FiChevronRight, 
  FiDownload, FiPrinter, FiUser, FiInfo, FiCheckCircle, FiXCircle, FiClock, FiPlus
} from 'react-icons/fi';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, isToday, isSameDay } from 'date-fns';
import { exportToExcel, exportToPDF } from '../../../../utils/export';
import BulkHolidayModal from '../../../../components/BulkHolidayModal';
import MarkAttendanceModal from '../../../../components/MarkAttendanceModal';
import AttendanceAnalytics from '../../../../components/AttendanceAnalytics';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { toLocalISOString, isSameDayLocal } from '../../../../utils/dateHelpers';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  department: { name: string };
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY';
  punchInTime?: string;
  punchOutTime?: string;
}

const STATUS_COLORS = {
  PRESENT: 'bg-emerald-500 text-white',
  ABSENT: 'bg-rose-500 text-white',
  LEAVE: 'bg-blue-500 text-white',
  HOLIDAY: 'bg-amber-400 text-white',
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function AdminAttendanceContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const yearFromPath = params.year as string;
  const yearFromQuery = searchParams.get('year');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
    avgAttendance: '0'
  });
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(yearFromPath ? parseInt(yearFromPath) : (yearFromQuery ? parseInt(yearFromQuery) : new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [activePicker, setActivePicker] = useState<{ empId: string, date: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    if (yearFromPath) {
      setSelectedYear(parseInt(yearFromPath));
    } else if (yearFromQuery) {
      setSelectedYear(parseInt(yearFromQuery));
    }
  }, [yearFromPath, yearFromQuery]);

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const empRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const empData = await empRes.json();
      setEmployees(empData);

      const attRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance?month=${selectedMonth + 1}&year=${selectedYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const attData = await attRes.json();
      setAttendance(attData);

      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      setStats(statsData);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(new Date(selectedYear, selectedMonth)),
    end: endOfMonth(new Date(selectedYear, selectedMonth))
  });

  const handleStatusChange = async (employeeId: string, date: Date, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const dateStr = toLocalISOString(date);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/status-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId,
          date: dateStr,
          status
        })
      });

      if (res.ok) {
        const updatedRecord = await res.json();
        setAttendance(prev => {
          const index = prev.findIndex(r => r.employeeId === employeeId && isSameDayLocal(r.date, date));
          if (index >= 0) {
            const newAtt = [...prev];
            newAtt[index] = updatedRecord;
            return newAtt;
          }
          return [...prev, updatedRecord];
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getStatus = (employeeId: string, date: Date) => {
    const record = attendance.find(r => r.employeeId === employeeId && isSameDayLocal(r.date, date));
    if (record) return record.status;
    if (isSunday(date)) return 'HOLIDAY';
    return null;
  };

  const calculateStats = (employeeId: string) => {
    const empAtt = attendance.filter(r => r.employeeId === employeeId);
    const present = empAtt.filter(r => r.status === 'PRESENT').length;
    const absent = empAtt.filter(r => r.status === 'ABSENT').length;
    const leave = empAtt.filter(r => r.status === 'LEAVE').length;
    const holiday = empAtt.filter(r => r.status === 'HOLIDAY').length + daysInMonth.filter(d => isSunday(d) && !empAtt.some(r => isSameDayLocal(r.date, d))).length;
    
    const workingDays = daysInMonth.length - holiday;
    const percentage = workingDays > 0 ? (present / workingDays) * 100 : 0;

    return { present, absent, leave, holiday, percentage: percentage.toFixed(1) };
  };

  const handleExportExcel = () => {
    const data = filteredEmployees.map(emp => {
      const stats = calculateStats(emp.id);
      return {
        'Employee Name': `${emp.firstName} ${emp.lastName}`,
        'Department': emp.department?.name || 'Staff',
        'Present': stats.present,
        'Absent': stats.absent,
        'Leave': stats.leave,
        'Holiday': stats.holiday,
        'Percentage': `${stats.percentage}%`
      };
    });
    exportToExcel(data, `Attendance_${MONTHS[selectedMonth]}_${selectedYear}`);
  };

  const handleExportPDF = () => {
    const headers = ['Employee', 'P', 'A', 'L', 'H', '%'];
    const rows = filteredEmployees.map(emp => {
      const stats = calculateStats(emp.id);
      return [
        `${emp.firstName} ${emp.lastName}`,
        stats.present,
        stats.absent,
        stats.leave,
        stats.holiday,
        `${stats.percentage}%`
      ];
    });
    exportToPDF(headers, rows, `Attendance_${MONTHS[selectedMonth]}_${selectedYear}`, `Attendance Report - ${MONTHS[selectedMonth]} ${selectedYear}`);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'All' || emp.department?.name === selectedDept;
    return matchesSearch && matchesDept;
  });

  const departments = ['All', ...Array.from(new Set(employees.map(e => e.department?.name || 'General')))];

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      
      {/* Year Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex w-20 bg-white border-r border-slate-100 flex-col items-center py-8 gap-4 overflow-y-auto shrink-0">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-4">
          <FiCalendar className="w-6 h-6" />
        </div>
        {years.map(year => (
          <button
            key={year}
            onClick={() => router.push(`/admin/attendance/${year}`)}
            className={`w-12 h-12 rounded-2xl font-black text-sm transition-all ${
              selectedYear === year 
                ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100' 
                : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <div className="p-4 md:p-6 bg-white border-b border-slate-100 shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Attendance</h1>
                {/* Year Dropdown for Mobile */}
                <select 
                  className="lg:hidden bg-slate-50 border-none rounded-lg text-xs font-black text-blue-600 px-2 py-1 outline-none"
                  value={selectedYear}
                  onChange={(e) => router.push(`/admin/attendance/${e.target.value}`)}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <p className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Personnel Management</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setIsManualModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-black hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
              >
                <FiPlus /> <span className="xs:inline">Mark Entry</span>
              </button>
              <button 
                onClick={() => setIsHolidayModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 text-amber-600 rounded-xl text-[11px] font-black hover:bg-amber-100 transition-all"
              >
                <FiPlus /> <span className="xs:inline">Holiday</span>
              </button>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {MONTHS.map((month, idx) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(idx)}
                className={`px-3.5 py-2 rounded-xl text-[11px] font-black whitespace-nowrap transition-all ${
                  selectedMonth === idx 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {month.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Section - Compressed on Mobile */}
        <div className="px-4 py-3 md:px-6 md:py-4">
           <AttendanceAnalytics stats={stats} />
        </div>

        {/* Filters & Search */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-4 shrink-0 overflow-x-auto">
          <div className="relative flex-1 max-w-sm">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search employee..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          
          <div className="flex items-center gap-6 ml-auto pr-4">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Present</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Absent</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Holiday</span>
             </div>
          </div>
        </div>

        {/* Table Container (Desktop) / Calendar View (Mobile) */}
        <div className="flex-1 overflow-auto relative" ref={scrollRef}>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <table className="w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-20 bg-white">
                <tr>
                  <th className="sticky left-0 z-30 bg-white px-6 py-4 border-b border-r border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Employee Name</th>
                  {daysInMonth.map(day => (
                    <th 
                      key={day.toString()} 
                      className={`px-3 py-4 border-b border-r border-slate-100 text-center min-w-[45px] ${isToday(day) ? 'bg-blue-50/50' : ''}`}
                    >
                      <p className={`text-[10px] font-black ${isSunday(day) ? 'text-rose-500' : 'text-slate-400'}`}>{format(day, 'EEE')}</p>
                      <p className={`text-sm font-black mt-0.5 ${isToday(day) ? 'text-blue-600 underline decoration-2 underline-offset-4' : 'text-slate-800'}`}>{format(day, 'd')}</p>
                    </th>
                  ))}
                  <th className="px-6 py-4 border-b border-slate-100 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 min-w-[80px]">P</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 min-w-[80px]">A</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 min-w-[80px]">H</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 min-w-[80px]">%</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={daysInMonth.length + 6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Generating Attendance Ledger...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees.map(emp => {
                  const stats = calculateStats(emp.id);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-6 py-4 border-b border-r border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                            {emp.firstName[0]}{emp.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{emp.firstName} {emp.lastName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{emp.department?.name || 'Staff'}</p>
                          </div>
                        </div>
                      </td>
                      {daysInMonth.map(day => {
                        const status = getStatus(emp.id, day);
                        return (
                          <td 
                            key={day.toString()} 
                            className={`p-1 border-b border-r border-slate-100 text-center ${isToday(day) ? 'bg-blue-50/20' : ''}`}
                          >
                            <div className="relative flex justify-center items-center h-full">
                              <button
                                onClick={() => setActivePicker(activePicker?.empId === emp.id && activePicker?.date === day.toISOString() ? null : { empId: emp.id, date: day.toISOString() })}
                                className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all flex items-center justify-center border-2 ${
                                  status 
                                    ? `${STATUS_COLORS[status as keyof typeof STATUS_COLORS]} border-transparent shadow-sm` 
                                    : 'bg-white border-slate-100 text-slate-300 hover:border-blue-200 hover:text-blue-400'
                                }`}
                              >
                                {status ? status[0] : '-'}
                              </button>

                              {/* Status Picker Popover */}
                              {activePicker?.empId === emp.id && activePicker?.date === day.toISOString() && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setActivePicker(null)}></div>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 flex flex-col gap-1 min-w-[120px] animate-in fade-in slide-in-from-top-2 duration-200">
                                    {[
                                      { id: 'PRESENT', label: 'Present', color: 'bg-emerald-500', icon: FiCheckCircle },
                                      { id: 'ABSENT', label: 'Absent', color: 'bg-rose-500', icon: FiXCircle },
                                      { id: 'HOLIDAY', label: 'Holiday', color: 'bg-amber-400', icon: FiCalendar },
                                    ].map(opt => (
                                      <button
                                        key={opt.id}
                                        onClick={() => {
                                          handleStatusChange(emp.id, day, opt.id);
                                          setActivePicker(null);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl transition-all group"
                                      >
                                        <div className={`w-6 h-6 rounded-lg ${opt.color} flex items-center justify-center text-white`}>
                                          <opt.icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">{opt.label}</span>
                                      </button>
                                    ))}
                                    <div className="h-px bg-slate-50 my-1"></div>
                                    <button
                                      onClick={() => {
                                        handleStatusChange(emp.id, day, '');
                                        setActivePicker(null);
                                      }}
                                      className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 hover:text-slate-600"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-4 border-b border-slate-100 text-center text-sm font-black text-emerald-600 bg-emerald-50/20">{stats.present}</td>
                      <td className="px-3 py-4 border-b border-slate-100 text-center text-sm font-black text-rose-600 bg-rose-50/20">{stats.absent}</td>
                      <td className="px-3 py-4 border-b border-slate-100 text-center text-sm font-black text-amber-600 bg-amber-50/20">{stats.holiday}</td>
                      <td className="px-3 py-4 border-b border-slate-100 text-center text-sm font-black text-slate-800 bg-slate-50">{stats.percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Calendar View */}
          <div className="lg:hidden p-4 space-y-4">
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-xs font-bold text-slate-400 uppercase">Loading Attendance View...</p>
              </div>
            ) : filteredEmployees.map(emp => {
              const stats = calculateStats(emp.id);
              return (
                <div key={emp.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{emp.firstName} {emp.lastName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.department?.name || 'Staff'}</p>
                      </div>
                    </div>
                    <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{stats.percentage}%</div>
                  </div>
                  
                  {/* Calendar Grid Box */}
                  <div className="grid grid-cols-7 gap-1 bg-slate-50 p-2 rounded-2xl">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <div key={i} className="text-center text-[9px] font-black text-slate-300 py-1">{d}</div>
                    ))}
                    {/* Add padding for start of month */}
                    {Array.from({ length: startOfMonth(new Date(selectedYear, selectedMonth)).getDay() }).map((_, i) => (
                      <div key={`pad-${i}`} className="h-8 md:h-10"></div>
                    ))}
                    {daysInMonth.map(day => {
                      const status = getStatus(emp.id, day);
                      return (
                        <div key={day.toString()} className="relative flex justify-center items-center h-full">
                          <button
                            onClick={() => setActivePicker(activePicker?.empId === emp.id && activePicker?.date === day.toISOString() ? null : { empId: emp.id, date: day.toISOString() })}
                            className={`w-full h-9 md:h-11 rounded-lg flex flex-col items-center justify-center transition-all relative ${
                              status 
                                ? `${STATUS_COLORS[status as keyof typeof STATUS_COLORS]} shadow-sm` 
                                : isSunday(day) ? 'bg-rose-50 text-rose-350' : 'bg-white text-slate-400 hover:bg-blue-50 hover:text-blue-500'
                            } ${isToday(day) ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                          >
                            <span className="text-[10px] font-black">{format(day, 'd')}</span>
                            {status && <span className="text-[7px] font-bold leading-none opacity-80">{status[0]}</span>}
                          </button>

                          {/* Status Picker Popover for Mobile */}
                          {activePicker?.empId === emp.id && activePicker?.date === day.toISOString() && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActivePicker(null)}></div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 flex flex-col gap-1 min-w-[120px] animate-in fade-in slide-in-from-top-2 duration-200">
                                {[
                                  { id: 'PRESENT', label: 'Present', color: 'bg-emerald-500', icon: FiCheckCircle },
                                  { id: 'ABSENT', label: 'Absent', color: 'bg-rose-500', icon: FiXCircle },
                                  { id: 'HOLIDAY', label: 'Holiday', color: 'bg-amber-400', icon: FiCalendar },
                                ].map(opt => (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      handleStatusChange(emp.id, day, opt.id);
                                      setActivePicker(null);
                                    }}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl transition-all group"
                                  >
                                    <div className={`w-6 h-6 rounded-lg ${opt.color} flex items-center justify-center text-white`}>
                                      <opt.icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">{opt.label}</span>
                                  </button>
                                ))}
                                <div className="h-px bg-slate-50 my-1"></div>
                                <button
                                  onClick={() => {
                                    handleStatusChange(emp.id, day, '');
                                    setActivePicker(null);
                                  }}
                                  className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 hover:text-slate-600"
                                >
                                  Clear
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="bg-emerald-50 rounded-xl p-2 text-center">
                      <p className="text-[8px] font-black text-emerald-400 uppercase">Pres</p>
                      <p className="text-xs font-black text-emerald-600">{stats.present}</p>
                    </div>
                    <div className="bg-rose-50 rounded-xl p-2 text-center">
                      <p className="text-[8px] font-black text-rose-400 uppercase">Abs</p>
                      <p className="text-xs font-black text-rose-600">{stats.absent}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-2 text-center">
                      <p className="text-[8px] font-black text-amber-400 uppercase">Hol</p>
                      <p className="text-xs font-black text-amber-600">{stats.holiday}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BulkHolidayModal 
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        onSuccess={fetchData}
      />

      <MarkAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={fetchData}
        employees={employees}
      />
    </div>
  );
}

export default function AdminAttendancePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-slate-400 font-bold">Loading Attendance...</div>}>
      <AdminAttendanceContent />
    </Suspense>
  );
}
