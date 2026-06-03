import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, Usb, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import Button from './Button';
import Drawer from './Drawer';
import { connectLabelPrinter, isLabelConnected, getLabelPrinterName, tsplPrint } from '@/services/labelPrinterService';

export interface BarcodeItem {
  sku: string;
  labelId?: number;   // short numeric ID — used as barcode value instead of long SKU
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
      toast.error('Could not connect — printer may have a Windows driver installed (see tip below)');
    }
  };

  useEffect(() => {
    if (!open || !item || !svgRef.current) return;
    try {
      const previewValue = item.labelId
        ? String(item.labelId).padStart(6, '0')
        : item.sku;
      JsBarcode(svgRef.current, previewValue, {
        format: 'CODE128',
        width: 7,
        height: 175,
        displayValue: false,
        margin: 5,
        background: '#ffffff',
        lineColor: '#000000',
      });
      // Let JsBarcode control the natural size so bar-width changes are visible in preview
    } catch { /* invalid SKU */ }
  }, [open, item]);

  useEffect(() => {
    if (open && item) setCopies(Math.max(1, item.stockQty || 1));
  }, [open, item]);

  const handlePrintDirect = async () => {
    if (!item) return;
    try {
      await tsplPrint(item, copies);
      toast.success(`Printed ${copies} label${copies !== 1 ? 's' : ''}`);
      onClose();
    } catch (err) {
      console.error('TSPL print failed:', err);
      toast.error('Direct print failed — try Print Dialog instead');
    }
  };

  const handlePrintDialog = () => {
    if (!item) return;

    // Use the short 6-digit label_id as barcode value — far fewer bars than the full SKU.
    // Falls back to SKU if label_id not available.
    const barcodeValue = item.labelId
      ? String(item.labelId).padStart(6, '0')
      : item.sku;

    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    try {
      JsBarcode(tempSvg, barcodeValue, {
        format: 'CODE128',
        width: 7,
        height: 175,
        displayValue: false,
        margin: 5,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch { return; }

    tempSvg.setAttribute('width', '86mm');
    tempSvg.setAttribute('height', '28mm');
    tempSvg.setAttribute('preserveAspectRatio', 'none');

    const variantLine = [item.size, item.color].filter(Boolean).join(' / ');
    const priceText = item.price
      ? `LKR ${Number(item.price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
      : '';

    const labelHtml = `
      <div class="page">
        <div class="label">
          <p class="pname">${item.productName}</p>
          ${variantLine ? `<p class="variant">${variantLine}</p>` : ''}
          <div class="bwrap">${tempSvg.outerHTML}</div>
          <p class="sku">${item.sku}</p>
          ${priceText ? `<p class="price">${priceText}</p>` : ''}
        </div>
      </div>`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Barcode — ${item.sku}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif}
    .page{
      width:80mm;height:100mm;
      position:relative;overflow:hidden;
      page-break-after:always;
    }
    .label{
      width:100mm;height:80mm;
      position:absolute;top:0;left:80mm;
      transform:rotate(90deg);
      transform-origin:top left;
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:1.5mm;
      padding:2mm;box-sizing:border-box;
    }
    .pname{font-size:14pt;font-weight:800;text-align:center;width:100%;line-height:1.1;word-break:break-word}
    .variant{font-size:11pt;color:#222;text-align:center;line-height:1.1}
    .bwrap{width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .bwrap svg{display:block;max-height:100%}
    .sku{font-size:10pt;color:#333;text-align:center;letter-spacing:0.5pt;line-height:1.1}
    .price{font-size:15pt;font-weight:800;text-align:center;line-height:1.1}
    @media print{@page{size:80mm 100mm;margin:0}body{margin:0}}
  </style>
</head>
<body>
  ${Array(copies).fill(labelHtml).join('')}
</body>
</html>`;

    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.onafterprint = () => w.close();
    setTimeout(() => w.print(), 400);
  };

  if (!item) return null;

  const variantLine = [item.size, item.color].filter(Boolean).join(' / ');

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Print Barcode Labels"
      footer={
        <Button variant="secondary" onClick={onClose}>Close</Button>
      }
    >
      <div className="space-y-5">
        {/* Label Preview */}
        <div>
          <p className="text-xs text-charcoal-200 mb-3">Label Preview</p>
          {/* Rotated preview (100×80mm → 200×160px) — content rotated 90deg on 80×100mm page */}
          <div className="flex justify-center p-4 bg-white rounded-xl border border-charcoal-400">
            <div style={{ width: 200, height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: 6, overflow: 'hidden', flexShrink: 0 }}>
              <p style={{ fontSize: 7, fontWeight: 800, textAlign: 'center', width: '100%', color: '#000', lineHeight: 1.1, wordBreak: 'break-word' }}>{item.productName}</p>
              {variantLine && <p style={{ fontSize: 6, color: '#333', textAlign: 'center', lineHeight: 1.1 }}>{variantLine}</p>}
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <svg ref={svgRef} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
              </div>
              <p style={{ fontSize: 6, color: '#555', textAlign: 'center', lineHeight: 1.1 }}>{item.sku}</p>
              {item.price && <p style={{ fontSize: 7, fontWeight: 800, textAlign: 'center', color: '#000', lineHeight: 1.1 }}>LKR {Number(item.price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>}
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

        {/* Print options */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-charcoal-100">Choose Print Method</p>

          {/* Option 1: Print Dialog — always works with installed driver */}
          <div className="p-4 rounded-xl border-2 border-gold-600 bg-gold-700/10 space-y-3">
            <div className="flex items-center gap-2">
              <Monitor size={16} className="text-gold-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gold-400">Print via Windows Dialog</p>
                <p className="text-xs text-charcoal-200">Works with your installed printer driver — no setup needed</p>
              </div>
            </div>
            <Button variant="primary" icon={<Printer size={15} />} onClick={handlePrintDialog} className="w-full">
              Print {copies} Label{copies !== 1 ? 's' : ''} (Opens Print Dialog)
            </Button>
          </div>

          {/* Option 2: Direct USB / Silent */}
          <div className="p-4 rounded-xl border border-charcoal-400 bg-charcoal-600/30 space-y-3">
            <div className="flex items-center gap-2">
              <Usb size={16} className={labelConnected ? 'text-emerald-400' : 'text-charcoal-300'} />
              <div>
                <p className={`text-sm font-semibold ${labelConnected ? 'text-emerald-400' : 'text-charcoal-100'}`}>
                  Direct USB — Silent Print
                </p>
                <p className="text-xs text-charcoal-200">
                  {labelConnected
                    ? `Connected: ${labelPrinterName || 'Label Printer'} — prints instantly, no dialog`
                    : 'Prints silently with no dialog. Requires the printer to NOT have a Windows driver installed.'}
                </p>
              </div>
            </div>
            {labelConnected ? (
              <Button variant="secondary" icon={<Printer size={15} />} onClick={handlePrintDirect} className="w-full">
                Print {copies} Label{copies !== 1 ? 's' : ''} (Silent)
              </Button>
            ) : (
              <div className="space-y-2">
                <Button variant="secondary" onClick={handleConnectLabel} className="w-full">
                  Connect USB Printer
                </Button>
                <p className="text-xs text-charcoal-400">
                  If your printer doesn't appear after clicking Connect, it has a Windows driver installed.
                  Uninstall the driver from Device Manager first, or just use the <strong className="text-charcoal-200">Windows Dialog</strong> option above — it works perfectly.
                </p>
              </div>
            )}
          </div>
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
