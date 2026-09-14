'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, FileText, Building2, Activity,
  Search, Bell, Download, FileSpreadsheet, CheckCircle, Clock,
  ExternalLink, ArrowUpRight, Shield, ShieldCheck, Flame, UserCheck,
  Building, Sparkles, RefreshCw, LogOut, CheckCircle2, AlertTriangle, Lock,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { generateBeautifulPDF, generateCSV } from '@/lib/reportExporter';

interface Appointment {
  id: number;
  visitor?: {
    id: number;
    full_name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  host?: {
    id: number;
    full_name: string;
    department: string;
    employee_id?: string;
  };
  scheduled_time: string;
  status: string;
  notes?: string;
}

interface User {
  id: number;
  email: string;
  role: string;
  permissions?: string[];
  is_active: boolean;
}

export default function AdminOperationsDashboard() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'overview' | 'visitors' | 'evacuation' | 'reports' | 'staff'>('overview');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [aptSortField, setAptSortField] = useState<'name' | 'date' | 'host' | 'status'>('date');
  const [aptSortDirection, setAptSortDirection] = useState<'asc' | 'desc'>('desc');

  const [evacSortField, setEvacSortField] = useState<'name' | 'host' | 'location'>('name');
  const [evacSortDirection, setEvacSortDirection] = useState<'asc' | 'desc'>('asc');

