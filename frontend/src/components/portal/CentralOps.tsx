'use client';

import React from 'react';
import { 
  Activity, Server, Database, HardDrive, Wifi, 
  CheckCircle2, Info, AlertTriangle, ChevronRight, 
  Search, Calendar, TrendingUp, TrendingDown, Minus
} from 'lucide-react';

interface CentralOpsProps {
  currentUser: any;
}

export default function CentralOps({ currentUser }: CentralOpsProps) {
  const [health, setHealth] = React.useState<any>(null);
  const [logs, setLogs] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchHealth = async () => {
      try {
        const token = sessionStorage.getItem('access_token');
        if (!token) return;
        const res = await fetch('http://localhost:8000/dashboard/health', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const raw = await res.json();
          setHealth(raw.data);
        }

        const logsRes = await fetch('http://localhost:8000/dashboard/audit-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (logsRes.ok) {
          const rawLogs = await logsRes.json();
          setLogs(rawLogs.data || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchHealth();
    // Refresh every 10 seconds to make it feel alive
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section is already handled by Portal layout, but we can add the description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mt-2">
        <p className="text-sm text-muted-foreground">
          System health, integrations, and infrastructure overview.
        </p>
        <div className="flex items-center gap-2">
          {health && health.database.status !== 'Offline' && health.api_server.status === 'online' ? (
            <div className="px-4 py-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[13px] font-bold flex items-center gap-2 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </div>
          ) : health ? (
            <div className="px-4 py-2 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full text-[13px] font-bold flex items-center gap-2 border border-rose-500/20">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              System Degraded
            </div>
          ) : (
            <div className="px-4 py-2 bg-slate-500/10 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 rounded-full text-[13px] font-bold flex items-center gap-2 border border-slate-500/20">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              Checking Status...
            </div>
          )}
        </div>
      </div>

      {/* The 4 KPI cards have been removed as requested. */}

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-foreground flex items-center gap-2 text-lg tracking-tight">
            <Activity size={18} className="text-muted-foreground" />
            System Event Log
          </h3>
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
               <Calendar size={14} className="text-muted-foreground" />
               Last 6 Hours
               <ChevronRight size={14} className="rotate-90 text-muted-foreground ml-1" />
             </button>
             <div className="relative">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
               <input 
                 type="text" 
                 placeholder="Search logs..." 
                 className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary w-64"
               />
             </div>
          </div>
        </div>
        
        <div className="divide-y divide-border">
          {logs.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No recent events.
            </div>
          )}
          {logs.map((log: any, i: number) => (
             <div key={i} className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors cursor-pointer group">
               <div className="flex items-center gap-4">
                 {log.type === 'success' && (
                   <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm shrink-0">
                     <CheckCircle2 size={16} />
                   </div>
                 )}
                 {log.type === 'info' && (
                   <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm shrink-0">
                     <Info size={16} />
                   </div>
                 )}
                 {log.type === 'warning' && (
                   <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-sm shrink-0">
                     <AlertTriangle size={16} />
                   </div>
                 )}
                 <div>
                   <p className="text-[14px] font-bold text-foreground">{log.detail || log.title}</p>
                   <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                     {(() => {
                        if (!log.time) return "Unknown Date";
                        const hasOffset = log.time.endsWith('Z') || log.time.match(/[+-]\d{2}:\d{2}$/);
                        const safeTimeStr = hasOffset ? log.time : log.time + 'Z';
                        const d = new Date(safeTimeStr);
                        return isNaN(d.getTime()) ? "Invalid Date" : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                     })()} <span className="w-1 h-1 rounded-full bg-border" /> {log.meta}
                   </p>
                 </div>
               </div>
               
               <div className="flex items-center gap-6">
                  {log.type === 'success' && <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-full border border-emerald-500/20">Success</span>}
                  {log.type === 'info' && <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-full border border-blue-500/20">Info</span>}
                  {log.type === 'warning' && <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 font-bold text-xs rounded-full border border-amber-500/20">Warning</span>}
                  
                  <ChevronRight size={18} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
               </div>
             </div>
           ))}
        </div>
      </div>

    </div>
  );
}
