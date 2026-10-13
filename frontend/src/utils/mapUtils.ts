/**
 * Utility functions for resolving and opening Google Maps locations accurately across devices.
 */

export const getJobMapUrl = (job: any): string => {
  if (!job) return 'https://maps.google.com';

  const locName = (job.locationName || '').trim();
  const addr = (job.address || '').trim();

  // 1. If locationName is a direct URL (e.g. https://maps.app.goo.gl/... or https://goo.gl/maps/...)
  if (locName.startsWith('http://') || locName.startsWith('https://')) {
    return locName;
  }

  // 2. If address itself is a direct URL
  if (addr.startsWith('http://') || addr.startsWith('https://')) {
    return addr;
  }

  // 3. If exact GPS coordinates exist on job.location
  if (
    job.location &&
    typeof job.location.lat === 'number' &&
    typeof job.location.lng === 'number' &&
    !isNaN(job.location.lat) &&
    !isNaN(job.location.lng)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${job.location.lat},${job.location.lng}`;
  }

  // 4. If locationName contains coordinates (e.g. "28.5355, 77.3910" or "28.5355,77.3910")
  const coordRegex = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/;
  const locMatch = locName.match(coordRegex);
  if (locMatch) {
    return `https://www.google.com/maps/search/?api=1&query=${locMatch[1]},${locMatch[2]}`;
  }

  // 5. If address contains coordinates
  const addrMatch = addr.match(coordRegex);
  if (addrMatch) {
    return `https://www.google.com/maps/search/?api=1&query=${addrMatch[1]},${addrMatch[2]}`;
  }

  // 6. Check if locName or addr contains an embedded URL (e.g. "Near ABC Hospital https://maps.app.goo.gl/xyz")
  const urlRegex = /(https?:\/\/[^\s]+)/i;
  const embeddedUrlInLoc = locName.match(urlRegex);
  if (embeddedUrlInLoc) {
    return embeddedUrlInLoc[1];
  }
  const embeddedUrlInAddr = addr.match(urlRegex);
  if (embeddedUrlInAddr) {
    return embeddedUrlInAddr[1];
  }

  // 7. If text address + landmark
  if (addr && locName && locName !== addr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${addr}, ${locName}`)}`;
  }

  if (addr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  }

  if (locName) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locName)}`;
  }

  return 'https://maps.google.com';
};

/**
 * Safely opens Google Maps on mobile / desktop browsers, preventing pop-up blocks.
 */
export const openJobLocationInMaps = (job: any, e?: React.MouseEvent) => {
  if (e) {
    e.stopPropagation();
  }
  const url = getJobMapUrl(job);
  if (!url) return;

  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    window.location.href = url;
  }
};
