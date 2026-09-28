'use client';

import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle2, ChevronRight, UserCheck, AlertCircle } from 'lucide-react';

interface GlobalLobbyViewProps {
  currentUser: any;
}

export default function GlobalLobbyView({ currentUser }: GlobalLobbyViewProps) {
  // Placeholder state for the global lobby view data
  const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
  const [expectedVisitors, setExpectedVisitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchGlobalQueue = async () => {
      setIsLoading(true);
      try {
        const token = sessionStorage.getItem('access_token');
        if (!token) return;

        const res = await fetch(`http://localhost:8000/appointments`, {
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
        }
      } catch (err) {
        console.error('Failed to fetch global queue:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGlobalQueue();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Global Lobby View</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time overview of all building visitors and front desk traffic.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-700 rounded-full text-xs font-semibold flex items-center gap-2 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Live
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={64} />
          </div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">Currently in Lobby</p>
          <div className="flex items-end gap-2">
            <h3 className="text-4xl font-black text-foreground">{activeVisitors.filter(v => v.status === 'waiting' || v.status === 'checked_in').length}</h3>
            <span className="text-xs font-medium text-amber-600 mb-1">Waiting</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 size={64} />
          </div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">In Active Meetings</p>
          <div className="flex items-end gap-2">
            <h3 className="text-4xl font-black text-indigo-900">{activeVisitors.filter(v => v.status === 'in_meeting').length}</h3>
            <span className="text-xs font-medium text-primary mb-1">Checked In</span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden">
           <p className="text-sm font-semibold text-muted-foreground/70 mb-1">Expected Today</p>
           <div className="flex items-end gap-2">
            <h3 className="text-4xl font-black text-white">{expectedVisitors.length}</h3>
            <span className="text-xs font-medium text-slate-300 mb-1">Scheduled</span>
          </div>
        </div>
      </div>

      {/* Main Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active Visitors */}
        <div className="bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-muted/30/50">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <UserCheck size={16} className="text-primary" /> Active Visitors
            </h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            {activeVisitors.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground/70">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active visitors</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {activeVisitors.map(visitor => (
                  <li key={visitor.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{visitor.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Host: <span className="font-medium text-foreground/90">{visitor.host}</span></p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        (visitor.status === 'waiting' || visitor.status === 'checked_in') ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-primary/20 text-primary border border-primary/20'
                      }`}>
                        {visitor.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                        <Clock size={10} /> {visitor.checkInTime}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Expected Visitors */}
        <div className="bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-muted/30/50">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" /> Upcoming Reservations
            </h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            {expectedVisitors.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground/70">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming reservations today</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {expectedVisitors.map(visitor => (
                  <li key={visitor.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group cursor-pointer">
                    <div>
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{visitor.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Host: <span className="font-medium text-foreground/90">{visitor.host}</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-muted-foreground bg-slate-100 px-2 py-1 rounded-md border border-border">
                        {visitor.scheduledTime}
                      </span>
                      <ChevronRight size={16} className="text-muted-foreground/70 group-hover:text-primary transition-colors" />
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
