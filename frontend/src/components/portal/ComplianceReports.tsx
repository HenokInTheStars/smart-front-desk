'use client';

import React from 'react';
import {
  FileText, Download, BarChart3, Clock, Calendar, Search,
  Users, Building, UserCheck, Activity, AlertCircle, Calendar as CalendarIcon, Shield, X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area,
  PieChart as RePieChart, Pie, Cell,
  Legend, LabelList,
} from 'recharts';

interface ComplianceReportsProps {
  currentUser: any;
}

const P = {
  blue:    '#3b82f6',
  indigo:  '#6366f1',
  violet:  '#8b5cf6',
  emerald: '#10b981',
  teal:    '#14b8a6',
  amber:   '#f59e0b',
  rose:    '#f43f5e',
  sky:     '#0ea5e9',
  orange:  '#f97316',
  slate:   '#64748b',
};

const PIE1 = [P.blue, P.emerald, P.amber, P.rose, P.violet];
const PIE2 = [P.blue, P.amber];
const DEPT = [P.blue, P.violet, P.emerald, P.amber, P.rose, P.sky];

const MOCK_VISITOR_CATEGORIES = [
  { name: 'General',      value: 142 },
  { name: 'Contractors',  value: 87  },
  { name: 'Interviewees', value: 64  },
  { name: 'VIPs',         value: 31  },
  { name: 'Deliveries',   value: 26  },
];
const MOCK_VISIT_PURPOSE = [
  { purpose: 'Job Interview',      count: 64 },
  { purpose: 'Vendor Meeting',     count: 58 },
  { purpose: 'Client Briefing',    count: 47 },
  { purpose: 'Training Session',   count: 39 },
  { purpose: 'Equipment Delivery', count: 26 },
  { purpose: 'Executive Review',   count: 19 },
];
const MOCK_PREREGISTERED = [
  { name: 'Pre-Registered', value: 214 },
  { name: 'Walk-ins',       value: 136 },
];
const MOCK_RETENTION = [
  { week: 'Wk 1', firstTime: 52, returning: 18 },
  { week: 'Wk 2', firstTime: 47, returning: 23 },
  { week: 'Wk 3', firstTime: 61, returning: 29 },
  { week: 'Wk 4', firstTime: 55, returning: 34 },
];
const MOCK_TOP_HOSTS = [
  { host: 'Sara A.',  visitors: 38 },
  { host: 'James K.', visitors: 31 },
  { host: 'Mia R.',   visitors: 27 },
  { host: 'Luca B.',  visitors: 22 },
  { host: 'Nina S.',  visitors: 17 },
];
const MOCK_DEPT_TRAFFIC = [
  { name: 'HR',        value: 89 },
  { name: 'Executive', value: 74 },
  { name: 'IT',        value: 61 },
  { name: 'Finance',   value: 48 },
  { name: 'Legal',     value: 33 },
  { name: 'Marketing', value: 28 },
];
const MOCK_HOST_RESPONSIVENESS = [
  { hour: '8 am',  avgMins: 3.2 },
  { hour: '9 am',  avgMins: 4.8 },
  { hour: '10 am', avgMins: 2.9 },
  { hour: '11 am', avgMins: 6.1 },
  { hour: '12 pm', avgMins: 8.4 },
  { hour: '1 pm',  avgMins: 5.7 },
  { hour: '2 pm',  avgMins: 4.1 },
  { hour: '3 pm',  avgMins: 3.6 },
  { hour: '4 pm',  avgMins: 2.8 },
  { hour: '5 pm',  avgMins: 5.3 },
];
const MOCK_SLA_BREACHES = [
  { host: 'Sara A.',  breaches: 4  },
  { host: 'James K.', breaches: 7  },
  { host: 'Mia R.',   breaches: 2  },
  { host: 'Luca B.',  breaches: 11 },
  { host: 'Nina S.',  breaches: 1  },
];
const MOCK_CHECKIN_DURATION = [
  { bucket: '< 1 min', visits: 34 },
  { bucket: '1-2 min', visits: 88 },
  { bucket: '2-3 min', visits: 61 },
  { bucket: '3-5 min', visits: 42 },
  { bucket: '> 5 min', visits: 15 },
];
const MOCK_VISIT_LENGTH = [
  { time: '9 am',  avgMins: 28 },
  { time: '10 am', avgMins: 45 },
  { time: '11 am', avgMins: 52 },
  { time: '12 pm', avgMins: 37 },
  { time: '1 pm',  avgMins: 61 },
  { time: '2 pm',  avgMins: 49 },
  { time: '3 pm',  avgMins: 44 },
  { time: '4 pm',  avgMins: 33 },
];
const MOCK_PEAK_DAYS = [
  { day: 'Monday',    visitors: 68 },
  { day: 'Tuesday',   visitors: 92 },
  { day: 'Wednesday', visitors: 87 },
  { day: 'Thursday',  visitors: 74 },
  { day: 'Friday',    visitors: 53 },
];
const MOCK_NOSHOW = [
  { date: 'Oct 1',  rate: 8  },
  { date: 'Oct 4',  rate: 12 },
  { date: 'Oct 7',  rate: 7  },
  { date: 'Oct 10', rate: 15 },
  { date: 'Oct 13', rate: 9  },
  { date: 'Oct 16', rate: 11 },
  { date: 'Oct 19', rate: 6  },
  { date: 'Oct 22', rate: 13 },
  { date: 'Oct 25', rate: 10 },
  { date: 'Oct 28', rate: 8  },
];

