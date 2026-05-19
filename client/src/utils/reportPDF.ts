import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const SHOP_NAME = 'The Outfit Lounge';
const GOLD_RGB: [number, number, number] = [180, 140, 80];
const DARK_RGB: [number, number, number] = [25, 25, 35];
const GRAY_RGB: [number, number, number] = [110, 110, 125];
const LIGHT_BG: [number, number, number] = [248, 248, 252];
const BORDER_RGB: [number, number, number] = [210, 210, 220];

export function createDoc() {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
}

let _logoCache: string | null | undefined = undefined;
export async function loadLogo(): Promise<string | null> {
  if (_logoCache !== undefined) return _logoCache;
  try {
    const res = await fetch('/logo.jpg');
    const blob = await res.blob();
    _logoCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    _logoCache = null;
  }
  return _logoCache;
}

export async function addHeader(
  doc: jsPDF,
  logo: string | null,
  title: string,
  subtitle?: string,
): Promise<number> {
  const w = doc.internal.pageSize.getWidth();

  // Gold banner
  doc.setFillColor(...GOLD_RGB);
  doc.rect(0, 0, w, 32, 'F');

  // Logo
  let textX = 14;
  if (logo) {
    try {
      doc.addImage(logo, 'JPEG', 8, 5, 22, 22);
      textX = 34;
    } catch { /* skip logo if it fails */ }
  }

  // Shop name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(SHOP_NAME, textX, 15);

  // Report title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(240, 230, 210);
  doc.text(title, textX, 23);

  // Right: subtitle + generated date
  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, w - 14, 13, { align: 'right' });
  }
  doc.setFontSize(8);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    w - 14,
    subtitle ? 21 : 16,
    { align: 'right' },
  );

  // Divider line
  doc.setDrawColor(...GOLD_RGB);
  doc.setLineWidth(0.4);
  doc.line(0, 32, w, 32);

  return 40;
}

export function addFooter(doc: jsPDF): void {
  const pages = (doc as any).internal.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.3);
    doc.line(14, h - 14, w - 14, h - 14);
    doc.setTextColor(...GRAY_RGB);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(SHOP_NAME, 14, h - 8);
    doc.text(`Page ${i} / ${pages}`, w - 14, h - 8, { align: 'right' });
  }
}

export function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_RGB);
  doc.text(title, 14, y);
  doc.setDrawColor(...GOLD_RGB);
  doc.setLineWidth(0.5);
  doc.line(14, y + 1.5, 14 + doc.getTextWidth(title), y + 1.5);
  return y + 8;
}

export function addStatCards(
  doc: jsPDF,
  stats: { label: string; value: string; color?: [number, number, number] }[],
  y: number,
): number {
  const w = doc.internal.pageSize.getWidth() - 28;
  const cols = Math.min(stats.length, 4);
  const cardW = w / cols;
  const cardH = 18;

  stats.forEach((stat, i) => {
    const x = 14 + i * cardW;
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_RGB);
    doc.roundedRect(x + 1, y, cardW - 2, cardH, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_RGB);
    doc.text(stat.label, x + 5, y + 6);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(stat.color ?? DARK_RGB));
    doc.text(stat.value, x + 5, y + 14);
  });

  return y + cardH + 6;
}

export function addTable(
  doc: jsPDF,
  head: string[],
  body: (string | number)[][],
  y: number,
): number {
  autoTable(doc, {
    startY: y,
    head: [head],
    body: body.map((row) => row.map(String)),
    theme: 'striped',
    headStyles: {
      fillColor: GOLD_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: DARK_RGB },
    alternateRowStyles: { fillColor: LIGHT_BG },
    margin: { left: 14, right: 14 },
  });
  return ((doc as any).lastAutoTable?.finalY ?? y) + 8;
}

export async function captureChart(el: HTMLElement): Promise<string | null> {
  try {
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: 1.5,
      useCORS: true,
      logging: false,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export async function addChartImage(
  doc: jsPDF,
  imgData: string,
  y: number,
  maxH = 65,
): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth() - 28;
  const pageH = doc.internal.pageSize.getHeight();

  // Use Image to get natural dimensions
  const dims = await new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 0.5 });
    img.src = imgData;
  });

  const ratio = dims.h / dims.w;
  const drawH = Math.min(pageW * ratio, maxH);

  // Add new page if needed
  if (y + drawH > pageH - 20) {
    doc.addPage();
    y = 16;
  }

  doc.addImage(imgData, 'PNG', 14, y, pageW, drawH);
  return y + drawH + 8;
}
