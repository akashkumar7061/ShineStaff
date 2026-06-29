import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, User as UserIcon } from 'lucide-react';

interface LocationPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'worker' | 'job';
  company?: string;
  info?: string;
}

interface MapViewProps {
  pins: LocationPin[];
  center?: { lat: number; lng: number };
  zoom?: number;
}

const MapView: React.FC<MapViewProps> = ({
  pins,
  center = { lat: 19.0760, lng: 72.8777 }, // Default center to Mumbai
  zoom = 13
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic CDN loader for Leaflet
  useEffect(() => {
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      setLeafletLoaded(true);
    };
    script.onerror = () => {
      setError('Failed to load Leaflet maps library.');
    };
    document.head.appendChild(script);

    return () => {
      // Keep Leaflet in DOM to prevent duplicate load, but clean up references if needed
    };
  }, []);

  // Initialize Map Instance
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      // Find valid pin to center
      const validPin = pins.find(p => p.lat && p.lng);
      const initialCenter = validPin ? [validPin.lat, validPin.lng] : [center.lat, center.lng];

      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: true
      }).setView(initialCenter, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      // Cleanup map on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Update Markers when Pins change
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Create markers
    pins.forEach(pin => {
      if (!pin.lat || !pin.lng) return;

      // Color scheme according to company / type
      let markerColor = '#2563EB'; // Worker
      if (pin.type === 'job') {
        markerColor = pin.company === 'SofaShine' ? '#F59E0B' : '#10B981'; // SofaShine = Yellow, CleanCruisers = Green
      }

      // Leaflet Custom SVG Pin Icon
      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${markerColor}" width="32px" height="32px">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: pinSvg,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const popupHtml = `
        <div style="font-family: 'Outfit', sans-serif; font-size: 13px; color: #0F172A; padding: 2px;">
          <h4 style="margin: 0 0 4px; font-weight: 600; color: ${markerColor};">
            ${pin.type === 'worker' ? '👤 Worker: ' : '🧹 Job: '}${pin.name}
          </h4>
          ${pin.info ? `<p style="margin: 0; font-size: 11px; color: #64748B;">${pin.info}</p>` : ''}
          ${pin.type === 'job' && pin.company ? `<div style="margin-top: 4px; display: inline-block; font-size: 9px; padding: 2px 6px; border-radius: 4px; color: white; background: ${markerColor};">${pin.company}</div>` : ''}
        </div>
      `;

      const marker = L.marker([pin.lat, pin.lng], { icon: customIcon })
        .bindPopup(popupHtml)
        .addTo(mapInstanceRef.current);

      markersRef.current.push(marker);
    });

    // Fit map bounds if there are multiple markers
    if (pins.length > 0) {
      const bounds = L.latLngBounds(pins.map(p => [p.lat, p.lng]).filter(coords => coords[0] && coords[1]));
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [pins, leafletLoaded]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-custom border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-inner">
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-danger">
          <MapPin className="mb-2 h-8 w-8" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}
      {!leafletLoaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-slate-50 dark:bg-slate-950">
          <Navigation className="h-6 w-6 animate-pulse text-secondary" />
          <span className="text-xs text-slate-400">Loading maps data...</span>
        </div>
      )}
      <div ref={mapContainerRef} className="h-full w-full z-10" />
    </div>
  );
};

export default MapView;
