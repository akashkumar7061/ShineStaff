/**
 * Utility functions for resolving and opening Google Maps locations accurately across devices.
 */

export const extractMapUrl = (text?: string): string | null => {
  if (!text) return null;
  const clean = text.trim();

  // Direct URL starting with http:// or https://
  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  // URL without protocol (e.g. maps.app.goo.gl/xyz or goo.gl/maps/xyz or maps.google.com/...)
  if (/^(?:www\.)?(?:maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.com|google\.com\/maps)/i.test(clean)) {
    return `https://${clean}`;
  }

  // Embedded URL inside text (e.g. "Near ABC Hospital https://maps.app.goo.gl/xyz")
  const urlMatch = clean.match(/(https?:\/\/[^\s]+)/i);
  if (urlMatch) {
    return urlMatch[1].replace(/[),.;]+$/, '');
  }

  // Embedded URL without https inside text (e.g. "Near ABC Hospital maps.app.goo.gl/xyz")
  const shortMatch = clean.match(/((?:maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.com)[^\s]+)/i);
  if (shortMatch) {
    return `https://${shortMatch[1].replace(/[),.;]+$/, '')}`;
  }

  return null;
};

export const getJobMapUrl = (job: any): string => {
  if (!job) return 'https://maps.google.com';

  const locName = (job.locationName || '').trim();
  const addr = (job.address || '').trim();

  // 1. Check if locationName contains an exact Google Maps URL
  const urlFromLoc = extractMapUrl(locName);
  if (urlFromLoc) {
    return urlFromLoc;
  }

  // 2. Check if address contains an exact Google Maps URL
  const urlFromAddr = extractMapUrl(addr);
  if (urlFromAddr) {
    return urlFromAddr;
  }

  // 3. Exact GPS coordinates on job.location
  if (
    job.location &&
    typeof job.location.lat === 'number' &&
    typeof job.location.lng === 'number' &&
    !isNaN(job.location.lat) &&
    !isNaN(job.location.lng) &&
    (job.location.lat !== 0 || job.location.lng !== 0)
  ) {
    return `https://maps.google.com/?q=${job.location.lat},${job.location.lng}`;
  }

  // 4. Coordinates inside locationName (e.g. "28.5355, 77.3910")
  const coordRegex = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/;
  const locMatch = locName.match(coordRegex);
  if (locMatch) {
    return `https://maps.google.com/?q=${locMatch[1]},${locMatch[2]}`;
  }

  // 5. Coordinates inside address
  const addrMatch = addr.match(coordRegex);
  if (addrMatch) {
    return `https://maps.google.com/?q=${addrMatch[1]},${addrMatch[2]}`;
  }

  // 6. Address + Landmark text query
  if (addr && locName && locName !== addr) {
    return `https://maps.google.com/?q=${encodeURIComponent(`${addr}, ${locName}`)}`;
  }

  if (addr) {
    return `https://maps.google.com/?q=${encodeURIComponent(addr)}`;
  }

  if (locName) {
    return `https://maps.google.com/?q=${encodeURIComponent(locName)}`;
  }

  return 'https://maps.google.com';
};

/**
 * Safely opens Google Maps on mobile and desktop devices.
 */
export const openJobLocationInMaps = (job: any, e?: React.MouseEvent | React.TouchEvent) => {
  if (e) {
    e.stopPropagation();
    // If clicked on an <a> element, let native browser navigation take over smoothly
    const target = (e.currentTarget || e.target) as HTMLElement | null;
    if (target?.tagName?.toLowerCase() === 'a' || target?.closest('a')) {
      return;
    }
  }

  const url = getJobMapUrl(job);
  if (!url) return;

  // Open in an external browsing context so mobile OS intercepts Google Maps app
  window.open(url, '_blank', 'noopener,noreferrer');
};
