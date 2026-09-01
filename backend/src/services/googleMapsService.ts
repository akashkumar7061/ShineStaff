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

export interface RouteLegResult {
  distanceKM: number;
  durationText?: string;
  source: 'google_maps' | 'osrm' | 'haversine_road';
  googleMapsUrl: string;
}

/**
 * Calculates road distance between two GPS coordinates using Google Distance Matrix API
 * with fallback to OSRM / Haversine road adjusted distance.
 */
export const calculateLegDistance = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey?: string,
  originLabel?: string,
  destLabel?: string
): Promise<RouteLegResult> => {
  const originQuery = originLabel ? encodeURIComponent(originLabel) : `${originLat},${originLng}`;
  const destQuery = destLabel ? encodeURIComponent(destLabel) : `${destLat},${destLng}`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destQuery}&travelmode=driving`;

  // 1. If Google Maps API Key is provided, call Google Distance Matrix API
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=driving&key=${apiKey.trim()}`;
      const response = await fetch(gUrl, { signal: AbortSignal.timeout(4000) });
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

  // 2. Fallback to free OSRM (Open Source Routing Machine) driving route
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
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
    // Ignore and proceed to haversine fallback
  }

  // 3. Fallback to Haversine with 1.25x road curvature multiplier
  const directKM = calculateHaversineKM(originLat, originLng, destLat, destLng);
  const roadKM = Number((directKM * 1.25).toFixed(2));
  return {
    distanceKM: roadKM,
    durationText: `${Math.round(roadKM * 2.5)} mins (est)`,
    source: 'haversine_road',
    googleMapsUrl
  };
};
