import logoDataUri from '@/assets/logoBase64';

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
    <img src="${logoSrc}" style="max-width:22mm;max-height:22mm;object-fit:contain;"
         onerror="this.style.display='none'" />
  </div>
  <div class="c b" style="font-size:11pt;letter-spacing:0.5px;">${shop.name}</div>
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
  <div class="c b" style="font-size:8.5pt;margin-top:1mm;">${shop.name}</div>
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
  rentalStartDate: string;   // ISO date string
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
}

export function buildRentalReceiptHTML(data: RentalReceiptData, shop: ShopInfo): string {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const logoSrc = shop.logoUrl || logoDataUri;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const start = new Date(data.rentalStartDate);
  const end   = new Date(data.rentalEndDate);
  const days  = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

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
    <img src="${logoSrc}" style="max-width:22mm;max-height:22mm;object-fit:contain;"
         onerror="this.style.display='none'" />
  </div>
  <div class="c b" style="font-size:11pt;letter-spacing:0.5px;">${shop.name}</div>
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
  <div class="c b" style="font-size:9pt;">${shop.name}</div>
  <div style="height:8mm;"></div>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prints receipt by injecting it off-screen into the main page then calling
 * window.print(). Styles are fully scoped to #__receipt_print so they don't
 * pollute the main app (which would make Chrome think the page is empty).
 */
export function printViaIframe(html: string): void {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');

  // Scoped styles — ONLY apply inside #__receipt_print, never to main page
  const printStyle = document.createElement('style');
  printStyle.textContent = `
    @media print {
      @page { size: 80mm auto; margin: 2mm 3mm; }
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

  setTimeout(() => window.print(), 150);
  setTimeout(() => { printStyle.remove(); container.remove(); }, 30_000);
}
