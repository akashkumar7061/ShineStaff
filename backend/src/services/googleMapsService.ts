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

/**
 * Parse Degree-Minute-Second (DMS) string like:
 * 28°25'54.3"N 77°4'20.4"E or 28°36'50.0"N, 77°12'32.4"E
 */
export const parseDMSCoords = (
  dmsStr: string
): { lat: number; lng: number } | null => {
  if (!dmsStr || typeof dmsStr !== 'string') return null;
  const dmsRegex = /([0-9.]+)[°\s]+([0-9.]+)?['\s]*([0-9.]+)?["\s]*([NSEW])\s*[,]?\s*([0-9.]+)[°\s]+([0-9.]+)?['\s]*([0-9.]+)?["\s]*([NSEW])/i;
  const match = dmsStr.match(dmsRegex);
  if (match) {
    const latDeg = parseFloat(match[1]) || 0;
    const latMin = parseFloat(match[2]) || 0;
    const latSec = parseFloat(match[3]) || 0;
    const latDir = match[4].toUpperCase();

    const lngDeg = parseFloat(match[5]) || 0;
    const lngMin = parseFloat(match[6]) || 0;
    const lngSec = parseFloat(match[7]) || 0;
    const lngDir = match[8].toUpperCase();

    let lat = latDeg + latMin / 60 + latSec / 3600;
    if (latDir === 'S') lat = -lat;

    let lng = lngDeg + lngMin / 60 + lngSec / 3600;
    if (lngDir === 'W') lng = -lng;

    return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
  }
  return null;
};

/**
 * Parses any text, DMS, or Google Maps URL to extract exact (lat, lng)
 */
export const parseCoordsFromText = (
  text: string
): { lat: number; lng: number } | null => {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // 1. Try DMS
  const dms = parseDMSCoords(trimmed);
  if (dms) return dms;

  // 2. Try decimal: "28.583321, 77.052145" or "28.583321,77.052145"
  const decRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
  const decMatch = trimmed.match(decRegex);
  if (decMatch) {
    const lat = parseFloat(decMatch[1]);
    const lng = parseFloat(decMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 3. Google Maps data pattern: !3d28.6987478!4d77.0568964
  const dataPattern = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
  const dataMatch = trimmed.match(dataPattern);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 4. Google Maps dir pattern: dir/28.6302486,77.0140888
  const dirPattern = /dir\/(-?\d+\.\d+),(-?\d+\.\d+)/;
  const dirMatch = trimmed.match(dirPattern);
  if (dirMatch) {
    const lat = parseFloat(dirMatch[1]);
    const lng = parseFloat(dirMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 5. Try URL query/at patterns: @lat,lng or q=lat,lng or query=lat,lng or destination=lat,lng
  const urlCoordRegex = /(@|q=|query=|destination=|ll=|loc:)(-?\d+\.\d+),(-?\d+\.\d+)/;
  const urlMatch = trimmed.match(urlCoordRegex);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[2]);
    const lng = parseFloat(urlMatch[3]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  return null;
};

/**
 * Expands shortened Google Maps URLs (e.g. https://maps.app.goo.gl/... or goo.gl/maps/...)
 * and extracts the destination coordinates.
 */
export const expandShortGoogleUrl = async (
  shortUrl: string
): Promise<{ lat: number; lng: number } | null> => {
  if (!shortUrl || !shortUrl.includes('goo.gl')) return null;
  try {
    const response = await fetch(shortUrl.trim(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(6000)
    });

    const finalUrl = response.url;
    if (finalUrl) {
      const coords = parseCoordsFromText(finalUrl);
      if (coords) return coords;
    }
  } catch (err) {
    console.warn('[GoogleMapsService] Failed to expand short URL:', shortUrl, err);
  }
  return null;
};

/**
 * Master Location Resolver:
 * Accepts an address, DMS, coordinates, or Google Maps URL and returns validated GPS coordinates.
 */
export const resolveLocationInput = async (
  input: string,
  apiKey?: string
): Promise<{ lat: number; lng: number; address: string; source: string } | null> => {
  if (!input || input.trim().length < 2) return null;
  const clean = input.trim();

  // 1. Direct text / DMS / standard URL coordinate extraction
  const direct = parseCoordsFromText(clean);
  if (direct) {
    return {
      lat: direct.lat,
      lng: direct.lng,
      address: clean,
      source: 'direct_coordinates'
    };
  }

  // 2. Shortened Google Maps URL expansion
  if (clean.includes('goo.gl') || clean.includes('maps.app')) {
    const expanded = await expandShortGoogleUrl(clean);
    if (expanded) {
      return {
        lat: expanded.lat,
        lng: expanded.lng,
        address: clean,
        source: 'expanded_google_url'
      };
    }
  }

  // 3. Geocode physical text address with Delhi NCR context
  const geo = await geocodeAddress(clean);
  if (geo) {
    return {
      lat: geo.lat,
      lng: geo.lng,
      address: clean,
      source: 'geocoded_address'
    };
  }

  return null;
};

// In-memory cache for address geocoding
const geocodeCache: Record<string, { lat: number; lng: number }> = {};

/**
 * Multi-Engine Geocoder:
 * 1. Google Geocoding API (if apiKey is configured)
 * 2. Photon Geocoder (high-res with Delhi coordinate bias)
 * 3. Nominatim OpenStreetMap (with Delhi NCR suffix)
 */
export const geocodeAddress = async (
  address: string,
  apiKey?: string
): Promise<{ lat: number; lng: number } | null> => {
  if (!address || address.trim().length < 2) return null;
  const cleanAddr = address.trim();
  if (geocodeCache[cleanAddr]) {
    return geocodeCache[cleanAddr];
  }

  // 1. Google Geocoding API (Most accurate for Indian societies, apartments & landmarks)
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        cleanAddr.toLowerCase().includes('delhi') ? cleanAddr : `${cleanAddr}, Delhi NCR, India`
      )}&key=${apiKey.trim()}`;
      const res = await fetch(gUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data: any = await res.json();
        if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
          const loc = data.results[0].geometry.location;
          const coords = { lat: Number(loc.lat), lng: Number(loc.lng) };
          geocodeCache[cleanAddr] = coords;
          return coords;
        }
      }
    } catch (err) {
      // Ignore Google Geocode error and fallback
    }
  }

  // 2. Photon Geocoder with Delhi center bias
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      cleanAddr
    )}&lat=28.6139&lon=77.2090&limit=3`;
    const res = await fetch(photonUrl, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data: any = await res.json();
      if (Array.isArray(data.features) && data.features.length > 0) {
        // Pick the feature nearest to Delhi NCR if multiple returned
        for (const feat of data.features) {
          const coords = feat.geometry?.coordinates;
          if (Array.isArray(coords) && coords.length >= 2) {
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            // Check if within broader North India / NCR boundary (Lat 28.0-29.2, Lng 76.5-77.8)
            if (lat >= 27.8 && lat <= 29.5 && lng >= 76.2 && lng <= 78.2) {
              const result = { lat, lng };
              geocodeCache[cleanAddr] = result;
              return result;
            }
          }
        }
      }
    }
  } catch (err) {
    // Ignore Photon error
  }

  // 3. Nominatim OpenStreetMap
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
 * Helper to ensure Indian addresses carry regional context for Google Distance Matrix
 */
const formatQueryForRegion = (text: string): string => {
  if (!text) return '';
  const clean = text.trim();
  if (
    clean.toLowerCase().includes('delhi') ||
    clean.toLowerCase().includes('noida') ||
    clean.toLowerCase().includes('gurgaon') ||
    clean.toLowerCase().includes('gurugram') ||
    clean.toLowerCase().includes('ghaziabad') ||
    clean.toLowerCase().includes('faridabad') ||
    clean.toLowerCase().includes('india')
  ) {
    return clean;
  }
  return `${clean}, Delhi, India`;
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
  // Try extracting coordinates from text or URL if not directly passed as numbers
  let originLat = origin.lat;
  let originLng = origin.lng;
  if (typeof originLat !== 'number' || typeof originLng !== 'number') {
    const extracted = parseCoordsFromText(origin.address || '') || parseCoordsFromText(origin.name || '');
    if (extracted) {
      originLat = extracted.lat;
      originLng = extracted.lng;
    }
  }

  let destLat = destination.lat;
  let destLng = destination.lng;
  if (typeof destLat !== 'number' || typeof destLng !== 'number') {
    const extracted = parseCoordsFromText(destination.address || '') || parseCoordsFromText(destination.name || '');
    if (extracted) {
      destLat = extracted.lat;
      destLng = extracted.lng;
    }
  }

  const originHasCoords = typeof originLat === 'number' && typeof originLng === 'number';
  const destHasCoords = typeof destLat === 'number' && typeof destLng === 'number';

  const originStr = originHasCoords
    ? `${originLat},${originLng}`
    : formatQueryForRegion(origin.address || origin.name || '');

  const destStr = destHasCoords
    ? `${destLat},${destLng}`
    : formatQueryForRegion(destination.address || destination.name || '');

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
  let startLat = originLat;
  let startLng = originLng;
  if ((typeof startLat !== 'number' || typeof startLng !== 'number') && (origin.address || origin.name)) {
    const geo = await geocodeAddress(origin.address || origin.name || '', apiKey);
    if (geo) {
      startLat = geo.lat;
      startLng = geo.lng;
    }
  }

  let endLat = destLat;
  let endLng = destLng;
  if ((typeof endLat !== 'number' || typeof endLng !== 'number') && (destination.address || destination.name)) {
    const geo = await geocodeAddress(destination.address || destination.name || '', apiKey);
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
