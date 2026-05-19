import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, Package, RotateCcw, AlertTriangle,
  Calendar, Plus, ShoppingCart, ArrowRight,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { reportService } from '@/services/reportService';
import StatCard from '@/components/common/StatCard';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { formatCurrency, formatDate, STATUS_LABELS } from '@/utils/formatters';

const CHART_COLORS = { gold: '#c9a96e', blue: '#60a5fa', green: '#4ade80' };

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: reportService.getDashboard,
    refetchInterval: 60_000,
  });

  const { data: chartData } = useQuery({
    queryKey: ['revenue-chart', 'month'],
    queryFn: () => reportService.getRevenueChart('month'),
    refetchInterval: 60_000,
  });

  // Server returns { chartData: [{label, sales_revenue, rental_revenue}], summary }
  const mergedChart = (() => {
    const rows: any[] = chartData?.chartData || [];
    return rows.slice(-14).map((row: any) => ({
      date: new Date(row.label + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: row.sales_revenue || 0,
      rentals: row.rental_revenue || 0,
    }));
  })();

  const customTooltipStyle = {
    backgroundColor: '#1a1a26',
    border: '1px solid #2a2a38',
    borderRadius: 8,
    color: '#f4f4f6',
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats?.todayRevenue ?? 0)}
          icon={<TrendingUp size={20} />}
          color="gold"
          loading={isLoading}
          onClick={() => navigate('/reports')}
        />
        <StatCard
          title="Active Rentals"
          value={stats?.activeRentals ?? '—'}
          icon={<Calendar size={20} />}
          color="blue"
          loading={isLoading}
          onClick={() => navigate('/rentals')}
        />
        <StatCard
          title="Pending Returns"
          value={stats?.pendingReturns ?? '—'}
          icon={<RotateCcw size={20} />}
          color={stats?.pendingReturns ? 'red' : 'green'}
          loading={isLoading}
          onClick={() => navigate('/returns')}
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.lowStockCount ?? '—'}
          icon={<AlertTriangle size={20} />}
          color={stats?.lowStockCount ? 'red' : 'green'}
          loading={isLoading}
          onClick={() => navigate('/inventory')}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-charcoal-50">Quick Actions</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" icon={<ShoppingCart size={16} />} onClick={() => navigate('/pos')}>
            New Sale
          </Button>
          <Button variant="secondary" icon={<Calendar size={16} />} onClick={() => navigate('/rentals/new')}>
            New Rental
          </Button>
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => navigate('/customers')}>
            Add Customer
          </Button>
          <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={() => navigate('/returns')}>
            Process Return
          </Button>
          <Button variant="secondary" icon={<Package size={16} />} onClick={() => navigate('/products/new')}>
            Add Product
          </Button>
        </div>
      </Card>

      {/* Revenue Chart */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-charcoal-50">Revenue — Last 14 Days</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
            Full Report <ArrowRight size={14} />
          </Button>
        </div>
        {mergedChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mergedChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
              <XAxis dataKey="date" tick={{ fill: '#7a7a8c', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7a7a8c', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `LKR${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`}
              />
              <Tooltip contentStyle={customTooltipStyle}
                formatter={(v: number, name: string) => [formatCurrency(v), name === 'sales' ? 'Sales' : 'Rentals']}
              />
              <Legend formatter={(v) => v === 'sales' ? 'Sales' : 'Rentals'} />
              <Line type="monotone" dataKey="sales" stroke={CHART_COLORS.gold} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rentals" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-charcoal-200 text-sm">
            No revenue data yet
          </div>
        )}
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-charcoal-50">Recent Bookings</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/rentals')}>
              View All <ArrowRight size={14} />
            </Button>
          </div>
          <div className="space-y-2">
            {stats?.recentBookings?.length ? stats.recentBookings.map((rental: any) => (
              <motion.div
                key={rental.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-3 rounded-xl bg-charcoal-600/50 hover:bg-charcoal-600 transition-colors cursor-pointer"
                onClick={() => navigate(`/rentals/${rental.id}`)}
              >
                <div>
                  <p className="text-sm font-medium text-charcoal-50">{rental.customer_name}</p>
                  <p className="text-xs text-charcoal-200">{rental.booking_number}</p>
                </div>
                <div className="text-right">
                  <Badge status={rental.status} />
                  <p className="text-xs text-charcoal-200 mt-1">{formatDate(rental.rental_start_date)}</p>
                </div>
              </motion.div>
            )) : (
              <p className="text-sm text-charcoal-200 text-center py-8">No recent bookings</p>
            )}
          </div>
        </Card>

        {/* Upcoming Returns */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-charcoal-50">Upcoming Returns</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/returns')}>
              View All <ArrowRight size={14} />
            </Button>
          </div>
          <div className="space-y-2">
            {stats?.upcomingReturns?.length ? stats.upcomingReturns.map((rental: any) => (
              <motion.div
                key={rental.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer ${
                  rental.days_overdue > 0 ? 'bg-red-500/10 hover:bg-red-500/15 border border-red-500/20' : 'bg-charcoal-600/50 hover:bg-charcoal-600'
                }`}
                onClick={() => navigate(`/rentals/${rental.id}`)}
              >
                <div>
                  <p className="text-sm font-medium text-charcoal-50">{rental.customer_name}</p>
                  <p className="text-xs text-charcoal-200">{rental.booking_number}</p>
                </div>
                <div className="text-right">
                  {rental.days_overdue > 0 ? (
                    <span className="text-xs font-medium text-red-400">{rental.days_overdue}d overdue</span>
                  ) : (
                    <span className="text-xs text-charcoal-200">Due {formatDate(rental.rental_end_date)}</span>
                  )}
                </div>
              </motion.div>
            )) : (
              <p className="text-sm text-charcoal-200 text-center py-8">No upcoming returns</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
