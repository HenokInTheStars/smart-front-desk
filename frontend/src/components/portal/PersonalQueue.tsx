'use client';

import React, { useState, useEffect } from 'react';
import { Users, Clock, Calendar, CheckCircle2, XCircle, ChevronRight, User, Phone, Mail, MessageSquare, UserPlus } from 'lucide-react';
import PreRegisterForm from './PreRegisterForm';

interface PersonalQueueProps {
  currentUser: any;
}

export default function PersonalQueue({ currentUser }: PersonalQueueProps) {
  const [myVisitors, setMyVisitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'completed'>('live');
  const [sortOrder, setSortOrder] = useState<'time' | 'name'>('time');
  const [showAlert, setShowAlert] = useState(true);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showPreRegister, setShowPreRegister] = useState(false);

  useEffect(() => {
    const fetchMyQueue = async () => {
      try {
        const token = sessionStorage.getItem('access_token');
        if (!token || !currentUser?.numeric_host_id) {
          setMyVisitors([]);
          setIsLoading(false);
          return;
        }

        const res = await fetch(`http://localhost:8000/appointments?host_id=${currentUser.numeric_host_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const raw = await res.json();
          const appointments = raw.data || [];
          
          const mapped = appointments.map((apt: any) => ({
            id: apt.id,
            name: apt.visitor?.full_name || 'Unknown',
            company: apt.visitor?.company || 'N/A',
            email: apt.visitor?.email || 'N/A',
            phone: apt.visitor?.phone || 'N/A',
            status: apt.status.toLowerCase(), // maps CHECKED_IN to checked_in, SCHEDULED to scheduled
            time: new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rawTime: apt.scheduled_time,
            purpose: apt.notes || 'Meeting Notes: backend'
          }));
          
          setMyVisitors(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch personal queue:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyQueue();
  }, [currentUser]);

  const moveStatus = async (id: string, newStatus: string) => {
    setMyVisitors(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
    
    let backendStatus = 'COMPLETED';
    if (newStatus === 'checked_in' || newStatus === 'waiting') backendStatus = 'CHECKED_IN';
    if (newStatus === 'in_meeting') backendStatus = 'IN_MEETING';
    if (newStatus === 'needs_reassignment') {
      backendStatus = 'NEEDS_REASSIGNMENT';
      setToastMsg('Visitor flagged as "Not Mine". Reception has been notified to reassign them.');
      setTimeout(() => setToastMsg(null), 6000);
    }
    
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      await fetch(`http://localhost:8000/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: backendStatus })
      });
    } catch(e) {
      console.error(e);
    }
  };

  const handleNotifyGuest = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      await fetch(`http://localhost:8000/appointments/${id}/notify-enter`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setToastMsg('Guest notified to enter in 5 minutes.');
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const inMeetingCount = myVisitors.filter(v => v.status === 'in_meeting').length;
  const waitingCount = myVisitors.filter(v => v.status === 'checked_in' || v.status === 'waiting').length;
  const completedCount = myVisitors.filter(v => v.status === 'completed').length;
  const prebookedCount = myVisitors.filter(v => v.status === 'expected' || v.status === 'scheduled').length;

  return (
    <div className="bg-white min-h-[calc(100vh-80px)] -mt-6 -mx-6 p-8 relative">
      
      {/* Success/Action Toast (Bottom Center) */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-full px-6 py-3 flex items-center gap-3 shadow-xl z-50 animate-in fade-in slide-in-from-bottom-4">
           <CheckCircle2 size={20} className="text-emerald-400" />
           <span className="font-semibold text-sm">{toastMsg}</span>
        </div>
      )}

      {/* Pre-Register Modal */}
      {showPreRegister && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-xl rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
            <PreRegisterForm currentUser={currentUser} onClose={() => setShowPreRegister(false)} />
          </div>
        </div>
      )}



      {/* Tabs and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 mb-6 gap-4">
        <div className="flex overflow-x-auto">
          <button 
            onClick={() => setActiveTab('live')}
          className={`px-6 py-4 font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'live' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={18} /> Live Assigned Queue ({waitingCount + inMeetingCount})
        </button>
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`px-6 py-4 font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'upcoming' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Calendar size={18} /> Upcoming & Future Reservations ({prebookedCount})
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
            className={`px-6 py-4 font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'completed' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Clock size={18} /> Completed Past Visits ({completedCount})
          </button>
        </div>
        <div className="pb-4 lg:pb-0">
          <button 
            onClick={() => setShowPreRegister(true)} 
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
             <UserPlus size={16} /> Pre-Register Guest
          </button>
        </div>
      </div>

      {/* Sorting Subheader */}
      {(() => {
        let displayList = myVisitors;
        if (activeTab === 'live') {
          displayList = myVisitors.filter(v => v.status === 'checked_in' || v.status === 'waiting' || v.status === 'in_meeting');
        } else if (activeTab === 'upcoming') {
          displayList = myVisitors.filter(v => v.status === 'expected' || v.status === 'scheduled');
        } else if (activeTab === 'completed') {
          displayList = myVisitors.filter(v => v.status === 'completed');
        }
        
        displayList = [...displayList].sort((a, b) => {
          if (sortOrder === 'name') {
            return a.name.localeCompare(b.name);
          } else {
            return new Date(a.rawTime).getTime() - new Date(b.rawTime).getTime();
          }
        });

        return (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
              <span className="text-sm font-bold text-slate-700">{displayList.length} in this view</span>
              <div className="flex items-center gap-3 text-sm mt-3 sm:mt-0">
                <span className="text-slate-400 font-medium">Sort queue:</span>
                <button 
                  onClick={() => setSortOrder('time')}
                  className={`transition-colors px-4 py-1.5 rounded-full font-bold shadow-sm ${sortOrder === 'time' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'}`}
                >
                  Arrival Time ↓
                </button>
                <button 
                  onClick={() => setSortOrder('name')}
                  className={`transition-colors px-4 py-1.5 rounded-full font-bold shadow-sm ${sortOrder === 'name' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'}`}
                >
                  Visitor Name
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-4 pb-20">
              {isLoading ? (
                <div className="p-10 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div></div>
              ) : displayList.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-medium">No visitors in this view.</div>
              ) : (
                displayList.map(v => (
                   <div 
                     key={v.id} 
                     className="border border-blue-100 bg-white rounded-2xl p-6 flex flex-col gap-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-blue-300 transition-colors cursor-pointer"
                     onClick={() => setExpandedCardId(expandedCardId === v.id ? null : v.id)}
                   >
                
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                   {/* Left Section */}
                   <div>
                      <div className="flex items-center gap-4 mb-2">
                         {v.status === 'in_meeting' && (
                           <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">In Meeting</span>
                         )}
                         {(v.status === 'checked_in' || v.status === 'waiting') && (
                           <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">Waiting in Lobby</span>
                         )}
                         {v.status === 'scheduled' && (
                           <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">Scheduled</span>
                         )}
                         <h3 className="text-xl font-bold font-serif text-slate-900 tracking-tight">{v.name}</h3>
                      </div>
                      <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                        Meeting <span className="w-1 h-1 rounded-full bg-slate-300" /> Arrived at {v.time}
                      </p>
                   </div>
                   
                   {/* Right Section Actions */}
                   <div className="flex items-center gap-3 shrink-0">
                      {activeTab === 'upcoming' ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setExpandedCardId(expandedCardId === v.id ? null : v.id); }}
                          className="px-5 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                        >
                          <Phone size={16} /> Contact Info
                        </button>
                      ) : v.status === 'in_meeting' ? (
                        <>
                          <button 
                            onClick={(e) => e.stopPropagation()}
                            className="px-5 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                          >
                            +15 Min
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveStatus(v.id, 'completed'); }}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors"
                          >
                            <CheckCircle2 size={16} /> Complete Meeting
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={(e) => handleNotifyGuest(e, v.id)}
                            className="px-4 py-2.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-sm font-bold rounded-xl flex items-center gap-2 transition-colors"
                          >
                            <MessageSquare size={16} /> Notify (5m)
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveStatus(v.id, 'needs_reassignment'); }}
                            className="px-5 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2 transition-colors"
                          >
                            <XCircle size={16} /> Not Mine
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (inMeetingCount > 0) {
                                setToastMsg('You are already in a meeting. Please complete it first.');
                                setTimeout(() => setToastMsg(null), 3000);
                                return;
                              }
                              moveStatus(v.id, 'in_meeting'); 
                            }} 
                            className={`px-5 py-2.5 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors ${inMeetingCount > 0 ? 'bg-slate-400 cursor-not-allowed opacity-80' : 'bg-blue-600 hover:bg-blue-700'}`}
                            title={inMeetingCount > 0 ? "Finish your current meeting first" : ""}
                          >
                            <User size={16} /> Admit & Start Meeting
                          </button>
                        </>
                      )}
                   </div>
                </div>

                {/* Expanded Details Section */}
                {expandedCardId === v.id && (
                  <div className="pt-4 mt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Company / Organization</p>
                        <p className="text-sm text-slate-800 font-medium">{v.company}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Purpose / Notes</p>
                        <p className="text-sm text-slate-800 font-medium">{v.purpose}</p>
                      </div>
                    </div>
                    {activeTab === 'upcoming' && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-6">
                         <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                           <Phone size={14} className="text-slate-400" /> {v.phone}
                         </div>
                         <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                           <Mail size={14} className="text-slate-400" /> {v.email}
                         </div>
                      </div>
                    )}
                  </div>
                )}
             </div>
          ))
        )}
      </div>
      </>
      );
    })()}

    </div>
  );
}
