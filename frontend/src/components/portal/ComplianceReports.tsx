'use client';

import React from 'react';
import { FileText, Download, Filter, BarChart3, Clock, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ComplianceReportsProps {
  currentUser: any;
}

export default function ComplianceReports({ currentUser }: ComplianceReportsProps) {
  const [exports, setExports] = React.useState([
    { id: 1, name: 'Q1 Traffic Report.pdf', date: new Date().toLocaleDateString() },
    { id: 2, name: 'SLA Analysis.pdf', date: new Date(Date.now() - 86400000).toLocaleDateString() }
  ]);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const generateReport = async (reportType: string) => {
    setIsGenerating(true);
    
    try {
      const token = sessionStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/appointments?limit=500', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const raw = await res.json();
      const appointments = raw.data || [];

      const doc = new jsPDF();
      doc.setFontSize(20);
      
      if (reportType === 'Master_Audit') {
        doc.text('Master Audit Report', 14, 22);
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Total Records: ${appointments.length}`, 14, 36);

        const tableColumn = ["Visitor", "Host", "Status", "Date"];
        const tableRows = appointments.map((apt: any) => [
          apt.visitor?.full_name || 'Unknown',
          apt.host?.full_name || 'Unknown',
          apt.status,
          new Date(apt.scheduled_time).toLocaleString()
        ]);

        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 45, styles: { fontSize: 9 } });
        
      } else if (reportType === 'Traffic_Summary') {
        doc.text('Traffic Summary Report', 14, 22);
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        
        // Count by status
        const counts = appointments.reduce((acc: any, apt: any) => {
          acc[apt.status] = (acc[apt.status] || 0) + 1;
          return acc;
        }, {});

        const tableColumn = ["Status", "Total Count"];
        const tableRows = Object.keys(counts).map(status => [status, counts[status]]);

        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 40, styles: { fontSize: 10 } });
        
      } else if (reportType === 'Host_SLA') {
        doc.text('Daily Host SLA Report', 14, 22);
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        
        // Filter for TODAY's appointments only
        const todayStr = new Date().toDateString();
        const dailyAppointments = appointments.filter((apt: any) => 
          new Date(apt.scheduled_time).toDateString() === todayStr
        );

        // Aggregate stats by Host
        const hostStats = dailyAppointments.reduce((acc: any, apt: any) => {
          const hostName = apt.host?.full_name || 'Unknown';
          if (!acc[hostName]) {
            acc[hostName] = { count: 0, totalWaitMins: 0, waitCount: 0, totalMeetingMins: 0, meetingCount: 0 };
          }
          acc[hostName].count += 1;
          
          if (apt.checked_in_at && apt.admitted_at) {
             const waitTime = (new Date(apt.admitted_at).getTime() - new Date(apt.checked_in_at).getTime()) / 60000;
             acc[hostName].totalWaitMins += Math.max(waitTime, 0);
             acc[hostName].waitCount += 1;
          }
          
          if (apt.admitted_at && apt.checked_out_at) {
             const meetTime = (new Date(apt.checked_out_at).getTime() - new Date(apt.admitted_at).getTime()) / 60000;
             acc[hostName].totalMeetingMins += Math.max(meetTime, 0);
             acc[hostName].meetingCount += 1;
          }
          
          return acc;
        }, {});

        const tableColumn = ["Host Name", "Total Visitors Handled", "Avg Wait Time", "Avg Meeting Duration"];
        const tableRows = Object.keys(hostStats).map(host => {
          const stats = hostStats[host];
          const avgWait = stats.waitCount > 0 ? Math.round(stats.totalWaitMins / stats.waitCount) : 0;
          const avgMeeting = stats.meetingCount > 0 ? Math.round(stats.totalMeetingMins / stats.meetingCount) : 0;
          
          return [
            host, 
            stats.count, 
            stats.waitCount > 0 ? `${avgWait} minutes` : 'No completed waits',
            stats.meetingCount > 0 ? `${avgMeeting} minutes` : 'No completed meetings'
          ];
        });

        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 40, styles: { fontSize: 10 } });
      }

      const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
      setExports(prev => [{ id: Date.now(), name: filename, date: new Date().toLocaleDateString() }, ...prev]);
    } catch (e) {
      console.error(e);
      alert('Failed to generate report.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Compliance & Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate system-wide historical reports and manage data retention.
          </p>
        </div>
        <button onClick={() => generateReport('Master_Audit')} disabled={isGenerating} className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-2 disabled:opacity-50">
          <Download size={16} /> {isGenerating ? 'Generating...' : 'Export Master Audit'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Report Cards */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-shadow cursor-pointer group">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BarChart3 size={24} />
          </div>
          <h3 className="font-bold text-foreground text-lg mb-1">Traffic Summary</h3>
          <p className="text-sm text-muted-foreground mb-4">Daily, weekly, or monthly check-in volumes and peak hours.</p>
          <button onClick={() => generateReport('Traffic_Summary')} disabled={isGenerating} className="flex items-center text-primary text-sm font-bold mt-2 hover:underline disabled:opacity-50">
            Generate Report &rarr;
          </button>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-shadow cursor-pointer group">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
          <h3 className="font-bold text-foreground text-lg mb-1">Daily Host SLA Report</h3>
          <p className="text-sm text-muted-foreground mb-4">Today's visitor wait times per host and department.</p>
          <button onClick={() => generateReport('Host_SLA')} disabled={isGenerating} className="flex items-center text-emerald-600 text-sm font-bold mt-2 hover:underline disabled:opacity-50">
            Generate Daily Report &rarr;
          </button>
        </div>

      </div>

      {/* Recent Exports */}
      <div className="bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] p-6">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <FileText size={18} className="text-muted-foreground/70" /> Recent Exports
        </h3>
        <div className="space-y-3">
          {exports.length === 0 && <p className="text-sm text-muted-foreground p-2">No recent exports.</p>}
          {exports.map(exp => (
            <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors border border-border/50">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-rose-500" />
                <div>
                  <p className="text-sm font-bold text-foreground">{exp.name}</p>
                  <p className="text-xs text-muted-foreground/70">Generated on {exp.date}</p>
                </div>
              </div>
              <button onClick={() => alert(`Downloading ${exp.name}...`)} className="text-sm font-bold text-primary hover:text-indigo-800">Download</button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
