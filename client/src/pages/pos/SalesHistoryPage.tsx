import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Download, X, FileText, CheckCircle2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { posService } from '@/services/posService';
import { settingsService } from '@/services/settingsService';
import { buildReceiptHTML, printViaIframe, type ThermalReceiptData } from '@/utils/thermalPrint';
import { isUsbConnected, usbPrint } from '@/services/usbPrinterService';
import { formatCurrency, formatDate } from '@/utils/formatters';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

const PAY_LABEL: Record<string, string> = {
  cash: 'Cash', card: 'Card',
  mobile_payment: 'Mobile Pay', bank_transfer: 'Bank Transfer', mixed: 'Mixed',
};

export default function SalesHistoryPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [sendingId, setSendingId]         = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [printingId, setPrintingId]       = useState<string | null>(null);
  const [phoneInputId, setPhoneInputId]   = useState<string | null>(null);
  const [phoneValue, setPhoneValue]       = useState('');
  const [sentIds, setSentIds]             = useState<Set<string>>(new Set());

  const { data: sales, isLoading } = useQuery({
    queryKey: ['pos-sales-history', dateFrom, dateTo],
    queryFn: () => posService.getSales({ fromDate: dateFrom, toDate: dateTo }),
  });

  const { data: shopSettings } = useQuery({
    queryKey: ['settings-shop-pos'],
    queryFn: () => settingsService.getAll('shop'),
    staleTime: 5 * 60 * 1000,
  });

  const handleDownloadPDF = async (sale: any) => {
    setDownloadingId(sale.id);
    try {
      const res = await api.get(`/invoices/sale/${sale.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sale.sale_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSend = async (sale: any) => {
    setSendingId(sale.id);
    try {
      const res = await api.post('/notifications/send-invoice', {
        type: 'pos',
        referenceId: sale.id,
        channel: 'whatsapp',
        ...(phoneValue.trim() ? { phone: phoneValue.trim() } : {}),
      });
      if (res.data.waLink) {
        window.open(res.data.waLink, '_blank');
      } else {
        toast.success('WhatsApp invoice sent!');
      }
      setSentIds(prev => new Set(prev).add(sale.id));
      setPhoneInputId(null);
      setPhoneValue('');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to send');
    } finally {
      setSendingId(null);
    }
  };

  const handleReprint = async (sale: any) => {
    setPrintingId(sale.id);
    try {
      const full = await posService.getSaleById(sale.id) as any;
      const receipt: ThermalReceiptData = {
        saleNumber: full.sale_number,
        items: (full.items || []).map((item: any) => ({
          productName: item.product_name,
          quantity: item.quantity,
          itemSubtotal: parseFloat(item.subtotal),
        })),
        subtotal: parseFloat(full.subtotal),
        promotionDiscount: 0,
        discountAmount: parseFloat(full.discount_amount || 0),
        totalAmount: parseFloat(full.total_amount),
        amountPaid: parseFloat(full.amount_paid),
        changeAmount: parseFloat(full.change_amount || 0),
      };
      const shopInfo = {
        name:    shopSettings?.shop_name?.value    || 'THE OUTFIT LOUNGE',
        address: shopSettings?.shop_address?.value || undefined,
        phone:   shopSettings?.shop_phone?.value   || undefined,
        logoUrl: shopSettings?.shop_logo?.value    || undefined,
      };

      if (isUsbConnected()) {
        try {
          await usbPrint(receipt, shopInfo);
          return;
        } catch (err) {
          console.error('USB receipt print failed:', err);
        }
      }
      printViaIframe(buildReceiptHTML(receipt, shopInfo));
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to reprint receipt');
    } finally {
      setPrintingId(null);
    }
  };

  const togglePhone = (saleId: string) => {
    if (phoneInputId === saleId) {
      setPhoneInputId(null);
      setPhoneValue('');
    } else {
      setPhoneInputId(saleId);
      setPhoneValue('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h2 className="page-title">Sales History</h2>
          <p className="text-charcoal-200 text-sm">View and resend invoices for past sales</p>
        </div>
      </div>

      {/* Date filter */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-charcoal-200 mb-1">From</label>
            <input
              type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input-dark h-9 px-3 text-sm rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs text-charcoal-200 mb-1">To</label>
            <input
              type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input-dark h-9 px-3 text-sm rounded-xl"
            />
          </div>
          <p className="text-xs text-charcoal-300 self-end pb-1">
            {sales?.length ?? 0} sale{sales?.length !== 1 ? 's' : ''}
          </p>
        </div>
      </Card>

      {/* Sales list */}
      <Card padding="none">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-charcoal-600 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !sales?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-charcoal-300">
            <FileText size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No sales in this date range</p>
          </div>
        ) : (
          <div className="divide-y divide-charcoal-700">
            {(sales as any[]).map((sale) => (
              <div key={sale.id} className="p-4">
                {/* Row */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-charcoal-50 text-sm">{sale.sale_number}</span>
                      {sale.customer_name && (
                        <span className="text-sm text-charcoal-200 truncate">· {sale.customer_name}</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-charcoal-600 text-charcoal-300">
                        {PAY_LABEL[sale.payment_method] || sale.payment_method}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-sm font-semibold text-gold-400">{formatCurrency(parseFloat(sale.total_amount))}</span>
                      <span className="text-xs text-charcoal-300">{sale.item_count} item{parseInt(sale.item_count) !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-charcoal-400">{formatDate(sale.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Reprint receipt */}
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Printer size={13} />}
                      loading={printingId === sale.id}
                      onClick={() => handleReprint(sale)}
                    >
                      Print
                    </Button>

                    {/* PDF download — always available, generated on demand */}
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Download size={13} />}
                      loading={downloadingId === sale.id}
                      onClick={() => handleDownloadPDF(sale)}
                    >
                      PDF
                    </Button>

                    {/* WhatsApp send */}
                    {sentIds.has(sale.id) ? (
                      <div className="flex items-center gap-1.5 px-3 h-8 text-xs rounded-lg text-emerald-400">
                        <CheckCircle2 size={14} />
                        Sent
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<MessageCircle size={13} />}
                        onClick={() => togglePhone(sale.id)}
                      >
                        WhatsApp
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline phone input */}
                {phoneInputId === sale.id && (
                  <div className="mt-3 flex gap-2 items-center">
                    <input
                      autoFocus
                      className="input-dark flex-1 text-sm h-9 px-3 rounded-xl"
                      placeholder={sale.customer_name ? "Leave blank to use customer's number" : "WhatsApp number (e.g. 94771234567)"}
                      value={phoneValue}
                      onChange={e => setPhoneValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend(sale)}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      loading={sendingId === sale.id}
                      onClick={() => handleSend(sale)}
                    >
                      Send
                    </Button>
                    <button
                      onClick={() => { setPhoneInputId(null); setPhoneValue(''); }}
                      className="text-charcoal-300 hover:text-charcoal-50 p-1 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
