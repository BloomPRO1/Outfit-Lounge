import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Calendar, Filter, List, Columns3 } from 'lucide-react';
import { rentalService } from '@/services/rentalService';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import SearchInput from '@/components/common/SearchInput';
import Select from '@/components/common/Select';
import Table from '@/components/common/Table';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { formatCurrency, formatDate, STATUS_LABELS } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import type { Rental } from '@/types';

const STATUSES = ['reserved', 'ready_for_pickup', 'picked_up', 'returned', 'late_return', 'completed', 'cancelled'];

const STATUS_COLS = [
  { key: 'reserved', label: 'Reserved', color: 'border-blue-500/40 bg-blue-500/5' },
  { key: 'ready_for_pickup', label: 'Ready', color: 'border-purple-500/40 bg-purple-500/5' },
  { key: 'picked_up', label: 'Picked Up', color: 'border-amber-500/40 bg-amber-500/5' },
  { key: 'late_return', label: 'Late', color: 'border-red-500/40 bg-red-500/5' },
  { key: 'returned', label: 'Returned', color: 'border-green-500/40 bg-green-500/5' },
  { key: 'completed', label: 'Completed', color: 'border-emerald-500/40 bg-emerald-500/5' },
];

export default function RentalsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'list' | 'kanban'>('list');

  const { data, isLoading } = useQuery({
    queryKey: ['rentals', { search, statusFilter, page }],
    queryFn: () => rentalService.getAll({
      search: search || undefined,
      status: statusFilter || undefined,
      page,
      limit: 20,
    }),
  });

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] || s })),
  ];

  const columns = [
    {
      key: 'booking',
      header: 'Booking',
      render: (r: Rental) => (
        <div>
          <p className="font-medium text-gold-500">{r.booking_number}</p>
          {r.event_type && <p className="text-xs text-charcoal-200">{r.event_type}</p>}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r: Rental) => (
        <div>
          <p className="text-charcoal-50 font-medium">{r.customer_name}</p>
          {r.customer_phone && <p className="text-xs text-charcoal-200">{r.customer_phone}</p>}
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Period',
      render: (r: Rental) => (
        <div>
          <p className="text-sm">{formatDate(r.rental_start_date)}</p>
          <p className="text-xs text-charcoal-200">→ {formatDate(r.rental_end_date)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: Rental) => <Badge status={r.status} />,
    },
    {
      key: 'items',
      header: 'Items',
      render: (r: any) => <span className="text-charcoal-100">{r.item_count || 0}</span>,
    },
    {
      key: 'amount',
      header: 'Total',
      render: (r: Rental) => (
        <div>
          <p className="font-medium text-charcoal-50">{formatCurrency(r.total_rental_cost)}</p>
          {r.total_fine > 0 && <p className="text-xs text-red-400">+{formatCurrency(r.total_fine)} fine</p>}
        </div>
      ),
    },
  ];

  // Kanban view
  const kanbanData = STATUS_COLS.map((col) => ({
    ...col,
    items: (data?.data || []).filter((r: Rental) => r.status === col.key),
  }));

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h2 className="page-title">Rentals</h2>
          <p className="text-charcoal-200 text-sm">{data?.pagination?.total || 0} total rentals</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/rentals/new')}>
          New Rental
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search booking, customer, phone..."
            className="flex-1 min-w-48"
          />
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-44"
          />
          <div className="hidden sm:flex rounded-xl border border-charcoal-400 overflow-hidden">
            <button onClick={() => setView('list')} className={cn('p-2.5 transition-colors', view === 'list' ? 'bg-charcoal-500 text-gold-400' : 'text-charcoal-200')}>
              <List size={16} />
            </button>
            <button onClick={() => setView('kanban')} className={cn('p-2.5 transition-colors', view === 'kanban' ? 'bg-charcoal-500 text-gold-400' : 'text-charcoal-200')}>
              <Columns3 size={16} />
            </button>
          </div>
        </div>
      </Card>

      {view === 'list' ? (
        <Card padding="none">
          <Table
            columns={columns}
            data={data?.data || []}
            loading={isLoading}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/rentals/${r.id}`)}
            emptyMessage="No rentals found"
          />
          {data?.pagination && (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              limit={data.pagination.limit}
              onPageChange={setPage}
            />
          )}
        </Card>
      ) : (
        <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-6 gap-4 min-w-[860px]">
          {kanbanData.map((col) => (
            <div key={col.key} className={`rounded-2xl border p-3 ${col.color}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-charcoal-50">{col.label}</p>
                <span className="text-xs bg-charcoal-600 text-charcoal-200 px-2 py-0.5 rounded-full">{col.items.length}</span>
              </div>
              <div className="space-y-2">
                {col.items.map((rental: Rental) => (
                  <motion.div
                    key={rental.id}
                    layout
                    className="bg-charcoal-700 border border-charcoal-500 rounded-xl p-3 cursor-pointer hover:border-gold-700/40 transition-colors"
                    onClick={() => navigate(`/rentals/${rental.id}`)}
                  >
                    <p className="text-xs font-medium text-gold-500">{rental.booking_number}</p>
                    <p className="text-sm font-medium text-charcoal-50 mt-1">{rental.customer_name}</p>
                    <p className="text-xs text-charcoal-200 mt-1">{formatDate(rental.rental_end_date)}</p>
                  </motion.div>
                ))}
                {col.items.length === 0 && (
                  <p className="text-xs text-charcoal-300 text-center py-4">Empty</p>
                )}
              </div>
            </div>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}
