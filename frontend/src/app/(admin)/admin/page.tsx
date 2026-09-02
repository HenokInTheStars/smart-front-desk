'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, FileText, Building2, Activity,
  Search, Bell, Download, FileSpreadsheet, CheckCircle, Clock
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
}

interface ReportItem {
  id: string;
  title: string;
  description: string;
  period: string;
  fileSize: string;
}

export default function AdminOperationsDashboard() {
  const [currentView, setCurrentView] = useState<'reports' | 'overview' | 'activity' | 'staff'>('reports');
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState('');

  const reports: ReportItem[] = [
    {
      id: 'rep-1',
      title: 'Daily Lobby & Visitor Traffic',
      description: 'Hourly check-in volume, peak wait times, and kiosk throughput summary.',
      period: 'Updated Daily • 8:00 AM',
      fileSize: '1.2 MB'
    },
    {
      id: 'rep-2',
      title: 'Host Meeting & 30-Min SLA Compliance',
      description: 'Host response times, meeting durations, and queue turnaround metrics.',
      period: 'Updated Weekly • Mondays',
      fileSize: '850 KB'
    },
    {
      id: 'rep-3',
      title: 'Security & NDA Sign-off Audit',
      description: 'Digital NDA signatures, visitor badge return logs, and security verification.',
      period: 'Updated Weekly • Fridays',
      fileSize: '1.5 MB'
    },
    {
      id: 'rep-4',
      title: 'Monthly Executive Operations Digest',
      description: 'High-level operational performance, facility utilization, and staff attendance.',
      period: 'Monthly Report • Aug 2026',
      fileSize: '2.4 MB'
    },
  ];

  const recentEvents = [
    { id: 1, title: 'Front desk safety checklist verified', time: '15 mins ago', tag: 'Compliance' },
    { id: 2, title: 'Daily visitor log auto-archived to secure storage', time: '1 hour ago', tag: 'System' },
    { id: 3, title: 'Host Alex Morgan completed 30-min visitor meeting', time: '2 hours ago', tag: 'Host Queue' },
    { id: 4, title: 'Lobby Kiosk 01 diagnostic health check passed', time: '4 hours ago', tag: 'Hardware' },
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };
    fetchUsers();
  }, []);

  const handleDownload = (reportTitle: string, format: 'PDF' | 'CSV') => {
    setIsGenerating(`${reportTitle}-${format}`);
    setSuccessToast('');
    setTimeout(() => {
      setIsGenerating(null);
      setSuccessToast(`✓ ${reportTitle} (${format}) downloaded successfully.`);
      setTimeout(() => setSuccessToast(''), 4000);
    }, 1000);
  };

  const filteredReports = reports.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shadow-blue-500/20">
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-wide">Admin Portal</h1>
            <p className="text-[11px] text-slate-500">Operations Management</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setCurrentView('reports')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'reports' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText size={18} /> Manager Reports
          </button>

          <button 
            onClick={() => setCurrentView('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'overview' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard size={18} /> Operations Summary
          </button>

          <button 
            onClick={() => setCurrentView('activity')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'activity' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity size={18} /> Activity Feed
          </button>

          <button 
            onClick={() => setCurrentView('staff')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'staff' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users size={18} /> Staff Directory
          </button>
        </nav>

        {/* Role Footer */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
          Role: <span className="text-blue-600 font-semibold">Operations Admin</span>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs">
          <div className="w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports or logs..." 
              className="w-full bg-slate-50 text-sm text-slate-900 pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Operations Manager</span>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                OM
              </div>
            </div>
          </div>
        </header>

        {/* NOTIFICATION TOAST */}
        {successToast && (
          <div className="mx-8 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast('')} className="text-xs text-emerald-600 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* SCROLLABLE VIEW CONTAINER */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* VIEW 1: MANAGER REPORTS */}
            {currentView === 'reports' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Manager PDF & Excel Reports</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Download pre-compiled operational digests and compliance audit logs.</p>
                  </div>
                  <button 
                    onClick={() => handleDownload('All Operations Reports', 'PDF')}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <Download size={14} /> Export All (ZIP)
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 shadow-xs overflow-hidden">
                  {filteredReports.map((report) => (
                    <div key={report.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900">{report.title}</h3>
                        <p className="text-xs text-slate-500">{report.description}</p>
                        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                          <span>{report.period}</span>
                          <span>•</span>
                          <span>{report.fileSize}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => handleDownload(report.title, 'PDF')}
                          disabled={isGenerating === `${report.title}-PDF`}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <Download size={13} /> {isGenerating === `${report.title}-PDF` ? 'Exporting...' : 'PDF'}
                        </button>
                        <button 
                          onClick={() => handleDownload(report.title, 'CSV')}
                          disabled={isGenerating === `${report.title}-CSV`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <FileSpreadsheet size={13} /> CSV
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 2: OPERATIONS OVERVIEW */}
            {currentView === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Operations Summary</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Key daily metrics and lobby check-in statistics.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Visitors Checked-In Today</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">84</h3>
                    <p className="text-[11px] text-emerald-600 mt-2 font-medium">↑ 12% vs last week</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Active Host Meetings</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">14</h3>
                    <p className="text-[11px] text-slate-500 mt-2">Avg duration: 28 mins</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Avg Front Desk Wait Time</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">3.5m</h3>
                    <p className="text-[11px] text-emerald-600 mt-2 font-medium">Optimal speed</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Security Badge Compliance</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">100%</h3>
                    <p className="text-[11px] text-emerald-600 mt-2 font-medium">All passes signed & issued</p>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: ACTIVITY FEED */}
            {currentView === 'activity' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Live Activity Feed</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Recent operational and front desk events.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 shadow-xs overflow-hidden">
                  {recentEvents.map((event) => (
                    <div key={event.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <Clock size={16} className="text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{event.title}</p>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 mt-0.5 inline-block font-medium">
                            {event.tag}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{event.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 4: STAFF DIRECTORY */}
            {currentView === 'staff' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Staff Directory</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Read-only view of active personnel across departments.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 font-semibold">User Email</th>
                        <th className="px-6 py-3 font-semibold">Role</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {users.length > 0 ? (
                        users.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80">
                            <td className="px-6 py-3.5 font-medium text-slate-900">{u.email}</td>
                            <td className="px-6 py-3.5">
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-xs text-emerald-600 font-semibold">Active</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-6 text-center text-slate-400 text-xs">
                            No users found or loading directory...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

    </div>
  );
}
