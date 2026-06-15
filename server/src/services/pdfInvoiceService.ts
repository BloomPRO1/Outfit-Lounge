import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import { env } from '../config/env';
import path from 'path';
import fs from 'fs';
import { logoBuffer as embeddedLogo } from '../assets/logoBuffer';

// ─── Disk storage for persistent invoice PDFs ────────────────────────────────
function getInvoiceDir(): string {
  const dir = path.join(process.cwd(), env.UPLOAD_DIR, 'invoices');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveInvoiceToDisk(buffer: Buffer, filename: string): string {
  fs.writeFileSync(path.join(getInvoiceDir(), filename), buffer);
  return `invoices/${filename}`;
}

export function loadInvoiceFromDisk(relativePath: string): Buffer | null {
  try {
    const fullPath = path.join(process.cwd(), env.UPLOAD_DIR, relativePath);
    if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath);
  } catch {}
  return null;
}

// ─── In-memory invoice store (24h TTL) ────────────────────────────────────────
interface InvoiceEntry { buffer: Buffer; filename: string; expires: number; filePath?: string; }
const store = new Map<string, InvoiceEntry>();

export function getStoredInvoice(token: string): InvoiceEntry | null {
  const entry = store.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expires) { store.delete(token); return null; }
  return entry;
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
  total: number; paid: number; change?: number; fine?: number; damageCharges?: number;
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

      const BLACK  = '#000000';
      const DKGRAY = '#333333';
      const GRAY   = '#666666';
      const LTGRAY = '#cccccc';

      const PGW = 595;
      const ML = 50; const MR = 50; const W = PGW - ML - MR;

      let y = 40;

      // ── Logo ───────────────────────────────────────────────────────────────
      const LOGO_SIZE = 64;
      try {
        doc.image(embeddedLogo, Math.round((PGW - LOGO_SIZE) / 2), y, { fit: [LOGO_SIZE, LOGO_SIZE] });
        y += LOGO_SIZE + 10;
      } catch { /* skip if image fails */ }

      // ── Shop name & contact ────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(22).fillColor(BLACK)
        .text(d.shopName.toUpperCase(), ML, y, { width: W, align: 'center', lineBreak: false });
      y += 28;

      if (d.shopAddress) {
        doc.font('Helvetica').fontSize(9).fillColor(GRAY)
          .text(d.shopAddress, ML, y, { width: W, align: 'center', lineBreak: false });
        y += 13;
      }
      const contact = [d.shopPhone, d.shopEmail].filter(Boolean).join('   |   ');
      if (contact) {
        doc.font('Helvetica').fontSize(9).fillColor(GRAY)
          .text(contact, ML, y, { width: W, align: 'center', lineBreak: false });
        y += 13;
      }

      y += 6;
      doc.rect(ML, y, W, 1).fillColor(BLACK).fill();
      y += 10;

      // ── Document type ──────────────────────────────────────────────────────
      const title = d.type === 'receipt' ? 'RECEIPT' : 'RENTAL INVOICE';
      doc.font('Helvetica-Bold').fontSize(13).fillColor(BLACK)
        .text(title, ML, y, { width: W, align: 'center', lineBreak: false });
      y += 18;
      doc.rect(ML, y, W, 0.5).fillColor(LTGRAY).fill();
      y += 14;

      // ── Invoice meta (2-column) ────────────────────────────────────────────
      const HALF = (W - 20) / 2;

      const metaLeft = (label: string, value: string, my: number) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY)
          .text(label, ML, my, { width: 85, lineBreak: false });
        doc.font('Helvetica').fontSize(8.5).fillColor(BLACK)
          .text(value, ML + 90, my, { width: HALF - 95, lineBreak: false });
      };

      const metaRight = (label: string, value: string, my: number) => {
        const rx = ML + HALF + 20;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY)
          .text(label, rx, my, { width: 85, lineBreak: false });
        doc.font('Helvetica').fontSize(8.5).fillColor(BLACK)
          .text(value, rx + 90, my, { width: HALF - 95, lineBreak: false });
      };

      const metaStartY = y;
      let lmy = metaStartY;
      metaLeft(d.type === 'receipt' ? 'Sale No.' : 'Booking No.', d.refNumber, lmy); lmy += 14;
      metaLeft('Date', d.date, lmy); lmy += 14;
      if (d.returnDate)    { metaLeft('Return Date', d.returnDate, lmy); lmy += 14; }
      if (d.days)          { metaLeft('Duration', `${d.days} day(s)`, lmy); lmy += 14; }
      if (d.paymentMethod) { metaLeft('Payment', d.paymentMethod, lmy); lmy += 14; }
      if (d.eventType)     { metaLeft('Event', d.eventType, lmy); lmy += 14; }

      let rmy = metaStartY;
      metaRight('Customer', d.customerName || 'Walk-in', rmy); rmy += 14;
      if (d.customerPhone) { metaRight('Tel', d.customerPhone, rmy); rmy += 14; }
      if (d.customerEmail) { metaRight('Email', d.customerEmail, rmy); rmy += 14; }

      y = Math.max(lmy, rmy) + 12;
      doc.rect(ML, y, W, 0.5).fillColor(LTGRAY).fill();
      y += 14;

      // ── Items table ────────────────────────────────────────────────────────
      const QTY_W   = 36;
      const PRICE_W = 110;
      const TOTAL_W = 110;
      const DESC_W  = W - QTY_W - PRICE_W - TOTAL_W;
      const COL0 = ML;
      const COL1 = COL0 + DESC_W;
      const COL2 = COL1 + QTY_W;
      const COL3 = COL2 + PRICE_W;

      doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK);
      doc.text('DESCRIPTION', COL0, y, { width: DESC_W,  lineBreak: false });
      doc.text('QTY',         COL1, y, { width: QTY_W,   align: 'center', lineBreak: false });
      const priceHdr = d.type === 'receipt' ? 'UNIT PRICE' : 'PRICE/DAY';
      doc.text(priceHdr,      COL2, y, { width: PRICE_W, align: 'right',  lineBreak: false });
      doc.text('AMOUNT',      COL3, y, { width: TOTAL_W, align: 'right',  lineBreak: false });
      y += 11;
      doc.rect(ML, y, W, 1).fillColor(BLACK).fill();
      y += 8;

      const ROW_H = 20;
      d.items.forEach(item => {
        const nameStr = item.name.length > 50 ? item.name.slice(0, 48) + '…' : item.name;
        doc.font('Helvetica').fontSize(8.5).fillColor(BLACK)
          .text(nameStr,           COL0, y, { width: DESC_W,  lineBreak: false });
        doc.font('Helvetica').fontSize(8.5).fillColor(DKGRAY)
          .text(String(item.qty),  COL1, y, { width: QTY_W,   align: 'center', lineBreak: false });
        doc.font('Helvetica').fontSize(8.5).fillColor(DKGRAY)
          .text(fmt(item.price),   COL2, y, { width: PRICE_W, align: 'right',  lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK)
          .text(fmt(item.subtotal), COL3, y, { width: TOTAL_W, align: 'right', lineBreak: false });
        y += ROW_H;
      });

      doc.rect(ML, y, W, 0.5).fillColor(BLACK).fill();
      y += 14;

      // ── Totals ─────────────────────────────────────────────────────────────
      const TB_W  = 230;
      const TBX   = ML + W - TB_W;
      const LBL_W = 120;
      const VAL_W = TB_W - LBL_W;

      const totalsStartY = y;
      const tRow = (lbl: string, val: string, bold = false, lineAbove = false) => {
        const rh = 18;
        if (lineAbove) doc.rect(TBX, y, TB_W, 0.5).fillColor(LTGRAY).fill();
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 9).fillColor(BLACK);
        doc.text(lbl, TBX,         y + 3, { width: LBL_W, align: 'right', lineBreak: false });
        doc.text(val, TBX + LBL_W, y + 3, { width: VAL_W, align: 'right', lineBreak: false });
        y += rh;
      };

      if (d.discount > 0 || d.tax > 0) tRow('Subtotal', fmt(d.subtotal));
      if (d.discount > 0)               tRow('Discount', `- ${fmt(d.discount)}`);
      if (d.tax > 0)                    tRow('Tax', fmt(d.tax));
      tRow('TOTAL', fmt(d.total), true, true);
      if (d.paid > 0)              tRow('Amount Paid', fmt(d.paid), false, true);
      if ((d.change ?? 0) > 0.005) tRow('Change', fmt(d.change!));
      const balance = d.total - (d.paid ?? 0);
      if (balance > 0.01)          tRow('Balance Due', fmt(balance), true, true);
      if ((d.fine ?? 0) > 0.005)   tRow('Late Fine', fmt(d.fine!));
      if ((d.damageCharges ?? 0) > 0.005) tRow('Damage / Lost', fmt(d.damageCharges!));

      doc.rect(TBX, totalsStartY, TB_W, y - totalsStartY).strokeColor(LTGRAY).lineWidth(0.5).stroke();

      // ── Notes ──────────────────────────────────────────────────────────────
      if (d.notes) {
        const noteY = totalsStartY;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY)
          .text('Notes:', ML, noteY, { lineBreak: false });
        doc.font('Helvetica').fontSize(8.5).fillColor(BLACK)
          .text(d.notes, ML, noteY + 13, { width: TBX - ML - 16 });
      }

      y += 20;
      doc.rect(ML, y, W, 0.5).fillColor(LTGRAY).fill();
      y += 12;

      // ── Footer ─────────────────────────────────────────────────────────────
      doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(GRAY)
        .text(`Thank you for choosing ${d.shopName}.`, ML, y, { width: W, align: 'center', lineBreak: false });
      y += 13;
      doc.font('Helvetica').fontSize(7).fillColor(LTGRAY)
        .text('Powered by Bloomtech.lk  ·  0779 160 704', ML, y, { width: W, align: 'center', lineBreak: false });

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
  // Return cached disk copy if already stored
  try {
    const cached = await db.query('SELECT invoice_pdf_path FROM sales WHERE id = $1', [saleId]);
    const existingPath: string | null = cached.rows[0]?.invoice_pdf_path || null;
    if (existingPath) {
      const diskBuffer = loadInvoiceFromDisk(existingPath);
      if (diskBuffer) {
        const token = uuidv4();
        store.set(token, {
          buffer: diskBuffer,
          filename: path.basename(existingPath),
          expires: Date.now() + 24 * 60 * 60 * 1000,
          filePath: existingPath,
        });
        return token;
      }
    }
  } catch { /* column may not exist yet during migration */ }

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

  const filename = `Receipt_${r0.sale_number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
  let filePath: string | undefined;
  try {
    filePath = saveInvoiceToDisk(buffer, filename);
    await db.query('UPDATE sales SET invoice_pdf_path = $1 WHERE id = $2', [filePath, saleId]);
  } catch (err) {
    console.error('[PDF] Failed to persist to disk:', err);
  }

  const token = uuidv4();
  store.set(token, { buffer, filename, expires: Date.now() + 24 * 60 * 60 * 1000, filePath });
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

  const dmgRes = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE rental_id = $1 AND payment_type = 'damage_charge'`,
    [rentalId]
  );
  const damageCharges = parseFloat(dmgRes.rows[0].total || '0');

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
    paid:          parseFloat(r0.advance_payment || '0'),
    fine:          parseFloat(r0.total_fine || '0'),
    damageCharges: damageCharges > 0 ? damageCharges : undefined,
  });

  const filename = `Invoice_${r0.booking_number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
  let filePath: string | undefined;
  try {
    filePath = saveInvoiceToDisk(buffer, filename);
  } catch (err) {
    console.error('[PDF] Failed to persist rental invoice to disk:', err);
  }

  const token = uuidv4();
  store.set(token, { buffer, filename, expires: Date.now() + 24 * 60 * 60 * 1000, filePath });
  return token;
}
