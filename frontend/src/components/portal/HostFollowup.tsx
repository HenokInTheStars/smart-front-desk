'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Clock, Mail, Check, X } from 'lucide-react';

interface HostFollowupProps {
  currentUser: any;
}

export default function HostFollowup({ currentUser }: HostFollowupProps) {
  const [waitingGuests, setWaitingGuests] = useState<any[]>([]);

  React.useEffect(() => {
    fetchWaitingGuests();
  }, []);

  const fetchWaitingGuests = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch('http://localhost:8000/appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const raw = await res.json();
        const mapped = (raw.data || [])
          .filter((a: any) => a.status === 'CHECKED_IN')
          .map((a: any) => {
             const checkInTime = new Date(a.checked_in_at || a.scheduled_time).getTime();
             const waitMins = Math.max(0, Math.floor((Date.now() - checkInTime) / 60000));
             
             let displayValue = waitMins;
             let displayUnit = "Mins";
             if (waitMins >= 1440) {
               displayValue = Math.floor(waitMins / 1440);
               displayUnit = displayValue === 1 ? "Day" : "Days";
             } else if (waitMins >= 60) {
               displayValue = Math.floor(waitMins / 60);
               displayUnit = displayValue === 1 ? "Hour" : "Hours";
             } else {
               displayUnit = displayValue === 1 ? "Min" : "Mins";
             }

             return {
               id: a.id,
               guestName: a.visitor?.full_name || 'Unknown',
               hostName: a.host?.full_name || 'Unknown',
               hostPhone: a.host?.phone || 'No phone',
               waitTime: waitMins,
               displayValue,
               displayUnit,
               hostStatus: waitMins > 10 ? 'unresponsive' : 'notified'
             };
          });
        setWaitingGuests(mapped);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pingHost = async (id: string, method: string) => {
    try {
      const token = sessionStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/appointments/${id}/ping-host`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method })
      });
      if (res.ok) {
        setWaitingGuests(prev => prev.map(g => g.id === id ? { ...g, hostStatus: 'notified' } : g));
      } else {
        const errorData = await res.json();
        alert(`Failed to ping host: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to server.');
    }
  };

  const pingAllHosts = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/appointments/ping-all-hosts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        // Mark all as notified in UI
        setWaitingGuests(prev => prev.map(g => ({ ...g, hostStatus: 'notified' })));
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to server.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Host Follow-up</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor wait times and ping unresponsive hosts to collect their guests.
          </p>
        </div>
        <button
          onClick={pingAllHosts}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
        >
          <Mail size={16} />
          Email All Unresponsive
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {waitingGuests.map(guest => (
          <div key={guest.id} className={`bg-card border rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] relative overflow-hidden ${
            guest.waitTime > 15 ? 'border-amber-300' : 'border-border'
          }`}>
            
            {/* Alert Banner for long wait */}
            {guest.waitTime > 15 && (
              <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest text-center py-0.5">
                Extended Wait Time
              </div>
            )}

            <div className={`mt-2 flex items-start justify-between mb-4 ${guest.waitTime > 15 ? 'pt-2' : ''}`}>
               <div>
                 <h3 className="font-black text-foreground text-lg">{guest.guestName}</h3>
                 <p className="text-xs font-semibold text-muted-foreground mt-0.5">Waiting for <span className="text-foreground">{guest.hostName}</span></p>
                 <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                   <Smartphone size={10} /> {guest.hostPhone}
                 </p>
               </div>
               <div className="flex flex-col items-end">
                 <span className={`text-2xl font-black ${guest.waitTime > 15 ? 'text-amber-600' : 'text-foreground/90'}`}>
                   {guest.displayValue}
                 </span>
                 <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">{guest.displayUnit}</span>
               </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
               <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                 guest.hostStatus === 'notified' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-100' : 'bg-destructive/10 text-destructive border-rose-100'
               }`}>
                 {guest.hostStatus === 'notified' ? <Check size={12} /> : <X size={12} />}
                 {guest.hostStatus}
               </span>
            </div>

            <div className="space-y-2 border-t border-border/50 pt-4">
               <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">Escalate / Ping Host</p>
               <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => pingHost(guest.id, 'SMS')} className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/30 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors border border-border/50 hover:border-primary/20">
                   <Smartphone size={16} className="mb-1" />
                   <span className="text-[9px] font-bold">SMS</span>
                 </button>
                 <button onClick={() => pingHost(guest.id, 'Email')} className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/30 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors border border-border/50 hover:border-primary/20">
                   <Mail size={16} className="mb-1" />
                   <span className="text-[9px] font-bold">Email</span>
                 </button>
               </div>
            </div>

          </div>
        ))}

        {waitingGuests.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground/70 bg-card border border-border rounded-2xl border-dashed">
            <Clock size={32} className="mx-auto mb-2 opacity-50 text-emerald-500" />
            <p className="text-sm font-bold text-muted-foreground">All caught up!</p>
            <p className="text-xs">No guests are currently waiting for a host.</p>
          </div>
        )}
      </div>

    </div>
  );
}
