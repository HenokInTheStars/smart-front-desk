'use client';

import React from 'react';
import { 
  Activity, Server, Shield, 
  CheckCircle2, Info, AlertTriangle, ChevronRight, ChevronLeft, 
  Search, Calendar, Users, 
  ArrowUpRight, X, Sparkles, ShieldCheck, Sliders, UserCheck,
  Bot, Zap, Cpu
} from 'lucide-react';
import GlobalLobbyView from './GlobalLobbyView';
import { TablePagination } from '../ui/TablePagination';

interface CentralOpsProps {
  currentUser: any;
}

interface FormattedAuditLog {
  category: 'ai' | 'auth' | 'settings' | 'meeting' | 'system';
  badgeLabel: string;
  badgeClass: string;
  badgeIcon: React.ReactNode;
  primaryText: string;
  prefix?: string;
  secondaryText?: string;
  aiData?: {
    prompt: string;
    model?: string;
    user_email?: string;
    user_role?: string;
    cached?: boolean;
    tools_called?: string[];
  } | null;
}

function formatAuditLog(log: any): FormattedAuditLog {
  const rawDetail = (log?.detail || '').trim();
  const rawTitle = (log?.title || '').trim();
  
  // 1. AI Assistant Query
  let aiData: any = null;
  if (rawTitle.toLowerCase().includes('assistant') || rawDetail.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawDetail);
      if (parsed && typeof parsed === 'object' && (parsed.prompt || parsed.model)) {
        aiData = parsed;
      }
    } catch {
      // Non-JSON fallback
    }
  }

  if (aiData && aiData.prompt) {
    const toolCount = Array.isArray(aiData.tools_called) ? aiData.tools_called.length : 0;
    const secondary = aiData.cached 
      ? '⚡ Cached' 
      : (toolCount > 0 ? `${toolCount} tool${toolCount > 1 ? 's' : ''}` : undefined);

    return {
      category: 'ai',
      badgeLabel: 'AI Assistant',
      badgeIcon: <Sparkles size={11} className="text-primary shrink-0" />,
      badgeClass: 'bg-primary/10 text-primary border-primary/20',
      primaryText: `"${aiData.prompt}"`,
      prefix: 'Prompt:',
      secondaryText: secondary,
      aiData
    };
  }

  // 2. User Authentication / Sign In
  if (rawTitle.toLowerCase().includes('login') || rawDetail.toLowerCase().includes('authenticated successfully')) {
    const emailMatch = rawDetail.match(/^([^\s]+)\s+authenticated successfully/i);
    const email = emailMatch ? emailMatch[1] : (log.meta?.split('(')[1]?.replace(')', '') || '');
    return {
      category: 'auth',
      badgeLabel: 'Sign In',
      badgeIcon: <ShieldCheck size={11} className="text-emerald-500 shrink-0" />,
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      primaryText: email ? `${email} signed in successfully` : 'User signed in successfully',
      secondaryText: 'Standard Login',
      aiData: null
    };
  }

  // 3. System Configuration & Settings
  if (rawTitle.toLowerCase().includes('setting') || rawDetail.toLowerCase().includes('system setting:')) {
    const parts = rawDetail.split(/system setting:\s*/i);
    const settingKey = parts[1] ? parts[1].trim() : '';
    const readableKey = settingKey ? settingKey.replace(/_/g, ' ') : '';
    return {
      category: 'settings',
      badgeLabel: 'Settings',
      badgeIcon: <Sliders size={11} className="text-amber-500 shrink-0" />,
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      primaryText: settingKey ? `Updated configuration: ${readableKey}` : (rawDetail || rawTitle),
      secondaryText: settingKey ? `Key: ${settingKey}` : undefined,
      aiData: null
    };
  }

  // 4. Host Meeting Actions
  if (rawTitle.toLowerCase().includes('admit') || rawTitle.toLowerCase().includes('meeting') || rawTitle.toLowerCase().includes('appointment')) {
    return {
      category: 'meeting',
      badgeLabel: 'Host Action',
      badgeIcon: <UserCheck size={11} className="text-sky-500 shrink-0" />,
      badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      primaryText: rawDetail || rawTitle,
      secondaryText: rawTitle,
      aiData: null
    };
  }

  // 5. Default Fallback
  return {
    category: 'system',
    badgeLabel: rawTitle || 'Audit',
    badgeIcon: <Activity size={11} className="text-muted-foreground shrink-0" />,
    badgeClass: 'bg-muted text-muted-foreground border-border',
    primaryText: rawDetail || rawTitle,
    aiData: null
  };
}

