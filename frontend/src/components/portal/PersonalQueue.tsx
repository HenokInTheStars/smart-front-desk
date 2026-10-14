'use client';

import React, { useState, useEffect } from 'react';
import { TablePagination } from '../ui/TablePagination';
import { Users, Clock, Calendar, CheckCircle2, XCircle, ChevronRight, User, Phone, Mail, MessageSquare, UserPlus, X } from 'lucide-react';
import PreRegisterForm from './PreRegisterForm';

interface PersonalQueueProps {
  currentUser: any;
}

export default function PersonalQueue({ currentUser }: PersonalQueueProps) {
  const [myVisitors, setMyVisitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'completed'>('live');
  const [sortOrder, setSortOrder] = useState<'time' | 'name'>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showAlert, setShowAlert] = useState(true);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showPreRegister, setShowPreRegister] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [cancellingVisitor, setCancellingVisitor] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState('');
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

  const handleOpenCancelModal = (e: React.MouseEvent, visitor: any) => {
    e.stopPropagation();
    setCancellingVisitor(visitor);
    setCancelReason('');
    setCancelError('');
  };

  const handleConfirmCancel = async () => {
    if (!cancellingVisitor) return;
    if (!cancelReason.trim()) {
      setCancelError('Please enter a reason for cancelling this appointment.');
      return;
    }

    setIsSubmittingCancel(true);
    setCancelError('');

    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;

      const fullNote = `[HOST_CANCELLED] ${cancelReason.trim()}`;
      
      const res = await fetch(`http://localhost:8000/appointments/${cancellingVisitor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'NEEDS_REASSIGNMENT',
          notes: fullNote
        })
      });

      if (res.ok) {
        setMyVisitors(prev => prev.filter(v => v.id !== cancellingVisitor.id));
        setToastMsg(`Appointment for ${cancellingVisitor.name} cancelled and sent to Reassign Guests.`);
        setTimeout(() => setToastMsg(null), 6000);
        setCancellingVisitor(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setCancelError(err.detail || 'Failed to cancel appointment. Please try again.');
      }
    } catch (e) {
      console.error(e);
      setCancelError('Network error while cancelling appointment.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

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
    <div className="bg-card min-h-[calc(100vh-80px)] -mt-6 -mx-6 p-8 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      
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

      {/* Cancellation & Reassignment Modal */}
      {cancellingVisitor && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Cancel Appointment</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Guest will be routed to Reception in Reassign Guests.
                </p>
              </div>
              <button 
                onClick={() => setCancellingVisitor(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Visitor Summary */}
              <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visitor:</span>
                  <span className="font-bold text-foreground">{cancellingVisitor.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company / Purpose:</span>
                  <span className="font-medium text-foreground">{cancellingVisitor.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled Time:</span>
                  <span className="font-medium text-foreground">{cancellingVisitor.time}</span>
                </div>
              </div>

              {/* Cancellation Reason */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">
                  Reason for Cancellation <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (cancelError) setCancelError('');
                  }}
                  placeholder="e.g., Called into emergency meeting. Please reassign to an available colleague."
                  className={`w-full bg-muted/20 border rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all resize-none text-foreground ${
                    cancelError ? 'border-destructive ring-1 ring-destructive/40' : 'border-border'
                  }`}
                />
                {cancelError && (
                  <p className="text-[11px] text-destructive font-medium">{cancelError}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  This explanation will be immediately visible to Reception on the Reassign Guests dashboard.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-border bg-muted/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancellingVisitor(null)}
                disabled={isSubmittingCancel}
                className="px-4 py-2 text-xs font-bold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel || !cancelReason.trim()}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5"
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm & Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Tabs and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-border mb-6 gap-4">
        <div className="flex overflow-x-auto">
          <button 
            onClick={() => setActiveTab('live')}
            className={`px-6 py-4 font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'live' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground hover:text-foreground/90'}`}
          >
            Live Assigned Queue ({waitingCount + inMeetingCount})
          </button>
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-4 font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'upcoming' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground hover:text-foreground/90'}`}
          >
            Upcoming & Future Reservations ({prebookedCount})
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-4 font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'completed' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground hover:text-foreground/90'}`}
          >
            Completed Past Visits ({completedCount})
          </button>
        </div>
        <div className="pb-4 lg:pb-0">
          <button 
            onClick={() => setShowPreRegister(true)} 
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:opacity-90 transition-opacity flex items-center gap-2"
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
          const mod = sortDirection === 'asc' ? 1 : -1;
          if (sortOrder === 'name') {
            return a.name.localeCompare(b.name) * mod;
          } else {
            return (new Date(a.rawTime).getTime() - new Date(b.rawTime).getTime()) * mod;
          }
        });

        const paginatedList = displayList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
        return (
          <>
            {/* Unified Table Container */}
            <div className="pb-20">
              <div className="bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
                
                {/* Table Header / Sorting Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border bg-muted/30">
                  <span className="text-sm font-bold text-foreground/90">{displayList.length} in this view</span>
                  <div className="flex items-center gap-3 text-sm mt-3 sm:mt-0">
                    <span className="text-muted-foreground/70 font-medium">Sort queue:</span>
                    <button 
                      onClick={() => {
                        if (sortOrder === 'time') setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                        else { setSortOrder('time'); setSortDirection('asc'); }
                      }}
                      className={`transition-colors px-4 py-1.5 rounded-full font-bold shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${sortOrder === 'time' ? 'bg-primary hover:bg-blue-700 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground border border-border'}`}
                    >
                      Arrival Time {sortOrder === 'time' && (sortDirection === 'asc' ? '↓' : '↑')}
                    </button>
                    <button 
                      onClick={() => {
                        if (sortOrder === 'name') setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                        else { setSortOrder('name'); setSortDirection('asc'); }
                      }}
                      className={`transition-colors px-4 py-1.5 rounded-full font-bold shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${sortOrder === 'name' ? 'bg-primary hover:bg-blue-700 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground border border-border'}`}
                    >
                      Visitor Name {sortOrder === 'name' && (sortDirection === 'asc' ? '↓' : '↑')}
                    </button>
                  </div>
                </div>

                {/* Table Content */}
                {isLoading ? (
                  <div className="p-10 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div></div>
                ) : displayList.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground/70 font-medium">No visitors in this view.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                      <tr className="bg-muted/30 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-bold">
                        <th className="p-4 pl-6 font-bold w-0 whitespace-nowrap">Status</th>
                        <th className="p-4 font-bold">Visitor</th>
                        <th className="p-4 font-bold w-32">Time</th>
                        <th className="p-4 pr-6 text-right font-bold w-auto">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedList.map(v => (
                        <React.Fragment key={v.id}>
                          <tr 
                            className="hover:bg-muted/30/50 transition-colors cursor-pointer group"
                            onClick={() => setExpandedCardId(expandedCardId === v.id ? null : v.id)}
                          >
                            <td className="p-4 pl-6 align-middle w-0 whitespace-nowrap">
                              {v.status === 'in_meeting' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-blue-700 border border-blue-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">Meeting</span>
                              )}
                              {(v.status === 'checked_in' || v.status === 'waiting') && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">Waiting</span>
                              )}
                              {v.status === 'scheduled' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold bg-slate-100 text-foreground/90 border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)]">Scheduled</span>
                              )}
                              {v.status === 'completed' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">Completed</span>
                              )}
                            </td>
                            <td className="p-4 align-middle">
                              <div className="font-bold text-foreground">{v.name}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]" title={v.company}>{v.company}</div>
                            </td>
                            <td className="p-4 align-middle text-sm text-muted-foreground font-medium whitespace-nowrap">
                              {v.time}
                            </td>
                            <td className="p-4 pr-6 align-middle text-right">
                              <div className="flex items-center justify-end gap-2">
                                {activeTab === 'upcoming' ? (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setExpandedCardId(expandedCardId === v.id ? null : v.id); }}
                                    className="px-2.5 py-1.5 bg-card border border-border hover:bg-muted/30 text-foreground/90 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                                  >
                                    <Phone size={12} /> Contact Info
                                  </button>
                                ) : v.status === 'in_meeting' ? (
                                  <>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); moveStatus(v.id, 'completed'); }}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors"
                                    >
                                      <CheckCircle2 size={12} /> Complete
                                    </button>
                                  </>
                                ) : (v.status !== 'completed' && (
                                  <>
                                    <button 
                                      onClick={(e) => handleNotifyGuest(e, v.id)}
                                      className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] whitespace-nowrap"
                                    >
                                      <MessageSquare size={12} /> Notify (5m)
                                    </button>
                                    <button 
                                      onClick={(e) => handleOpenCancelModal(e, v)}
                                      className="px-2.5 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] whitespace-nowrap"
                                      title="Cancel appointment and route visitor to reassignment"
                                    >
                                      Cancel
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
                                      className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors whitespace-nowrap ${inMeetingCount > 0 ? 'bg-slate-400 cursor-not-allowed opacity-80' : 'bg-primary hover:bg-blue-700'}`}
                                      title={inMeetingCount > 0 ? "Finish your current meeting first" : ""}
                                    >
                                      <User size={12} /> Admit
                                    </button>
                                  </>
                                ))}
                              </div>
                            </td>
                          </tr>
                          {expandedCardId === v.id && (
                            <tr className="bg-muted/30/50">
                              <td colSpan={4} className="p-0">
                                <div className="px-6 py-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <p className="text-xs text-muted-foreground/70 font-bold uppercase tracking-wider mb-1">Company / Organization</p>
                                      <p className="text-sm text-foreground font-medium">{v.company}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground/70 font-bold uppercase tracking-wider mb-1">Purpose / Notes</p>
                                      <p className="text-sm text-foreground font-medium">{v.purpose}</p>
                                    </div>
                                  </div>
                                  {activeTab === 'upcoming' && (
                                    <div className="mt-4 pt-4 border-t border-border flex items-center gap-6">
                                       <div className="flex items-center gap-2 text-sm text-foreground/90 font-medium">
                                         <Phone size={14} className="text-muted-foreground/70" /> {v.phone}
                                       </div>
                                       <div className="flex items-center gap-2 text-sm text-foreground/90 font-medium">
                                         <Mail size={14} className="text-muted-foreground/70" /> {v.email}
                                       </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                    <TablePagination totalItems={displayList.length} pageSize={pageSize} setPageSize={setPageSize} currentPage={currentPage} setCurrentPage={setCurrentPage} />
                </div>
              )}
              </div>
            </div>
      </>
      );
    })()}

    </div>
  );
}
