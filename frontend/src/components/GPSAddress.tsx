import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

interface GPSAddressProps {
  lat: number;
  lng: number;
  className?: string;
}

const GPSAddress: React.FC<GPSAddressProps> = ({ lat, lng, className }) => {
  const [address, setAddress] = useState('Resolving location...');
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    if (!lat || !lng) {
      setAddress('No GPS logged');
      setIsResolved(false);
      return;
    }
    setAddress('Resolving location...');
    setIsResolved(false);
    
    // Call OpenStreetMap Nominatim reverse geocoder API
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then((res) => res.json())
      .then((data) => {
        const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setAddress(addr);
        setIsResolved(!!data.display_name);
      })
      .catch(() => {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setIsResolved(false);
      });
  }, [lat, lng]);

  const mapsUrl = isResolved
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center space-x-1 hover:underline"
      title={address}
    >
      <MapPin className="h-3.5 w-3.5 text-secondary shrink-0" />
      <span className={`truncate max-w-[200px] text-[10px] font-medium ${className || 'text-slate-650 dark:text-slate-300 hover:text-secondary'}`}>
        {address}
      </span>
    </a>
  );
};

export default GPSAddress;
