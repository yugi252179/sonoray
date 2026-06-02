'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import type { LocationData } from '../../../components/MapComponent';

const MapComponent = dynamic(() => import('../../../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', fontSize: '0.875rem' }}>
      🗺️ Loading Map...
    </div>
  ),
});

/* ─── reverse geocode ─── */
const fetchClientAddress = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    if (res.ok) {
      const json = await res.json();
      return json.display_name || null;
    }
  } catch (e) {
    console.error('Geocode error:', e);
  }
  return null;
};

/* ─── pure helpers (module-level, never change reference) ─── */
const statusRing  = (loc: LocationData) => loc.isOnDuty === false ? '#cbd5e1' : loc.isStale ? '#fda4af' : '#6ee7b7';
const statusColor = (loc: LocationData) => loc.isOnDuty === false ? '#64748b' : loc.isStale ? '#e11d48' : '#059669';
const statusBg    = (loc: LocationData) => loc.isOnDuty === false ? '#f1f5f9' : loc.isStale ? '#fff1f2' : '#ecfdf5';
const statusLabel = (loc: LocationData) => loc.isOnDuty === false ? 'Off Duty' : loc.isStale ? 'Stale' : 'On Duty';
const initials    = (name: string) => name.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2);

/* ══════════════════════════════════════════════════════
   EmployeeCard — MODULE-LEVEL so React never remounts it
   (inline components inside a parent cause remount on
   every render, killing in-flight image loads)
══════════════════════════════════════════════════════ */
interface CardProps {
  loc: LocationData;
  compact?: boolean;
  selectedId: string | null;
  onSelect: (id: string, hasLoc: boolean) => void;
}

