import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, Plus, Trash2,
  BarChart2, ChevronDown, FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { analyticsService } from '@/services/analyticsService';
import StatCard from '@/components/common/StatCard';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import {
  createDoc, loadLogo, addHeader, addFooter,
  addSectionTitle, addStatCards, addTable, captureChart, addChartImage,
} from '@/utils/reportPDF';

const CATEGORY_LABELS: Record<string, string> = {
  stock_purchase: 'Stock Purchase',
  equipment: 'Equipment',
  rent: 'Rent',
  utilities: 'Utilities',
  salaries: 'Salaries',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  stock_purchase: '#60a5fa',
  equipment: '#a78bfa',
  rent: '#fb923c',
  utilities: '#facc15',
  salaries: '#f472b6',
  other: '#94a3b8',
};

const CHART_COLORS = {
  revenue: '#c9a96e',
  capital: '#60a5fa',
  profit_pos: '#4ade80',
  profit_neg: '#f87171',
};

const QUICK_RANGES = [
  { label: 'This Month', months: 0 },
  { label: 'Last 3M', months: 2 },
  { label: 'Last 6M', months: 5 },
  { label: 'This Year', months: -1 }, // special
  { label: 'Last 12M', months: 11 },
];

function getDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const d = new Date(now);
  d.setMonth(d.getMonth() - 11);
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { from, to };
}

