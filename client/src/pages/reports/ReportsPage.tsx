import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart2, TrendingUp, Package, AlertTriangle, Download, AlertCircle, FileDown, Receipt, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { reportService } from '@/services/reportService';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Select from '@/components/common/Select';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import {
  createDoc, loadLogo, addHeader, addFooter,
  addSectionTitle, addStatCards, addTable, captureChart, addChartImage,
} from '@/utils/reportPDF';

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  stock_purchase: 'Stock Purchase',
  equipment:      'Equipment',
  rent:           'Rent',
  utilities:      'Utilities',
  salaries:       'Salaries',
  other:          'Other',
};

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  stock_purchase: '#60a5fa',
  equipment:      '#a78bfa',
  rent:           '#fb923c',
  utilities:      '#facc15',
  salaries:       '#f472b6',
  other:          '#94a3b8',
};

function expMonthLabel(m: string): string {
  const [y, mo] = m.split('-');
  return new Date(parseInt(y), parseInt(mo) - 1, 1)
    .toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

const TABS = [
  { key: 'overview',  label: 'Overview',  icon: BarChart2 },
  { key: 'sales',     label: 'Sales',     icon: TrendingUp },
  { key: 'rentals',   label: 'Rentals',   icon: Package },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'fines',     label: 'Fines',     icon: AlertTriangle },
  { key: 'expenses',  label: 'Expenses',  icon: Receipt },
] as const;

type TabKey = typeof TABS[number]['key'];

