'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Hydration fix for Leaflet icons under Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

interface MapPickerComponentProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

function MapClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapPickerComponent({ lat, lng, onChange }: MapPickerComponentProps) {
  const [mounted, setMounted] = useState(false);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const position: [number, number] = useMemo(() => {
    return lat !== null && lng !== null ? [lat, lng] : [20.5937, 78.9629]; // Default to India center
  }, [lat, lng]);

  const zoom = lat !== null && lng !== null ? 14 : 5;

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onChange(latLng.lat, latLng.lng);
        }
      },
    }),
    [onChange]
  );

  if (!mounted) {
    return <div style={{ height: '240px', width: '100%', background: '#f8fafc' }} className="rounded-3xl border border-slate-100 flex items-center justify-center font-bold text-xs text-slate-400">Loading Map Engine...</div>;
  }

  return (
    <div style={{ height: '240px', width: '100%' }} className="rounded-3xl overflow-hidden border border-slate-100 relative shadow-sm">
      <MapContainer 
        center={position} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <ChangeView center={position} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onChange={onChange} />
        {lat !== null && lng !== null && (
          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
          />
        )}
      </MapContainer>
      <div className="absolute bottom-2 left-2 z-[400] bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider">
        Click to Place / Drag Pin to Adjust Location
      </div>
    </div>
  );
}
