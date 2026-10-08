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
  startTime?: string;
  endTime?: string;
  status?: string;
  cancelReason?: string;
  startedAt?: string | Date;
  completedAt?: string | Date;
  paymentStatus?: string;
  paymentMode?: string;
  workerId?: {
    _id?: string;
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
  } | any;
  rating?: number;
  notes?: string;
  specialInstructions?: string;
  workerNotes?: string;
  customerFeedback?: string;
  feedback?: string;
  adminCompletionRemarks?: string;
}

export const formatStatus = (status?: string): string => {
  if (!status) return 'Confirmed';
  switch (status.toLowerCase()) {
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'started':
      return 'In Progress';
    case 'pending':
    case 'accepted':
      return 'Confirmed';
    case 'rejected':
      return 'Rejected';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export const formatPaymentStatus = (pStatus?: string): string => {
  if (!pStatus) return 'Pending';
  switch (pStatus.toLowerCase()) {
    case 'received':
    case 'paid':
      return 'Received / Paid';
    case 'outstanding':
      return 'Outstanding';
    case 'pending':
      return 'Pending';
    default:
      return pStatus;
  }
};

export const formatPaymentMode = (pMode?: string): string => {
  if (!pMode || pMode === 'not_selected') return 'Not Selected';
  switch (pMode.toLowerCase()) {
    case 'cash':
      return 'Cash';
    case 'upi_online':
      return 'UPI / Online';
    default:
      return pMode;
  }
};

export const getGoogleMapsUrl = (lat?: number, lng?: number, address?: string): string => {
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (address && address.trim().length > 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  }
  return '';
};

export const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
};

/**
 * Format Date to DD-MM-YYYY (e.g. 03-10-2026)
 */
export const formatJobDate = (dateStr?: string | Date): string => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string') {
    const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      return `${ymdMatch[3]}-${ymdMatch[2]}-${ymdMatch[1]}`;
    }
    const dmyMatch = dateStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[1]}-${dmyMatch[2]}-${dmyMatch[3]}`;
    }
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateStr || '');
  }
};

/**
 * Normalize time string to 24-hour HH:mm or clean time (e.g. 10:00, 14:00)
 */
export const normalizeTimeToHHMM = (timeStr?: string): string => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2];
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'PM' && h < 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return `${match24[1].padStart(2, '0')}:${match24[2]}`;
  }
  return trimmed;
};

/**
 * Extract Assigned Time from job (e.g. 10:00, 14:00, 08:00)
 */
export const getAssignedTime = (job: any): string => {
  if (job.startTime) {
    return normalizeTimeToHHMM(job.startTime);
  }
  if (job.timeSlot) {
    const slotStr = String(job.timeSlot);
    if (slotStr.includes(' - ')) {
      return normalizeTimeToHHMM(slotStr.split(' - ')[0]);
    }
    if (slotStr.includes('-')) {
      return normalizeTimeToHHMM(slotStr.split('-')[0]);
    }
    return normalizeTimeToHHMM(slotStr);
  }
  return '';
};

/**
 * Extract Scheduled End Time from job (e.g. 11:00)
 */
export const getScheduledEndTime = (job: any): string => {
  if (job.endTime) {
    return normalizeTimeToHHMM(job.endTime);
  }
  if (job.timeSlot) {
    const slotStr = String(job.timeSlot);
    if (slotStr.includes(' - ')) {
      const endPart = slotStr.split(' - ')[1];
      if (endPart) return normalizeTimeToHHMM(endPart);
    }
    if (slotStr.includes('-')) {
      const endPart = slotStr.split('-')[1];
      if (endPart) return normalizeTimeToHHMM(endPart);
    }
  }
  return job.estimatedDuration || '';
};

/**
 * Format timestamp (startedAt, completedAt) to HH:mm (e.g. 14:44)
 */
export const formatTimeHHMM = (dateVal?: string | Date): string => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
};

/**
 * Clean status string (e.g. Completed, In Progress, Assigned, Cancelled, Rejected)
 */
export const formatScheduleStatus = (status?: string): string => {
  if (!status) return 'Assigned';
  switch (status.toLowerCase()) {
    case 'completed':
      return 'Completed';
    case 'started':
      return 'In Progress';
    case 'pending':
      return 'Assigned';
    case 'accepted':
      return 'Accepted';
    case 'cancelled':
      return 'Cancelled';
    case 'rejected':
      return 'Rejected';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

/**
 * Excel sheet names can be max 31 chars and cannot contain \ / ? * : [ ]
 */
export const sanitizeSheetName = (name: string, existingNames: Set<string>): string => {
  let clean = (name || 'Worker').replace(/[\\/?*[\]:]/g, '_').trim();
  if (!clean) clean = 'Worker';
  clean = clean.slice(0, 31);

  let uniqueName = clean;
  let counter = 1;
  while (existingNames.has(uniqueName.toLowerCase())) {
    const suffix = ` (${counter})`;
    uniqueName = clean.slice(0, Math.max(1, 31 - suffix.length)) + suffix;
    counter++;
  }
  existingNames.add(uniqueName.toLowerCase());
  return uniqueName;
};

/**
 * Groups raw booking items into unique customers with repeat count and complete summary
 */
export const prepareUniqueCustomerRows = (items: CustomerExportItem[]) => {
  const customerMap = new Map<string, CustomerExportItem[]>();

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

    const jobWithAddress = jobList.find((j) => j.address && j.address.trim().length > 0) || latestJob;
    const jobWithGPS = jobList.find((j) => j.location?.lat && j.location?.lng) || latestJob;

    const lat = jobWithGPS.location?.lat;
    const lng = jobWithGPS.location?.lng;
    const mapsUrl = getGoogleMapsUrl(lat, lng, jobWithAddress.address);

    const workers = Array.from(
      new Set(
        jobList
          .map((j) => (typeof j.workerId === 'object' && j.workerId?.name ? j.workerId.name : typeof j.workerId === 'string' ? j.workerId : ''))
          .filter(Boolean)
      )
    ).join(', ');

    const companies = Array.from(new Set(jobList.map((j) => j.company).filter(Boolean))).join(', ');
    const cancelReasons = Array.from(new Set(cancelledJobs.map((j) => j.cancelReason).filter(Boolean))).join('; ');

    const repeatLabel = repeatCount > 1 
      ? `${repeatCount} Times (${completedJobs.length} Completed, ${cancelledJobs.length} Cancelled)` 
      : '1 Time (First Time)';

    const historySummary = jobList
      .map((j, idx) => {
        const d = j.date || 'No Date';
        const s = j.title || 'Service';
        const st = j.status || 'confirmed';
        const p = j.price ? `Rs. ${j.price}` : '';
        return `${idx + 1}. [${d}] ${s} (${p} - ${st})`;
      })
      .join(' | ');

    uniqueRows.push({
      'Customer Name': latestJob.clientName || 'N/A',
      'Phone Number': latestJob.clientPhone || '',
      'Repeat Count': repeatLabel,
      'Total Bookings': repeatCount,
      'Completed Jobs': completedJobs.length,
      'Cancelled Jobs': cancelledJobs.length,
      'Total Spent (INR)': totalSpent,
      'First Work Date': oldestJob.date || '',
      'Latest Work Date': latestJob.date || '',
      'Latest Service': latestJob.title || latestJob.serviceCategory || '',
      'Latest Job Status': formatStatus(latestJob.status),
      'Cancellation Reason': cancelReasons || (cancelledJobs.length > 0 ? 'Cancelled' : 'N/A'),
      'Complete Address': jobWithAddress.address || '',
      'Landmark': jobWithAddress.landmark || latestJob.landmark || '',
      'City': jobWithAddress.city || latestJob.city || '',
      'Pincode': jobWithAddress.pincode || latestJob.pincode || '',
      'GPS Latitude': lat !== undefined && lat !== null ? String(lat) : '',
      'GPS Longitude': lng !== undefined && lng !== null ? String(lng) : '',
      'Google Maps Link': mapsUrl,
      'All Bookings History': historySummary,
      'Assigned Staff': workers || 'Unassigned',
      'Company': companies || '',
      'Latest Rating': latestJob.rating ? `${latestJob.rating} / 5` : '',
      'Alternate Phone': latestJob.alternatePhone || '',
      'Email': latestJob.clientEmail || '',
      'Customer Notes': latestJob.notes || latestJob.specialInstructions || latestJob.workerNotes || ''
    });
  });

  return uniqueRows;
};

/**
 * Raw detailed rows without grouping (pure English)
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
      'Customer Name': item.clientName || 'N/A',
      'Phone Number': item.clientPhone || '',
      'Complete Address': item.address || '',
      'Landmark': item.landmark || '',
      'City': item.city || '',
      'Pincode': item.pincode || '',
      'GPS Latitude': lat !== undefined && lat !== null ? String(lat) : '',
      'GPS Longitude': lng !== undefined && lng !== null ? String(lng) : '',
      'Google Maps Link': mapsUrl,
      'Service Clean': item.title || item.serviceCategory || '',
      'Company': item.company || '',
      'Price (INR)': item.price || 0,
      'Work Date': item.date || '',
      'Time Slot': item.timeSlot || '',
      'Status': formatStatus(item.status),
      'Cancellation Reason': item.cancelReason || (item.status === 'cancelled' ? 'Cancelled' : ''),
      'Work Started At': startedTime,
      'Work Completed At': completedTime,
      'Payment Status': formatPaymentStatus(item.paymentStatus),
      'Payment Mode': formatPaymentMode(item.paymentMode),
      'Assigned Worker': workerName,
      'Worker Phone': workerPhone,
      'Customer Rating': item.rating ? `${item.rating} / 5` : '',
      'Alternate Phone': item.alternatePhone || '',
      'Email': item.clientEmail || '',
      'Customer Notes / Instructions': item.notes || item.specialInstructions || item.workerNotes || '',
      'Booking ID': item._id || ''
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

/**
 * Export Job Scheduling sheet grouped by Worker into separate Excel Sheet tabs
 * Matching exact columns from screenshot:
 * Date | Job No. | Customer Name | Mobile | Service | Location | Assigned Time | Scheduled end | Start Time | End Time | Status | Rating | Customer Feedback | Payment | Remarks
 */
export const exportJobScheduleToExcel = (
  jobs: any[],
  workers: any[] = [],
  filenamePrefix = 'shinestaff_schedule'
) => {
  const workbook = XLSX.utils.book_new();
  const existingSheetNames = new Set<string>();

  // Map: workerKey -> { workerName: string, jobs: any[] }
  const workerJobsMap = new Map<string, { workerName: string; jobs: any[] }>();

  // Register all workers from worker list first (ensuring clean order)
  if (workers && Array.isArray(workers) && workers.length > 0) {
    workers.forEach((w) => {
      const wName = (w.name || w.fullName || 'Worker').trim();
      const wId = String(w._id || w.id || wName);
      if (!workerJobsMap.has(wId)) {
        workerJobsMap.set(wId, {
          workerName: wName,
          jobs: []
        });
      }
    });
  }

  const unassignedJobs: any[] = [];

  // Categorize jobs to workers
  jobs.forEach((job) => {
    let matchedWorkerId: string | null = null;
    let matchedWorkerName: string | null = null;

    if (job.workerId) {
      if (typeof job.workerId === 'object') {
        matchedWorkerId = String(job.workerId._id || job.workerId.id || '');
        matchedWorkerName = job.workerId.name || job.workerId.fullName || null;
      } else if (typeof job.workerId === 'string') {
        matchedWorkerId = job.workerId;
      }
    }

    // Match by ID
    if (matchedWorkerId && workerJobsMap.has(matchedWorkerId)) {
      workerJobsMap.get(matchedWorkerId)!.jobs.push(job);
      return;
    }

    // Match by Name
    if (matchedWorkerName) {
      let found = false;
      for (const [, entry] of workerJobsMap.entries()) {
        if (entry.workerName.toLowerCase() === matchedWorkerName.toLowerCase()) {
          entry.jobs.push(job);
          found = true;
          break;
        }
      }
      if (found) return;

      const customKey = `name_${matchedWorkerName}`;
      if (!workerJobsMap.has(customKey)) {
        workerJobsMap.set(customKey, {
          workerName: matchedWorkerName,
          jobs: []
        });
      }
      workerJobsMap.get(customKey)!.jobs.push(job);
      return;
    }

    // If string ID/Name
    if (matchedWorkerId) {
      const customKey = `id_${matchedWorkerId}`;
      if (!workerJobsMap.has(customKey)) {
        workerJobsMap.set(customKey, {
          workerName: matchedWorkerId,
          jobs: []
        });
      }
      workerJobsMap.get(customKey)!.jobs.push(job);
      return;
    }

    unassignedJobs.push(job);
  });

  const generateRows = (jobList: any[]) => {
    const sorted = [...jobList].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = a.timeSlot || a.startTime || '';
      const timeB = b.timeSlot || b.startTime || '';
      return timeA.localeCompare(timeB);
    });

    return sorted.map((job, idx) => {
      const dateFormatted = formatJobDate(job.date);
      const customerName = job.clientName || 'N/A';
      const mobile = job.clientPhone ? String(job.clientPhone).replace(/\D/g, '').slice(-10) : '';
      const service = job.title || job.serviceCategory || job.description || '';

      let location = '';
      if (job.address && job.address.trim().length > 0) {
        location = job.address.trim();
      } else if (job.location?.lat && job.location?.lng) {
        location = `${job.location.lat}, ${job.location.lng}`;
      } else if (job.locationName) {
        location = job.locationName;
      } else if (job.landmark || job.city) {
        location = [job.landmark, job.city, job.pincode].filter(Boolean).join(', ');
      }

      const assignedTime = getAssignedTime(job);
      const scheduledEnd = getScheduledEndTime(job);
      const startTime = formatTimeHHMM(job.startedAt);
      const endTime = formatTimeHHMM(job.completedAt);
      const status = formatScheduleStatus(job.status);
      const rating = job.rating ? job.rating : '';
      const customerFeedback = job.customerFeedback || job.feedback || job.workerNotes || job.notes || '';
      const payment = job.price !== undefined && job.price !== null ? job.price : 0;
      const remarks = job.adminCompletionRemarks || job.cancelReason || job.specialInstructions || (job.notes && job.notes !== job.workerNotes ? job.notes : '') || '';

      return {
        'Date': dateFormatted,
        'Job No.': idx + 1,
        'Customer Name': customerName,
        'Mobile': mobile,
        'Service': service,
        'Location': location,
        'Assigned Time': assignedTime,
        'Scheduled end': scheduledEnd,
        'Start Time': startTime,
        'End Time': endTime,
        'Status': status,
        'Rating': rating,
        'Customer Feedback': customerFeedback,
        'Payment': payment,
        'Remarks': remarks
      };
    });
  };

  const colWidths = [
    { wch: 14 }, // Date
    { wch: 10 }, // Job No.
    { wch: 26 }, // Customer Name
    { wch: 16 }, // Mobile
    { wch: 45 }, // Service
    { wch: 48 }, // Location
    { wch: 16 }, // Assigned Time
    { wch: 16 }, // Scheduled end
    { wch: 14 }, // Start Time
    { wch: 14 }, // End Time
    { wch: 16 }, // Status
    { wch: 10 }, // Rating
    { wch: 25 }, // Customer Feedback
    { wch: 12 }, // Payment
    { wch: 30 }  // Remarks
  ];

  const emptyHeaders = [
    {
      'Date': '',
      'Job No.': '',
      'Customer Name': '',
      'Mobile': '',
      'Service': '',
      'Location': '',
      'Assigned Time': '',
      'Scheduled end': '',
      'Start Time': '',
      'End Time': '',
      'Status': '',
      'Rating': '',
      'Customer Feedback': '',
      'Payment': '',
      'Remarks': ''
    }
  ];

  let sheetAddedCount = 0;

  // Append sheets for each worker
  workerJobsMap.forEach((entry) => {
    const rows = entry.jobs.length > 0 ? generateRows(entry.jobs) : [];
    const worksheet = rows.length > 0 ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.json_to_sheet(emptyHeaders);
    if (rows.length === 0) {
      XLSX.utils.sheet_add_json(worksheet, [], {
        header: [
          'Date', 'Job No.', 'Customer Name', 'Mobile', 'Service', 'Location',
          'Assigned Time', 'Scheduled end', 'Start Time', 'End Time', 'Status',
          'Rating', 'Customer Feedback', 'Payment', 'Remarks'
        ]
      });
    }
    worksheet['!cols'] = colWidths;
    const sheetName = sanitizeSheetName(entry.workerName, existingSheetNames);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    sheetAddedCount++;
  });

  // Append unassigned jobs sheet if any
  if (unassignedJobs.length > 0) {
    const unassignedRows = generateRows(unassignedJobs);
    const worksheet = XLSX.utils.json_to_sheet(unassignedRows);
    worksheet['!cols'] = colWidths;
    const sheetName = sanitizeSheetName('Unassigned', existingSheetNames);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    sheetAddedCount++;
  }

  // Fallback if empty
  if (sheetAddedCount === 0) {
    const worksheet = XLSX.utils.json_to_sheet(emptyHeaders);
    worksheet['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedule');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const finalFilename = `${filenamePrefix}_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, finalFilename);
};
