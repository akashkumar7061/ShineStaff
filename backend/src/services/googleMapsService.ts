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

// In-memory cache for address geocoding to avoid repetitive requests
const geocodeCache: Record<string, { lat: number; lng: number }> = {};

/**
 * Free Nominatim OpenStreetMap Geocoder fallback
 */
export const geocodeAddress = async (
  address: string
): Promise<{ lat: number; lng: number } | null> => {
  if (!address || address.trim().length < 3) return null;
  const cleanAddr = address.trim();
  if (geocodeCache[cleanAddr]) {
    return geocodeCache[cleanAddr];
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      cleanAddr
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
 * Calculates accurate driving distance using Google Distance Matrix API (with coordinates OR text addresses),
 * with intelligent fallbacks to OSRM road routing and geocoding.
 */
export const calculateLegDistance = async (
  origin: RoutePoint,
  destination: RoutePoint,
  apiKey?: string
): Promise<RouteLegResult> => {
  const originStr =
    typeof origin.lat === 'number' && typeof origin.lng === 'number'
      ? `${origin.lat},${origin.lng}`
      : origin.address || origin.name || '';

  const destStr =
    typeof destination.lat === 'number' && typeof destination.lng === 'number'
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

  // 3. Fallback to free OSRM (Open Source Routing Machine) driving route
  if (
    typeof startLat === 'number' &&
    typeof startLng === 'number' &&
    typeof endLat === 'number' &&
    typeof endLng === 'number'
  ) {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`;
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
      // Proceed to haversine fallback
    }

    // 4. Haversine with 1.25x road curvature multiplier
    const directKM = calculateHaversineKM(startLat, startLng, endLat, endLng);
    const roadKM = Number((directKM * 1.25).toFixed(2));
    return {
      distanceKM: roadKM,
      durationText: `${Math.round(roadKM * 2.5)} mins (est)`,
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
