'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Search, AlertOctagon, UserX, UserCheck } from 'lucide-react';

interface WatchlistMonitorProps {
  currentUser: any;
}

export default function WatchlistMonitor({ currentUser }: WatchlistMonitorProps) {
  const [watchlist, setWatchlist] = useState([
    { id: 1, name: 'John Smith', alias: 'J.S.', reason: 'Terminated Employee', severity: 'high', dateAdded: '2023-10-12' },
    { id: 2, name: 'Jane Doe', alias: 'Unknown', reason: 'Repeated Harassment', severity: 'critical', dateAdded: '2024-01-05' }
  ]);

  const [alerts, setAlerts] = useState<any[]>([
    { id: 101, matchName: 'Jon Smith', time: '10:45 AM', status: 'flagged', device: 'Lobby Kiosk 1' }
  ]);

  useEffect(() => {
    const es = new EventSource('http://localhost:8000/live/updates');
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (event.type === 'alert' || data.type === 'alert') {
          setAlerts(prev => [{
            id: Math.random(),
            matchName: data.visitor?.full_name || 'Unknown',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'flagged',
            device: 'Lobby Scanner'
          }, ...prev]);
        }
      } catch(e) {}
    };

    es.addEventListener('alert', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setAlerts(prev => [{
          id: Math.random(),
          matchName: data.visitor?.full_name || 'Unknown',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'flagged',
          device: 'Lobby Scanner'
        }, ...prev]);
      } catch(e) {}
    });

    return () => es.close();
  }, []);

  const simulateAlert = () => {
    setAlerts(prev => [{
      id: Math.random(),
      matchName: 'Test Match',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'flagged',
      device: 'Simulation Device'
    }, ...prev]);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Watchlist Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage restricted individuals and review silent security alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={simulateAlert} className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-destructive rounded-xl text-sm font-bold transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-2 border border-destructive/20">
             <AlertOctagon size={16} /> Simulate Alert
          </button>
          <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-2">
             <Plus size={16} /> Add to Watchlist
          </button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-destructive/10 border-2 border-rose-500 p-6 rounded-2xl flex items-center justify-between shadow-lg shadow-rose-500/20 animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center text-destructive animate-pulse border-2 border-destructive/20">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h2 className="text-lg font-black text-destructive uppercase tracking-wide">Silent Alert Triggered</h2>
              <p className="text-destructive font-medium text-sm mt-0.5">
                Potential match "<span className="font-bold underline">{alerts[0].matchName}</span>" detected at {alerts[0].device} at {alerts[0].time}.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setAlerts(prev => prev.filter(a => a.id !== alerts[0].id))} className="px-4 py-2 bg-card text-destructive border border-destructive/20 hover:bg-rose-100 rounded-xl text-sm font-bold transition-colors">
               False Alarm
             </button>
             <button className="px-4 py-2 bg-destructive text-white hover:bg-rose-700 rounded-xl text-sm font-bold transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
               Dispatch Security
             </button>
          </div>
        </div>
      )}

      {/* Watchlist Database */}
      <div className="bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2 text-foreground/90 font-bold">
             <UserX size={18} className="text-muted-foreground" />
             Restricted Entities ({watchlist.length})
           </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input 
              type="text" 
              placeholder="Search watchlist..." 
              className="pl-9 pr-4 py-1.5 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-slate-500 outline-none w-64"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Name / Alias</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">Date Added</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {watchlist.map(entity => (
                <tr key={entity.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-foreground">{entity.name}</p>
                    <p className="text-xs text-muted-foreground">Alias: {entity.alias}</p>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-medium">
                    {entity.reason}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      entity.severity === 'critical' ? 'bg-rose-100 text-destructive border border-destructive/20' : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      <AlertOctagon size={12} /> {entity.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {entity.dateAdded}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-muted-foreground/70 hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Pardon / Remove">
                      <UserCheck size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