const TICK = { fontSize: 11, fill: '#64748b' };
const GRID = '#e2e8f0';

function ChartCard({ title, subtitle, children, wide }: {
  title: string; subtitle: string; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className={'bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow' + (wide ? ' lg:col-span-2' : '')}>
      <div className="mb-5">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex-1">{children}</div>

          </div>
  );
}

function SectionHeader({ label, description, timeFilter, setTimeFilter }: { label: string; description: string; timeFilter?: string; setTimeFilter?: (val: string) => void }) {
  return (
    <div className="border-b border-slate-200 pb-3 mb-6 flex justify-between items-end gap-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">{label}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      {setTimeFilter && (
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="bg-white border border-slate-200 text-sm font-semibold text-slate-700 py-1.5 px-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Past 7 Days</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      )}

          </div>
  );
}

function PieLegend({ data, colors }: { data: { name: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col gap-2 justify-center ml-4 flex-1">
      {data.map((d, i) => (
        <div key={d.name} className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
          <span className="text-slate-600 flex-1 truncate">{d.name}</span>
          <span className="font-semibold text-slate-800">{Math.round((d.value / total) * 100)}%</span>
        </div>
      ))}

          </div>
  );
}

const ChartTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-slate-500 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-bold text-slate-800">
          {p.value}{unit} <span className="text-slate-400 font-normal">{p.name !== 'value' ? p.name : ''}</span>
        </p>
      ))}

          </div>
  );
};

