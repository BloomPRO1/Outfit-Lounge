import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart2, TrendingUp, Package, AlertTriangle, Download, AlertCircle } from 'lucide-react';
import { reportService } from '@/services/reportService';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Select from '@/components/common/Select';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/utils/cn';

const TABS = [
  { key: 'overview',   label: 'Overview',   icon: BarChart2 },
  { key: 'sales',      label: 'Sales',      icon: TrendingUp },
  { key: 'rentals',    label: 'Rentals',    icon: Package },
  { key: 'inventory',  label: 'Inventory',  icon: Package },
  { key: 'fines',      label: 'Fines',      icon: AlertTriangle },
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
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // All queries run unconditionally — no `enabled` gates that can get stuck
  const {
    data: revenueData,
    isLoading: revenueLoading,
    error: revenueError,
  } = useQuery({
    queryKey: ['revenue-chart', period],
    queryFn: () => reportService.getRevenueChart(period),
    staleTime: 60_000,
  });

  const {
    data: salesData,
    isLoading: salesLoading,
    error: salesError,
  } = useQuery({
    queryKey: ['sales-report', dateFrom, dateTo],
    queryFn: () => reportService.getSalesReport({ fromDate: dateFrom, toDate: dateTo }),
    staleTime: 60_000,
  });

  const {
    data: rentalData,
    isLoading: rentalLoading,
    error: rentalError,
  } = useQuery({
    queryKey: ['rental-report', dateFrom, dateTo],
    queryFn: () => reportService.getRentalReport({ fromDate: dateFrom, toDate: dateTo }),
    staleTime: 60_000,
  });

  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    error: inventoryError,
  } = useQuery({
    queryKey: ['inventory-report'],
    queryFn: () => reportService.getInventoryReport(),
    staleTime: 60_000,
  });

  const exportCSV = (data: any[], filename: string) => {
    if (!data?.length) return;
    const keys = Object.keys(data[0]);
    const csv = [
      keys.join(','),
      ...data.map((row) => keys.map((k) => `"${row[k] ?? ''}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h2 className="page-title">Reports & Analytics</h2>
          <p className="text-charcoal-200 text-sm">Business insights and performance metrics</p>
        </div>
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
      {(activeTab === 'sales' || activeTab === 'rentals' || activeTab === 'fines') && (
        <Card>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-charcoal-200 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-dark h-9 px-3 text-sm rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs text-charcoal-200 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-dark h-9 px-3 text-sm rounded-xl"
              />
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
            <>
              <LoadingCards count={4} />
              <div className="h-56 bg-charcoal-600 rounded-2xl animate-pulse" />
            </>
          ) : salesData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Sales',   value: salesData.summary?.totalSales     || 0, fmt: 'n' },
                  { label: 'Total Revenue', value: salesData.summary?.totalRevenue   || 0, fmt: 'c' },
                  { label: 'Avg Sale Value',value: salesData.summary?.avgSaleValue   || 0, fmt: 'c' },
                  { label: 'Items Sold',    value: salesData.summary?.totalItemsSold || 0, fmt: 'n' },
                ].map(({ label, value, fmt }) => (
                  <Card key={label}>
                    <p className="text-xs text-charcoal-200">{label}</p>
                    <p className="text-xl font-bold text-charcoal-50 mt-1">
                      {fmt === 'c' ? formatCurrency(value) : value}
                    </p>
                  </Card>
                ))}
              </div>

              {salesData.topProducts?.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-charcoal-100">Top Selling Products</h4>
                    <Button variant="ghost" size="sm" icon={<Download size={13} />} onClick={() => exportCSV(salesData.topProducts, 'top_products')}>
                      Export
                    </Button>
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
              )}

              {salesData.paymentMethods?.length > 0 && (
                <Card>
                  <h4 className="text-sm font-semibold text-charcoal-100 mb-4">Payment Methods</h4>
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={salesData.paymentMethods}
                          dataKey="total_amount"
                          nameKey="payment_method"
                          cx="50%" cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={{ stroke: '#7a7a8c' }}
                        >
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
            <>
              <LoadingCards count={4} />
              <div className="h-48 bg-charcoal-600 rounded-2xl animate-pulse" />
            </>
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
                    <p className="text-xl font-bold text-charcoal-50 mt-1">
                      {fmt === 'c' ? formatCurrency(value) : `${value}${suffix}`}
                    </p>
                  </Card>
                ))}
              </div>

              {rentalData.statusBreakdown?.length > 0 && (
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
              )}

              {rentalData.topProducts?.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-charcoal-100">Most Rented Items</h4>
                    <Button variant="ghost" size="sm" icon={<Download size={13} />} onClick={() => exportCSV(rentalData.topProducts, 'top_rentals')}>
                      Export
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {rentalData.topProducts.slice(0, 8).map((p: any, i: number) => (
                      <div key={p.product_name} className="flex items-center gap-3 p-2.5 bg-charcoal-600/40 rounded-xl">
                        <span className="w-6 text-center text-xs font-bold text-charcoal-300">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-charcoal-50">{p.product_name}</p>
                        </div>
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

          {inventoryLoading ? (
            <>
              <LoadingCards count={4} />
              <div className="h-48 bg-charcoal-600 rounded-2xl animate-pulse" />
            </>
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
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-charcoal-100">Stock by Category</h4>
                    <Button variant="ghost" size="sm" icon={<Download size={13} />} onClick={() => exportCSV(inventoryData.byCategory, 'inventory_by_category')}>
                      Export
                    </Button>
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
    </div>
  );
}

function FinesTab({
  rentalData,
  rentalLoading,
  rentalError,
  exportCSV,
}: {
  rentalData: any;
  rentalLoading: boolean;
  rentalError: any;
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
            { label: 'Total Fines Issued', value: fs?.totalFinesIssued  || 0, fmt: 'n', color: 'text-charcoal-50' },
            { label: 'Total Fine Amount',  value: fs?.totalFineAmount   || 0, fmt: 'c', color: 'text-red-400' },
            { label: 'Collected',          value: fs?.totalCollected    || 0, fmt: 'c', color: 'text-emerald-400' },
          ].map(({ label, value, fmt, color }) => (
            <Card key={label}>
              <p className="text-xs text-charcoal-200">{label}</p>
              <p className={`text-xl font-bold mt-1 ${color}`}>
                {fmt === 'c' ? formatCurrency(value) : value}
              </p>
            </Card>
          ))}
        </div>
      )}

      {rentalData?.topOffenders?.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-charcoal-100">Top Late Returners</h4>
            <Button variant="ghost" size="sm" icon={<Download size={13} />} onClick={() => exportCSV(rentalData.topOffenders, 'late_returners')}>
              Export
            </Button>
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
