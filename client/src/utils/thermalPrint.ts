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

/**
 * Prints receipt using the main window's window.print() — the only method
 * that works reliably with Chrome's --kiosk-printing flag.
 * Temporarily injects receipt content + styles into the page, hides everything
 * else via @media print CSS, prints, then cleans up.
 */
export function printViaIframe(html: string): void {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');

  // Pull the receipt's CSS (strip @import to avoid network delays)
  const receiptCSS = Array.from(parsed.querySelectorAll('style'))
    .map(s => s.textContent ?? '')
    .join('\n')
    .replace(/@import[^;]+;/g, '');

  // Style: during print, hide all app content; show only the receipt div
  const printStyle = document.createElement('style');
  printStyle.textContent = `
    @media print {
      body > *:not(#__receipt_print) { display: none !important; }
      #__receipt_print { display: block !important; }
    }
    #__receipt_print { display: none; }
    ${receiptCSS}
  `;

  const container = document.createElement('div');
  container.id = '__receipt_print';
  container.innerHTML = parsed.body.innerHTML;

  document.head.appendChild(printStyle);
  document.body.appendChild(container);

  const cleanup = () => {
    printStyle.remove();
    container.remove();
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(cleanup, 10_000); // safety net

  setTimeout(() => window.print(), 100);
}
