import type { BarcodeItem } from '@/components/common/BarcodePrintModal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dev: any = null;
let outEp = 1;

/** Ask the user to pick the USB label printer (one-time). Chrome remembers the permission. */
export async function connectLabelPrinter(): Promise<string> {
  const d = await (navigator as any).usb.requestDevice({ filters: [] });
  await d.open();
  if (d.configuration === null) await d.selectConfiguration(1);

  for (const iface of d.configuration.interfaces) {
    try {
      await d.claimInterface(iface.interfaceNumber);
      for (const ep of iface.alternates[0].endpoints) {
        if (ep.direction === 'out' && ep.type === 'bulk') {
          outEp = ep.endpointNumber;
          dev = d;
          return d.productName || 'USB Label Printer';
        }
      }
      await d.releaseInterface(iface.interfaceNumber);
    } catch { /* interface claimed by OS driver — try next */ }
  }
  dev = d;
  return d.productName || 'USB Label Printer';
}

export function isLabelConnected(): boolean {
  return dev !== null;
}

export function getLabelPrinterName(): string {
  return dev?.productName || '';
}

/** Send TSPL label commands directly to the printer — zero dialogs. */
export async function tsplPrint(item: BarcodeItem, copies: number): Promise<void> {
  if (!dev) throw new Error('No label printer connected');
  const data = buildTSPL(item, copies);
  await dev.transferOut(outEp, data);
}

// ─── TSPL builder ────────────────────────────────────────────────────────────
// Targets 203 DPI thermal label printers (8 dots/mm).
// Label: 40 mm × 46 mm = 320 × 368 dots.

function buildTSPL(item: BarcodeItem, copies: number): Uint8Array {
  const enc = new TextEncoder();
  const lines: string[] = [];

  const W = 40;   // label width  mm
  const H = 46;   // label height mm

  lines.push(`SIZE ${W} mm,${H} mm`);
  lines.push('GAP 2 mm,0 mm');
  lines.push('DIRECTION 0,0');
  lines.push('REFERENCE 0,0');
  lines.push('CLS');

  // Product name — font "2" (~12×20 dots), trim to fit 40mm (≈20 chars)
  const name = item.productName.substring(0, 20);
  lines.push(`TEXT 5,5,"2",0,1,1,"${esc(name)}"`);

  // Optional variant line — font "1" (~8×12 dots)
  const variant = [item.size, item.color].filter(Boolean).join(' / ');
  const barcodeY = variant ? 50 : 32;
  if (variant) {
    lines.push(`TEXT 5,32,"1",0,1,1,"${esc(variant)}"`);
  }

  // Barcode CODE128, height 100 dots, human-readable below
  lines.push(`BARCODE 5,${barcodeY},"128",100,1,0,2,2,"${esc(item.sku)}"`);

  // Price — font "1", below barcode body + HRI clearance
  if (item.price) {
    const priceY = barcodeY + 100 + 24;
    const priceStr = `LKR ${Number(item.price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
    lines.push(`TEXT 5,${priceY},"2",0,1,1,"${esc(priceStr)}"`);
  }

  lines.push(`PRINT ${copies},1`);

  return enc.encode(lines.join('\r\n') + '\r\n');
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
