'use client';

import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle2, ChevronRight, UserCheck, AlertCircle, Activity, LogIn, LogOut, Search, Filter } from 'lucide-react';

interface GlobalLobbyViewProps {
  currentUser: any;
}

export default function GlobalLobbyView({ currentUser }: GlobalLobbyViewProps) {
  const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
  const [expectedVisitors, setExpectedVisitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch Global Queue
    const fetchGlobalQueue = async () => {
      setIsLoading(true);
      try {
        const token = sessionStorage.getItem('access_token');
        if (!token) return;

        const res = await fetch('http://localhost:8000/appointments?limit=50', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const raw = await res.json();
          const appointments = raw.data || [];
          
          const mapped = appointments.map((apt: any) => ({
            id: apt.id,
            name: apt.visitor?.full_name || 'Unknown',
            host: apt.host?.full_name || 'Unknown',
            status: apt.status.toLowerCase(),
            checkInTime: new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            scheduledTime: new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          
          setActiveVisitors(mapped.filter((v: any) => v.status === 'checked_in' || v.status === 'in_meeting'));
          setExpectedVisitors(mapped.filter((v: any) => v.status === 'scheduled'));

          // Seed Live Stream with past events
          const pastEvents = appointments.filter((apt: any) => 
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
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGlobalQueue();

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
        setLogs(prev => [newLog, ...prev]);
        fetchGlobalQueue();
      } catch(e) {
        console.error("SSE parse error", e);
      }
    };
    
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
        fetchGlobalQueue();
      } catch(e) {
        console.error("SSE parse error", e);
      }
    });

    return () => es.close();
  }, []);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'check_in': return <LogIn size={16} />;
      case 'check_out': return <LogOut size={16} />;
      case 'alert': return <AlertCircle size={16} />;
      case 'system': return <Activity size={16} />;
      default: return <Activity size={16} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Global Lobby View</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time overview and raw event feed of all physical access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-700 rounded-full text-xs font-semibold flex items-center gap-2 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Live
          </div>
        </div>
      </div>

      {/* KPI Cards (12 Grid) */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4 bg-card px-5 py-4 rounded-2xl border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-shadow relative overflow-hidden group">
          <p className="text-[13px] font-semibold text-muted-foreground mb-1.5">Currently in Lobby</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-black text-foreground leading-none">{activeVisitors.filter(v => v.status === 'waiting' || v.status === 'checked_in').length}</h3>
            <span className="text-[11px] font-medium text-amber-600 mb-0.5">Waiting</span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 bg-card px-5 py-4 rounded-2xl border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-shadow relative overflow-hidden group">
          <p className="text-[13px] font-semibold text-muted-foreground mb-1.5">In Active Meetings</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-black text-indigo-900 leading-none">{activeVisitors.filter(v => v.status === 'in_meeting').length}</h3>
            <span className="text-[11px] font-medium text-primary mb-0.5">Checked In</span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 bg-card px-5 py-4 rounded-2xl border border-border shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden">
           <p className="text-[13px] font-semibold text-muted-foreground mb-1.5">Expected Today</p>
           <div className="flex items-end gap-2">
            <h3 className="text-3xl font-black text-foreground leading-none">{expectedVisitors.length}</h3>
            <span className="text-[11px] font-medium text-muted-foreground mb-0.5">Scheduled</span>
          </div>
        </div>
      </div>

      {/* Split View: Live Feed & Upcoming (12 Grid) */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Col: Unified Live Security & Visitor Stream (8 / 12 columns) */}
        <div className="col-span-12 xl:col-span-8 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="bg-muted/50 px-5 py-4 flex items-center justify-between border-b border-border">
             <div className="flex items-center gap-3">
               <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <h3 className="text-sm text-foreground uppercase tracking-widest font-bold">Live Security & Visitor Stream</h3>
             </div>
             <div className="flex items-center gap-4">
               <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> Real-time Feed</span>
             </div>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {logs.map((log) => {
              const isActive = activeVisitors.some(v => v.id === log.id) && log.type === 'check_in';
              
              return (
                <div key={log.id} className={`group flex items-start gap-3 p-3 rounded-xl transition-colors border ${
                  isActive ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30' : 'bg-muted/30 border-border/50 hover:border-border'
                }`}>
                  <div className={`mt-0.5 shrink-0 p-2 rounded-lg ${
                    isActive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-500' : 'bg-muted text-muted-foreground'
                  }`}>
                    {getLogIcon(log.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <p className={`text-sm font-bold ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                          {log.type === 'check_in' && 'Check-in Recorded'}
                          {log.type === 'check_out' && 'Check-out Recorded'}
                          {log.type === 'alert' && 'Security Alert'}
                          {log.type === 'system' && 'System Event'}
                        </p>
                        {isActive && (
                           <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30 uppercase tracking-widest">
                             Currently On Premise
                           </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{log.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Visitor: <span className="text-foreground font-bold">{log.visitor}</span><br/>
                      Host Escort: <span className="text-foreground">{log.host}</span>
                    </p>
                  </div>
                </div>
              );
            })}
            
            {logs.length === 0 && !isLoading && (
               <div className="text-center py-12">
                 <Activity size={32} className="mx-auto text-foreground/90 mb-3" />
                 <p className="text-muted-foreground text-sm">No activity recorded yet today.</p>
               </div>
            )}
            
            <div className="text-center py-4">
               <div className="inline-block px-4 py-1.5 rounded-full border border-border bg-muted/50 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                 Listening for new events...
               </div>
            </div>
          </div>
        </div>

        {/* Right Col: Upcoming Reservations (4 / 12 columns) */}
        <div className="col-span-12 xl:col-span-4 bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col h-[600px]">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/50">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" /> Upcoming Reservations
            </h3>
          </div>
          <div className="p-0 overflow-y-auto flex-1">
            {expectedVisitors.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming reservations</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {expectedVisitors.map(visitor => (
                  <li key={visitor.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer">
                    <div>
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{visitor.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Host: <span className="font-medium text-foreground">{visitor.host}</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md border border-border">
                        {visitor.scheduledTime}
                      </span>
                      <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
