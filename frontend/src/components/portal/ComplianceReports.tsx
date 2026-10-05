'use client';

import React from 'react';
import { FileText, Download, BarChart3, Clock, Calendar, Search, Activity } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ComplianceReportsProps {
  currentUser: any;
}

export default function ComplianceReports({ currentUser }: ComplianceReportsProps) {
  const [exports, setExports] = React.useState([
    { id: 1, name: 'Master_Audit_2026-10-01.pdf', date: new Date().toLocaleDateString(), type: 'Master Audit' },
    { id: 2, name: 'Host_SLA_2026-10-04.pdf', date: new Date(Date.now() - 86400000).toLocaleDateString(), type: 'SLA Analysis' }
  ]);
  const [isGenerating, setIsGenerating] = React.useState<string | null>(null);

  const generateReport = async (reportType: string, reportName: string) => {
    setIsGenerating(reportType);
    
    try {
      const token = sessionStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/appointments?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const raw = await res.json();
      const appointments = raw.data || [];

      const doc = new jsPDF();
      
      // Matrix Branding Header
      const drawPdfHeader = (title: string, subtitle: string) => {
        // Dark Blue/Slate Header block
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 35, 'F');
        
        // Logo Text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("MATRIX", 14, 22);
        
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFontSize(22);
        doc.setFont('helvetica', 'normal');
        doc.text("SYS", 46, 22);

        // Report Title
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, 52);

        // Subtitle / Date
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.setFont('helvetica', 'normal');
        doc.text(subtitle, 14, 59);
      };

      const tableStyles = {
        theme: 'striped' as const,
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' as const, cellPadding: 6 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9, cellPadding: 5, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1 },
        startY: 65,
        margin: { top: 65, left: 14, right: 14, bottom: 20 },
      };
      
      if (reportType === 'Master_Audit') {
        drawPdfHeader('Master Audit Report', `Generated: ${new Date().toLocaleString()} | Total Records: ${appointments.length}`);

        const tableColumn = ["Visitor", "Host", "Status", "Date", "Notes"];
        const tableRows = appointments.map((apt: any) => [
          apt.visitor?.full_name || 'Unknown',
          apt.host?.full_name || 'Unknown',
          apt.status,
          new Date(apt.scheduled_time).toLocaleString(),
          (apt.notes || '').substring(0, 30) + (apt.notes?.length > 30 ? '...' : '')
        ]);

        autoTable(doc, { head: [tableColumn], body: tableRows, ...tableStyles });
        
      } else if (reportType === 'Traffic_Summary') {
        drawPdfHeader('Traffic Summary Report', `Generated: ${new Date().toLocaleString()} | Overview of visitor volume by status.`);
        
        const counts = appointments.reduce((acc: any, apt: any) => {
          acc[apt.status] = (acc[apt.status] || 0) + 1;
          return acc;
        }, {});

        const tableColumn = ["Status", "Total Count", "Percentage"];
        const tableRows = Object.keys(counts).map(status => {
          const percentage = ((counts[status] / appointments.length) * 100).toFixed(1) + '%';
          return [status.replace('_', ' ').toUpperCase(), counts[status], percentage];
        });

        autoTable(doc, { head: [tableColumn], body: tableRows, ...tableStyles });
        
      } else if (reportType === 'Host_SLA') {
        const todayStr = new Date().toDateString();
        const dailyAppointments = appointments.filter((apt: any) => 
          new Date(apt.scheduled_time).toDateString() === todayStr
        );
        
        drawPdfHeader('Daily Host SLA Report', `Generated: ${new Date().toLocaleString()} | Wait time and meeting durations for today.`);

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

        const tableColumn = ["Host Name", "Total Visitors", "Avg Wait Time", "Avg Meeting Duration"];
        const tableRows = Object.keys(hostStats).map(host => {
          const stats = hostStats[host];
          const avgWait = stats.waitCount > 0 ? Math.round(stats.totalWaitMins / stats.waitCount) : 0;
          const avgMeeting = stats.meetingCount > 0 ? Math.round(stats.totalMeetingMins / stats.meetingCount) : 0;
          
          return [
            host, 
            stats.count, 
            stats.waitCount > 0 ? `${avgWait} mins` : '-',
            stats.meetingCount > 0 ? `${avgMeeting} mins` : '-'
          ];
        });

        autoTable(doc, { head: [tableColumn], body: tableRows, ...tableStyles });
      }

      // Add Footer with page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} - Confidential internal report`, 14, 290);
      }

      const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
      setExports(prev => [{ id: Date.now(), name: filename, date: new Date().toLocaleDateString(), type: reportName }, ...prev]);
    } catch (e) {
      console.error(e);
      alert('Failed to generate report.');
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto pb-8">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Compliance & Reports</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Generate pixel-perfect PDF reports for audits, daily operations, and host SLA metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Report Generators */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-foreground">Available Reports</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Master Audit Card */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                  <Search size={28} />
                </div>
                <h3 className="font-bold text-foreground text-xl mb-2">Master Audit</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  A comprehensive export of all visitors, hosts, and timestamps for security and compliance audits.
                </p>
              </div>
              <button 
                onClick={() => generateReport('Master_Audit', 'Master Audit')} 
                disabled={isGenerating !== null} 
                className="w-full py-3.5 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating === 'Master_Audit' ? <span className="animate-pulse">Generating PDF...</span> : <><Download size={16} /> Export PDF</>}
              </button>
            </div>

            {/* SLA Card */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <Clock size={28} />
                </div>
                <h3 className="font-bold text-foreground text-xl mb-2">Host SLA Report</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Analyze today's visitor wait times and meeting durations grouped by host to measure performance.
                </p>
              </div>
              <button 
                onClick={() => generateReport('Host_SLA', 'SLA Analysis')} 
                disabled={isGenerating !== null} 
                className="w-full py-3.5 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating === 'Host_SLA' ? <span className="animate-pulse">Generating PDF...</span> : <><Download size={16} /> Export PDF</>}
              </button>
            </div>

            {/* Traffic Card */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col justify-between sm:col-span-2">
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-6">
                <div className="w-14 h-14 shrink-0 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center">
                  <BarChart3 size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-xl mb-1">Traffic Summary</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    High-level aggregate report showing the distribution of visitor states across the entire system.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => generateReport('Traffic_Summary', 'Traffic Summary')} 
                  disabled={isGenerating !== null} 
                  className="px-6 py-3.5 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating === 'Traffic_Summary' ? <span className="animate-pulse">Generating...</span> : <><Download size={16} /> Export Summary PDF</>}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: History */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-foreground">Recent Exports</h2>
          
          <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-muted/30">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Download History</p>
            </div>
            <div className="p-2">
              {exports.length === 0 && (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <FileText size={32} className="mb-2 opacity-20" />
                  <p className="text-sm font-medium">No exports yet today.</p>
                </div>
              )}
              {exports.map(exp => (
                <div key={exp.id} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-muted/50 transition-colors group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate" title={exp.name}>{exp.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground bg-border/50 px-2 py-0.5 rounded-md">
                        {exp.type}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <Calendar size={10} /> {exp.date}
                      </span>
                    </div>
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
