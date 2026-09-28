import * as XLSX from 'xlsx';

export interface CustomerExportItem {
  _id?: string;
  clientName?: string;
  clientPhone?: string;
  alternatePhone?: string;
  clientEmail?: string;
  address?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  location?: {
    lat?: number;
    lng?: number;
  };
  title?: string;
  serviceCategory?: string;
  company?: string;
  price?: number;
  date?: string;
  timeSlot?: string;
  status?: string;
  cancelReason?: string;
  startedAt?: string | Date;
  completedAt?: string | Date;
  paymentStatus?: string;
  paymentMode?: string;
  workerId?: {
    name?: string;
    phone?: string;
    email?: string;
  } | any;
  rating?: number;
  notes?: string;
  specialInstructions?: string;
  workerNotes?: string;
}

const formatStatus = (status?: string): string => {
  if (!status) return 'Confirmed 📋';
  switch (status.toLowerCase()) {
    case 'completed':
      return 'Completed ✅';
    case 'cancelled':
      return 'Cancelled ❌';
    case 'started':
      return 'In Progress ⏳';
    case 'pending':
    case 'accepted':
      return 'Confirmed 📋';
    case 'rejected':
      return 'Rejected ⚠️';
    default:
      return status;
  }
};

const formatPaymentStatus = (pStatus?: string): string => {
  if (!pStatus) return 'Pending ⏳';
  switch (pStatus.toLowerCase()) {
    case 'received':
    case 'paid':
      return 'Received / Paid ✅';
    case 'outstanding':
      return 'Outstanding ⚠️';
    case 'pending':
      return 'Pending ⏳';
    default:
      return pStatus;
  }
};

const formatPaymentMode = (pMode?: string): string => {
  if (!pMode || pMode === 'not_selected') return 'Not Selected';
  switch (pMode.toLowerCase()) {
    case 'cash':
      return '💵 Cash';
    case 'upi_online':
      return '📱 UPI / Online';
    default:
      return pMode;
  }
};

const getGoogleMapsUrl = (lat?: number, lng?: number, address?: string): string => {
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (address && address.trim().length > 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  }
  return '';
};

const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
};

/**
 * Groups raw booking items into unique customers with repeat count and complete summary
 */