const CHART_COLORS = ['#c9a96e', '#e8c97e', '#a07840', '#4ade80', '#fb923c', '#f87171', '#60a5fa'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-charcoal-700 border border-charcoal-500 rounded-xl p-3 text-sm shadow-card">
      <p className="text-charcoal-200 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-medium">
          {entry.name}:{' '}
          {typeof entry.value === 'number' && entry.name.toLowerCase().includes('revenue')
            ? formatCurrency(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
};

function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 bg-charcoal-600 rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm">
      <AlertCircle size={16} className="flex-shrink-0" />
      <span>Failed to load data: {message}</span>
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [fullStockLoading, setFullStockLoading] = useState<'pdf' | 'excel' | null>(null);

  // Chart refs for PDF capture
  const overviewChartRef   = useRef<HTMLDivElement>(null);
  const salesBarRef        = useRef<HTMLDivElement>(null);
  const salesPieRef        = useRef<HTMLDivElement>(null);
  const rentalStatusRef    = useRef<HTMLDivElement>(null);
  const inventoryChartRef  = useRef<HTMLDivElement>(null);
  const expPieRef          = useRef<HTMLDivElement>(null);
  const expBarRef          = useRef<HTMLDivElement>(null);

  const { data: revenueData, isLoading: revenueLoading, error: revenueError } = useQuery({
    queryKey: ['revenue-chart', period],
    queryFn: () => reportService.getRevenueChart(period),
    staleTime: 60_000,
  });

  const { data: salesData, isLoading: salesLoading, error: salesError } = useQuery({
    queryKey: ['sales-report', dateFrom, dateTo],
    queryFn: () => reportService.getSalesReport({ fromDate: dateFrom, toDate: dateTo }),
    staleTime: 60_000,
  });

  const { data: rentalData, isLoading: rentalLoading, error: rentalError } = useQuery({
    queryKey: ['rental-report', dateFrom, dateTo],
    queryFn: () => reportService.getRentalReport({ fromDate: dateFrom, toDate: dateTo }),
    staleTime: 60_000,
  });

  const { data: inventoryData, isLoading: inventoryLoading, error: inventoryError } = useQuery({
    queryKey: ['inventory-report'],
    queryFn: () => reportService.getInventoryReport(),
    staleTime: 60_000,
  });

  const { data: expensesData, isLoading: expensesLoading, error: expensesError } = useQuery({
    queryKey: ['expenses-report-tab', dateFrom, dateTo],
    queryFn: () => reportService.getExpensesReport({ fromDate: dateFrom, toDate: dateTo }),
    staleTime: 60_000,
    enabled: activeTab === 'expenses',
  });

  const exportCSV = (data: any[], filename: string) => {
    if (!data?.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map((row) => keys.map((k) => `"${row[k] ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel = period === 'week' ? 'Last 7 Days' : period === 'month' ? 'Last 30 Days' : 'Last 12 Months';
  const dateRangeLabel = `${dateFrom} — ${dateTo}`;

  const downloadFullStockPDF = async () => {
    setFullStockLoading('pdf');
    try {
      const { items } = await reportService.getAllStockReport();
      const doc = createDoc();
      const logo = await loadLogo();
      let y = await addHeader(doc, logo, 'Full Stock Report', `Generated: ${new Date().toLocaleDateString('en-GB')}`);

      y = addSectionTitle(doc, 'All Products & Variants', y);
      addTable(
        doc,
        ['Category', 'Product', 'SKU', 'Size', 'Color', 'Total Stock', 'Sale Stock', 'Rental Stock', 'Damaged'],
        items.map((item: any) => [
          item.category,
          item.product_name,
          item.sku,
          item.size || '—',
          item.color || '—',
          item.total_stock,
          item.sale_stock,
          item.rental_stock,
          item.damaged,
        ]),
        y,
      );

      addFooter(doc);
      doc.save(`full_stock_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + err.message);
    } finally {
      setFullStockLoading(null);
    }
  };

  const downloadFullStockExcel = async () => {
    setFullStockLoading('excel');
    try {
      const { items } = await reportService.getAllStockReport();

      const wsData: any[][] = [
        ['Category', 'Product', 'Type', 'SKU', 'Size', 'Color', 'Total Stock', 'Sale Stock', 'Rental Stock', 'Damaged'],
        ...items.map((item: any) => [
          item.category,
          item.product_name,
          item.product_type,
          item.sku,
          item.size || '',
          item.color || '',
          item.total_stock,
          item.sale_stock,
          item.rental_stock,
          item.damaged,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [
        { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 10 },
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 10 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'All Stock');
      XLSX.writeFile(wb, `full_stock_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err: any) {
      toast.error('Failed to generate Excel: ' + err.message);
    } finally {
      setFullStockLoading(null);
    }
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const doc = createDoc();
      const logo = await loadLogo();

      if (activeTab === 'overview') {
        let y = await addHeader(doc, logo, 'Overview Report', periodLabel);
        y = addSectionTitle(doc, 'Revenue Summary', y);
        const s = revenueData?.summary;
        y = addStatCards(doc, [
          { label: 'Total Revenue',   value: formatCurrency(s?.totalRevenue   || 0) },
          { label: 'Sales Revenue',   value: formatCurrency(s?.salesRevenue   || 0) },
          { label: 'Rental Revenue',  value: formatCurrency(s?.rentalRevenue  || 0) },
          { label: 'Fines Collected', value: formatCurrency(s?.finesCollected || 0) },
        ], y);

        if (overviewChartRef.current) {
          y = addSectionTitle(doc, 'Revenue Over Time', y);
          const img = await captureChart(overviewChartRef.current);
          if (img) y = await addChartImage(doc, img, y, 70);
        }

        if (revenueData?.chartData?.length) {
          y = addSectionTitle(doc, 'Revenue Data', y);
          addTable(doc,
            ['Period', 'Sales Revenue (LKR)', 'Rental Revenue (LKR)'],
            revenueData.chartData.map((r: any) => [r.label, formatCurrency(r.sales_revenue || 0), formatCurrency(r.rental_revenue || 0)]),
            y,
          );
        }
      }

      if (activeTab === 'sales') {
        let y = await addHeader(doc, logo, 'Sales Report', dateRangeLabel);
        y = addSectionTitle(doc, 'Sales Summary', y);
        const s = salesData?.summary;
        y = addStatCards(doc, [
          { label: 'Total Sales',    value: String(s?.totalSales     || 0) },
          { label: 'Total Revenue',  value: formatCurrency(s?.totalRevenue   || 0) },
          { label: 'Avg Sale Value', value: formatCurrency(s?.avgSaleValue   || 0) },
          { label: 'Items Sold',     value: String(s?.totalItemsSold || 0) },
        ], y);

        if (salesBarRef.current) {
          y = addSectionTitle(doc, 'Top Selling Products', y);
          const img = await captureChart(salesBarRef.current);
          if (img) y = await addChartImage(doc, img, y, 60);
        }

        if (salesData?.topProducts?.length) {
          y = addSectionTitle(doc, 'Top Products Detail', y);
          y = addTable(doc,
            ['#', 'Product', 'Units Sold', 'Revenue (LKR)'],
            salesData.topProducts.slice(0, 20).map((p: any, i: number) => [
              i + 1, p.product_name, p.total_quantity, formatCurrency(p.total_revenue || 0),
            ]),
            y,
          );
        }

        if (salesPieRef.current) {
          y = addSectionTitle(doc, 'Payment Methods', y);
          const img = await captureChart(salesPieRef.current);
          if (img) y = await addChartImage(doc, img, y, 55);
        }

        if (salesData?.paymentMethods?.length) {
          addTable(doc,
            ['Payment Method', 'Amount (LKR)', 'Transactions'],
            salesData.paymentMethods.map((pm: any) => [
              pm.payment_method?.replace('_', ' '),
              formatCurrency(pm.total_amount || 0),
              pm.transaction_count || '',
            ]),
            y,
          );
        }
      }

      if (activeTab === 'rentals') {
        let y = await addHeader(doc, logo, 'Rentals Report', dateRangeLabel);
        y = addSectionTitle(doc, 'Rentals Summary', y);
        const s = rentalData?.summary;
        y = addStatCards(doc, [
          { label: 'Total Bookings',  value: String(s?.totalBookings  || 0) },
          { label: 'Rental Revenue',  value: formatCurrency(s?.totalRevenue   || 0) },
          { label: 'Avg Rental Days', value: `${s?.avgRentalDays || 0} days` },
          { label: 'Completion Rate', value: `${s?.completionRate || 0}%` },
        ], y);

        if (rentalStatusRef.current) {
          y = addSectionTitle(doc, 'Rentals by Status', y);
          const img = await captureChart(rentalStatusRef.current);
          if (img) y = await addChartImage(doc, img, y, 55);
        }

        if (rentalData?.statusBreakdown?.length) {
          y = addTable(doc,
            ['Status', 'Count'],
            rentalData.statusBreakdown.map((r: any) => [r.status, r.count]),
            y,
          );
        }

        if (rentalData?.topProducts?.length) {
          y = addSectionTitle(doc, 'Most Rented Items', y);
          addTable(doc,
            ['#', 'Product', 'Rental Count', 'Revenue (LKR)'],
            rentalData.topProducts.slice(0, 20).map((p: any, i: number) => [
              i + 1, p.product_name, p.rental_count, formatCurrency(p.total_revenue || 0),
            ]),
            y,
          );
        }
      }

      if (activeTab === 'inventory') {
        let y = await addHeader(doc, logo, 'Inventory Report');
        y = addSectionTitle(doc, 'Inventory Summary', y);
        const s = inventoryData?.summary;
        y = addStatCards(doc, [
          { label: 'Total SKUs',       value: String(s?.totalSkus    ?? 0) },
          { label: 'Total Stock',      value: String(s?.totalStock   ?? 0) },
          { label: 'Currently Rented', value: String(s?.totalRented  ?? 0) },
          { label: 'Damaged Items',    value: String(s?.totalDamaged ?? 0), color: [200, 70, 70] },
        ], y);

        if (inventoryChartRef.current) {
          y = addSectionTitle(doc, 'Stock by Category', y);
          const img = await captureChart(inventoryChartRef.current);
          if (img) y = await addChartImage(doc, img, y, 60);
        }

        if (inventoryData?.byCategory?.length) {
          y = addTable(doc,
            ['Category', 'Total Stock', 'Available', 'Rented'],
            inventoryData.byCategory.map((c: any) => [
              c.category_name, c.total_stock, c.available, c.rented || 0,
            ]),
            y,
          );
        }

        if (inventoryData?.lowStock?.length) {
          y = addSectionTitle(doc, 'Low Stock Alerts', y);
          addTable(doc,
            ['SKU', 'Product', 'Size / Color', 'Stock Qty'],
            inventoryData.lowStock.map((item: any) => [
              item.sku, item.product_name,
              [item.size, item.color].filter(Boolean).join(' / '),
              item.stock_quantity,
            ]),
            y,
          );
        }
      }

      if (activeTab === 'fines') {
        let y = await addHeader(doc, logo, 'Fines Report', dateRangeLabel);
        y = addSectionTitle(doc, 'Fines Summary', y);
        const fs = rentalData?.finesSummary;
        y = addStatCards(doc, [
          { label: 'Total Fines Issued', value: String(fs?.totalFinesIssued || 0) },
          { label: 'Total Fine Amount',  value: formatCurrency(fs?.totalFineAmount || 0), color: [200, 70, 70] },
          { label: 'Collected',          value: formatCurrency(fs?.totalCollected  || 0), color: [50, 180, 100] },
        ], y);

        if (rentalData?.topOffenders?.length) {
          y = addSectionTitle(doc, 'Top Late Returners', y);
          addTable(doc,
            ['#', 'Customer', 'Late Returns', 'Total Fines (LKR)'],
            rentalData.topOffenders.map((c: any, i: number) => [
              i + 1, c.customer_name, c.late_returns, formatCurrency(c.total_fines || 0),
            ]),
            y,
          );
        }
      }

      if (activeTab === 'expenses') {
        let y = await addHeader(doc, logo, 'Expenses Report', dateRangeLabel);
        const es = expensesData?.summary;
        y = addSectionTitle(doc, 'Expenses Summary', y);
        y = addStatCards(doc, [
          { label: 'Total Expenses', value: formatCurrency(es?.total     || 0), color: [200, 70, 70] },
          { label: 'This Month',     value: formatCurrency(es?.thisMonth || 0) },
          { label: 'Total Entries',  value: String(es?.count || 0) },
          { label: 'Top Category',   value: es?.topCategory ? (EXPENSE_CATEGORY_LABELS[es.topCategory] || es.topCategory) : '—' },
        ], y);

        if (expPieRef.current) {
          y = addSectionTitle(doc, 'By Category', y);
          const img = await captureChart(expPieRef.current);
          if (img) y = await addChartImage(doc, img, y, 55);
        }

        if (expensesData?.byCategory?.length) {
          y = addTable(doc,
            ['Category', 'Total (LKR)', 'Entries'],
            expensesData.byCategory.map((r: any) => [
              EXPENSE_CATEGORY_LABELS[r.category] || r.category,
              formatCurrency(r.total),
              String(r.count),
            ]),
            y,
          );
        }

        if (expBarRef.current) {
          y = addSectionTitle(doc, 'Monthly Trend', y);
          const img = await captureChart(expBarRef.current);
          if (img) y = await addChartImage(doc, img, y, 55);
        }

        if (expensesData?.list?.length) {
          y = addSectionTitle(doc, 'Expense Entries', y);
          addTable(doc,
            ['Date', 'Category', 'Note', 'Amount (LKR)'],
            expensesData.list.slice(0, 80).map((r: any) => [
              formatDate(r.invested_at),
              EXPENSE_CATEGORY_LABELS[r.category] || r.category,
              r.note || '',
              formatCurrency(parseFloat(r.amount)),
            ]),
            y,
          );
        }
      }

      addFooter(doc);
      doc.save(`report_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h2 className="page-title">Reports & Analytics</h2>
          <p className="text-charcoal-200 text-sm">Business insights and performance metrics</p>
        </div>
        <Button
          variant="secondary"
          icon={<FileDown size={14} />}
          onClick={downloadPDF}
          loading={pdfLoading}
        >
          Download PDF
        </Button>
      </div>

      {/* Tabs */}
      <Card padding="none">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-gold-500 text-gold-400'
                    : 'border-transparent text-charcoal-200 hover:text-charcoal-50'
                )}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Date Range (sales / rentals / fines) */}
      {(activeTab === 'sales' || activeTab === 'rentals' || activeTab === 'fines' || activeTab === 'expenses') && (
        <Card>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-charcoal-200 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-dark h-9 px-3 text-sm rounded-xl" />
            </div>
            <div>
              <label className="block text-xs text-charcoal-200 mb-1">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-dark h-9 px-3 text-sm rounded-xl" />
            </div>
          </div>
        </Card>
      )}

      {/* ── Overview ─────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Select
              options={[
                { value: 'week',  label: 'Last 7 Days' },
                { value: 'month', label: 'Last 30 Days' },
                { value: 'year',  label: 'Last 12 Months' },
              ]}
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="w-44"
            />
          </div>

          {revenueError && <ErrorBanner message={(revenueError as any)?.message || 'Unknown error'} />}

          <div ref={overviewChartRef}>
            <Card>
              <h4 className="text-sm font-semibold text-charcoal-100 mb-4">Revenue Over Time</h4>
              {revenueLoading ? (
                <div className="h-64 bg-charcoal-600 rounded-xl animate-pulse" />
              ) : revenueData?.chartData?.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueData.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
                    <XAxis dataKey="label" tick={{ fill: '#7a7a8c', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#7a7a8c', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="sales_revenue"  name="Sales Revenue"  stroke="#c9a96e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="rental_revenue" name="Rental Revenue" stroke="#4ade80" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-charcoal-200 text-sm">No data for this period</div>
              )}
            </Card>
          </div>

          {revenueLoading ? (
            <LoadingCards count={4} />
          ) : revenueData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue',   value: revenueData.summary.totalRevenue   || 0, color: 'text-gold-400' },
                { label: 'Sales Revenue',   value: revenueData.summary.salesRevenue   || 0, color: 'text-gold-300' },
                { label: 'Rental Revenue',  value: revenueData.summary.rentalRevenue  || 0, color: 'text-emerald-400' },
                { label: 'Fines Collected', value: revenueData.summary.finesCollected || 0, color: 'text-red-400' },
              ].map(({ label, value, color }) => (
                <Card key={label}>
                  <p className="text-xs text-charcoal-200">{label}</p>
                  <p className={`text-xl font-bold mt-1 ${color}`}>{formatCurrency(value)}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sales ────────────────────────────────────────────── */}
      {activeTab === 'sales' && (
        <div className="space-y-5">
          {salesError && <ErrorBanner message={(salesError as any)?.message || 'Unknown error'} />}

          {salesLoading ? (
            <><LoadingCards count={4} /><div className="h-56 bg-charcoal-600 rounded-2xl animate-pulse" /></>
          ) : salesData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Sales',    value: salesData.summary?.totalSales     || 0, fmt: 'n' },
                  { label: 'Total Revenue',  value: salesData.summary?.totalRevenue   || 0, fmt: 'c' },
                  { label: 'Avg Sale Value', value: salesData.summary?.avgSaleValue   || 0, fmt: 'c' },
                  { label: 'Items Sold',     value: salesData.summary?.totalItemsSold || 0, fmt: 'n' },
                ].map(({ label, value, fmt }) => (
                  <Card key={label}>
                    <p className="text-xs text-charcoal-200">{label}</p>
                    <p className="text-xl font-bold text-charcoal-50 mt-1">{fmt === 'c' ? formatCurrency(value) : value}</p>
                  </Card>
                ))}
              </div>

              {salesData.topProducts?.length > 0 && (
                <div ref={salesBarRef}>
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-charcoal-100">Top Selling Products</h4>
                      <Button variant="ghost" size="sm" icon={<Download size={13} />} onClick={() => exportCSV(salesData.topProducts, 'top_products')}>Export CSV</Button>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={salesData.topProducts.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#7a7a8c', fontSize: 11 }} />
                        <YAxis type="category" dataKey="product_name" tick={{ fill: '#7a7a8c', fontSize: 11 }} width={130} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="total_quantity" name="Units Sold" fill="#c9a96e" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              )}

              {salesData.paymentMethods?.length > 0 && (
                <div ref={salesPieRef}>
                  <Card>
                    <h4 className="text-sm font-semibold text-charcoal-100 mb-4">Payment Methods</h4>
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={salesData.paymentMethods} dataKey="total_amount" nameKey="payment_method"
                            cx="50%" cy="50%" outerRadius={80}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={{ stroke: '#7a7a8c' }}>
                            {salesData.paymentMethods.map((_: any, i: number) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 min-w-[160px]">
                        {salesData.paymentMethods.map((pm: any, i: number) => (
                          <div key={pm.payment_method} className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-charcoal-200 capitalize">{pm.payment_method?.replace('_', ' ')}</span>
                            <span className="ml-auto font-medium text-charcoal-50">{formatCurrency(pm.total_amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {!salesData.topProducts?.length && !salesError && (
                <div className="text-center py-12 text-charcoal-200 text-sm">No sales in this date range</div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── Rentals ──────────────────────────────────────────── */}
      {activeTab === 'rentals' && (
        <div className="space-y-5">
          {rentalError && <ErrorBanner message={(rentalError as any)?.message || 'Unknown error'} />}

          {rentalLoading ? (
            <><LoadingCards count={4} /><div className="h-48 bg-charcoal-600 rounded-2xl animate-pulse" /></>
          ) : rentalData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Bookings',  value: rentalData.summary?.totalBookings  || 0, fmt: 'n', suffix: '' },
                  { label: 'Rental Revenue',  value: rentalData.summary?.totalRevenue   || 0, fmt: 'c', suffix: '' },
                  { label: 'Avg Rental Days', value: rentalData.summary?.avgRentalDays  || 0, fmt: 'n', suffix: ' days' },
                  { label: 'Completion Rate', value: rentalData.summary?.completionRate || 0, fmt: 'n', suffix: '%' },
                ].map(({ label, value, fmt, suffix }) => (
                  <Card key={label}>
                    <p className="text-xs text-charcoal-200">{label}</p>
                    <p className="text-xl font-bold text-charcoal-50 mt-1">{fmt === 'c' ? formatCurrency(value) : `${value}${suffix}`}</p>
                  </Card>
                ))}
              </div>

              {rentalData.statusBreakdown?.length > 0 && (
                <div ref={rentalStatusRef}>
                  <Card>
                    <h4 className="text-sm font-semibold text-charcoal-100 mb-4">Rentals by Status</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={rentalData.statusBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
                        <XAxis dataKey="status" tick={{ fill: '#7a7a8c', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#7a7a8c', fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Count" fill="#c9a96e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              )}

              {rentalData.topProducts?.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-charcoal-100">Most Rented Items</h4>
                    <Button variant="ghost" size="sm" icon={<Download size={13} />} onClick={() => exportCSV(rentalData.topProducts, 'top_rentals')}>Export CSV</Button>
                  </div>
                  <div className="space-y-2">
                    {rentalData.topProducts.slice(0, 8).map((p: any, i: number) => (
                      <div key={p.product_name} className="flex items-center gap-3 p-2.5 bg-charcoal-600/40 rounded-xl">
                        <span className="w-6 text-center text-xs font-bold text-charcoal-300">{i + 1}</span>
                        <div className="flex-1"><p className="text-sm font-medium text-charcoal-50">{p.product_name}</p></div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gold-400">{p.rental_count} rentals</p>
                          <p className="text-xs text-charcoal-200">{formatCurrency(p.total_revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {!rentalData.statusBreakdown?.length && !rentalError && (
                <div className="text-center py-12 text-charcoal-200 text-sm">No rentals in this date range</div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── Inventory ────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          {inventoryError && <ErrorBanner message={(inventoryError as any)?.message || 'Unknown error'} />}

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-charcoal-100">Full Stock Report</h4>
                <p className="text-xs text-charcoal-300 mt-0.5">All products and variants with complete stock levels</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FileDown size={13} />}
                  onClick={downloadFullStockPDF}
                  loading={fullStockLoading === 'pdf'}
                >
                  PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FileSpreadsheet size={13} />}
                  onClick={downloadFullStockExcel}
                  loading={fullStockLoading === 'excel'}
                >
                  Excel
                </Button>
              </div>
            </div>
          </Card>

          {inventoryLoading ? (
            <><LoadingCards count={4} /><div className="h-48 bg-charcoal-600 rounded-2xl animate-pulse" /></>
          ) : inventoryData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total SKUs',       value: inventoryData.summary?.totalSkus     ?? 0, color: 'text-charcoal-50' },
                  { label: 'Total Stock',      value: inventoryData.summary?.totalStock    ?? 0, color: 'text-charcoal-50' },
                  { label: 'Currently Rented', value: inventoryData.summary?.totalRented   ?? 0, color: 'text-amber-400' },
                  { label: 'Damaged Items',    value: inventoryData.summary?.totalDamaged  ?? 0, color: 'text-red-400' },
                ].map(({ label, value, color }) => (
                  <Card key={label}>
                    <p className="text-xs text-charcoal-200">{label}</p>
                    <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                  </Card>
                ))}
              </div>

              {inventoryData.byCategory?.length > 0 && (
                <div ref={inventoryChartRef}>
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-charcoal-100">Stock by Category</h4>
                      <Button variant="ghost" size="sm" icon={<Download size={13} />} onClick={() => exportCSV(inventoryData.byCategory, 'inventory_by_category')}>Export CSV</Button>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={inventoryData.byCategory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
                        <XAxis dataKey="category_name" tick={{ fill: '#7a7a8c', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#7a7a8c', fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="total_stock" name="Total Stock" fill="#c9a96e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="available"   name="Available"   fill="#4ade80" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              )}

              {inventoryData.lowStock?.length > 0 && (
                <Card>
                  <h4 className="text-sm font-semibold text-red-400 mb-3">Low Stock Alerts</h4>
                  <div className="space-y-2">
                    {inventoryData.lowStock.map((item: any) => (
                      <div key={item.variant_id} className="flex items-center justify-between p-2.5 bg-red-500/5 border border-red-500/20 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-charcoal-50">{item.product_name}</p>
                          <p className="text-xs text-charcoal-200">{item.sku} · {[item.size, item.color].filter(Boolean).join(' / ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-red-400 font-bold">{item.stock_quantity}</p>
                          <p className="text-xs text-charcoal-200">in stock</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── Fines ────────────────────────────────────────────── */}
      {activeTab === 'fines' && (
        <div className="space-y-5">
          <FinesTab rentalData={rentalData} rentalLoading={rentalLoading} rentalError={rentalError} exportCSV={exportCSV} />
        </div>
      )}

      {/* ── Expenses ─────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div className="space-y-5">
          {expensesError && <ErrorBanner message={(expensesError as any)?.message || 'Unknown error'} />}

          {expensesLoading ? (
            <><LoadingCards count={4} /><div className="h-56 bg-charcoal-600 rounded-2xl animate-pulse" /></>
          ) : expensesData ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Expenses', value: formatCurrency(expensesData.summary?.total     || 0), color: 'text-blue-400' },
                  { label: 'This Month',     value: formatCurrency(expensesData.summary?.thisMonth || 0), color: 'text-amber-400' },
                  { label: 'Total Entries',  value: String(expensesData.summary?.count || 0),              color: 'text-charcoal-50' },
                  {
                    label: 'Top Category',
                    value: expensesData.summary?.topCategory
                      ? (EXPENSE_CATEGORY_LABELS[expensesData.summary.topCategory] || expensesData.summary.topCategory)
                      : '—',
                    color: 'text-charcoal-50',
                  },
                ].map(({ label, value, color }) => (
                  <Card key={label}>
                    <p className="text-xs text-charcoal-200">{label}</p>
                    <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                  </Card>
                ))}
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Donut by category */}
                {expensesData.byCategory?.length > 0 && (
                  <div ref={expPieRef}>
                    <Card>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-charcoal-100">By Category</h4>
                        <Button variant="ghost" size="sm" icon={<Download size={13} />}
                          onClick={() => exportCSV(expensesData.byCategory, 'expenses_by_category')}>Export CSV</Button>
                      </div>
                      <div className="flex items-center gap-4">
                        <ResponsiveContainer width="45%" height={180}>
                          <PieChart>
                            <Pie
                              data={expensesData.byCategory} dataKey="total" nameKey="category"
                              cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}
                            >
                              {expensesData.byCategory.map((entry: any) => (
                                <Cell key={entry.category}
                                  fill={EXPENSE_CATEGORY_COLORS[entry.category] || '#94a3b8'} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2a2a38', borderRadius: 8, color: '#f4f4f6' }}
                              formatter={(v: number, name: string) => [formatCurrency(v), EXPENSE_CATEGORY_LABELS[name] || name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2">
                          {expensesData.byCategory.map((entry: any) => (
                            <div key={entry.category} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ background: EXPENSE_CATEGORY_COLORS[entry.category] || '#94a3b8' }} />
                                <span className="text-xs text-charcoal-200">
                                  {EXPENSE_CATEGORY_LABELS[entry.category] || entry.category}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-medium text-charcoal-50">{formatCurrency(entry.total)}</p>
                                <p className="text-xs text-charcoal-300">{entry.count} entries</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Monthly trend */}
                {expensesData.byMonth?.length > 0 && (
                  <div ref={expBarRef}>
                    <Card>
                      <h4 className="text-sm font-semibold text-charcoal-100 mb-4">Monthly Trend</h4>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={expensesData.byMonth.map((r: any) => ({ ...r, label: expMonthLabel(r.month) }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: '#7a7a8c', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis
                            tick={{ fill: '#7a7a8c', fontSize: 11 }} axisLine={false} tickLine={false}
                            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2a2a38', borderRadius: 8, color: '#f4f4f6' }}
                            formatter={(v: number) => [formatCurrency(v), 'Expenses']}
                          />
                          <Bar dataKey="total" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                )}
              </div>

              {/* Expense list */}
              {expensesData.list?.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-charcoal-100">Expense Entries</h4>
                    <Button variant="ghost" size="sm" icon={<Download size={13} />}
                      onClick={() => exportCSV(expensesData.list, 'expenses_list')}>Export CSV</Button>
                  </div>
                  <div className="space-y-2">
                    {expensesData.list.slice(0, 50).map((inv: any) => (
                      <div key={inv.id} className="flex items-center gap-3 p-2.5 bg-charcoal-600/40 rounded-xl">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: EXPENSE_CATEGORY_COLORS[inv.category] || '#94a3b8' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{
                                background: `${EXPENSE_CATEGORY_COLORS[inv.category] || '#94a3b8'}22`,
                                color: EXPENSE_CATEGORY_COLORS[inv.category] || '#94a3b8',
                              }}
                            >
                              {EXPENSE_CATEGORY_LABELS[inv.category] || inv.category}
                            </span>
                            {inv.note && <span className="text-xs text-charcoal-200 truncate">{inv.note}</span>}
                          </div>
                          <p className="text-xs text-charcoal-300 mt-0.5">{formatDate(inv.invested_at)}</p>
                        </div>
                        <span className="text-sm font-semibold text-blue-400">{formatCurrency(parseFloat(inv.amount))}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {!expensesData.list?.length && !expensesError && (
                <div className="text-center py-12 text-charcoal-200 text-sm">No expenses in this date range</div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function FinesTab({
  rentalData, rentalLoading, rentalError, exportCSV,
}: {
  rentalData: any; rentalLoading: boolean; rentalError: any;
  exportCSV: (data: any[], name: string) => void;
}) {
  const fs = rentalData?.finesSummary;
  return (
    <>
      {rentalError && <ErrorBanner message={rentalError?.message || 'Unknown error'} />}

      {rentalLoading ? (
        <LoadingCards count={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Fines Issued', value: fs?.totalFinesIssued || 0, fmt: 'n', color: 'text-charcoal-50' },
            { label: 'Total Fine Amount',  value: fs?.totalFineAmount  || 0, fmt: 'c', color: 'text-red-400' },
            { label: 'Collected',          value: fs?.totalCollected   || 0, fmt: 'c', color: 'text-emerald-400' },
          ].map(({ label, value, fmt, color }) => (
            <Card key={label}>
              <p className="text-xs text-charcoal-200">{label}</p>
              <p className={`text-xl font-bold mt-1 ${color}`}>{fmt === 'c' ? formatCurrency(value) : value}</p>
            </Card>
          ))}
        </div>
      )}

      {rentalData?.topOffenders?.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-charcoal-100">Top Late Returners</h4>
            <Button variant="ghost" size="sm" icon={<Download size={13} />} onClick={() => exportCSV(rentalData.topOffenders, 'late_returners')}>Export CSV</Button>
          </div>
          <div className="space-y-2">
            {rentalData.topOffenders.map((c: any, i: number) => (
              <div key={c.customer_id} className="flex items-center gap-3 p-2.5 bg-charcoal-600/40 rounded-xl">
                <span className="w-6 text-center text-xs font-bold text-charcoal-300">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-charcoal-50">{c.customer_name}</p>
                  <p className="text-xs text-charcoal-200">{c.late_returns} late returns</p>
                </div>
                <p className="text-red-400 font-medium">{formatCurrency(c.total_fines)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!rentalLoading && rentalData && !rentalData.topOffenders?.length && !rentalError && (
        <div className="text-center py-12 text-charcoal-200 text-sm">No fines recorded in this date range</div>
      )}
    </>
  );
}
