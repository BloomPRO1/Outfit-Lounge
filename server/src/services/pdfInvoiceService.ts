import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import path from 'path';
import fs from 'fs';

// ─── In-memory invoice store (24h TTL) ────────────────────────────────────────
interface InvoiceEntry { buffer: Buffer; filename: string; expires: number; }
const store = new Map<string, InvoiceEntry>();

export function getStoredInvoice(token: string): InvoiceEntry | null {
  const entry = store.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expires) { store.delete(token); return null; }
  return entry;
}

// ─── Image helpers ─────────────────────────────────────────────────────────────
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

async function loadLogoBuffer(shopLogoUrl?: string): Promise<Buffer | null> {
  // Try local filesystem paths (works in both dev/tsx and compiled/dist)
  const candidates = [
    path.join(__dirname, '../../../client/public/logo.jpg'),
    path.join(__dirname, '../../../client/dist/logo.jpg'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p);
    } catch { /* continue */ }
  }
  // Fallback: fetch from configured URL
  if (shopLogoUrl) return fetchImageBuffer(shopLogoUrl);
  return null;
}

function fmt(n: number | string) {
  const v = parseFloat(String(n));
  return `LKR ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── PDF Data Interface ────────────────────────────────────────────────────────
interface PDFData {
  type: 'receipt' | 'rental';
  refNumber: string; date: string; returnDate?: string;
  days?: number; eventType?: string; paymentMethod?: string; notes?: string;
  shopName: string; shopAddress?: string; shopPhone?: string;
  shopEmail?: string; shopLogoUrl?: string;
  customerName?: string; customerPhone?: string; customerEmail?: string;
  items: Array<{ name: string; qty: number; price: number; subtotal: number }>;
  subtotal: number; discount: number; tax: number;
  total: number; paid: number; change?: number; fine?: number;
}

// ─── PDF Builder ──────────────────────────────────────────────────────────────
async function buildPDF(d: PDFData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
      const bufs: Buffer[] = [];
      doc.on('data', (b: Buffer) => bufs.push(b));
      doc.on('end', () => resolve(Buffer.concat(bufs)));
      doc.on('error', reject);

      // ── Color palette ──────────────────────────────────────────────────────
      const GOLD   = '#c9a96e';
      const DARK   = '#1a1a2e';
      const TEXT   = '#1c1c2e';
      const GRAY   = '#6b7280';
      const LGRAY  = '#f3f4f6';
      const BORDER = '#e5e7eb';
      const GREEN  = '#059669';
      const RED    = '#dc2626';
      const WHITE  = '#ffffff';

      const PGW = 595;
      const ML = 45; const MR = 45; const W = PGW - ML - MR; // 505
      let y = 38;

      // ── Logo ────────────────────────────────────────────────────────────────
      const logoBuffer = await loadLogoBuffer(d.shopLogoUrl);
      const LOGO_SIZE = 65;
      if (logoBuffer) {
        try { doc.image(logoBuffer, ML, y, { fit: [LOGO_SIZE, LOGO_SIZE] }); } catch {}
      }

      // ── Company info ────────────────────────────────────────────────────────
      const compX = ML + (logoBuffer ? LOGO_SIZE + 14 : 0);
      const compW = PGW - MR - compX;
      doc.font('Helvetica-Bold').fontSize(20).fillColor(DARK)
        .text(d.shopName, compX, y, { width: compW, lineBreak: false });
      let infoY = y + 28;
      doc.font('Helvetica').fontSize(9).fillColor(GRAY);
      if (d.shopAddress) {
        doc.text(d.shopAddress, compX, infoY, { width: compW, lineBreak: false });
        infoY += 13;
      }
      const contact = [d.shopPhone, d.shopEmail].filter(Boolean).join('  ·  ');
      if (contact) {
        doc.text(contact, compX, infoY, { width: compW, lineBreak: false });
      }

      // ── Invoice type badge (top-right) ──────────────────────────────────────
      const badge = d.type === 'receipt' ? 'RECEIPT' : 'RENTAL INVOICE';
      doc.font('Helvetica-Bold').fontSize(21).fillColor(GOLD)
        .text(badge, ML, y, { width: W, align: 'right', lineBreak: false });
      doc.font('Helvetica').fontSize(9.5).fillColor(GRAY)
        .text(`#${d.refNumber}`, ML, y + 30, { width: W, align: 'right', lineBreak: false });

      y = 118;

      // ── Gold divider ─────────────────────────────────────────────────────────
      doc.rect(ML, y, W, 2.5).fillColor(GOLD).fill();
      y += 16;

      // ── Info boxes ────────────────────────────────────────────────────────────
      const HALF = (W - 14) / 2;
      const BOX_H = 90;

      // Left: Invoice details
      doc.rect(ML, y, HALF, BOX_H).fillColor(LGRAY).fill();
      doc.rect(ML, y, HALF, BOX_H).strokeColor(BORDER).lineWidth(0.5).stroke();
      doc.font('Helvetica-Bold').fontSize(7).fillColor(GOLD)
        .text('INVOICE DETAILS', ML + 12, y + 11, { lineBreak: false });

      let iy = y + 25;
      const iLine = (txt: string) => {
        doc.font('Helvetica').fontSize(9).fillColor(TEXT)
          .text(txt, ML + 12, iy, { width: HALF - 22, lineBreak: false });
        iy += 13;
      };
      iLine(`${d.type === 'receipt' ? 'Sale' : 'Booking'} #:   ${d.refNumber}`);
      iLine(`Date:   ${d.date}`);
      if (d.returnDate)    iLine(`Return:   ${d.returnDate}`);
      if (d.days)          iLine(`Duration:   ${d.days} day(s)`);
      if (d.paymentMethod) iLine(`Payment:   ${d.paymentMethod}`);
      if (d.eventType)     iLine(`Event:   ${d.eventType}`);

      // Right: Customer details
      const rx = ML + HALF + 14;
      doc.rect(rx, y, HALF, BOX_H).fillColor(LGRAY).fill();
      doc.rect(rx, y, HALF, BOX_H).strokeColor(BORDER).lineWidth(0.5).stroke();
      doc.font('Helvetica-Bold').fontSize(7).fillColor(GOLD)
        .text('BILL TO', rx + 12, y + 11, { lineBreak: false });

      let cy2 = y + 25;
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(TEXT)
        .text(d.customerName || 'Walk-in Customer', rx + 12, cy2, { width: HALF - 22, lineBreak: false });
      cy2 += 16;
      doc.font('Helvetica').fontSize(9).fillColor(GRAY);
      if (d.customerPhone) {
        doc.text(`Tel: ${d.customerPhone}`, rx + 12, cy2, { width: HALF - 22, lineBreak: false });
        cy2 += 13;
      }
      if (d.customerEmail) {
        doc.text(d.customerEmail, rx + 12, cy2, { width: HALF - 22, lineBreak: false });
      }

      y += BOX_H + 20;

      // ── Items table ───────────────────────────────────────────────────────────
      const QTY_W   = 42;
      const PRICE_W = 110;
      const TOTAL_W = 95;
      const DESC_W  = W - QTY_W - PRICE_W - TOTAL_W; // ~258

      const COL0 = ML;
      const COL1 = COL0 + DESC_W;
      const COL2 = COL1 + QTY_W;
      const COL3 = COL2 + PRICE_W;

      // Table header
      const TH = 24;
      doc.rect(ML, y, W, TH).fillColor(DARK).fill();
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(WHITE);
      doc.text('DESCRIPTION',   COL0 + 8, y + 8, { width: DESC_W - 8,  lineBreak: false });
      doc.text('QTY',           COL1,     y + 8, { width: QTY_W,        align: 'center', lineBreak: false });
      const priceHdr = d.type === 'receipt' ? 'UNIT PRICE' : 'PRICE / DAY';
      doc.text(priceHdr,        COL2,     y + 8, { width: PRICE_W,      align: 'right', lineBreak: false });
      doc.text('TOTAL',         COL3,     y + 8, { width: TOTAL_W - 8,  align: 'right', lineBreak: false });
      y += TH;

      const ROW_H = 22;
      d.items.forEach((item, i) => {
        doc.rect(ML, y, W, ROW_H).fillColor(i % 2 === 0 ? WHITE : LGRAY).fill();
        doc.font('Helvetica').fontSize(9).fillColor(TEXT);
        const nameStr = item.name.length > 44 ? item.name.slice(0, 42) + '…' : item.name;
        doc.text(nameStr,              COL0 + 8, y + 7, { width: DESC_W - 8,  lineBreak: false });
        doc.text(String(item.qty),     COL1,     y + 7, { width: QTY_W,        align: 'center', lineBreak: false });
        doc.text(fmt(item.price),      COL2,     y + 7, { width: PRICE_W,      align: 'right', lineBreak: false });
        doc.text(fmt(item.subtotal),   COL3,     y + 7, { width: TOTAL_W - 8,  align: 'right', lineBreak: false });
        y += ROW_H;
      });

      // Table border
      const tableTopY = y - (d.items.length * ROW_H) - TH;
      doc.rect(ML, tableTopY, W, TH + d.items.length * ROW_H)
        .strokeColor(BORDER).lineWidth(0.5).stroke();

      y += 18;

      // ── Totals block ──────────────────────────────────────────────────────────
      const TB_W  = 235;
      const TBX   = PGW - MR - TB_W; // left edge of totals block
      const LBL_W = 120;
      const VAL_W = TB_W - LBL_W;

      const tRow = (
        lbl: string, val: string,
        opts: { bold?: boolean; bg?: string; fg?: string; size?: number } = {}
      ) => {
        const rh   = 22;
        const bold = opts.bold ?? false;
        const size = opts.size ?? 9;
        const fg   = opts.fg ?? TEXT;
        if (opts.bg) doc.rect(TBX - 8, y - 1, TB_W + 8, rh).fillColor(opts.bg).fill();
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(fg);
        doc.text(lbl, TBX,         y + 5, { width: LBL_W,      align: 'right', lineBreak: false });
        doc.text(val, TBX + LBL_W, y + 5, { width: VAL_W - 5,  align: 'right', lineBreak: false });
        y += rh;
      };

      if (d.discount > 0 || d.tax > 0) tRow('Subtotal', fmt(d.subtotal));
      if (d.discount > 0)               tRow('Discount', `-${fmt(d.discount)}`, { fg: GREEN });
      if (d.tax > 0)                    tRow('Tax', fmt(d.tax));
      tRow('TOTAL', fmt(d.total), { bold: true, bg: DARK, fg: GOLD, size: 11 });
      if (d.paid > 0)                   tRow('Paid', fmt(d.paid));
      if ((d.change ?? 0) > 0.005)      tRow('Change', fmt(d.change!));
      const balance = d.total - (d.paid ?? 0);
      if (balance > 0.01)               tRow('Balance Due', fmt(balance), { bold: true, fg: RED });
      if ((d.fine ?? 0) > 0.005)        tRow('Late Fine', fmt(d.fine!), { fg: RED });

      // ── Notes ──────────────────────────────────────────────────────────────
      if (d.notes) {
        y += 14;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(GOLD)
          .text('NOTES', ML, y, { lineBreak: false });
        y += 14;
        doc.rect(ML, y, W * 0.55, 0.5).fillColor(BORDER).fill();
        y += 6;
        doc.font('Helvetica').fontSize(9).fillColor(GRAY)
          .text(d.notes, ML, y, { width: W * 0.55 });
        y = doc.y + 10;
      }

      // ── Footer ───────────────────────────────────────────────────────────────
      doc.rect(ML, 800, W, 1.5).fillColor(GOLD).fill();
      doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(GRAY)
        .text(
          `Thank you for choosing ${d.shopName}. We look forward to serving you again.`,
          ML, 808, { width: W, align: 'center' }
        );
      doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK)
        .text(d.shopName, ML, 823, { width: W, align: 'center' });

      doc.end();
    } catch (err) { reject(err); }
  });
}

