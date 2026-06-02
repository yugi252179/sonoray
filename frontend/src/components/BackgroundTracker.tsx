'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { FiMapPin, FiWifiOff, FiRefreshCw } from 'react-icons/fi';

export default function BackgroundTracker() {
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'locating' | 'active' | 'offline'>('idle');
  const [pendingSync, setPendingSync] = useState(0);
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Sync offline locations queued in localStorage
  const syncOfflineData = async () => {
    const queue = JSON.parse(localStorage.getItem('offlineLocationQueue') || '[]');
    if (queue.length === 0) {
      setPendingSync(0);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    console.log(`Syncing ${queue.length} offline location coordinates...`);
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
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported by this browser');
      return;
    }

    if (watchIdRef.current !== null) return; // Already tracking

    setTrackingStatus('locating');

    // Trigger Native Android Foreground Background GPS Service
    try {
      const employeeId = localStorage.getItem('employeeId');
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      if (employeeId && token && (window as any).AndroidTracker && typeof (window as any).AndroidTracker.setPunchState === 'function') {
        (window as any).AndroidTracker.setPunchState(true, employeeId, token, apiUrl);
        console.log("Started native Android background tracking foreground service");
      }
    } catch (e) {
      console.error("Native bridge trigger failed", e);
    }

    // Request Screen Wake Lock to prevent phone from sleeping in pocket
    if ('wakeLock' in navigator) {
      try {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock;
          console.log('Location Wake Lock active');
        });
      } catch (err) {
        console.error('Wake Lock request failed', err);
      }
    }

    // Connect to WebSocket through Next.js rewrite (works locally AND through Cloudflare tunnel)
    if (!socketRef.current) {
      const socketUrl = typeof window !== 'undefined' ? window.location.origin : '';
      socketRef.current = io(socketUrl);
      const employeeId = localStorage.getItem('employeeId');
      if (employeeId) {
        socketRef.current.emit('register', { employeeId });
      }

      socketRef.current.on('forceLocationUpdate', async () => {
        console.log('Force location update requested by Admin');
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setLatLng({ lat: latitude, lng: longitude });

            const employeeId = localStorage.getItem('employeeId');
            const token = localStorage.getItem('token');
            if (!employeeId || !token) return;

            let batteryLevel = 100;
            try {
              if ('getBattery' in navigator) {
                const battery: any = await (navigator as any).getBattery();
                batteryLevel = Math.round(battery.level * 100);
              }
            } catch (e) {}

            const payload = {
              employeeId,
              latitude,
              longitude,
              batteryLevel,
              timestamp: new Date().toISOString(),
            };

            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit('updateLocation', payload);
            }

            // Save coordinate to server
            try {
              await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tracking/update`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
              });
            } catch (err) {
              console.error('Failed to post forced coordinates:', err);
            }
          },
          (error) => {
            console.error('Forced GPS watch fetch error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000
          }
        );
      });
    }

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLatLng({ lat: latitude, lng: longitude });
        setTrackingStatus('active');

        const employeeId = localStorage.getItem('employeeId');
        const token = localStorage.getItem('token');

        if (!employeeId || !token) return;

        let batteryLevel = 100;
        try {
          if ('getBattery' in navigator) {
            const battery: any = await (navigator as any).getBattery();
            batteryLevel = Math.round(battery.level * 100);
          }
        } catch (e) {
          // ignore battery api support errors
        }

        const payload = {
          employeeId,
          latitude,
          longitude,
          batteryLevel,
          timestamp: new Date().toISOString(),
        };

        // Stream real-time coordinate to Administrator's live map
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('updateLocation', payload);
        }

        // Save coordinate to server
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tracking/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) throw new Error('Failed to update live coordinates');
        } catch (err) {
          // Internet lost: Queue location coordinate locally for offline buffering
          console.log('Offline: Queueing location coordinate');
          const queue = JSON.parse(localStorage.getItem('offlineLocationQueue') || '[]');
          queue.push(payload);
          localStorage.setItem('offlineLocationQueue', JSON.stringify(queue));
          setPendingSync(queue.length);
          setTrackingStatus('offline');
        }
      },
      (error) => {
        console.error('GPS Watch error:', error);
        setTrackingStatus('idle');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      }
    );
  };

  const stopTracking = () => {
    // Stop Native Android Foreground Background GPS Service
    try {
      if ((window as any).AndroidTracker && typeof (window as any).AndroidTracker.setPunchState === 'function') {
        (window as any).AndroidTracker.setPunchState(false, "", "", "");
        console.log("Stopped native Android background tracking foreground service");
      }
    } catch (e) {
      console.error("Native bridge stop failed", e);
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setTrackingStatus('idle');
    setLatLng(null);
  };

  // Sync state between localStorage and React state
  const syncPunchStateAndTracking = () => {
    const isPunched = localStorage.getItem('isPunchedIn') === 'true';
    const token = localStorage.getItem('token');

    setIsPunchedIn(isPunched && !!token);

    if (isPunched && token) {
      startTracking();
      syncOfflineData();
    } else {
      stopTracking();
    }
  };

  useEffect(() => {
    // Initial sync
    syncPunchStateAndTracking();

    // Listen to custom window event triggered when punch in/out completes
    window.addEventListener('attendance-change', syncPunchStateAndTracking);
    
    // Sync offline updates when user regains connection
    const handleOnline = () => {
      syncOfflineData();
    };
    window.addEventListener('online', handleOnline);

    // Periodic queue sync (every 30 seconds)
    const syncInterval = setInterval(() => {
      if (localStorage.getItem('isPunchedIn') === 'true') {
        syncOfflineData();
      }
    }, 30000);

    return () => {
      window.removeEventListener('attendance-change', syncPunchStateAndTracking);
      window.removeEventListener('online', handleOnline);
      clearInterval(syncInterval);
      stopTracking();
    };
  }, []);

  // Return nothing if they are off-duty (completely hidden)
  if (!isPunchedIn || trackingStatus === 'idle') return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: 'white',
      borderRadius: '16px',
      padding: '12px 18px',
      boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 0 1px 1px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 9999,
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
      border: '1px solid #f1f5f9',
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse 1.6s infinite;
        }
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {trackingStatus === 'locating' ? (
        <>
          <FiMapPin className="text-blue-500 spin-icon" style={{ width: '18px', height: '18px' }} />
          <div>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Locating GPS...</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Waiting for Lock</p>
          </div>
        </>
      ) : trackingStatus === 'offline' ? (
        <>
          <FiWifiOff className="text-amber-500" style={{ width: '18px', height: '18px' }} />
          <div>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Offline Mode</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>
              {pendingSync > 0 ? `${pendingSync} Logs Queued` : 'Queue Active'}
            </p>
          </div>
        </>
      ) : pendingSync > 0 ? (
        <>
          <FiRefreshCw className="text-blue-500 spin-icon" style={{ width: '18px', height: '18px' }} />
          <div>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Syncing Logs</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase' }}>Uploading {pendingSync} updates</p>
          </div>
        </>
      ) : (
        <>
          <div className="pulse-dot" />
          <div>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Live GPS Active</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {latLng ? `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}` : 'On Duty'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