export default function CentralOps({ currentUser }: CentralOpsProps) {
  const [health, setHealth] = React.useState<any>(null);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [expandedLogId, setExpandedLogId] = React.useState<string | null>(null);
  const [userActivities, setUserActivities] = React.useState<Record<string, any[]>>({});
  const [loadingActivity, setLoadingActivity] = React.useState<Record<string, boolean>>({});
  const [userTimelineTab, setUserTimelineTab] = React.useState<'appointments' | 'system'>('appointments');
  const [mainTab, setMainTab] = React.useState<'lobby' | 'host_audits'>('lobby');
  const [mainPageSize, setMainPageSize] = React.useState(10);
  const [mainCurrentPage, setMainCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activityPageSize, setActivityPageSize] = React.useState(5);
  const [activityCurrentPage, setActivityCurrentPage] = React.useState(1);

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
    setMainCurrentPage(1);
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
      
      {/* Unified Command Center Container with framed viewport height */}
      <div className="flex flex-col h-[calc(100vh-13rem)] min-h-[580px] bg-card border border-border rounded-[2rem] shadow-2xl overflow-hidden relative">
        
        {/* Subtle top gradient glow for premium feel */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

        {/* Command Center Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border/50 bg-card z-10 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Security Operations Center</h2>
            <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Physical Access & System Telemetry</p>
          </div>
        </div>
        
        {/* Main Split Layout */}
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          
          {/* Top Horizontal Navigation */}
          <div className="flex items-center gap-2 px-8 border-b border-border/50 bg-muted/10 z-10 pt-4 overflow-x-auto custom-scrollbar shrink-0">
             
             <button 
               onClick={() => setMainTab('lobby')}
               className={`flex items-center gap-2 px-4 py-3 transition-all duration-200 border-b-2 whitespace-nowrap ${mainTab === 'lobby' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground font-medium hover:border-border'}`}
             >
               <span className="text-[13px]">Lobby & Perimeter</span>
             </button>

             <button 
               onClick={() => setMainTab('host_audits')}
               className={`flex items-center gap-2 px-4 py-3 transition-all duration-200 border-b-2 whitespace-nowrap ${mainTab === 'host_audits' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground font-medium hover:border-border'}`}
             >
               <span className="text-[13px]">Host Escort Audits</span>
             </button>
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col bg-card/50 relative min-h-0">
             
             {mainTab === 'lobby' && (
               <div className="p-8 overflow-y-auto w-full h-full custom-scrollbar">
                 <div className="animate-in fade-in duration-300">
                   <GlobalLobbyView currentUser={currentUser} />
                 </div>
               </div>
             )}

             {mainTab === 'host_audits' && (
               <div className="flex flex-col h-full animate-in fade-in duration-300 min-h-0">
                 
                 {/* Table Header Controls */}
                 <div className="px-8 py-4 border-b border-border/40 flex items-center justify-between shrink-0 bg-card">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        Host Actions & Approvals
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Audit trail of host actions, including guest admissions, AI queries, and config changes.
                      </p>
                    </div>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Search records..." 
                        value={searchQuery}
                        onChange={e => {
                          setSearchQuery(e.target.value);
                          setMainCurrentPage(1);
                        }}
                        className="pl-9 pr-8 py-2 border border-border/50 rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary w-64 transition-all shadow-sm"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setMainCurrentPage(1);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                          title="Clear search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                 </div>

                 {/* Minimalist Data Grid Body */}
                 {(() => {
                   const hostLogs = logs.filter(l => l.user_id);
                   if (hostLogs.length === 0) {
                     return (
                       <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground space-y-3 py-16">
                         <Server size={32} className="opacity-20" />
                         <p className="text-sm font-medium">No host escort audits found.</p>
                       </div>
                     );
                   }

                   const q = searchQuery.toLowerCase().trim();
                   const filteredLogs = hostLogs.filter((log: any) => {
                     if (!q) return true;
                     let safeTimeStr = log.time || '';
                     if (log.time) {
                       const hasOffset = log.time.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(log.time);
                       safeTimeStr = hasOffset ? log.time : log.time + 'Z';
                     }
                     const d = new Date(safeTimeStr);
                     const timeStr = isNaN(d.getTime()) ? "Unknown Date" : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
                     
                     const parsed = formatAuditLog(log);
                     const searchableText = `${parsed.badgeLabel} ${parsed.primaryText} ${parsed.prefix || ''} ${parsed.secondaryText || ''} ${log.detail || ''} ${log.title || ''} ${log.meta || ''} ${timeStr}`.toLowerCase();
                     return searchableText.includes(q);
                   });

                   const paginatedLogs = filteredLogs.slice((mainCurrentPage - 1) * mainPageSize, mainCurrentPage * mainPageSize);

                   return (
                     <div className="flex flex-col flex-1 min-h-0">
                       {/* Table Scroll Area */}
                       <div className="overflow-y-auto flex-1 custom-scrollbar min-h-0">
                         <table className="w-full text-left border-collapse table-fixed">
                           <colgroup>
                             <col className="w-14" />
                             <col className="w-auto" />
                             <col className="w-48" />
                             <col className="w-60" />
                             <col className="w-12" />
                           </colgroup>
                           <thead className="bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                             <tr className="border-b border-border/40">
                               <th className="py-3.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">#</th>
                               <th className="py-3.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Event Detail</th>
                               <th className="py-3.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                               <th className="py-3.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Source / Actor</th>
                               <th className="py-3.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center"></th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-border/20">
                             {filteredLogs.length === 0 && (
                               <tr>
                                 <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                                   No records found matching "{searchQuery.trim()}".
                                 </td>
                               </tr>
                             )}
                             {paginatedLogs.map((log: any, i: number) => {
                               const globalIndex = (mainCurrentPage - 1) * mainPageSize + i + 1;
                               let safeTimeStr = log.time;
                               if (log.time) {
                                 const hasOffset = log.time.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(log.time);
                                 safeTimeStr = hasOffset ? log.time : log.time + 'Z';
                               }
                               const d = new Date(safeTimeStr);
                               const timeStr = isNaN(d.getTime()) ? "Unknown Date" : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
                               const event = formatAuditLog(log);

                               return (
                                 <React.Fragment key={log.id || i}>
                                   <tr 
                                     onClick={() => handleExpand(log.id, log.user_id)}
                                     className="hover:bg-muted/30 transition-colors cursor-pointer group"
                                   >
                                     <td className="py-3.5 px-4 text-[13px] text-muted-foreground/60 text-center font-mono">{globalIndex}</td>
                                     <td className="py-3.5 px-4 min-w-0">
                                       <div className="flex items-center gap-2.5 min-w-0">
                                         <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${event.badgeClass}`}>
                                           {event.badgeIcon}
                                           <span>{event.badgeLabel}</span>
                                         </span>
                                         
                                         <div className="min-w-0 flex-1 flex items-center gap-2">
                                           <span className="text-[13px] text-foreground font-medium truncate" title={event.primaryText}>
                                             {event.prefix && <span className="text-muted-foreground font-normal mr-1">{event.prefix}</span>}
                                             <span className={event.category === 'ai' ? 'font-semibold text-foreground' : ''}>
                                               {event.primaryText}
                                             </span>
                                           </span>

                                           {event.secondaryText && (
                                             <span className="text-[11px] text-muted-foreground/70 shrink-0 hidden xl:inline-block">
                                               ({event.secondaryText})
                                             </span>
                                           )}
                                         </div>
                                       </div>
                                     </td>
                                     <td className="py-3.5 px-4 text-[12px] text-muted-foreground whitespace-nowrap">{timeStr}</td>
                                     <td className="py-3.5 px-4 text-[12px] text-muted-foreground truncate" title={log.meta}>
                                       {log.meta || 'System'}
                                     </td>
                                     <td className="py-3.5 px-4 text-center">
                                       <ChevronRight size={15} className={`text-muted-foreground/40 group-hover:text-primary transition-all inline-block ${expandedLogId === log.id ? 'rotate-90 text-primary' : ''}`} />
                                     </td>
                                   </tr>
                                   
                                   {expandedLogId === log.id && (
                                     <tr>
                                       <td colSpan={5} className="p-0 border-b-0">
                                         <div className="bg-muted/10 px-8 py-6 shadow-inner animate-in fade-in slide-in-from-top-2 duration-200 border-t border-border/50 flex flex-col gap-6">
                                           
                                           {/* Dedicated AI Assistant Telemetry Card */}
                                           {event.aiData && (
                                             <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
                                               <div className="flex items-center justify-between pb-4 border-b border-border/30">
                                                 <div className="flex items-center gap-3">
                                                   <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                     <Sparkles size={18} />
                                                   </div>
                                                   <div>
                                                     <h4 className="text-sm font-bold text-foreground">AI Assistant Prompt & Execution Telemetry</h4>
                                                     <p className="text-xs text-muted-foreground">Inquiry prompt text and processing parameters</p>
                                                   </div>
                                                 </div>
                                                 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                                   <Bot size={13} />
                                                   {event.aiData.model || 'gemini-3.5-flash-lite'}
                                                 </span>
                                               </div>

                                               {/* Full Prompt Display */}
                                               <div className="mt-4">
                                                 <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Full User Prompt</label>
                                                 <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-sm font-medium text-foreground leading-relaxed italic">
                                                   "{event.aiData.prompt}"
                                                 </div>
                                               </div>

                                               {/* Telemetry Breakdown */}
                                               <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-4">
                                                 <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                                                   <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Model Engine</span>
                                                   <div className="text-xs font-semibold text-foreground mt-1 flex items-center gap-1.5">
                                                     <Bot size={13} className="text-primary" />
                                                     <span className="truncate">{event.aiData.model || 'gemini-3.5-flash-lite'}</span>
                                                   </div>
                                                 </div>

                                                 <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                                                   <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cache State</span>
                                                   <div className="text-xs font-semibold text-foreground mt-1 flex items-center gap-1.5">
                                                     {event.aiData.cached ? (
                                                       <>
                                                         <Zap size={13} className="text-emerald-500" />
                                                         <span className="text-emerald-600 dark:text-emerald-400">Cached Hit</span>
                                                       </>
                                                     ) : (
                                                       <>
                                                         <Cpu size={13} className="text-sky-500" />
                                                         <span>Live Inference</span>
                                                       </>
                                                     )}
                                                   </div>
                                                 </div>

                                                 <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                                                   <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Caller Role</span>
                                                   <div className="text-xs font-semibold text-foreground mt-1">
                                                     {event.aiData.user_role || (log.meta ? log.meta.split(' ')[0] : 'User')}
                                                   </div>
                                                 </div>

                                                 <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                                                   <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tools Executed</span>
                                                   <div className="text-xs font-semibold text-foreground mt-1 flex flex-wrap gap-1">
                                                     {event.aiData.tools_called && event.aiData.tools_called.length > 0 ? (
                                                       event.aiData.tools_called.map((tool: any, idx: number) => {
                                                         const toolName = typeof tool === 'string' ? tool : (tool?.name || 'tool');
                                                         const toolArgs = typeof tool === 'object' && tool?.arguments && Object.keys(tool.arguments).length > 0
                                                           ? JSON.stringify(tool.arguments)
                                                           : null;
                                                         return (
                                                           <span 
                                                             key={idx} 
                                                             title={toolArgs ? `Arguments: ${toolArgs}` : undefined}
                                                             className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-mono border border-primary/20"
                                                           >
                                                             {toolName}
                                                           </span>
                                                         );
                                                       })
                                                     ) : (
                                                       <span className="text-muted-foreground text-xs font-normal">None (Direct)</span>
                                                     )}
                                                   </div>
                                                 </div>
                                               </div>
                                             </div>
                                           )}

                                           {/* User Activity Timeline Section */}
                                           {!log.user_id ? (
                                             !event.aiData && <p className="text-sm text-muted-foreground italic">No user profile associated with this log.</p>
                                           ) : loadingActivity[log.user_id] ? (
                                             <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
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
                                               
                                               <div className="w-full">
                                                 {(() => {
                                                   const filteredActs = userActivities[log.user_id].filter((act: any) => {
                                                     const isApt = ['Appointment Booked', 'Admitted Guest', 'Completed Meeting'].includes(act.action);
                                                     return userTimelineTab === 'appointments' ? isApt : !isApt;
                                                   });
                                                   const paginatedActs = filteredActs.slice((activityCurrentPage - 1) * activityPageSize, activityCurrentPage * activityPageSize);
                                                   return (
                                                     <div className="flex flex-col border border-border/40 rounded-xl overflow-hidden mt-2">
                                                       <table className="w-full text-left border-collapse table-fixed">
                                                         <colgroup>
                                                           <col className="w-48" />
                                                           <col className="w-48" />
                                                           <col className="w-auto" />
                                                         </colgroup>
                                                         <thead className="bg-muted/10">
                                                           <tr className="border-b border-border/30">
                                                             <th className="py-2.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                                                             <th className="py-2.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Action</th>
                                                             <th className="py-2.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Detail</th>
                                                           </tr>
                                                         </thead>
                                                         <tbody className="divide-y divide-border/20">
                                                           {paginatedActs.map((act: any, idx: number) => {
                                                               let sTimeStr = act.time;
                                                               if (act.time) {
                                                                 const hOff = act.time.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(act.time);
                                                                 sTimeStr = hOff ? act.time : act.time + 'Z';
                                                               }
                                                               const ad = new Date(sTimeStr);
                                                               const parsedAct = formatAuditLog({ title: act.action, detail: act.detail });
                                                               return (
                                                                 <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                                                   <td className="py-3 px-4 text-[12px] text-muted-foreground font-medium whitespace-nowrap">
                                                                     {isNaN(ad.getTime()) ? "Unknown" : ad.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                                                                   </td>
                                                                   <td className="py-3 px-4 text-[13px] text-foreground font-semibold truncate">{act.action}</td>
                                                                   <td className="py-3 px-4 text-[13px] text-muted-foreground truncate" title={parsedAct.primaryText}>
                                                                     {parsedAct.category === 'ai' ? (
                                                                       <span className="font-medium text-foreground">
                                                                         Prompt: {parsedAct.primaryText}
                                                                       </span>
                                                                     ) : (
                                                                       parsedAct.primaryText || '-'
                                                                     )}
                                                                   </td>
                                                                 </tr>
                                                               );
                                                           })}
                                                           {filteredActs.length === 0 && (
                                                             <tr>
                                                               <td colSpan={3} className="py-6 text-center text-xs text-muted-foreground italic">
                                                                 No records found in this category.
                                                               </td>
                                                             </tr>
                                                           )}
                                                         </tbody>
                                                       </table>
                                                       {filteredActs.length > 0 && (
                                                         <TablePagination totalItems={filteredActs.length} pageSize={activityPageSize} setPageSize={setActivityPageSize} currentPage={activityCurrentPage} setCurrentPage={setActivityCurrentPage} />
                                                       )}
                                                     </div>
                                                   );
                                                 })()}
                                               </div>
                                             </div>
                                           ) : (
                                             !event.aiData && <p className="text-sm text-muted-foreground italic">No historical activity found for this user.</p>
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
                       </div>

                       {/* Pinned Pagination Footer */}
                       <div className="border-t border-border/40 px-8 py-3 bg-card shrink-0 flex items-center justify-between">
                         <TablePagination 
                           totalItems={filteredLogs.length} 
                           pageSize={mainPageSize} 
                           setPageSize={setMainPageSize} 
                           currentPage={mainCurrentPage} 
                           setCurrentPage={setMainCurrentPage} 
                         />
                       </div>
                     </div>
                   );
                 })()}
               </div>
             )}

          </div>
        </div>
      </div>
    </div>
  );
}
