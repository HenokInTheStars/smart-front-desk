'use client';

import React, { useState, useEffect } from 'react';
import { BellRing, CheckCircle2, UserCircle2, MapPin, Search } from 'lucide-react';

interface ArrivalAlertsProps {
  currentUser: any;
}

export default function ArrivalAlerts({ currentUser }: ArrivalAlertsProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reassigningAlertId, setReassigningAlertId] = useState<string | null>(null);
  const [selectedHostId, setSelectedHostId] = useState<string>('');

  const fetchAlerts = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;

      // In a real system, you might filter this by a specific endpoint for 'all alerts'
      // Since NEEDS_REASSIGNMENT implies action needed by Reception, we fetch all appointments.
      // We pass no host_id so it fetches all, then filter.
      // (If the API enforces host_id, you might need a different endpoint, but we'll try this first).
      const res = await fetch(`http://localhost:8000/appointments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const raw = await res.json();
        const appointments = raw.data || [];
        
        const reassignmentAlerts = appointments
          .filter((apt: any) => 
            apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' &&
            (apt.status === 'NEEDS_REASSIGNMENT' || 
            (apt.notes && (apt.notes.includes('[HOST_BUSY_WAIT]') || apt.notes.includes('[HOST_UNAVAILABLE_WAIT]') || apt.notes.includes('Purpose: Delivery'))))
          )
          .map((apt: any) => {
            const isBusyWait = apt.notes && apt.notes.includes('[HOST_BUSY_WAIT]');
            const isUnavailableWait = apt.notes && apt.notes.includes('[HOST_UNAVAILABLE_WAIT]');
            const isDelivery = apt.notes && apt.notes.includes('Purpose: Delivery');
            
            let type = 'Reassignment';
            if (isBusyWait) type = 'Waiting (Host Busy)';
            if (isUnavailableWait) type = 'Waiting (Host Unavailable)';
            if (isDelivery) type = 'Delivery Arrived';

            return {
              id: apt.id,
              visitorName: apt.visitor?.full_name || 'Unknown',
              company: apt.visitor?.company || 'Unknown',
              originalHostName: apt.host?.full_name || 'Unknown',
              time: new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              notes: apt.notes ? apt.notes.replace('[HOST_BUSY_WAIT]', '').replace('[HOST_UNAVAILABLE_WAIT]', '').replace('Purpose: Delivery\nNotes: ', '').trim() : 'No notes provided',
              type: type,
              needsReassignment: apt.status === 'NEEDS_REASSIGNMENT',
              phone: apt.visitor?.phone
            };
          });
        
        setAlerts(reassignmentAlerts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch(`http://localhost:8000/employees?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const raw = await res.json();
        setEmployees(raw.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchEmployees();
    // Poll every 10 seconds for new alerts
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const dismissAlert = async (id: string) => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      await fetch(`http://localhost:8000/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch(e) {
      console.error(e);
    }
  };

  const submitReassignment = async (id: string) => {
    if (!selectedHostId) return;
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch(`http://localhost:8000/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          host_id: selectedHostId,
          status: 'CHECKED_IN' // Moving them back to the lobby pool for the new host
        })
      });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== id));
        setReassigningAlertId(null);
        setSelectedHostId('');
      }
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Notification Feed</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live updates for visitors who need reassignment or immediate attention.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-xl font-bold text-sm border border-red-200">
           <BellRing size={16} /> {alerts.length} Active Alerts
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
           <div className="relative w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
             <input type="text" placeholder="Search alerts..." className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
           </div>
        </div>

        <div className="divide-y divide-border">
           {isLoading ? (
             <div className="p-12 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full"></div></div>
           ) : alerts.length === 0 ? (
             <div className="p-16 text-center">
               <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CheckCircle2 size={32} />
               </div>
               <h3 className="text-lg font-bold text-foreground mb-1">All clear!</h3>
               <p className="text-muted-foreground">There are no visitors awaiting reassignment right now.</p>
             </div>
           ) : (
             alerts.map(alert => (
               <div key={alert.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-muted/10 transition-colors">
                  <div className="flex items-start gap-4">
                     <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                       <UserCircle2 size={24} />
                     </div>
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider ${alert.needsReassignment ? 'bg-red-500' : 'bg-amber-500'}`}>
                           {alert.type}
                         </span>
                         <span className="text-xs text-muted-foreground font-medium">{alert.time}</span>
                       </div>
                       <h3 className="text-lg font-bold text-foreground">
                         <span className="text-foreground">{alert.visitorName}</span> ({alert.company})
                         {alert.phone && <span className="text-sm font-normal text-muted-foreground ml-2">📞 {alert.phone}</span>}
                       </h3>
                       <p className="text-sm text-muted-foreground mt-1">
                         {alert.type === 'Delivery Arrived' ? (
                           <>Dropped off a delivery for <span className="font-semibold text-foreground">{alert.notes}</span>.</>
                         ) : alert.needsReassignment ? (
                           <>Originally assigned to <span className="font-semibold text-foreground">{alert.originalHostName}</span>, who marked them as "Not Mine".</>
                         ) : (
                           <>Waiting for <span className="font-semibold text-foreground">{alert.originalHostName}</span>, who is currently busy.</>
                         )}
                       </p>
                       {alert.type !== 'Delivery Arrived' && (
                         <p className="text-sm text-foreground bg-muted p-2 rounded mt-2 border border-border/50">
                           <span className="font-semibold">Notes:</span> {alert.notes}
                         </p>
                       )}
                     </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                     {alert.type === 'Delivery Arrived' ? (
                        <button 
                          onClick={() => dismissAlert(alert.id)}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm text-center"
                        >
                          OK / Acknowledge
                        </button>
                     ) : reassigningAlertId === alert.id ? (
                       <div className="flex flex-col gap-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
                         <select 
                           className="px-3 py-2 border border-border rounded-xl text-sm bg-card text-foreground"
                           value={selectedHostId}
                           onChange={(e) => setSelectedHostId(e.target.value)}
                         >
                           <option value="" disabled>Select new host...</option>
                           {employees.map(emp => (
                             <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.department})</option>
                           ))}
                         </select>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => setReassigningAlertId(null)}
                             className="flex-1 px-3 py-2 bg-muted text-muted-foreground hover:bg-muted/80 font-bold text-sm rounded-xl transition-colors text-center"
                           >
                             Cancel
                           </button>
                           <button 
                             onClick={() => submitReassignment(alert.id)}
                             disabled={!selectedHostId}
                             className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-sm text-center"
                           >
                             Confirm
                           </button>
                         </div>
                       </div>
                     ) : (
                       <>
                         <button 
                           onClick={() => { setReassigningAlertId(alert.id); setSelectedHostId(''); }}
                           className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl transition-colors shadow-sm text-center"
                         >
                           Reassign Host
                         </button>
                         <button 
                           onClick={() => dismissAlert(alert.id)}
                           className="px-5 py-2.5 bg-card border border-border hover:bg-muted text-foreground font-bold text-sm rounded-xl transition-colors text-center"
                         >
                           Dismiss / Cancel
                         </button>
                       </>
                     )}
                  </div>
               </div>
             ))
           )}
        </div>
      </div>

    </div>
  );
}
