'use client';

import React from 'react';
import { 
  Activity, Server, Database, HardDrive, Wifi, 
  CheckCircle2, Info, AlertTriangle, ChevronRight, 
  Search, Calendar, TrendingUp, TrendingDown, Minus, Building,
  Mail, Settings, MonitorSmartphone
} from 'lucide-react';
import GlobalLobbyView from './GlobalLobbyView';

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Main Layout: Full Width Logs */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Full Width for Logs */}
        <div className="col-span-12">
           <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden h-[calc(100vh-12rem)] flex flex-col">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30">
                <h3 className="font-bold text-foreground flex items-center gap-2 tracking-tight">
                  <Activity size={18} className="text-primary" />
                  System Event Log
                </h3>
                <div className="flex items-center gap-3">
                   <div className="relative">
                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                     <input 
                       type="text" 
                       placeholder="Search logs..." 
                       className="pl-9 pr-4 py-2 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-64 transition-all shadow-sm"
                     />
                   </div>
                </div>
              </div>
              
              <div className="overflow-y-auto flex-1 divide-y divide-border">
                {logs.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No recent events.
                  </div>
                )}
                {logs.map((log: any, i: number) => (
                   <div key={i} className="flex items-center justify-between p-5 hover:bg-muted/50 transition-colors cursor-pointer group">
                     <div className="flex items-center gap-4">
                       {log.type === 'success' && (
                         <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm shrink-0">
                           <CheckCircle2 size={18} />
                         </div>
                       )}
                       {log.type === 'info' && (
                         <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm shrink-0">
                           <Info size={18} />
                         </div>
                       )}
                       {log.type === 'warning' && (
                         <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 border border-amber-500/20 shadow-sm shrink-0">
                           <AlertTriangle size={18} />
                         </div>
                       )}
                       <div>
                         <p className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors">{log.detail || log.title}</p>
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
                     
                     <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={18} className="text-muted-foreground hover:text-primary transition-colors" />
                     </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