  const [staffSortField, setStaffSortField] = useState<'email' | 'role' | 'status'>('email');
  const [staffSortDirection, setStaffSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleAptSort = (field: 'name' | 'date' | 'host' | 'status') => {
    if (aptSortField === field) {
      setAptSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setAptSortField(field);
      setAptSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const handleEvacSort = (field: 'name' | 'host' | 'location') => {
    if (evacSortField === field) {
      setEvacSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setEvacSortField(field);
      setEvacSortDirection('asc');
    }
  };

  const handleStaffSort = (field: 'email' | 'role' | 'status') => {
    if (staffSortField === field) {
      setStaffSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setStaffSortField(field);
      setStaffSortDirection('asc');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    router.push('/');
  };

  // Fetch real database appointments & users
  const fetchAllData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setAuthError('Authentication required. Please sign in as Admin.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Fetch appointments
      const aptRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/appointments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (aptRes.ok) {
        const aptData = await aptRes.json();
        setAppointments(aptData);
        setAuthError(null);
      } else if (aptRes.status === 401 || aptRes.status === 403) {
        setAuthError('Session expired or insufficient privileges. Please sign in with Admin credentials.');
      }

      // 2. Fetch users
      const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setAuthError('Error connecting to backend server at http://localhost:8000.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filtered appointments
  const filteredAppointments = appointments.filter(apt => {
    const q = searchQuery.toLowerCase();
    const vName = apt.visitor?.full_name?.toLowerCase() || '';
    const hName = apt.host?.full_name?.toLowerCase() || '';
    const comp = apt.visitor?.company?.toLowerCase() || '';
    const st = apt.status?.toLowerCase() || '';
    return vName.includes(q) || hName.includes(q) || comp.includes(q) || st.includes(q);
  });

  // Sorted appointments (by Date, Name, Host, or Status)
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    let comparison = 0;
    if (aptSortField === 'name') {
      const nameA = a.visitor?.full_name || '';
      const nameB = b.visitor?.full_name || '';
      comparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    } else if (aptSortField === 'date') {
      const timeA = a.scheduled_time ? new Date(a.scheduled_time).getTime() : 0;
      const timeB = b.scheduled_time ? new Date(b.scheduled_time).getTime() : 0;
      comparison = timeA - timeB;
    } else if (aptSortField === 'host') {
      const hostA = a.host?.full_name || '';
      const hostB = b.host?.full_name || '';
      comparison = hostA.localeCompare(hostB, undefined, { sensitivity: 'base' });
    } else if (aptSortField === 'status') {
      comparison = (a.status || '').localeCompare(b.status || '');
    }
    return aptSortDirection === 'asc' ? comparison : -comparison;
  });

  // KPI Computations from live DB
  const checkedInList = appointments.filter(a => a.status.toLowerCase() === 'checked in' || a.status.toLowerCase() === 'waiting');
  const inMeetingList = appointments.filter(a => a.status.toLowerCase() === 'in meeting' || a.status.toLowerCase() === 'in_meeting');
  const completedList = appointments.filter(a => a.status.toLowerCase() === 'completed' || a.status.toLowerCase() === 'checked out');
  const scheduledList = appointments.filter(a => a.status.toLowerCase() === 'scheduled' || a.status.toLowerCase() === 'pending');

  // Currently on premise (Checked in + In Meeting)
  const currentlyOnPremise = [...checkedInList, ...inMeetingList];

  // Sorted Evacuation list
  const sortedEvacuationList = [...currentlyOnPremise].sort((a, b) => {
    let comparison = 0;
    if (evacSortField === 'name') {
      const nameA = a.visitor?.full_name || '';
      const nameB = b.visitor?.full_name || '';
      comparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    } else if (evacSortField === 'host') {
      const hostA = a.host?.full_name || '';
      const hostB = b.host?.full_name || '';
      comparison = hostA.localeCompare(hostB, undefined, { sensitivity: 'base' });
    } else if (evacSortField === 'location') {
      const locA = a.host?.department || '';
      const locB = b.host?.department || '';
      comparison = locA.localeCompare(locB, undefined, { sensitivity: 'base' });
    }
    return evacSortDirection === 'asc' ? comparison : -comparison;
  });

  // Sorted Users list
  const sortedUsers = [...users].sort((a, b) => {
    let comparison = 0;
    if (staffSortField === 'email') {
      comparison = (a.email || '').localeCompare(b.email || '');
    } else if (staffSortField === 'role') {
      comparison = (a.role || '').localeCompare(b.role || '');
    } else if (staffSortField === 'status') {
      comparison = (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0);
    }
    return staffSortDirection === 'asc' ? comparison : -comparison;
  });

  const handleDownloadReport = (title: string, format: 'PDF' | 'CSV') => {
    setIsGenerating(`${title}-${format}`);
    try {
      let reportType: 'evacuation' | 'visitors' | 'staff' | 'traffic' | 'general' = 'general';
      const tLower = title.toLowerCase();
      if (tLower.includes('evacuation') || tLower.includes('emergency')) {
        reportType = 'evacuation';
      } else if (tLower.includes('staff') || tLower.includes('user') || tLower.includes('directory') || tLower.includes('host')) {
        reportType = 'staff';
      } else if (tLower.includes('traffic') || tLower.includes('lobby') || tLower.includes('facility') || tLower.includes('utilization')) {
        reportType = 'traffic';
      } else {
        reportType = 'visitors';
      }

      if (format === 'PDF') {
        generateBeautifulPDF({
          reportTitle: title,
          reportType,
          appointments,
          users,
          generatedBy: 'Facility Administrator'
        });
      } else {
        generateCSV(title, appointments);
      }
      showToast(`✓ ${title} (${format}) generated and downloaded.`);
    } catch (err) {
      console.error('Error generating document:', err);
      showToast(`✗ Failed to generate ${format}.`);
    } finally {
      setTimeout(() => setIsGenerating(null), 300);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-68 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shadow-blue-500/20">
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-wide">Admin Central</h1>
            <p className="text-[11px] text-blue-600 font-medium">Operations & Command</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setCurrentView('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'overview' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard size={18} /> Operations Command
          </button>

          <button 
            onClick={() => setCurrentView('visitors')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'visitors' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} /> Live Visitor Stream
            </div>
            {currentlyOnPremise.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${currentView === 'visitors' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700'}`}>
                {currentlyOnPremise.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setCurrentView('evacuation')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'evacuation' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Flame size={18} className={currentView === 'evacuation' ? 'text-white' : 'text-rose-500'} /> Evacuation Roster
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${currentView === 'evacuation' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700 font-semibold'}`}>
              {currentlyOnPremise.length} Inside
            </span>
          </button>

          <button 
            onClick={() => setCurrentView('staff')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'staff' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck size={18} /> Staff & Host Directory
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${currentView === 'staff' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {users.length}
            </span>
          </button>

          <button 
            onClick={() => setCurrentView('reports')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'reports' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText size={18} /> Compliance & Reports
          </button>
        </nav>

        {/* Quick Kiosk Access */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-1.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Visitor Interface</p>
          <a 
            href="/kiosk"
            target="_blank"
            rel="noreferrer"
            className="w-full p-2.5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-700 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors shadow-2xs group"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" />
              <span>Launch Guest Kiosk</span>
            </div>
            <ArrowUpRight size={13} className="text-slate-400 group-hover:text-amber-600 transition-colors" />
          </a>
        </div>

        {/* Role & Sign Out Footer */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Role: <span className="text-blue-600 font-semibold">Admin</span></span>
          <button
            onClick={handleSignOut}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs">
          <div className="w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search visitor, host, department, or status..." 
              className="w-full bg-slate-50 text-sm text-slate-900 pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={fetchAllData}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh database sync"
            >
              <RefreshCw size={16} />
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Operations Admin</span>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                OA
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
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

        {/* AUTH ERROR BANNER */}
        {authError && (
          <div className="mx-8 mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Lock size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">Admin Authentication Required</p>
                <p className="text-xs text-amber-700">{authError}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              Go to Login Page
            </button>
          </div>
        )}

        {/* SCROLLABLE MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* VIEW 1: OPERATIONS COMMAND OVERVIEW */}
            {currentView === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Operations Command Center</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time facility telemetry aggregated from Reception, Host Stations, and Self-Service Kiosks.</p>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Currently On Premise</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{currentlyOnPremise.length}</h3>
                    <p className="text-[11px] text-blue-600 mt-2 font-medium">Lobby queue + in meetings</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Waiting in Lobby</p>
                    <h3 className="text-2xl font-bold text-amber-600 mt-1">{checkedInList.length}</h3>
                    <p className="text-[11px] text-slate-500 mt-2">Awaiting host admission</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Active Host Discussions</p>
                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">{inMeetingList.length}</h3>
                    <p className="text-[11px] text-slate-500 mt-2">Meetings in progress</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Managed Staff & Hosts</p>
                    <h3 className="text-2xl font-bold text-purple-600 mt-1">{users.length}</h3>
                    <p className="text-[11px] text-purple-600 mt-2 font-medium">Active user accounts</p>
                  </div>
                </div>

                {/* Kiosk & Facility Quick Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Self-Service Visitor Kiosk</h4>
                        <p className="text-xs text-slate-500 mt-0.5">AI natural language visitor check-in station.</p>
                      </div>
                    </div>
                    <a
                      href="/kiosk"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
                    >
                      <span>Launch Kiosk</span>
                      <ArrowUpRight size={14} />
                    </a>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Live Building Occupancy</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{currentlyOnPremise.length} active visitors accounted on premise.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentView('evacuation')}
                      className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <span>Evacuation Roster</span>
                    </button>
                  </div>
                </div>

                {/* Recent Visitor Activity Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Live Visitor Movement</h3>
                      <p className="text-xs text-slate-500">Real-time status across all hosts and check-ins.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                        <span className="text-[11px] font-semibold text-slate-500 px-1.5">Sort:</span>
                        <button
                          onClick={() => handleAptSort('date')}
                          className={`px-2 py-0.5 rounded font-medium transition-colors ${aptSortField === 'date' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Date {aptSortField === 'date' && (aptSortDirection === 'asc' ? '↑' : '↓')}
                        </button>
                        <button
                          onClick={() => handleAptSort('name')}
                          className={`px-2 py-0.5 rounded font-medium transition-colors ${aptSortField === 'name' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Name {aptSortField === 'name' && (aptSortDirection === 'asc' ? 'A-Z' : 'Z-A')}
                        </button>
                      </div>
                      <button
                        onClick={() => setCurrentView('visitors')}
                        className="text-xs font-semibold text-blue-600 hover:underline pl-2"
                      >
                        View All ({appointments.length}) →
                      </button>
                    </div>
                  </div>

                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th onClick={() => handleAptSort('name')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Visitor Name</span>
                            {aptSortField === 'name' ? (aptSortDirection === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handleAptSort('host')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Assigned Host</span>
                            {aptSortField === 'host' ? (aptSortDirection === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-6 py-3 font-semibold">Department</th>
                        <th onClick={() => handleAptSort('date')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Scheduled / Arrival</span>
                            {aptSortField === 'date' ? (aptSortDirection === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handleAptSort('status')} className="px-6 py-3 font-semibold text-right cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Status</span>
                            {aptSortField === 'status' ? (aptSortDirection === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedAppointments.slice(0, 5).map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-50/80">
                          <td className="px-6 py-3.5 font-medium text-slate-900">{apt.visitor?.full_name || 'Guest Visitor'}</td>
                          <td className="px-6 py-3.5 text-xs text-slate-700">{apt.host?.full_name || 'Unassigned'}</td>
                          <td className="px-6 py-3.5 text-xs text-slate-500">{apt.host?.department || 'Operations'}</td>
                          <td className="px-6 py-3.5 text-xs font-mono text-slate-500">
                            {apt.scheduled_time ? new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                              apt.status.toLowerCase().includes('in meeting') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              apt.status.toLowerCase().includes('checked in') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              apt.status.toLowerCase().includes('completed') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {apt.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* VIEW 2: FULL VISITOR STREAM */}
            {currentView === 'visitors' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Live Visitor Stream</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Comprehensive audit trail of all visitor check-ins across all hosts.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-500 px-1.5">Sort:</span>
                      <button
                        onClick={() => handleAptSort('date')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                          aptSortField === 'date' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Clock size={12} />
                        Date {aptSortField === 'date' && (aptSortDirection === 'asc' ? '↑' : '↓')}
                      </button>
                      <button
                        onClick={() => handleAptSort('name')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                          aptSortField === 'name' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Users size={12} />
                        Name {aptSortField === 'name' && (aptSortDirection === 'asc' ? 'A-Z' : 'Z-A')}
                      </button>
                    </div>

                    <button
                      onClick={() => handleDownloadReport('Visitor Log', 'CSV')}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <FileSpreadsheet size={14} /> Export CSV
                    </button>
                    <button
                      onClick={() => handleDownloadReport('Visitor Log', 'PDF')}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Download size={14} /> Export PDF
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th onClick={() => handleAptSort('name')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Visitor Name</span>
                            {aptSortField === 'name' ? (aptSortDirection === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-6 py-3 font-semibold">Company / Email</th>
                        <th onClick={() => handleAptSort('host')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Assigned Host</span>
                            {aptSortField === 'host' ? (aptSortDirection === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-6 py-3 font-semibold">Department</th>
                        <th onClick={() => handleAptSort('date')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Date & Time</span>
                            {aptSortField === 'date' ? (aptSortDirection === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handleAptSort('status')} className="px-6 py-3 font-semibold text-right cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Status</span>
                            {aptSortField === 'status' ? (aptSortDirection === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedAppointments.length > 0 ? (
                        sortedAppointments.map((apt) => (
                          <tr key={apt.id} className="hover:bg-slate-50/80">
                            <td className="px-6 py-3.5 font-medium text-slate-900">{apt.visitor?.full_name || 'Guest'}</td>
                            <td className="px-6 py-3.5 text-xs text-slate-500">{apt.visitor?.company || apt.visitor?.email || 'N/A'}</td>
                            <td className="px-6 py-3.5 text-xs font-semibold text-slate-800">{apt.host?.full_name || 'Unassigned'}</td>
                            <td className="px-6 py-3.5 text-xs text-slate-500">{apt.host?.department || 'Operations'}</td>
                            <td className="px-6 py-3.5 text-xs font-mono text-slate-500">
                              {apt.scheduled_time ? new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                                apt.status.toLowerCase().includes('in meeting') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                apt.status.toLowerCase().includes('checked in') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                apt.status.toLowerCase().includes('completed') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {apt.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">
                            No visitor records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 3: EMERGENCY EVACUATION ROSTER */}
            {currentView === 'evacuation' && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Flame size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-rose-900">Emergency Evacuation Roster</h3>
                      <p className="text-xs text-rose-700">Live head-count of all visitors and hosts currently accounted inside the facility.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-rose-200 text-xs">
                      <span className="text-[11px] font-semibold text-rose-700 px-1">Sort:</span>
                      <button
                        onClick={() => handleEvacSort('name')}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${evacSortField === 'name' ? 'bg-rose-100 text-rose-800' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Name {evacSortField === 'name' && (evacSortDirection === 'asc' ? 'A-Z' : 'Z-A')}
                      </button>
                      <button
                        onClick={() => handleEvacSort('location')}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${evacSortField === 'location' ? 'bg-rose-100 text-rose-800' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Location {evacSortField === 'location' && (evacSortDirection === 'asc' ? 'A-Z' : 'Z-A')}
                      </button>
                    </div>
                    <button
                      onClick={() => handleDownloadReport('Emergency Evacuation Roster', 'PDF')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Download size={14} /> Print Evacuation Sheet
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th onClick={() => handleEvacSort('name')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Individual Name</span>
                            {evacSortField === 'name' ? (evacSortDirection === 'asc' ? <ArrowUp size={13} className="text-rose-600" /> : <ArrowDown size={13} className="text-rose-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-6 py-3 font-semibold">Role / Type</th>
                        <th onClick={() => handleEvacSort('host')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Host / Escort</span>
                            {evacSortField === 'host' ? (evacSortDirection === 'asc' ? <ArrowUp size={13} className="text-rose-600" /> : <ArrowDown size={13} className="text-rose-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handleEvacSort('location')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Location / Zone</span>
                            {evacSortField === 'location' ? (evacSortDirection === 'asc' ? <ArrowUp size={13} className="text-rose-600" /> : <ArrowDown size={13} className="text-rose-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-6 py-3 font-semibold text-right">Accounted Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedEvacuationList.length > 0 ? (
                        sortedEvacuationList.map((apt) => (
                          <tr key={apt.id} className="hover:bg-slate-50/80">
                            <td className="px-6 py-3.5 font-bold text-slate-900">{apt.visitor?.full_name || 'Guest'}</td>
                            <td className="px-6 py-3.5 text-xs text-slate-600">Guest Visitor</td>
                            <td className="px-6 py-3.5 text-xs font-medium text-slate-800">{apt.host?.full_name || 'Unassigned'}</td>
                            <td className="px-6 py-3.5 text-xs text-slate-500">{apt.host?.department || 'Main Lobby'}</td>
                            <td className="px-6 py-3.5 text-right">
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                                Inside Building
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">
                            No external visitors currently checked in or in meetings.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 4: STAFF DIRECTORY */}
            {currentView === 'staff' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Staff & Host Directory</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Live user accounts and assigned roles across all departments.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-500 px-1.5">Sort:</span>
                      <button
                        onClick={() => handleStaffSort('email')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                          staffSortField === 'email' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Email / Name {staffSortField === 'email' && (staffSortDirection === 'asc' ? 'A-Z' : 'Z-A')}
                      </button>
                      <button
                        onClick={() => handleStaffSort('role')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                          staffSortField === 'role' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Role {staffSortField === 'role' && (staffSortDirection === 'asc' ? 'A-Z' : 'Z-A')}
                      </button>
                    </div>

                    <button
                      onClick={() => handleDownloadReport('Staff & Host Security Directory', 'PDF')}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Download size={14} /> Export Directory (PDF)
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th onClick={() => handleStaffSort('email')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>User Email</span>
                            {staffSortField === 'email' ? (staffSortDirection === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handleStaffSort('role')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Role Tier</span>
                            {staffSortField === 'role' ? (staffSortDirection === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-6 py-3 font-semibold">Granted Capabilities</th>
                        <th onClick={() => handleStaffSort('status')} className="px-6 py-3 font-semibold text-right cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Status</span>
                            {staffSortField === 'status' ? (staffSortDirection === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedUsers.length > 0 ? (
                        sortedUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80">
                            <td className="px-6 py-3.5 font-medium text-slate-900">{u.email}</td>
                            <td className="px-6 py-3.5">
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-xs text-slate-500">
                              {u.permissions && u.permissions.length > 0 ? `${u.permissions.length} capabilities active` : 'Standard default preset'}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                {u.is_active ? 'Active' : 'Suspended'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">
                            No user accounts returned or loading...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 5: MANAGER REPORTS */}
            {currentView === 'reports' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Compliance & Operational Reports</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Export pre-compiled facility telemetry, SLA compliance, and security logs.</p>
                  </div>
                  <button 
                    onClick={() => handleDownloadReport('All Facility Reports', 'PDF')}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <Download size={14} /> Export All (ZIP)
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 shadow-xs overflow-hidden">
                  {[
                    { id: '1', title: 'Daily Lobby & Visitor Traffic Digest', desc: 'Hourly check-in volume, peak wait times, and kiosk throughput summary.', period: 'Updated Daily' },
                    { id: '2', title: 'Host Meeting SLA & Response Time Compliance', desc: 'Host turnaround times, meeting durations, and queue response metrics.', period: 'Updated Weekly' },
                    { id: '3', title: 'Security Badging & NDA Compliance Log', desc: 'Visitor badge checkout records, digital NDA signatures, and security logs.', period: 'Updated Daily' },
                    { id: '4', title: 'Monthly Facility Utilization Summary', desc: 'High-level operational performance, facility capacity, and department breakdown.', period: 'Monthly Report' },
                  ].map((r) => (
                    <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900">{r.title}</h3>
                        <p className="text-xs text-slate-500">{r.desc}</p>
                        <span className="text-[11px] text-slate-400 font-medium">{r.period}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => handleDownloadReport(r.title, 'PDF')}
                          disabled={isGenerating === `${r.title}-PDF`}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <Download size={13} /> {isGenerating === `${r.title}-PDF` ? 'Generating...' : 'PDF'}
                        </button>
                        <button 
                          onClick={() => handleDownloadReport(r.title, 'CSV')}
                          disabled={isGenerating === `${r.title}-CSV`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <FileSpreadsheet size={13} /> CSV
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

    </div>
  );
}
