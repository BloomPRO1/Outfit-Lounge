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
  const logoSrc = shop.logoUrl || `${window.location.origin}/logo.jpg`;

  const itemsHTML = (receipt.items || []).map(item => `
    <div style="margin-top:1.5mm;">
      <div style="font-weight:bold;">${item.productName}</div>
      ${row(`&nbsp;&nbsp;x${item.quantity}`, fmt(item.itemSubtotal))}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: 80mm auto; margin: 3mm 2mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
    width: 72mm;
    margin: 0 auto;
    color: #000;
    background: #fff;
    line-height: 1.55;
  }
  .c { text-align: center; }
</style>
</head>
<body>
  <div class="c" style="margin-bottom:2mm;">
    <img src="${logoSrc}" style="max-width:28mm;max-height:18mm;object-fit:contain;"
         onerror="this.style.display='none'" />
  </div>
  <div class="c" style="font-weight:bold;font-size:12pt;letter-spacing:0.3px;">${shop.name}</div>
  ${shop.address ? `<div class="c" style="font-size:8pt;">${shop.address}</div>` : ''}
  ${shop.phone   ? `<div class="c" style="font-size:8pt;">${shop.phone}</div>`   : ''}
  ${DASH}
  ${row('Sale #:', receipt.saleNumber)}
  ${row('Date:',   `${dateStr} ${timeStr}`)}
  ${DASH}
  ${itemsHTML}
  ${DASH}
  ${row('Subtotal', fmt(receipt.subtotal))}
  ${receipt.promotionDiscount > 0 ? row('Promotion', '- ' + fmt(receipt.promotionDiscount)) : ''}
  ${receipt.discountAmount     > 0 ? row('Discount',  '- ' + fmt(receipt.discountAmount))     : ''}
  ${SOLID}
  ${row('TOTAL', fmt(receipt.totalAmount), true)}
  ${SOLID}
  ${row('Paid',   fmt(receipt.amountPaid))}
  ${receipt.changeAmount > 0 ? row('Change', fmt(receipt.changeAmount)) : ''}
  ${DASH}
  <div class="c" style="font-size:8pt;margin-top:2mm;">Thank you for your business!</div>
  <div class="c" style="font-weight:bold;margin-top:1mm;">${shop.name}</div>
  <div style="height:10mm;"></div>
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
