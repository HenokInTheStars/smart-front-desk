'use client';

import React, { useState, useEffect } from 'react';
import { Activity, LogIn, LogOut, AlertCircle, Clock, Search, Filter } from 'lucide-react';

interface LiveStreamProps {
  currentUser: any;
}

export default function LiveStream({ currentUser }: LiveStreamProps) {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch initial recent history to seed the stream
    const seedStream = async () => {
      try {
        const token = sessionStorage.getItem('access_token');
        if (!token) return;
        const res = await fetch('http://localhost:8000/appointments?limit=50', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const raw = await res.json();
          // Filter out future reservations that haven't actually checked in yet
          const pastEvents = (raw.data || []).filter((apt: any) => 
            !['expected', 'scheduled'].includes(apt.status.toLowerCase())
          );
          
          const initialLogs = pastEvents.map((apt: any) => ({
            id: apt.id,
            type: apt.status.toLowerCase() === 'checked_in' ? 'check_in' : (apt.status.toLowerCase() === 'checked_out' ? 'check_out' : 'system'),
            visitor: apt.visitor?.full_name || 'Unknown',
            host: apt.host?.full_name || 'Unknown',
            time: new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            method: 'System'
          }));
          setLogs(initialLogs);
        }
      } catch(err) {
        console.error(err);
      }
    };
    seedStream();

    // 2. Subscribe to real-time events via SSE
    const es = new EventSource('http://localhost:8000/live/updates');
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const newLog = {
          id: Math.random().toString(), // temporary ID
          type: event.type === 'checkin' ? 'check_in' : 'alert',
          visitor: data.visitor?.full_name || 'Unknown Guest',
          host: data.host?.full_name || 'System',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          method: 'Kiosk Event'
        };
        // Prepend new log
        setLogs(prev => [newLog, ...prev]);
      } catch(e) {
        console.error("SSE parse error", e);
      }
    };
    
    // Specifically listen for custom 'checkin' event if backend uses that instead of 'message'
    es.addEventListener('checkin', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        const newLog = {
          id: Math.random().toString(), // temporary ID
          type: 'check_in',
          visitor: data.visitor?.full_name || 'Unknown Guest',
          host: data.host?.full_name || 'System',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          method: 'Kiosk Event'
        };
        setLogs(prev => [newLog, ...prev]);
      } catch(e) {
        console.error("SSE parse error", e);
      }
    });

    return () => es.close();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'check_in': return <LogIn size={16} className="text-emerald-500" />;
      case 'check_out': return <LogOut size={16} className="text-muted-foreground" />;
      case 'alert': return <AlertCircle size={16} className="text-rose-500" />;
      case 'system': return <Activity size={16} className="text-slate-500" />;
      default: return <Activity size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Live Visitor Stream</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Raw, real-time feed of all physical access events.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input type="text" placeholder="Search stream..." className="pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none w-48 transition-all" />
          </div>
          <button className="p-2 bg-card border border-border rounded-lg hover:bg-muted/30 transition-colors text-muted-foreground">
             <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden font-mono">
        <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800">
           <div className="flex items-center gap-2">
             <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
             <span className="text-xs text-muted-foreground/70 uppercase tracking-widest font-bold">Live Feed Connection</span>
           </div>
           <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> {new Date().toLocaleTimeString()}</span>
        </div>

        <div className="p-4 space-y-2 h-[500px] overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="group flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700">
              <div className="mt-1 shrink-0 p-1.5 bg-slate-800 rounded-md">
                {getIcon(log.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-200">
                    {log.type === 'check_in' && 'Check-in event'}
                    {log.type === 'check_out' && 'Check-out event'}
                    {log.type === 'alert' && 'Security alert generated'}
                    {log.type === 'system' && 'System event'}
                  </p>
                  <span className="text-xs text-muted-foreground">{log.time}</span>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Visitor: <span className="text-slate-300 font-bold">{log.visitor}</span> | 
                  Host: <span className="text-slate-300">{log.host}</span> | 
                  Method: <span className="text-slate-300">{log.method}</span>
                </p>
              </div>
            </div>
          ))}
          
          <div className="text-center py-4">
             <div className="inline-block px-3 py-1 rounded-full border border-slate-800 bg-slate-800/50 text-[10px] text-muted-foreground uppercase tracking-widest">
               Listening for new events...
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}
