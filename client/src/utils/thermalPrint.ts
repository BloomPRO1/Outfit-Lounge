import logoDataUri from '@/assets/receiptLogoBase64';

export interface ThermalReceiptData {
  saleNumber: string;
  items: Array<{ productName: string; quantity: number; itemSubtotal: number }>;
  subtotal: number;
  promotionDiscount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  changeAmount: number;
}

export interface ShopInfo {
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
}

function fmt(n: number): string {
  return 'LKR ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function row(label: string, value: string, bold = false): string {
  const s = bold ? 'font-weight:bold;font-size:11pt;' : '';
  return `<div style="display:flex;justify-content:space-between;align-items:baseline;${s}">
            <span>${label}</span><span>${value}</span>
          </div>`;
}

const DASH  = `<div style="border-top:1px dashed #000;margin:2.5mm 0;"></div>`;
const SOLID = `<div style="border-top:1.5px solid #000;margin:2.5mm 0;"></div>`;

/** Builds the receipt as a standalone HTML string (used by both QZ Tray and iframe fallback). */
export function buildReceiptHTML(receipt: ThermalReceiptData, shop: ShopInfo): string {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  // Use embedded base64 logo (works in print iframe without any network request)
  const logoSrc = shop.logoUrl || logoDataUri;

  const itemsHTML = (receipt.items || []).map(item => `
    <div style="margin-bottom:2mm;">
      <div style="font-weight:700;">${item.productName}</div>
      <div style="display:flex;justify-content:space-between;color:#333;font-size:9pt;">
        <span>x${item.quantity}</span><span style="color:#111;font-weight:600;">${fmt(item.itemSubtotal)}</span>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: 80mm auto; margin: 2mm 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 9.5pt;
    font-weight: 500;
    width: 72mm;
    margin: 0 auto;
    color: #111;
    background: #fff;
    line-height: 1.6;
  }
  .c  { text-align: center; }
  .b  { font-weight: 700; }
  .sm { font-size: 8.5pt; color: #333; }
  .row { display: flex; justify-content: space-between; align-items: baseline; }
  .dash  { border-top: 1px dashed #999; margin: 2.5mm 0; }
  .solid { border-top: 1.5px solid #111; margin: 2.5mm 0; }
  .total-row {
    display: flex; justify-content: space-between; align-items: baseline;
    font-size: 11pt; font-weight: 700; letter-spacing: 0.2px;
    padding: 1mm 0;
  }
</style>
</head>
<body>

  <div class="c" style="margin-bottom:2.5mm;">
    <img src="${logoSrc}" style="max-width:52mm;max-height:52mm;object-fit:contain;display:block;margin:0 auto;"
         onerror="this.style.display='none'" />
  </div>
  <div class="c b" style="font-size:11pt;letter-spacing:0.5px;">${shop.name.toUpperCase()}</div>
  ${shop.address ? `<div class="c sm" style="margin-top:0.5mm;">${shop.address}</div>` : ''}
  ${shop.phone   ? `<div class="c sm">${shop.phone}</div>` : ''}

  <div class="dash" style="margin-top:3mm;"></div>

  <div class="row"><span class="sm">Sale #</span><span class="b" style="font-size:8pt;">${receipt.saleNumber}</span></div>
  <div class="row"><span class="sm">Date</span><span class="sm">${dateStr} &nbsp; ${timeStr}</span></div>

  <div class="dash"></div>

  ${itemsHTML}

  <div class="dash"></div>

  <div class="row"><span class="sm">Subtotal</span><span>${fmt(receipt.subtotal)}</span></div>
  ${receipt.promotionDiscount > 0 ? `<div class="row"><span class="sm">Promotion</span><span>- ${fmt(receipt.promotionDiscount)}</span></div>` : ''}
  ${receipt.discountAmount     > 0 ? `<div class="row"><span class="sm">Discount</span><span>- ${fmt(receipt.discountAmount)}</span></div>`     : ''}

  <div class="solid"></div>
  <div class="total-row"><span>TOTAL</span><span>${fmt(receipt.totalAmount)}</span></div>
  <div class="solid"></div>

  <div class="row"><span class="sm">Paid</span><span>${fmt(receipt.amountPaid)}</span></div>
  ${receipt.changeAmount > 0 ? `<div class="row"><span class="sm">Change</span><span>${fmt(receipt.changeAmount)}</span></div>` : ''}

  <div class="dash"></div>

  <div class="c sm" style="margin-top:1.5mm;">Thank you for your business!</div>
  <div class="c b" style="font-size:8.5pt;margin-top:1mm;">${shop.name.toUpperCase()}</div>

  <div class="dash" style="margin-top:3mm;"></div>
  <div class="c" style="font-size:7.5pt;color:#666;margin-top:1mm;">Powered by <span style="font-weight:700;color:#444;">Bloomtech.lk</span></div>
  <div class="c" style="font-size:7.5pt;color:#666;">0779 160 704</div>
  <div style="height:8mm;"></div>

</body>
</html>`;
}

// ─── Rental Receipt ──────────────────────────────────────────────────────────

export interface RentalReceiptData {
  bookingNumber: string;
  customerName: string;
  customerPhone?: string;
  eventType?: string;
  rentalStartDate: string;   // ISO date string (pickup — not billed)
  eventDate?: string;        // billing starts from here
  rentalEndDate: string;
  items: Array<{
    productName: string;
    variant?: string;
    quantity: number;
    pricePerDay: number;
  }>;
  totalRentalCost: number;
  discountAmount: number;
  totalPaid: number;
  balanceDue: number;
  totalFine: number;
  notes?: string;
  securityType?: 'deposit' | 'id_card';
  securityDeposit?: number;
  securityIdNumber?: string;
}

export function buildRentalReceiptHTML(data: RentalReceiptData, shop: ShopInfo): string {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const logoSrc = shop.logoUrl || logoDataUri;

  const parseLocalDate = (iso: string) => {
    const [y, m, d] = iso.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const fmtDate = (iso: string) =>
    parseLocalDate(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const billingStart = parseLocalDate(data.eventDate || data.rentalStartDate);
  const end          = parseLocalDate(data.rentalEndDate);
  const days         = Math.max(1, Math.ceil((end.getTime() - billingStart.getTime()) / (1000 * 60 * 60 * 24)));

  const itemsHTML = data.items.map(item => {
    const total = item.pricePerDay * item.quantity * days;
    return `
    <div style="margin-bottom:2.5mm;">
      <div style="font-weight:700;">${item.productName}</div>
      ${item.variant ? `<div style="font-size:8.5pt;color:#444;">${item.variant}</div>` : ''}
      <div style="display:flex;justify-content:space-between;font-size:8.5pt;color:#333;">
        <span>×${item.quantity} × ${days}d @ ${fmt(item.pricePerDay)}/d</span>
        <span style="color:#111;font-weight:600;">${fmt(total)}</span>
      </div>
    </div>`;
  }).join('');

  const netTotal = data.totalRentalCost - data.discountAmount;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: 80mm auto; margin: 2mm 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 9.5pt; font-weight: 500;
    width: 72mm; margin: 0 auto;
    color: #111; background: #fff; line-height: 1.6;
  }
  .c   { text-align: center; }
  .b   { font-weight: 700; }
  .sm  { font-size: 8.5pt; color: #333; }
  .row { display: flex; justify-content: space-between; align-items: baseline; }
  .dash  { border-top: 1px dashed #999; margin: 2.5mm 0; }
  .solid { border-top: 1.5px solid #111; margin: 2.5mm 0; }
  .total-row {
    display: flex; justify-content: space-between; align-items: baseline;
    font-size: 11pt; font-weight: 700; padding: 1mm 0;
  }
</style>
</head>
<body>

  <div class="c" style="margin-bottom:2mm;">
    <img src="${logoSrc}" style="max-width:52mm;max-height:52mm;object-fit:contain;display:block;margin:0 auto;"
         onerror="this.style.display='none'" />
  </div>
  <div class="c b" style="font-size:11pt;letter-spacing:0.5px;">${shop.name.toUpperCase()}</div>
  ${shop.address ? `<div class="c sm">${shop.address}</div>` : ''}
  ${shop.phone   ? `<div class="c sm">${shop.phone}</div>` : ''}

  <div class="dash" style="margin-top:3mm;"></div>
  <div class="c b" style="font-size:10pt;letter-spacing:1px;">RENTAL RECEIPT</div>
  <div class="dash"></div>

  <div class="row"><span class="sm">Booking #</span><span class="b" style="font-size:8.5pt;">${data.bookingNumber}</span></div>
  <div class="row"><span class="sm">Printed</span><span class="sm">${dateStr} &nbsp; ${timeStr}</span></div>

  <div class="dash"></div>

  <div class="row"><span class="sm">Customer</span><span class="b" style="font-size:9pt;">${data.customerName}</span></div>
  ${data.customerPhone ? `<div class="row"><span class="sm">Phone</span><span class="sm">${data.customerPhone}</span></div>` : ''}
  ${data.eventType     ? `<div class="row"><span class="sm">Event</span><span class="sm">${data.eventType}</span></div>` : ''}
  ${data.securityType === 'deposit' && data.securityDeposit ? `<div class="row"><span class="sm">Security Deposit</span><span class="b">${fmt(data.securityDeposit)}</span></div>` : ''}
  ${data.securityType === 'id_card' && data.securityIdNumber ? `<div class="row"><span class="sm">ID Card Held</span><span class="b">${data.securityIdNumber}</span></div>` : ''}

  <div class="dash"></div>

  <div class="row"><span class="sm">Pickup</span><span class="b" style="font-size:9pt;">${fmtDate(data.rentalStartDate)}</span></div>
  <div class="row"><span class="sm">Return</span><span class="b" style="font-size:9pt;">${fmtDate(data.rentalEndDate)}</span></div>
  <div class="row"><span class="sm">Duration</span><span class="sm">${days} day${days !== 1 ? 's' : ''}</span></div>

  <div class="dash"></div>

  ${itemsHTML}

  <div class="dash"></div>

  <div class="row"><span class="sm">Rental Total</span><span>${fmt(data.totalRentalCost)}</span></div>
  ${data.discountAmount > 0 ? `<div class="row"><span class="sm">Discount</span><span>- ${fmt(data.discountAmount)}</span></div>` : ''}

  <div class="solid"></div>
  <div class="total-row"><span>NET TOTAL</span><span>${fmt(netTotal)}</span></div>
  <div class="solid"></div>

  <div class="row"><span class="sm">Total Paid</span><span>${fmt(data.totalPaid)}</span></div>
  ${data.balanceDue > 0 ? `
  <div class="dash"></div>
  <div class="total-row" style="font-size:10pt;"><span>BALANCE DUE</span><span>${fmt(data.balanceDue)}</span></div>` : `
  <div class="row"><span class="sm" style="color:#008800;">Fully Paid</span><span style="color:#008800;">✓</span></div>`}

  ${data.totalFine > 0 ? `
  <div class="dash"></div>
  <div class="row"><span class="sm" style="color:#c00;">Late Fine</span><span style="color:#c00;">${fmt(data.totalFine)}</span></div>` : ''}

  ${data.notes ? `
  <div class="dash"></div>
  <div class="sm" style="font-style:italic;">Note: ${data.notes}</div>` : ''}

  <div class="dash" style="margin-top:3mm;"></div>
  <div class="c sm">Thank you for choosing</div>
  <div class="c b" style="font-size:9pt;">${shop.name.toUpperCase()}</div>

  <div class="dash" style="margin-top:3mm;"></div>
  <div class="c" style="font-size:7.5pt;color:#666;margin-top:1mm;">Powered by <span style="font-weight:700;color:#444;">Bloomtech.lk</span></div>
  <div class="c" style="font-size:7.5pt;color:#666;">0779 160 704</div>
  <div style="height:8mm;"></div>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────

/** Leak guard only — deliberately far longer than anyone keeps a print dialog open. */
const PRINT_CLEANUP_FALLBACK_MS = 10 * 60 * 1000;

/** Tears down the receipt job currently on screen, if any. */
let disposeActiveReceipt: (() => void) | null = null;

/**
 * Prints receipt by injecting it off-screen into the main page then calling
 * window.print(). Styles are fully scoped to #__receipt_print so they don't
 * pollute the main app (which would make Chrome think the page is empty).
 *
 * Cleanup is driven by the `afterprint` event rather than a fixed timer. The
 * old code removed the nodes 30s after injecting them regardless of what the
 * user was doing, so anyone who spent longer than that in the Windows print
 * dialog got a blank page — the receipt had already been deleted underneath
 * them. A second click inside that window also appended a duplicate node with
 * the same id, and the print CSS matched both, so two receipts came out.
 */
export function printViaIframe(html: string): void {
  // Retire the previous job before injecting a new one — never two at once.
  disposeActiveReceipt?.();

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');

  // Scoped styles — ONLY apply inside #__receipt_print, never to main page
  const printStyle = document.createElement('style');
  printStyle.textContent = `
    @media print {
      @page { size: 80mm auto; margin: 2mm 3mm; }
      /* The receipt drawer pins body{overflow:hidden} while it is open, which
         makes Chrome clip the print to one viewport and emit a blank page.
         !important in a stylesheet outranks a non-important inline style. */
      html, body {
        overflow: visible !important;
        height: auto !important;
      }
      body > *:not(#__receipt_print) { display: none !important; }
      #__receipt_print {
        position: static !important;
        left: auto !important;
        display: block !important;
        width: 72mm !important;
        margin: 0 auto !important;
      }
    }
    /* Off-screen but rendered — Chrome sees content and won't auto-cancel */
    #__receipt_print {
      position: fixed; left: -9999px; top: 0;
      width: 72mm; background: #fff;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 9.5pt; font-weight: 500;
      color: #111; line-height: 1.6;
    }
    #__receipt_print * { box-sizing: border-box; margin: 0; padding: 0; }
    #__receipt_print .c  { text-align: center; }
    #__receipt_print .b  { font-weight: 700; }
    #__receipt_print .sm { font-size: 8.5pt; color: #333; }
    #__receipt_print .row { display: flex; justify-content: space-between; align-items: baseline; }
    #__receipt_print .dash  { border-top: 1px dashed #999; margin: 2.5mm 0; }
    #__receipt_print .solid { border-top: 1.5px solid #111; margin: 2.5mm 0; }
    #__receipt_print .total-row {
      display: flex; justify-content: space-between; align-items: baseline;
      font-size: 11pt; font-weight: 700; padding: 1mm 0;
    }
  `;

  const container = document.createElement('div');
  container.id = '__receipt_print';
  container.innerHTML = parsed.body.innerHTML;

  document.head.appendChild(printStyle);
  document.body.appendChild(container);

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(fallbackTimer);
    window.removeEventListener('afterprint', dispose);
    printStyle.remove();
    container.remove();
    if (disposeActiveReceipt === dispose) disposeActiveReceipt = null;
  };

  const fallbackTimer = setTimeout(dispose, PRINT_CLEANUP_FALLBACK_MS);
  window.addEventListener('afterprint', dispose);
  disposeActiveReceipt = dispose;

  // Small delay so the injected nodes are laid out before the dialog opens.
  setTimeout(() => {
    try {
      window.print();
    } catch {
      dispose(); // dialog blocked — don't strand the nodes in the DOM
    }
  }, 150);
}

/**
 * Prints a complete HTML document in a hidden same-origin iframe.
 *
 * Used where the document carries its own `@page` rules (barcode labels), and
 * as the fallback when a popup blocker kills `window.open`. Unlike a popup this
 * needs no user permission and cannot leave an orphan window behind.
 */
export function printHTMLInIframe(html: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  // Positioned off-screen at a real size — `display:none` or a 0×0 box makes
  // Chrome print a blank page.
  frame.style.cssText =
    'position:fixed;left:-10000px;top:0;width:100mm;height:150mm;border:0;opacity:0;';
  frame.srcdoc = html;

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(fallbackTimer);
    frame.remove();
  };
  const fallbackTimer = setTimeout(dispose, PRINT_CLEANUP_FALLBACK_MS);

  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) { dispose(); return; }
    win.addEventListener('afterprint', dispose, { once: true });
    // Give the barcode SVG a frame to lay out before the dialog opens.
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        dispose();
      }
    }, 250);
  };

  document.body.appendChild(frame);
}
