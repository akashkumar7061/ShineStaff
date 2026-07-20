import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Payment from '../models/Payment';
import Job from '../models/Job';
import QRCode from '../models/QRCode';
import { logAudit } from '../utils/auditLog';

// Helper to generate unique Payment ID
const generatePaymentId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${dateStr}-${randomNum}`;
};

// 1. Record New Payment (Cash or UPI/Online)
export const recordPayment = async (req: AuthRequest, res: Response) => {
  const {
    jobId,
    invoiceNumber,
    workerId,
    workerName,
    clientName,
    clientPhone,
    company,
    serviceCategory,
    paymentMethod,
    qrId,
    qrName,
    upiId,
    amount,
    remarks,
    collectedBy
  } = req.body;

  try {
    if (!clientName || !amount || !paymentMethod || !company) {
      return res.status(400).json({ message: 'Client Name, Amount, Payment Method, and Company are required.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour12: false });

    let finalQrName = qrName || '';
    let finalUpiId = upiId || '';

    // If online payment and qrId provided, fetch details
    if (paymentMethod === 'upi_online' && qrId) {
      const qr = await QRCode.findById(qrId);
      if (qr) {
        finalQrName = qr.name;
        finalUpiId = qr.upiId;
      }
    }

    const payment = new Payment({
      paymentId: generatePaymentId(),
      jobId: jobId || undefined,
      invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      workerId: workerId || req.user?.id,
      workerName: workerName || 'Worker',
      clientName,
      clientPhone: clientPhone || '',
      company: company || 'SofaShine',
      serviceCategory: serviceCategory || 'Cleaning Service',
      paymentMethod,
      qrId: qrId || undefined,
      qrName: finalQrName,
      upiId: finalUpiId,
      amount: Number(amount),
      paymentDate: todayStr,
      paymentTime: timeStr,
      status: 'completed',
      collectedBy: collectedBy || (req.user?.role === 'admin' ? 'Admin' : 'Worker'),
      remarks: remarks || ''
    });

    await payment.save();

    // If linked to a Job, update Job payment status
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, {
        paymentStatus: 'received',
        paymentMode: paymentMethod === 'upi_online' ? 'upi_online' : 'cash'
      });
    }

    logAudit(req, {
      action: 'created',
      entityType: 'Payment',
      entityId: payment._id.toString(),
      summary: `Recorded ₹${amount} ${paymentMethod} payment for ${clientName} (${company}) via ${finalQrName || 'Cash'}`
    });

    res.status(201).json(payment);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 2. Get Payments with Filters & Search
export const getPayments = async (req: AuthRequest, res: Response) => {
  const {
    startDate,
    endDate,
    workerId,
    company,
    paymentMethod,
    qrName,
    status,
    search,
    page = 1,
    limit = 100
  } = req.query;

  try {
    const filter: any = {};

    if (startDate && endDate) {
      filter.paymentDate = { $gte: String(startDate), $lte: String(endDate) };
    }

    if (workerId && workerId !== 'all') {
      filter.workerId = workerId;
    }

    if (company && company !== 'all') {
      filter.company = company;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }

    if (qrName && qrName !== 'all') {
      filter.qrName = qrName;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$or = [
        { clientName: searchRegex },
        { workerName: searchRegex },
        { paymentId: searchRegex },
        { invoiceNumber: searchRegex },
        { clientPhone: searchRegex },
        { qrName: searchRegex },
        { upiId: searchRegex },
        { company: searchRegex }
      ];
    }

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 100;
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('jobId')
        .populate('workerId', 'name phone'),
      Payment.countDocuments(filter)
    ]);

    res.json({
      payments,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 3. Get Payment Collection Analytics & QR Revenue Distribution
export const getPaymentAnalytics = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query;

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const startStr = startDate ? String(startDate) : todayStr;
    const endStr = endDate ? String(endDate) : todayStr;

    const dateFilter = { paymentDate: { $gte: startStr, $lte: endStr } };

    const allPayments = await Payment.find(dateFilter);

    // Compute KPI Totals
    const todayCollection = allPayments
      .filter(p => p.paymentDate === todayStr && p.status === 'completed')
      .reduce((acc, p) => acc + p.amount, 0);

    const totalRevenue = allPayments
      .filter(p => p.status === 'completed')
      .reduce((acc, p) => acc + p.amount, 0);

    const cashCollection = allPayments
      .filter(p => p.paymentMethod === 'cash' && p.status === 'completed')
      .reduce((acc, p) => acc + p.amount, 0);

    const onlineCollection = allPayments
      .filter(p => p.paymentMethod === 'upi_online' && p.status === 'completed')
      .reduce((acc, p) => acc + p.amount, 0);

    const pendingPayments = allPayments
      .filter(p => p.status === 'pending')
      .reduce((acc, p) => acc + p.amount, 0);

    const failedPayments = allPayments
      .filter(p => p.status === 'failed')
      .reduce((acc, p) => acc + p.amount, 0);

    const refunds = allPayments
      .filter(p => p.status === 'refunded')
      .reduce((acc, p) => acc + p.amount, 0);

    // QR-wise revenue distribution
    const qrStats: { [qrName: string]: { amount: number; count: number; upiId: string } } = {};
    allPayments
      .filter(p => p.paymentMethod === 'upi_online' && p.status === 'completed')
      .forEach(p => {
        const key = p.qrName || 'General QR';
        if (!qrStats[key]) {
          qrStats[key] = { amount: 0, count: 0, upiId: p.upiId || '' };
        }
        qrStats[key].amount += p.amount;
        qrStats[key].count += 1;
      });

    const qrBreakdown = Object.keys(qrStats).map(name => ({
      name,
      upiId: qrStats[name].upiId,
      amount: qrStats[name].amount,
      count: qrStats[name].count
    })).sort((a, b) => b.amount - a.amount);

    // Company breakdown
    const companyStats: { [company: string]: number } = {};
    allPayments
      .filter(p => p.status === 'completed')
      .forEach(p => {
        const c = p.company || 'Other';
        companyStats[c] = (companyStats[c] || 0) + p.amount;
      });

    res.json({
      summary: {
        todayCollection,
        totalRevenue,
        cashCollection,
        onlineCollection,
        pendingPayments,
        failedPayments,
        refunds,
        totalCount: allPayments.length
      },
      qrBreakdown,
      companyBreakdown: Object.keys(companyStats).map(name => ({ name, amount: companyStats[name] }))
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
