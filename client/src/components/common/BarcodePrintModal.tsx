import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, Usb } from 'lucide-react';
import { toast } from 'sonner';
import Button from './Button';
import Drawer from './Drawer';
import { connectLabelPrinter, isLabelConnected, getLabelPrinterName, tsplPrint } from '@/services/labelPrinterService';

export interface BarcodeItem {
  sku: string;
  productName: string;
  size?: string;
  color?: string;
  price?: number | string;
  stockQty?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  item: BarcodeItem | null;
}

export default function BarcodePrintModal({ open, onClose, item }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [copies, setCopies] = useState(1);
  const [labelConnected, setLabelConnected] = useState(isLabelConnected());
  const [labelPrinterName, setLabelPrinterName] = useState(getLabelPrinterName());

  const handleConnectLabel = async () => {
    try {
      const name = await connectLabelPrinter();
      setLabelConnected(true);
      setLabelPrinterName(name);
      toast.success(`Label printer connected: ${name}`);
    } catch {
      toast.error('Could not connect label printer');
    }
  };

  // Render preview barcode
  useEffect(() => {
    if (!open || !item || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, item.sku, {
        format: 'CODE128',
        width: 1.2,
        height: 35,
        displayValue: true,
        fontSize: 9,
        margin: 4,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // invalid SKU for barcode — show nothing
    }
  }, [open, item]);

  // Default copies to stock quantity
  useEffect(() => {
    if (open && item) setCopies(Math.max(1, item.stockQty || 1));
  }, [open, item]);

  const handlePrint = async () => {
    if (!item) return;

    // ── Silent TSPL print if label printer is connected ──────────────────────
    if (isLabelConnected()) {
      try {
        await tsplPrint(item, copies);
        toast.success(`Printed ${copies} label${copies !== 1 ? 's' : ''}`);
        onClose();
        return;
      } catch (err) {
        console.error('TSPL print failed:', err);
        toast.error('Label printer error — falling back to print dialog');
      }
    }

    // ── Fallback: open browser print dialog ──────────────────────────────────
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    try {
      JsBarcode(tempSvg, item.sku, {
        format: 'CODE128',
        width: 1.2,
        height: 28,
        displayValue: true,
        fontSize: 8,
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      return;
    }
    const svgHtml = tempSvg.outerHTML;

    const variantLine = [item.size, item.color].filter(Boolean).join(' / ');
    const priceHtml = item.price
      ? `<p class="price">LKR ${Number(item.price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>`
      : '';

    const labelHtml = `
      <div class="label">
        <p class="pname">${item.productName}</p>
        ${variantLine ? `<p class="variant">${variantLine}</p>` : ''}
        <div class="barcode">${svgHtml}</div>
        ${priceHtml}
      </div>`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Barcode — ${item.sku}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;background:#fff}
    .grid{display:flex;flex-wrap:wrap;gap:0;padding:0}
    .label{
      width:40mm;height:46mm;border:0.4pt solid #bbb;
      padding:2mm;display:flex;flex-direction:column;
      align-items:center;justify-content:center;page-break-inside:avoid;overflow:hidden
    }
    .pname{font-size:7pt;font-weight:700;text-align:center;
      width:36mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      margin-bottom:1mm;line-height:1.1}
    .variant{font-size:6pt;color:#555;margin-bottom:1mm;text-align:center}
    .barcode svg{max-width:36mm;display:block}
    .price{font-size:8pt;font-weight:700;margin-top:1mm}
    @media print{@page{size:40mm 46mm;margin:0}body{margin:0}.grid{padding:0;gap:0}.label{border:none}}
  </style>
</head>
<body>
  <div class="grid">
    ${Array(copies).fill(labelHtml).join('')}
  </div>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  if (!item) return null;

  const variantLine = [item.size, item.color].filter(Boolean).join(' / ');

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Print Barcode Labels"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<Printer size={15} />} onClick={handlePrint}>
            Print {copies} Label{copies !== 1 ? 's' : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Printer status */}
        <div className={`flex items-center justify-between p-3 rounded-xl border ${
          labelConnected
            ? 'border-emerald-500/40 bg-emerald-500/10'
            : 'border-charcoal-400 bg-charcoal-600/40'
        }`}>
          <div className="flex items-center gap-2">
            <Usb size={14} className={labelConnected ? 'text-emerald-400' : 'text-charcoal-300'} />
            <span className="text-xs text-charcoal-100">
              {labelConnected ? labelPrinterName || 'Label Printer' : 'No label printer connected'}
            </span>
            {labelConnected && (
              <span className="text-[10px] text-emerald-400 font-medium">● SILENT PRINT</span>
            )}
          </div>
          {!labelConnected && (
            <Button variant="secondary" size="sm" onClick={handleConnectLabel}>
              Connect
            </Button>
          )}
        </div>
        {!labelConnected && (
          <div className="px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
            <p className="font-semibold">Printer not appearing when you click Connect?</p>
            <p>
              Chrome's USB picker <strong>cannot see printers that have a Windows driver installed</strong>.
              To allow direct USB access, you need to replace the printer driver with WinUSB:
            </p>
            <ol className="list-decimal list-inside space-y-0.5 pl-1">
              <li>Download <strong>Zadig</strong> from <span className="text-amber-200">zadig.akeo.ie</span></li>
              <li>Open Zadig → Options → <strong>List All Devices</strong></li>
              <li>Select your label printer from the dropdown</li>
              <li>Choose <strong>WinUSB</strong> and click <strong>Replace Driver</strong></li>
              <li>Reconnect the printer and click Connect again</li>
            </ol>
            <p className="text-amber-400/70">
              Note: after replacing the driver the printer will only work via this app (not Windows print dialog). To undo, use Device Manager → Update Driver.
            </p>
            <p>
              Or skip Connect entirely — click <strong>Print Labels</strong> below to use the browser print dialog with the installed driver.
            </p>
          </div>
        )}

        {/* Preview */}
        <div>
          <p className="text-xs text-charcoal-200 mb-3">Label Preview</p>
          <div className="flex justify-center p-5 bg-white rounded-xl border border-charcoal-400">
            <div className="flex flex-col items-center text-center">
              <p className="text-[11px] font-bold text-black max-w-[200px] truncate leading-tight mb-1">
                {item.productName}
              </p>
              {variantLine && (
                <p className="text-[9px] text-gray-500 mb-1.5">{variantLine}</p>
              )}
              <svg ref={svgRef} />
              {item.price && (
                <p className="text-[11px] font-bold text-black mt-1">
                  LKR {Number(item.price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Copies */}
        <div>
          <label className="block text-xs text-charcoal-200 mb-1.5">Number of Copies</label>
          <input
            type="number"
            min={1}
            max={200}
            value={copies}
            onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
            onWheel={(e) => e.currentTarget.blur()}
            className="w-full bg-charcoal-600 border border-charcoal-400 rounded-xl px-3 py-2.5 text-charcoal-50 text-sm focus:outline-none focus:border-gold-600"
          />
        </div>

        <div className="p-3 bg-charcoal-600/40 rounded-xl space-y-1">
          <p className="text-xs text-charcoal-200">
            SKU: <code className="text-gold-400">{item.sku}</code>
          </p>
          {variantLine && (
            <p className="text-xs text-charcoal-200">Variant: <span className="text-charcoal-100">{variantLine}</span></p>
          )}
        </div>
      </div>
    </Drawer>
  );
}
