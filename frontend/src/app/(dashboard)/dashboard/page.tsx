'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Clock, CheckCircle, Plus, Search, 
  X, ChevronRight, UserCheck, Bell, Shield, Settings, AlertCircle
} from 'lucide-react';

export default function HostPortal() {
  const [currentView, setCurrentView] = useState<'visitors' | 'schedule'>('visitors');
  const [visitorTab, setVisitorTab] = useState<'queue' | 'history'>('queue');
  const [visitors, setVisitors] = useState<any[]>([]);
  const [showPreRegModal, setShowPreRegModal] = useState(false);
  const [preRegName, setPreRegName] = useState('');
  const [preRegCompany, setPreRegCompany] = useState('');
  const [preRegTime, setPreRegTime] = useState('');

  // Schedule state
  const [schedule, setSchedule] = useState<{ day: string; active: boolean; slots: string[] }[]>([
    { day: 'Mon', active: true, slots: ['09:00 - 17:00'] },
    { day: 'Tue', active: true, slots: ['09:00 - 17:00'] },
    { day: 'Wed', active: true, slots: ['09:00 - 17:00'] },
    { day: 'Thu', active: true, slots: ['09:00 - 17:00'] },
    { day: 'Fri', active: true, slots: ['09:00 - 16:00'] },
    { day: 'Sat', active: false, slots: [] },
    { day: 'Sun', active: false, slots: [] },
  ]);
  const [toastMessage, setToastMessage] = useState('');

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedVisitors = data.map((apt: any) => {
          const date = new Date(apt.scheduled_time);
          const purposeMatch = apt.notes ? apt.notes.match(/Purpose: (.*?)\n/) : null;
          const purpose = purposeMatch ? purposeMatch[1] : (apt.visitor?.company || 'Meeting');
          
          return {
            id: apt.id,
            name: apt.visitor?.full_name || 'Guest Visitor',
            company: apt.visitor?.company || purpose,
            status: apt.status.toLowerCase().replace(' ', '_'),
            arrivalTime: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            meetingMinutes: 0,
            purpose: purpose
          };
        });
        setVisitors(mappedVisitors);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 10000);
    return () => clearInterval(interval);
  }, []);

  // Meeting timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setVisitors(prev => prev.map(v =>
        v.status === 'in_meeting' ? { ...v, meetingMinutes: v.meetingMinutes + 1 } : v
      ));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: newStatus, meetingMinutes: 0 } : v));
    showToast(`Visitor status updated to ${newStatus.replace('_', ' ')}.`);
  };

  const extendMeeting = (id: number) => {
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, meetingMinutes: Math.max(0, v.meetingMinutes - 15) } : v));
    showToast('Meeting extended by +15 minutes.');
  };

  const handlePreRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preRegName) return;
    const newEntry = {
      id: Date.now(),
      name: preRegName,
      company: preRegCompany || 'Pre-registered Guest',
      status: 'expected',
      arrivalTime: preRegTime || 'Today',
      meetingMinutes: 0,
      purpose: 'Appointment'
    };
    setVisitors([newEntry, ...visitors]);
    setShowPreRegModal(false);
    setPreRegName('');
    setPreRegCompany('');
    setPreRegTime('');
    showToast(`✓ Pre-registered ${preRegName} successfully.`);
  };

  const activeWaiting = visitors.filter(v => v.status === 'checked_in' || v.status === 'waiting');
  const activeInMeeting = visitors.filter(v => v.status === 'in_meeting');
  const completedList = visitors.filter(v => v.status === 'completed' || v.status === 'checked_out');

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shadow-blue-500/20">
            <UserCheck size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-wide">Host Portal</h1>
            <p className="text-[11px] text-blue-600 font-medium">Employee Station</p>
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={() => setShowPreRegModal(true)}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Plus size={14} /> Pre-Register Guest
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
              <Users size={18} /> Visitor Queue
            </div>
            {activeWaiting.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${currentView === 'visitors' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {activeWaiting.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setCurrentView('schedule')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'schedule' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar size={18} /> My Availability
          </button>
        </nav>

        {/* Footer Role */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
          Role: <span className="text-blue-600 font-semibold">Host Employee</span>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-800">
            {currentView === 'visitors' ? 'Host Appointments & Meetings' : 'Weekly Availability Schedule'}
          </h2>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Host Alex Morgan</span>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                AM
              </div>
            </div>
          </div>
        </header>

        {/* TOAST MESSAGE */}
        {toastMessage && (
          <div className="mx-8 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium flex items-center justify-between shadow-xs">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage('')} className="text-xs text-emerald-600 hover:underline">Dismiss</button>
          </div>
        )}

        {/* SCROLLABLE MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* VIEW 1: VISITORS QUEUE */}
            {currentView === 'visitors' && (
              <div className="space-y-6">
                
                {/* Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Waiting in Lobby</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeWaiting.length}</h3>
                    <p className="text-[11px] text-amber-600 mt-2 font-medium">Ready for meeting</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Active in Meeting</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeInMeeting.length}</h3>
                    <p className="text-[11px] text-blue-600 mt-2 font-medium">30-min auto timer running</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Completed Today</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{completedList.length}</h3>
                    <p className="text-[11px] text-emerald-600 mt-2 font-medium">Logged & checked out</p>
                  </div>
                </div>

                {/* Queue Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setVisitorTab('queue')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          visitorTab === 'queue' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Live Queue
                      </button>
                      <button 
                        onClick={() => setVisitorTab('history')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          visitorTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Completed History
                      </button>
                    </div>
                  </div>

                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Visitor Name</th>
                        <th className="px-6 py-3 font-semibold">Purpose / Company</th>
                        <th className="px-6 py-3 font-semibold">Time</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {visitors.filter(v => visitorTab === 'queue' ? v.status !== 'completed' && v.status !== 'checked_out' : v.status === 'completed' || v.status === 'checked_out').length > 0 ? (
                        visitors.filter(v => visitorTab === 'queue' ? v.status !== 'completed' && v.status !== 'checked_out' : v.status === 'completed' || v.status === 'checked_out').map((visitor) => (
                          <tr key={visitor.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-900">{visitor.name}</td>
                            <td className="px-6 py-4 text-xs text-slate-500">{visitor.company} • {visitor.purpose}</td>
                            <td className="px-6 py-4 text-xs font-mono text-slate-600">{visitor.arrivalTime}</td>
                            <td className="px-6 py-4">
                              {visitor.status === 'checked_in' || visitor.status === 'waiting' ? (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                  Waiting in Lobby
                                </span>
                              ) : visitor.status === 'in_meeting' ? (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                  In Meeting ({visitor.meetingMinutes}m)
                                </span>
                              ) : (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                  Completed
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                {(visitor.status === 'checked_in' || visitor.status === 'waiting') && (
                                  <button
                                    onClick={() => handleStatusChange(visitor.id, 'in_meeting')}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                                  >
                                    Acknowledge & Start
                                  </button>
                                )}
                                {visitor.status === 'in_meeting' && (
                                  <>
                                    <button
                                      onClick={() => extendMeeting(visitor.id)}
                                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
                                    >
                                      +15m
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(visitor.id, 'completed')}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                                    >
                                      Complete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">
                            No appointments in this queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* VIEW 2: SCHEDULE AVAILABILITY */}
            {currentView === 'schedule' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Weekly Availability</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Set the days and hours you are available to receive visitors.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 shadow-xs">
                  {schedule.map((dayObj, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50/80">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={dayObj.active}
                          onChange={() => {
                            const updated = [...schedule];
                            updated[i].active = !updated[i].active;
                            setSchedule(updated);
                          }}
                          className="w-4 h-4 rounded bg-slate-50 border-slate-300 text-blue-600 focus:ring-0"
                        />
                        <span className={`text-sm font-semibold ${dayObj.active ? 'text-slate-900' : 'text-slate-400'}`}>
                          {dayObj.day}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500">
                        {dayObj.active && dayObj.slots.length > 0 ? (
                          dayObj.slots.join(', ')
                        ) : (
                          <span className="italic text-slate-400">Unavailable</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => showToast('✓ Availability schedule saved successfully.')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                  >
                    Save Availability
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* PRE-REGISTRATION MODAL */}
      {showPreRegModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Pre-Register Visitor</h3>
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
                  placeholder="e.g. Sarah Connor"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization</label>
                <input 
                  type="text"
                  value={preRegCompany}
                  onChange={(e) => setPreRegCompany(e.target.value)}
                  placeholder="e.g. Cyberdyne Systems"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Arrival Time</label>
                <input 
                  type="text"
                  value={preRegTime}
                  onChange={(e) => setPreRegTime(e.target.value)}
                  placeholder="e.g. 02:30 PM"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
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
                  Pre-Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}