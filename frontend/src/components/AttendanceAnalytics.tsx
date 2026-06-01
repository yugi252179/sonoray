'use client';

import { FiUsers, FiClock, FiCalendar, FiActivity } from 'react-icons/fi';

interface AnalyticsProps {
  stats: {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    onLeaveToday: number;
    avgAttendance: string;
  };
}

export default function AttendanceAnalytics({ stats }: AnalyticsProps) {
  const cards = [
    { title: 'Total Employees', value: stats.totalEmployees, icon: FiUsers, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Present Today', value: stats.presentToday, icon: FiClock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'On Leave', value: stats.onLeaveToday, icon: FiCalendar, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Avg. Attendance', value: `${stats.avgAttendance}%`, icon: FiActivity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white p-3 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 flex items-center gap-2 md:gap-4 hover:shadow-md transition-all">
          <div className={`${card.bg} p-2 md:p-4 rounded-xl md:rounded-2xl shrink-0`}>
            <card.icon className={`w-4 h-4 md:w-6 md:h-6 ${card.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{card.title}</p>
            <p className="text-sm md:text-2xl font-black text-slate-900">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
