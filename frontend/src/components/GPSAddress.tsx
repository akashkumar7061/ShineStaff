import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

interface GPSAddressProps {
  lat: number;
  lng: number;
  className?: string;
}

const GPSAddress: React.FC<GPSAddressProps> = ({ lat, lng, className }) => {
  const [address, setAddress] = useState('Resolving location...');

  useEffect(() => {
    if (!lat || !lng) {
      setAddress('No GPS logged');
      return;
    }
    setAddress('Resolving location...');
    
    // Call OpenStreetMap Nominatim reverse geocoder API
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then((res) => res.json())
      .then((data) => {
        const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setAddress(addr);
      })
      .catch(() => {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      });
  }, [lat, lng]);

  return (
    <span className="inline-flex items-center space-x-1" title={address}>
      <MapPin className="h-3.5 w-3.5 text-secondary shrink-0" />
      <span className={`truncate max-w-[200px] text-[10px] font-medium ${className || 'text-slate-600 dark:text-slate-350'}`}>{address}</span>
    </span>
  );
};

export default GPSAddress;
