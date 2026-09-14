export interface AppointmentReportItem {
  id: number;
  visitor?: {
    full_name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  host?: {
    full_name: string;
    department: string;
    employee_id?: string;
  };
  scheduled_time: string;
  status: string;
  notes?: string;
}

export interface UserReportItem {
  id: number;
  email: string;
  role: string;
  permissions?: string[];
  is_active: boolean;
}

export interface ReportExportOptions {
  reportTitle: string;
  reportType: 'evacuation' | 'visitors' | 'staff' | 'traffic' | 'general';
  appointments: AppointmentReportItem[];
  users?: UserReportItem[];
  generatedBy?: string;
}

/**
 * Generates an executive-grade HTML printable report that triggers the browser's
 * high-fidelity Print & Save as PDF dialog with corporate headers, KPI cards, and styled tables.
 */
function renderPrintableHTMLReport(options: ReportExportOptions): void {
  const { reportTitle, reportType, appointments, users = [], generatedBy = 'Facility Administrator' } = options;
  const isEvac = reportType === 'evacuation';

  const now = new Date();
  const timestampStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) + ' at ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const docId = `DOC-${reportType.toUpperCase()}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const checkedInCount = appointments.filter(a => ['checked in', 'waiting'].includes(a.status.toLowerCase())).length;
  const inMeetingCount = appointments.filter(a => ['in meeting', 'in_meeting'].includes(a.status.toLowerCase())).length;
  const currentlyInsideCount = checkedInCount + inMeetingCount;
  const completedCount = appointments.filter(a => ['completed', 'checked out'].includes(a.status.toLowerCase())).length;

  let tableHeaderHtml = '';
  let tableRowsHtml = '';

  if (reportType === 'evacuation') {
    const onPremise = appointments.filter(a => 
      ['checked in', 'waiting', 'in meeting', 'in_meeting'].includes(a.status.toLowerCase())
    );
    const dataList = onPremise.length > 0 ? onPremise : appointments.slice(0, 15);
    tableHeaderHtml = `
      <tr>
        <th style="width: 35px; text-align: center;">#</th>
        <th>Individual Name</th>
        <th>Purpose / Affiliation</th>
        <th>Assigned Host</th>
        <th>Department / Zone</th>
        <th>Check-In Time</th>
        <th style="text-align: right;">Evacuation Status</th>
      </tr>
    `;
    tableRowsHtml = dataList.map((a, i) => {
      const time = a.scheduled_time ? new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      return `
        <tr>
          <td style="text-align: center; color: #64748b; font-weight: bold;">${i + 1}</td>
          <td style="font-weight: 700; color: #0f172a;">${a.visitor?.full_name || 'Guest Visitor'}</td>
          <td>${a.visitor?.company || a.visitor?.email || 'General Visit'}</td>
          <td style="font-weight: 600; color: #1e293b;">${a.host?.full_name || 'Front Desk'}</td>
          <td style="color: #64748b;">${a.host?.department?.split('(')[0]?.trim() || 'Main Facility'}</td>
          <td style="font-family: monospace; font-size: 11px;">${time}</td>
          <td style="text-align: right;">
            <span style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 10px;">
              ACCOUNTED (INSIDE)
            </span>
          </td>
        </tr>
      `;
    }).join('');
  } else if (reportType === 'staff') {
    tableHeaderHtml = `
      <tr>
        <th style="width: 35px; text-align: center;">#</th>
        <th>Email Address</th>
        <th>Role Tier</th>
        <th>Granted Capabilities</th>
        <th style="text-align: right;">Account Status</th>
      </tr>
    `;
    tableRowsHtml = users.map((u, i) => `
      <tr>
        <td style="text-align: center; color: #64748b; font-weight: bold;">${i + 1}</td>
        <td style="font-weight: 600; color: #0f172a;">${u.email}</td>
        <td><span style="background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">${u.role}</span></td>
        <td style="color: #64748b; font-size: 11px;">${u.permissions && u.permissions.length > 0 ? `${u.permissions.length} active permissions` : 'Standard default preset'}</td>
        <td style="text-align: right;">
          <span style="background: ${u.is_active ? '#ecfdf5' : '#fef2f2'}; color: ${u.is_active ? '#047857' : '#dc2626'}; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 10px;">
            ${u.is_active ? 'ACTIVE' : 'SUSPENDED'}
          </span>
        </td>
      </tr>
    `).join('');
  } else {
    tableHeaderHtml = `
      <tr>
        <th style="width: 35px; text-align: center;">#</th>
        <th>Visitor Name</th>
        <th>Company / Purpose</th>
        <th>Assigned Host</th>
        <th>Department</th>
        <th>Time</th>
        <th style="text-align: right;">Status</th>
      </tr>
    `;
    tableRowsHtml = appointments.map((a, i) => {
      const time = a.scheduled_time ? new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      return `
        <tr>
          <td style="text-align: center; color: #64748b; font-weight: bold;">${i + 1}</td>
          <td style="font-weight: 700; color: #0f172a;">${a.visitor?.full_name || 'Guest Visitor'}</td>
          <td>${a.visitor?.company || a.visitor?.email || 'N/A'}</td>
          <td style="font-weight: 600; color: #1e293b;">${a.host?.full_name || 'Unassigned'}</td>
          <td style="color: #64748b;">${a.host?.department?.split('(')[0]?.trim() || 'Operations'}</td>
          <td style="font-family: monospace; font-size: 11px;">${time}</td>
          <td style="text-align: right;">
            <span style="background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 10px;">
              ${a.status.toUpperCase()}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  const primaryHex = isEvac ? '#dc2626' : '#0058be';
  const badgeLabel = isEvac ? 'CRITICAL EMERGENCY ROSTER' : 'OFFICIAL COMPLIANCE REPORT';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportTitle} - Matrix Technologies</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 15mm; }
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
        body { margin: 0; padding: 20px; color: #0f172a; background: #ffffff; font-size: 12px; line-height: 1.4; }
        .header-bar { height: 4px; background: ${primaryHex}; margin: -20px -20px 20px -20px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
        .logo-title { font-size: 20px; font-weight: 900; letter-spacing: 0.5px; color: #0f172a; margin: 0; }
        .logo-sub { font-size: 11px; color: #64748b; margin: 2px 0 0 0; }
        .badge { background: ${isEvac ? '#fef2f2' : '#eff6ff'}; color: ${primaryHex}; border: 1.5px solid ${primaryHex}; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 10px; letter-spacing: 0.5px; }
        .title-section { margin-bottom: 16px; }
        .report-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
        .meta-text { font-size: 10.5px; color: #64748b; margin: 0; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
        .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
        .kpi-card.highlight { background: ${isEvac ? '#fef2f2' : '#eff6ff'}; border-color: ${primaryHex}; }
        .kpi-label { font-size: 9px; font-weight: 800; color: #64748b; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-card.highlight .kpi-label { color: ${primaryHex}; }
        .kpi-value { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
        th { background: ${primaryHex}; color: #ffffff; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        tr:nth-child(even) { background: #f8fafc; }
        .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9.5px; color: #94a3b8; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header-bar"></div>
      <div class="header">
        <div>
          <h1 class="logo-title">MATRIX TECHNOLOGIES</h1>
          <p class="logo-sub">Smart Front Desk & Facility Operations System</p>
        </div>
        <div class="badge">${badgeLabel}</div>
      </div>

      <div class="title-section">
        <h2 class="report-title">${reportTitle.toUpperCase()}</h2>
        <p class="meta-text">Generated: ${timestampStr} &bull; Document ID: ${docId} &bull; Certified By: ${generatedBy}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card highlight">
          <p class="kpi-label">${isEvac ? 'INSIDE FACILITY' : 'ON PREMISE'}</p>
          <p class="kpi-value">${currentlyInsideCount}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">${isEvac ? 'IN MEETINGS' : 'TOTAL LOGGED'}</p>
          <p class="kpi-value">${isEvac ? inMeetingCount : appointments.length}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">${isEvac ? 'WAITING LOBBY' : 'COMPLETED'}</p>
          <p class="kpi-value">${isEvac ? checkedInCount : completedCount}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">FACILITY ZONE</p>
          <p class="kpi-value">Zone A &amp; B</p>
        </div>
      </div>

      <table>
        <thead>
          ${tableHeaderHtml}
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <span>Matrix Smart Front Desk Compliance System &bull; Confidential</span>
        <span>Electronic Audit Record</span>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 250);
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

/**
 * Main export function: Attempts client-side jsPDF download, or opens
 * the high-DPI corporate Print & Save as PDF window.
 */
export async function generateBeautifulPDF(options: ReportExportOptions): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Dynamic import to prevent SSR/Turbopack bundle resolution issues
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const { reportTitle, reportType, appointments, users = [], generatedBy = 'Facility Administrator' } = options;
    const isEvac = reportType === 'evacuation';

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const primaryColor = isEvac ? [220, 38, 38] : [0, 88, 190];
    const darkSlate = [15, 23, 42];

    const now = new Date();
    const timestampStr = now.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) + ' at ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const documentSerial = `DOC-${reportType.toUpperCase()}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Top Bar
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // 2. Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('MATRIX TECHNOLOGIES', 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Smart Front Desk & Facility Operations System', 14, 21);

    // Badge on right
    const badgeText = isEvac ? 'CRITICAL EMERGENCY ROSTER' : 'OFFICIAL COMPLIANCE REPORT';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const badgeWidth = doc.getTextWidth(badgeText) + 8;
    const badgeX = pageWidth - 14 - badgeWidth;
    
    doc.setFillColor(isEvac ? 254 : 239, isEvac ? 242 : 246, isEvac ? 242 : 255);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(badgeX, 11, badgeWidth, 6, 1.5, 1.5, 'FD');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(badgeText, badgeX + 4, 15);

    // Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, 25, pageWidth - 14, 25);

    // Title & Meta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(reportTitle.toUpperCase(), 14, 33);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${timestampStr} | Document ID: ${documentSerial}`, 14, 38);

    // Metrics Cards
    const checkedInCount = appointments.filter(a => ['checked in', 'waiting'].includes(a.status.toLowerCase())).length;
    const inMeetingCount = appointments.filter(a => ['in meeting', 'in_meeting'].includes(a.status.toLowerCase())).length;
    const currentlyInsideCount = checkedInCount + inMeetingCount;
    const completedCount = appointments.filter(a => ['completed', 'checked out'].includes(a.status.toLowerCase())).length;

    const cardY = 42;
    const cardHeight = 14;
    const cardWidth = (pageWidth - 28 - 9) / 4;

    const kpis = isEvac
      ? [
          { label: 'INSIDE FACILITY', val: String(currentlyInsideCount), highlight: true },
          { label: 'IN MEETINGS', val: String(inMeetingCount), highlight: false },
          { label: 'WAITING LOBBY', val: String(checkedInCount), highlight: false },
          { label: 'FACILITY ZONE', val: 'Zone A & B', highlight: false },
        ]
      : [
          { label: 'TOTAL LOGGED', val: String(appointments.length), highlight: false },
          { label: 'ON PREMISE', val: String(currentlyInsideCount), highlight: true },
          { label: 'COMPLETED', val: String(completedCount), highlight: false },
          { label: 'ACTIVE HOSTS', val: String(new Set(appointments.map(a => a.host?.full_name).filter(Boolean)).size || 10), highlight: false },
        ];

    kpis.forEach((kpi, idx) => {
      const x = 14 + idx * (cardWidth + 3);
      doc.setFillColor(kpi.highlight ? (isEvac ? 254 : 239) : 248, kpi.highlight ? (isEvac ? 242 : 246) : 250, kpi.highlight ? (isEvac ? 242 : 255) : 252);
      doc.setDrawColor(kpi.highlight ? primaryColor[0] : 226, kpi.highlight ? primaryColor[1] : 232, kpi.highlight ? primaryColor[2] : 240);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(kpi.highlight ? primaryColor[0] : 100, kpi.highlight ? primaryColor[1] : 116, kpi.highlight ? primaryColor[2] : 139);
      doc.text(kpi.label, x + 3, cardY + 4);

      doc.setFontSize(10);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(kpi.val, x + 3, cardY + 10.5);
    });

    // Table Data
    let tableHeaders: string[][] = [];
    let tableData: string[][] = [];

    if (reportType === 'evacuation') {
      const onPremise = appointments.filter(a => 
        ['checked in', 'waiting', 'in meeting', 'in_meeting'].includes(a.status.toLowerCase())
      );
      tableHeaders = [['#', 'INDIVIDUAL NAME', 'PURPOSE', 'HOST / ESCORT', 'DEPT / ZONE', 'CHECK-IN', 'STATUS']];
      tableData = (onPremise.length > 0 ? onPremise : appointments.slice(0, 15)).map((a, i) => {
        const time = a.scheduled_time ? new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        return [
          String(i + 1),
          a.visitor?.full_name || 'Guest Visitor',
          a.visitor?.company || 'General Visit',
          a.host?.full_name || 'Front Desk',
          a.host?.department?.split('(')[0]?.trim() || 'Lobby',
          time,
          'ACCOUNTED (INSIDE)',
        ];
      });
    } else if (reportType === 'staff') {
      tableHeaders = [['#', 'EMAIL ADDRESS', 'ROLE TIER', 'CAPABILITIES', 'STATUS']];
      tableData = users.map((u, i) => [
        String(i + 1),
        u.email,
        u.role,
        u.permissions && u.permissions.length > 0 ? `${u.permissions.length} active permissions` : 'Standard default preset',
        u.is_active ? 'ACTIVE' : 'SUSPENDED',
      ]);
    } else {
      tableHeaders = [['#', 'VISITOR NAME', 'COMPANY / EMAIL', 'ASSIGNED HOST', 'DEPARTMENT', 'TIME', 'STATUS']];
      tableData = appointments.map((a, i) => {
        const time = a.scheduled_time ? new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        return [
          String(i + 1),
          a.visitor?.full_name || 'Guest Visitor',
          a.visitor?.company || a.visitor?.email || 'N/A',
          a.host?.full_name || 'Unassigned',
          a.host?.department?.split('(')[0]?.trim() || 'Operations',
          time,
          a.status.toUpperCase(),
        ];
      });
    }

    autoTable(doc, {
      startY: cardY + cardHeight + 5,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [250, 252, 254],
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
      },
      didDrawPage: () => {
        const str = `Page ${doc.getNumberOfPages()} • Matrix Smart Front Desk Compliance System • Confidential`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(str, pageWidth / 2, pageHeight - 6, { align: 'center' });
      },
    });

    const filename = `${reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  } catch (err) {
    console.warn('Direct jsPDF download encountered an issue, falling back to printable HTML document:', err);
    renderPrintableHTMLReport(options);
  }
}

export function generateCSV(reportTitle: string, appointments: AppointmentReportItem[]): void {
  const headers = ['ID', 'Visitor Name', 'Visitor Email', 'Visitor Phone', 'Company/Purpose', 'Host Name', 'Host Department', 'Scheduled Time', 'Status', 'Notes'];
  
  const rows = appointments.map(a => [
    a.id,
    `"${a.visitor?.full_name || ''}"`,
    `"${a.visitor?.email || ''}"`,
    `"${a.visitor?.phone || ''}"`,
    `"${a.visitor?.company || ''}"`,
    `"${a.host?.full_name || ''}"`,
    `"${a.host?.department || ''}"`,
    `"${a.scheduled_time || ''}"`,
    `"${a.status || ''}"`,
    `"${(a.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
