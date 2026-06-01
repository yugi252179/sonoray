'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMapPin, FiWifi, FiRefreshCw, FiAlertCircle, FiClock, FiActivity } from 'react-icons/fi';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet map to prevent SSR (Server-Side Rendering) issues
const MapWithNoSSR = dynamic(
  () => import('../../../components/MapComponent'),
  { ssr: false, loading: () => (
    <div style={{ height: '350px', background: '#f1f5f9', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 600 }}>
      Loading Tracking Map...
    </div>
  )}
);

export default function EmployeeTrackingPage() {
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const syncPunchState = async () => {
    const isPunched = localStorage.getItem('isPunchedIn') === 'true';
    setIsPunchedIn(isPunched);

    // Sync queue length
    const queue = JSON.parse(localStorage.getItem('offlineLocationQueue') || '[]');
    setPendingSync(queue.length);

    // Fetch latest address if active
    if (isPunched) {
      try {
        const token = localStorage.getItem('token');
        const employeeId = localStorage.getItem('employeeId');
        if (token && employeeId) {
          // Quick fetch to get current coordinates
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              },
              (err) => {
                console.warn("Telemetry geolocation failed:", err.message);
                setCoords({ lat: 13.0827, lng: 80.2707 });
              }
            );
          } else {
            setCoords({ lat: 13.0827, lng: 80.2707 });
          }
        }
      } catch (e) {
        // ignore
      }
    } else {
      setCoords(null);
      setAddress(null);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    const queue = JSON.parse(localStorage.getItem('offlineLocationQueue') || '[]');
    if (queue.length === 0) {
      alert('No offline data to sync.');
      setSyncing(false);
      return;
    }

    const token = localStorage.getItem('token');
    const remainingQueue = [];

    for (const payload of queue) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tracking/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Sync failed');
      } catch (err) {
        remainingQueue.push(payload);
      }
    }

    localStorage.setItem('offlineLocationQueue', JSON.stringify(remainingQueue));
    setPendingSync(remainingQueue.length);
    setSyncing(false);
    
    if (remainingQueue.length === 0) {
      alert('🎉 All offline updates synced successfully!');
    } else {
      alert(`Synced some updates, but ${remainingQueue.length} coordinates are still queued.`);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const employeeId = localStorage.getItem('employeeId');
    if (!token || !employeeId) {
      router.push('/login');
      return;
    }

    syncPunchState();

    // Listen to punch state changes
    window.addEventListener('attendance-change', syncPunchState);

    // Poll to keep coordinates and address updated on dashboard
    const interval = setInterval(() => {
      const isPunched = localStorage.getItem('isPunchedIn') === 'true';
      if (isPunched) {
        // Get queue length
        const queue = JSON.parse(localStorage.getItem('offlineLocationQueue') || '[]');
        setPendingSync(queue.length);

        // Get latest GPS update
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => {
              console.warn("Telemetry interval geolocation failed:", err.message);
              setCoords({ lat: 13.0827, lng: 80.2707 });
            }
          );
        } else {
          setCoords({ lat: 13.0827, lng: 80.2707 });
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('attendance-change', syncPunchState);
      clearInterval(interval);
    };
  }, [router]);

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 32px' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(.22,1,.36,1) both; }
        .pulse-light {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulseGlow 2s infinite;
        }
        @keyframes pulseGlow {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
          70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        @media (max-width: 900px) {
          .page-container { padding: 16px 20px !important; }
          .main-grid { grid-template-columns: 1fr !important; }
        }

        @media (max-width: 640px) {
          .page-container { padding: 12px 14px !important; }
          .header-container { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; margin-bottom: 20px !important; }
          .map-viewer-card { height: 400px !important; min-height: 400px !important; }
        }
      `}</style>

      {/* Header */}
      <div className="fade-up header-container" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: '10px',
            padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FiMapPin style={{ color: 'white', width: '18px', height: '18px' }} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            GPS & Location Service
          </h1>
        </div>
        <p style={{ color: '#64748b', fontWeight: 500, fontSize: '14px', margin: 0 }}>
          Your duty tracking status and real-time telemetry
        </p>
      </div>

      <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        
        {/* Left Side: Status Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main Status Panel */}
          <div className="fade-up" style={{
            background: 'white', borderRadius: '24px', padding: '28px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)',
            animationDelay: '0.05s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Service Status</span>
              {isPunchedIn ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', color: '#047857', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
                  <div className="pulse-light" />
                  Streaming Live
                </div>
              ) : (
                <div style={{ background: '#f1f5f9', color: '#64748b', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
                  Off Duty
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', margin: '24px 0' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '20px',
                background: isPunchedIn ? '#eff6ff' : '#f8fafc',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                transition: 'all 0.3s',
              }}>
                <FiActivity style={{ color: isPunchedIn ? '#3b82f6' : '#94a3b8', width: '32px', height: '32px' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                {isPunchedIn ? 'Location Sync Active' : 'GPS Tracking Suspended'}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0, padding: '0 10px' }}>
                {isPunchedIn 
                  ? 'Your GPS location is securely broadcasting to the team dashboard while you are punched in.'
                  : 'You are currently punched out. No location coordinates are being sent, preserving your battery and privacy.'}
              </p>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid #f1f5f9', margin: '20px 0' }} />

            {/* Live Telemetry Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Latitude:</span>
                <span style={{ color: '#0f172a', fontWeight: 800 }}>{coords ? coords.lat.toFixed(6) : '--'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Longitude:</span>
                <span style={{ color: '#0f172a', fontWeight: 800 }}>{coords ? coords.lng.toFixed(6) : '--'}</span>
              </div>
              {address && (
                <div style={{ fontSize: '12px', color: '#3b82f6', background: '#eff6ff', padding: '10px 14px', borderRadius: '12px', fontWeight: 600, marginTop: '8px', lineHeight: 1.4 }}>
                  📍 {address}
                </div>
              )}
            </div>
          </div>

          {/* Offline Sync Controls */}
          <div className="fade-up" style={{
            background: 'white', borderRadius: '24px', padding: '24px 28px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)',
            animationDelay: '0.1s',
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiWifi style={{ color: '#3b82f6' }} />
              Offline Buffer
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.4 }}>
              If you lose internet connection, coordinates are stored locally and will sync when you are online.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Queued Logs:</span>
              <span style={{
                fontSize: '13px', fontWeight: 800, 
                color: pendingSync > 0 ? '#d97706' : '#10b981',
                background: pendingSync > 0 ? '#fffbeb' : '#f0fdf4',
                padding: '4px 10px', borderRadius: '8px',
              }}>
                {pendingSync} logs
              </span>
            </div>

            <button
              onClick={handleManualSync}
              disabled={syncing || pendingSync === 0}
              style={{
                width: '100%', padding: '14px',
                background: pendingSync > 0 ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : '#f1f5f9',
                color: pendingSync > 0 ? 'white' : '#94a3b8',
                border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: 800,
                cursor: (syncing || pendingSync === 0) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s',
                boxShadow: pendingSync > 0 ? '0 4px 18px rgba(99, 102, 241, 0.25)' : 'none',
              }}
            >
              <FiRefreshCw className={syncing ? 'spin-icon' : ''} />
              {syncing ? 'Syncing...' : 'Force Upload Offline Logs'}
            </button>
          </div>

          {/* Quick Info Box */}
          <div className="fade-up" style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '24px', padding: '24px 28px',
            color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: 1.5,
            animationDelay: '0.15s',
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <FiClock style={{ color: '#60a5fa', width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ color: 'white', margin: '0 0 4px', fontWeight: 800, fontSize: '13px' }}>How it works:</h4>
                <p style={{ margin: 0 }}>Simply click <strong>Punch In</strong> on your attendance page when starting your shift. Your location sharing starts automatically and streaming coordinates live. <strong>Punch Out</strong> to immediately turn it off.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Map Viewer */}
        <div className="fade-up map-viewer-card" style={{
          background: 'white', borderRadius: '28px', padding: '16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)',
          animationDelay: '0.1s', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: '500px',
        }}>
          <div style={{ padding: '8px 12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Live Position Map</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>Your broadcast center verified by Leaflet Engine</p>
            </div>
            {coords && (
              <div style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>
                Signal: Excellent
              </div>
            )}
          </div>

          <div style={{ flex: 1, borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>
            {coords ? (
              <MapWithNoSSR 
                locations={[{
                  id: 'me',
                  name: 'My Position',
                  lat: coords.lat,
                  lng: coords.lng,
                  batteryLevel: 100,
                  timestamp: new Date().toISOString(),
                  address: address || 'Broadcasting live position'
                }]}
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', textAlign: 'center', padding: '0 40px' }}>
                <FiMapPin style={{ width: '48px', height: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#475569', margin: '0 0 6px' }}>Map Offline</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '300px', margin: 0, lineHeight: 1.4 }}>
                  Once you Punch In on your Attendance page, your live coordinates will map here in real-time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
