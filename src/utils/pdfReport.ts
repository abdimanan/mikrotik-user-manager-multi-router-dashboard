import jsPDF from 'jspdf';
import { formatMiB } from './bytes';

// Precise binary MiB alongside an approximate decimal GB, e.g. "16,628.3 MiB (~16.24 GB)"
export function formatMiBWithGb(bytes: number): string {
  const gib = bytes / (1024 * 1024 * 1024);
  return `${formatMiB(bytes)} (~${gib.toFixed(2)} GB)`;
}

/**
 * Draws a highlighted "TOTAL SUMMARY" band below a table (Download / Upload /
 * Total / an "N <label>" count, e.g. "11 Active"). Starts a new page if the
 * band wouldn't fit under the current content.
 */
export function drawTotalSummaryFooter(
  doc: jsPDF,
  afterY: number,
  opts: { downloadBytes: number; uploadBytes: number; count: number; countLabel: string }
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const totalBytes = opts.downloadBytes + opts.uploadBytes;

  const valuesText = `${formatMiBWithGb(opts.downloadBytes)}   |   ${formatMiBWithGb(opts.uploadBytes)}   |   ${formatMiBWithGb(totalBytes)}   |   ${opts.count} ${opts.countLabel}`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const valueLines = doc.splitTextToSize(valuesText, contentWidth - 8) as string[];
  const lineHeight = 5;
  const boxHeight = 9 + valueLines.length * lineHeight;

  let y = afterY + 6;
  if (y + boxHeight > pageHeight - 10) {
    doc.addPage();
    y = 16;
  }

  doc.setDrawColor(194, 198, 211);
  doc.setFillColor(230, 239, 248);
  doc.roundedRect(marginX, y, contentWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 61, 124);
  doc.text('TOTAL SUMMARY', marginX + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 29, 35);
  doc.text(valueLines, marginX + 4, y + 7 + lineHeight);
}

// Reads the Y position where the most recently drawn autoTable ended
// (jspdf-autotable attaches this to the doc instance at runtime; not in its
// published types), falling back to a page-height clamp if unavailable.
export function getTableFinalY(doc: jsPDF, fallback: number): number {
  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
  return typeof finalY === 'number' ? finalY : fallback;
}
