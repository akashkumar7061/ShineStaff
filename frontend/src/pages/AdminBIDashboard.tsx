import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { handleDownloadInvoice, handleShareInvoice } from '../utils/invoiceGenerator';
import MapView from '../components/MapView';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
  Download,
  Printer,
  Plus,
  Trash2,
  HelpCircle,
  Sparkles,
  Clock,
  CreditCard,
  Layers,
  PieChart as PieIcon,
  ShieldAlert,
  ListTodo,
  Star,
  Zap,
  MapPin,
  ChevronRight,
  ClipboardList,
  Flame,
  Archive,
  BarChart3,
  UserCheck,
  Plane,
  RefreshCw,
  Settings as SettingsIcon,
  History,
  Map,
  Share2,
  Pencil,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  Cell,
  Legend,
  CartesianGrid
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4'];

const getTodayString = () => new Date().toISOString().split('T')[0];

const getPresetDates = (preset: string) => {
  const today = new Date();
  let start = new Date();
  let end = new Date();

  switch (preset) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
      break;
    case 'last-7':
      start.setDate(today.getDate() - 6);
      break;
    case 'last-30':
      start.setDate(today.getDate() - 29);
      break;
    case 'this-month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'last-month':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case 'this-quarter':
      const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), qStartMonth, 1);
      break;
    case 'this-year':
      start = new Date(today.getFullYear(), 0, 1);
      break;
    default:
      break;
  }

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return { startDate: formatDate(start), endDate: formatDate(end) };
};

interface AdminBIDashboardProps {
  forceTab?: 'operations-desk' | 'operations' | 'workers' | 'goals' | 'expenses' | 'payment-tracker' | 'settings';
  hideNavigation?: boolean;
}

