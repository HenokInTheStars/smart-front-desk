import { jsPDF } from 'jspdf';

export function generateBadgePDF(visitorName: string, hostName: string, dateStr: string) {
  // Thermal printers use standard name badge sizing (e.g., Brother DK-1202 / DK-2205)
  // 100mm width x 62mm height is standard for landscape visitor badges
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [100, 62] 
  });

  // Black and White only for thermal printing
  // Top thick black banner
  doc.setFillColor(0, 0, 0); 
  doc.rect(0, 0, 100, 12, 'F');

  // Header Text (White text on black background)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('VISITOR', 50, 8, { align: 'center' });

  // Company Name
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('SMART FRONT DESK', 50, 18, { align: 'center' });

  // Visitor Name (Very large and bold for readability)
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(visitorName.toUpperCase(), 50, 32, { align: 'center' });

  // Host Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('HOST:', 50, 43, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(hostName.toUpperCase(), 50, 48, { align: 'center' });

  // Date and Time
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(dateStr, 50, 56, { align: 'center' });

  // Bottom Border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.line(5, 59, 95, 59);

  return doc;
}
