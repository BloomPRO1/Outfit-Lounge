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
      <div style="font-weight:500;">${item.productName}</div>
      <div style="display:flex;justify-content:space-between;color:#444;font-size:8pt;">
        <span>x${item.quantity}</span><span style="color:#111;font-weight:600;">${fmt(item.itemSubtotal)}</span>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
  @page { size: 80mm auto; margin: 2mm 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Roboto', Arial, sans-serif;
    font-size: 8.5pt;
    width: 72mm;
    margin: 0 auto;
    color: #111;
    background: #fff;
    line-height: 1.5;
  }
  .c  { text-align: center; }
  .b  { font-weight: 700; }
  .sm { font-size: 7.5pt; color: #444; }
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

/** Fallback: prints using a hidden iframe (shows system print dialog). */
export function printViaIframe(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;border:none;visibility:hidden;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 2000);
  }, 400);
}
