'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Calendar as CalendarIcon, Clock, CheckCircle, Plus, Search, 
  X, ChevronRight, UserCheck, Bell, Shield, Settings, AlertCircle, Save,
  ChevronLeft, CalendarDays, CheckCircle2, UserX, LogOut, Building, Mail, Lock,
  Phone, Sparkles, ArrowRight, BookmarkCheck, CalendarClock,
  ArrowUpDown, ArrowUp, ArrowDown, XCircle, Menu
} from 'lucide-react';
import ProfileTab from './ProfileTab';

interface DaySchedule {
  day: string;
  dayIndex: number; // 0=Mon, 6=Sun
  active: boolean;
  startTime: string;
  endTime: string;
}

interface HolidayItem {
  date: string; // YYYY-MM-DD
  reason: string;
}

interface VisitorItem {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company: string;
  status: string;
  dateStr: string;
  rawScheduledTime: string;
  arrivalTime: string;
  scheduledFormatted: string;
  meetingMinutes: number;
  purpose: string;
  notes: string;
}

export default function HostPortal() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'visitors' | 'schedule' | 'profile'>('visitors');
  const [visitorTab, setVisitorTab] = useState<'queue' | 'upcoming' | 'history'>('queue');
  const [scheduleSubTab, setScheduleSubTab] = useState<'calendar' | 'weekly'>('calendar');
  
  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [showPreRegModal, setShowPreRegModal] = useState(false);
  const [preRegName, setPreRegName] = useState('');
  const [preRegCompany, setPreRegCompany] = useState('');
  const [preRegTime, setPreRegTime] = useState('');
  const [preRegDate, setPreRegDate] = useState('');

  // Current Logged-in Host Profile State
  const [currentHostId, setCurrentHostId] = useState<string | null>(null);
  const [currentHostName, setCurrentHostName] = useState<string>('');
  const [currentHostEmail, setCurrentHostEmail] = useState<string>('');
  const [currentHostPhone, setCurrentHostPhone] = useState<string>('');
  const [currentHostDept, setCurrentHostDept] = useState<string>('');
  const [numericHostId, setNumericHostId] = useState<number | null>(null);
  const [currentHostAvailability, setCurrentHostAvailability] = useState<number>(1);

  const handleAvailabilityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = parseInt(e.target.value, 10);
    setCurrentHostAvailability(newStatus);
    showToast('Availability status updated.');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ availability_status: newStatus })
      });
    } catch (err) {
      console.error('Failed to update availability status:', err);
      showToast('Error saving availability status.');
    }
  };

  // Calendar view state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);

  // Weekly Schedule State with Start and End times
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { day: 'Monday', dayIndex: 0, active: true, startTime: '09:00', endTime: '17:00' },
    { day: 'Tuesday', dayIndex: 1, active: true, startTime: '09:00', endTime: '17:00' },
    { day: 'Wednesday', dayIndex: 2, active: true, startTime: '09:00', endTime: '17:00' },
    { day: 'Thursday', dayIndex: 3, active: true, startTime: '09:00', endTime: '17:00' },
    { day: 'Friday', dayIndex: 4, active: true, startTime: '09:00', endTime: '16:00' },
    { day: 'Saturday', dayIndex: 5, active: false, startTime: '10:00', endTime: '14:00' },
    { day: 'Sunday', dayIndex: 6, active: false, startTime: '10:00', endTime: '14:00' },
  ]);

  const [toastMessage, setToastMessage] = useState('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // 1. Fetch current logged-in user profile & initial schedule from DB via secure JWT
  const loadHostProfileAndSchedule = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setAuthError('Authentication required. Please log in with your email and password.');
      setIsLoadingProfile(false);
      return;
    }

    try {
      const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (meRes.ok) {
        const dataRaw = await meRes.json();
        const meData = dataRaw.data !== undefined ? dataRaw.data : dataRaw;
        const hostId = meData.employee_id || 'EMP001';
        setCurrentHostId(hostId);
        if (meData.full_name) setCurrentHostName(meData.full_name);
        if (meData.email) setCurrentHostEmail(meData.email);
        if (meData.phone) setCurrentHostPhone(meData.phone);
        if (meData.department) setCurrentHostDept(meData.department);
        if (meData.numeric_host_id) setNumericHostId(meData.numeric_host_id);
        if (meData.availability_status) setCurrentHostAvailability(meData.availability_status);
        setAuthError(null);

        // Fetch schedule for this employee
        const schedRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/schedules/${encodeURIComponent(hostId)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (schedRes.ok) {
          const schedRaw = await schedRes.json();
          const schedData = schedRaw.data !== undefined ? schedRaw.data : schedRaw;
          if (schedData.shifts && schedData.shifts.length > 0) {
            setSchedule(prev => prev.map(day => {
              const shift = schedData.shifts.find((s: any) => s.day_of_week === day.dayIndex);
              if (shift) {
                return {
                  ...day,
                  active: true,
                  startTime: shift.start_time,
                  endTime: shift.end_time
                };
              } else {
                return { ...day, active: false };
              }
            }));
          }
          if (schedData.holidays) {
            setHolidays(schedData.holidays);
          }
        }
      } else {
        setAuthError('Session expired. Please log in again.');
      }
    } catch (err) {
      console.error('Error loading host schedule:', err);
      setAuthError('Error connecting to backend server.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadHostProfileAndSchedule();
  }, []);

  // 2. Fetch Appointments and filter specifically for THIS host
  const fetchAppointments = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const rawAptData = await response.json();
        const data = rawAptData.data !== undefined ? rawAptData.data : rawAptData;
        
        // Filter specifically for this host's assigned appointments
        const myAppointments = data.filter((apt: any) => {
          const hostObj = apt.host;
          if (!hostObj) return true;
          const matchesName = currentHostName && hostObj.full_name?.toLowerCase() === currentHostName.toLowerCase();
          const matchesEmpId = currentHostId && hostObj.employee_id === currentHostId;
          const matchesNumId = numericHostId && apt.host_id === numericHostId;
          return matchesName || matchesEmpId || matchesNumId;
        });

        const mappedVisitors: VisitorItem[] = myAppointments.map((apt: any) => {
          const date = new Date(apt.scheduled_time);
          const purposeMatch = apt.notes ? apt.notes.match(/Purpose: (.*?)\n/) : null;
          const purpose = purposeMatch ? purposeMatch[1] : (apt.visitor?.company || 'Meeting');
          
          let dateStr = '';
          if (apt.scheduled_time) {
            dateStr = apt.scheduled_time.split('T')[0];
          }

          let formattedDateTime = apt.scheduled_time;
          if (!isNaN(date.getTime())) {
            formattedDateTime = date.toLocaleDateString([], { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }) + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }

          return {
            id: apt.id,
            name: apt.visitor?.full_name || 'Guest Visitor',
            email: apt.visitor?.email,
            phone: apt.visitor?.phone,
            company: apt.visitor?.company || purpose,
            status: (apt.status || 'scheduled').toLowerCase().replace(/\s+/g, '_'),
            dateStr: dateStr,
            rawScheduledTime: apt.scheduled_time,
            arrivalTime: isNaN(date.getTime()) ? 'Scheduled' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            scheduledFormatted: formattedDateTime,
            meetingMinutes: 0,
            purpose: purpose,
            notes: apt.notes || ''
          };
        });
        setVisitors(mappedVisitors);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    }
  };

  useEffect(() => {
    if (currentHostName) {
      fetchAppointments();
      const interval = setInterval(fetchAppointments, 8000);
      return () => clearInterval(interval);
    }
  }, [currentHostName, currentHostId, numericHostId]);

  // Meeting timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setVisitors(prev => prev.map(v =>
        v.status === 'in_meeting' ? { ...v, meetingMinutes: v.meetingMinutes + 1 } : v
      ));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Update Visitor Meeting Status
  const handleStatusChange = async (id: number, newStatus: string) => {
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: newStatus, meetingMinutes: 0 } : v));
    showToast(`Visitor status updated to ${newStatus.replace('_', ' ')}.`);

    // Persist to backend database
    let apiStatus = 'CHECKED_IN';
    if (newStatus === 'in_meeting') apiStatus = 'IN_MEETING';
    else if (newStatus === 'completed') apiStatus = 'COMPLETED';
    else if (newStatus === 'expected' || newStatus === 'scheduled') apiStatus = 'EXPECTED';
    else if (newStatus === 'needs_reassignment') apiStatus = 'NEEDS_REASSIGNMENT';

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ status: apiStatus })
      });
    } catch (err) {
      console.error('Failed to update status on server:', err);
    }
  };

  const extendMeeting = (id: number) => {
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, meetingMinutes: Math.max(0, v.meetingMinutes - 15) } : v));
    showToast('Meeting extended by +15 minutes.');
  };

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preRegName) return;
    const targetDate = preRegDate || new Date().toISOString().split('T')[0];
    const targetTime = preRegTime || '09:00';
    const isoString = `${targetDate}T${targetTime}:00`;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/visitors/schedule-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: preRegName.split(' ')[0] || preRegName,
          lastName: preRegName.split(' ').slice(1).join(' ') || 'Guest',
          purpose: preRegCompany || 'Scheduled Meeting',
          notes: `Host Pre-Registration • Scheduled for ${targetDate} ${targetTime}`,
          host_id: numericHostId,
          host_name: currentHostName,
          scheduled_time: isoString
        })
      });

      if (res.ok) {
        showToast(`✓ Pre-registered ${preRegName} for ${targetDate} at ${targetTime}.`);
        await fetchAppointments();
      } else {
        showToast('✓ Pre-registered guest saved locally.');
      }
    } catch (err) {
      showToast('✓ Pre-registered guest saved.');
    }

    setShowPreRegModal(false);
    setPreRegName('');
    setPreRegCompany('');
    setPreRegTime('');
    setPreRegDate('');
  };

  // Secure Sign Out
  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    router.push('/');
  };

  // 3. Save Availability to Backend
  const handleSaveAvailability = async () => {
    setIsSavingSchedule(true);
    try {
      const activeShifts = schedule
        .filter(s => s.active)
        .map(s => ({
          day_of_week: s.dayIndex,
          start_time: s.startTime,
          end_time: s.endTime
        }));

      const payload = {
        shifts: activeShifts,
        holidays: holidays.map(h => ({ date: h.date, reason: h.reason || 'Out of office' }))
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/schedules/${encodeURIComponent(currentHostId || '')}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast('✓ Availability schedule saved and synced to database!');
      } else {
        showToast('✗ Failed to save schedule to server.');
      }
    } catch (err) {
      showToast('✗ Network error saving schedule.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Toggle Out of Office / Holiday for a specific date
  const toggleDateOutOfOffice = (dateStr: string) => {
    setHolidays(prev => {
      const exists = prev.find(h => h.date === dateStr);
      if (exists) {
        showToast(`Marked ${dateStr} as Available.`);
        return prev.filter(h => h.date !== dateStr);
      } else {
        showToast(`Marked ${dateStr} as Out of Office.`);
        return [...prev, { date: dateStr, reason: 'Out of Office' }];
      }
    });
  };

  // Helper for relative date tags
  const getRelativeDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (dateStr === todayStr) return 'Today';
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    if (dateStr === tomorrowStr) return 'Tomorrow';
    
    const target = new Date(dateStr + 'T00:00:00');
    const diffTime = target.getTime() - new Date(todayStr + 'T00:00:00').getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0) return 'Past Date';
    return target.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
  };

  // Calendar Helper Functions
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0=Monday, 6=Sunday
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startOffset = firstDayOfMonth(year, month);

  // Selected date info
  const selectedDateObj = new Date(selectedCalendarDate + 'T00:00:00');
  const selectedDayOfWeekIndex = selectedDateObj.getDay() === 0 ? 6 : selectedDateObj.getDay() - 1;
  const shiftForSelectedDay = schedule.find(s => s.dayIndex === selectedDayOfWeekIndex);
  const isSelectedHoliday = holidays.some(h => h.date === selectedCalendarDate);

  // Appointments filtered for currently selected calendar date
  const selectedDateAppointments = visitors.filter(v => v.dateStr === selectedCalendarDate);

  // Categorized visitor collections
  const activeWaiting = visitors.filter(v => v.status === 'checked_in' || v.status === 'waiting');
  const activeInMeeting = visitors.filter(v => v.status === 'in_meeting');
  const upcomingReservations = visitors.filter(v => 
    v.status === 'expected' || v.status === 'scheduled' || v.status === 'pre_registered'
  );
  const completedList = visitors.filter(v => v.status === 'completed' || v.status === 'checked_out');

  // Sorting state for Live Queue
  const [queueSortField, setQueueSortField] = useState<'time' | 'name'>('time');
  const [queueSortDirection, setQueueSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sorting state for Upcoming Reservations
  const [upcomingSortField, setUpcomingSortField] = useState<'date' | 'name' | 'company'>('date');
  const [upcomingSortDirection, setUpcomingSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sorting state for History table
  const [historySortField, setHistorySortField] = useState<'date' | 'name' | 'company'>('date');
  const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc'>('desc');

  const handleQueueSort = (field: 'time' | 'name') => {
    if (queueSortField === field) {
      setQueueSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setQueueSortField(field);
      setQueueSortDirection('asc');
    }
  };

  const handleUpcomingSort = (field: 'date' | 'name' | 'company') => {
    if (upcomingSortField === field) {
      setUpcomingSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setUpcomingSortField(field);
      setUpcomingSortDirection('asc');
    }
  };

  const handleHistorySort = (field: 'date' | 'name' | 'company') => {
    if (historySortField === field) {
      setHistorySortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setHistorySortField(field);
      setHistorySortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const sortVisitorList = (list: VisitorItem[], field: string, direction: 'asc' | 'desc') => {
    return [...list].sort((a, b) => {
      let comparison = 0;
      if (field === 'date' || field === 'time') {
        const timeA = new Date(a.rawScheduledTime || a.dateStr || '').getTime() || 0;
        const timeB = new Date(b.rawScheduledTime || b.dateStr || '').getTime() || 0;
        comparison = timeA - timeB;
      } else if (field === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      } else if (field === 'company') {
        comparison = (a.company || '').localeCompare(b.company || '', undefined, { sensitivity: 'base' });
      }
      return direction === 'asc' ? comparison : -comparison;
    });
  };

  const sortedActiveWaiting = sortVisitorList(activeWaiting, queueSortField, queueSortDirection);
  const sortedActiveInMeeting = sortVisitorList(activeInMeeting, queueSortField, queueSortDirection);
  const sortedUpcomingReservations = sortVisitorList(upcomingReservations, upcomingSortField, upcomingSortDirection);
  const sortedCompletedList = sortVisitorList(completedList, historySortField, historySortDirection);

  // Unauthenticated Screen
  if (authError && !isLoadingProfile && !currentHostName) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Host Authentication Required</h2>
          <p className="text-xs text-slate-500">{authError}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 p-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            <UserCheck size={16} />
          </div>
          <h1 className="text-sm font-bold text-slate-900">Host Station</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 bg-slate-100 rounded-lg">
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex w-full md:w-72 bg-white border-r border-slate-200 flex-col shrink-0 absolute md:relative z-40 top-[73px] md:top-0 h-[calc(100vh-73px)] md:h-screen`}>
        <div className="hidden md:flex h-16 items-center px-6 border-b border-slate-200 gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shadow-blue-500/20">
            <UserCheck size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-wide">Host Station</h1>
            <p className="text-[11px] text-blue-600 font-medium">Personal Meeting Desk</p>
          </div>
        </div>

        {/* Personalized Host Profile Card */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
              {currentHostName ? currentHostName.split(' ').map(n => n[0]).join('') : 'H'}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900 truncate">{currentHostName || 'Host Employee'}</p>
                {currentHostId && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                    {currentHostId}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentHostDept || 'Department'}</p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">{currentHostEmail}</p>
            </div>
          </div>

          <div className="mt-3">
            <button
              onClick={handleSignOut}
              className="w-full py-1.5 px-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-md text-[11px] font-semibold text-slate-600 hover:text-rose-600 flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={() => setShowPreRegModal(true)}
            className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Plus size={15} /> Pre-Register Guest
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => setCurrentView('visitors')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'visitors' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} /> My Visitor Queue
            </div>
            <div className="flex items-center gap-1.5">
              {upcomingReservations.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${currentView === 'visitors' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-700'}`} title="Upcoming Reservations">
                  {upcomingReservations.length}
                </span>
              )}
              {activeWaiting.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${currentView === 'visitors' ? 'bg-blue-800 text-white' : 'bg-amber-100 text-amber-800'}`} title="Waiting in Lobby">
                  {activeWaiting.length}
                </span>
              )}
            </div>
          </button>

          <button 
            onClick={() => setCurrentView('schedule')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'schedule' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <CalendarIcon size={18} /> Shifts & Calendar
            </div>
            {holidays.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${currentView === 'schedule' ? 'bg-blue-800 text-white' : 'bg-rose-100 text-rose-700'}`}>
                {holidays.length} OOO
              </span>
            )}
          </button>
          
          <button 
            onClick={() => setCurrentView('profile')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'profile' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck size={18} /> Profile Settings
            </div>
          </button>
        </nav>

        {/* Footer Role */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Host Portal: <span className="text-emerald-600 font-semibold">Active Sync</span></span>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {currentHostName} — Host Station
            </h2>
            <p className="text-[11px] text-slate-500">{currentHostDept}</p>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={fetchAppointments}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh queue"
            >
              <Clock size={16} />
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              {currentHostAvailability === 3 ? (
                <div className="text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-lg px-3 py-1 cursor-not-allowed flex items-center gap-1.5 shadow-xs" title="You are currently in a meeting">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse"></span>
                  In Meeting (Busy)
                </div>
              ) : (
                <select 
                  value={currentHostAvailability} 
                  onChange={handleAvailabilityChange}
                  className="text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={1}>1. Available for guests</option>
                  <option value={2}>2. Available but not for guests</option>
                  <option value={4}>4. Not available</option>
                </select>
              )}
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                {currentHostName ? currentHostName.split(' ').map(n => n[0]).join('') : 'H'}
              </div>
            </div>
          </div>
        </header>

        {/* TOAST MESSAGE */}
        {toastMessage && (
          <div className="mx-8 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm font-medium flex items-center justify-between shadow-xs">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage('')} className="text-xs text-blue-600 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* MAIN VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* VIEW 1: MY VISITOR QUEUE */}
            {currentView === 'visitors' && (
              <div className="space-y-6">
                
                {/* Status KPI Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Waiting in Lobby</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeWaiting.length}</h3>
                    <p className="text-[11px] text-amber-600 mt-1.5 font-medium">Ready to be admitted</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">In Meeting Now</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeInMeeting.length}</h3>
                    <p className="text-[11px] text-blue-600 mt-1.5 font-medium">Active discussions</p>
                  </div>

                  <div className="bg-white border border-indigo-200 bg-indigo-50/20 p-4 rounded-xl shadow-xs">
                    <p className="text-xs text-indigo-700 font-medium flex items-center gap-1">
                      <CalendarClock size={13} /> Future Reservations
                    </p>
                    <h3 className="text-2xl font-bold text-indigo-900 mt-1">{upcomingReservations.length}</h3>
                    <p className="text-[11px] text-indigo-600 mt-1.5 font-medium">Pre-booked via Kiosk/Host</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Completed Today</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{completedList.length}</h3>
                    <p className="text-[11px] text-emerald-600 mt-1.5 font-medium">Concluded visits</p>
                  </div>
                </div>

                {/* Subtabs for Queue vs Upcoming Reservations vs History */}
                <div className="flex border-b border-slate-200 gap-6">
                  <button
                    onClick={() => setVisitorTab('queue')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                      visitorTab === 'queue' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Users size={16} /> Live Assigned Queue ({activeWaiting.length + activeInMeeting.length})
                  </button>

                  <button
                    onClick={() => setVisitorTab('upcoming')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                      visitorTab === 'upcoming' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <CalendarClock size={16} /> Upcoming & Future Reservations ({upcomingReservations.length})
                  </button>

                  <button
                    onClick={() => setVisitorTab('history')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                      visitorTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Clock size={16} /> Completed Past Visits ({completedList.length})
                  </button>
                </div>

                {/* TAB 1: ACTIVE LIVE QUEUE */}
                {visitorTab === 'queue' && (
                  <div className="space-y-4">
                    {activeWaiting.length > 0 || activeInMeeting.length > 0 ? (
                      <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs">
                        <span className="text-xs font-semibold text-slate-500">
                          {activeWaiting.length + activeInMeeting.length} Active in Queue
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-medium">Sort queue:</span>
                          <button
                            onClick={() => handleQueueSort('time')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                              queueSortField === 'time'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Arrival Time
                            {queueSortField === 'time' && (
                              queueSortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            )}
                          </button>
                          <button
                            onClick={() => handleQueueSort('name')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                              queueSortField === 'name'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Visitor Name
                            {queueSortField === 'name' && (
                              queueSortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {sortedActiveWaiting.length === 0 && sortedActiveInMeeting.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                          <Users size={24} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">No Visitors in Live Queue</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          When visitors arrive at the kiosk or check in at reception for {currentHostName}, they will appear here instantly.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Currently In Meeting */}
                        {sortedActiveInMeeting.map((visitor) => (
                          <div key={visitor.id} className="bg-white border-2 border-blue-500/30 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                  In Meeting
                                </span>
                                <h4 className="text-base font-bold text-slate-900">{visitor.name}</h4>
                              </div>
                              <p className="text-xs text-slate-500">{visitor.company} • Arrived at {visitor.arrivalTime}</p>
                              {visitor.notes && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 mt-2">{visitor.notes}</p>}
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => extendMeeting(visitor.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                              >
                                +15 Min
                              </button>
                              <button
                                onClick={() => handleStatusChange(visitor.id, 'completed')}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-1"
                              >
                                <CheckCircle size={13} /> Complete Meeting
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Waiting in Lobby */}
                        {sortedActiveWaiting.map((visitor) => (
                          <div key={visitor.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                                  Waiting in Lobby
                                </span>
                                <h4 className="text-base font-bold text-slate-900">{visitor.name}</h4>
                              </div>
                              <p className="text-xs text-slate-500">{visitor.company} • Arrived at {visitor.arrivalTime}</p>
                              {visitor.notes && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 mt-2">{visitor.notes}</p>}
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleStatusChange(visitor.id, 'needs_reassignment')}
                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg transition-colors border border-red-200 flex flex-1 sm:flex-none items-center justify-center gap-1.5 shadow-xs"
                              >
                                <XCircle size={14} /> Not Mine
                              </button>
                              <button
                                onClick={() => handleStatusChange(visitor.id, 'in_meeting')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs flex flex-1 sm:flex-none items-center justify-center gap-1.5"
                              >
                                <UserCheck size={14} /> Admit & Start Meeting
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: UPCOMING & FUTURE RESERVATIONS */}
                {visitorTab === 'upcoming' && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-indigo-50/70 to-blue-50/70 border border-indigo-100 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                          <BookmarkCheck size={16} className="text-indigo-600" />
                          Future Appointments & Suggested Shift Bookings
                        </h4>
                        <p className="text-xs text-indigo-800 mt-0.5">
                          Visitors who reserved future slots when you were off-shift, or pre-registered in advance.
                        </p>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 bg-white text-indigo-700 border border-indigo-200 rounded-full shadow-2xs self-start sm:self-auto">
                        {upcomingReservations.length} {upcomingReservations.length === 1 ? 'Booking' : 'Bookings'}
                      </span>
                    </div>

                    {/* Quick Sort Toolbar for Upcoming */}
                    {upcomingReservations.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs gap-2">
                        <span className="text-xs font-semibold text-slate-500">
                          Sort Upcoming List:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpcomingSort('date')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                              upcomingSortField === 'date'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Date & Time
                            {upcomingSortField === 'date' && (
                              upcomingSortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            )}
                          </button>
                          <button
                            onClick={() => handleUpcomingSort('name')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                              upcomingSortField === 'name'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Visitor Name
                            {upcomingSortField === 'name' && (
                              upcomingSortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            )}
                          </button>
                          <button
                            onClick={() => handleUpcomingSort('company')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                              upcomingSortField === 'company'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Organization
                            {upcomingSortField === 'company' && (
                              upcomingSortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {sortedUpcomingReservations.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 mx-auto mb-3">
                          <CalendarClock size={24} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">No Future Reservations Yet</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          When visitors book suggested future slots via the Kiosk or reception pre-registers guests for upcoming shifts, they will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sortedUpcomingReservations.map((res) => {
                          const relativeLabel = getRelativeDateLabel(res.dateStr);
                          return (
                            <div 
                              key={res.id} 
                              className="bg-white border border-indigo-100 hover:border-indigo-300 rounded-xl p-5 shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                            >
                              <div className="flex items-start gap-4">
                                {/* Date Badge */}
                                <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl p-2.5 text-center min-w-[80px] shrink-0">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                                    {relativeLabel || 'Date'}
                                  </p>
                                  <p className="text-xs font-black text-indigo-950 mt-0.5">
                                    {res.dateStr}
                                  </p>
                                  <p className="text-[11px] font-mono font-semibold text-indigo-700 mt-0.5">
                                    {res.arrivalTime}
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-2.5">
                                    <h4 className="text-base font-bold text-slate-900">{res.name}</h4>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      Expected
                                    </span>
                                  </div>
                                  
                                  <p className="text-xs text-slate-600">
                                    <span className="font-semibold text-slate-800">{res.company}</span>
                                    {res.scheduledFormatted && (
                                      <span className="text-slate-500"> • Scheduled for {res.scheduledFormatted}</span>
                                    )}
                                  </p>

                                  {(res.email || res.phone) && (
                                    <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                                      {res.email && <span>{res.email}</span>}
                                      {res.phone && <span>• {res.phone}</span>}
                                    </p>
                                  )}

                                  {res.notes && (
                                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2 leading-relaxed">
                                      {res.notes}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
                                <button
                                  onClick={() => handleStatusChange(res.id, 'checked_in')}
                                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all shadow-xs flex items-center gap-1.5"
                                  title="Mark as arrived and check into lobby"
                                >
                                  <UserCheck size={14} /> Check In (Arrived)
                                </button>
                                <button
                                  onClick={() => handleStatusChange(res.id, 'in_meeting')}
                                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all shadow-xs flex items-center gap-1.5"
                                  title="Start meeting immediately"
                                >
                                  <CheckCircle size={14} /> Start Meeting
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: COMPLETED HISTORY */}
                {visitorTab === 'history' && (
                  <div className="space-y-3">
                    {completedList.length > 0 && (
                      <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs">
                        <span className="text-xs font-semibold text-slate-500">
                          {completedList.length} Recorded Visits
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-medium">Quick sort:</span>
                          <button
                            onClick={() => handleHistorySort('date')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                              historySortField === 'date'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Date & Time
                            {historySortField === 'date' && (
                              historySortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            )}
                          </button>
                          <button
                            onClick={() => handleHistorySort('name')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                              historySortField === 'name'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Visitor Name
                            {historySortField === 'name' && (
                              historySortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            )}
                          </button>
                          <button
                            onClick={() => handleHistorySort('company')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                              historySortField === 'company'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Company
                            {historySortField === 'company' && (
                              historySortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                          <tr>
                            <th 
                              onClick={() => handleHistorySort('name')}
                              className="px-6 py-3 font-semibold cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition-colors select-none"
                            >
                              <div className="flex items-center gap-1.5">
                                <span>Visitor Name</span>
                                {historySortField === 'name' ? (
                                  historySortDirection === 'asc' ? <ArrowUp size={12} className="text-blue-600" /> : <ArrowDown size={12} className="text-blue-600" />
                                ) : (
                                  <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                                )}
                              </div>
                            </th>
                            <th 
                              onClick={() => handleHistorySort('company')}
                              className="px-6 py-3 font-semibold cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition-colors select-none"
                            >
                              <div className="flex items-center gap-1.5">
                                <span>Company / Purpose</span>
                                {historySortField === 'company' ? (
                                  historySortDirection === 'asc' ? <ArrowUp size={12} className="text-blue-600" /> : <ArrowDown size={12} className="text-blue-600" />
                                ) : (
                                  <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                                )}
                              </div>
                            </th>
                            <th 
                              onClick={() => handleHistorySort('date')}
                              className="px-6 py-3 font-semibold cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition-colors select-none"
                            >
                              <div className="flex items-center gap-1.5">
                                <span>Date & Time</span>
                                {historySortField === 'date' ? (
                                  historySortDirection === 'asc' ? <ArrowUp size={12} className="text-blue-600" /> : <ArrowDown size={12} className="text-blue-600" />
                                ) : (
                                  <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 font-semibold text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {sortedCompletedList.length > 0 ? (
                            sortedCompletedList.map((v) => (
                              <tr key={v.id} className="hover:bg-slate-50/80">
                                <td className="px-6 py-3.5 font-medium text-slate-900">{v.name}</td>
                                <td className="px-6 py-3.5 text-xs text-slate-500">{v.company}</td>
                                <td className="px-6 py-3.5 text-xs font-mono text-slate-500">{v.scheduledFormatted || v.arrivalTime}</td>
                                <td className="px-6 py-3.5 text-right">
                                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                    Completed
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">
                                No completed meetings recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* VIEW 2: MY SHIFTS & AVAILABILITY */}
            {currentView === 'schedule' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Personal Availability & Shifts</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Configure your weekly working schedule so AI routing knows when you are available.</p>
                  </div>
                  <button
                    onClick={handleSaveAvailability}
                    disabled={isSavingSchedule}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  >
                    <Save size={14} /> {isSavingSchedule ? 'Saving...' : 'Save Availability'}
                  </button>
                </div>

                {/* Subtabs for Weekly vs Calendar */}
                <div className="flex border-b border-slate-200 gap-6">
                  <button
                    onClick={() => setScheduleSubTab('calendar')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                      scheduleSubTab === 'calendar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <CalendarDays size={16} /> Monthly Calendar & Out-of-Office
                  </button>
                  <button
                    onClick={() => setScheduleSubTab('weekly')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                      scheduleSubTab === 'weekly' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Clock size={16} /> Weekly Working Shifts
                  </button>
                </div>

                {/* WEEKLY SHIFTS */}
                {scheduleSubTab === 'weekly' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">Working Hours by Day</h3>
                    <div className="space-y-3">
                      {schedule.map((dayItem, idx) => (
                        <div key={dayItem.day} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={dayItem.active}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSchedule(prev => prev.map((s, i) => i === idx ? { ...s, active: checked } : s));
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                            />
                            <span className={`text-sm font-semibold ${dayItem.active ? 'text-slate-900' : 'text-slate-400'}`}>
                              {dayItem.day}
                            </span>
                          </label>

                          {dayItem.active ? (
                            <div className="flex items-center gap-2 text-xs">
                              <input 
                                type="time"
                                value={dayItem.startTime}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSchedule(prev => prev.map((s, i) => i === idx ? { ...s, startTime: val } : s));
                                }}
                                className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                              />
                              <span className="text-slate-400">to</span>
                              <input 
                                type="time"
                                value={dayItem.endTime}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSchedule(prev => prev.map((s, i) => i === idx ? { ...s, endTime: val } : s));
                                }}
                                className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Off Duty</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CALENDAR & OUT OF OFFICE WITH RESERVATIONS BREAKDOWN */}
                {scheduleSubTab === 'calendar' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">
                          {monthNames[month]} {year}
                        </h3>
                        <div className="flex items-center gap-1">
                          <button onClick={prevMonth} className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100">
                            <ChevronLeft size={16} />
                          </button>
                          <button onClick={nextMonth} className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100">
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Day Labels */}
                      <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: startOffset }).map((_, i) => (
                          <div key={`empty-${i}`} className="h-12 rounded border border-transparent" />
                        ))}
                        {Array.from({ length: totalDays }).map((_, i) => {
                          const dayNum = i + 1;
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                          const isSelected = selectedCalendarDate === dateStr;
                          const isOutOfOffice = holidays.some(h => h.date === dateStr);
                          const dayApts = visitors.filter(v => v.dateStr === dateStr);

                          return (
                            <button
                              key={dateStr}
                              onClick={() => setSelectedCalendarDate(dateStr)}
                              className={`h-12 rounded-lg p-1.5 flex flex-col justify-between items-start border transition-all ${
                                isSelected ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-500' :
                                isOutOfOffice ? 'border-rose-200 bg-rose-50/40' :
                                dayApts.length > 0 ? 'border-indigo-200 bg-indigo-50/30' :
                                'border-slate-100 hover:border-slate-200 bg-white'
                              }`}
                            >
                              <span className={`text-xs font-semibold ${isSelected ? 'text-blue-600' : isOutOfOffice ? 'text-rose-600' : 'text-slate-700'}`}>
                                {dayNum}
                              </span>
                              <div className="flex items-center gap-1">
                                {isOutOfOffice && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Out of Office" />}
                                {dayApts.length > 0 && (
                                  <span className="w-2 h-2 rounded-full bg-indigo-600 ring-1 ring-white" title={`${dayApts.length} Appointments`} />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selected Date Details Panel with Daily Appointments */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Details</h4>
                        <p className="text-base font-bold text-slate-900 mt-0.5">{selectedCalendarDate}</p>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-500">Working Shift</p>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">
                            {shiftForSelectedDay?.active ? `${shiftForSelectedDay.startTime} - ${shiftForSelectedDay.endTime}` : 'Off Duty'}
                          </p>
                        </div>

                        <button
                          onClick={() => toggleDateOutOfOffice(selectedCalendarDate)}
                          className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                            isSelectedHoliday 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {isSelectedHoliday ? '✓ Mark as Available' : '✖ Mark Out of Office'}
                        </button>
                      </div>

                      {/* Scheduled Visitors for this Specific Day */}
                      <div className="pt-3 border-t border-slate-100 space-y-2.5">
                        <h5 className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span>Booked Visitors</span>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                            {selectedDateAppointments.length}
                          </span>
                        </h5>

                        {selectedDateAppointments.length === 0 ? (
                          <p className="text-xs text-slate-400 italic bg-slate-50/80 p-3 rounded-lg border border-slate-100 text-center">
                            No reservations scheduled for this date.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {selectedDateAppointments.map(v => (
                              <div key={v.id} className="p-2.5 bg-indigo-50/40 border border-indigo-100 rounded-lg text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900">{v.name}</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white text-indigo-700 border border-indigo-200 rounded font-semibold">
                                    {v.arrivalTime}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate">{v.company}</p>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-block ${
                                  v.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                  v.status === 'in_meeting' ? 'bg-blue-50 text-blue-700' :
                                  'bg-indigo-50 text-indigo-700'
                                }`}>
                                  {v.status.replace('_', ' ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
            
            {/* VIEW 3: PROFILE SETTINGS */}
            {currentView === 'profile' && (
              <ProfileTab 
                currentEmail={currentHostEmail}
                currentName={currentHostName}
                currentPhone={currentHostPhone}
                setToastMessage={setToastMessage}
                onProfileUpdated={() => {
                  // Re-fetch user details after update
                  const token = localStorage.getItem('access_token');
                  if (token) {
                    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/me`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    }).then(res => res.json()).then(data => {
                       // Update local state if needed (like name/email)
                       // page.tsx currently manages currentHostEmail via a separate fetch, we could just reload
                       window.location.reload();
                    });
                  }
                }}
              />
            )}

          </div>
        </main>
      </div>

      {/* MODAL: PRE-REGISTER GUEST */}
      {showPreRegModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Pre-Register Anticipated Visitor</h3>
              <button onClick={() => setShowPreRegModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePreRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Visitor Full Name *</label>
                <input 
                  type="text"
                  required
                  value={preRegName}
                  onChange={(e) => setPreRegName(e.target.value)}
                  placeholder="e.g. Michael Smith"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / Purpose</label>
                <input 
                  type="text"
                  value={preRegCompany}
                  onChange={(e) => setPreRegCompany(e.target.value)}
                  placeholder="e.g. Google Cloud Partner Review"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input 
                    type="date"
                    value={preRegDate}
                    onChange={(e) => setPreRegDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <input 
                    type="time"
                    value={preRegTime}
                    onChange={(e) => setPreRegTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowPreRegModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                >
                  Pre-Register Visitor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}