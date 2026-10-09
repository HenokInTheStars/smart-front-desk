'use client';

import React from 'react';
import { 
  Activity, Server, Shield, 
  CheckCircle2, Info, AlertTriangle, ChevronRight, 
  Search, Calendar, Users, 
  ShieldCheck, ArrowUpRight, Cpu
} from 'lucide-react';
import GlobalLobbyView from './GlobalLobbyView';

interface CentralOpsProps {
  currentUser: any;
}

export default function CentralOps({ currentUser }: CentralOpsProps) {
  const [health, setHealth] = React.useState<any>(null);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [expandedLogId, setExpandedLogId] = React.useState<string | null>(null);
  const [userActivities, setUserActivities] = React.useState<Record<string, any[]>>({});
  const [loadingActivity, setLoadingActivity] = React.useState<Record<string, boolean>>({});
  const [userTimelineTab, setUserTimelineTab] = React.useState<'appointments' | 'system'>('appointments');
  const [mainTab, setMainTab] = React.useState<'lobby' | 'host_audits' | 'infra_logs'>('lobby');

  const handleExpand = async (logId: string, userId: string | null) => {
    if (expandedLogId === logId) {
      setExpandedLogId(null);
      return;
    }
    setExpandedLogId(logId);
    
    if (userId && !userActivities[userId]) {
      setLoadingActivity(prev => ({ ...prev, [userId]: true }));
      try {
        const token = sessionStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8000/dashboard/user-activity/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const raw = await res.json();
          setUserActivities(prev => ({ ...prev, [userId]: raw.data || [] }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingActivity(prev => ({ ...prev, [userId]: false }));
      }
    }
  };

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
    const interval = setInterval(() => {
      fetchHealth();
    }, 10000);
    return () => clearInterval(interval);
  }, [mainTab]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Unified Command Center Container */}
      <div className="flex flex-col h-[calc(100vh-8rem)] bg-card border border-border rounded-[2rem] shadow-2xl overflow-hidden relative">
        
        {/* Subtle top gradient glow for premium feel */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

        {/* Command Center Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-5 border-b border-border/50 bg-card z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
               <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Security Operations Center</h2>
              <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Physical Access & System Telemetry</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 sm:mt-0">
             <div className="flex items-center gap-3 px-4 py-2 bg-muted/40 border border-border/50 rounded-xl">
               <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Database</span>
                 <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
                 </span>
               </div>
               <div className="w-px h-6 bg-border/50 mx-2"></div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Nodes</span>
                 <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 3 / 3
                 </span>
               </div>
             </div>
          </div>
        </div>
        
        {/* Main Split Layout */}
        <div className="flex flex-col flex-1 overflow-hidden">
          
          {/* Top Horizontal Navigation */}
          <div className="flex items-center gap-2 px-8 border-b border-border/50 bg-muted/10 z-10 pt-4 overflow-x-auto custom-scrollbar">
             
             <button 
               onClick={() => setMainTab('lobby')}
               className={`flex items-center gap-2 px-4 py-3 transition-all duration-200 border-b-2 whitespace-nowrap ${mainTab === 'lobby' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground font-medium hover:border-border'}`}
             >
               <Activity size={16} className={mainTab === 'lobby' ? 'text-primary' : 'text-muted-foreground'} />
               <span className="text-[13px]">Lobby & Perimeter</span>
             </button>

             <button 
               onClick={() => setMainTab('host_audits')}
               className={`flex items-center gap-2 px-4 py-3 transition-all duration-200 border-b-2 whitespace-nowrap ${mainTab === 'host_audits' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground font-medium hover:border-border'}`}
             >
               <Users size={16} className={mainTab === 'host_audits' ? 'text-primary' : 'text-muted-foreground'} />
               <span className="text-[13px]">Host Escort Audits</span>
             </button>

             <button 
               onClick={() => setMainTab('infra_logs')}
               className={`flex items-center gap-2 px-4 py-3 transition-all duration-200 border-b-2 whitespace-nowrap ${mainTab === 'infra_logs' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground font-medium hover:border-border'}`}
             >
               <Cpu size={16} className={mainTab === 'infra_logs' ? 'text-primary' : 'text-muted-foreground'} />
               <span className="text-[13px]">Infrastructure Logs</span>
             </button>

          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col bg-card/50 relative">
             
             {mainTab === 'lobby' && (
               <div className="p-8 overflow-y-auto w-full h-full custom-scrollbar">
                 <div className="animate-in fade-in duration-300">
                   <GlobalLobbyView currentUser={currentUser} />
                 </div>
               </div>
             )}

             {(mainTab === 'host_audits' || mainTab === 'infra_logs') && (
               <div className="flex flex-col h-full animate-in fade-in duration-300">
                 
                 {/* Table Header Controls */}
                 <div className="px-8 py-5 border-b border-border/40 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {mainTab === 'host_audits' ? 'Host Actions & Approvals' : 'Automated System Events'}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {mainTab === 'host_audits' 
                          ? 'Audit trail of host actions, including guest admissions and config changes.' 
                          : 'Raw telemetry of background processes, health checks, and sync events.'}
                      </p>
                    </div>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Search records..." 
                        className="pl-9 pr-4 py-2 border border-border/50 rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary w-64 transition-all shadow-sm"
                      />
                    </div>
                 </div>

                 {/* Minimalist Data Grid */}
                 <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                    {logs.filter(l => mainTab === 'host_audits' ? l.user_id : !l.user_id).length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                        <Server size={32} className="opacity-20" />
                        <p className="text-sm font-medium">No telemetry found for this filter.</p>
                      </div>
                    )}
                    
                    {logs.filter(l => mainTab === 'host_audits' ? l.user_id : !l.user_id).length > 0 && (
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                          <tr className="border-b border-border/40">
                            <th className="py-4 px-8 text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-16">#</th>
                            <th className="py-4 px-6 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Event Detail</th>
                            <th className="py-4 px-6 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                            <th className="py-4 px-6 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Source/Actor</th>
                            <th className="py-4 px-8 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right w-16"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {logs.filter(l => mainTab === 'host_audits' ? l.user_id : !l.user_id).map((log: any, i: number) => {
                            let safeTimeStr = log.time;
                            if (log.time) {
                              const hasOffset = log.time.endsWith('Z') || new RegExp('[+-]\\\\d{2}:\\\\d{2}$').test(log.time);
                              safeTimeStr = hasOffset ? log.time : log.time + 'Z';
                            }
                            const d = new Date(safeTimeStr);
                            const timeStr = isNaN(d.getTime()) ? "Unknown Date" : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

                            return (
                              <React.Fragment key={log.id || i}>
                                <tr 
                                  onClick={() => handleExpand(log.id, log.user_id)}
                                  className="hover:bg-muted/30 transition-colors cursor-pointer group"
                                >
                                  <td className="py-4 px-8 text-[13px] text-muted-foreground/60">{i + 1}</td>
                                  <td className="py-4 px-6 text-[13px] text-foreground font-medium">{log.detail || log.title}</td>
                                  <td className="py-4 px-6 text-[13px] text-muted-foreground">{timeStr}</td>
                                  <td className="py-4 px-6 text-[13px] text-muted-foreground">{log.meta}</td>
                                  <td className="py-4 px-8 text-right">
                                     {mainTab === 'host_audits' && (
                                       <ChevronRight size={16} className={`text-muted-foreground/40 group-hover:text-primary transition-all inline-block ${expandedLogId === log.id ? 'rotate-90' : ''}`} />
                                     )}
                                  </td>
                                </tr>
                                
                                {mainTab === 'host_audits' && expandedLogId === log.id && (
                                  <tr>
                                    <td colSpan={5} className="p-0 border-b-0">
                                      <div className="bg-muted/10 px-8 py-8 shadow-inner animate-in fade-in slide-in-from-top-2 duration-200 border-t border-border/50 flex flex-col">
                                        {!log.user_id ? (
                                          <p className="text-sm text-muted-foreground italic">No user profile associated with this log.</p>
                                        ) : loadingActivity[log.user_id] ? (
                                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            Loading user timeline...
                                          </div>
                                        ) : userActivities[log.user_id] && userActivities[log.user_id].length > 0 ? (
                                          <div className="flex flex-col gap-5 bg-card border border-border/40 rounded-2xl p-6 shadow-sm">
                                            <div className="flex items-center justify-between pb-4 border-b border-border/30">
                                              <div className="flex items-center gap-3">
                                                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                                   {log.meta ? log.meta.substring(0,2) : 'US'}
                                                 </div>
                                                 <div>
                                                   <h4 className="text-sm font-bold text-foreground">Timeline: {log.meta}</h4>
                                                   <p className="text-xs text-muted-foreground">Comprehensive history of actions</p>
                                                 </div>
                                              </div>
                                              <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50">
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); setUserTimelineTab('appointments'); }}
                                                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${userTimelineTab === 'appointments' ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground border border-transparent'}`}
                                                >
                                                  Appointments
                                                </button>
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); setUserTimelineTab('system'); }}
                                                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${userTimelineTab === 'system' ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground border border-transparent'}`}
                                                >
                                                  Settings & Access
                                                </button>
                                              </div>
                                            </div>
                                            
                                            <div className="w-full overflow-x-auto">
                                              <table className="w-full text-left border-collapse whitespace-nowrap">
                                                <thead>
                                                  <tr>
                                                    <th className="py-2 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                                                    <th className="py-2 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Action</th>
                                                    <th className="py-2 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Detail</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/20">
                                                  {userActivities[log.user_id]
                                                    .filter((act: any) => {
                                                      const isApt = ['Appointment Booked', 'Admitted Guest', 'Completed Meeting'].includes(act.action);
                                                      return userTimelineTab === 'appointments' ? isApt : !isApt;
                                                    })
                                                    .map((act: any, idx: number) => {
                                                      let sTimeStr = act.time;
                                                      if (act.time) {
                                                        const hOff = act.time.endsWith('Z') || new RegExp('[+-]\\\\d{2}:\\\\d{2}$').test(act.time);
                                                        sTimeStr = hOff ? act.time : act.time + 'Z';
                                                      }
                                                      const ad = new Date(sTimeStr);
                                                      return (
                                                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                                          <td className="py-3 px-4 text-[13px] text-muted-foreground font-medium">
                                                            {isNaN(ad.getTime()) ? "Unknown" : ad.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                                                          </td>
                                                          <td className="py-3 px-4 text-[13px] text-foreground font-semibold">{act.action}</td>
                                                          <td className="py-3 px-4 text-[13px] text-muted-foreground">{act.detail || '-'}</td>
                                                        </tr>
                                                      );
                                                  })}
                                                  {userActivities[log.user_id].filter((act: any) => {
                                                      const isApt = ['Appointment Booked', 'Admitted Guest', 'Completed Meeting'].includes(act.action);
                                                      return userTimelineTab === 'appointments' ? isApt : !isApt;
                                                  }).length === 0 && (
                                                    <tr>
                                                      <td colSpan={3} className="py-6 text-center text-xs text-muted-foreground italic">
                                                        No records found in this category.
                                                      </td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-sm text-muted-foreground italic">No historical activity found for this user.</p>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                 </div>
               </div>
             )}

          </div>
        </div>
      </div>
    </div>
  );
}
