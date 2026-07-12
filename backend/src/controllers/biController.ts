import { Response } from 'express';
import Job from '../models/Job';
import Expense from '../models/Expense';
import TravelLog from '../models/TravelLog';
import SalaryRequest from '../models/SalaryRequest';
import User from '../models/User';
import Attendance from '../models/Attendance';
import { AuthRequest } from '../middleware/auth';

export const getBIDashboardData = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate queries are required (Format: YYYY-MM-DD)' });
    }

    const startStr = startDate as string;
    const endStr = endDate as string;

    // 1. Fetch data in parallel
    const [jobs, customExpenses, travelLogs, salaryPayouts, workers, attendanceLogs] = await Promise.all([
      Job.find({ date: { $gte: startStr, $lte: endStr } }).populate('workerId', 'name photo company status'),
      Expense.find({ date: { $gte: startStr, $lte: endStr } }),
      TravelLog.find({ date: { $gte: startStr, $lte: endStr }, status: 'approved' }),
      // Map startDate/endDate to months YYYY-MM
      SalaryRequest.find({ 
        month: { 
          $gte: startStr.substring(0, 7), 
          $lte: endStr.substring(0, 7) 
        }, 
        status: 'approved' 
      }),
      User.find({ role: 'worker' }),
      Attendance.find({ date: { $gte: startStr, $lte: endStr } })
    ]);

    // --- 2. Financial Metrics ---
    let totalSales = 0; // Sum of price of all scheduled jobs in period
    let totalRevenue = 0; // Sum of price of COMPLETED jobs
    let pendingPayments = 0; // Price of non-completed jobs
    let receivedPayments = 0; // Price of completed jobs marked 'received' (or assumed received if paymentStatus is not 'outstanding'/'pending')
    let outstandingPayments = 0; // Price of completed jobs marked 'outstanding' or 'pending'

    jobs.forEach((job) => {
      const price = job.price || 0;
      totalSales += price;

      if (job.status === 'completed') {
        totalRevenue += price;
        const pStatus = job.paymentStatus || 'received'; // default to received for completed
        if (pStatus === 'received') {
          receivedPayments += price;
        } else {
          outstandingPayments += price;
        }
      } else if (job.status !== 'cancelled') {
        pendingPayments += price;
      }
    });

    // --- 3. Expense Analysis ---
    let workerSalariesExpense = 0;
    salaryPayouts.forEach((sr) => {
      workerSalariesExpense += sr.amount || 0;
    });

    let fuelExpense = 0;
    travelLogs.forEach((tl) => {
      fuelExpense += tl.allowance || 0;
    });

    let materialCost = 0;
    let equipmentCost = 0;
    let marketingCost = 0;
    let officeCost = 0;
    let miscellaneousCost = 0;

    customExpenses.forEach((exp) => {
      if (exp.category === 'material') materialCost += exp.amount;
      else if (exp.category === 'equipment') equipmentCost += exp.amount;
      else if (exp.category === 'marketing') marketingCost += exp.amount;
      else if (exp.category === 'office') officeCost += exp.amount;
      else if (exp.category === 'miscellaneous') miscellaneousCost += exp.amount;
      else if (exp.category === 'salary') workerSalariesExpense += exp.amount;
      else if (exp.category === 'fuel') fuelExpense += exp.amount;
    });

    const totalExpenses = workerSalariesExpense + fuelExpense + materialCost + equipmentCost + marketingCost + officeCost + miscellaneousCost;
    const netProfit = totalRevenue - totalExpenses;
    const grossProfit = totalRevenue - (materialCost + equipmentCost);

    const completedJobsCount = jobs.filter((j) => j.status === 'completed').length;
    const averageOrderValue = completedJobsCount > 0 ? Math.round(totalRevenue / completedJobsCount) : 0;

    // --- 4. Customer Analysis ---
    const customerCounts: { [phone: string]: number } = {};
    jobs.forEach((job) => {
      if (job.clientPhone) {
        customerCounts[job.clientPhone] = (customerCounts[job.clientPhone] || 0) + 1;
      }
    });
    const totalCustomers = Object.keys(customerCounts).length;
    let newCustomers = 0;
    let returningCustomers = 0;

    Object.values(customerCounts).forEach((count) => {
      if (count === 1) newCustomers++;
      else returningCustomers++;
    });

    // --- 5. Job Performance Analytics ---
    const totalJobsAssigned = jobs.length;
    const pendingJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'accepted').length;
    const inProgressJobs = jobs.filter((j) => j.status === 'started').length;
    const completedJobs = completedJobsCount;
    const cancelledJobs = jobs.filter((j) => j.status === 'cancelled').length;
    const completionRate = totalJobsAssigned > 0 ? Math.round((completedJobs / totalJobsAssigned) * 100) : 0;

    // Completion time & delays
    let totalCompletionTimeMs = 0;
    let completedWithTimeCount = 0;
    jobs.forEach((j) => {
      if (j.status === 'completed' && j.startedAt && j.completedAt) {
        totalCompletionTimeMs += new Date(j.completedAt).getTime() - new Date(j.startedAt).getTime();
        completedWithTimeCount++;
      }
    });
    const averageCompletionTimeHours = completedWithTimeCount > 0 
      ? Number((totalCompletionTimeMs / (1000 * 60 * 60 * completedWithTimeCount)).toFixed(1))
      : 0;

    // --- 6. Incomplete Job Analysis ---
    const cancellationReasons = {
      'Worker Unavailable': 0,
      'Customer Cancelled': 0,
      'Material Not Available': 0,
      'Weather Issue': 0,
      'Technical Issue': 0,
      'Payment Issue': 0,
      'Rescheduled': 0,
      'Other': 0
    };

    jobs.forEach((j) => {
      if (j.status === 'cancelled') {
        const reason = (j.cancelReason || '').toLowerCase();
        if (/worker|staff/i.test(reason)) cancellationReasons['Worker Unavailable']++;
        else if (/customer|client|user/i.test(reason)) cancellationReasons['Customer Cancelled']++;
        else if (/material|stock|liquid|shampoo/i.test(reason)) cancellationReasons['Material Not Available']++;
        else if (/weather|rain|storm/i.test(reason)) cancellationReasons['Weather Issue']++;
        else if (/machine|vacuum|technical|broken|power/i.test(reason)) cancellationReasons['Technical Issue']++;
        else if (/pay|money|cost|budget/i.test(reason)) cancellationReasons['Payment Issue']++;
        else if (/resched|postpone/i.test(reason)) cancellationReasons['Rescheduled']++;
        else cancellationReasons['Other']++;
      }
    });

    // --- 7. Worker Performance Metrics ---
    const workerPerformance = workers.map((w) => {
      const workerJobs = jobs.filter((j) => j.workerId && j.workerId.toString() === w._id.toString());
      const wAssigned = workerJobs.length;
      const wCompleted = workerJobs.filter((j) => j.status === 'completed').length;
      const wPending = workerJobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled').length;
      const wCancelled = workerJobs.filter((j) => j.status === 'cancelled').length;

      // Ratings
      const ratedJobs = workerJobs.filter((j) => j.status === 'completed' && j.rating);
      const avgRating = ratedJobs.length > 0
        ? Number((ratedJobs.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratedJobs.length).toFixed(1))
        : 5.0; // Default rating if none rated

      // Attendance
      const wAttendanceLogs = attendanceLogs.filter((a) => a.workerId.toString() === w._id.toString());
      const daysPresent = wAttendanceLogs.filter((a) => a.status === 'present' || a.status === 'late' || a.status === 'half-day').length;
      
      const totalDaysInRange = Math.max(1, Math.round((new Date(endStr).getTime() - new Date(startStr).getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const attendanceRate = Math.round((daysPresent / totalDaysInRange) * 100);

      const daysOnTime = wAttendanceLogs.filter((a) => a.status === 'present').length;
      const onTimeRate = daysPresent > 0 ? Math.round((daysOnTime / daysPresent) * 100) : 100;

      const wRevenue = workerJobs.filter((j) => j.status === 'completed').reduce((acc, curr) => acc + (curr.price || 0), 0);

      // Productivity Score = Completion Rate (70%) + On-Time Rate (30%)
      const completionPct = wAssigned > 0 ? (wCompleted / wAssigned) * 100 : 100;
      const productivityScore = Math.round((completionPct * 0.7) + (onTimeRate * 0.3));

      let rank: 'Top Performer' | 'Average Performer' | 'Needs Improvement' = 'Average Performer';
      if (productivityScore >= 85) rank = 'Top Performer';
      else if (productivityScore < 60) rank = 'Needs Improvement';

      return {
        _id: w._id,
        name: w.name,
        photo: w.photo,
        company: w.company,
        status: w.status,
        assignedJobs: wAssigned,
        completedJobs: wCompleted,
        pendingJobs: wPending,
        cancelledJobs: wCancelled,
        avgRating,
        attendanceRate,
        onTimeRate,
        revenueGenerated: wRevenue,
        productivityScore,
        rank
      };
    });

    // --- 8. Annual Goal Tracker ---
    const annualGoal = 20000000; // 2 Crore target
    const currentYear = new Date().getFullYear();
    const annualJobs = await Job.find({ 
      date: { $gte: `${currentYear}-01-01`, $lte: `${currentYear}-12-31` }, 
      status: 'completed' 
    });
    const currentAnnualRevenue = annualJobs.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const remainingAnnualRevenue = Math.max(0, annualGoal - currentAnnualRevenue);
    
    const currentMonthIndex = new Date().getMonth() + 1; // 1-indexed
    const remainingMonths = Math.max(1, 12 - currentMonthIndex + 1);
    const requiredRevenuePerMonth = Math.round(remainingAnnualRevenue / remainingMonths);
    const requiredRevenuePerDay = Math.round(requiredRevenuePerMonth / 30);

    const averageCompletedJobPrice = completedJobsCount > 0 ? Math.round(totalRevenue / completedJobsCount) : 4000;
    const requiredJobsPerMonth = Math.round(requiredRevenuePerMonth / averageCompletedJobPrice);

    // --- 9. Forecasts & Targets ---
    // Simple linear projections
    const daysDiff = Math.max(1, Math.round((new Date(endStr).getTime() - new Date(startStr).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const dailyAvgRevenue = totalRevenue / daysDiff;
    const nextMonthRevenueForecast = Math.round(dailyAvgRevenue * 30);
    const nextQuarterRevenueForecast = Math.round(dailyAvgRevenue * 90);
    const yearEndRevenueForecast = Math.round(dailyAvgRevenue * 365);

    const suggestedNextMonthJobsTarget = Math.round(completedJobs * 1.18);
    const suggestedNextMonthRevenueTarget = Math.round(totalRevenue * 1.20);

    // --- 10. AI-driven business insights/recommendations ---
    const aiSuggestions: string[] = [];
    if (outstandingPayments > 0) {
      aiSuggestions.push(`Outstanding payments are ₹${outstandingPayments.toLocaleString('en-IN')}. Reach out to pending clients to recover cash flow.`);
    }
    if (completionRate < 85 && totalJobsAssigned > 0) {
      aiSuggestions.push(`Job completion rate is at ${completionRate}%. Optimize dispatch scheduling to minimize pending delays.`);
    }
    const cancelPct = totalJobsAssigned > 0 ? (cancelledJobs / totalJobsAssigned) * 100 : 0;
    if (cancelPct > 10) {
      aiSuggestions.push(`Cancellations account for ${Math.round(cancelPct)}% of assigned jobs. Call clients 1 hour before visits to secure bookings.`);
    }
    const avgWorkerAttendance = workerPerformance.reduce((acc, curr) => acc + curr.attendanceRate, 0) / Math.max(1, workerPerformance.length);
    if (avgWorkerAttendance < 80) {
      aiSuggestions.push(`Average worker attendance is ${Math.round(avgWorkerAttendance)}%. Introduce attendance bonus points to enhance crew availability.`);
    }
    if (fuelExpense > totalRevenue * 0.15 && totalRevenue > 0) {
      aiSuggestions.push('Fuel allowance costs exceed 15% of net revenues. Enforce localized routes on scheduling maps to save fuel.');
    }
    if (aiSuggestions.length < 3) {
      aiSuggestions.push('Business demands are strong. Focus marketing budgets on top-performing sectors to capture additional market share.');
      aiSuggestions.push('Introduce seasonal package discounts to capture recurring residential sofa-cleaning agreements.');
    }

    res.status(200).json({
      financials: {
        totalSales,
        totalRevenue,
        totalExpenses,
        netProfit,
        grossProfit,
        outstandingPayments,
        pendingPayments,
        receivedPayments,
        averageOrderValue,
        totalCustomers,
        newCustomers,
        returningCustomers
      },
      expenseBreakdown: {
        salaries: workerSalariesExpense,
        fuel: fuelExpense,
        material: materialCost,
        equipment: equipmentCost,
        marketing: marketingCost,
        office: officeCost,
        miscellaneous: miscellaneousCost
      },
      jobAnalytics: {
        totalJobsAssigned,
        completedJobs,
        pendingJobs,
        cancelledJobs,
        inProgressJobs,
        completionRate,
        averageCompletionTimeHours,
        cancellationReasons
      },
      workerPerformance,
      annualGoals: {
        annualGoal,
        currentAnnualRevenue,
        remainingAnnualRevenue,
        requiredRevenuePerMonth,
        requiredRevenuePerDay,
        requiredJobsPerMonth
      },
      forecasts: {
        nextMonthRevenueForecast,
        nextQuarterRevenueForecast,
        yearEndRevenueForecast,
        suggestedNextMonthJobsTarget,
        suggestedNextMonthRevenueTarget
      },
      aiSuggestions
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
