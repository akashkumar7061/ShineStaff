// Calculate straight line distance (Haversine formula in KM)
export const calculateHaversineKM = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Number(d.toFixed(2));
};

export interface RoutePoint {
  lat?: number;
  lng?: number;
  address?: string;
  name?: string;
}

export interface RouteLegResult {
  distanceKM: number;
  durationText?: string;
  source: 'google_maps' | 'osrm' | 'haversine_road';
  googleMapsUrl: string;
}

// In-memory cache for address geocoding
const geocodeCache: Record<string, { lat: number; lng: number }> = {};

/**
 * Free Nominatim OpenStreetMap Geocoder
 */
export const geocodeAddress = async (
  address: string
): Promise<{ lat: number; lng: number } | null> => {
  if (!address || address.trim().length < 3) return null;
  const cleanAddr = address.trim();
  if (geocodeCache[cleanAddr]) {
    return geocodeCache[cleanAddr];
  }

  // Append Delhi NCR if no region specified to avoid international ambiguity
  const searchQuery = cleanAddr.toLowerCase().includes('delhi') ||
    cleanAddr.toLowerCase().includes('noida') ||
    cleanAddr.toLowerCase().includes('gurgaon') ||
    cleanAddr.toLowerCase().includes('ghaziabad') ||
    cleanAddr.toLowerCase().includes('faridabad') ||
    cleanAddr.toLowerCase().includes('india')
      ? cleanAddr
      : `${cleanAddr}, Delhi NCR, India`;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      searchQuery
    )}&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ShineStaff-RouteEngine/1.0' },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data: any = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        geocodeCache[cleanAddr] = coords;
        return coords;
      }
    }
  } catch (err) {
    // Ignore geocode error
  }
  return null;
};

/**
 * Validates and tests a Google Maps API Key directly with Google Distance Matrix API
 */