export const prepareUniqueCustomerRows = (items: CustomerExportItem[]) => {
  const customerMap = new Map<string, CustomerExportItem[]>();

  // Group by normalized phone or name
  items.forEach((item) => {
    const rawPhone = item.clientPhone?.trim() || '';
    const cleanPhone = normalizePhone(rawPhone);
    const cleanName = (item.clientName || '').trim().toLowerCase();

    const key = cleanPhone ? `phone_${cleanPhone}` : `name_${cleanName || 'unknown'}`;
    if (!customerMap.has(key)) {
      customerMap.set(key, []);
    }
    customerMap.get(key)!.push(item);
  });

  const uniqueRows: any[] = [];

  customerMap.forEach((jobList) => {
    // Sort jobs by date (most recent first)
    jobList.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });

    const latestJob = jobList[0];
    const oldestJob = jobList[jobList.length - 1];

    const repeatCount = jobList.length;
    const completedJobs = jobList.filter((j) => (j.status || '').toLowerCase() === 'completed');
    const cancelledJobs = jobList.filter((j) => (j.status || '').toLowerCase() === 'cancelled');
    const totalSpent = jobList.reduce((acc, j) => acc + (j.price || 0), 0);

    // Pick best available address & GPS from latest job or any job in list
    const jobWithAddress = jobList.find((j) => j.address && j.address.trim().length > 0) || latestJob;
    const jobWithGPS = jobList.find((j) => j.location?.lat && j.location?.lng) || latestJob;

    const lat = jobWithGPS.location?.lat;
    const lng = jobWithGPS.location?.lng;
    const mapsUrl = getGoogleMapsUrl(lat, lng, jobWithAddress.address);

    // Collect all unique workers
    const workers = Array.from(
      new Set(
        jobList
          .map((j) => (typeof j.workerId === 'object' && j.workerId?.name ? j.workerId.name : typeof j.workerId === 'string' ? j.workerId : ''))
          .filter(Boolean)
      )
    ).join(', ');

    // Collect all companies
    const companies = Array.from(new Set(jobList.map((j) => j.company).filter(Boolean))).join(', ');

    // Collect all cancel reasons if any
    const cancelReasons = Array.from(new Set(cancelledJobs.map((j) => j.cancelReason).filter(Boolean))).join('; ');

    // Format repeat label
    const repeatLabel = repeatCount > 1 
      ? `${repeatCount} बार (${completedJobs.length} Completed, ${cancelledJobs.length} Cancelled)` 
      : '1 बार (First Time)';

    // Service History Summary
    const historySummary = jobList
      .map((j, idx) => {
        const d = j.date || 'No Date';
        const s = j.title || 'Service';
        const st = j.status || 'confirmed';
        const p = j.price ? `₹${j.price}` : '';
        return `${idx + 1}. [${d}] ${s} (${p} - ${st})`;
      })
      .join(' | ');

    uniqueRows.push({
      'Customer Name (ग्राहक नाम)': latestJob.clientName || 'N/A',
      'Phone Number (फ़ोन नंबर)': latestJob.clientPhone || '',
      'Repeat Count (कितनी बार काम कराया)': repeatLabel,
      'Total Bookings (कुल बुकिंग)': repeatCount,
      'Completed Jobs (सफल काम)': completedJobs.length,
      'Cancelled Jobs (रद्द काम)': cancelledJobs.length,
      'Total Spent INR (कुल बिज़नेस ₹)': totalSpent,
      'First Work Date (पहला काम तारीख)': oldestJob.date || '',
      'Latest Work Date (हालिया काम तारीख)': latestJob.date || '',
      'Latest Service (हालिया काम / सर्विस)': latestJob.title || latestJob.serviceCategory || '',
      'Latest Job Status (हालिया काम स्थिति)': formatStatus(latestJob.status),
      'Cancellation Reason (रद्द होने का कारण)': cancelReasons || (cancelledJobs.length > 0 ? 'Cancelled' : 'N/A'),
      'Complete Address (पूरा पता)': jobWithAddress.address || '',
      'Landmark (लैंडमार्क)': jobWithAddress.landmark || latestJob.landmark || '',
      'City (शहर)': jobWithAddress.city || latestJob.city || '',
      'Pincode (पिनकोड)': jobWithAddress.pincode || latestJob.pincode || '',
      'GPS Latitude (अक्षांश)': lat !== undefined && lat !== null ? String(lat) : '',
      'GPS Longitude (देशांतर)': lng !== undefined && lng !== null ? String(lng) : '',
      'Google Maps Link (GPS मैप्स लिंक)': mapsUrl,
      'All Bookings History (पूरा काम इतिहास)': historySummary,
      'Assigned Staff (स्टाफ)': workers || 'Unassigned',
      'Company (कंपनी)': companies || '',
      'Latest Rating (रेटिंग)': latestJob.rating ? `${latestJob.rating} / 5 ⭐` : '',
      'Alternate Phone (वैकल्पिक फ़ोन)': latestJob.alternatePhone || '',
      'Email (ईमेल)': latestJob.clientEmail || '',
      'Customer Notes (निर्देश)': latestJob.notes || latestJob.specialInstructions || latestJob.workerNotes || ''
    });
  });

  return uniqueRows;
};

/**
 * Raw detailed rows without grouping (if needed for line-by-line inspection)
 */