// ─── Shop settings helper ─────────────────────────────────────────────────────
async function getShopSettings() {
  const res = await db.query(`
    SELECT key, value FROM settings
    WHERE key IN ('shop_name','shop_address','shop_phone','shop_email','shop_logo')
  `);
  const m: Record<string, string> = {};
  for (const r of res.rows) m[r.key] = r.value;
  return {
    shopName:    m['shop_name']    || 'The Outfit Lounge',
    shopAddress: m['shop_address'] || '',
    shopPhone:   m['shop_phone']   || '',
    shopEmail:   m['shop_email']   || '',
    shopLogoUrl: m['shop_logo']    || '',
  };
}

// ─── Public generators ────────────────────────────────────────────────────────
export async function generatePOSInvoicePDF(saleId: string): Promise<string> {
  const shop = await getShopSettings();

  const res = await db.query(`
    SELECT s.sale_number, s.subtotal, s.discount_amount, s.tax_amount,
           s.total_amount, s.amount_paid, s.change_amount, s.payment_method,
           s.created_at, s.notes,
           c.name  AS customer_name,
           c.phone AS customer_phone,
           c.email AS customer_email,
           si.product_name, si.variant_info, si.quantity,
           si.unit_price, si.subtotal AS item_subtotal
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    JOIN  sale_items si   ON si.sale_id = s.id
    WHERE s.id = $1
  `, [saleId]);

  if (!res.rows.length) throw new Error('Sale not found');
  const r0 = res.rows[0];
  const PAY: Record<string, string> = {
    cash: 'Cash', card: 'Card',
    mobile_payment: 'Mobile Pay', bank_transfer: 'Bank Transfer', mixed: 'Mixed',
  };

  const buffer = await buildPDF({
    type: 'receipt',
    refNumber: r0.sale_number,
    date: new Date(r0.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    paymentMethod: PAY[r0.payment_method] || r0.payment_method,
    notes: r0.notes || '',
    ...shop,
    customerName:  r0.customer_name,
    customerPhone: r0.customer_phone,
    customerEmail: r0.customer_email,
    items: res.rows.map(row => ({
      name:     row.product_name + (row.variant_info ? ` (${row.variant_info})` : ''),
      qty:      row.quantity,
      price:    parseFloat(row.unit_price),
      subtotal: parseFloat(row.item_subtotal),
    })),
    subtotal: parseFloat(r0.subtotal),
    discount: parseFloat(r0.discount_amount || '0'),
    tax:      parseFloat(r0.tax_amount || '0'),
    total:    parseFloat(r0.total_amount),
    paid:     parseFloat(r0.amount_paid),
    change:   parseFloat(r0.change_amount || '0'),
  });

  const token = uuidv4();
  store.set(token, {
    buffer,
    filename: `Receipt_${r0.sale_number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`,
    expires: Date.now() + 24 * 60 * 60 * 1000,
  });
  return token;
}

export async function generateRentalInvoicePDF(rentalId: string): Promise<string> {
  const shop = await getShopSettings();

  const res = await db.query(`
    SELECT r.booking_number, r.rental_start_date, r.rental_end_date,
           r.total_rental_cost, r.discount_amount, r.advance_payment,
           r.total_fine, r.event_type, r.notes,
           c.name  AS customer_name,
           c.phone AS customer_phone,
           c.email AS customer_email,
           p.name  AS product_name,
           pv.size, pv.color,
           ri.quantity, ri.rental_price_per_day
    FROM rentals r
    JOIN  customers c       ON c.id  = r.customer_id
    LEFT JOIN rental_items ri        ON ri.rental_id = r.id
    LEFT JOIN product_variants pv    ON pv.id = ri.product_variant_id
    LEFT JOIN products p             ON p.id  = pv.product_id
    WHERE r.id = $1
  `, [rentalId]);

  if (!res.rows.length) throw new Error('Rental not found');
  const r0 = res.rows[0];
  const start = new Date(r0.rental_start_date);
  const end   = new Date(r0.rental_end_date);
  const days  = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const fmtD  = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const buffer = await buildPDF({
    type: 'rental',
    refNumber: r0.booking_number,
    date:       fmtD(start),
    returnDate: fmtD(end),
    days,
    eventType: r0.event_type || '',
    notes:     r0.notes || '',
    ...shop,
    customerName:  r0.customer_name,
    customerPhone: r0.customer_phone,
    customerEmail: r0.customer_email,
    items: res.rows.filter(row => row.product_name).map(row => {
      const variant = [row.size, row.color].filter(Boolean).join('/');
      return {
        name:     row.product_name + (variant ? ` (${variant})` : ''),
        qty:      row.quantity,
        price:    parseFloat(row.rental_price_per_day),
        subtotal: parseFloat(row.rental_price_per_day) * row.quantity * days,
      };
    }),
    subtotal: parseFloat(r0.total_rental_cost),
    discount: parseFloat(r0.discount_amount || '0'),
    tax:      0,
    total:    parseFloat(r0.total_rental_cost) - parseFloat(r0.discount_amount || '0'),
    paid:     parseFloat(r0.advance_payment || '0'),
    fine:     parseFloat(r0.total_fine || '0'),
  });

  const token = uuidv4();
  store.set(token, {
    buffer,
    filename: `Invoice_${r0.booking_number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`,
    expires: Date.now() + 24 * 60 * 60 * 1000,
  });
  return token;
}
