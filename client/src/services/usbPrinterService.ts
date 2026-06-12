import type { ThermalReceiptData, ShopInfo } from '@/utils/thermalPrint';

const COLS = 32; // characters per line on 80mm paper

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dev: any = null;
let outEp = 1; // bulk-OUT endpoint number

// Auto-clear dev when the printer is physically unplugged
if ((navigator as any).usb) {
  (navigator as any).usb.addEventListener('disconnect', (e: any) => {
    if (dev === e.device) dev = null;
  });
}

/** Ask the user to pick a USB printer (one-time). Chrome remembers the permission. */
export async function connectUsbPrinter(): Promise<string> {
  // Release any previous device before claiming a new one
  if (dev) {
    try { await dev.close(); } catch { /* already closed */ }
    dev = null;
  }

  const d = await (navigator as any).usb.requestDevice({ filters: [] });
  await d.open();
  if (d.configuration === null) await d.selectConfiguration(1);

  // Find the bulk-OUT endpoint across all interfaces
  for (const iface of d.configuration.interfaces) {
    try {
      await d.claimInterface(iface.interfaceNumber);
      for (const ep of iface.alternates[0].endpoints) {
        if (ep.direction === 'out' && ep.type === 'bulk') {
          outEp = ep.endpointNumber;
          dev = d;
          return d.productName || 'USB Printer';
        }
      }
      await d.releaseInterface(iface.interfaceNumber);
    } catch { /* interface claimed by OS driver — try next */ }
  }
  // No bulk-OUT found but device opened — still save and try ep 1
  dev = d;
  return d.productName || 'USB Printer';
}

export async function disconnectUsbPrinter(): Promise<void> {
  if (dev) {
    try { await dev.close(); } catch { /* ignore */ }
    dev = null;
  }
}

export function isUsbConnected(): boolean {
  return dev !== null;
}

export function getReceiptPrinterName(): string {
  return dev?.productName || '';
}

/** Returns the underlying USB device — used to detect same-device conflicts. */
export function getUsbDevice(): unknown {
  return dev;
}

export async function usbPrint(receipt: ThermalReceiptData, shop: ShopInfo): Promise<void> {
  if (!dev) throw new Error('No USB printer connected');
  const data = buildESCPOS(receipt, shop);
  await dev.transferOut(outEp, data);
}

// ─── ESC/POS builder ─────────────────────────────────────────────────────────

function buildESCPOS(receipt: ThermalReceiptData, shop: ShopInfo): Uint8Array {
  const enc = new TextEncoder();
  const buf: number[] = [];

  const b   = (...bytes: number[]) => buf.push(...bytes);
  const txt = (s: string) => buf.push(...enc.encode(s));
  const nl  = () => b(0x0A);
  const hr  = (ch = '-') => { txt(ch.repeat(COLS)); nl(); };

  const money = (n: number) =>
    'LKR ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const row2 = (left: string, right: string) => {
    const l = left.substring(0, COLS - right.length - 1);
    const pad = COLS - l.length - right.length;
    txt(l + ' '.repeat(Math.max(1, pad)) + right);
    nl();
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  b(0x1B, 0x40);              // ESC @ — reset

  // ── Header ────────────────────────────────────────────────────────────────
  b(0x1B, 0x61, 0x01);       // center
  b(0x1B, 0x45, 0x01);       // bold on
  b(0x1D, 0x21, 0x11);       // 2× size
  txt(shop.name); nl();
  b(0x1D, 0x21, 0x00);       // normal size
  b(0x1B, 0x45, 0x00);       // bold off
  if (shop.address) { txt(shop.address); nl(); }
  if (shop.phone)   { txt(shop.phone);   nl(); }

  // ── Sale info ─────────────────────────────────────────────────────────────
  b(0x1B, 0x61, 0x00);       // left
  hr();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  row2('Sale #', receipt.saleNumber);
  row2('Date',   `${dateStr} ${timeStr}`);
  hr();

  // ── Items ─────────────────────────────────────────────────────────────────
  for (const item of receipt.items) {
    txt(item.productName.substring(0, COLS)); nl();
    row2(`  x${item.quantity}`, money(item.itemSubtotal));
  }
  hr();

  // ── Totals ────────────────────────────────────────────────────────────────
  row2('Subtotal', money(receipt.subtotal));
  if (receipt.promotionDiscount > 0) row2('Promotion', `-${money(receipt.promotionDiscount)}`);
  if (receipt.discountAmount     > 0) row2('Discount',  `-${money(receipt.discountAmount)}`);

  hr('=');
  b(0x1B, 0x45, 0x01); b(0x1D, 0x21, 0x11);
  row2('TOTAL', money(receipt.totalAmount));
  b(0x1D, 0x21, 0x00); b(0x1B, 0x45, 0x00);
  hr('=');

  row2('Paid', money(receipt.amountPaid));
  if (receipt.changeAmount > 0) row2('Change', money(receipt.changeAmount));

  // ── Footer ────────────────────────────────────────────────────────────────
  b(0x1B, 0x61, 0x01);       // center
  hr();
  txt('Thank you for your business!'); nl();
  txt(shop.name); nl();

  b(0x1B, 0x64, 0x05);       // feed 5 lines
  b(0x1D, 0x56, 0x41, 0x00); // partial cut

  return new Uint8Array(buf);
}
