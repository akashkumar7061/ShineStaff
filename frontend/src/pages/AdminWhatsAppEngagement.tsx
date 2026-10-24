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
  FileSpreadsheet,
  Edit2,
  Trash2,
  MessageCircle,
  ExternalLink,
  Sparkles,
  RefreshCw
} from 'lucide-react';

const MARKETING_PRESETS = [
  {
    name: '🎉 Festive 20% OFF',
    tag: '20% OFF',
    template: "Hi {{customer_name}}! 🎉\n\nCelebrate the festive season with spotless, freshly sanitized furniture!\n\nBook your {{service_name}} today and enjoy Flat 20% OFF.\n\nUse Promo Code: FESTIVE20\n\nReply here on WhatsApp to reserve your preferred time slot!"
  },
  {
    name: '✨ 1-Month Repeat 15% OFF',
    tag: '15% OFF',
    template: "Hello {{customer_name}}! 👋\n\nIt has been about 1 month since your last {{service_name}}. Keep your furniture looking like new with our repeat customer discount!\n\nBook again this week and get 15% OFF.\n\nUse Code: REPEAT15\n\nReply to this message to book!"
  },
  {
    name: '🛋️ Weekend Flat ₹300 OFF',
    tag: '₹300 OFF',
    template: "Special Weekend Offer for {{customer_name}}! 🛋️✨\n\nTreat your sofa & carpets to our premium deep shampoo cleaning this weekend.\n\nGet Flat ₹300 OFF on orders above ₹1,200.\n\nUse Code: WEEKEND300\n\nLimited slots available - reply now to reserve!"
  },
  {
    name: '🌧️ Monsoon Fresh 25% OFF',
    tag: '25% OFF',
    template: "Dear {{customer_name}}, protect your home against dust mites, odors & humidity! 🛡️✨\n\nBook a certified antibacterial deep clean for your sofa or mattress and get 25% OFF.\n\nUse Code: FRESH25\n\nReply here to schedule!"
  }
];

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
  const [filterRepeatOnly, setFilterRepeatOnly] = useState(false);
  const [filterMessageType, setFilterMessageType] = useState('All');

  // Marketing Campaign Form
  const [campaignName, setCampaignName] = useState('');
  const [campaignImageUrl, setCampaignImageUrl] = useState('');
  const [campaignMessage, setCampaignMessage] = useState(
    "Hi {{customer_name}},\n\nIt's been some time since your last {{service_name}} service. Book again today and get 15% off!\n\nUse Code: REPEAT15"
  );
  const [scheduleCampaign, setScheduleCampaign] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedReminderIds, setSelectedReminderIds] = useState<string[]>([]);
  const [targetFilterMode, setTargetFilterMode] = useState<'individual' | 'smart-filters'>('individual');
  const [offerText, setOfferText] = useState('15% OFF');

  // 1-Month Service Reminder UI States
  const [reminderLanguage, setReminderLanguage] = useState<'english' | 'hinglish'>('english');
  const [reminderSubTab, setReminderSubTab] = useState<'due_today' | 'overdue' | 'upcoming' | 'all' | 'sent'>('due_today');
  const [reminderSearch, setReminderSearch] = useState('');

  // 1-Click WhatsApp Direct Queue for Marketing
  const [showDirectQueueModal, setShowDirectQueueModal] = useState(false);
  const [directQueueIndex, setDirectQueueIndex] = useState(0);
  const [directQueueSentIds, setDirectQueueSentIds] = useState<string[]>([]);

  // Interactive drawer/popup for customer profile details
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeProfileData, setActiveProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Add Contact Modal states
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactAltPhone, setNewContactAltPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactCompany, setNewContactCompany] = useState('SofaShine');
  const [newContactService, setNewContactService] = useState('General Clean');
  const [newContactSpent, setNewContactSpent] = useState('0');
  const [newContactLastDate, setNewContactLastDate] = useState(new Date().toISOString().split('T')[0]);

  // Settings form states
  const [defaultReminderDays, setDefaultReminderDays] = useState(30);
  const [serviceReminderDays, setServiceReminderDays] = useState<any[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDays, setNewServiceDays] = useState(30);
  const [reminderTemplate, setReminderTemplate] = useState('');
  const [useMockApi, setUseMockApi] = useState(true);
  const [enableAutoReminders, setEnableAutoReminders] = useState(true);
  const [sofaShinePhoneNumberId, setSofaShinePhoneNumberId] = useState('');
  const [sofaShineAccessToken, setSofaShineAccessToken] = useState('');
  const [cleanCruisersPhoneNumberId, setCleanCruisersPhoneNumberId] = useState('');
  const [cleanCruisersAccessToken, setCleanCruisersAccessToken] = useState('');

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
        setEnableAutoReminders(settingsRes.data.enableAutoReminders !== false);
        setSofaShinePhoneNumberId(settingsRes.data.sofaShinePhoneNumberId || '');
        setSofaShineAccessToken(settingsRes.data.sofaShineAccessToken || '');
        setCleanCruisersPhoneNumberId(settingsRes.data.cleanCruisersPhoneNumberId || '');
        setCleanCruisersAccessToken(settingsRes.data.cleanCruisersAccessToken || '');
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
      if (filterRepeatOnly) params.append('repeatOnly', 'true');
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
    if (activeTab === 'contacts' || activeTab === 'marketing' || activeTab === 'reminders') {
      fetchCustomers();
    }
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, searchQuery, filterService, filterCompany, filterLocation, filterMinSpent, filterInactiveDays, filterHasReminder, filterRepeatOnly, customerPage]);

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

  // Add Manual Customer Contact
  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;

    setActionLoading('add-contact');
    try {
      await api.post('/whatsapp/customers', {
        name: newContactName,
        phone: newContactPhone,
        alternatePhone: newContactAltPhone,
        email: newContactEmail,
        company: newContactCompany,
        serviceTaken: newContactService,
        lastServiceDate: newContactLastDate,
        totalAmountSpent: Number(newContactSpent) || 0
      });

      // Reset Form
      setNewContactName('');
      setNewContactPhone('');
      setNewContactAltPhone('');
      setNewContactEmail('');
      setNewContactCompany('SofaShine');
      setNewContactService('General Clean');
      setNewContactSpent('0');
      setNewContactLastDate(new Date().toISOString().split('T')[0]);
      setShowAddContactModal(false);

      // Refresh data
      fetchCustomers();
      const analyticsRes = await api.get('/whatsapp/analytics');
      setAnalytics(analyticsRes.data);
    } catch (error: any) {
      console.error('Error manual customer add:', error);
      alert(error.response?.data?.message || 'Failed to add customer contact.');
    } finally {
      setActionLoading(null);
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

  // Send Bulk Manual Reminders
  const handleBulkSendReminders = async () => {
    if (selectedReminderIds.length === 0) return;
    setActionLoading('bulk-reminders');
    try {
      await api.post('/whatsapp/reminders/bulk-send', { ids: selectedReminderIds });
      setSelectedReminderIds([]);
      // Refresh
      const remindersRes = await api.get('/whatsapp/reminders');
      setReminders(remindersRes.data);
      const analyticsRes = await api.get('/whatsapp/analytics');
      setAnalytics(analyticsRes.data);
      alert('Manual reminders triggered successfully for selected customers!');
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      alert('Failed to send bulk manual reminders.');
    } finally {
      setActionLoading(null);
    }
  };

  // Generate WhatsApp Direct chat wa.me link
  const generateWhatsAppUrl = (phone: string, text: string) => {
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  // Build Personalized 1-Month Reminder Message Text
  const getPersonalizedReminderMessage = (customer: any, serviceName?: string) => {
    const name = customer?.name || 'Valued Customer';
    const sName = serviceName || customer?.serviceTaken || 'Cleaning Service';
    const lastDate = customer?.lastServiceDate ? new Date(customer.lastServiceDate).toLocaleDateString() : '1 month ago';
    const company = customer?.company === 'All' ? 'ShineStaff' : (customer?.company || 'ShineStaff');

    if (reminderLanguage === 'hinglish') {
      return `Namaste ${name} ji! 🙏\n\nAapne lagbhag 1 mahine pehle (${lastDate}) ko ${sName} karwaya tha.\n\nRegular maintenance aur behtar freshness ke liye aapki agli service ka samay ho gaya hai. 🛋️✨\n\nKya hum aapki agli service schedule karein? Yahan WhatsApp par reply karein ya call karein. Dhanyawaad! - ${company}`;
    }

    return `Hello ${name}! 👋\n\nIt has been about 1 month since your last ${sName} service on ${lastDate}.\n\nIt is time for your regular maintenance and deep refresh cleaning! 🛋️✨\n\nWould you like to schedule your next service? Reply here on WhatsApp or call us to reserve your slot. - ${company}`;
  };

  // Instant 1-Click WhatsApp Direct Reminder dispatch
  const handleDirectWhatsAppReminder = async (reminder: any) => {
    const customer = reminder.customerId;
    if (!customer?.phone) {
      alert('Customer WhatsApp phone number is not available.');
      return;
    }

    const message = getPersonalizedReminderMessage(customer, reminder.serviceName);
    const url = generateWhatsAppUrl(customer.phone, message);
    window.open(url, '_blank');

    try {
      await api.post(`/whatsapp/reminders/${reminder._id}/mark-sent`, { messageText: message });
      const remindersRes = await api.get('/whatsapp/reminders');
      setReminders(remindersRes.data);
      const analyticsRes = await api.get('/whatsapp/analytics');
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Error marking reminder as sent:', err);
    }
  };

  // Instant 1-Click WhatsApp Direct Customer dispatch
  const handleDirectWhatsAppCustomer = async (customer: any) => {
    if (!customer?.phone) {
      alert('Customer WhatsApp phone number is not available.');
      return;
    }

    const message = getPersonalizedReminderMessage(customer, customer.serviceTaken);
    const url = generateWhatsAppUrl(customer.phone, message);
    window.open(url, '_blank');
  };

  // Trigger manual startup sync backfill of all completed jobs
  const handleTriggerBackfill = async () => {
    setActionLoading('backfill');
    try {
      const res = await api.post('/whatsapp/settings/trigger-backfill');
      alert(res.data.message || 'All completed jobs synced and 1-month service reminders scheduled successfully!');
      fetchData();
      fetchCustomers();
    } catch (error) {
      console.error('Error trigger backfill:', error);
      alert('Failed to sync completed jobs.');
    } finally {
      setActionLoading(null);
    }
  };

  // Apply Pre-made Marketing Campaign Template
  const handleApplyMarketingPreset = (preset: typeof MARKETING_PRESETS[0]) => {
    setCampaignName(preset.name.replace(/[^a-zA-Z0-9 ]/g, '').trim() + ' Campaign');
    setOfferText(preset.tag);
    setCampaignMessage(preset.template);
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

  const activeReminderList = useMemo(() => {
    let list: any[] = [];
    if (reminderSubTab === 'due_today') list = reminders.today || [];
    else if (reminderSubTab === 'overdue') list = reminders.overdue || [];
    else if (reminderSubTab === 'upcoming') list = reminders.upcoming || [];
    else if (reminderSubTab === 'sent') list = reminders.sent || [];
    else if (reminderSubTab === 'all') {
      list = [...(reminders.today || []), ...(reminders.overdue || []), ...(reminders.upcoming || [])];
    }

    if (reminderSearch.trim() !== '') {
      const q = reminderSearch.toLowerCase().trim();
      list = list.filter((r: any) => {
        const name = (r.customerId?.name || '').toLowerCase();
        const phone = (r.customerId?.phone || '').toLowerCase();
        const service = (r.serviceName || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || service.includes(q);
      });
    }

    return list;
  }, [reminders, reminderSubTab, reminderSearch]);

  const selectedCustomersData = useMemo(() => {
    return customers.filter(c => selectedCustomerIds.includes(c._id));
  }, [customers, selectedCustomerIds]);

  const [historySearch, setHistorySearch] = useState('');
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [editMessageText, setEditMessageText] = useState('');

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    let items = history;
    if (filterMessageType !== 'All') {
      items = items.filter((msg: any) => msg.messageType === filterMessageType);
    }
    if (historySearch.trim() !== '') {
      const q = historySearch.toLowerCase().trim();
      items = items.filter((msg: any) => {
        const nameMatch = msg.recipientName?.toLowerCase().includes(q);
        const phoneMatch = msg.phoneNumber?.toLowerCase().includes(q);
        const textMatch = msg.messageText?.toLowerCase().includes(q);
        return nameMatch || phoneMatch || textMatch;
      });
    }
    return items;
  }, [history, filterMessageType, historySearch]);

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
        useMockApi,
        enableAutoReminders,
        sofaShinePhoneNumberId,
        sofaShineAccessToken,
        cleanCruisersPhoneNumberId,
        cleanCruisersAccessToken
      });
      alert('Settings updated successfully!');
      fetchData();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Edit WhatsApp message log helper
  const handleEditLog = async (logId: string) => {
    if (!editMessageText.trim()) return;
    setActionLoading(`edit-${logId}`);
    try {
      await api.put(`/whatsapp/history/${logId}`, { messageText: editMessageText });
      alert('Message log updated successfully.');
      setEditingLog(null);
      setEditMessageText('');
      fetchHistory();
    } catch (error) {
      console.error('Error editing message log:', error);
      alert('Failed to edit message log.');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete WhatsApp message log helper
  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Are you sure you want to delete this message log? This action cannot be undone.')) return;
    setActionLoading(`delete-${logId}`);
    try {
      await api.delete(`/whatsapp/history/${logId}`);
      alert('Message log deleted successfully.');
      fetchHistory();
    } catch (error) {
      console.error('Error deleting message log:', error);
      alert('Failed to delete message log.');
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
      rows = filteredHistory.map(h => [
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
          <div 
            onClick={() => {
              setActiveTab('contacts');
              setFilterRepeatOnly(false);
              setSearchQuery('');
              setFilterService('');
              setFilterCompany('All');
              setFilterLocation('');
              setFilterMinSpent('');
              setFilterInactiveDays('');
              setFilterHasReminder('false');
            }}
            className="glass-card p-4 flex flex-col justify-between shadow-sm cursor-pointer hover:border-secondary hover:shadow hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-all duration-200"
          >
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Total Customers</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{analytics.totalCustomers}</span>
              <span className="text-[9px] text-emerald-500 font-extrabold flex items-center">
                <Users className="h-3 w-3 mr-0.5" /> WhatsApp OK
              </span>
            </div>
          </div>
          <div 
            onClick={() => {
              setActiveTab('history');
              setFilterMessageType('reminder');
            }}
            className="glass-card p-4 flex flex-col justify-between shadow-sm cursor-pointer hover:border-secondary hover:shadow hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-all duration-200"
          >
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Reminders Sent</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{analytics.remindersSent}</span>
              <span className="text-[9px] text-emerald-500 font-bold">
                Fail: {analytics.remindersFailed}
              </span>
            </div>
          </div>
          <div 
            onClick={() => {
              setActiveTab('history');
              setFilterMessageType('marketing');
            }}
            className="glass-card p-4 flex flex-col justify-between shadow-sm cursor-pointer hover:border-secondary hover:shadow hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-all duration-200"
          >
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Marketing Blasts</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{analytics.marketingSent}</span>
              <span className="text-[9px] text-emerald-500 font-bold">
                {analytics.marketingDeliveryRate}% Deliv
              </span>
            </div>
          </div>
          <div 
            onClick={() => {
              setActiveTab('contacts');
              setFilterRepeatOnly(true);
              setSearchQuery('');
              setFilterService('');
              setFilterCompany('All');
              setFilterLocation('');
              setFilterMinSpent('');
              setFilterInactiveDays('');
              setFilterHasReminder('false');
            }}
            className="glass-card p-4 flex flex-col justify-between shadow-sm cursor-pointer hover:border-secondary hover:shadow hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-all duration-200"
          >
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Repeat Bookings</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{analytics.repeatBookings}</span>
              <span className="text-[9px] text-blue-500 font-extrabold flex items-center">
                <TrendingUp className="h-3 w-3 mr-0.5" /> Return
              </span>
            </div>
          </div>
          <div 
            onClick={() => {
              setActiveTab('contacts');
              setFilterRepeatOnly(true);
              setSearchQuery('');
              setFilterService('');
              setFilterCompany('All');
              setFilterLocation('');
              setFilterMinSpent('');
              setFilterInactiveDays('');
              setFilterHasReminder('false');
            }}
            className="glass-card p-4 flex flex-col justify-between shadow-sm cursor-pointer hover:border-secondary hover:shadow hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-all duration-200"
          >
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Repeat Revenue</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{analytics.revenueFromRepeat.toLocaleString()}</span>
            </div>
          </div>
          <div 
            onClick={() => {
              setActiveTab('reminders');
            }}
            className="glass-card p-4 flex flex-col justify-between shadow-sm cursor-pointer hover:border-secondary hover:shadow hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-all duration-200"
          >
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
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'history' && filterMessageType === 'All') {
                    setFilterMessageType('marketing');
                  }
                }}
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
          
          {/* TAB 1: SERVICE REMINDERS (1-MONTH AUTO & 1-CLICK DIRECT) */}
          {activeTab === 'reminders' && (
            <div className="space-y-6">
              {/* Top Banner with 1-Month Auto explanation & quick controls */}
              <div className="glass-card p-5 border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Auto 1-Month Service Reminders
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                      30-Day Rule Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    When any job is marked completed, a reminder is automatically scheduled for 30 days (1 month) later. Send free 1-click reminders directly via WhatsApp or automated dispatch.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Language switch */}
                  <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-[11px] font-bold">
                    <span className="text-slate-400 px-1 text-[10px] uppercase font-black">Template:</span>
                    <button
                      type="button"
                      onClick={() => setReminderLanguage('english')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${reminderLanguage === 'english' ? 'bg-white dark:bg-slate-800 text-secondary shadow-sm font-black' : 'text-slate-500'}`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setReminderLanguage('hinglish')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${reminderLanguage === 'hinglish' ? 'bg-white dark:bg-slate-800 text-secondary shadow-sm font-black' : 'text-slate-500'}`}
                    >
                      Hinglish
                    </button>
                  </div>

                  {/* Sync Historical Jobs */}
                  <button
                    onClick={handleTriggerBackfill}
                    disabled={actionLoading === 'backfill'}
                    className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-black shadow-sm transition-all inline-flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${actionLoading === 'backfill' ? 'animate-spin' : ''}`} />
                    <span>Sync Completed Jobs</span>
                  </button>
                </div>
              </div>

              {/* Status Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                  onClick={() => setReminderSubTab('due_today')}
                  className={`glass-card p-4 border-l-4 border-amber-500 cursor-pointer transition-all ${reminderSubTab === 'due_today' ? 'ring-2 ring-amber-500/50 bg-amber-50/20 dark:bg-amber-950/20' : 'bg-amber-50/10 dark:bg-amber-950/5'}`}
                >
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block">Due Today (1 Month)</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-black text-amber-500">{reminders.today?.length || 0}</span>
                    <span className="text-[10px] font-bold text-slate-400">Needs action</span>
                  </div>
                </div>

                <div 
                  onClick={() => setReminderSubTab('overdue')}
                  className={`glass-card p-4 border-l-4 border-rose-500 cursor-pointer transition-all ${reminderSubTab === 'overdue' ? 'ring-2 ring-rose-500/50 bg-rose-50/20 dark:bg-rose-950/20' : 'bg-rose-50/10 dark:bg-rose-950/5'}`}
                >
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block">Overdue Reminders</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-black text-rose-500">{reminders.overdue?.length || 0}</span>
                    <span className="text-[10px] font-bold text-slate-400">&gt; 30 Days</span>
                  </div>
                </div>

                <div 
                  onClick={() => setReminderSubTab('upcoming')}
                  className={`glass-card p-4 border-l-4 border-emerald-500 cursor-pointer transition-all ${reminderSubTab === 'upcoming' ? 'ring-2 ring-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20' : 'bg-emerald-50/10 dark:bg-emerald-950/5'}`}
                >
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block">Upcoming Reminders</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-black text-emerald-500">{reminders.upcoming?.length || 0}</span>
                    <span className="text-[10px] font-bold text-slate-400">Next 30 Days</span>
                  </div>
                </div>

                <div 
                  onClick={() => setReminderSubTab('all')}
                  className={`glass-card p-4 border-l-4 border-blue-500 cursor-pointer transition-all ${reminderSubTab === 'all' ? 'ring-2 ring-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20' : 'bg-blue-50/10 dark:bg-blue-950/5'}`}
                >
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block">All Customer Contacts</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-black text-blue-500">{totalCustomers || customers.length}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExportCSV('reminders'); }}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                      title="Export CSV"
                    >
                      <Download className="h-4 w-4 text-blue-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs Selector & Search Bar */}
              <div className="glass-card p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none w-full md:w-auto">
                  {[
                    { id: 'due_today', label: `Due Today (${reminders.today?.length || 0})`, icon: AlertTriangle },
                    { id: 'overdue', label: `Overdue (${reminders.overdue?.length || 0})`, icon: Clock },
                    { id: 'upcoming', label: `Upcoming (${reminders.upcoming?.length || 0})`, icon: Calendar },
                    { id: 'all', label: `All Customers Directory (${totalCustomers || customers.length})`, icon: Users },
                    { id: 'sent', label: `Sent History (${reminders.sent?.length || 0})`, icon: CheckCircle2 }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setReminderSubTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                        reminderSubTab === tab.id
                          ? 'bg-secondary text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Search customer name or phone..."
                    value={reminderSearch}
                    onChange={(e) => setReminderSearch(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-2 outline-none focus:border-secondary dark:text-white"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Bulk Action Bar for Reminders */}
              {selectedReminderIds.length > 0 && (
                <div className="flex items-center justify-between p-3.5 bg-emerald-600 text-white rounded-2xl shadow-lg animate-scale-up">
                  <div className="text-xs font-bold flex items-center space-x-2">
                    <span className="h-2 w-2 bg-white rounded-full animate-ping" />
                    <span>Selected <span className="underline font-black">{selectedReminderIds.length}</span> reminders.</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedReminderIds([])}
                      className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-black transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleBulkSendReminders}
                      disabled={actionLoading === 'bulk-reminders'}
                      className="px-4 py-1.5 rounded-xl bg-white text-emerald-700 hover:bg-slate-50 text-xs font-black transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === 'bulk-reminders' ? (
                        <>
                          <div className="h-3 w-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Bulk API Send</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Main List Display (Reminders OR All Customers Directory) */}
              {reminderSubTab === 'all' ? (
                /* All Customer Contacts Directory with 1-Month Next Due Date */
                <div className="glass-card p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-150/40 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center space-x-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>All Customers Service Reminder Directory</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Every client with contact number, last cleanup date, and their auto-scheduled 1-month reminder date.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-bold text-slate-600 dark:text-slate-300 min-w-[800px]">
                      <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Customer Name</th>
                          <th className="px-4 py-3">WhatsApp Number</th>
                          <th className="px-4 py-3">Last Service Taken</th>
                          <th className="px-4 py-3">Service Completed Date</th>
                          <th className="px-4 py-3">1-Month Due Date</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {customers
                          .filter((c) => {
                            if (!reminderSearch.trim()) return true;
                            const q = reminderSearch.toLowerCase().trim();
                            return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.serviceTaken || '').toLowerCase().includes(q);
                          })
                          .map((c) => (
                            <tr key={c._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                              <td className="px-4 py-3.5">
                                <span className="block text-slate-900 dark:text-white font-black cursor-pointer hover:underline" onClick={() => fetchCustomerProfile(c._id)}>
                                  {c.name}
                                </span>
                                <span className="text-[10px] text-slate-400">{c.company}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center space-x-1.5 font-black text-emerald-600 dark:text-emerald-400">
                                  <Phone className="h-3 w-3" />
                                  <span>{c.phone}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                                {c.serviceTaken || 'General Cleaning'}
                              </td>
                              <td className="px-4 py-3.5 text-slate-500">
                                {c.lastServiceDate ? new Date(c.lastServiceDate).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-3.5">
                                {c.nextReminderDate ? (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                    {new Date(c.nextReminderDate).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">30 Days After Service</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleDirectWhatsAppCustomer(c)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-sm transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                                  title="Send 1-Month Reminder via WhatsApp"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  <span>Chat on WhatsApp</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        {customers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-slate-400">
                              No customer contact records found. Click "Sync Completed Jobs" above to import.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Reminders View: Due Today / Overdue / Upcoming / Sent */
                <div className="glass-card p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-150/40 dark:border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                        {reminderSubTab === 'due_today' && "🔔 Customers Due for 1-Month Service Reminder Today"}
                        {reminderSubTab === 'overdue' && "⚠️ Overdue 1-Month Service Reminders"}
                        {reminderSubTab === 'upcoming' && "📅 Upcoming 1-Month Service Reminders"}
                        {reminderSubTab === 'sent' && "✅ Successfully Contacted Customers (History)"}
                      </span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-0.5 rounded-full font-bold">
                        {activeReminderList.length} total
                      </span>
                    </div>

                    {activeReminderList.length > 0 && reminderSubTab !== 'sent' && (
                      <label className="text-[10px] text-slate-400 font-extrabold flex items-center space-x-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={activeReminderList.length > 0 && activeReminderList.every((r: any) => selectedReminderIds.includes(r._id))}
                          onChange={(e) => {
                            const listIds = activeReminderList.map((r: any) => r._id);
                            if (e.target.checked) {
                              setSelectedReminderIds(prev => Array.from(new Set([...prev, ...listIds])));
                            } else {
                              setSelectedReminderIds(prev => prev.filter(id => !listIds.includes(id)));
                            }
                          }}
                          className="rounded border-slate-205 h-3.5 w-3.5 text-secondary outline-none focus:ring-0 cursor-pointer"
                        />
                        <span>Select All in View</span>
                      </label>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto pr-1">
                    {activeReminderList.map((r: any) => {
                      const isChecked = selectedReminderIds.includes(r._id);
                      const customer = r.customerId || {};
                      const daysDiff = Math.round((new Date(r.reminderDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isOverdue = daysDiff < 0;
                      const isToday = daysDiff === 0;

                      return (
                        <div key={r._id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 p-2 rounded-xl transition-all">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            {reminderSubTab !== 'sent' && (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedReminderIds([...selectedReminderIds, r._id]);
                                  } else {
                                    setSelectedReminderIds(selectedReminderIds.filter(id => id !== r._id));
                                  }
                                }}
                                className="rounded border-slate-205 text-secondary outline-none focus:ring-0 h-4 w-4 cursor-pointer"
                              />
                            )}
                            
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span 
                                  className="text-xs font-black text-slate-900 dark:text-white hover:underline cursor-pointer"
                                  onClick={() => fetchCustomerProfile(customer._id)}
                                >
                                  {customer.name || 'Valued Customer'}
                                </span>
                                <span className="inline-flex items-center space-x-1 font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  <Phone className="h-3 w-3" />
                                  <span>{customer.phone || 'No Phone'}</span>
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  Service: {r.serviceName}
                                </span>
                                <span>•</span>
                                <span>
                                  Completed: {customer.lastServiceDate ? new Date(customer.lastServiceDate).toLocaleDateString() : '30 days ago'}
                                </span>
                                <span>•</span>
                                <span className="font-extrabold text-blue-600 dark:text-blue-400">
                                  Reminder Due: {new Date(r.reminderDate).toLocaleDateString()}
                                </span>
                              </div>

                              {/* Overdue / Due Timeline Badge */}
                              <div className="mt-1">
                                {isToday && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                    🔔 Exactly 1 Month (30 Days) Completed — Due Today!
                                  </span>
                                )}
                                {isOverdue && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/30">
                                    ⚠️ Overdue by {Math.abs(daysDiff)} Days
                                  </span>
                                )}
                                {!isToday && !isOverdue && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                                    📅 Due in {daysDiff} Days
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2 self-end md:self-center">
                            <button
                              type="button"
                              onClick={() => handleDirectWhatsAppReminder(r)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-sm transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                              title="Opens WhatsApp Web/App directly with pre-filled message & marks reminder as sent"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>Chat on WhatsApp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendReminder(r._id)}
                              disabled={actionLoading === r._id}
                              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                              title="Send automated message via Meta Cloud API"
                            >
                              <Send className="h-3 w-3" />
                              <span>{actionLoading === r._id ? 'Sending...' : 'API Send'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {activeReminderList.length === 0 && (
                      <div className="text-center py-12 text-slate-400 space-y-2">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                        <p className="text-xs font-bold">No reminders found in this category.</p>
                        <p className="text-[11px] text-slate-400">All customer services are up to date!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: WHATSAPP MARKETING & BROADCASTS */}
          {activeTab === 'marketing' && (
            <div className="space-y-6">
              {/* Marketing Header & Pre-made Offer Presets */}
              <div className="glass-card p-5 border-l-4 border-secondary bg-gradient-to-r from-secondary/5 via-transparent to-transparent space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                      <Send className="h-4 w-4 text-secondary" />
                      <span>WhatsApp Marketing & Offer Broadcasting</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Select past customer numbers, choose or compose an offer discount, and broadcast via 1-Click WhatsApp Direct or Bulk API dispatch.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                      Selected: {selectedCustomerIds.length} Customers
                    </span>
                  </div>
                </div>

                {/* 1-Click Offer Presets */}
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">
                    ⚡ Quick 1-Click Offer Presets (Click to Load):
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {MARKETING_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyMarketingPreset(preset)}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-secondary hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-all cursor-pointer group shadow-sm"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-black text-slate-800 dark:text-white group-hover:text-secondary transition-colors">
                            {preset.name}
                          </span>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-secondary/10 text-secondary">
                            {preset.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1">
                          {preset.template.split('\n')[0]}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2-Column Responsive Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Column 1: Customer Selection & Filter Directory (7 Cols) */}
                <div className="lg:col-span-7 glass-card p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-150/40 dark:border-slate-800 pb-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center space-x-2">
                        <Users className="h-4 w-4 text-emerald-500" />
                        <span>Select Customer Numbers ({customers.length})</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Check the boxes of customers you want to receive this offer.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleSelectAllCustomers}
                        className="px-3 py-1.5 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary hover:text-white text-[11px] font-black uppercase transition-all cursor-pointer"
                      >
                        {selectedCustomerIds.length === customers.length && customers.length > 0 ? 'Deselect All' : 'Select All'}
                      </button>
                      {selectedCustomerIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerIds([])}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] font-black uppercase transition-all cursor-pointer"
                        >
                          Clear ({selectedCustomerIds.length})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="space-y-2.5">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by customer name or phone number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-2 outline-none focus:border-secondary dark:text-white"
                      />
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    </div>

                    {/* Quick Filter Pills */}
                    <div className="flex flex-wrap gap-2 text-[10px] font-extrabold">
                      <button
                        type="button"
                        onClick={() => { setFilterInactiveDays(''); setFilterMinSpent(''); }}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${!filterInactiveDays && !filterMinSpent ? 'bg-secondary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterInactiveDays('30')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${filterInactiveDays === '30' ? 'bg-secondary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                      >
                        Inactive 30+ Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterInactiveDays('60')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${filterInactiveDays === '60' ? 'bg-secondary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                      >
                        Inactive 60+ Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMinSpent('1500')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${filterMinSpent === '1500' ? 'bg-secondary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                      >
                        Spent &gt; ₹1,500
                      </button>
                    </div>
                  </div>

                  {/* Customer Table List */}
                  <div className="max-h-[460px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {customers.map((c) => {
                      const isSelected = selectedCustomerIds.includes(c._id);
                      return (
                        <div
                          key={c._id}
                          onClick={() => !c.marketingOptOut && handleSelectCustomer(c._id)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-secondary/5 dark:bg-secondary/10'
                              : 'hover:bg-slate-50/60 dark:hover:bg-slate-900/30'
                          } ${c.marketingOptOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={c.marketingOptOut}
                              onChange={() => {}} // handled by parent onClick
                              className="rounded border-slate-205 text-secondary outline-none focus:ring-0 h-4 w-4 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                  {c.name}
                                </span>
                                {c.marketingOptOut && (
                                  <span className="text-[8px] bg-rose-500/10 text-rose-500 px-1.5 py-0.2 rounded font-black uppercase">
                                    Opted Out
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="font-extrabold text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                                  <Phone className="h-2.5 w-2.5" />
                                  <span>{c.phone}</span>
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-[10px] text-slate-400 truncate">
                                  {c.serviceTaken || 'General Clean'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right text-[10px] text-slate-400">
                            <span className="block font-bold text-slate-700 dark:text-slate-300">
                              ₹{c.totalAmountSpent?.toLocaleString() || 0}
                            </span>
                            <span>{c.lastServiceDate ? new Date(c.lastServiceDate).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                      );
                    })}

                    {customers.length === 0 && (
                      <div className="text-center py-10 text-slate-400 text-xs font-bold">
                        No customer contacts found matching active filters.
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Offer Composer & Dispatcher (5 Cols) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="glass-card p-6 space-y-4">
                    <div className="border-b border-slate-150/40 dark:border-slate-800 pb-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-secondary" />
                        <span>Compose Offer & Broadcast</span>
                      </h4>
                    </div>

                    <form onSubmit={handleCreateCampaign} className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">
                          Campaign / Offer Name:
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Diwali Dhamaka 20% OFF"
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">
                            Offer Value / Code:
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 20% OFF"
                            value={offerText}
                            onChange={(e) => setOfferText(e.target.value)}
                            className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">
                            Schedule Later:
                          </label>
                          <div className="flex items-center space-x-2 pt-1.5">
                            <input
                              type="checkbox"
                              checked={scheduleCampaign}
                              onChange={(e) => setScheduleCampaign(e.target.checked)}
                              className="rounded border-slate-205 text-secondary"
                            />
                            <span className="text-xs text-slate-500 font-bold">Schedule</span>
                          </div>
                        </div>
                      </div>

                      {scheduleCampaign && (
                        <input
                          type="datetime-local"
                          required
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 outline-none focus:border-secondary dark:text-white"
                        />
                      )}

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
                            Offer Message Text:
                          </label>
                          <span className="text-[9px] text-slate-400 font-bold">Tags: {"{{customer_name}}"}, {"{{offer}}"}</span>
                        </div>
                        <textarea
                          rows={5}
                          required
                          value={campaignMessage}
                          onChange={(e) => setCampaignMessage(e.target.value)}
                          className="w-full text-xs font-semibold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white leading-relaxed font-mono"
                        />
                      </div>

                      {/* Live WhatsApp Mockup Preview */}
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block mb-1.5">
                          Live WhatsApp Message Preview:
                        </span>
                        <div className="border border-emerald-500/20 rounded-2xl p-3.5 bg-emerald-500/[0.03] space-y-2">
                          <div className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-600 flex items-center space-x-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>Preview for Rahul Sharma (+91 98765 43210)</span>
                          </div>
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-100 dark:border-slate-800">
                            {campaignPreviewMessage}
                          </div>
                        </div>
                      </div>

                      {/* Dual Action Buttons */}
                      <div className="pt-2 space-y-2">
                        {/* 1-Click WhatsApp Direct Queue */}
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedCustomerIds.length === 0) {
                              alert('Please select at least 1 customer number from the left table first.');
                              return;
                            }
                            setDirectQueueIndex(0);
                            setDirectQueueSentIds([]);
                            setShowDirectQueueModal(true);
                          }}
                          disabled={selectedCustomerIds.length === 0}
                          className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-sm tracking-wider uppercase transition-all cursor-pointer inline-flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>1-Click Direct WhatsApp Queue ({selectedCustomerIds.length})</span>
                        </button>

                        {/* Bulk Send via API */}
                        <button
                          type="submit"
                          disabled={actionLoading === 'campaign' || selectedCustomerIds.length === 0}
                          className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-black shadow-sm tracking-wider uppercase transition-all cursor-pointer inline-flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{scheduleCampaign ? 'Schedule Campaign via API' : `Bulk Send via API (${selectedCustomerIds.length})`}</span>
                        </button>
                      </div>
                    </form>
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

                  <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-sm">
                    <input
                      type="checkbox"
                      checked={filterRepeatOnly}
                      onChange={(e) => setFilterRepeatOnly(e.target.checked)}
                      className="rounded border-slate-205 text-secondary outline-none focus:ring-1 focus:ring-secondary"
                    />
                    <span>Repeat Only</span>
                  </label>

                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all inline-flex items-center space-x-2 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add to Contact</span>
                  </button>

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

          {activeTab === 'history' && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-150/40 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">WhatsApp Communication History Log</h3>
                  <p className="text-[10px] text-slate-400">Full audit log feed of all transactional service alerts and promo campaigns dispatched.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <input
                      type="text"
                      placeholder="Search name, phone, offer..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full sm:w-60 text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-2 outline-none focus:border-secondary dark:text-white"
                    />
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <button
                    onClick={() => handleExportCSV('history')}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm transition-all inline-flex items-center space-x-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Sub-Tabs: Section Split */}
              <div className="flex space-x-2 border-b border-slate-100 dark:border-slate-800 pb-0.5">
                <button
                  onClick={() => setFilterMessageType('marketing')}
                  className={`pb-2 px-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                    filterMessageType === 'marketing'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-450'
                      : 'border-transparent text-slate-400 hover:text-slate-655'
                  }`}
                >
                  📢 Marketing Blasts History
                </button>
                <button
                  onClick={() => setFilterMessageType('reminder')}
                  className={`pb-2 px-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                    filterMessageType === 'reminder'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-450'
                      : 'border-transparent text-slate-400 hover:text-slate-655'
                  }`}
                >
                  🔔 Service Reminders History
                </button>
                <button
                  onClick={() => setFilterMessageType('All')}
                  className={`pb-2 px-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                    filterMessageType === 'All'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-450'
                      : 'border-transparent text-slate-400 hover:text-slate-655'
                  }`}
                >
                  All Logs Combined
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
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredHistory.map((h) => (
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
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setEditingLog(h);
                                setEditMessageText(h.messageText);
                              }}
                              className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-555 dark:text-slate-400 cursor-pointer transition-all"
                              title="Edit Message Text"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteLog(h._id)}
                              disabled={actionLoading === `delete-${h._id}`}
                              className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 cursor-pointer transition-all disabled:opacity-50"
                              title="Delete Message Record"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">No matching message logs found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Edit Message Log Modal */}
              {editingLog && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <div className="glass-card max-w-lg w-full p-6 space-y-4 animate-scale-up">
                    <div className="flex justify-between items-center border-b border-slate-150/40 dark:border-slate-800 pb-3">
                      <h3 className="text-xs font-black uppercase text-slate-855 dark:text-white flex items-center space-x-1.5">
                        <Edit2 className="h-4 w-4 text-emerald-500" />
                        <span>📝 Edit Message Log Record</span>
                      </h3>
                      <button onClick={() => setEditingLog(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-extrabold uppercase mb-1">Recipient Name</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">{editingLog.recipientName} ({editingLog.phoneNumber})</span>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1">Message Text Content:</label>
                        <textarea
                          value={editMessageText}
                          onChange={(e) => setEditMessageText(e.target.value)}
                          rows={6}
                          className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-slate-150/40 dark:border-slate-800">
                      <button
                        onClick={() => setEditingLog(null)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-500 hover:bg-slate-55 dark:hover:bg-slate-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleEditLog(editingLog._id)}
                        disabled={actionLoading === `edit-${editingLog._id}`}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading === `edit-${editingLog._id}` ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                      <span className="block text-xs font-extrabold text-slate-800 dark:text-white">Automatic Service Reminders</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">If disabled, reminders remain pending for manual dispatch instead of auto-sending.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableAutoReminders}
                        onChange={(e) => setEnableAutoReminders(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-350 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-655 peer-checked:bg-secondary"></div>
                    </label>
                  </div>

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

                  {useMockApi ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-[10px] font-bold">
                      ⚠️ API Simulation Mock Mode is ON. WhatsApp messages are simulated in the history log but will NOT be sent to real phones. Turn this off and enter Meta Credentials below to send actual WhatsApp messages.
                    </div>
                  ) : (
                    <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4 animate-slide-in">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-455">🏢 Company WhatsApp Gateway Credentials</h4>
                      
                      {/* SofaShine Credentials */}
                      <div className="p-3 border border-slate-150/40 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-950/10 space-y-2.5">
                        <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800 dark:text-white">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>SofaShine (Sender ID: 9315576914)</span>
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">WhatsApp Phone Number ID:</label>
                          <input
                            type="text"
                            placeholder="e.g. 1048473950293"
                            value={sofaShinePhoneNumberId}
                            onChange={(e) => setSofaShinePhoneNumberId(e.target.value)}
                            className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">WhatsApp Access Token:</label>
                          <input
                            type="password"
                            placeholder="EAAGz..."
                            value={sofaShineAccessToken}
                            onChange={(e) => setSofaShineAccessToken(e.target.value)}
                            className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                          />
                        </div>
                      </div>

                      {/* CleanCruisers Credentials */}
                      <div className="p-3 border border-slate-150/40 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-950/10 space-y-2.5">
                        <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800 dark:text-white">
                          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                          <span>CleanCruisers (Sender ID: 8920230357)</span>
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">WhatsApp Phone Number ID:</label>
                          <input
                            type="text"
                            placeholder="e.g. 1048473950294"
                            value={cleanCruisersPhoneNumberId}
                            onChange={(e) => setCleanCruisersPhoneNumberId(e.target.value)}
                            className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">WhatsApp Access Token:</label>
                          <input
                            type="password"
                            placeholder="EAAGz..."
                            value={cleanCruisersAccessToken}
                            onChange={(e) => setCleanCruisersAccessToken(e.target.value)}
                            className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

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

      {/* POPUP / MODAL: Add Customer Contact Manual Entry */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl border border-slate-205 dark:border-slate-800 shadow-2xl p-6 relative flex flex-col space-y-4 animate-scale-up text-slate-800 dark:text-slate-100">
            <button
              onClick={() => setShowAddContactModal(false)}
              className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <span className="text-[9px] uppercase tracking-wider text-emerald-500 font-extrabold block">Manual Database Entry</span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1 uppercase">Add New Customer Contact</h3>
              <p className="text-[10px] text-slate-400">Instantly seed a customer into the WhatsApp marketing and reminders cycle.</p>
            </div>

            <form onSubmit={handleAddContactSubmit} className="space-y-3.5 text-xs font-bold text-slate-500">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full text-xs font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +919876543210"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="w-full text-xs font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. +919876543211"
                    value={newContactAltPhone}
                    onChange={(e) => setNewContactAltPhone(e.target.value)}
                    className="w-full text-xs font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    className="w-full text-xs font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Company / Brand</label>
                  <select
                    value={newContactCompany}
                    onChange={(e) => setNewContactCompany(e.target.value)}
                    className="w-full text-xs font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                  >
                    <option value="SofaShine">SofaShine</option>
                    <option value="CleanCruisers">CleanCruisers</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Service Taken</label>
                  <input
                    type="text"
                    placeholder="e.g. Sofa Cleaning"
                    value={newContactService}
                    onChange={(e) => setNewContactService(e.target.value)}
                    className="w-full text-xs font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Total Amount Spent (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={newContactSpent}
                    onChange={(e) => setNewContactSpent(e.target.value)}
                    className="w-full text-xs font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Last Cleanup Date</label>
                <input
                  type="date"
                  value={newContactLastDate}
                  onChange={(e) => setNewContactLastDate(e.target.value)}
                  className="w-full text-xs font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-150/40 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-400 text-xs font-bold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'add-contact'}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {actionLoading === 'add-contact' ? (
                    <>
                      <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Contact</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT WHATSAPP MARKETING QUEUE MODAL */}
      {showDirectQueueModal && selectedCustomersData.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Direct WhatsApp Sender Queue
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDirectQueueModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Queue Counter & Progress bar */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Contact {Math.min(directQueueIndex + 1, selectedCustomersData.length)} of {selectedCustomersData.length}</span>
                <span className="text-emerald-500 font-black">
                  {directQueueSentIds.length} Sent ({Math.round((directQueueSentIds.length / selectedCustomersData.length) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${(directQueueSentIds.length / selectedCustomersData.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Recipient Info */}
            {selectedCustomersData[directQueueIndex] ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                      {selectedCustomersData[directQueueIndex]?.name}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 mt-0.5">
                      <Phone className="h-3 w-3" />
                      <span>{selectedCustomersData[directQueueIndex]?.phone}</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {selectedCustomersData[directQueueIndex]?.serviceTaken || 'General'}
                  </span>
                </div>

                {/* Message preview for this recipient */}
                <div className="p-3 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-2xl space-y-1.5">
                  <span className="text-[9px] uppercase font-black tracking-wider text-emerald-600">Personalized Message:</span>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                    {campaignMessage
                      .replace(/{{customer_name}}/g, selectedCustomersData[directQueueIndex]?.name || 'Valued Customer')
                      .replace(/{{service_name}}/g, selectedCustomersData[directQueueIndex]?.serviceTaken || 'our service')
                      .replace(/{{offer}}/g, offerText)
                      .replace(/{{company_name}}/g, selectedCustomersData[directQueueIndex]?.company || 'ShineStaff')}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={directQueueIndex === 0}
                    onClick={() => setDirectQueueIndex(prev => Math.max(0, prev - 1))}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    Previous
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (directQueueIndex < selectedCustomersData.length - 1) {
                          setDirectQueueIndex(prev => prev + 1);
                        } else {
                          setShowDirectQueueModal(false);
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Skip
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const currentCust = selectedCustomersData[directQueueIndex];
                        if (currentCust?.phone) {
                          const msg = campaignMessage
                            .replace(/{{customer_name}}/g, currentCust.name || 'Valued Customer')
                            .replace(/{{service_name}}/g, currentCust.serviceTaken || 'our service')
                            .replace(/{{offer}}/g, offerText)
                            .replace(/{{company_name}}/g, currentCust.company || 'ShineStaff');
                          const url = generateWhatsAppUrl(currentCust.phone, msg);
                          window.open(url, '_blank');

                          if (!directQueueSentIds.includes(currentCust._id)) {
                            setDirectQueueSentIds(prev => [...prev, currentCust._id]);
                          }

                          if (directQueueIndex < selectedCustomersData.length - 1) {
                            setDirectQueueIndex(prev => prev + 1);
                          } else {
                            alert('All selected customers have been queued!');
                            setShowDirectQueueModal(false);
                          }
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-md transition-all inline-flex items-center space-x-2 cursor-pointer"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Chat on WhatsApp & Next &rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">All selected customers sent!</h4>
                <button
                  type="button"
                  onClick={() => setShowDirectQueueModal(false)}
                  className="mt-4 px-4 py-2 bg-secondary text-white text-xs font-bold rounded-xl"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminWhatsAppEngagement;