const AdminBIDashboard: React.FC<AdminBIDashboardProps> = ({ forceTab, hideNavigation = false }) => {
  const [preset, setPreset] = useState('this-month');
  const [startDate, setStartDate] = useState(() => getPresetDates('this-month').startDate);
  const [endDate, setEndDate] = useState(getTodayString());

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'operations-desk' | 'operations' | 'workers' | 'goals' | 'expenses' | 'payment-tracker' | 'audit' | 'settings'>('operations-desk');

  // --- Approvals Desk State ---
  const [pendingSalaryRequests, setPendingSalaryRequests] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingTravelLogs, setPendingTravelLogs] = useState<any[]>([]);

  // --- Attendance Log State ---
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);

  // --- GPS Map Tracking State ---
  const [mapSearchQuery, setMapSearchQuery] = useState('');

  // --- Company Settings Config state ---
  const [globalSettings, setGlobalSettings] = useState<any>({
    fuelAllowanceRate: 5,
    monthlyTargetRevenue: 1000000,
    dailyBaseRate: 400
  });



  const [expenseCategory, setExpenseCategory] = useState<'material' | 'equipment' | 'marketing' | 'office' | 'miscellaneous' | 'inventory'>('inventory');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayString());
  const [expenseDescription, setExpenseDescription] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const [travelWorker, setTravelWorker] = useState('');
  const [travelKms, setTravelKms] = useState('');
  const [travelAllowance, setTravelAllowance] = useState('');
  const [travelDate, setTravelDate] = useState(getTodayString());

  const [auditSearch, setAuditSearch] = useState('');

  const fetchBIData = async () => {
    setLoading(true);
    try {
      const [biRes, expRes, jobsRes, workersRes, auditRes, leavesRes, salaryRequestsRes, travelLogsRes, attendanceRes, settingsRes] = await Promise.all([
        api.get(`/bi/analytics?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/expenses?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/jobs?startDate=${startDate}&endDate=${endDate}`),
        api.get('/workers'),
        api.get(`/audit-logs?startDate=${startDate}&endDate=${endDate}&limit=100`),
        api.get('/leaves'),
        api.get('/salary/requests'),
        api.get('/travel/all'),
        api.get('/attendance/today'),
        api.get('/settings')
      ]);

      setAnalytics(biRes.data);
      setExpenses(expRes.data);
      setJobs(jobsRes.data);
      setWorkers(workersRes.data || []);
      setAuditLogs(auditRes.data.logs || []);

      // Filter approvals
      setPendingLeaves((leavesRes.data || []).filter((l: any) => l.status === 'pending'));
      setPendingSalaryRequests((salaryRequestsRes.data || []).filter((sr: any) => sr.status === 'pending'));
      setPendingTravelLogs((travelLogsRes.data || []).filter((tl: any) => tl.status === 'pending'));

      // Filter attendance logs
      setTodayAttendance(attendanceRes.data || []);
      
      if (settingsRes.data) {
        setGlobalSettings(settingsRes.data);
      }
    } catch (err) {
      console.error('Failed to load BI dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBIData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  useEffect(() => {
    if (forceTab) {
      setActiveTab(forceTab);
    }
  }, [forceTab]);

  const handlePresetChange = (selectedPreset: string) => {
    setPreset(selectedPreset);
    if (selectedPreset !== 'custom') {
      const dates = getPresetDates(selectedPreset);
      setStartDate(dates.startDate);
      setEndDate(dates.endDate);
    }
  };

  // --- Action Submissions ---



  const handleStartEditExpense = (exp: any) => {
    setEditingExpenseId(exp._id);
    setExpenseCategory(exp.category);
    setExpenseAmount(String(exp.amount));
    setExpenseDate(exp.date);
    setExpenseDescription(exp.description || '');
  };

  const handleCancelEditExpense = () => {
    setEditingExpenseId(null);
    setExpenseCategory('inventory');
    setExpenseAmount('');
    setExpenseDate(getTodayString());
    setExpenseDescription('');
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || isNaN(Number(expenseAmount)) || Number(expenseAmount) <= 0) return;

    try {
      if (editingExpenseId) {
        await api.put(`/expenses/${editingExpenseId}`, {
          category: expenseCategory,
          amount: Number(expenseAmount),
          date: expenseDate,
          description: expenseDescription
        });
        setEditingExpenseId(null);
        alert('Expense updated successfully!');
      } else {
        await api.post('/expenses', {
          category: expenseCategory,
          amount: Number(expenseAmount),
          date: expenseDate,
          description: expenseDescription
        });
        alert('Expense logged successfully!');
      }
      setExpenseAmount('');
      setExpenseDescription('');
      fetchBIData();
    } catch (err) {
      console.error('Failed to log/update expense:', err);
    }
  };

  const handleAddTravel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!travelWorker || !travelKms) {
      alert('Please select a worker and enter travel kms.');
      return;
    }

    try {
      const calculatedAllowance = Number(travelAllowance) || Number(travelKms) * (globalSettings.fuelAllowanceRate || 5);
      await api.post('/travel/admin-submit', {
        workerId: travelWorker,
        date: travelDate,
        kms: Number(travelKms),
        allowance: calculatedAllowance,
        fromLocation: 'Office / Site',
        toLocation: 'Home'
      });

      setTravelKms('');
      setTravelAllowance('');
      alert('Fuel commute allowance logged successfully!');
      fetchBIData();
    } catch (err) {
      console.error('Failed to manually log travel:', err);
    }
  };

  // --- Approvals Action Handlers ---

  const handleProcessLeave = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/leaves/${id}/process`, { status });
      alert(`Leave request ${status}!`);
      fetchBIData();
    } catch (err) {
      console.error('Failed to process leave:', err);
    }
  };

  const handleProcessSalary = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/salary/requests/${id}`, { status });
      alert(`Salary payout request ${status}!`);
      fetchBIData();
    } catch (err) {
      console.error('Failed to process salary request:', err);
    }
  };

  const handleProcessTravel = async (id: string) => {
    try {
      await api.put(`/travel/${id}/approve`);
      alert('Fuel Travel commute reimbursement approved!');
      fetchBIData();
    } catch (err) {
      console.error('Failed to approve travel log:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/settings', globalSettings);
      alert('Global configuration saved successfully!');
      fetchBIData();
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchBIData();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const handleUpdatePaymentStatus = async (jobId: string, paymentStatus: 'pending' | 'received' | 'outstanding') => {
    try {
      await api.put(`/jobs/${jobId}`, { paymentStatus });
      fetchBIData();
    } catch (err) {
      console.error('Failed to update job payment status:', err);
    }
  };

  const handleUpdateJobRating = async (jobId: string, rating: number) => {
    try {
      await api.put(`/jobs/${jobId}`, { rating });
      fetchBIData();
    } catch (err) {
      console.error('Failed to update job rating:', err);
    }
  };

  // --- Drill-down details ---
  const [drillDown, setDrillDown] = useState<{
    title: string;
    type: 'sales' | 'revenue' | 'expenses' | 'profit' | 'gross' | 'outstanding' | 'received' | 'customers';
    data: any[];
  } | null>(null);

  const [editingItem, setEditingItem] = useState<{
    type: 'job' | 'custom_expense' | 'salary_request' | 'travel_log' | 'customer';
    id: string;
    fields: any;
  } | null>(null);

  const handleEditItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      if (editingItem.type === 'job') {
        await api.put(`/jobs/${editingItem.id}`, editingItem.fields);
      } else if (editingItem.type === 'custom_expense') {
        await api.put(`/expenses/${editingItem.id}`, editingItem.fields);
      } else if (editingItem.type === 'salary_request') {
        await api.put(`/salary/payouts/${editingItem.id}`, editingItem.fields);
      } else if (editingItem.type === 'travel_log') {
        await api.put(`/travel/${editingItem.id}`, editingItem.fields);
      } else if (editingItem.type === 'customer') {
        await api.put(`/jobs/update-client-info`, {
          originalPhone: editingItem.id,
          clientName: editingItem.fields.clientName,
          clientPhone: editingItem.fields.clientPhone,
          address: editingItem.fields.address
        });
      }
      alert('Record updated successfully!');
      setEditingItem(null);
      setDrillDown(null);
      fetchBIData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update record');
    }
  };

  const openDrillDown = (type: 'sales' | 'revenue' | 'expenses' | 'profit' | 'gross' | 'outstanding' | 'received' | 'customers') => {
    if (!analytics) return;
    
    let title = '';
    let data: any[] = [];

    switch (type) {
      case 'sales':
        title = 'Total Sales (Scheduled Cleans)';
        data = jobs;
        break;
      case 'revenue':
        title = 'Total Revenue (Completed Cleans)';
        data = jobs.filter(j => j.status === 'completed');
        break;
      case 'expenses':
        title = 'Total Operating Expenses';
        const items: any[] = [];
        expenses.forEach(e => items.push({ 
          id: e._id,
          type: 'custom_expense',
          date: e.date, 
          category: e.category.toUpperCase(), 
          desc: e.description || 'Custom Expense', 
          amount: e.amount,
          raw: e
        }));
        (analytics.rawSalaryPayouts || []).forEach((sr: any) => {
          items.push({ 
            id: sr._id,
            type: 'salary_request',
            date: sr.processedAt ? new Date(sr.processedAt).toISOString().split('T')[0] : 'N/A', 
            category: 'SALARIES', 
            desc: `Salary Payout Request approved for ${sr.workerId?.name || 'Worker'} (${sr.month})`, 
            amount: sr.amount,
            raw: sr
          });
        });
        (analytics.rawTravelLogs || []).forEach((tl: any) => {
          items.push({ 
            id: tl._id,
            type: 'travel_log',
            date: tl.date, 
            category: 'FUEL ALLOWANCE', 
            desc: `Fuel Reimbursement for ${tl.workerId?.name || 'Worker'} (${tl.kms} Kms)`, 
            amount: tl.allowance,
            raw: tl
          });
        });
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        data = items;
        break;
      case 'profit':
        title = 'Net Profit Detail (Revenues vs Expenses)';
        data = [
          { category: 'REVENUE', desc: 'Total Completed Cleans Revenue', amount: analytics.financials.totalRevenue },
          { category: 'EXPENSE', desc: 'Worker Salaries Payouts', amount: analytics.expenseBreakdown.salaries },
          { category: 'EXPENSE', desc: 'Fuel & Travel Reimbursements', amount: analytics.expenseBreakdown.fuel },
          { category: 'EXPENSE', desc: 'Materials & Consumables Costs', amount: analytics.expenseBreakdown.material },
          { category: 'EXPENSE', desc: 'Equipment Purchase/Leases', amount: analytics.expenseBreakdown.equipment },
          { category: 'EXPENSE', desc: 'Marketing & Advertising Budgets', amount: analytics.expenseBreakdown.marketing },
          { category: 'EXPENSE', desc: 'Office Rents & Admin Overhead', amount: analytics.expenseBreakdown.office },
          { category: 'EXPENSE', desc: 'Inventory & Supplies Expense', amount: analytics.expenseBreakdown.inventory || 0 },
          { category: 'EXPENSE', desc: 'Miscellaneous Business Costs', amount: analytics.expenseBreakdown.miscellaneous }
        ];
        break;
      case 'gross':
        title = 'Gross Profit (Revenues - Cost of Goods Sold)';
        data = [
          { category: 'REVENUE', desc: 'Total Completed Cleans Revenue', amount: analytics.financials.totalRevenue },
          { category: 'EXPENSE (DEDUCTED)', desc: 'Materials & Consumables Costs', amount: analytics.expenseBreakdown.material },
          { category: 'EXPENSE (DEDUCTED)', desc: 'Equipment Purchase/Leases', amount: analytics.expenseBreakdown.equipment },
          { category: 'EXPENSE (DEDUCTED)', desc: 'Inventory & Cleaning Supplies', amount: analytics.expenseBreakdown.inventory || 0 }
        ];
        break;
      case 'outstanding':
        title = 'Outstanding Payments (Completed Unpaid)';
        data = jobs.filter(j => j.status === 'completed' && j.paymentStatus !== 'received');
        break;
      case 'received':
        title = 'Received Payments (Completed Paid)';
        data = jobs.filter(j => j.status === 'completed' && j.paymentStatus === 'received');
        break;
      case 'customers':
        title = 'Client Booking Activity (Repeat & Unique)';
        const map: { [phone: string]: { name: string; phone: string; count: number; address?: string } } = {};
        jobs.forEach(j => {
          if (j.clientPhone) {
            if (!map[j.clientPhone]) {
              map[j.clientPhone] = { 
                name: j.clientName, 
                phone: j.clientPhone, 
                count: 0, 
                address: j.address || j.locationName || 'N/A' 
              };
            }
            map[j.clientPhone].count++;
            if ((!map[j.clientPhone].address || map[j.clientPhone].address === 'N/A') && (j.address || j.locationName)) {
              map[j.clientPhone].address = j.address || j.locationName;
            }
          }
        });
        data = Object.values(map).sort((a, b) => b.count - a.count);
        break;
      default:
        break;
    }

    setDrillDown({ title, type, data });
  };

  // --- Professional Excel Export ---
  const exportToExcel = () => {
    if (!analytics) return;

    const xmlHeader = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#333333"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#1e1b4b"/>
  </Style>
  <Style ss:ID="SubTitle">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Italic="1" ss:Color="#666666"/>
  </Style>
  <Style ss:ID="TableHeader">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4f46e5" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="KPIKey">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1"/>
   <Interior ss:Color="#f3f4f6" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KPIVal">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#111827"/>
  </Style>
 </Styles>`;

    // Sheet 1: Executive Summary & Corporate Ratios
    let execSheet = `<Worksheet ss:Name="Executive Summary">
  <Table>
   <Row><Cell ss:StyleID="Title"><Data ss:Type="String">ShineStaff Company Performance Ratios</Data></Cell></Row>
   <Row><Cell ss:StyleID="SubTitle"><Data ss:Type="String">Period: ${startDate} to ${endDate}</Data></Cell></Row>
   <Row></Row>
   <Row>
     <Cell ss:StyleID="KPIKey"><Data ss:Type="String">Total Sales (Scheduled)</Data></Cell>
     <Cell ss:StyleID="KPIVal"><Data ss:Type="Number">${analytics.financials.totalSales}</Data></Cell>
   </Row>
   <Row>
     <Cell ss:StyleID="KPIKey"><Data ss:Type="String">Total Revenue (Completed)</Data></Cell>
     <Cell ss:StyleID="KPIVal"><Data ss:Type="Number">${analytics.financials.totalRevenue}</Data></Cell>
   </Row>
   <Row>
     <Cell ss:StyleID="KPIKey"><Data ss:Type="String">Total Operating Expenses</Data></Cell>
     <Cell ss:StyleID="KPIVal"><Data ss:Type="Number">${analytics.financials.totalExpenses}</Data></Cell>
   </Row>
   <Row>
     <Cell ss:StyleID="KPIKey"><Data ss:Type="String">Net Profit</Data></Cell>
     <Cell ss:StyleID="KPIVal"><Data ss:Type="Number">${analytics.financials.netProfit}</Data></Cell>
   </Row>
   <Row></Row>
   <Row><Cell ss:StyleID="KPIKey"><Data ss:Type="String">CORPORATE EFFICIENCY RATIOS</Data></Cell></Row>
   <Row>
     <Cell ss:StyleID="KPIKey"><Data ss:Type="String">Gross Profit Margin %</Data></Cell>
     <Cell ss:StyleID="KPIVal"><Data ss:Type="String">${analytics.financials.totalRevenue > 0 ? ((analytics.financials.grossProfit / analytics.financials.totalRevenue) * 100).toFixed(1) : '0'}%</Data></Cell>
   </Row>
   <Row>
     <Cell ss:StyleID="KPIKey"><Data ss:Type="String">Net Profit Margin %</Data></Cell>
     <Cell ss:StyleID="KPIVal"><Data ss:Type="String">${analytics.financials.totalRevenue > 0 ? ((analytics.financials.netProfit / analytics.financials.totalRevenue) * 100).toFixed(1) : '0'}%</Data></Cell>
   </Row>
   <Row>
     <Cell ss:StyleID="KPIKey"><Data ss:Type="String">Operating Expense Ratio (OER)</Data></Cell>
     <Cell ss:StyleID="KPIVal"><Data ss:Type="String">${analytics.financials.totalRevenue > 0 ? (((analytics.expenseBreakdown.salaries + analytics.expenseBreakdown.office + analytics.expenseBreakdown.marketing + analytics.expenseBreakdown.miscellaneous) / analytics.financials.totalRevenue) * 100).toFixed(1) : '0'}%</Data></Cell>
   </Row>
  </Table>
 </Worksheet>`;

    // Sheet 2: Expenditures Log
    let expSheet = `<Worksheet ss:Name="Operating Expenditures">
  <Table>
   <Row>
     <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Date</Data></Cell>
     <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Category</Data></Cell>
     <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Description</Data></Cell>
     <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Amount (INR)</Data></Cell>
   </Row>`;
    
    expenses.forEach(e => {
      expSheet += `<Row>
        <Cell><Data ss:Type="String">${e.date}</Data></Cell>
        <Cell><Data ss:Type="String">${e.category.toUpperCase()}</Data></Cell>
        <Cell><Data ss:Type="String">${e.description || 'Custom Expense'}</Data></Cell>
        <Cell><Data ss:Type="Number">${e.amount}</Data></Cell>
      </Row>`;
    });
    
    (analytics.rawSalaryPayouts || []).forEach((sr: any) => {
      expSheet += `<Row>
        <Cell><Data ss:Type="String">${sr.processedAt ? new Date(sr.processedAt).toISOString().split('T')[0] : 'N/A'}</Data></Cell>
        <Cell><Data ss:Type="String">SALARY PAYOUT</Data></Cell>
        <Cell><Data ss:Type="String">Approved salary payout for ${sr.workerId?.name || 'Worker'} (${sr.month})</Data></Cell>
        <Cell><Data ss:Type="Number">${sr.amount}</Data></Cell>
      </Row>`;
    });

    (analytics.rawTravelLogs || []).forEach((tl: any) => {
      expSheet += `<Row>
        <Cell><Data ss:Type="String">${tl.date}</Data></Cell>
        <Cell><Data ss:Type="String">FUEL ALLOWANCE</Data></Cell>
        <Cell><Data ss:Type="String">Commute allowance for ${tl.workerId?.name || 'Worker'} (${tl.kms} kms)</Data></Cell>
        <Cell><Data ss:Type="Number">${tl.allowance}</Data></Cell>
      </Row>`;
    });

    expSheet += `</Table></Worksheet>`;

    // Sheet 3: Scheduled Cleans
    let jobsSheet = `<Worksheet ss:Name="Clean Bookings">
  <Table>
   <Row>
     <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Date</Data></Cell>
     <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Client</Data></Cell>
     <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Clean Title</Data></Cell>
     <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Worker Assigned</Data></Cell>
     <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Status</Data></Cell>
     <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Payment Status</Data></Cell>
     <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Price (INR)</Data></Cell>
   </Row>`;

    jobs.forEach(j => {
      jobsSheet += `<Row>
        <Cell><Data ss:Type="String">${j.date}</Data></Cell>
        <Cell><Data ss:Type="String">${j.clientName || 'N/A'}</Data></Cell>
        <Cell><Data ss:Type="String">${j.title}</Data></Cell>
        <Cell><Data ss:Type="String">${(j.workerId as any)?.name || 'Unassigned'}</Data></Cell>
        <Cell><Data ss:Type="String">${j.status}</Data></Cell>
        <Cell><Data ss:Type="String">${j.paymentStatus || 'received'}</Data></Cell>
        <Cell><Data ss:Type="Number">${j.price}</Data></Cell>
      </Row>`;
    });

    jobsSheet += `</Table></Worksheet>`;

    const xmlFooter = `</Workbook>`;
    const finalXml = xmlHeader + execSheet + expSheet + jobsSheet + xmlFooter;
    
    const blob = new Blob([finalXml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ShineStaff_Corporate_Performance_Report_${startDate}_to_${endDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Process data for charts
  const getExpenseChartData = () => {
    if (!analytics) return [];
    const breakdown = analytics.expenseBreakdown;
    return [
      { name: 'Salaries', value: breakdown.salaries },
      { name: 'Fuel', value: breakdown.fuel },
      { name: 'Materials', value: breakdown.material },
      { name: 'Equipment', value: breakdown.equipment },
      { name: 'Marketing', value: breakdown.marketing },
      { name: 'Office', value: breakdown.office },
      { name: 'Supplies/Inventory', value: breakdown.inventory || 0 },
      { name: 'Misc', value: breakdown.miscellaneous }
    ].filter(item => item.value > 0);
  };

  const getCancellationReasonsData = () => {
    if (!analytics) return [];
    return Object.entries(analytics.jobAnalytics.cancellationReasons).map(([name, value]) => ({
      name,
      value: value as number
    })).filter(item => item.value > 0);
  };

  const getProfitTrendData = () => {
    if (!analytics) return [];
    const totalExp = analytics.financials.totalExpenses;
    const totalRev = analytics.financials.totalRevenue;
    return [
      { date: startDate, revenue: Math.round(totalRev * 0.2), expense: Math.round(totalExp * 0.25), profit: Math.round(totalRev * 0.2 - totalExp * 0.25) },
      { date: 'Mid Period', revenue: Math.round(totalRev * 0.5), expense: Math.round(totalExp * 0.4), profit: Math.round(totalRev * 0.5 - totalExp * 0.4) },
      { date: endDate, revenue: totalRev, expense: totalExp, profit: analytics.financials.netProfit }
    ];
  };

  // Map Pins calculation
  const mapPins = workers
    .filter((w: any) => w.currentLocation?.lat && w.currentLocation?.lng)
    .map((w: any) => ({
      id: w._id,
      name: w.name,
      lat: w.currentLocation.lat,
      lng: w.currentLocation.lng,
      type: 'worker' as const,
      info: `Status: ${w.status || 'Active'} | Company: ${w.company}`
    }));

  return (
    <div className="space-y-6 text-left max-w-full print:p-0">
      
      {/* 1. Header Control Ribbon */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm print:hidden">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center space-x-2">
            <Activity className="h-5.5 w-5.5 text-secondary animate-pulse" />
            <span>BI Performance Intelligence Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Corporate business metrics, daily logs engine & multi-sheet exports</p>
        </div>

        {/* Date Filters Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-transparent outline-none cursor-pointer border-none"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last-7">Last 7 Days</option>
              <option value="last-30">Last 30 Days</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-quarter">This Quarter</option>
              <option value="this-year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
              }}
              className="text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-850 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-secondary dark:color-scheme-dark"
            />
            <span className="text-slate-400 text-xs font-bold">➔</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
              }}
              className="text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-850 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-secondary dark:color-scheme-dark"
            />
          </div>

          <button
            onClick={exportToExcel}
            className="flex items-center space-x-1.5 bg-success/10 hover:bg-success/15 text-success font-bold text-xs rounded-xl px-4 py-2.5 transition-colors cursor-pointer"
            title="Download multi-sheet corporate performance report in MS Excel"
          >
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Download Excel Report</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-secondary/10 hover:bg-secondary/15 text-secondary font-bold text-xs rounded-xl px-4 py-2.5 transition-colors cursor-pointer"
            title="Print PDF report"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden md:inline">Print PDF</span>
          </button>
        </div>
      </div>

      {loading && !analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-slate-200 dark:bg-slate-900 rounded-3xl" />
          ))}
          <div className="h-96 md:col-span-4 bg-slate-250 dark:bg-slate-900 rounded-3xl mt-4" />
        </div>
      ) : !analytics ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center space-y-3 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Unable to compile analytics</h3>
            <p className="text-xs text-slate-400 mt-1">Please check your date filters or check server logs.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          {/* 3. Segment Tabbed Views */}
          {!hideNavigation && (
            <div className="border-b border-slate-200 dark:border-slate-800 print:hidden">
              <nav className="flex space-x-4 overflow-x-auto pb-1" aria-label="Tabs">
                {[
                  { id: 'operations-desk', label: 'Daily Operations Desk ✍️', icon: ClipboardList },
                  { id: 'operations', label: 'Operations & Target Planning', icon: CheckCircle2 },
                  { id: 'workers', label: 'Worker Performance & Attendance', icon: Award },
                  { id: 'goals', label: 'Projections & AI recommendations', icon: Zap },
                  { id: 'expenses', label: 'Manage Expenditures', icon: Plus },
                  { id: 'payment-tracker', label: 'Invoice & Payments status', icon: CreditCard },
                  { id: 'settings', label: 'Company Settings', icon: SettingsIcon }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-1.5 border-b-2 py-2 px-3 text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap cursor-pointer ${
                        activeTab === tab.id
                          ? 'border-secondary text-secondary'
                          : 'border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {/* 4. Tab Contents */}

          {/* Tab 4.2: Daily Operations Desk & Approvals Command Room */}
          {activeTab === 'operations-desk' && (
            <div className="space-y-6">
              
              <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 p-5 rounded-3xl border border-violet-200/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center space-x-1.5">
                    <Sparkles className="h-5 w-5 animate-pulse text-indigo-500" />
                    <span>Central Operations Command Room</span>
                  </h3>
                  <p className="text-xs text-slate-450 mt-1">Manage all daily data entries and approve worker salary, commute reimbursements, and leave requests in one central control board.</p>
                </div>
              </div>

              <div className="space-y-6">
                
                {/* 1. Pending Salary Advance/Payout requests */}
                <div className="glass-card p-6 overflow-hidden">
                  <h4 className="text-xs font-black uppercase text-indigo-500 tracking-wider mb-4 flex items-center space-x-1.5">
                    <UserCheck className="h-5 w-5" />
                    <span>Pending Salary Payout Requests ({pendingSalaryRequests.length})</span>
                  </h4>
                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-[11px] font-bold text-slate-650 dark:text-slate-350">
                      <thead className="bg-slate-100 dark:bg-slate-900 text-[9px] text-slate-450 uppercase tracking-widest">
                        <tr>
                          <th className="px-3 py-2">Worker</th>
                          <th className="px-3 py-2">Month</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pendingSalaryRequests.map((sr: any) => (
                          <tr key={sr._id} className="hover:bg-slate-55/50 dark:hover:bg-slate-900/30">
                            <td className="px-3 py-2.5">{sr.workerId?.name || 'Worker'}</td>
                            <td className="px-3 py-2.5">{sr.month}</td>
                            <td className="px-3 py-2.5 text-secondary font-black">₹{sr.amount}</td>
                            <td className="px-3 py-2.5 flex justify-center space-x-2">
                              <button 
                                onClick={() => handleProcessSalary(sr._id, 'approved')}
                                className="bg-success text-white font-extrabold text-[10px] px-2.5 py-1 rounded cursor-pointer hover:bg-emerald-600"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleProcessSalary(sr._id, 'rejected')}
                                className="bg-danger text-white font-extrabold text-[10px] px-2.5 py-1 rounded cursor-pointer hover:bg-red-650"
                              >
                                Reject
                              </button>
                            </td>
                          </tr>
                        ))}
                        {pendingSalaryRequests.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-6 text-slate-400 font-semibold">No pending salary requests.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Pending Leaves requests */}
                <div className="glass-card p-6 overflow-hidden">
                  <h4 className="text-xs font-black uppercase text-indigo-500 tracking-wider mb-4 flex items-center space-x-1.5">
                    <Plane className="h-5 w-5" />
                    <span>Pending Leave Request Forms ({pendingLeaves.length})</span>
                  </h4>
                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-[11px] font-bold text-slate-650 dark:text-slate-350">
                      <thead className="bg-slate-100 dark:bg-slate-900 text-[9px] text-slate-450 uppercase tracking-widest">
                        <tr>
                          <th className="px-3 py-2">Worker</th>
                          <th className="px-3 py-2">Date Range</th>
                          <th className="px-3 py-2">Reason</th>
                          <th className="px-3 py-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pendingLeaves.map((l: any) => (
                          <tr key={l._id} className="hover:bg-slate-55/50 dark:hover:bg-slate-900/30">
                            <td className="px-3 py-2.5">{l.workerId?.name || 'Worker'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">{l.startDate} to {l.endDate}</td>
                            <td className="px-3 py-2.5 truncate max-w-[120px]">{l.reason}</td>
                            <td className="px-3 py-2.5 flex justify-center space-x-2">
                              <button 
                                onClick={() => handleProcessLeave(l._id, 'approved')}
                                className="bg-success text-white font-extrabold text-[10px] px-2.5 py-1 rounded cursor-pointer hover:bg-emerald-600"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleProcessLeave(l._id, 'rejected')}
                                className="bg-danger text-white font-extrabold text-[10px] px-2.5 py-1 rounded cursor-pointer hover:bg-red-650"
                              >
                                Reject
                              </button>
                            </td>
                          </tr>
                        ))}
                        {pendingLeaves.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-6 text-slate-400 font-semibold">No pending leaves.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Pending Fuel commute Travel log approvals */}
                <div className="glass-card p-6 lg:col-span-2 overflow-hidden">
                  <h4 className="text-xs font-black uppercase text-indigo-500 tracking-wider mb-4 flex items-center space-x-1.5">
                    <Flame className="h-5 w-5" />
                    <span>Pending Commute Travel Logs Claims ({pendingTravelLogs.length})</span>
                  </h4>
                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-[11px] font-bold text-slate-655 dark:text-slate-350">
                      <thead className="bg-slate-100 dark:bg-slate-900 text-[9px] text-slate-450 uppercase tracking-widest">
                        <tr>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Worker</th>
                          <th className="px-4 py-2">Route Commute</th>
                          <th className="px-4 py-2">KMs Travelled</th>
                          <th className="px-4 py-2">Calculated Allowance</th>
                          <th className="px-4 py-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pendingTravelLogs.map((tl: any) => (
                          <tr key={tl._id} className="hover:bg-slate-55/50 dark:hover:bg-slate-900/30">
                            <td className="px-4 py-2.5">{tl.date}</td>
                            <td className="px-4 py-2.5">{(tl.workerId as any)?.name || 'Worker'}</td>
                            <td className="px-4 py-2.5">{tl.fromLocation} ➔ {tl.toLocation}</td>
                            <td className="px-4 py-2.5">{tl.kms} Kms</td>
                            <td className="px-4 py-2.5 font-black text-rose-500">₹{tl.allowance}</td>
                            <td className="px-4 py-2.5 text-center">
                              <button 
                                onClick={() => handleProcessTravel(tl._id)}
                                className="bg-indigo-600 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl cursor-pointer hover:bg-indigo-700 shadow"
                              >
                                Approve Allowance
                              </button>
                            </td>
                          </tr>
                        ))}
                        {pendingTravelLogs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-slate-400 font-semibold">No pending travel allowances claim request logs.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Tab 4.4: Operations and Performance */}
          {activeTab === 'operations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Job completions and rates */}
              <div className="glass-card p-6">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-4">Job Status Funnel</h3>
                <div className="space-y-4 text-xs font-bold">
                  <div>
                    <div className="flex justify-between mb-1 text-slate-600 dark:text-slate-300">
                      <span>Completed ({analytics.jobAnalytics.completedJobs})</span>
                      <span>{analytics.jobAnalytics.completionRate}% Rate</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${analytics.jobAnalytics.completionRate}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-slate-600 dark:text-slate-300">
                      <span>Pending ({analytics.jobAnalytics.pendingJobs})</span>
                      <span>{analytics.jobAnalytics.totalJobsAssigned > 0 ? Math.round((analytics.jobAnalytics.pendingJobs / analytics.jobAnalytics.totalJobsAssigned) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${analytics.jobAnalytics.totalJobsAssigned > 0 ? (analytics.jobAnalytics.pendingJobs / analytics.jobAnalytics.totalJobsAssigned) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-slate-600 dark:text-slate-300">
                      <span>Cancelled ({analytics.jobAnalytics.cancelledJobs})</span>
                      <span>{analytics.jobAnalytics.totalJobsAssigned > 0 ? Math.round((analytics.jobAnalytics.cancelledJobs / analytics.jobAnalytics.totalJobsAssigned) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-2.5 rounded-full" style={{ width: `${analytics.jobAnalytics.totalJobsAssigned > 0 ? (analytics.jobAnalytics.cancelledJobs / analytics.jobAnalytics.totalJobsAssigned) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-455 space-y-2">
                    <div className="flex justify-between">
                      <span>Average Job Completion Time:</span>
                      <span className="font-extrabold text-slate-750 dark:text-slate-200">{analytics.jobAnalytics.averageCompletionTimeHours} Hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active In-Progress Cleans:</span>
                      <span className="font-extrabold text-slate-750 dark:text-slate-200">{analytics.jobAnalytics.inProgressJobs} Crew</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Jobs Processed:</span>
                      <span className="font-extrabold text-slate-750 dark:text-slate-200">{analytics.jobAnalytics.totalJobsAssigned} Cleans</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason Chart */}
              <div className="glass-card p-6 lg:col-span-2">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-4">Incomplete/Cancelled Job Causes</h3>
                {getCancellationReasonsData().length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500/60 mb-2" />
                    <span className="text-xs font-bold">No cancellations logged in this period</span>
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getCancellationReasonsData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.2} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                        <YAxis stroke="#94a3b8" fontSize={9} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                        <Bar dataKey="value" name="Jobs Cancelled" fill="#ef4444" radius={[8, 8, 0, 0]}>
                          {getCancellationReasonsData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Tab 4.5: Worker Performance Table & Attendance Check-ins */}
          {activeTab === 'workers' && (
            <div className="space-y-6">
              
              {/* Leaderboard rankings */}
              <div className="glass-card p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Worker Performance Productivity Rankings</h3>
                  <span className="text-[10px] font-bold text-slate-400 font-sans">Based on completions, ratings & attendance rates</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left text-xs font-bold text-slate-655 dark:text-slate-350">
                    <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Worker Name</th>
                        <th className="px-4 py-3">Assigned / Completed</th>
                        <th className="px-4 py-3">Rating</th>
                        <th className="px-4 py-3">Attendance %</th>
                        <th className="px-4 py-3">On-Time %</th>
                        <th className="px-4 py-3">Revenues Generated</th>
                        <th className="px-4 py-3">Productivity Score</th>
                        <th className="px-4 py-3">Rank Designation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {analytics.workerPerformance.map((w: any) => (
                        <tr key={w._id} className="hover:bg-slate-55/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center space-x-2.5">
                              <img
                                src={w.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${w.name}`}
                                alt={w.name}
                                className="h-6 w-6 rounded-full object-cover border border-violet-500 shadow-sm"
                              />
                              <div>
                                <span className="block text-slate-800 dark:text-white font-extrabold">{w.name}</span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-wider">{w.company}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span>{w.assignedJobs} Assigned / <strong className="text-emerald-500">{w.completedJobs} Done</strong></span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center space-x-1">
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              <span>{w.avgRating} / 5</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">{w.attendanceRate}%</td>
                          <td className="px-4 py-3.5">{w.onTimeRate}%</td>
                          <td className="px-4 py-3.5">₹{(w.revenueGenerated || 0).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-855 dark:text-slate-100">{w.productivityScore}%</span>
                              <div className="w-14 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${w.productivityScore}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                              w.rank === 'Top Performer' 
                                ? 'bg-success/15 text-success' 
                                : w.rank === 'Needs Improvement' 
                                ? 'bg-danger/15 text-danger' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-450'
                            }`}>
                              {w.rank}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily check-in log details */}
              <div className="glass-card p-6 overflow-hidden">
                <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest mb-4">Daily Attendance Check-Ins Tracker</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350">
                    <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Worker Name</th>
                        <th className="px-4 py-3">Check-In Time</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Overtime Logged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {todayAttendance.map((att: any) => (
                        <tr key={att._id} className="hover:bg-slate-55/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3 font-extrabold">{att.workerId?.name || 'Worker'}</td>
                          <td className="px-4 py-3">{att.checkInTime || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              att.status === 'present' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                            }`}>
                              {att.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{att.overtimeMinutes || 0} mins</td>
                        </tr>
                      ))}
                      {todayAttendance.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-slate-400">No worker checked-in yet today.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Tab 4.6: Targets & forecasting */}
          {activeTab === 'goals' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Annual Goal progress gauge */}
              <div className="glass-card p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-405 uppercase tracking-widest mb-2">Annual Revenue Goal Status</h3>
                  <p className="text-[10px] text-slate-400">Target goal: ₹2 Crore (₹2,00,00,000)</p>
                </div>
                
                <div className="my-6 space-y-2">
                  <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-200">
                    <span>Progress: ₹{analytics.annualGoals.currentAnnualRevenue.toLocaleString('en-IN')}</span>
                    <span>{Math.round((analytics.annualGoals.currentAnnualRevenue / analytics.annualGoals.annualGoal) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-855 h-3.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-secondary to-blue-500 h-3.5 rounded-full" style={{ width: `${Math.min(100, Math.round((analytics.annualGoals.currentAnnualRevenue / analytics.annualGoals.annualGoal) * 100))}%` }} />
                  </div>
                </div>

                <div className="text-[10.5px] font-bold text-slate-655 dark:text-slate-350 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="flex justify-between">
                    <span>Remaining Needed:</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">₹{analytics.annualGoals.remainingAnnualRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Required Per Month:</span>
                    <span className="font-extrabold text-secondary">₹{analytics.annualGoals.requiredRevenuePerMonth.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Required Per Day:</span>
                    <span className="font-extrabold text-slate-755 dark:text-slate-200">₹{analytics.annualGoals.requiredRevenuePerDay.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Required Job Count Per Month:</span>
                    <span className="font-extrabold text-amber-500">{analytics.annualGoals.requiredJobsPerMonth} Jobs</span>
                  </div>
                </div>
              </div>

              {/* Targets, projections and Forecast */}
              <div className="glass-card p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest mb-2">Future Revenue Forecasts</h3>
                  <p className="text-[10px] text-slate-450">Projected metrics based on daily averages</p>
                </div>

                <div className="my-4 space-y-3.5 text-xs font-bold">
                  <div className="flex justify-between items-center bg-slate-50/70 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Next Month Forecast</span>
                      <strong className="block text-sm text-slate-800 dark:text-white mt-0.5">₹{analytics.forecasts.nextMonthRevenueForecast.toLocaleString('en-IN')}</strong>
                    </div>
                    <span className="text-[10px] bg-secondary/10 text-secondary px-2.5 py-1 rounded-full font-black">92% Conf.</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50/70 dark:bg-slate-955/60 p-3 rounded-xl border border-slate-100 dark:border-slate-855">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Next Quarter Forecast</span>
                      <strong className="block text-sm text-slate-800 dark:text-white mt-0.5">₹{analytics.forecasts.nextQuarterRevenueForecast.toLocaleString('en-IN')}</strong>
                    </div>
                    <span className="text-[10px] bg-secondary/10 text-secondary px-2.5 py-1 rounded-full font-black">85% Conf.</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50/70 dark:bg-slate-955/60 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Suggested Targets Next Month</span>
                      <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-555 dark:text-slate-350">
                        <span>Jobs: <strong className="text-secondary font-black">{analytics.forecasts.suggestedNextMonthJobsTarget}</strong></span>
                        <span>Revenue: <strong className="text-emerald-500 font-black">₹{analytics.forecasts.suggestedNextMonthRevenueTarget.toLocaleString('en-IN')}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Business suggestions */}
              <div className="glass-card p-6 bg-gradient-to-br from-indigo-50/20 to-violet-50/20 dark:from-indigo-950/10 dark:to-violet-950/10 border-l-4 border-l-violet-500 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest flex items-center space-x-1.5 mb-2">
                    <Sparkles className="h-4.5 w-4.5 text-violet-500 animate-pulse" />
                    <span>AI Strategic Business Advice</span>
                  </h3>
                  <p className="text-[10px] text-slate-455">Auto-generated recommendations from historic numbers</p>
                </div>

                <div className="my-4 space-y-3 flex-1 overflow-y-auto">
                  {analytics.aiSuggestions.map((s: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2 text-[11px] leading-relaxed text-slate-655 dark:text-slate-300">
                      <div className="rounded-full bg-violet-100 dark:bg-violet-955/50 p-1 text-violet-500 mt-0.5">
                        <Zap className="h-3 w-3" />
                      </div>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Tab 4.7: Manage Expenditures */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              
              {/* Form card */}
              <div className="glass-card p-6 h-fit">
                <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest mb-4">
                  {editingExpenseId ? 'Edit Business Expense ✏️' : 'Log Business Expense'}
                </h3>
                <form onSubmit={handleAddExpense} className="space-y-4 text-xs font-bold text-slate-655 dark:text-slate-300">
                  <div>
                    <label className="block mb-1.5 uppercase tracking-wider text-[9px] text-slate-400">Expense Category:</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value as any)}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary"
                    >
                      <option value="inventory">Inventory & Supplies 📦</option>
                      <option value="material">Materials & Supplies</option>
                      <option value="equipment">Equipment & Assets</option>
                      <option value="marketing">Marketing & Ads</option>
                      <option value="office">Office Rent & Utilities</option>
                      <option value="miscellaneous">Miscellaneous Expenses</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 uppercase tracking-wider text-[9px] text-slate-405">Expense Amount (INR):</label>
                    <input
                      type="number"
                      required
                      placeholder="Enter amount (e.g. 5000)"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 uppercase tracking-wider text-[9px] text-slate-405">Expense Date:</label>
                    <input
                      type="date"
                      required
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary dark:color-scheme-dark"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 uppercase tracking-wider text-[9px] text-slate-405">Description / Notes:</label>
                    <textarea
                      placeholder="Enter notes (e.g. Sofa Cleaning Liquids Purchase)"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 h-20 outline-none focus:border-secondary resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <button
                      type="submit"
                      className="w-full bg-secondary hover:bg-secondary-dark text-white font-extrabold p-3 rounded-xl transition-all mt-2 cursor-pointer flex items-center justify-center space-x-1.5 shadow-md"
                    >
                      {editingExpenseId ? <Check className="h-4.5 w-4.5" /> : <Plus className="h-4.5 w-4.5" />}
                      <span>{editingExpenseId ? 'Update Expense Log' : 'Record Expense Log'}</span>
                    </button>
                    {editingExpenseId && (
                      <button
                        type="button"
                        onClick={handleCancelEditExpense}
                        className="w-full bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold p-2.5 rounded-xl transition-all cursor-pointer text-center text-xs"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Expenses list logs */}
              <div className="glass-card p-6 overflow-hidden">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest mb-4">Recorded Custom Expenditures</h3>
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350">
                      <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-450">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {expenses.map((exp: any) => (
                          <tr key={exp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <td className="px-4 py-3">{exp.date}</td>
                            <td className="px-4 py-3">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase font-black text-slate-500">
                                {exp.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 truncate max-w-[180px]">{exp.description || '-'}</td>
                            <td className="px-4 py-3 text-right font-black text-rose-500">₹{exp.amount.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3 text-center flex justify-center items-center space-x-1">
                              <button
                                onClick={() => handleStartEditExpense(exp)}
                                className="text-secondary hover:text-indigo-650 p-1.5 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer"
                                title="Edit expense"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp._id)}
                                className="text-danger hover:text-red-655 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-955/20 cursor-pointer"
                                title="Delete expense"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {expenses.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-6 text-slate-400">No expenses recorded for this period.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Tab 4.8: Invoice & Payment status tracker */}
          {activeTab === 'payment-tracker' && (
            <div className="glass-card p-6 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Invoices & Job Payments Status Manager</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Change payment tracking for finished cleans and submit worker ratings</p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350">
                  <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-450">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Clean Title</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Rating</th>
                      <th className="px-4 py-3 text-center">Payment Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {jobs.filter(j => j.status === 'completed').map((job: any) => (
                      <tr key={job._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="px-4 py-3 whitespace-nowrap">{job.date}</td>
                        <td className="px-4 py-3">
                          <span className="block text-slate-800 dark:text-white">{job.clientName}</span>
                          <span className="text-[9.5px] text-slate-400">{job.clientPhone}</span>
                        </td>
                        <td className="px-4 py-3 truncate max-w-[200px]">
                          <span className="block">{job.title}</span>
                          <span className="text-[9px] text-secondary tracking-wide uppercase font-black">{job.company}</span>
                        </td>
                        <td className="px-4 py-3 font-black text-slate-800 dark:text-white">₹{(job.price || 0).toLocaleString('en-IN')}</td>
                        
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => handleUpdateJobRating(job._id, star)}
                                className="p-0.5 focus:outline-none cursor-pointer"
                              >
                                <Star className={`h-4 w-4 ${star <= (job.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-250 dark:text-slate-700'}`} />
                              </button>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <select
                            value={job.paymentStatus || 'received'}
                            onChange={(e) => handleUpdatePaymentStatus(job._id, e.target.value as any)}
                            className={`text-[10px] font-black uppercase tracking-wider rounded-lg px-2.5 py-1.5 border outline-none cursor-pointer ${
                              (job.paymentStatus || 'received') === 'received'
                                ? 'bg-success/10 border-success/35 text-success'
                                : (job.paymentStatus || 'received') === 'outstanding'
                                ? 'bg-danger/10 border-danger/35 text-danger'
                                : 'bg-amber-500/10 border-amber-500/35 text-amber-500'
                            }`}
                          >
                            <option value="received">Paid (Received)</option>
                            <option value="pending">Awaiting (Pending)</option>
                            <option value="outstanding">Overdue (Outstanding)</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleDownloadInvoice(job)}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30 rounded-lg font-bold text-[10px] uppercase shadow-sm transition-all cursor-pointer inline-flex items-center space-x-1"
                              title="Download Invoice"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download</span>
                            </button>
                            <button
                              onClick={() => handleShareInvoice(job)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 rounded-lg font-bold text-[10px] uppercase shadow-sm transition-all cursor-pointer inline-flex items-center space-x-1"
                              title="Share Invoice PDF"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              <span>Share</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {jobs.filter(j => j.status === 'completed').length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">No completed jobs to track payments for.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}



          {/* Tab 4.10: Global Settings configuration */}
          {activeTab === 'settings' && (
            <div className="glass-card p-6 max-w-xl">
              <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest mb-4">ShineStaff Global Configuration Settings</h3>
              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-bold text-slate-650 dark:text-slate-300">
                <div>
                  <label className="block mb-1.5 uppercase tracking-wider text-[9px] text-slate-400">Fuel Allowance Commute Rate (INR per KM):</label>
                  <input
                    type="number"
                    required
                    value={globalSettings.fuelAllowanceRate || 5}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, fuelAllowanceRate: Number(e.target.value) })}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 uppercase tracking-wider text-[9px] text-slate-400">Monthly Targets Revenue Goal (INR):</label>
                  <input
                    type="number"
                    required
                    value={globalSettings.monthlyTargetRevenue || 1000000}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, monthlyTargetRevenue: Number(e.target.value) })}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 uppercase tracking-wider text-[9px] text-slate-400">Daily Attendance Base Salary Rate (INR):</label>
                  <input
                    type="number"
                    required
                    value={globalSettings.dailyBaseRate || 400}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, dailyBaseRate: Number(e.target.value) })}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-secondary hover:bg-secondary-dark text-white font-extrabold p-3 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Save configurations</span>
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {/* Drill-down Analytics Modal */}
      {drillDown && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md">
          <div className="glass-card w-full max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-3xl border border-slate-205 dark:border-slate-800 shadow-2xl overflow-hidden bg-white/95 dark:bg-slate-900/95">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white uppercase tracking-wider">{drillDown.title}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Drill-down records list for {startDate} to {endDate}</p>
              </div>
              <button
                onClick={() => setDrillDown(null)}
                className="rounded-full p-1.5 text-slate-455 hover:bg-slate-100 dark:hover:bg-slate-850 text-xs font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Table */}
            <div className="flex-1 overflow-y-auto my-4 pr-1">
              <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350">
                <thead className="bg-slate-100 dark:bg-slate-900 uppercase tracking-widest text-[9px] text-slate-455 sticky top-0 z-10">
                  {drillDown.type === 'customers' ? (
                    <tr>
                      <th className="px-4 py-3">Client Name</th>
                      <th className="px-4 py-3">Client Phone</th>
                      <th className="px-4 py-3">Client Location</th>
                      <th className="px-4 py-3 text-center">Total Bookings Count</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  ) : drillDown.type === 'expenses' || drillDown.type === 'profit' || drillDown.type === 'gross' ? (
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Clean Title</th>
                      <th className="px-4 py-3">Assigned Worker</th>
                      <th className="px-4 py-3">Job Status</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {drillDown.data.map((item: any, idx: number) => {
                    if (drillDown.type === 'customers') {
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3 text-slate-855 dark:text-slate-100 font-extrabold">{item.name}</td>
                          <td className="px-4 py-3 text-mono">{item.phone}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-normal">{item.address || 'N/A'}</td>
                          <td className="px-4 py-3 text-center text-secondary font-black">{item.count} Bookings</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setEditingItem({
                                type: 'customer',
                                id: item.phone,
                                fields: {
                                  clientName: item.name,
                                  clientPhone: item.phone,
                                  address: item.address
                                }
                              })}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-550 dark:text-indigo-305 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                              title="Edit Client contact details across all bookings"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        </tr>
                      );
                    } else if (drillDown.type === 'expenses' || drillDown.type === 'profit' || drillDown.type === 'gross') {
                      const isRev = item.category?.includes('REVENUE');
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3 text-slate-450">{item.date || 'Period Metric'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                              isRev 
                                ? 'bg-success/15 text-success' 
                                : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{item.desc}</td>
                          <td className={`px-4 py-3 text-right font-black ${
                            isRev ? 'text-success' : 'text-danger'
                          }`}>
                            {isRev ? '+' : '-'}₹{(item.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.type ? (
                              <button
                                onClick={() => setEditingItem({
                                  type: item.type,
                                  id: item.id,
                                  fields: item.type === 'custom_expense'
                                    ? { category: item.raw.category, description: item.raw.description, amount: item.raw.amount, date: item.raw.date }
                                    : item.type === 'salary_request'
                                    ? { amount: item.raw.amount, month: item.raw.month, paymentMode: item.raw.paymentMode || 'Online' }
                                    : { kms: item.raw.kms, allowance: item.raw.allowance, date: item.raw.date }
                                })}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-550 dark:text-indigo-305 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                title="Edit Expense item details"
                              >
                                ✏️ Edit
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-normal">System Metric</span>
                            )}
                          </td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3 whitespace-nowrap">{item.date}</td>
                          <td className="px-4 py-3">
                            <span className="block text-slate-800 dark:text-white font-extrabold">{item.clientName}</span>
                            <span className="text-[10px] text-slate-400">{item.clientPhone}</span>
                          </td>
                          <td className="px-4 py-3 truncate max-w-[150px]">{item.title}</td>
                          <td className="px-4 py-3">{(item.workerId as any)?.name || 'Unassigned'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              item.status === 'completed' 
                                ? 'bg-success/15 text-success' 
                                : item.status === 'cancelled' 
                                ? 'bg-danger/15 text-danger' 
                                : 'bg-amber-500/15 text-amber-500'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-max ${
                                item.paymentStatus === 'received' 
                                  ? 'bg-success/15 text-success' 
                                  : item.paymentStatus === 'outstanding' 
                                  ? 'bg-danger/15 text-danger' 
                                  : 'bg-amber-500/15 text-amber-500'
                              }`}>
                                {item.paymentStatus || 'pending'}
                              </span>
                              {item.paymentMode && item.paymentMode !== 'not_selected' && (
                                <span className="text-[9px] text-slate-400 mt-0.5">
                                  {item.paymentMode === 'cash' ? 'Cash' : 'UPI/Online'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-800 dark:text-white">
                            ₹{(item.price || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setEditingItem({
                                type: 'job',
                                id: item._id,
                                fields: {
                                  title: item.title,
                                  clientName: item.clientName,
                                  clientPhone: item.clientPhone,
                                  price: item.price,
                                  status: item.status,
                                  date: item.date,
                                  paymentStatus: item.paymentStatus || 'pending',
                                  paymentMode: item.paymentMode || 'not_selected'
                                }
                              })}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-550 dark:text-indigo-305 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                              title="Edit clean job details"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  })}
                  {drillDown.data.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">No records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-black">
              <span className="text-slate-400 uppercase tracking-widest text-[9px]">Total Items: {drillDown.data.length}</span>
              <span className="text-sm font-black text-slate-800 dark:text-white">
                {drillDown.type === 'customers' 
                  ? `${drillDown.data.reduce((acc, curr) => acc + curr.count, 0)} Total Clean Bookings`
                  : drillDown.type === 'profit'
                  ? `Net Calculation: ₹${analytics.financials.netProfit.toLocaleString('en-IN')}`
                  : drillDown.type === 'gross'
                  ? `Gross Calculation: ₹${analytics.financials.grossProfit.toLocaleString('en-IN')}`
                  : `Sum Total: ₹${(
                      drillDown.data.reduce((acc, curr) => acc + (curr.price || curr.amount || 0), 0)
                    ).toLocaleString('en-IN')}`
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="glass-card w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-205 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs font-bold text-slate-700 dark:text-slate-200">
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-extrabold text-sm uppercase text-secondary">Edit BI Record</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Editing {editingItem.type.replace('_', ' ')} record</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-black"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditItemSubmit} className="space-y-4">
              {editingItem.type === 'job' && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Clean Title</label>
                    <input
                      type="text"
                      required
                      value={editingItem.fields.title || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, title: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-950/50 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Client Name</label>
                      <input
                        type="text"
                        required
                        value={editingItem.fields.clientName || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, clientName: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-950/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Client Phone</label>
                      <input
                        type="text"
                        required
                        value={editingItem.fields.clientPhone || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, clientPhone: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Price (₹)</label>
                      <input
                        type="number"
                        required
                        value={editingItem.fields.price || 0}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, price: Number(e.target.value) }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Clean Date</label>
                      <input
                        type="date"
                        required
                        value={editingItem.fields.date || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, date: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Job Status</label>
                      <select
                        value={editingItem.fields.status || 'pending'}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, status: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="started">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Payment Status</label>
                      <select
                        value={editingItem.fields.paymentStatus || 'pending'}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, paymentStatus: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="received">Received / Paid</option>
                        <option value="outstanding">Outstanding</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Payment Method</label>
                      <select
                        value={editingItem.fields.paymentMode || 'not_selected'}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, paymentMode: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none text-slate-700 dark:text-white font-bold"
                      >
                        <option value="not_selected">Not Selected</option>
                        <option value="cash">💵 Cash</option>
                        <option value="upi_online">📱 UPI / Online</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {editingItem.type === 'custom_expense' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Category</label>
                      <select
                        value={editingItem.fields.category || 'material'}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, category: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                      >
                        <option value="salaries">Salaries</option>
                        <option value="fuel">Fuel & Travel</option>
                        <option value="material">Materials</option>
                        <option value="equipment">Equipment</option>
                        <option value="marketing">Marketing</option>
                        <option value="office">Office/Admin</option>
                        <option value="inventory">Inventory</option>
                        <option value="miscellaneous">Miscellaneous</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Expense Date</label>
                      <input
                        type="date"
                        required
                        value={editingItem.fields.date || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, date: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={editingItem.fields.amount || 0}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, amount: Number(e.target.value) }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Description</label>
                    <input
                      type="text"
                      required
                      value={editingItem.fields.description || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, description: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'salary_request' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        required
                        value={editingItem.fields.amount || 0}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, amount: Number(e.target.value) }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Billing Month</label>
                      <input
                        type="text"
                        required
                        placeholder="YYYY-MM"
                        value={editingItem.fields.month || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, month: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Payment Mode</label>
                    <select
                      value={editingItem.fields.paymentMode || 'Online'}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, paymentMode: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                    >
                      <option value="Online">Online Transfer</option>
                      <option value="Cash">Cash Payout</option>
                    </select>
                  </div>
                </>
              )}

              {editingItem.type === 'travel_log' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Distance (KM)</label>
                      <input
                        type="number"
                        required
                        value={editingItem.fields.kms || 0}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, kms: Number(e.target.value) }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Allowance (₹)</label>
                      <input
                        type="number"
                        required
                        value={editingItem.fields.allowance || 0}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, allowance: Number(e.target.value) }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Log Date</label>
                    <input
                      type="date"
                      required
                      value={editingItem.fields.date || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, date: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'customer' && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Client Name</label>
                    <input
                      type="text"
                      required
                      value={editingItem.fields.clientName || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, clientName: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Client Phone</label>
                    <input
                      type="text"
                      required
                      value={editingItem.fields.clientPhone || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, clientPhone: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Client Address / Location</label>
                    <input
                      type="text"
                      required
                      value={editingItem.fields.address || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, address: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none"
                    />
                  </div>
                </>
              )}

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-white font-extrabold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer text-center"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 dark:text-slate-300 font-extrabold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBIDashboard;