export default function ComplianceReports({ currentUser }: ComplianceReportsProps) {
  const [activeTab, setActiveTab] = React.useState<'insights' | 'hosts' | 'flow' | 'exports'>('insights');
  const [appointments, setAppointments] = React.useState<any[]>([]);
  const [analytics, setAnalytics] = React.useState<any>(null);
  const [timeFilter, setTimeFilter] = React.useState('all');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState<string | null>(null);
  const [exports, setExports] = React.useState<any[]>([]);
  const [pdfPreview, setPdfPreview] = React.useState<{ url: string; name: string; type: string } | null>(null);

  React.useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      const token = sessionStorage.getItem('access_token');
      if (token) {
        try {
          const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
          const [aptRes, analRes] = await Promise.all([
            fetch(`${base}/appointments?limit=1000`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${base}/analytics/dashboard?time_filter=${timeFilter}`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          
          if (aptRes.ok) {
            const raw = await aptRes.json();
            setAppointments(raw.data ?? []);
          }
          if (analRes.ok) {
            const raw = await analRes.json();
            setAnalytics(raw.data);
          }
        } catch (e) {
          console.warn('[ComplianceReports] fetch failed', e);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, [timeFilter]);


  const topHosts = analytics?.topHosts || [];
  const deptTraffic = analytics?.deptTraffic || [];
  const preregistered = analytics?.preregistered || [];
  const visitorCategories = analytics?.visitorCategories || [];
  const visitPurpose = analytics?.visitPurpose || [];
  const hostResponsiveness = analytics?.hostResponsiveness || [];
  const slaBreaches = analytics?.slaBreaches || [];
  const checkinDuration = analytics?.checkinDuration || [];
  const visitLength = analytics?.visitLength || [];
  const peakDays = analytics?.peakDays || [];
  const noShowRate = analytics?.noShowRate || [];
  const retention = analytics?.retention || [];

  const generateReport = async (reportType: string, reportName: string) => {
    setIsGenerating(reportType);
    try {
      const doc = new jsPDF();
      const drawHeader = (title: string, sub: string) => {
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('MATRIX', 14, 22);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text('SYS', 46, 22);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, 52);
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(sub, 14, 59);
      };
      const ts = {
        theme: 'striped' as const,
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' as const, cellPadding: 6 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9, cellPadding: 5, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1 },
        startY: 65,
        margin: { top: 65, left: 14, right: 14, bottom: 20 },
      };
      if (reportType === 'Master_Audit') {
        drawHeader('Master Audit Report', `Generated: ${new Date().toLocaleString()} | Records: ${appointments.length}`);
        autoTable(doc, {
          head: [['Visitor', 'Host', 'Status', 'Date', 'Notes']],
          body: appointments.map((a: any) => [
            a.visitor?.full_name ?? 'Unknown', a.host?.full_name ?? 'Unknown', a.status,
            new Date(a.scheduled_time).toLocaleString(),
            (a.notes ?? '').substring(0, 30) + (a.notes?.length > 30 ? '...' : ''),
          ]), ...ts,
        });
      } else if (reportType === 'Traffic_Summary') {
        drawHeader('Traffic Summary Report', `Generated: ${new Date().toLocaleString()}`);
        const counts = appointments.reduce((acc: any, a: any) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; }, {});
        autoTable(doc, {
          head: [['Status', 'Count', 'Percentage']],
          body: Object.keys(counts).map(s => [s.replace('_', ' ').toUpperCase(), counts[s], ((counts[s] / appointments.length) * 100).toFixed(1) + '%']),
          ...ts,
        });
      } else if (reportType === 'Host_SLA') {
        drawHeader('Host SLA Report', `Generated: ${new Date().toLocaleString()}`);
        const hStats: Record<string, any> = {};
        appointments.forEach((a: any) => {
          const h = a.host?.full_name ?? 'Unknown';
          if (!hStats[h]) hStats[h] = { count: 0, wm: 0, wn: 0, mm: 0, mn: 0 };
          hStats[h].count += 1;
          if (a.checked_in_at && a.admitted_at) {
            hStats[h].wm += Math.max(0, (new Date(a.admitted_at).getTime() - new Date(a.checked_in_at).getTime()) / 60000);
            hStats[h].wn += 1;
          }
          if (a.admitted_at && a.checked_out_at) {
            hStats[h].mm += Math.max(0, (new Date(a.checked_out_at).getTime() - new Date(a.admitted_at).getTime()) / 60000);
            hStats[h].mn += 1;
          }
        });
        autoTable(doc, {
          head: [['Host', 'Visitors', 'Avg Wait', 'Avg Meeting']],
          body: Object.keys(hStats).map(h => {
            const s = hStats[h];
            return [h, s.count, s.wn > 0 ? `${Math.round(s.wm / s.wn)} min` : '-', s.mn > 0 ? `${Math.round(s.mm / s.mn)} min` : '-'];
          }),
          ...ts,
        });
      }
      const pages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pages} - Confidential`, 14, 290);
      }
      const fn = `${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      const blobUrl = doc.output('bloburl');
      setPdfPreview({ url: blobUrl.toString(), name: fn, type: reportName });
    } catch (e) {
      console.error(e);
      alert('Failed to generate report.');
    } finally {
      setIsGenerating(null);
    }
  };

  const H = 220;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Guest behaviour, host performance and flow dynamics.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">

          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {(['insights', 'hosts', 'flow', 'exports'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={'px-5 py-2 text-sm font-semibold rounded-lg transition-all ' + (activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                {tab === 'insights' ? 'Guest Insights' : tab === 'hosts' ? 'Host Metrics' : tab === 'flow' ? 'Flow Dynamics' : 'PDF Exports'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab !== 'exports' && (
        <div className="space-y-12 animate-in fade-in duration-300">

          {activeTab === 'insights' && (
            <section>
                        <SectionHeader label="Section 1 - Guest and Visitor Insights" description="Who visits, why they come, and whether they were expected." timeFilter={timeFilter} setTimeFilter={setTimeFilter} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
                          <ChartCard title="Visitor Categorisation" subtitle="Breakdown of all visits by visitor type">
                            <div className="flex items-center">
                              {!visitorCategories || visitorCategories.length === 0 ? (
                                <div style={{ height: H }} className="flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-4">
                                  <Users className="w-8 h-8 opacity-20" />
                                  <span className="text-sm font-medium">No visitors in this period</span>
                                </div>
                              ) : (
                                <ResponsiveContainer width="55%" height={H}>
                                <RePieChart>
                                  <Pie data={visitorCategories} cx="50%" cy="50%" innerRadius={0} outerRadius={75} paddingAngle={3} dataKey="value">
                                    {visitorCategories.map((_, i) => <Cell key={i} fill={PIE1[i % PIE1.length]} />)}
                                  </Pie>
                                  <RechartsTooltip content={<ChartTooltip />} />
                                </RePieChart>
                              </ResponsiveContainer>
                              )}
                              <PieLegend data={visitorCategories} colors={PIE1} />
                            </div>
                          </ChartCard>
            
                          <ChartCard title="Purpose of Visit" subtitle="Most common reasons for arriving at reception">
                            {!visitPurpose || visitPurpose.length === 0 ? (
                                <div style={{ height: H }} className="flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-4">
                                  <FileText className="w-8 h-8 opacity-20" />
                                  <span className="text-sm font-medium">No visit purposes recorded</span>
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height={H}>
                              <BarChart data={visitPurpose} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={TICK} />
                                <YAxis dataKey="purpose" type="category" axisLine={false} tickLine={false} tick={{ ...TICK, fontSize: 10 }} width={120} />
                                <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="count" name="Visits" fill={P.indigo} radius={[0, 4, 4, 0]}>
                                  <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: '#64748b' }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                              )}
                          </ChartCard>
            
                          <ChartCard title="Pre-Registered vs Walk-ins" subtitle="Expected guests compared to unannounced arrivals">
                            <div className="flex items-center">
                              {!preregistered || preregistered.length === 0 ? (
                                <div style={{ height: H }} className="flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-4">
                                  <UserCheck className="w-8 h-8 opacity-20" />
                                  <span className="text-sm font-medium">No pre-registration data</span>
                                </div>
                              ) : (
                                <ResponsiveContainer width="55%" height={H}>
                                <RePieChart>
                                  <Pie data={preregistered} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                                    {preregistered.map((_, i) => <Cell key={i} fill={PIE2[i]} />)}
                                  </Pie>
                                  <RechartsTooltip content={<ChartTooltip />} />
                                </RePieChart>
                              </ResponsiveContainer>
                              )}
                              <PieLegend data={preregistered} colors={PIE2} />
                            </div>
                          </ChartCard>
            
                          <ChartCard title="Visitor Retention" subtitle="First-time vs. returning visitors across the last 4 weeks">
                            {!retention || retention.length === 0 ? (
                                <div style={{ height: H }} className="flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-4">
                                  <Activity className="w-8 h-8 opacity-20" />
                                  <span className="text-sm font-medium">No retention data available</span>
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height={H}>
                              <BarChart data={retention} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={TICK} />
                                <YAxis axisLine={false} tickLine={false} tick={TICK} />
                                <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                                <Bar dataKey="firstTime" name="First-time" fill={P.blue} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="returning" name="Returning" fill={P.emerald} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                              )}
                          </ChartCard>
            
                        </div>
                      </section>
          )}

          {activeTab === 'hosts' && (
            <section>
                        <SectionHeader label="Section 2 - Host and Department Metrics" description="Which hosts and departments drive the most traffic, and how fast they respond." timeFilter={timeFilter} setTimeFilter={setTimeFilter} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
                          <ChartCard title="Top Receiving Hosts" subtitle="Employees who received the most visitors this month">
                            {!topHosts || topHosts.length === 0 ? (
                                <div style={{ height: H }} className="flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-4">
                                  <Users className="w-8 h-8 opacity-20" />
                                  <span className="text-sm font-medium">No host data in this period</span>
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height={H}>
                              <BarChart data={topHosts} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                                <XAxis dataKey="host" axisLine={false} tickLine={false} tick={TICK} />
                                <YAxis axisLine={false} tickLine={false} tick={TICK} />
                                <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="visitors" name="Visitors" fill={P.violet} radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="visitors" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                              )}
                          </ChartCard>
            
                          <ChartCard title="Traffic by Department" subtitle="Visit volume distributed across company departments">
                            <div className="flex items-center">
                              {!deptTraffic || deptTraffic.length === 0 ? (
                                <div style={{ height: H }} className="flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-4">
                                  <Building className="w-8 h-8 opacity-20" />
                                  <span className="text-sm font-medium">No department traffic</span>
                                </div>
                              ) : (
                                <ResponsiveContainer width="55%" height={H}>
                                <RePieChart>
                                  <Pie data={deptTraffic} cx="50%" cy="50%" innerRadius={0} outerRadius={75} paddingAngle={3} dataKey="value">
                                    {deptTraffic.map((_, i) => <Cell key={i} fill={DEPT[i % DEPT.length]} />)}
                                  </Pie>
                                  <RechartsTooltip content={<ChartTooltip />} />
                                </RePieChart>
                              </ResponsiveContainer>
                              )}
                              <PieLegend data={deptTraffic} colors={DEPT} />
                            </div>
                          </ChartCard>
            
                          <ChartCard title="Host Responsiveness" subtitle="Average minutes to acknowledge a guest arrival throughout the day">
                            <ResponsiveContainer width="100%" height={H}>
                              <LineChart data={hostResponsiveness} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={TICK} />
                                <YAxis axisLine={false} tickLine={false} tick={TICK} unit=" m" />
                                <RechartsTooltip content={<ChartTooltip unit=" min" />} />
                                <Line type="monotone" dataKey="wait" name="Avg response" stroke={P.amber} strokeWidth={2.5} dot={{ r: 3, fill: P.amber }} activeDot={{ r: 5 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </ChartCard>
            
                          <ChartCard title="SLA Breaches by Host" subtitle="Instances where a guest waited over 10 minutes before admission">
                            <ResponsiveContainer width="100%" height={H}>
                              <BarChart data={slaBreaches} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                                <XAxis dataKey="host" axisLine={false} tickLine={false} tick={TICK} />
                                <YAxis axisLine={false} tickLine={false} tick={TICK} />
                                <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="breaches" name="Breaches" fill={P.rose} radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="breaches" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartCard>
            
                        </div>
                      </section>
          )}

          {activeTab === 'flow' && (
            <section>
                        <SectionHeader label="Section 3 - Interaction and Flow Dynamics" description="How long visits last, when foot traffic peaks, and where appointments fall through." timeFilter={timeFilter} setTimeFilter={setTimeFilter} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
                          <ChartCard title="Check-in Duration" subtitle="Time visitors spend interacting with the kiosk before completing check-in">
                            {!checkinDuration || checkinDuration.length === 0 ? (
                                <div style={{ height: H }} className="flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-4">
                                  <Clock className="w-8 h-8 opacity-20" />
                                  <span className="text-sm font-medium">No check-in duration data</span>
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height={H}>
                              <BarChart data={checkinDuration} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                                <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ ...TICK, fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={TICK} />
                                <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="visits" name="Visits" fill={P.teal} radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="visits" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                              )}
                          </ChartCard>
            
                          <ChartCard title="Average Visit Length" subtitle="Mean stay duration from check-in to check-out, by time of day">
                            {!visitLength || visitLength.length === 0 ? (
                                <div style={{ height: H }} className="flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-4">
                                  <Clock className="w-8 h-8 opacity-20" />
                                  <span className="text-sm font-medium">No visit length data</span>
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height={H}>
                              <LineChart data={visitLength} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={TICK} />
                                <YAxis axisLine={false} tickLine={false} tick={TICK} unit=" m" />
                                <RechartsTooltip content={<ChartTooltip unit=" min" />} />
                                <Line type="monotone" dataKey="length" name="Avg duration" stroke={P.sky} strokeWidth={2.5} dot={{ r: 3, fill: P.sky }} activeDot={{ r: 5 }} />
                              </LineChart>
                            </ResponsiveContainer>
                              )}
                          </ChartCard>
            
                          <ChartCard title="Peak Days of the Week" subtitle="Historical foot traffic from Monday to Friday">
                            {!peakDays || peakDays.length === 0 ? (
                                <div style={{ height: H }} className="flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-4">
                                  <CalendarIcon className="w-8 h-8 opacity-20" />
                                  <span className="text-sm font-medium">No traffic data for these days</span>
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height={H}>
                              <BarChart data={peakDays} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={TICK} />
                                <YAxis axisLine={false} tickLine={false} tick={TICK} />
                                <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="visitors" name="Visitors" radius={[4, 4, 0, 0]}>
                                  {peakDays.map((_, i) => <Cell key={i} fill={i === 1 ? P.blue : i === 2 ? P.indigo : P.slate} />)}
                                  <LabelList dataKey="visitors" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                              )}
                          </ChartCard>
            
                          <ChartCard title="No-Show Rate" subtitle="Percent of cancelled or missed pre-booked appointments over the current month">
                            {!noShowRate || noShowRate.length === 0 ? (
                                <div style={{ height: H }} className="flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-4">
                                  <Shield className="w-8 h-8 opacity-20" />
                                  <span className="text-sm font-medium">No no-show data recorded</span>
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height={H}>
                              <AreaChart data={noShowRate} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="noShowGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={P.rose} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={P.rose} stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ ...TICK, fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={TICK} unit="%" />
                                <RechartsTooltip content={<ChartTooltip unit="%" />} />
                                <Area type="monotone" dataKey="rate" name="No-show rate" stroke={P.rose} strokeWidth={2.5} fill="url(#noShowGrad)" dot={{ r: 3, fill: P.rose }} activeDot={{ r: 5 }} />
                              </AreaChart>
                            </ResponsiveContainer>
                              )}
                          </ChartCard>
            
                        </div>
                      </section>
          )}

        </div>
      )}

      {activeTab === 'exports' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">

          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-slate-900">Export Compliance PDFs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-5"><Search size={22} /></div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1.5">Master Audit</h3>
                  <p className="text-sm text-slate-400 mb-6 leading-relaxed">All visitors, hosts, and timestamps for security and compliance reviews.</p>
                </div>
                <button onClick={() => generateReport('Master_Audit', 'Master Audit')} disabled={isGenerating !== null}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isGenerating === 'Master_Audit' ? <span className="animate-pulse">Generating...</span> : <><Download size={15} /> Export PDF</>}
                </button>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-5"><Clock size={22} /></div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1.5">Host SLA Report</h3>
                  <p className="text-sm text-slate-400 mb-6 leading-relaxed">Today's wait times and meeting durations grouped by host.</p>
                </div>
                <button onClick={() => generateReport('Host_SLA', 'SLA Analysis')} disabled={isGenerating !== null}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isGenerating === 'Host_SLA' ? <span className="animate-pulse">Generating...</span> : <><Download size={15} /> Export PDF</>}
                </button>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between sm:col-span-2 hover:shadow-md transition-shadow">
                <div className="flex gap-5 items-start mb-5">
                  <div className="w-12 h-12 shrink-0 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><BarChart3 size={22} /></div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-1">Traffic Summary</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">Aggregate distribution of visitor states across the entire system.</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => generateReport('Traffic_Summary', 'Traffic Summary')} disabled={isGenerating !== null}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50">
                    {isGenerating === 'Traffic_Summary' ? <span className="animate-pulse">Generating...</span> : <><Download size={15} /> Export PDF</>}
                  </button>
                </div>
              </div>

            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Exports</h2>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Download History</p>
              </div>
              <div className="p-2">
                {exports.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <FileText size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No exports yet.</p>
                  </div>
                ) : exports.map(exp => (
                  <div key={exp.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><FileText size={16} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{exp.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{exp.type}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={10} /> {exp.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}


      {pdfPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Preview: {pdfPreview.type}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{pdfPreview.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = pdfPreview.url;
                    a.download = pdfPreview.name;
                    a.click();
                    setExports(prev => [{ id: Date.now(), name: pdfPreview.name, date: new Date().toLocaleDateString(), type: pdfPreview.type }, ...prev]);
                    setPdfPreview(null);
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  <Download size={16} />
                  Download PDF
                </button>
                <button 
                  onClick={() => setPdfPreview(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-4">
              <iframe 
                src={pdfPreview.url} 
                className="w-full h-full rounded-xl border border-slate-200 shadow-sm bg-white"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
