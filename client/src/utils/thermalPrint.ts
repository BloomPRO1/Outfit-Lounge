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
}

function fmt(n: number): string {
  return 'LKR ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function row(label: string, value: string, bold = false): string {
  const s = bold ? 'font-weight:bold;font-size:10.5pt;' : '';
  return `<div style="display:flex;justify-content:space-between;align-items:baseline;${s}">
    <span>${label}</span><span style="text-align:right;">${value}</span>
  </div>`;
}

const DASH  = `<div style="border-top:1px dashed #000;margin:3mm 0;"></div>`;
const SOLID = `<div style="border-top:1.5px solid #000;margin:3mm 0;"></div>`;

export function printThermalReceipt(receipt: ThermalReceiptData, shop: ShopInfo): void {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const itemsHTML = (receipt.items || []).map(item => `
    <div style="margin-top:1.5mm;">
      <div style="font-weight:bold;">${item.productName}</div>
      ${row(`&nbsp;&nbsp;&nbsp;x${item.quantity}`, fmt(item.itemSubtotal))}
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Receipt ${receipt.saleNumber}</title>
<style>
  @page { size: 80mm auto; margin: 0mm 2mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
    width: 72mm;
    margin: 0 auto;
    padding: 3mm 0;
    color: #000;
    background: #fff;
    line-height: 1.55;
  }
  .center { text-align: center; }
</style>
</head>
<body>
  <div class="center" style="font-weight:bold;font-size:13pt;letter-spacing:0.5px;">${shop.name}</div>
  ${shop.address ? `<div class="center" style="font-size:8pt;">${shop.address}</div>` : ''}
  ${shop.phone   ? `<div class="center" style="font-size:8pt;">${shop.phone}</div>` : ''}

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

  <div class="center" style="font-size:8pt;margin-top:2mm;">Thank you for your business!</div>
  <div class="center" style="font-weight:bold;margin-top:1mm;">${shop.name}</div>
  <div style="height:12mm;"></div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=360,height=520');
  if (!win) {
    alert('Please allow pop-ups to print receipts.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}
