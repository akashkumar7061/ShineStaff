import { Response } from 'express';
import TravelLog from '../models/TravelLog';
import Job from '../models/Job';
import User from '../models/User';
import Settings from '../models/Settings';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../index';
import { logAudit } from '../utils/auditLog';
import { calculateLegDistance, parseCoordsFromText, resolveLocationInput, isValidIndiaCoord } from '../services/googleMapsService';

export const submitTravelLog = async (req: AuthRequest, res: Response) => {
  const { date, type, jobId, kms } = req.body;

  if (!req.user || req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can log travel commutes' });
  }

  try {
    let fromLoc = 'Work Site';
    let toLoc = 'Home';

    if (type === 'home') {
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      const lastJob = await Job.findOne({
        workerId: req.user.id,
        status: 'completed',
        completedAt: { $gte: todayStart, $lte: todayEnd }
      }).sort({ completedAt: -1 });

      if (lastJob) {
        fromLoc = lastJob.address;
      }
    } else {
      fromLoc = 'Home';
      if (jobId) {
        const targetJob = await Job.findById(jobId);
        if (targetJob) {
          toLoc = targetJob.address;
        }
      }
    }

    const travel = new TravelLog({
      workerId: req.user.id,
      date: date || new Date().toISOString().split('T')[0],
      type,
      jobId: jobId || undefined,
      kms: Number(kms) || 0,
      allowance: 0,
      status: 'pending',
      fromLocation: fromLoc,
      toLocation: toLoc
    });

    await travel.save();

    // Emit Socket alert to admins for real-time dashboard reload
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'TRAVEL_LOG_SUBMITTED',
        message: `New commute log submitted.`,
        travelId: travel._id
      });
    }

    res.status(201).json({ message: 'Travel commute logged successfully', travel });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getTravelLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { workerId, date, status } = req.query;
    const filter: any = {};

    if (workerId) {
      filter.workerId = workerId;
    }
    if (date) {
      filter.date = date;
    }
    if (status) {
      filter.status = status;
    }

    const logs = await TravelLog.find(filter)
      .populate('workerId', 'name email phone company')
      .populate('jobId', 'title clientName clientPhone address')
      .sort({ date: -1 });

    res.status(200).json(logs);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const approveTravelLog = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { allowance } = req.body;

  try {
    const log = await TravelLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: 'Travel commute log not found' });
    }

    log.allowance = Number(allowance) || 0;
    log.status = 'approved';

    await log.save();

    logAudit(req, {
      action: 'approved',
      entityType: 'TravelLog',
      entityId: log._id.toString(),
      summary: `Approved travel allowance of ₹${log.allowance} for ${log.kms} km`
    });

    // Notify worker and admins via Socket
    const io = getIO();
    if (io) {
      io.to(log.workerId.toString()).emit('notification', {
        type: 'TRAVEL_LOG_APPROVED',
        message: `Your travel allowance of ₹${allowance} was approved.`,
        travelId: log._id
      });
      io.emit('adminNotification', {
        type: 'TRAVEL_LOG_APPROVED',
        message: `Travel allowance approved for worker.`,
        travelId: log._id
      });
    }

    res.status(200).json({ message: 'Travel allowance approved successfully', log });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateTravelLog = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { date, type, kms, allowance, status, fromLocation, toLocation } = req.body;

  try {
    const log = await TravelLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: 'Travel log not found' });
    }

    if (date !== undefined) log.date = date;
    if (type !== undefined) log.type = type;
    if (kms !== undefined) log.kms = Number(kms);
    if (allowance !== undefined) log.allowance = Number(allowance);
    if (status !== undefined) log.status = status;
    if (fromLocation !== undefined) log.fromLocation = fromLocation;
    if (toLocation !== undefined) log.toLocation = toLocation;

    await log.save();

    logAudit(req, {
      action: 'updated',
      entityType: 'TravelLog',
      entityId: log._id.toString(),
      summary: `Edited travel log (${log.kms} km, allowance ₹${log.allowance})`
    });

    // Notify admins and worker via Socket
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'TRAVEL_LOG_UPDATED',
        message: `Travel log updated.`,
        travelId: log._id
      });
      io.to(log.workerId.toString()).emit('notification', {
        type: 'TRAVEL_LOG_UPDATED',
        message: `Your travel log was updated by admin.`,
        travelId: log._id
      });
    }

    res.status(200).json({ message: 'Travel log updated successfully', log });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const adminSubmitTravelLog = async (req: AuthRequest, res: Response) => {
  const { workerId, date, type, kms, allowance, fromLocation, toLocation } = req.body;

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can add logs manually' });
  }

  if (!workerId || !kms) {
    return res.status(400).json({ message: 'Worker and KMs are required' });
  }

  try {
    const travel = new TravelLog({
      workerId,
      date: date || new Date().toISOString().split('T')[0],
      type: type || 'home',
      kms: Number(kms) || 0,
      allowance: Number(allowance) || 0,
      status: 'approved', // Auto-approved since admin created it
      fromLocation: fromLocation || 'Work Site',
      toLocation: toLocation || 'Home'
    });

    await travel.save();

    logAudit(req, {
      action: 'created',
      entityType: 'TravelLog',
      entityId: travel._id.toString(),
      summary: `Manually logged travel (${travel.kms} km, allowance ₹${travel.allowance}) for a worker`
    });

    // Emit Socket alert
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'TRAVEL_LOG_UPDATED',
        message: `Admin logged travel log.`,
        travelId: travel._id
      });
      io.to(workerId.toString()).emit('notification', {
        type: 'TRAVEL_LOG_APPROVED',
        message: `Admin logged travel allowance of ₹${allowance || 0} for you.`,
        travelId: travel._id
      });
    }

    res.status(201).json({ message: 'Travel commute logged successfully', travel });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteTravelLog = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Ensure ONLY Admin role can delete travel commute records
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Only system Administrators can delete travel commute records.' });
  }

  try {
    const log = await TravelLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: 'Travel log not found' });
    }

    await TravelLog.findByIdAndDelete(id);

    logAudit(req, {
      action: 'deleted',
      entityType: 'TravelLog',
      entityId: id,
      summary: `Deleted travel log (${log.kms} km, allowance ₹${log.allowance})`
    });

    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'TRAVEL_LOG_DELETED',
        message: `Travel log deleted.`,
        travelId: id
      });
      io.to(log.workerId.toString()).emit('notification', {
        type: 'TRAVEL_LOG_DELETED',
        message: `Your travel log was deleted by admin.`,
        travelId: id
      });
    }

    res.status(200).json({ message: 'Travel log deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Calculates daily chain route (Home -> Site 1 -> Mid-day Site 2 -> ... -> Home)
 * for all workers on a specified date using Google Maps Distance Matrix API.
 */
export const getDailyWorkerTravelSummary = async (req: AuthRequest, res: Response) => {
  try {
    const targetDate = (req.query.date as string) || new Date().toISOString().split('T')[0];

    // Fetch global settings for fuel allowance rate & Google Maps API key
    let settings = await Settings.findOne({ settingsId: 'global' });
    if (!settings) {
      settings = new Settings({ settingsId: 'global' });
      await settings.save();
    }
    const fuelRate = settings.fuelAllowanceRate || 4;
    const apiKey = settings.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || '';

    // Fetch all active workers
    const workers = await User.find({ role: 'worker', status: 'active' })
      .select('name email phone company photo homeLocation currentLocation status')
      .lean();

    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    // Fetch all jobs scheduled or worked on targetDate
    const allJobs = await Job.find({
      $or: [
        { date: targetDate },
        { startedAt: { $gte: startOfDay, $lte: endOfDay } },
        { completedAt: { $gte: startOfDay, $lte: endOfDay } }
      ],
      status: { $nin: ['cancelled'] }
    })
      .select('title company workerId clientName clientPhone address locationName location beforePhotoGPS afterPhotoGPS status date timeSlot startedAt completedAt beforePhotoTime')
      .lean();

    // Fetch existing TravelLogs for this date to determine if already approved
    const existingLogs = await TravelLog.find({ date: targetDate }).lean();

    const workerSummaries = await Promise.all(
      workers.map(async (worker: any) => {
        // Filter jobs assigned to this worker
        const workerJobs = allJobs.filter(
          (j: any) => j.workerId && j.workerId.toString() === worker._id.toString()
        );

        const workerLogs = existingLogs.filter(
          (l: any) => l.workerId && l.workerId.toString() === worker._id.toString()
        );
        const isApproved = workerLogs.some((l: any) => l.status === 'approved');
        const approvedAllowance = workerLogs
          .filter((l: any) => l.status === 'approved')
          .reduce((sum: number, l: any) => sum + (l.allowance || 0), 0);

        if (workerJobs.length === 0) {
          return {
            workerId: worker._id,
            workerName: worker.name,
            workerPhone: worker.phone,
            workerPhoto: worker.photo,
            company: worker.company,
            homeLocation: worker.homeLocation || null,
            hasHomeConfigured: !!(worker.homeLocation?.lat && worker.homeLocation?.lng),
            hasActivity: false,
            totalJobsCount: 0,
            completedJobsCount: 0,
            totalKM: 0,
            fuelRate,
            fuelAllowance: 0,
            isApproved,
            approvedAllowance,
            legs: []
          };
        }

        // Helper to get sort minutes from midnight
        const getJobSortMinutes = (j: any): number => {
          if (j.startedAt) {
            const d = new Date(j.startedAt);
            return d.getHours() * 60 + d.getMinutes();
          }
          if (j.beforePhotoTime) {
            const d = new Date(j.beforePhotoTime);
            return d.getHours() * 60 + d.getMinutes();
          }
          if (j.timeSlot) {
            const match = j.timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (match) {
              let hours = parseInt(match[1], 10);
              const minutes = parseInt(match[2], 10);
              const ampm = match[3].toUpperCase();
              if (ampm === 'PM' && hours < 12) hours += 12;
              if (ampm === 'AM' && hours === 12) hours = 0;
              return hours * 60 + minutes;
            }
          }
          if (j.createdAt) {
            const d = new Date(j.createdAt);
            return d.getHours() * 60 + d.getMinutes();
          }
          return 9999;
        };

        // Sort jobs strictly in chronological schedule / execution order
        workerJobs.sort((a: any, b: any) => getJobSortMinutes(a) - getJobSortMinutes(b));

        // Determine worker home coordinates (validate with isValidIndiaCoord)
        let homeLat = worker.homeLocation?.lat;
        let homeLng = worker.homeLocation?.lng;
        const homeAddress = worker.homeLocation?.address || 'Worker Residence';

        // Auto-heal worker home coordinates if missing or invalid
        if ((!isValidIndiaCoord(homeLat, homeLng)) && homeAddress && homeAddress !== 'Worker Residence') {
          const resolvedHome = await resolveLocationInput(homeAddress, apiKey);
          if (resolvedHome && isValidIndiaCoord(resolvedHome.lat, resolvedHome.lng)) {
            homeLat = resolvedHome.lat;
            homeLng = resolvedHome.lng;
            User.updateOne({ _id: worker._id }, { $set: { 'homeLocation.lat': homeLat, 'homeLocation.lng': homeLng } }).exec();
          }
        }

        const hasHome = isValidIndiaCoord(homeLat, homeLng);

        // Build array of stops: Home -> Site 1 -> Site 2 -> ... -> Return Home
        const stops: Array<{
          type: 'home_departure' | 'job_site' | 'home_return';
          name: string;
          address: string;
          lat?: number;
          lng?: number;
          jobId?: string;
          status?: string;
          time?: string;
        }> = [];

        // 1. Home Departure Stop
        stops.push({
          type: 'home_departure',
          name: 'Home Departure',
          address: homeAddress,
          lat: hasHome ? homeLat : undefined,
          lng: hasHome ? homeLng : undefined
        });

        // 2. Job Site Stops in true chronological order
        for (let index = 0; index < workerJobs.length; index++) {
          const job = workerJobs[index];
          let siteLat = job.location?.lat || job.beforePhotoGPS?.lat || job.afterPhotoGPS?.lat;
          let siteLng = job.location?.lng || job.beforePhotoGPS?.lng || job.afterPhotoGPS?.lng;

          // Check if coordinates are valid inside India. If not valid (or Null Island 0,0), reset to undefined
          if (!isValidIndiaCoord(siteLat, siteLng)) {
            siteLat = undefined;
            siteLng = undefined;
          }

          // If site coordinates are still not resolved, resolve from locationName (Google Maps Link/Landmark) or address!
          if (!isValidIndiaCoord(siteLat, siteLng)) {
            const locInput = job.locationName || job.address;
            if (locInput) {
              const resolved = await resolveLocationInput(locInput, apiKey);
              if (resolved && isValidIndiaCoord(resolved.lat, resolved.lng)) {
                siteLat = resolved.lat;
                siteLng = resolved.lng;
                // Auto-save to MongoDB so future queries are 0ms instant
                Job.updateOne({ _id: job._id }, { $set: { location: { lat: siteLat, lng: siteLng } } }).exec();
              }
            }
          }

          const timeDisplay = job.startedAt
            ? new Date(job.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : job.timeSlot || `Site #${index + 1}`;

          const displayAddress = job.address
            ? (job.locationName && !job.locationName.startsWith('http') ? `${job.address}, ${job.locationName}` : job.address)
            : (job.locationName || 'Client Address');

          stops.push({
            type: 'job_site',
            name: `${job.clientName} (${job.title || 'Cleaning Service'})`,
            address: displayAddress,
            lat: isValidIndiaCoord(siteLat, siteLng) ? siteLat : undefined,
            lng: isValidIndiaCoord(siteLat, siteLng) ? siteLng : undefined,
            jobId: job._id.toString(),
            status: job.status,
            time: timeDisplay
          });
        }

        // 3. Return Home Stop
        stops.push({
          type: 'home_return',
          name: 'Return to Home',
          address: homeAddress,
          lat: hasHome ? homeLat : undefined,
          lng: hasHome ? homeLng : undefined
        });

        // Calculate each leg distance using Google Maps Service
        const legs = [];
        let totalKM = 0;

        for (let i = 0; i < stops.length - 1; i++) {
          const fromStop = stops[i];
          const toStop = stops[i + 1];

          const legRes = await calculateLegDistance(
            {
              lat: fromStop.lat,
              lng: fromStop.lng,
              address: fromStop.address,
              name: fromStop.name
            },
            {
              lat: toStop.lat,
              lng: toStop.lng,
              address: toStop.address,
              name: toStop.name
            },
            apiKey
          );

          const distanceKM = legRes.distanceKM;
          const durationText = legRes.durationText || '';
          const source = legRes.source;
          const googleMapsUrl = legRes.googleMapsUrl;

          totalKM += distanceKM;

          legs.push({
            legNumber: i + 1,
            fromType: fromStop.type,
            fromName: fromStop.name,
            fromAddress: fromStop.address,
            toType: toStop.type,
            toName: toStop.name,
            toAddress: toStop.address,
            toJobId: toStop.jobId,
            toStatus: toStop.status,
            time: toStop.time || '',
            distanceKM,
            durationText,
            source,
            googleMapsUrl
          });
        }

        totalKM = Number(totalKM.toFixed(2));
        const fuelAllowance = Number((totalKM * fuelRate).toFixed(2));

        return {
          workerId: worker._id,
          workerName: worker.name,
          workerPhone: worker.phone,
          workerPhoto: worker.photo,
          company: worker.company,
          homeLocation: worker.homeLocation || null,
          hasHomeConfigured: hasHome,
          hasActivity: true,
          totalJobsCount: workerJobs.length,
          completedJobsCount: workerJobs.filter((j: any) => j.status === 'completed').length,
          totalKM,
          fuelRate,
          fuelAllowance,
          isApproved,
          approvedAllowance,
          legs
        };
      })
    );

    res.status(200).json({
      date: targetDate,
      fuelRate,
      hasGoogleApiKey: !!(apiKey && apiKey.trim().length > 10),
      totalWorkersCount: workers.length,
      activeTravelersCount: workerSummaries.filter((w) => w.hasActivity).length,
      totalTeamKM: Number(
        workerSummaries.reduce((sum, w) => sum + w.totalKM, 0).toFixed(2)
      ),
      totalTeamAllowance: Number(
        workerSummaries.reduce((sum, w) => sum + w.fuelAllowance, 0).toFixed(2)
      ),
      workers: workerSummaries
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to calculate daily travel summary', error: error.message });
  }
};

/**
 * 1-Click Approve Daily Calculated Travel for a Worker
 */
export const approveDailyCalculatedTravel = async (req: AuthRequest, res: Response) => {
  const { workerId, date, totalKM, allowance, notes } = req.body;

  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can approve daily travel payouts' });
  }

  try {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Check if an existing log exists for this worker on this date
    let travel = await TravelLog.findOne({ workerId, date: targetDate });

    if (travel) {
      travel.kms = Number(totalKM) || travel.kms;
      travel.allowance = Number(allowance) >= 0 ? Number(allowance) : travel.allowance;
      travel.status = 'approved';
      await travel.save();
    } else {
      travel = new TravelLog({
        workerId,
        date: targetDate,
        type: 'home',
        kms: Number(totalKM) || 0,
        allowance: Number(allowance) || 0,
        status: 'approved',
        fromLocation: 'Home Route',
        toLocation: 'Home Return'
      });
      await travel.save();
    }

    logAudit(req, {
      action: 'approved',
      entityType: 'TravelLog',
      entityId: travel._id.toString(),
      summary: `Approved daily travel route (${travel.kms} KM, ₹${travel.allowance}) for worker on ${targetDate}`
    });

    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'TRAVEL_LOG_UPDATED',
        message: `Daily travel route approved.`,
        travelId: travel._id
      });
      io.to(workerId.toString()).emit('notification', {
        type: 'TRAVEL_LOG_APPROVED',
        message: `Your daily travel allowance for ${targetDate} (₹${travel.allowance}) has been approved.`,
        travelId: travel._id
      });
    }

    res.status(200).json({ message: 'Daily travel route approved successfully', travel });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to approve daily travel', error: error.message });
  }
};
