import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  MessageSquare,
  Calendar,
  Users,
  History,
  Settings,
  Plus,
  Search,
  Filter,
  Check,
  X,
  ChevronRight,
  Download,
  Send,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  User,
  DollarSign,
  MapPin,
  Mail,
  Phone,
  ArrowRight,
  Eye,
  Settings2,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';

const AdminWhatsAppEngagement: React.FC = () => {
  const { user } = useAuth();
  
  // Navigation Tabs: 'reminders' | 'marketing' | 'contacts' | 'history' | 'settings'
  const [activeTab, setActiveTab] = useState<string>('reminders');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Data States
  const [analytics, setAnalytics] = useState<any>(null);
  const [reminders, setReminders] = useState<any>({ today: [], overdue: [], upcoming: [], sent: [], failed: [], dueThisWeekCount: 0, dueThisMonthCount: 0 });
  const [customers, setCustomers] = useState<any[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterCompany, setFilterCompany] = useState('All');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterMinSpent, setFilterMinSpent] = useState('');
  const [filterInactiveDays, setFilterInactiveDays] = useState('');
  const [filterHasReminder, setFilterHasReminder] = useState('false');
  const [customerPage, setCustomerPage] = useState(1);

  // Marketing Campaign Form
  const [campaignName, setCampaignName] = useState('');
  const [campaignImageUrl, setCampaignImageUrl] = useState('');
  const [campaignMessage, setCampaignMessage] = useState(
    "Hi {{customer_name}},\n\nIt's been some time since your last {{service_name}} service. Book again today and get 15% off!\n\nUse Code: REPEAT15"
  );
  const [scheduleCampaign, setScheduleCampaign] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [targetFilterMode, setTargetFilterMode] = useState<'individual' | 'smart-filters'>('individual');
  const [offerText, setOfferText] = useState('15% OFF');

  // Interactive drawer/popup for customer profile details
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeProfileData, setActiveProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Settings form states
  const [defaultReminderDays, setDefaultReminderDays] = useState(30);
  const [serviceReminderDays, setServiceReminderDays] = useState<any[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDays, setNewServiceDays] = useState(30);
  const [reminderTemplate, setReminderTemplate] = useState('');
  const [useMockApi, setUseMockApi] = useState(true);

  // Fetch central data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, remindersRes, settingsRes, campaignsRes] = await Promise.all([
        api.get('/whatsapp/analytics'),
        api.get('/whatsapp/reminders'),
        api.get('/whatsapp/settings'),
        api.get('/whatsapp/campaigns')
      ]);

      setAnalytics(analyticsRes.data);
      setReminders(remindersRes.data);
      setSettings(settingsRes.data);
      setCampaigns(campaignsRes.data);

      if (settingsRes.data) {
        setDefaultReminderDays(settingsRes.data.defaultReminderDays);
        setServiceReminderDays(settingsRes.data.serviceReminderDays || []);
        setReminderTemplate(settingsRes.data.reminderMessageTemplate);
        setUseMockApi(settingsRes.data.useMockApi);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Customers list based on search/filters
  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterService) params.append('service', filterService);
      if (filterCompany !== 'All') params.append('company', filterCompany);
      if (filterLocation) params.append('location', filterLocation);
      if (filterMinSpent) params.append('minSpent', filterMinSpent);
      if (filterInactiveDays) params.append('inactiveDays', filterInactiveDays);
      if (filterHasReminder === 'true') params.append('hasReminder', 'true');
      params.append('page', String(customerPage));
      params.append('limit', '50');

      const res = await api.get(`/whatsapp/customers?${params.toString()}`);
      setCustomers(res.data.customers);
      setTotalCustomers(res.data.total);
    } catch (error) {
      console.error('Error fetching customers list:', error);
    }
  };

  // Fetch message log history
  const fetchHistory = async () => {
    try {
      const res = await api.get('/whatsapp/history?limit=100');
      setHistory(res.data.messages);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'contacts' || activeTab === 'marketing') {
      fetchCustomers();
    }
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, searchQuery, filterService, filterCompany, filterLocation, filterMinSpent, filterInactiveDays, filterHasReminder, customerPage]);

  // Real-time status update simulator check: Refresh logs and reminders stats every 10s
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeTab === 'history') {
        fetchHistory();
      }
      if (activeTab === 'reminders') {
        api.get('/whatsapp/reminders').then(res => setReminders(res.data));
      }
      api.get('/whatsapp/analytics').then(res => setAnalytics(res.data));
    }, 10000);

    return () => clearInterval(timer);
  }, [activeTab]);

  // Fetch Single Customer Profile Detail
  const fetchCustomerProfile = async (id: string) => {
    setProfileLoading(true);
    setActiveProfileId(id);
    try {
      const res = await api.get(`/whatsapp/customers/${id}`);
      setActiveProfileData(res.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Toggle Opt-Out marketing
  const handleToggleOptOut = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/whatsapp/customers/${id}/opt-out`, { marketingOptOut: !currentStatus });
      fetchCustomers();
      if (activeProfileId === id) {
        fetchCustomerProfile(id);
      }
    } catch (error) {
      console.error('Error updating opt-out:', error);
    }
  };

  // Send Manual Reminder
  const handleSendReminder = async (reminderId: string) => {
    setActionLoading(reminderId);
    try {
      await api.post(`/whatsapp/reminders/${reminderId}/send`);
      // Refresh
      const remindersRes = await api.get('/whatsapp/reminders');
      setReminders(remindersRes.data);
      const analyticsRes = await api.get('/whatsapp/analytics');
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error sending reminder:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Trigger manual startup sync backfill
  const handleTriggerBackfill = async () => {
    setActionLoading('backfill');
    try {
      await api.post('/whatsapp/settings/trigger-backfill');
      fetchData();
      if (activeTab === 'contacts') fetchCustomers();
    } catch (error) {
      console.error('Error trigger backfill:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Select / Unselect Customers
  const handleSelectCustomer = (id: string) => {
    if (selectedCustomerIds.includes(id)) {
      setSelectedCustomerIds(selectedCustomerIds.filter(cid => cid !== id));
    } else {
      setSelectedCustomerIds([...selectedCustomerIds, id]);
    }
  };

  const handleSelectAllCustomers = () => {
    if (selectedCustomerIds.length === customers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(customers.map(c => c._id));
    }
  };

  // Marketing Message dynamic preview builder
  const sampleCustomer = {
    name: 'Rahul Sharma',
    serviceTaken: 'Sofa Cleaning',
    lastServiceDate: '16 Aug 2026',
    company: 'SofaShine'
  };

  const campaignPreviewMessage = useMemo(() => {
    return campaignMessage
      .replace(/{{customer_name}}/g, sampleCustomer.name)
      .replace(/{{service_name}}/g, sampleCustomer.serviceTaken)
      .replace(/{{last_service_date}}/g, sampleCustomer.lastServiceDate)
      .replace(/{{company_name}}/g, sampleCustomer.company)
      .replace(/{{offer}}/g, offerText);
  }, [campaignMessage, offerText]);

  // Create Campaign (Launch or Schedule)
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName || !campaignMessage) return;

    setActionLoading('campaign');
    try {
      const payload: any = {
        name: campaignName,
        messageText: campaignMessage,
        imageUrl: campaignImageUrl || undefined,
        scheduleTime: scheduleCampaign && scheduleTime ? scheduleTime : undefined
      };

      if (targetFilterMode === 'individual') {
        payload.selectedIds = selectedCustomerIds;
      } else {
        payload.targetFilters = {
          serviceTaken: filterService,
          company: filterCompany,
          location: filterLocation,
          minSpent: filterMinSpent,
          inactiveDays: filterInactiveDays
        };
      }

      await api.post('/whatsapp/campaigns', payload);
      // Reset form
      setCampaignName('');
      setCampaignImageUrl('');
      setCampaignMessage("Hi {{customer_name}},\n\nBook {{service_name}} again today and get {{offer}}!");
      setSelectedCustomerIds([]);
      setScheduleCampaign(false);
      setScheduleTime('');

      // Refresh list
      const campaignsRes = await api.get('/whatsapp/campaigns');
      setCampaigns(campaignsRes.data);
      const analyticsRes = await api.get('/whatsapp/analytics');
      setAnalytics(analyticsRes.data);

      alert(scheduleCampaign ? 'Campaign scheduled successfully!' : 'Campaign sent successfully!');
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to execute campaign. Please check target customer selections.');
    } finally {
      setActionLoading(null);
    }
  };

  // Save Settings Changes
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('settings');
    try {
      await api.put('/whatsapp/settings', {
        defaultReminderDays,
        serviceReminderDays,
        reminderMessageTemplate: reminderTemplate,
        useMockApi
      });
      alert('Settings updated successfully!');
      fetchData();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Add Service Reminder Period Setting
  const handleAddServiceRule = () => {
    if (!newServiceName || !newServiceDays) return;
    const exists = serviceReminderDays.some(
      rule => rule.serviceName.toLowerCase() === newServiceName.toLowerCase()
    );
    if (exists) {
      alert('Rule already exists for this service.');
      return;
    }

    setServiceReminderDays([...serviceReminderDays, { serviceName: newServiceName, days: newServiceDays }]);
    setNewServiceName('');
    setNewServiceDays(30);
  };

  // Remove Service Reminder Period Setting
  const handleRemoveServiceRule = (index: number) => {
    setServiceReminderDays(serviceReminderDays.filter((_, idx) => idx !== index));
  };

  // CSV Export utility
  const handleExportCSV = (type: 'customers' | 'reminders' | 'history') => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = `whatsapp_${type}_report.csv`;

    if (type === 'customers') {
      headers = ['Customer Name', 'WhatsApp Number', 'Alternate Number', 'Email', 'Company', 'Service Taken', 'Last Service Date', 'Spent', 'Reminder Date', 'Reminder Status', 'Marketing Opt Out'];
      rows = customers.map(c => [
        `"${c.name}"`,
        `"${c.phone}"`,
        `"${c.alternatePhone || ''}"`,
        `"${c.email || ''}"`,
        `"${c.company}"`,
        `"${c.serviceTaken}"`,
        `"${c.lastServiceDate ? new Date(c.lastServiceDate).toLocaleDateString() : ''}"`,
        c.totalAmountSpent,
        `"${c.nextReminderDate ? new Date(c.nextReminderDate).toLocaleDateString() : ''}"`,
        `"${c.reminderStatus}"`,
        c.marketingOptOut ? 'Yes' : 'No'
      ]);
    } else if (type === 'reminders') {
      const allReminders = [...reminders.overdue, ...reminders.today, ...reminders.upcoming];
      headers = ['Recipient Name', 'WhatsApp Number', 'Service Name', 'Scheduled Date', 'Status'];
      rows = allReminders.map(r => [
        `"${r.customerId?.name || 'Unknown'}"`,
        `"${r.customerId?.phone || ''}"`,
        `"${r.serviceName}"`,
        `"${new Date(r.reminderDate).toLocaleDateString()}"`,
        `"${r.status}"`
      ]);
    } else {
      headers = ['Recipient Name', 'Phone Number', 'Message Type', 'Message Text', 'Sent Date', 'Status'];
      rows = history.map(h => [
        `"${h.recipientName}"`,
        `"${h.phoneNumber}"`,
        `"${h.messageType}"`,
        `"${h.messageText.replace(/"/g, '""')}"`,
        `"${new Date(h.sentTime).toLocaleString()}"`,
        `"${h.status}"`
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Check if role is admin
  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertTriangle className="h-16 w-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Access Denied</h2>
        <p className="text-sm text-slate-400 mt-2">Only system Administrators can access WhatsApp engagement settings and campaigns.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12 animate-fade-in relative">
      
      {/* Central Branding Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-205 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-emerald-500" />
            <span>WhatsApp & Customer Engagement</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Centralized customer-retention dashboard, service reminders and promotional marketing blasts.</p>
        </div>

        {/* Global actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleTriggerBackfill}
            disabled={actionLoading === 'backfill'}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm transition-all inline-flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <History className={`h-4 w-4 ${actionLoading === 'backfill' ? 'animate-spin' : ''}`} />
            <span>Sync Historical Jobs</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Row */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="glass-card p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Total Customers</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{analytics.totalCustomers}</span>
              <span className="text-[9px] text-emerald-500 font-extrabold flex items-center">
                <Users className="h-3 w-3 mr-0.5" /> WhatsApp OK
              </span>
            </div>
          </div>
          <div className="glass-card p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Reminders Sent</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{analytics.remindersSent}</span>
              <span className="text-[9px] text-emerald-500 font-bold">
                Fail: {analytics.remindersFailed}
              </span>
            </div>
          </div>
          <div className="glass-card p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Marketing Blasts</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{analytics.marketingSent}</span>
              <span className="text-[9px] text-emerald-500 font-bold">
                {analytics.marketingDeliveryRate}% Deliv
              </span>
            </div>
          </div>
          <div className="glass-card p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Repeat Bookings</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{analytics.repeatBookings}</span>
              <span className="text-[9px] text-blue-500 font-extrabold flex items-center">
                <TrendingUp className="h-3 w-3 mr-0.5" /> Return
              </span>
            </div>
          </div>
          <div className="glass-card p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Repeat Revenue</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{analytics.revenueFromRepeat.toLocaleString()}</span>
            </div>
          </div>
          <div className="glass-card p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Retention & Conv.</span>
            <div className="flex flex-col mt-2">
              <span className="text-xs font-black text-slate-800 dark:text-white">Retention: {analytics.customerRetentionRate}%</span>
              <span className="text-[10px] font-bold text-emerald-500 mt-0.5">Reminder Conv: {analytics.conversionRate}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Sub-Navigation Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-1 flex justify-between items-center overflow-x-auto scrollbar-none">
        <nav className="flex space-x-2.5 pb-1">
          {[
            { id: 'reminders', label: 'Service Reminders', icon: Clock },
            { id: 'marketing', label: 'WhatsApp Marketing', icon: Send },
            { id: 'contacts', label: 'Customer Contacts', icon: Users },
            { id: 'history', label: 'Message History Log', icon: History },
            { id: 'settings', label: 'Module Settings', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 border-b-2 py-2 px-3 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Tab Workspace Contents */}
      {loading ? (
        <div className="text-center py-16">
          <div className="h-8 w-8 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading module workspace...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: SERVICE REMINDERS */}
          {activeTab === 'reminders' && (
            <div className="space-y-6">
              
              {/* Reminders Dashboard summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-4 border-l-4 border-rose-500 bg-rose-50/10 dark:bg-rose-950/5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Overdue Reminders</span>
                  <span className="text-xl font-black text-rose-500 block mt-1">{reminders.overdue.length}</span>
                </div>
                <div className="glass-card p-4 border-l-4 border-amber-500 bg-amber-50/10 dark:bg-amber-950/5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Due Today</span>
                  <span className="text-xl font-black text-amber-500 block mt-1">{reminders.today.length}</span>
                </div>
                <div className="glass-card p-4 border-l-4 border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Upcoming Reminders</span>
                  <span className="text-xl font-black text-emerald-500 block mt-1">{reminders.upcoming.length}</span>
                </div>
                <div className="glass-card p-4 border-l-4 border-blue-500 bg-blue-50/10 dark:bg-blue-950/5 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">This Week / Month</span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-205 mt-1 block">
                      Week: {reminders.dueThisWeekCount} | Month: {reminders.dueThisMonthCount}
                    </span>
                  </div>
                  <button
                    onClick={() => handleExportCSV('reminders')}
                    className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-sm"
                    title="Export Reminders to CSV"
                  >
                    <Download className="h-4.5 w-4.5 text-blue-500" />
                  </button>
                </div>
              </div>

              {/* Reminders Lists (Split: Overdue/Today vs Upcoming) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Today's and Overdue lists */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Today's Reminders Card */}
                  <div className="glass-card p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-150/40 dark:border-slate-800 pb-3">
                      <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest flex items-center space-x-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span>🔔 Today's Service Reminders</span>
                      </h3>
                      <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold">
                        {reminders.today.length} pending
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reminders.today.map((r: any) => (
                        <div key={r._id} className="py-3 flex justify-between items-center gap-4">
                          <div className="min-w-0">
                            <span className="block text-xs font-extrabold text-slate-800 dark:text-white hover:underline cursor-pointer" onClick={() => fetchCustomerProfile(r.customerId?._id)}>
                              {r.customerId?.name || 'Unknown Client'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {r.serviceName} | Last Cleaned: {r.customerId?.lastServiceDate ? new Date(r.customerId.lastServiceDate).toLocaleDateString() : 'N/A'}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-500 block mt-0.5">
                              WhatsApp: {r.customerId?.phone}
                            </span>
                          </div>
                          <button
                            onClick={() => handleSendReminder(r._id)}
                            disabled={actionLoading === r._id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-extrabold shadow-sm transition-all cursor-pointer inline-flex items-center space-x-1.5 disabled:opacity-50"
                          >
                            <Send className="h-3 w-3" />
                            <span>{actionLoading === r._id ? 'Sending...' : 'Send WhatsApp'}</span>
                          </button>
                        </div>
                      ))}
                      {reminders.today.length === 0 && (
                        <p className="text-center py-6 text-xs text-slate-400">No service reminders scheduled for today.</p>
                      )}
                    </div>
                  </div>

                  {/* Overdue Reminders Card */}
                  <div className="glass-card p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-150/40 dark:border-slate-800 pb-3">
                      <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center space-x-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        <span>⚠️ Overdue Reminders</span>
                      </h3>
                      <span className="text-[9px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold">
                        {reminders.overdue.length} overdue
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[300px] overflow-y-auto pr-1">
                      {reminders.overdue.map((r: any) => (
                        <div key={r._id} className="py-3 flex justify-between items-center gap-4">
                          <div className="min-w-0">
                            <span className="block text-xs font-extrabold text-slate-800 dark:text-white hover:underline cursor-pointer" onClick={() => fetchCustomerProfile(r.customerId?._id)}>
                              {r.customerId?.name || 'Unknown Client'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {r.serviceName} | Scheduled Date: {new Date(r.reminderDate).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] font-bold text-rose-500 block mt-0.5">
                              Overdue by: {Math.round((Date.now() - new Date(r.reminderDate).getTime()) / (1000 * 60 * 60 * 24))} Days
                            </span>
                          </div>
                          <button
                            onClick={() => handleSendReminder(r._id)}
                            disabled={actionLoading === r._id}
                            className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-extrabold shadow-sm transition-all cursor-pointer inline-flex items-center space-x-1.5 disabled:opacity-50"
                          >
                            <Send className="h-3 w-3" />
                            <span>{actionLoading === r._id ? 'Sending...' : 'Send WhatsApp'}</span>
                          </button>
                        </div>
                      ))}
                      {reminders.overdue.length === 0 && (
                        <p className="text-center py-6 text-xs text-slate-400">Great! No overdue reminders currently.</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* 2. Upcoming reminders */}
                <div className="space-y-6">
                  <div className="glass-card p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-150/40 dark:border-slate-800 pb-3">
                      <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest flex items-center space-x-1.5">
                        <Clock className="h-4 w-4 text-emerald-500" />
                        <span>📅 Upcoming Reminders</span>
                      </h3>
                      <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                        {reminders.upcoming.length} upcoming
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto pr-1">
                      {reminders.upcoming.map((r: any) => (
                        <div key={r._id} className="py-3.5">
                          <span className="block text-xs font-extrabold text-slate-800 dark:text-white hover:underline cursor-pointer" onClick={() => fetchCustomerProfile(r.customerId?._id)}>
                            {r.customerId?.name || 'Unknown Client'}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {r.serviceName}
                          </span>
                          <div className="flex items-center justify-between mt-1 text-[10px]">
                            <span className="font-bold text-slate-500">Due: {new Date(r.reminderDate).toLocaleDateString()}</span>
                            <span className="font-bold text-blue-500 uppercase tracking-wider">
                              In {Math.round((new Date(r.reminderDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} Days
                            </span>
                          </div>
                        </div>
                      ))}
                      {reminders.upcoming.length === 0 && (
                        <p className="text-center py-6 text-xs text-slate-400">No upcoming reminders scheduled.</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: WHATSAPP MARKETING */}
          {activeTab === 'marketing' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Campaign builder form (2 cols) */}
              <div className="xl:col-span-2 space-y-6">
                <div className="glass-card p-6">
                  <div className="border-b border-slate-150/40 dark:border-slate-800 pb-3 mb-5">
                    <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest flex items-center space-x-1.5">
                      <Send className="h-4 w-4 text-emerald-500" />
                      <span>📢 Launch New Marketing Campaign</span>
                    </h3>
                  </div>

                  <form onSubmit={handleCreateCampaign} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5">Campaign Name:</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. SofaShine Festival Offer 2026"
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5">Campaign Image (Optional):</label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setCampaignImageUrl(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 outline-none focus:border-secondary dark:text-white"
                          />
                          {campaignImageUrl && (
                            <button
                              type="button"
                              onClick={() => setCampaignImageUrl('')}
                              className="px-2.5 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase cursor-pointer transition-all"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5">Offer Value (for {"{{offer}}"} tag):</label>
                        <input
                          type="text"
                          placeholder="e.g. 20% OFF"
                          value={offerText}
                          onChange={(e) => setOfferText(e.target.value)}
                          className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                        />
                      </div>

                      <div className="flex items-center space-x-6 pt-4">
                        <label className="flex items-center space-x-2 text-xs font-bold text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={scheduleCampaign}
                            onChange={(e) => setScheduleCampaign(e.target.checked)}
                            className="rounded border-slate-205 text-secondary outline-none focus:ring-1 focus:ring-secondary"
                          />
                          <span>Schedule for Later</span>
                        </label>

                        {scheduleCampaign && (
                          <input
                            type="datetime-local"
                            required
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:color-scheme-dark dark:text-white"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Campaign Message Text:</label>
                        <span className="text-[9px] text-slate-400 font-bold">Variables: {"{{customer_name}}"}, {"{{service_name}}"}, {"{{last_service_date}}"}, {"{{company_name}}"}, {"{{offer}}"}</span>
                      </div>
                      <textarea
                        rows={5}
                        required
                        placeholder="Compose your message here..."
                        value={campaignMessage}
                        onChange={(e) => setCampaignMessage(e.target.value)}
                        className="w-full text-xs font-semibold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white leading-relaxed font-mono"
                      />
                    </div>

                    {/* Customer Selection block */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Target Recipients Selection Mode:</label>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setTargetFilterMode('individual')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${targetFilterMode === 'individual' ? 'bg-secondary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                          >
                            Select Manually
                          </button>
                          <button
                            type="button"
                            onClick={() => setTargetFilterMode('smart-filters')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${targetFilterMode === 'smart-filters' ? 'bg-secondary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                          >
                            Use Smart Filters
                          </button>
                        </div>
                      </div>

                      {/* Manual Checklist Selection */}
                      {targetFilterMode === 'individual' ? (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Selected Customers ({selectedCustomerIds.length})</span>
                            <button
                              type="button"
                              onClick={handleSelectAllCustomers}
                              className="text-[10px] text-secondary font-black uppercase hover:underline cursor-pointer"
                            >
                              {selectedCustomerIds.length === customers.length ? 'Deselect All' : 'Select All on Page'}
                            </button>
                          </div>

                          <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-150/40 dark:divide-slate-800 pr-1 text-xs">
                            {customers.map((c) => {
                              const isSelected = selectedCustomerIds.includes(c._id);
                              return (
                                <label key={c._id} className="flex items-center space-x-3 py-2 cursor-pointer hover:bg-slate-100/40 dark:hover:bg-slate-800/10 px-1 rounded-lg">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSelectCustomer(c._id)}
                                    disabled={c.marketingOptOut}
                                    className="rounded border-slate-205 text-secondary focus:ring-1 focus:ring-secondary disabled:opacity-50"
                                  />
                                  <span className="flex-1 font-bold text-slate-700 dark:text-slate-300">{c.name} ({c.phone})</span>
                                  <span className="text-[9px] text-slate-450 uppercase">{c.serviceTaken}</span>
                                  {c.marketingOptOut && (
                                    <span className="text-[8px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded font-black uppercase">Opted Out</span>
                                  )}
                                </label>
                              );
                            })}
                            {customers.length === 0 && (
                              <p className="text-center py-6 text-slate-400">No customers found. Run query filters or search above.</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Smart filters targeting preview description
                        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 text-xs font-bold text-slate-600 dark:text-slate-300 space-y-2">
                          <span className="text-[9px] font-black text-emerald-500 uppercase block tracking-wider">Targeting Criteria Info</span>
                          <p className="leading-relaxed">
                            Campaign will be broadcast to all previous customers matching the active panel filters listed in the sidebar (excluding opted-out contacts).
                          </p>
                          <div className="flex flex-wrap gap-2 text-[10px] font-extrabold mt-1">
                            {filterService && <span className="bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded">Service: {filterService}</span>}
                            {filterCompany !== 'All' && <span className="bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded">Company: {filterCompany}</span>}
                            {filterLocation && <span className="bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded">Location: {filterLocation}</span>}
                            {filterMinSpent && <span className="bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded">Min Spent: ₹{filterMinSpent}</span>}
                            {filterInactiveDays && <span className="bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded">Inactivity: {filterInactiveDays}+ days</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-3">
                      <button
                        type="submit"
                        disabled={actionLoading === 'campaign' || (targetFilterMode === 'individual' && selectedCustomerIds.length === 0)}
                        className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-black shadow-sm tracking-wider uppercase transition-all cursor-pointer inline-flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        <span>{scheduleCampaign ? 'Schedule Campaign' : 'Send WhatsApp Campaign'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Sidebar filter options and Live message preview */}
              <div className="space-y-6">
                
                {/* Live Message Preview Card */}
                <div className="glass-card p-6 bg-emerald-500/[0.02] border-emerald-500/10 space-y-4">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Live Preview (Demo Customer)</span>
                  
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950/70 shadow-sm relative leading-relaxed text-xs space-y-3">
                    {/* Simulated WhatsApp chat message layout */}
                    <div className="absolute top-2 left-2 text-[8px] uppercase tracking-wider font-extrabold text-emerald-500">WhatsApp message</div>
                    {campaignImageUrl && (
                      <div className="pt-4 max-h-[200px] overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
                        <img
                          src={campaignImageUrl}
                          alt="Campaign attachment"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className={`${campaignImageUrl ? '' : 'pt-4'} font-sans font-medium whitespace-pre-wrap text-slate-700 dark:text-slate-200`}>
                      {campaignPreviewMessage}
                    </div>
                  </div>
                </div>

                {/* Smart filters target controller */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-150/40 dark:border-slate-800 pb-2">
                    <span className="text-xs font-black text-slate-455 uppercase tracking-widest">Smart Filters Controller</span>
                    <Filter className="h-4 w-4 text-secondary" />
                  </div>

                  <div className="space-y-3.5 text-xs font-bold text-slate-500">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Target Service Category:</label>
                      <input
                        type="text"
                        placeholder="e.g. Sofa Cleaning"
                        value={filterService}
                        onChange={(e) => setFilterService(e.target.value)}
                        className="w-full text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Company:</label>
                      <select
                        value={filterCompany}
                        onChange={(e) => setFilterCompany(e.target.value)}
                        className="w-full text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                      >
                        <option value="All">All Companies</option>
                        <option value="SofaShine">SofaShine</option>
                        <option value="CleanCruisers">CleanCruisers</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Location / City:</label>
                      <input
                        type="text"
                        placeholder="e.g. Delhi"
                        value={filterLocation}
                        onChange={(e) => setFilterLocation(e.target.value)}
                        className="w-full text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Min Spent (₹):</label>
                        <input
                          type="number"
                          placeholder="e.g. 5000"
                          value={filterMinSpent}
                          onChange={(e) => setFilterMinSpent(e.target.value)}
                          className="w-full text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Inactivity (Days):</label>
                        <select
                          value={filterInactiveDays}
                          onChange={(e) => setFilterInactiveDays(e.target.value)}
                          className="w-full text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                        >
                          <option value="">Any Inactivity</option>
                          <option value="30">30+ Days</option>
                          <option value="60">60+ Days</option>
                          <option value="90">90+ Days</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: CUSTOMER CONTACTS */}
          {activeTab === 'contacts' && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-150/40 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Customer Contacts Database</h3>
                  <p className="text-[10px] text-slate-400">Complete consolidated list of all client WhatsApp numbers synced from completed cleanups.</p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold shadow-sm">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Client Name / WhatsApp..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs dark:text-white"
                    />
                  </div>

                  <button
                    onClick={() => handleExportCSV('customers')}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm transition-all inline-flex items-center space-x-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Contacts Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350 min-w-[900px]">
                  <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3">WhatsApp Number</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Last Service Name</th>
                      <th className="px-4 py-3">Last Date</th>
                      <th className="px-4 py-3">Total Spent</th>
                      <th className="px-4 py-3">Next Reminder</th>
                      <th className="px-4 py-3 text-center">Marketing Promo</th>
                      <th className="px-4 py-3 text-right">Profile Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {customers.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="px-4 py-3.5">
                          <span className="block text-slate-800 dark:text-white font-extrabold">{c.name}</span>
                          <span className="text-[9px] text-slate-400">{c.email || 'No email saved'}</span>
                        </td>
                        <td className="px-4 py-3.5 text-emerald-500">{c.phone}</td>
                        <td className="px-4 py-3.5">{c.company}</td>
                        <td className="px-4 py-3.5">{c.serviceTaken || 'N/A'}</td>
                        <td className="px-4 py-3.5">{new Date(c.lastServiceDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3.5 text-slate-800 dark:text-white">₹{c.totalAmountSpent.toLocaleString()}</td>
                        <td className="px-4 py-3.5">
                          {c.nextReminderDate ? (
                            <span className="text-blue-500 font-extrabold">{new Date(c.nextReminderDate).toLocaleDateString()}</span>
                          ) : (
                            <span className="text-slate-400">No scheduled date</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleToggleOptOut(c._id, c.marketingOptOut)}
                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase cursor-pointer transition-all ${
                              c.marketingOptOut
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                            }`}
                          >
                            {c.marketingOptOut ? 'Opted Out' : 'Active Opt-in'}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => fetchCustomerProfile(c._id)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 rounded cursor-pointer transition-all inline-flex items-center space-x-1"
                          >
                            <Eye className="h-3 w-3" />
                            <span className="text-[8px] uppercase font-bold">Open</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-slate-400">No customer records matching the active query filters were found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: MESSAGE HISTORY LOG */}
          {activeTab === 'history' && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-150/40 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">WhatsApp Communication History Log</h3>
                  <p className="text-[10px] text-slate-400">Full audit log feed of all transactional service alerts and promo campaigns dispatched.</p>
                </div>

                <button
                  onClick={() => handleExportCSV('history')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm transition-all inline-flex items-center space-x-2 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Message Feed Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350 min-w-[800px]">
                  <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">WhatsApp Number</th>
                      <th className="px-4 py-3">Message Type</th>
                      <th className="px-4 py-3">Message Snippet</th>
                      <th className="px-4 py-3">Sent Time</th>
                      <th className="px-4 py-3 text-right">Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.map((h) => (
                      <tr key={h._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="px-4 py-3.5 text-slate-800 dark:text-white font-extrabold">{h.recipientName}</td>
                        <td className="px-4 py-3.5">{h.phoneNumber}</td>
                        <td className="px-4 py-3.5 uppercase text-[10px]">
                          <span className={`px-2 py-0.5 rounded font-black ${h.messageType === 'reminder' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            {h.messageType}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 max-w-[250px] truncate text-[11px] font-medium text-slate-500 dark:text-slate-400" title={h.messageText}>
                          {h.messageText}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">{new Date(h.sentTime).toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-right uppercase text-[9px] font-black">
                          <span className={`px-2 py-0.5 rounded ${
                            h.status === 'read' ? 'bg-emerald-500/15 text-emerald-500' :
                            h.status === 'delivered' ? 'bg-blue-500/15 text-blue-500' :
                            h.status === 'sent' ? 'bg-amber-500/15 text-amber-500' :
                            h.status === 'failed' ? 'bg-rose-500/15 text-rose-500' :
                            'bg-slate-100 text-slate-400'
                          }`}>
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">No messages dispatched yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: MODULE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Settings Configuration form */}
              <div className="glass-card p-6">
                <div className="border-b border-slate-150/40 dark:border-slate-800 pb-3 mb-5">
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest flex items-center space-x-1.5">
                    <Settings2 className="h-4 w-4 text-emerald-500" />
                    <span>🛠️ Configure Engagement Settings</span>
                  </h3>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                    <div>
                      <span className="block text-xs font-extrabold text-slate-800 dark:text-white">API Simulation Mock Mode</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Toggle to simulate real-time message statuses without using Meta credentials.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useMockApi}
                        onChange={(e) => setUseMockApi(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-350 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-655 peer-checked:bg-secondary"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5">Global Default Service Reminder period (Days):</label>
                    <select
                      value={defaultReminderDays}
                      onChange={(e) => setDefaultReminderDays(Number(e.target.value))}
                      className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                    >
                      <option value="15">15 Days</option>
                      <option value="30">30 Days</option>
                      <option value="45">45 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5">Configure Service-Specific Reminder Templates:</label>
                    <textarea
                      rows={6}
                      required
                      value={reminderTemplate}
                      onChange={(e) => setReminderTemplate(e.target.value)}
                      className="w-full text-xs font-semibold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white font-mono leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={actionLoading === 'settings'}
                      className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-black shadow-sm tracking-wider uppercase transition-all cursor-pointer disabled:opacity-50"
                    >
                      <span>Save Config Settings</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Service-Specific reminder intervals mapping card */}
              <div className="glass-card p-6 space-y-4">
                <div className="border-b border-slate-150/40 dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest flex items-center space-x-1.5">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    <span>📅 Service-Specific Intervals Mapping</span>
                  </h3>
                </div>

                <div className="space-y-4">
                  
                  {/* Add service rule */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border border-slate-150/40 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/20 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Service Title Category:</label>
                      <input
                        type="text"
                        placeholder="e.g. Sofa Cleaning"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        className="w-full text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Interval (Days):</label>
                      <div className="flex space-x-2">
                        <select
                          value={newServiceDays}
                          onChange={(e) => setNewServiceDays(Number(e.target.value))}
                          className="w-full text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                        >
                          <option value="15">15 Days</option>
                          <option value="30">30 Days</option>
                          <option value="45">45 Days</option>
                          <option value="60">60 Days</option>
                          <option value="90">90 Days</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleAddServiceRule}
                          className="px-3 py-2 rounded-lg bg-emerald-500 text-white font-extrabold cursor-pointer hover:bg-emerald-600 shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Rules list */}
                  <div className="divide-y divide-slate-150/40 dark:divide-slate-800 max-h-[300px] overflow-y-auto pr-1">
                    {serviceReminderDays.map((rule, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 text-xs">
                        <span className="font-extrabold text-slate-700 dark:text-slate-300">{rule.serviceName}</span>
                        <div className="flex items-center space-x-3">
                          <span className="font-black text-emerald-500 uppercase">{rule.days} Days Interval</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveServiceRule(idx)}
                            className="text-rose-500 font-bold hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {serviceReminderDays.length === 0 && (
                      <p className="text-center py-6 text-slate-450">No service rules mapping found. Standard global defaults will apply.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* POPUP / DRAWER: Detailed Customer Profile Details */}
      {activeProfileId && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/45 backdrop-blur-sm">
          <div className="w-full max-w-xl h-full bg-white dark:bg-slate-950 shadow-2xl p-6 overflow-y-auto flex flex-col space-y-5 animate-slide-left relative border-l border-slate-205 dark:border-slate-855">
            <button
              onClick={() => {
                setActiveProfileId(null);
                setActiveProfileData(null);
              }}
              className="absolute top-4 right-4 rounded-full p-1.5 text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {profileLoading || !activeProfileData ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="h-8 w-8 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs text-slate-400">Loading Customer details...</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Profile Header Details */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Customer Engagement Profile</span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 uppercase flex items-center space-x-2">
                    <UserCheck className="h-5.5 w-5.5 text-emerald-500" />
                    <span>{activeProfileData.contact.name}</span>
                  </h3>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 mt-2">
                    <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded flex items-center">
                      <Phone className="h-3.5 w-3.5 text-emerald-500 mr-1" /> WhatsApp: {activeProfileData.contact.phone}
                    </span>
                    {activeProfileData.contact.email && (
                      <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded flex items-center">
                        <Mail className="h-3.5 w-3.5 text-blue-500 mr-1" /> {activeProfileData.contact.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Profile Stats Panel */}
                <div className="grid grid-cols-3 gap-3 border border-slate-150/40 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/20 text-xs">
                  <div>
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Total Cleanups</span>
                    <span className="text-sm font-black text-slate-800 dark:text-white mt-1 block">{activeProfileData.contact.totalServicesTaken} Cleanups</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Total Spent</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 block">₹{activeProfileData.contact.totalAmountSpent.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Upcoming Reminder</span>
                    <span className="text-[10px] font-extrabold text-blue-500 mt-1 block">
                      {activeProfileData.contact.nextReminderDate 
                        ? new Date(activeProfileData.contact.nextReminderDate).toLocaleDateString()
                        : 'No reminder set'}
                    </span>
                  </div>
                </div>

                {/* Booking History tab list */}
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400">Cleanup Booking History</h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-150/40 dark:divide-slate-855 text-xs font-bold">
                    {activeProfileData.jobs.map((job: any) => (
                      <div key={job._id} className="p-3 bg-white dark:bg-slate-900/40 flex justify-between items-center">
                        <div>
                          <span className="block text-slate-800 dark:text-white">{job.title}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">Location: {job.address}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-emerald-600 dark:text-emerald-400">₹{job.price}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{job.completedAt ? new Date(job.completedAt).toLocaleDateString() : ''}</span>
                        </div>
                      </div>
                    ))}
                    {activeProfileData.jobs.length === 0 && (
                      <p className="text-center py-4 text-slate-450">No completed cleanup history logged.</p>
                    )}
                  </div>
                </div>

                {/* WhatsApp Message Communication Logs */}
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400">WhatsApp Communication Log</h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-150/40 dark:divide-slate-855 text-xs font-bold max-h-[220px] overflow-y-auto">
                    {activeProfileData.messages.map((msg: any) => (
                      <div key={msg._id} className="p-3 bg-white dark:bg-slate-900/40 flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 text-[9px] font-black uppercase text-slate-400">
                            <span>{msg.messageType}</span>
                            <span>•</span>
                            <span>{new Date(msg.sentTime).toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-650 dark:text-slate-350 leading-relaxed mt-1 whitespace-pre-wrap">{msg.messageText}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          msg.status === 'read' ? 'bg-emerald-500/15 text-emerald-500' :
                          msg.status === 'delivered' ? 'bg-blue-500/15 text-blue-500' :
                          msg.status === 'sent' ? 'bg-amber-500/15 text-amber-500' :
                          'bg-rose-500/15 text-rose-500'
                        }`}>
                          {msg.status}
                        </span>
                      </div>
                    ))}
                    {activeProfileData.messages.length === 0 && (
                      <p className="text-center py-4 text-slate-450">No communication logs recorded for this client.</p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminWhatsAppEngagement;