export const testGoogleMapsConnection = async (
  apiKey: string
): Promise<{ success: boolean; message: string; sampleDistanceKM?: number }> => {
  if (!apiKey || apiKey.trim().length < 10) {
    return { success: false, message: 'Google Maps API Key is empty or invalid.' };
  }

  try {
    // Test with a standard Delhi route: Connaught Place to India Gate (~3.2 KM)
    const testUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=28.6315,77.2167&destinations=28.6129,77.2295&mode=driving&key=${apiKey.trim()}`;
    const res = await fetch(testUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      return { success: false, message: `Google Maps HTTP error: ${res.status} ${res.statusText}` };
    }
    const data: any = await res.json();

    if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const distMeters = data.rows[0].elements[0].distance.value;
      const km = Number((distMeters / 1000).toFixed(2));
      return {
        success: true,
        message: `Google Maps Distance Matrix API is active and functioning! (Test route: ${km} KM)`,
        sampleDistanceKM: km
      };
    } else if (data.status === 'REQUEST_DENIED') {
      return {
        success: false,
        message: `Google Maps Error: Request Denied. ${data.error_message || 'Please ensure Distance Matrix API is enabled in your Google Cloud Console and billing is active.'}`
      };
    } else {
      return {
        success: false,
        message: `Google Maps Error: ${data.status} - ${data.error_message || 'Check API key restrictions.'}`
      };
    }
  } catch (err: any) {
    return { success: false, message: `Connection failed: ${err.message}` };
  }
};

/**
 * Calculates accurate driving distance using Google Distance Matrix API (with coordinates OR text addresses),
 * with intelligent multi-engine fallbacks to OSRM road routing and geocoding.
 */
export const calculateLegDistance = async (
  origin: RoutePoint,
  destination: RoutePoint,
  apiKey?: string
): Promise<RouteLegResult> => {
  const originHasCoords = typeof origin.lat === 'number' && typeof origin.lng === 'number';
  const destHasCoords = typeof destination.lat === 'number' && typeof destination.lng === 'number';

  const originStr = originHasCoords
    ? `${origin.lat},${origin.lng}`
    : origin.address || origin.name || '';

  const destStr = destHasCoords
    ? `${destination.lat},${destination.lng}`
    : destination.address || destination.name || '';

  const originQuery = encodeURIComponent(origin.address || originStr);
  const destQuery = encodeURIComponent(destination.address || destStr);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destQuery}&travelmode=driving`;

  if (!originStr || !destStr) {
    return {
      distanceKM: 0,
      durationText: 'N/A',
      source: 'haversine_road',
      googleMapsUrl
    };
  }

  // 1. Google Distance Matrix API (Supports both GPS coordinates and string addresses)
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
        originStr
      )}&destinations=${encodeURIComponent(destStr)}&mode=driving&key=${apiKey.trim()}`;

      const response = await fetch(gUrl, { signal: AbortSignal.timeout(4500) });
      if (response.ok) {
        const data: any = await response.json();
        if (
          data.status === 'OK' &&
          data.rows?.[0]?.elements?.[0]?.status === 'OK'
        ) {
          const element = data.rows[0].elements[0];
          const distanceMeters = element.distance.value;
          const distanceKM = Number((distanceMeters / 1000).toFixed(2));
          return {
            distanceKM,
            durationText: element.duration?.text || '',
            source: 'google_maps',
            googleMapsUrl
          };
        } else {
          console.warn('[GoogleMapsService] Distance Matrix non-OK response:', data.status, data.error_message);
        }
      }
    } catch (gErr) {
      console.warn('[GoogleMapsService] Distance Matrix API call failed, attempting fallback...', gErr);
    }
  }

  // 2. Resolve GPS coordinates if missing for OSRM / Haversine fallback
  let startLat = origin.lat;
  let startLng = origin.lng;
  if ((typeof startLat !== 'number' || typeof startLng !== 'number') && origin.address) {
    const geo = await geocodeAddress(origin.address);
    if (geo) {
      startLat = geo.lat;
      startLng = geo.lng;
    }
  }

  let endLat = destination.lat;
  let endLng = destination.lng;
  if ((typeof endLat !== 'number' || typeof endLng !== 'number') && destination.address) {
    const geo = await geocodeAddress(destination.address);
    if (geo) {
      endLat = geo.lat;
      endLng = geo.lng;
    }
  }

  // 3. Fallback: Multi-server OSRM Road Driving Router
  if (
    typeof startLat === 'number' &&
    typeof startLng === 'number' &&
    typeof endLat === 'number' &&
    typeof endLng === 'number'
  ) {
    const osrmServers = [
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`,
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`
    ];

    for (const osrmUrl of osrmServers) {
      try {
        const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(3000) });
        if (osrmRes.ok) {
          const osrmData: any = await osrmRes.json();
          if (osrmData.code === 'Ok' && osrmData.routes?.[0]) {
            const distanceMeters = osrmData.routes[0].distance;
            const durationSecs = osrmData.routes[0].duration;
            const mins = Math.round(durationSecs / 60);
            return {
              distanceKM: Number((distanceMeters / 1000).toFixed(2)),
              durationText: `${mins} mins`,
              source: 'osrm',
              googleMapsUrl
            };
          }
        }
      } catch (osrmErr) {
        // Try next mirror
      }
    }

    // 4. Urban Road Curvature Haversine (1.40x multiplier for Indian urban roads)
    const directKM = calculateHaversineKM(startLat, startLng, endLat, endLng);
    const roadKM = Number((directKM * 1.40).toFixed(2));
    return {
      distanceKM: roadKM,
      durationText: `${Math.round(roadKM * 2.8)} mins (est)`,
      source: 'haversine_road',
      googleMapsUrl
    };
  }

  return {
    distanceKM: 0,
    durationText: 'Address not resolved',
    source: 'haversine_road',
    googleMapsUrl
  };
};
