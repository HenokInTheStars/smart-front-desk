'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Clock, CheckCircle2, XCircle, Search, 
  RefreshCw, Building, AlertCircle, ArrowUpRight, ShieldCheck, 
  LogIn, LogOut, Phone, Mail, FileText, BadgeCheck, Printer
} from 'lucide-react';

interface Appointment {
  id: number;
  visitor: {
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
  };
  scheduled_time: string;
  status: string;
  notes?: string;
}

interface Host {
  id: number;
  full_name: string;
  department: string;
  phone?: string;
}

export default function ReceptionDashboard() {
  const [currentTab, setCurrentTab] = useState<'live' | 'manual' | 'expected' | 'directory'>('live');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Manual Check-In Form State
  const [manualForm, setManualForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    purpose: '',
    hostName: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Badge Print Preview Modal State
  const [printedBadge, setPrintedBadge] = useState<Appointment | null>(null);

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHosts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/employees`);
      if (response.ok) {
        const data = await response.json();
        setHosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch hosts:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchHosts();
    const interval = setInterval(fetchAppointments, 8000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Manual Check-In Submission
  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.firstName || !manualForm.lastName) {
      showToast('⚠️ Please enter both first and last name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/visitors/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm)
      });

      if (response.ok) {
        showToast(`✓ Check-in completed for ${manualForm.firstName} ${manualForm.lastName}`);
        setManualForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          purpose: '',
          hostName: '',
          notes: ''
        });
        fetchAppointments();
        setCurrentTab('live');
      } else {
        showToast('✗ Failed to register visitor. Please try again.');
      }
    } catch (err) {
      showToast('✗ Network error during check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const q = searchQuery.toLowerCase();
    const visitorName = apt.visitor?.full_name?.toLowerCase() || '';
    const hostName = apt.host?.full_name?.toLowerCase() || '';
    const company = apt.visitor?.company?.toLowerCase() || '';
    const status = apt.status?.toLowerCase() || '';
    return visitorName.includes(q) || hostName.includes(q) || company.includes(q) || status.includes(q);
  });

  const checkedInVisitors = filteredAppointments.filter(a => a.status.toLowerCase() === 'checked in' || a.status.toLowerCase() === 'active');
  const expectedVisitors = filteredAppointments.filter(a => a.status.toLowerCase() === 'scheduled' || a.status.toLowerCase() === 'pending');

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shadow-emerald-500/20">
            <Building size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-wide">Front Desk</h1>
            <p className="text-[11px] text-emerald-600 font-medium">Reception Operations</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setCurrentTab('live')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === 'live' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} /> Live Lobby Queue
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${currentTab === 'live' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {checkedInVisitors.length}
            </span>
          </button>

          <button 
            onClick={() => setCurrentTab('manual')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === 'manual' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserPlus size={18} /> Manual Check-in
          </button>

          <button 
            onClick={() => setCurrentTab('expected')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === 'expected' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock size={18} /> Expected Visitors
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${currentTab === 'expected' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {expectedVisitors.length}
            </span>
          </button>

          <button 
            onClick={() => setCurrentTab('directory')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === 'directory' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building size={18} /> Host Directory
          </button>
        </nav>

        {/* Footer Role Badge */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Role: <span className="text-emerald-600 font-semibold">Receptionist</span></span>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs">
          <div className="w-96 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search visitor, host, company, or status..." 
              className="w-full bg-slate-50 text-sm text-slate-900 pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={fetchAppointments} 
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh queue"
            >
              <RefreshCw size={16} />
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Front Desk Station 01</span>
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                FD
              </div>
            </div>
          </div>
        </header>

        {/* TOAST MESSAGE */}
        {toastMessage && (
          <div className="mx-8 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium flex items-center justify-between shadow-xs">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage('')} className="text-xs text-emerald-600 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* CONTENT VIEW */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* TAB 1: LIVE LOBBY QUEUE */}
            {currentTab === 'live' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Live Lobby Queue</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Visitors currently checked-in at kiosk or waiting in reception area.</p>
                  </div>
                  <button 
                    onClick={() => setCurrentTab('manual')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <UserPlus size={14} /> Check In Guest
                  </button>
                </div>

                {/* Queue Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Visitor</th>
                        <th className="px-6 py-3 font-semibold">Meeting Host</th>
                        <th className="px-6 py-3 font-semibold">Check-in Time</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {checkedInVisitors.length > 0 ? (
                        checkedInVisitors.map((apt) => (
                          <tr key={apt.id} className="hover:bg-slate-50/80">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900">{apt.visitor?.full_name || 'Guest Visitor'}</div>
                              <div className="text-xs text-slate-500">{apt.visitor?.company || 'Visitor'} • {apt.visitor?.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-800">{apt.host?.full_name || 'Unassigned'}</div>
                              <div className="text-xs text-slate-500">{apt.host?.department || 'Staff'}</div>
                            </td>
                            <td className="px-6 py-4 text-xs font-mono text-slate-600">
                              {new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {apt.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => setPrintedBadge(apt)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors"
                              >
                                <Printer size={13} /> Print Badge
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs">
                            No active visitors in the lobby right now.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: MANUAL CHECK-IN */}
            {currentTab === 'manual' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Manual Guest Check-in</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Assist walk-in guests or visitors needing front desk registration.</p>
                </div>

                <form onSubmit={handleManualCheckIn} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                      <input 
                        type="text"
                        required
                        value={manualForm.firstName}
                        onChange={(e) => setManualForm({...manualForm, firstName: e.target.value})}
                        placeholder="e.g. John"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                      <input 
                        type="text"
                        required
                        value={manualForm.lastName}
                        onChange={(e) => setManualForm({...manualForm, lastName: e.target.value})}
                        placeholder="e.g. Doe"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                      <input 
                        type="email"
                        value={manualForm.email}
                        onChange={(e) => setManualForm({...manualForm, email: e.target.value})}
                        placeholder="e.g. john.doe@partner.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input 
                        type="tel"
                        value={manualForm.phone}
                        onChange={(e) => setManualForm({...manualForm, phone: e.target.value})}
                        placeholder="e.g. +1 (555) 019-2834"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose of Visit / Company</label>
                      <input 
                        type="text"
                        value={manualForm.purpose}
                        onChange={(e) => setManualForm({...manualForm, purpose: e.target.value})}
                        placeholder="e.g. Quarterly Business Review / Acme Corp"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Host Employee</label>
                      <select 
                        value={manualForm.hostName}
                        onChange={(e) => setManualForm({...manualForm, hostName: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      >
                        <option value="">Select Host Employee...</option>
                        {hosts.map(h => (
                          <option key={h.id} value={h.full_name}>{h.full_name} ({h.department})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Badge ID</label>
                    <textarea 
                      rows={2}
                      value={manualForm.notes}
                      onChange={(e) => setManualForm({...manualForm, notes: e.target.value})}
                      placeholder="e.g. Issued visitor badge #1042"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setCurrentTab('live')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      {isSubmitting ? 'Registering...' : 'Complete Check-in'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: EXPECTED VISITORS */}
            {currentTab === 'expected' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Expected & Scheduled Visitors</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Pre-registered appointments and scheduled arrivals for today.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Visitor</th>
                        <th className="px-6 py-3 font-semibold">Host</th>
                        <th className="px-6 py-3 font-semibold">Scheduled Time</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {expectedVisitors.length > 0 ? (
                        expectedVisitors.map((apt) => (
                          <tr key={apt.id} className="hover:bg-slate-50/80">
                            <td className="px-6 py-3.5 font-medium text-slate-900">
                              {apt.visitor?.full_name || 'Guest'}
                            </td>
                            <td className="px-6 py-3.5 text-slate-700">
                              {apt.host?.full_name || 'General Reception'}
                            </td>
                            <td className="px-6 py-3.5 text-xs font-mono text-slate-500">
                              {new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                {apt.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">
                            No pending or scheduled visitors found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: HOST DIRECTORY */}
            {currentTab === 'directory' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Host Employee Directory</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Quick look-up for employee extensions and host availability.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hosts.map(h => (
                    <div key={h.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700 text-sm shrink-0">
                        {h.full_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-slate-900 truncate">{h.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{h.department}</p>
                        {h.phone && <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><Phone size={10} /> {h.phone}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* PRINT BADGE MODAL */}
      {printedBadge && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <BadgeCheck size={28} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Visitor Badge Ready</h3>
              <p className="text-xs text-slate-500 mt-1">Ready to send badge to Front Desk thermal printer.</p>
            </div>

            <div className="bg-slate-50 text-slate-900 rounded-xl p-4 text-left border-2 border-dashed border-slate-300 space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">VISITOR PASS</div>
              <p className="text-base font-black text-slate-900">{printedBadge.visitor?.full_name}</p>
              <div className="text-xs text-slate-600">Host: <span className="font-semibold text-slate-900">{printedBadge.host?.full_name || 'Front Desk'}</span></div>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200 flex justify-between">
                <span>Valid: Today</span>
                <span>Badge #{printedBadge.id + 1000}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setPrintedBadge(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  showToast(`✓ Badge #${printedBadge.id + 1000} sent to printer!`);
                  setPrintedBadge(null);
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer size={14} /> Print Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
