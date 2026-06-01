'use client';
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in leaflet with nextjs
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

export interface LocationData {
  id: string;
  name: string;
  profileImage?: string | null;
  lat: number | null;
  lng: number | null;
  isOnDuty?: boolean;
  isStale?: boolean;
  batteryLevel?: number | null;
  address?: string | null;
  timestamp?: string | null;
}

interface MapComponentProps {
  locations: LocationData[];
  center?: [number, number];
  zoom?: number;
  /** ID of the employee to fly the map to */
  focusedId?: string | null;
}

// Handles initial center + zoom (only on first render)
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      map.setView(center, zoom);
      initialized.current = true;
    }
  }, [center, zoom, map]);
  return null;
}

// Flies to the focused employee whenever focusedId changes
function FlyToEmployee({
  locations,
  focusedId,
}: {
  locations: LocationData[];
  focusedId: string | null | undefined;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusedId) return;
    const target = locations.find((l) => l.id === focusedId);
    if (!target) return;

    const lat = Number(target.lat);
    const lng = Number(target.lng);
    if (!isFinite(lat) || !isFinite(lng)) return;

    try {
      map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
    } catch (e) {
      console.warn('flyTo failed:', e);
    }
  // Only re-run when the selected ID changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, map]);

  return null;
}

export default function MapComponent({
  locations,
  center = [0, 0],
  zoom = 2,
  focusedId,
}: MapComponentProps) {
  const [mapId, setMapId] = useState<string | null>(null);

  useEffect(() => {
    setMapId(`map-${Math.random().toString(36).slice(2)}`);
    return () => {
      setMapId(null);
    };
  }, []);

  // Auto-center based on first valid location on initial load
  // NOTE: must check != null BEFORE isFinite — Number(null)===0 which passes isFinite!
  const validLocations = locations.filter(
    (l) => l.lat != null && l.lng != null && Number.isFinite(l.lat) && Number.isFinite(l.lng)
  );
  const mapCenter: [number, number] =
    validLocations.length > 0 && center[0] === 0
      ? [validLocations[0].lat as number, validLocations[0].lng as number]
      : center;
  const mapZoom = validLocations.length > 0 && zoom === 2 ? 14 : zoom;

  if (!mapId) {
    return <div style={{ height: '100%', width: '100%', background: '#f1f5f9' }} />;
  }

  return (
    <div key={mapId} style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <ChangeView center={mapCenter} zoom={mapZoom} />
        <FlyToEmployee locations={locations} focusedId={focusedId} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations
          .filter((l) => l.lat != null && l.lng != null && Number.isFinite(l.lat) && Number.isFinite(l.lng))
          .map((loc) => {
            const greyIcon = new L.Icon({
              iconUrl:
                'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
              shadowUrl:
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41],
            });

            const redIcon = new L.Icon({
              iconUrl:
                'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
              shadowUrl:
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41],
            });

            const greenIcon = new L.Icon({
              iconUrl:
                'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
              shadowUrl:
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41],
            });

            let currentIcon: L.Icon | L.DivIcon = greenIcon;
            let ringColor = '#10b981'; // emerald
            if (loc.isOnDuty === false) {
              currentIcon = greyIcon;
              ringColor = '#94a3b8'; // slate
            } else if (loc.isStale) {
              currentIcon = redIcon;
              ringColor = '#f43f5e'; // rose
            }

            if (loc.profileImage) {
              currentIcon = new L.DivIcon({
                className: 'custom-profile-marker',
                html: `<div style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid ${ringColor}; overflow: hidden; background-color: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);">
                        <img src="${loc.profileImage}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'" />
                       </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20],
              });
            }

            return (
              <Marker key={loc.id} position={[loc.lat!, loc.lng!]} icon={currentIcon}>
                <Popup>
                  <div className="p-1">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <p className="font-bold text-slate-800">{loc.name}</p>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          loc.isOnDuty === false
                            ? 'bg-slate-100 text-slate-500'
                            : loc.isStale
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {loc.isOnDuty === false ? 'Off Duty' : loc.isStale ? 'Stale' : 'On Duty'}
                      </span>
                    </div>
                    {loc.address && (
                      <p className="text-xs text-slate-500 mt-1">{loc.address}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 border-t pt-2 border-slate-100">
                      {loc.batteryLevel !== undefined && loc.batteryLevel !== null && (
                        <span className="text-[10px] font-bold text-slate-400">
                          🔋 {loc.batteryLevel}%
                        </span>
                      )}
                      {loc.timestamp && (
                        <span className="text-[10px] font-bold text-slate-400">
                          🕒 {new Date(loc.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
