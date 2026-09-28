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
  if (!status) return 'Confirmed';
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
  if (!pStatus) return 'Pending';
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

export const prepareCustomerRows = (items: CustomerExportItem[]) => {
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
      'Alternate Phone (वैकल्पिक फ़ोन)': item.alternatePhone || '',
      'Email (ईमेल)': item.clientEmail || '',
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
      'Customer Notes / Instructions (निर्देश)': item.notes || item.specialInstructions || item.workerNotes || '',
      'Booking ID (बुकिंग आईडी)': item._id || ''
    };
  });
};

/**
 * Export Customer Data as Native Microsoft Excel (.xlsx) file
 */
export const exportCustomersToExcel = (items: CustomerExportItem[], filenamePrefix = 'shinestaff_customers_data') => {
  const rows = prepareCustomerRows(items);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set professional column widths
  worksheet['!cols'] = [
    { wch: 22 }, // Customer Name
    { wch: 16 }, // Phone
    { wch: 16 }, // Alt Phone
    { wch: 24 }, // Email
    { wch: 38 }, // Complete Address
    { wch: 20 }, // Landmark
    { wch: 14 }, // City
    { wch: 10 }, // Pincode
    { wch: 14 }, // GPS Latitude
    { wch: 14 }, // GPS Longitude
    { wch: 45 }, // Google Maps Link
    { wch: 26 }, // Service Clean
    { wch: 15 }, // Company
    { wch: 14 }, // Price (INR)
    { wch: 15 }, // Work Date
    { wch: 20 }, // Time Slot
    { wch: 18 }, // Status
    { wch: 26 }, // Cancellation Reason
    { wch: 22 }, // Started At
    { wch: 22 }, // Completed At
    { wch: 20 }, // Payment Status
    { wch: 18 }, // Payment Mode
    { wch: 20 }, // Worker Name
    { wch: 16 }, // Worker Phone
    { wch: 14 }, // Rating
    { wch: 30 }, // Customer Notes
    { wch: 26 }  // Booking ID
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

  const todayStr = new Date().toISOString().split('T')[0];
  const finalFilename = `${filenamePrefix}_${todayStr}.xlsx`;

  XLSX.writeFile(workbook, finalFilename);
};

/**
 * Export Customer Data as Excel-Compatible UTF-8 CSV (.csv)
 */
export const exportCustomersToCSV = (items: CustomerExportItem[], filenamePrefix = 'shinestaff_customers_data') => {
  const rows = prepareCustomerRows(items);
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