function getQuickRange(months: number): { from: string; to: string } {
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (months === -1) {
    // This year
    const from = `${now.getFullYear()}-01`;
    return { from, to };
  }
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { from, to };
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-');
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

const customTooltipStyle = {
  backgroundColor: '#1a1a26',
  border: '1px solid #2a2a38',
  borderRadius: 8,
  color: '#f4f4f6',
};

export default function AnalyticsPage() {
  const qc = useQueryClient();
  const def = getDefaultRange();
  const [fromMonth, setFromMonth] = useState(def.from);
  const [toMonth, setToMonth] = useState(def.to);
  const [activeQuick, setActiveQuick] = useState('Last 12M');
  const [showAddForm, setShowAddForm] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Chart refs for PDF capture
  const barChartRef    = useRef<HTMLDivElement>(null);
  const lineChartRef   = useRef<HTMLDivElement>(null);
  const donutChartRef  = useRef<HTMLDivElement>(null);
  const [addForm, setAddForm] = useState({
    amount: '',
    category: 'stock_purchase',
    note: '',
    investedAt: new Date().toISOString().split('T')[0],
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', fromMonth, toMonth],
    queryFn: () => analyticsService.getData(fromMonth, toMonth),
    refetchInterval: 60_000,
  });

  const { data: capitalList, isLoading: capitalLoading } = useQuery({
    queryKey: ['analytics-capital', fromMonth, toMonth],
    queryFn: () => analyticsService.listCapital({ fromDate: `${fromMonth}-01`, toDate: `${toMonth}-31` }),
  });

  const addMutation = useMutation({
    mutationFn: analyticsService.addCapital,
    onSuccess: () => {
      toast.success('Expense recorded');
      setShowAddForm(false);
      setAddForm({ amount: '', category: 'stock_purchase', note: '', investedAt: new Date().toISOString().split('T')[0] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['analytics-capital'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: analyticsService.deleteCapital,
    onSuccess: () => {
      toast.success('Expense deleted');
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['analytics-capital'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to delete'),
  });

  const handleQuick = (label: string, months: number) => {
    setActiveQuick(label);
    const r = getQuickRange(months);
    setFromMonth(r.from);
    setToMonth(r.to);
  };

  const handleCustomRange = (field: 'from' | 'to', value: string) => {
    setActiveQuick('');
    if (field === 'from') setFromMonth(value);
    else setToMonth(value);
  };

  const handleAddSubmit = () => {
    if (!addForm.amount || parseFloat(addForm.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    addMutation.mutate({
      amount: parseFloat(addForm.amount),
      category: addForm.category,
      note: addForm.note || undefined,
      investedAt: addForm.investedAt,
    });
  };

  const { summary, monthlyData = [], capitalByCategory = [] } = analytics || {};

  // Build chart data with formatted month labels
  const chartData = monthlyData.map((row: any) => ({
    ...row,
    label: monthLabel(row.month),
    profit: row.profit,
  }));

  // Cumulative profit
  let cum = 0;
  const cumulativeData = chartData.map((row: any) => {
    cum += row.profit;
    return { label: row.label, cumulative: Math.round(cum) };
  });

  const netProfit = summary?.netProfit ?? 0;
  const isProfit = netProfit >= 0;

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const doc = createDoc();
      const logo = await loadLogo();
      const periodLabel = `${fromMonth} — ${toMonth}`;

      let y = await addHeader(doc, logo, 'Analytics Report (P&L)', periodLabel);

      y = addSectionTitle(doc, 'Summary', y);
      y = addStatCards(doc, [
        { label: 'Total Revenue',  value: formatCurrency(summary?.totalRevenue ?? 0) },
        { label: 'Total Expenses', value: formatCurrency(summary?.totalCapital ?? 0) },
        { label: 'Net Profit',     value: formatCurrency(Math.abs(netProfit)),    color: isProfit ? [50, 180, 100] : [200, 70, 70] },
        { label: 'Profit Margin',  value: `${summary?.profitMarginPct ?? 0}%`,    color: isProfit ? [50, 180, 100] : [200, 70, 70] },
      ], y);

      if (barChartRef.current) {
        y = addSectionTitle(doc, 'Revenue vs Business Expenses', y);
        const img = await captureChart(barChartRef.current);
        if (img) y = await addChartImage(doc, img, y, 70);
      }

      if (lineChartRef.current) {
        y = addSectionTitle(doc, 'Cumulative Profit', y);
        const img = await captureChart(lineChartRef.current);
        if (img) y = await addChartImage(doc, img, y, 55);
      }

      if (donutChartRef.current) {
        y = addSectionTitle(doc, 'Capital by Category', y);
        const img = await captureChart(donutChartRef.current);
        if (img) y = await addChartImage(doc, img, y, 55);
      }

      if (chartData.length > 0) {
        y = addSectionTitle(doc, 'Monthly Breakdown', y);
        y = addTable(doc,
          ['Month', 'Revenue (LKR)', 'Expenses (LKR)', 'Profit (LKR)'],
          chartData.map((r: any) => [
            r.label,
            formatCurrency(r.revenue || 0),
            formatCurrency(r.capital || 0),
            formatCurrency(r.profit || 0),
          ]),
          y,
        );
      }

      if (capitalList?.data?.length) {
        y = addSectionTitle(doc, 'Business Expenses', y);
        addTable(doc,
          ['Date', 'Category', 'Note', 'Amount (LKR)'],
          capitalList.data.map((inv: any) => [
            formatDate(inv.invested_at),
            CATEGORY_LABELS[inv.category] || inv.category,
            inv.note || '',
            formatCurrency(parseFloat(inv.amount)),
          ]),
          y,
        );
      }

      addFooter(doc);
      doc.save(`analytics_${fromMonth}_to_${toMonth}.pdf`);
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gold-700/20">
            <BarChart2 size={22} className="text-gold-400" />
          </div>
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="text-sm text-charcoal-200">P&L · Revenue vs Capital · Profit trends</p>
          </div>
        </div>
        <Button variant="secondary" icon={<FileDown size={14} />} onClick={downloadPDF} loading={pdfLoading}>
          Download PDF
        </Button>
      </div>

      {/* Period selector */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-charcoal-200 font-medium">Period:</span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_RANGES.map(({ label, months }) => (
              <button
                key={label}
                onClick={() => handleQuick(label, months)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  activeQuick === label
                    ? 'bg-gold-gradient text-charcoal-900'
                    : 'bg-charcoal-600 text-charcoal-200 hover:bg-charcoal-500 hover:text-charcoal-50'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-charcoal-300">From</span>
            <input
              type="month"
              value={fromMonth}
              onChange={(e) => handleCustomRange('from', e.target.value)}
              className="bg-charcoal-700 border border-charcoal-500 rounded-lg px-2 py-1.5 text-xs text-charcoal-100 focus:ring-1 focus:ring-gold-600 outline-none"
            />
            <span className="text-xs text-charcoal-300">To</span>
            <input
              type="month"
              value={toMonth}
              onChange={(e) => handleCustomRange('to', e.target.value)}
              className="bg-charcoal-700 border border-charcoal-500 rounded-lg px-2 py-1.5 text-xs text-charcoal-100 focus:ring-1 focus:ring-gold-600 outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(summary?.totalRevenue ?? 0)}
          icon={<TrendingUp size={20} />}
          color="gold"
          loading={isLoading}
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(summary?.totalCapital ?? 0)}
          icon={<Wallet size={20} />}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(Math.abs(netProfit))}
          icon={isProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          color={isLoading ? 'gold' : isProfit ? 'green' : 'red'}
          loading={isLoading}
        />
        <StatCard
          title="Profit Margin"
          value={isLoading ? '—' : `${summary?.profitMarginPct ?? 0}%`}
          icon={<BarChart2 size={20} />}
          color={isLoading ? 'gold' : (summary?.profitMarginPct ?? 0) >= 0 ? 'green' : 'red'}
          loading={isLoading}
        />
      </div>

      {/* Revenue vs Capital Bar Chart */}
      <div ref={barChartRef}>
      <Card>
        <h3 className="font-semibold text-charcoal-50 mb-5">Revenue vs Business Expenses</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#7a7a8c', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#7a7a8c', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                contentStyle={customTooltipStyle}
                formatter={(v: number, name: string) => [
                  formatCurrency(v),
                  name === 'revenue' ? 'Revenue' : name === 'capital' ? 'Expenses' : 'Profit',
                ]}
              />
              <Legend formatter={(v) => v === 'revenue' ? 'Revenue' : v === 'capital' ? 'Expenses' : 'Profit'} />
              <Bar dataKey="revenue" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="capital" fill={CHART_COLORS.capital} radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {chartData.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.profit >= 0 ? CHART_COLORS.profit_pos : CHART_COLORS.profit_neg} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-charcoal-200 text-sm">
            No data for this period
          </div>
        )}
      </Card>
      </div>

      {/* Cumulative Profit + Category Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative profit line */}
        <div ref={lineChartRef}>
        <Card>
          <h3 className="font-semibold text-charcoal-50 mb-5">Cumulative Profit</h3>
          {cumulativeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
                <XAxis dataKey="label" tick={{ fill: '#7a7a8c', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#7a7a8c', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(v: number) => [formatCurrency(v), 'Cumulative Profit']}
                />
                <Line
                  type="monotone" dataKey="cumulative"
                  stroke={cumulativeData[cumulativeData.length - 1]?.cumulative >= 0 ? '#4ade80' : '#f87171'}
                  strokeWidth={2.5} dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-charcoal-200 text-sm">No data</div>
          )}
        </Card>
        </div>

        {/* Capital by category donut */}
        <div ref={donutChartRef}>
        <Card>
          <h3 className="font-semibold text-charcoal-50 mb-5">Capital by Category</h3>
          {capitalByCategory.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={capitalByCategory}
                    dataKey="total"
                    nameKey="category"
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={3}
                  >
                    {capitalByCategory.map((entry: any) => (
                      <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(v: number, name: string) => [formatCurrency(v), CATEGORY_LABELS[name] || name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {capitalByCategory.map((entry: any) => (
                  <div key={entry.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: CATEGORY_COLORS[entry.category] || '#94a3b8' }}
                      />
                      <span className="text-charcoal-200 text-xs">{CATEGORY_LABELS[entry.category]}</span>
                    </div>
                    <span className="text-charcoal-50 text-xs font-medium">{formatCurrency(entry.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-charcoal-200 text-sm">
              No capital investments recorded yet
            </div>
          )}
        </Card>
        </div>
      </div>

      {/* Capital Investments table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-charcoal-50">Business Expenses</h3>
          <Button
            variant="primary"
            size="sm"
            icon={showAddForm ? <ChevronDown size={14} /> : <Plus size={14} />}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : 'Add Expense'}
          </Button>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="p-4 bg-charcoal-700/50 border border-charcoal-500 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Amount (LKR)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={addForm.amount}
                    onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                    placeholder="e.g. 50000"
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-charcoal-200">Category</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(CATEGORY_LABELS).map(([val, lbl]) => (
                        <button key={val} type="button" onClick={() => setAddForm({ ...addForm, category: val })}
                          className={cn('px-2 py-2 rounded-xl border-2 text-xs font-medium transition-all text-center',
                            addForm.category === val ? 'border-gold-500 bg-gold-700/15 text-gold-400' : 'border-charcoal-500 text-charcoal-300 hover:border-charcoal-400 hover:text-charcoal-100'
                          )}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                  <Input
                    label="Note (optional)"
                    value={addForm.note}
                    onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                    placeholder="e.g. Bought 20 blazers"
                  />
                  <Input
                    label="Date"
                    type="date"
                    value={addForm.investedAt}
                    onChange={(e) => setAddForm({ ...addForm, investedAt: e.target.value })}
                  />
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" onClick={handleAddSubmit} loading={addMutation.isPending}>
                    Save Expense
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Investments table */}
        {capitalLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-charcoal-600 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : capitalList?.data?.length ? (
          <div className="space-y-2">
            {capitalList.data.map((inv: any) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-charcoal-700/50 hover:bg-charcoal-700 transition-colors"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: CATEGORY_COLORS[inv.category] || '#94a3b8' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: `${CATEGORY_COLORS[inv.category]}22`,
                        color: CATEGORY_COLORS[inv.category] || '#94a3b8',
                      }}
                    >
                      {CATEGORY_LABELS[inv.category]}
                    </span>
                    {inv.note && <span className="text-xs text-charcoal-200 truncate">{inv.note}</span>}
                  </div>
                  <p className="text-xs text-charcoal-300 mt-0.5">
                    {formatDate(inv.invested_at)}
                    {inv.created_by_name && <span className="ml-2">by {inv.created_by_name}</span>}
                  </p>
                </div>
                <span className="text-sm font-semibold text-blue-400 flex-shrink-0">
                  {formatCurrency(parseFloat(inv.amount))}
                </span>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this investment record?')) deleteMutation.mutate(inv.id);
                  }}
                  className="text-charcoal-300 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-charcoal-200 text-center py-10">
            No business expenses recorded for this period.
            <br />
            <span className="text-xs text-charcoal-300">Add an expense above to track your business costs.</span>
          </p>
        )}
      </Card>
    </div>
  );
}
