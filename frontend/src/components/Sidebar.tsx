'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import SonorayLogo from './SonorayLogo';
import { 
  FiHome, FiPackage, FiTruck, FiUsers, 
  FiClipboard, FiMapPin, FiLogOut, FiSettings, FiActivity, FiCalendar, FiUser, FiMenu, FiX, FiTag,
  FiBell, FiInfo, FiCheck, FiAlertTriangle, FiAlertOctagon
} from 'react-icons/fi';

const adminLinks = [
  { name: 'Dashboard', href: '/admin', icon: FiHome },
  { name: 'Live Tracking', href: '/admin/tracking', icon: FiMapPin },
  { name: 'Field Updates', href: '/admin/social', icon: FiActivity },
  { name: 'Tickets', href: '/admin/tickets', icon: FiTag },
  { name: 'Installations', href: '/admin/machines', icon: FiPackage },
  { name: 'Inventory', href: '/admin/stock', icon: FiTruck },
  { name: 'Attendance', href: '/admin/attendance', icon: FiClipboard },
  { name: 'Employees', href: '/admin/employees', icon: FiUsers },
];

const employeeLinks = [
  { name: 'My Attendance', href: '/employee/attendance', icon: FiClipboard },
  { name: 'Field Updates', href: '/admin/social', icon: FiActivity },
  { name: 'My Tickets', href: '/employee/tickets', icon: FiTag },
  { name: 'Installations', href: '/employee/installations', icon: FiPackage },
  { name: 'Tracking', href: '/employee/tracking', icon: FiMapPin },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>({});
  const [links, setLinks] = useState<any[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState(false); // Mobile state

  // Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const role = user.role;
  const hasEmployeeRecord = !!user.employeeId;

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(savedUser);
    const userRole = savedUser.role;
    setLinks(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' ? adminLinks : employeeLinks);
    setYears(Array.from({ length: 3 }, (_, i) => new Date().getFullYear() + i));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchNotifications();
      // Poll every 30 seconds for live updates
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [mounted]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Dynamic Notifications Bell Widget */}
      {mounted && (
        <div className="fixed top-4 right-6 z-[100] no-print">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex items-center justify-center w-11 h-11 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all text-slate-600 focus:outline-none hover:border-slate-300 relative"
            >
              <FiBell className="w-5 h-5" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white border-2 border-white shadow-sm animate-bounce">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {/* Zoho ERP Styled Notifications Popover Tray */}
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-45" 
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
                  {/* Popover Header */}
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Alerts</span>
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[9px] font-black text-sky-600 hover:text-sky-700 uppercase tracking-widest transition-all focus:outline-none underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Popover List */}
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
                          <FiBell className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-400">All caught up! No alerts.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        let IconComponent = FiInfo;
                        let iconStyles = "bg-sky-50 text-sky-600 border-sky-100";
                        if (notif.type === 'SUCCESS') {
                          IconComponent = FiCheck;
                          iconStyles = "bg-emerald-50 text-emerald-600 border-emerald-100";
                        } else if (notif.type === 'WARNING') {
                          IconComponent = FiAlertTriangle;
                          iconStyles = "bg-amber-50 text-amber-600 border-amber-100";
                        } else if (notif.type === 'URGENT') {
                          IconComponent = FiAlertOctagon;
                          iconStyles = "bg-rose-50 text-rose-600 border-rose-100";
                        }

                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleMarkAsRead(notif.id)}
                            className={`p-4 flex gap-3 hover:bg-slate-50 transition-all cursor-pointer items-start ${
                              !notif.isRead ? 'bg-sky-50/20' : ''
                            }`}
                          >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${iconStyles}`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className={`text-xs font-bold leading-tight ${
                                  !notif.isRead ? 'text-slate-900 font-extrabold' : 'text-slate-600 font-semibold'
                                }`}>
                                  {notif.title}
                                </h4>
                                {!notif.isRead && (
                                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sky-600 mt-1" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                {notif.message}
                              </p>
                              <span className="text-[8px] text-slate-400 font-bold block pt-1 uppercase tracking-wider">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-[100] p-2.5 bg-white border border-slate-200 rounded-xl shadow-lg text-sky-600"
      >
        {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
      </button>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80]"
        />
      )}

      <div className={`
        w-64 bg-white h-screen border-r border-slate-100 flex flex-col fixed left-0 top-0 shadow-sm no-print z-[90]
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 pb-6 pt-16 md:pt-6 border-b border-slate-100/60 bg-white flex flex-col items-center justify-center">
          <SonorayLogo size="sm" className="w-full max-w-[130px] mb-2.5" />
          <span className="inline-block px-2.5 py-0.5 bg-sky-50 text-sky-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-sky-100 shadow-sm">
            {!mounted ? '...' : (role === 'ADMIN' || role === 'SUPER_ADMIN' ? 'Corporate Admin' : 'Field Engineer')}
          </span>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3.5 pt-6" onClick={() => setIsOpen(false)}>
          {links.map((link) => {
            if (link.name === 'Attendance') {
              return (
                <div key="Attendance-Group" className="space-y-1 my-2">
                  <div className="flex items-center gap-3 px-3 py-1.5 text-slate-400 text-[8px] font-black uppercase tracking-widest">
                    Attendance Years
                  </div>
                  {years.map(year => {
                    const isYearActive = pathname === `/admin/attendance/${year}`;
                    return (
                      <Link 
                        key={year} 
                        href={`/admin/attendance/${year}`}
                        className={`flex items-center gap-3 px-4.5 py-2 text-xs font-bold transition-all rounded-lg ${
                          isYearActive
                            ? 'bg-sky-50 text-sky-600 font-bold' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                      >
                        <FiCalendar className="w-3.5 h-3.5" />
                        {year}
                      </Link>
                    );
                  })}
                </div>
              );
            }
            const isActive = link.href === '/admin'
              ? pathname === '/admin'
              : (pathname === link.href || pathname.startsWith(link.href + '/'));
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className={`flex items-center gap-3 px-4 py-2.5 transition-all text-[13px] rounded-xl ${
                  isActive 
                    ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-200/60' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                }`}
              >
                <link.icon className="w-4.5 h-4.5" />
                {link.name}
              </Link>
            );
          })}

          {/* If admin has an employee record, show "My Attendance" link */}
          {(role === 'ADMIN' || role === 'SUPER_ADMIN') && hasEmployeeRecord && (
            <div className="pt-3.5 space-y-1">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-3 pb-1">
                My Records
              </div>
              <Link 
                href="/employee/attendance"
                className={`flex items-center gap-3 px-4 py-2.5 transition-all text-[13px] rounded-xl ${
                  pathname === '/employee/attendance'
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-200/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                }`}
              >
                <FiUser className="w-4.5 h-4.5" />
                My Attendance
              </Link>
            </div>
          )}
        </nav>

        <div className="p-3.5 border-t border-slate-100 bg-white space-y-1">
          <Link 
            href="/employee/profile"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all text-xs font-bold"
          >
            <FiSettings className="w-4 h-4 text-slate-400" />
            Settings
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-all text-xs font-bold"
          >
            <FiLogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Developer Credit */}
        <div className="mx-4 mb-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Developed By</p>
          <p className="text-[12px] font-black text-slate-800 leading-tight tracking-tight">YUGESH ELUMALAI</p>
          <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[8px] font-bold uppercase tracking-wider rounded">
            System Developer
          </span>
        </div>
      </div>
    </>
  );
}