export const prepareRawCustomerRows = (items: CustomerExportItem[]) => {
  return items.map((item) => {
    const lat = item.location?.lat;
    const lng = item.location?.lng;
    const mapsUrl = getGoogleMapsUrl(lat, lng, item.address);

    const workerName = item.workerId?.name || (typeof item.workerId === 'string' ? item.workerId : 'Unassigned');
    const workerPhone = item.workerId?.phone || '';

    const startedTime = item.startedAt ? new Date(item.startedAt).toLocaleString('en-IN') : '';
    const completedTime = item.completedAt ? new Date(item.completedAt).toLocaleString('en-IN') : '';

    return {
      'Customer Name (ग्राहक नाम)': item.clientName || 'N/A',
      'Phone Number (फ़ोन नंबर)': item.clientPhone || '',
      'Complete Address (पूरा पता)': item.address || '',
      'Landmark (लैंडमार्क)': item.landmark || '',
      'City (शहर)': item.city || '',
      'Pincode (पिनकोड)': item.pincode || '',
      'GPS Latitude (अक्षांश)': lat !== undefined && lat !== null ? String(lat) : '',
      'GPS Longitude (देशांतर)': lng !== undefined && lng !== null ? String(lng) : '',
      'Google Maps Link (GPS लोकेशन लिंक)': mapsUrl,
      'Service Clean (काम / सर्विस)': item.title || item.serviceCategory || '',
      'Company (कंपनी)': item.company || '',
      'Price INR (राशि ₹)': item.price || 0,
      'Work Date (काम की तारीख)': item.date || '',
      'Time Slot (समय)': item.timeSlot || '',
      'Status (काम की स्थिति)': formatStatus(item.status),
      'Cancellation Reason (रद्द होने का कारण)': item.cancelReason || (item.status === 'cancelled' ? 'Cancelled' : ''),
      'Work Started At (शुरू समय)': startedTime,
      'Work Completed At (खत्म समय)': completedTime,
      'Payment Status (भुगतान)': formatPaymentStatus(item.paymentStatus),
      'Payment Mode (माध्यम)': formatPaymentMode(item.paymentMode),
      'Assigned Worker (स्टाफ)': workerName,
      'Worker Phone (स्टाफ फ़ोन)': workerPhone,
      'Customer Rating (रेटिंग)': item.rating ? `${item.rating} / 5 ⭐` : '',
      'Alternate Phone (वैकल्पिक फ़ोन)': item.alternatePhone || '',
      'Email (ईमेल)': item.clientEmail || '',
      'Customer Notes / Instructions (निर्देश)': item.notes || item.specialInstructions || item.workerNotes || '',
      'Booking ID (बुकिंग आईडी)': item._id || ''
    };
  });
};

/**
 * Export Unique Customer Data as Native Microsoft Excel (.xlsx) file
 */
export const exportCustomersToExcel = (
  items: CustomerExportItem[], 
  filenamePrefix = 'shinestaff_customers_data',
  uniqueOnly = true
) => {
  const rows = uniqueOnly ? prepareUniqueCustomerRows(items) : prepareRawCustomerRows(items);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set professional column widths
  worksheet['!cols'] = [
    { wch: 24 }, // Customer Name
    { wch: 16 }, // Phone
    { wch: 30 }, // Repeat Count
    { wch: 16 }, // Total Bookings
    { wch: 16 }, // Completed Jobs
    { wch: 16 }, // Cancelled Jobs
    { wch: 16 }, // Total Spent
    { wch: 15 }, // First Work Date
    { wch: 15 }, // Latest Work Date
    { wch: 26 }, // Latest Service
    { wch: 18 }, // Latest Job Status
    { wch: 28 }, // Cancellation Reason
    { wch: 40 }, // Complete Address
    { wch: 20 }, // Landmark
    { wch: 14 }, // City
    { wch: 10 }, // Pincode
    { wch: 14 }, // GPS Latitude
    { wch: 14 }, // GPS Longitude
    { wch: 45 }, // Google Maps Link
    { wch: 50 }, // All Bookings History
    { wch: 22 }, // Staff
    { wch: 15 }, // Company
    { wch: 14 }, // Rating
    { wch: 16 }, // Alternate Phone
    { wch: 24 }, // Email
    { wch: 30 }  // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, uniqueOnly ? 'Unique Customers' : 'All Bookings');

  const todayStr = new Date().toISOString().split('T')[0];
  const finalFilename = `${filenamePrefix}_${todayStr}.xlsx`;

  XLSX.writeFile(workbook, finalFilename);
};

/**
 * Export Customer Data as Excel-Compatible UTF-8 CSV (.csv)
 */
export const exportCustomersToCSV = (
  items: CustomerExportItem[], 
  filenamePrefix = 'shinestaff_customers_data',
  uniqueOnly = true
) => {
  const rows = uniqueOnly ? prepareUniqueCustomerRows(items) : prepareRawCustomerRows(items);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const todayStr = new Date().toISOString().split('T')[0];
  const finalFilename = `${filenamePrefix}_${todayStr}.csv`;

  // UTF-8 BOM so Excel opens with proper character encoding
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
