'use client';

import React, { useState, useEffect } from 'react';
import { User, Clock, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

interface MeetingStatusProps {
  currentUser: any;
}

export default function MeetingStatus({ currentUser }: MeetingStatusProps) {
  const [visitors, setVisitors] = useState<any[]>([]);

  React.useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      const hostId = currentUser?.numeric_host_id;
      let url = 'http://localhost:8000/appointments';
      if (hostId) url += `?host_id=${hostId}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const raw = await res.json();
        const mapped = (raw.data || []).map((a: any) => {
          let st = 'completed';
          if (a.status === 'CHECKED_IN') st = 'waiting';
          if (a.status === 'IN_MEETING') st = 'in_meeting';
          return {
            id: a.id,
            name: a.visitor?.full_name || 'Unknown',
            company: a.visitor?.company_name || 'No Company',
            status: st,
            time: new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        });
        setVisitors(mapped);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const moveStatus = async (id: string, newStatus: string) => {
    // Optimistic update
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
    
    // Sync backend
    let backendStatus = 'COMPLETED';
    if (newStatus === 'waiting') backendStatus = 'CHECKED_IN';
    if (newStatus === 'in_meeting') backendStatus = 'IN_MEETING';
    
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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('visitorId', id);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const visitorId = e.dataTransfer.getData('visitorId');
    if (visitorId) {
      const visitor = visitors.find(v => v.id === visitorId);
      if (visitor && visitor.status !== targetStatus) {
        moveStatus(visitorId, targetStatus);
      }
    }
  };

  const getStatusColumn = (status: string, title: string, color: string, nextStatus: string | null) => {
    const columnVisitors = visitors.filter(v => v.status === status);
    
    return (
      <div 
        className="flex-1 bg-muted/30 rounded-2xl p-4 border border-border flex flex-col h-full"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, status)}
      >
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
          <div className={`w-3 h-3 rounded-full ${color}`}></div>
          {title} ({columnVisitors.length})
        </h3>
        
        <div className="flex-1 space-y-3 overflow-y-auto">
          {columnVisitors.map(visitor => (
            <div 
              key={visitor.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, visitor.id)}
              className="bg-card p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-border hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-shadow group cursor-grab active:cursor-grabbing"
            >
               <div className="flex items-start justify-between mb-3">
                 <div>
                   <h4 className="font-bold text-foreground text-sm">{visitor.name}</h4>
                   <p className="text-xs text-muted-foreground mt-0.5">{visitor.company}</p>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-muted-foreground/70">
                   <User size={14} />
                 </div>
               </div>
               
               <div className="flex items-center justify-between border-t border-border/50 pt-3">
                 <span className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                   <Clock size={12} /> {visitor.time}
                 </span>
                 
                 {nextStatus && (
                   <button 
                     onMouseDown={(e) => e.stopPropagation()}
                     onClick={(e) => {
                       e.stopPropagation();
                       e.preventDefault();
                       moveStatus(visitor.id, nextStatus);
                     }}
                     className="text-xs font-bold text-primary hover:text-indigo-800 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     Move <ChevronRight size={14} />
                   </button>
                 )}
               </div>
            </div>
          ))}
          {columnVisitors.length === 0 && (
            <div className="h-24 flex items-center justify-center text-muted-foreground/70 text-xs font-semibold border-2 border-dashed border-border rounded-xl">
              Empty
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-120px)] flex flex-col">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Meeting Status Controls</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kanban board to track the progression of your active visitors.
          </p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {getStatusColumn('waiting', '1. Waiting in Lobby', 'bg-amber-500', 'in_meeting')}
        {getStatusColumn('in_meeting', '2. In Active Meeting', 'bg-indigo-500', 'completed')}
        {getStatusColumn('completed', '3. Completed / Checked Out', 'bg-emerald-500', null)}
      </div>

    </div>
  );
}