function EmployeeCard({ loc, compact = false, selectedId, onSelect }: CardProps) {
  const isSelected = selectedId === loc.id;
  const hasLoc     = Number.isFinite(loc.lat) && Number.isFinite(loc.lng);
  const size       = compact ? 36 : 40;

  return (
    <div
      onClick={() => onSelect(loc.id, hasLoc)}
      className="tracking-emp-card"
      style={{
        padding: compact ? '0.75rem' : '1rem',
        cursor: hasLoc ? 'pointer' : 'default',
        borderLeft: `4px solid ${isSelected ? '#2563eb' : 'transparent'}`,
        background: isSelected ? '#eff6ff' : 'white',
        transition: 'background 0.15s ease, border-color 0.15s ease',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      {/* Avatar + name + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
        <div style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0,
          border: `2.5px solid ${statusRing(loc)}`,
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: loc.profileImage ? 'transparent' : '#e0e7ff',
          position: 'relative',
        }}>
          {loc.profileImage ? (
            <img
              src={loc.profileImage}
              alt={loc.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#4f46e5' }}>
              {initials(loc.name)}
            </span>
          )}
          {/* Live pulse dot */}
          {loc.isOnDuty && !loc.isStale && (
            <span style={{
              position: 'absolute', bottom: 1, right: 1,
              width: 8, height: 8, borderRadius: '50%',
              background: '#10b981', border: '1.5px solid white',
            }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.25rem' }}>
            <p style={{
              fontWeight: 700, color: '#1e293b',
              fontSize: compact ? '0.8rem' : '0.8125rem',
              margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {loc.name}
            </p>
            <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500, flexShrink: 0 }}>
              {loc.timestamp
                ? new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '–'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem' }}>
            <span style={{
              padding: '1px 6px', background: statusBg(loc), color: statusColor(loc),
              borderRadius: '999px', fontSize: '0.5625rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {statusLabel(loc)}
            </span>
            {loc.batteryLevel !== null && loc.batteryLevel !== undefined && (
              <span style={{ fontSize: '0.625rem', color: loc.batteryLevel > 20 ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
                🔋 {loc.batteryLevel}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Address row */}
      {loc.isOnDuty ? (
        loc.isStale ? (
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, padding: '0.3rem 0.5rem', background: '#fff1f2', borderRadius: '0.5rem', fontStyle: 'italic' }}>
            ⚠️ Last seen: {loc.address || 'Unknown'}
          </p>
        ) : !loc.lat ? (
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, padding: '0.3rem 0.5rem', background: '#f8fafc', borderRadius: '0.5rem', fontStyle: 'italic' }}>
            🛰️ Syncing location...
          </p>
        ) : (
          <p style={{
            fontSize: '0.75rem', color: '#64748b', margin: 0,
            padding: '0.3rem 0.5rem', background: '#f8fafc', borderRadius: '0.5rem',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            📍 {loc.address || 'Locating...'}
          </p>
        )
      ) : (
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, padding: '0.3rem 0.5rem', background: '#f8fafc', borderRadius: '0.5rem', fontStyle: 'italic' }}>
          Shift ended · Tracking off
        </p>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#2563eb', fontSize: '0.6rem', fontWeight: 700 }}>
          🎯 Map focused
        </div>
      )}
    </div>
  );
}

/* ─── StatChip — also module-level ─── */
interface ChipProps {
  count: number; label: string; color: string; bg: string; border: string; pulse?: boolean;
}
function StatChip({ count, label, color, bg, border, pulse }: ChipProps) {
  return (
    <div style={{
      background: bg, color, padding: '0.3rem 0.75rem', borderRadius: '9999px',
      fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${border}`,
      display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap',
    }}>
      <div style={{
        width: 7, height: 7, background: color, borderRadius: '50%',
        animation: pulse ? 'trackingPing 1.2s ease-in-out infinite' : 'none',
      }} />
      {count} {label}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Page Component
══════════════════════════════════════════════ */
export default function AdminTrackingPage() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 767);
    checkMobile(); // Check immediately on mount
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /* ─── socket + initial fetch ─── */
  useEffect(() => {
    const fetchActive = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tracking/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const formatted: LocationData[] = data.map((emp: any) => ({
          id: emp.employeeId,
          name: `${emp.firstName} ${emp.lastName}`,
          profileImage: emp.profileImage || null,
          lat: emp.latitude,
          lng: emp.longitude,
          isOnDuty: emp.isOnDuty,
          isStale: emp.isStale,
          address: emp.address || 'Locating...',
          batteryLevel: emp.batteryLevel,
          timestamp: emp.timestamp,
        }));
        setLocations(formatted);
        formatted.forEach(loc => {
          if (loc.lat && loc.lng && (!loc.address || loc.address === 'Locating...' || loc.address.startsWith('Coordinates:'))) {
            fetchClientAddress(loc.lat, loc.lng).then(addr => {
              if (addr) setLocations(prev => prev.map(p => p.id === loc.id ? { ...p, address: addr } : p));
            });
          }
        });
      } catch (e) {
        console.error('Fetch error:', e);
      }
    };

    fetchActive();

    const socketUrl = typeof window !== 'undefined' ? window.location.origin : '';
    socketRef.current = io(socketUrl);
    socketRef.current.on('employeeLocationUpdate', (data: any) => {
      setLocations(prev => {
        const idx = prev.findIndex(l => l.id === data.employeeId);
        const updated: LocationData = {
          id: data.employeeId,
          name: data.name || (idx >= 0 ? prev[idx].name : 'Employee'),
          profileImage: data.profileImage !== undefined ? data.profileImage : (idx >= 0 ? prev[idx].profileImage : null),
          lat: data.latitude ?? (idx >= 0 ? prev[idx].lat : null),
          lng: data.longitude ?? (idx >= 0 ? prev[idx].lng : null),
          isOnDuty: data.isOnDuty !== undefined ? data.isOnDuty : (idx >= 0 ? prev[idx].isOnDuty : false),
          isStale: data.isStale !== undefined ? data.isStale : (idx >= 0 ? prev[idx].isStale : false),
          address: data.address || (idx >= 0 ? prev[idx].address : 'Locating...'),
          batteryLevel: data.batteryLevel ?? (idx >= 0 ? prev[idx].batteryLevel : null),
          timestamp: data.timestamp || new Date().toISOString(),
        };
        if (updated.lat && updated.lng && (!updated.address || updated.address === 'Locating...' || updated.address.startsWith('Coordinates:'))) {
          fetchClientAddress(updated.lat, updated.lng).then(addr => {
            if (addr) setLocations(p => p.map(x => x.id === updated.id ? { ...x, address: addr } : x));
          });
        }
        if (idx >= 0) {
          const arr = [...prev]; arr[idx] = updated; return arr;
        }
        return [...prev, updated];
      });
    });

    return () => { socketRef.current?.disconnect(); };
  }, []);

  /* ─── refresh on selection ─── */
  useEffect(() => {
    if (!selectedId) return;
    const ping = () => {
      if (socketRef.current?.connected)
        socketRef.current.emit('requestLocationRefresh', { employeeId: selectedId });
    };
    ping();
    const t = setInterval(ping, 3 * 60 * 1000);
    return () => clearInterval(t);
  }, [selectedId]);

  /* ─── derived stats ─── */
  const liveCount  = locations.filter(l => l.lat !== null && l.isOnDuty && !l.isStale).length;
  const staleCount = locations.filter(l => l.isOnDuty && l.isStale).length;
  const offCount   = locations.filter(l => !l.isOnDuty).length;

  /* ─── selection ─── */
  const handleSelect = (id: string, hasLoc: boolean) => {
    if (!hasLoc) return;
    setSelectedId(prev => (prev === id ? null : id));
    setDrawerOpen(false);
  };

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes trackingPing {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.5); }
        }

        /* ── Desktop ── */
        .tracking-root {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 0px);
          padding: 1.5rem;
          gap: 1rem;
          box-sizing: border-box;
        }
        .tracking-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-shrink: 0;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .tracking-header-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; }
        .tracking-body         { display: flex; flex: 1; gap: 1rem; min-height: 0; overflow: hidden; }
        .tracking-sidebar {
          width: 300px; flex-shrink: 0;
          background: white; border-radius: 1.5rem;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 4px 0 rgb(0 0 0 / 0.04);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .tracking-sidebar-inner { flex: 1; overflow-y: auto; }
        .tracking-map-wrap {
          flex: 1; min-width: 0;
          background: white; border-radius: 1.5rem;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 4px 0 rgb(0 0 0 / 0.04);
          overflow: hidden; position: relative;
        }
        .tracking-emp-card:hover { background: #f8fafc !important; }
        .tracking-mobile-shell  { display: none; }

        /* ── Mobile (≤ 767px) ── */
        @media (max-width: 767px) {
          .tracking-root {
            padding: 0;
            height: 100dvh;
            gap: 0;
          }
          .tracking-header { display: none; }
          .tracking-body   { display: none; }

          .tracking-mobile-shell {
            display: flex;
            flex-direction: column;
            flex: 1;
            position: relative;
            height: 100dvh;
            overflow: hidden;
          }
          .tracking-mobile-map {
            position: absolute;
            inset: 0;
          }
          .tracking-mobile-topbar {
            position: absolute;
            top: 0; left: 0; right: 0;
            z-index: 30;
            padding: 0.875rem 1rem 0.75rem;
            background: rgba(255,255,255,0.88);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(226,232,240,0.6);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
          }
          .tracking-mobile-topbar-title {
            font-size: 1rem; font-weight: 800;
            color: #0f172a; letter-spacing: -0.025em; margin: 0;
          }
          .tracking-mobile-topbar-sub {
            font-size: 0.6rem; color: #64748b; margin: 0; font-weight: 500;
          }
          .tracking-mobile-chips {
            display: flex; gap: 0.3rem; flex-wrap: nowrap; overflow-x: auto;
          }
          .tracking-drawer {
            position: absolute;
            left: 0; right: 0; bottom: 0;
            z-index: 40;
            background: white;
            border-radius: 1.5rem 1.5rem 0 0;
            box-shadow: 0 -8px 32px rgb(0 0 0 / 0.12);
            display: flex; flex-direction: column;
            transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
          }
          .tracking-drawer-handle-wrap {
            flex-shrink: 0;
            padding: 0.75rem 1rem 0.5rem;
            cursor: pointer;
            display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
            border-bottom: 1px solid #f1f5f9;
            background: white;
          }
          .tracking-drawer-handle {
            width: 36px; height: 4px; border-radius: 9999px; background: #cbd5e1;
          }
          .tracking-drawer-title-row {
            width: 100%; display: flex; align-items: center; justify-content: space-between;
          }
          .tracking-drawer-scroll {
            flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          }
        }

        @media (max-width: 380px) {
          .tracking-mobile-topbar-title { font-size: 0.875rem; }
        }
      `}</style>

      {!isMobile ? (
        <div className="tracking-root">
          {/* Desktop header */}
          <div className="tracking-header">
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', margin: 0 }}>
                Real-Time Field Map
              </h1>
              <p style={{ color: '#64748b', margin: '0.2rem 0 0', fontSize: '0.875rem' }}>
                Live monitoring of service engineers across the region.
              </p>
            </div>
            <div className="tracking-header-chips">
              <StatChip count={liveCount}  label="Live"        color="#059669" bg="#ecfdf5" border="#a7f3d0" pulse />
              {staleCount > 0 && <StatChip count={staleCount} label="Signal Lost" color="#e11d48" bg="#fff1f2" border="#fecdd3" />}
              {offCount   > 0 && <StatChip count={offCount}   label="Off Duty"    color="#64748b" bg="#f8fafc" border="#e2e8f0" />}
            </div>
          </div>

          {/* Desktop body */}
          <div className="tracking-body">
            {/* Sidebar */}
            <div className="tracking-sidebar">
              <div style={{ padding: '0.875rem 1rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontWeight: 700, color: '#334155', fontSize: '0.8125rem', margin: 0 }}>Field Engineers</h3>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, background: '#f1f5f9', padding: '2px 8px', borderRadius: '999px' }}>
                    {locations.length}
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.65rem', color: '#94a3b8' }}>Tap to locate on map</p>
              </div>

              <div className="tracking-sidebar-inner">
                {locations.length === 0 ? (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📡</div>
                    No engineers active currently
                  </div>
                ) : (
                  locations.map(loc => (
                    <EmployeeCard key={loc.id} loc={loc} selectedId={selectedId} onSelect={handleSelect} />
                  ))
                )}
              </div>
            </div>

            {/* Map */}
            <div className="tracking-map-wrap">
              <MapComponent key="desktop-map" locations={locations} focusedId={selectedId} />
            </div>
          </div>
        </div>
      ) : (
        /* ══ MOBILE: full-screen map + bottom sheet ══ */
        <div className="tracking-mobile-shell" style={{ display: 'flex' }}>
          {/* Map layer */}
          <div className="tracking-mobile-map">
            <MapComponent key="mobile-map" locations={locations} focusedId={selectedId} />
          </div>

          {/* Frosted glass top bar */}
          <div className="tracking-mobile-topbar">
            <div>
              <p className="tracking-mobile-topbar-title">Field Map</p>
              <p className="tracking-mobile-topbar-sub">Live tracking · {locations.length} engineers</p>
            </div>
            <div className="tracking-mobile-chips">
              <StatChip count={liveCount}  label="Live" color="#059669" bg="rgba(236,253,245,0.9)" border="#a7f3d0" pulse />
              {staleCount > 0 && <StatChip count={staleCount} label="Lost" color="#e11d48" bg="rgba(255,241,242,0.9)" border="#fecdd3" />}
            </div>
          </div>

          {/* Bottom sheet */}
          <div className="tracking-drawer" style={{ height: drawerOpen ? '62vh' : '188px' }}>
            {/* Drag handle */}
            <div className="tracking-drawer-handle-wrap" onClick={() => setDrawerOpen(o => !o)}>
              <div className="tracking-drawer-handle" />
              <div className="tracking-drawer-title-row">
                <div>
                  <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem', margin: 0 }}>
                    Field Engineers
                    <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
                      ({locations.length})
                    </span>
                  </p>
                  <p style={{ fontSize: '0.625rem', color: '#94a3b8', margin: '0.1rem 0 0', fontWeight: 500 }}>
                    {drawerOpen ? 'Tap header to collapse · Select to fly' : 'Pull up to see all · Tap to locate'}
                  </p>
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', transition: 'transform 0.3s ease',
                  transform: drawerOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>▲</div>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="tracking-drawer-scroll">
              {locations.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📡</div>
                  No engineers active
                </div>
              ) : (
                locations.map(loc => (
                  <EmployeeCard key={loc.id} loc={loc} compact selectedId={selectedId} onSelect={handleSelect} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
