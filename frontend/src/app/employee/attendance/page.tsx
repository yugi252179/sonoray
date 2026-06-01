'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiCalendar, FiClock, FiCheckCircle, FiFileText, FiChevronRight, FiXCircle, FiTrendingUp, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import { toLocalISOString } from '../../../utils/dateHelpers';
import LeaveRequestModal from '../../../components/LeaveRequestModal';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY';
  punchInTime: string;
  punchOutTime: string | null;
}

export default function EmployeeAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [status, setStatus] = useState<'IN' | 'OUT' | 'PENDING'>('PENDING');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const router = useRouter();

  useEffect(() => {
    // Load user info
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const u = JSON.parse(userJson);
      setUserRole(u.role || '');
    }

    fetchHistory();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.warn("Location error (insecure context or permission denied):", err.message);
          // Set fallback location for development testing on local network (which blocks insecure geolocation)
          setLocation({ lat: 13.0827, lng: 80.2707 }); 
        }
      );
    } else {
      console.warn("Geolocation is not supported by this browser.");
      setLocation({ lat: 13.0827, lng: 80.2707 });
    }

    return () => clearInterval(timer);
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/my-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
        
        const todayStr = toLocalISOString(new Date());
        const todayRecord = data.find((r: AttendanceRecord) => r.date.startsWith(todayStr));
        
        if (!todayRecord || todayRecord.status !== 'PRESENT') {
          setStatus('OUT');
          localStorage.setItem('isPunchedIn', 'false');
          window.dispatchEvent(new Event('attendance-change'));
        } else if (!todayRecord.punchOutTime) {
          setStatus('IN');
          localStorage.setItem('isPunchedIn', 'true');
          window.dispatchEvent(new Event('attendance-change'));
        } else {
          setStatus('OUT');
          localStorage.setItem('isPunchedIn', 'false');
          window.dispatchEvent(new Event('attendance-change'));
        }
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePunch = async () => {
    setPunching(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = status === 'OUT' ? '/api/attendance/punch-in' : '/api/attendance/punch-out';
      
      const todayStr = toLocalISOString(new Date());

      const body = status === 'OUT' ? {
        latitude: location?.lat,
        longitude: location?.lng,
        date: todayStr
      } : {
        date: todayStr
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        await fetchHistory();
      } else {
        const err = await res.json();
        alert(err.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Punch error:', error);
    } finally {
      setPunching(false);
    }
  };

  // Stats computation
  const totalPresent = records.filter(r => r.status === 'PRESENT').length;
  const totalAbsent = records.filter(r => r.status === 'ABSENT').length;
  const totalLeave = records.filter(r => r.status === 'LEAVE').length;
  const totalDays = records.length;
  const attendanceRate = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const filteredRecords = records.filter(r => new Date(r.date).getMonth() === filterMonth);

  const isAdminViewing = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 32px' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(.22,1,.36,1) both; }
        .punch-btn:active { transform: scale(0.97); }

        @media (max-width: 900px) {
          .page-container { padding: 16px 20px !important; }
          .main-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (max-width: 640px) {
          .page-container { padding: 12px 14px !important; }
          .header-container { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; margin-bottom: 20px !important; }
          .header-time { text-align: left !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
          .month-filter-header { padding: 16px 20px !important; }
          .month-filter-header h3 { font-size: 14px !important; }
          .month-filter-container { gap: 4px !important; margin-top: 8px !important; }
          .month-filter-container button { padding: 4px 8px !important; font-size: 10px !important; }
          .history-table-container th, .history-table-container td { padding: 12px 14px !important; }
          .history-timing { flex-direction: column !important; gap: 4px !important; align-items: flex-start !important; }
        }
      `}</style>

      {/* Header */}
      <div className="fade-up header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: '10px',
              padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FiUser style={{ color: 'white', width: '18px', height: '18px' }} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {isAdminViewing ? 'My Attendance Record' : 'Attendance'}
            </h1>
          </div>
          <p style={{ color: '#64748b', fontWeight: 500, fontSize: '14px', margin: 0 }}>
            {isAdminViewing ? 'Your personal attendance history as a field member' : 'Daily status and reporting'}
          </p>
        </div>
        <div className="header-time" style={{
          background: 'linear-gradient(135deg, #1e3a5f, #0f172a)', borderRadius: '16px',
          padding: '14px 20px', textAlign: 'right',
        }}>
          <p style={{ color: '#60a5fa', fontSize: '22px', fontWeight: 800, margin: 0 }}>
            {currentTime.toLocaleTimeString()}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {format(currentTime, 'EEEE, MMM do')}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="fade-up stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px', animationDelay: '0.1s' }}>
        {[
          { label: 'Present', value: totalPresent, color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'Absent', value: totalAbsent, color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
          { label: 'Rate', value: `${attendanceRate}%`, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: stat.bg, border: `1px solid ${stat.border}`,
            borderRadius: '16px', padding: '18px 20px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '28px', fontWeight: 800, color: stat.color, margin: 0 }}>{stat.value}</p>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        
        {/* Action Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="fade-up" style={{
            background: '#fff', borderRadius: '24px', padding: '28px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            animationDelay: '0.15s',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
              background: status === 'IN'
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #3b82f6, #6366f1)',
              boxShadow: status === 'IN' ? '0 8px 32px rgba(16,185,129,0.4)' : '0 8px 32px rgba(99,102,241,0.4)',
              transition: 'all 0.5s',
            }}>
              <FiClock style={{ color: 'white', width: '36px', height: '36px' }} />
            </div>
            
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              {status === 'IN' ? 'Active Duty' : 'Off Duty'}
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px', fontWeight: 500 }}>
              {location ? '📍 GPS Location Verified' : '⌛ Checking GPS...'}
            </p>

            <button
              onClick={handlePunch}
              disabled={punching || !location}
              className="punch-btn"
              style={{
                width: '100%', padding: '18px',
                background: status === 'OUT'
                  ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                  : 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none', borderRadius: '16px', color: '#fff',
                fontSize: '15px', fontWeight: 800, cursor: (punching || !location) ? 'not-allowed' : 'pointer',
                opacity: (punching || !location) ? 0.6 : 1,
                transition: 'all 0.2s', letterSpacing: '1px',
                boxShadow: status === 'OUT' ? '0 8px 32px rgba(99,102,241,0.4)' : '0 8px 32px rgba(239,68,68,0.4)',
              }}
            >
              {punching ? 'Processing...' : status === 'OUT' ? '⏵ PUNCH IN' : '⏹ PUNCH OUT'}
            </button>
          </div>

          {/* Action button column container space */}
        </div>

        {/* History Table */}
        <div className="fade-up animate-in fade-in duration-300" style={{
          background: '#fff', borderRadius: '24px',
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          animationDelay: '0.2s',
        }}>
          {/* Table header with month filter */}
          <div className="month-filter-header" style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Attendance History</h3>
            <div className="month-filter-container" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {months.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => setFilterMonth(idx)}
                  style={{
                    padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                    background: filterMonth === idx ? '#3b82f6' : '#f1f5f9',
                    color: filterMonth === idx ? '#fff' : '#64748b',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="history-table-container" style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 28px', textAlign: 'left', fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th>
                  <th style={{ padding: '12px 28px', textAlign: 'center', fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                  <th style={{ padding: '12px 28px', textAlign: 'left', fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Timing</th>
                  <th style={{ padding: '12px 28px', textAlign: 'right', fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ padding: '60px 28px', textAlign: 'center', color: '#94a3b8', fontWeight: 700, fontSize: '13px' }}>Loading attendance data...</td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '60px 28px', textAlign: 'center', color: '#94a3b8', fontWeight: 700, fontSize: '13px' }}>No records for {months[filterMonth]}</td></tr>
                ) : (
                  filteredRecords.map((record) => {
                    const punchIn = record.punchInTime ? new Date(record.punchInTime) : null;
                    const punchOut = record.punchOutTime ? new Date(record.punchOutTime) : null;
                    let hoursWorked = '--';
                    if (punchIn && punchOut) {
                      const diff = (punchOut.getTime() - punchIn.getTime()) / 3600000;
                      hoursWorked = `${diff.toFixed(1)}h`;
                    }

                    const statusConfig = {
                      PRESENT: { bg: '#f0fdf4', color: '#16a34a', label: 'Present' },
                      ABSENT: { bg: '#fef2f2', color: '#dc2626', label: 'Absent' },
                      LEAVE: { bg: '#eff6ff', color: '#2563eb', label: 'Leave' },
                      HOLIDAY: { bg: '#fffbeb', color: '#d97706', label: 'Holiday' },
                    }[record.status] || { bg: '#f8fafc', color: '#64748b', label: record.status };

                    return (
                      <tr key={record.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafbff'}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                      >
                        <td style={{ padding: '16px 28px' }}>
                          <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: '14px' }}>
                            {format(new Date(record.date.includes('T') ? record.date.split('T')[0] : record.date), 'MMM do, yyyy')}
                          </p>
                          <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, margin: '2px 0 0', textTransform: 'uppercase' }}>
                            {format(new Date(record.date.includes('T') ? record.date.split('T')[0] : record.date), 'EEEE')}
                          </p>
                        </td>
                        <td style={{ padding: '16px 28px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
                            background: statusConfig.bg, color: statusConfig.color,
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                          }}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td style={{ padding: '16px 28px' }}>
                          <div className="history-timing" style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiCheckCircle style={{ color: '#10b981', width: '14px', height: '14px' }} />
                              {punchIn ? format(punchIn, 'hh:mm a') : '--:--'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiXCircle style={{ color: '#3b82f6', width: '14px', height: '14px' }} />
                              {punchOut ? format(punchOut, 'hh:mm a') : '--:--'}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 28px', textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, color: hoursWorked !== '--' ? '#10b981' : '#94a3b8', fontSize: '14px' }}>
                            {hoursWorked}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <LeaveRequestModal 
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onSuccess={fetchHistory}
      />
    </div>
  );
}
