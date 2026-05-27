import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Package, CreditCard, Bell, RotateCcw, CheckCircle,
  ChevronRight, CalendarCheck, PackageCheck, PackageOpen,
  CheckCircle2, XCircle, Clock, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { rentalService } from '@/services/rentalService';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Drawer from '@/components/common/Drawer';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import { formatCurrency, formatDate, formatDateTime, STATUS_LABELS } from '@/utils/formatters';
import { cn } from '@/utils/cn';

// ─── Workflow Definition ──────────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  {
    key: 'reserved',
    label: 'Reserved',
    icon: CalendarCheck,
    color: 'blue',
    desc: 'Booking confirmed',
  },
  {
    key: 'ready_for_pickup',
    label: 'Ready',
    icon: PackageCheck,
    color: 'purple',
    desc: 'Items prepared',
  },
  {
    key: 'picked_up',
    label: 'Picked Up',
    icon: PackageOpen,
    color: 'amber',
    desc: 'Items with customer',
  },
  {
    key: 'returned',
    label: 'Returned',
    icon: RotateCcw,
    color: 'green',
    desc: 'Items back in store',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    color: 'emerald',
    desc: 'Booking closed',
  },
] as const;

type WorkflowKey = typeof WORKFLOW_STEPS[number]['key'];

const STEP_COLORS: Record<string, { ring: string; bg: string; icon: string; line: string }> = {
  blue:    { ring: 'border-blue-500',    bg: 'bg-blue-500/15',    icon: 'text-blue-400',    line: 'bg-blue-500' },
  purple:  { ring: 'border-purple-500',  bg: 'bg-purple-500/15',  icon: 'text-purple-400',  line: 'bg-purple-500' },
  amber:   { ring: 'border-amber-500',   bg: 'bg-amber-500/15',   icon: 'text-amber-400',   line: 'bg-amber-500' },
  green:   { ring: 'border-green-500',   bg: 'bg-green-500/15',   icon: 'text-green-400',   line: 'bg-green-500' },
  emerald: { ring: 'border-emerald-500', bg: 'bg-emerald-500/15', icon: 'text-emerald-400', line: 'bg-emerald-500' },
};

const MAIN_STEP_KEYS = WORKFLOW_STEPS.map(s => s.key);

function getStepIndex(status: string): number {
  // late_return is between picked_up and returned
  if (status === 'late_return') return MAIN_STEP_KEYS.indexOf('returned');
  return MAIN_STEP_KEYS.indexOf(status as WorkflowKey);
}

// ─── Next action labels ───────────────────────────────────────────────────────
const NEXT_ACTION_LABELS: Record<string, string> = {
  ready_for_pickup: 'Mark as Ready for Pickup',
  picked_up:        'Mark as Picked Up',
  returned:         'Process Return',
  late_return:      'Mark as Late Return',
  completed:        'Complete Booking',
  cancelled:        'Cancel Booking',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  reserved:        ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['picked_up', 'cancelled'],
  picked_up:       ['returned', 'late_return'],
  late_return:     ['returned'],
  returned:        ['completed'],
};

export default function RentalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [payment, setPayment] = useState({ amount: '', paymentMethod: 'cash', paymentType: 'balance', notes: '' });

  const { data: rental, isLoading } = useQuery({
    queryKey: ['rental', id],
    queryFn: () => rentalService.getById(id!),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, notes, pickupTime: pt }: { status: string; notes?: string; pickupTime?: string }) =>
      rentalService.updateStatus(id!, status, notes, pt),
    onSuccess: () => {
      toast.success('Status updated!');
      setConfirmStatus(null);
      setStatusNotes('');
      setPickupTime('');
      qc.invalidateQueries({ queryKey: ['rental', id] });
      qc.invalidateQueries({ queryKey: ['rentals'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update status'),
  });

  const addPaymentMutation = useMutation({
    mutationFn: (payload: any) => rentalService.addPayment(id!, payload),
    onSuccess: () => {
      toast.success('Payment recorded!');
      setShowPaymentModal(false);
      setPayment({ amount: '', paymentMethod: 'cash', paymentType: 'balance', notes: '' });
      qc.invalidateQueries({ queryKey: ['rental', id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to record payment'),
  });

  const sendReminderMutation = useMutation({
    mutationFn: () => api.post(`/rentals/${id}/send-reminder`),
    onSuccess: () => toast.success('Return reminder sent!'),
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to send reminder'),
  });

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-charcoal-600 rounded-2xl animate-pulse" />)}</div>;
  }
  if (!rental) return <div className="text-charcoal-200">Rental not found.</div>;

  const nextStatuses = STATUS_TRANSITIONS[rental.status] || [];
  const isCancelled = rental.status === 'cancelled';
  const isTerminal = rental.status === 'completed' || isCancelled;
  const currentStepIdx = getStepIndex(rental.status);

  const totalPaid = (rental.payments || []).reduce((sum: number, p: any) => {
    return p.payment_type !== 'refund' ? sum + parseFloat(p.amount) : sum - parseFloat(p.amount);
  }, 0);
  const netCost = Number(rental.total_rental_cost) - Number(rental.discount_amount || 0);
  const balanceDue = Math.max(0, netCost - totalPaid + Number(rental.total_fine || 0));

  function handleAction(status: string) {
    if (status === 'returned' || status === 'late_return') {
      if (status === 'returned') {
        navigate(`/returns?rental=${id}`);
        return;
      }
    }
    setConfirmStatus(status);
  }

  // ── Main next actions (excluding cancel) ──────────────────────────────────
  const primaryNext = nextStatuses.filter(s => s !== 'cancelled');
  const canCancel   = nextStatuses.includes('cancelled');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/rentals')}>Back</Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="page-title">{rental.booking_number}</h2>
            {rental.event_type && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-charcoal-600/50 text-charcoal-200 border border-charcoal-500/30">
                {rental.event_type}
              </span>
            )}
          </div>
          <p className="text-sm text-charcoal-300 mt-0.5">{rental.customer_name} · {formatDate(rental.rental_start_date)} → {formatDate(rental.rental_end_date)}</p>
        </div>
        <Button variant="primary" icon={<CreditCard size={15} />} onClick={() => setShowPaymentModal(true)}>
          Add Payment
        </Button>
      </div>

      {/* ── Visual Workflow Pipeline ────────────────────────────────────────── */}
      {!isCancelled ? (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-sm font-semibold text-charcoal-100">Rental Workflow</h4>
            {rental.status === 'late_return' && (
              <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-900/20 border border-red-700/30 px-2.5 py-1 rounded-lg">
                <AlertTriangle size={11} /> Late Return
              </span>
            )}
          </div>

          {/* Steps */}
          <div className="relative flex items-start justify-between">
            {WORKFLOW_STEPS.map((step, i) => {
              const isCompleted = currentStepIdx > i || rental.status === 'completed';
              const isCurrent   = currentStepIdx === i && !isTerminal;
              const isPast      = currentStepIdx > i;
              const isFuture    = currentStepIdx < i && !isTerminal;
              const colors      = STEP_COLORS[step.color];
              const Icon        = step.icon;

              return (
                <div key={step.key} className="flex flex-col items-center flex-1 relative">
                  {/* Connector line (left side) */}
                  {i > 0 && (
                    <div className="absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2" style={{ left: '-50%' }}>
                      <div className={cn(
                        'h-full transition-all duration-500',
                        isPast || (isCurrent && i > 0) ? colors.line : 'bg-charcoal-600'
                      )} />
                    </div>
                  )}

                  {/* Node */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="relative z-10"
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                      isCompleted || (rental.status === 'completed')
                        ? `${colors.ring} ${colors.bg}`
                        : isCurrent
                        ? `${colors.ring} ${colors.bg} shadow-lg`
                        : 'border-charcoal-500 bg-charcoal-700'
                    )}>
                      {(isPast || rental.status === 'completed') ? (
                        <CheckCircle2 size={18} className={colors.icon} />
                      ) : (
                        <Icon size={17} className={cn(
                          isCurrent ? colors.icon : 'text-charcoal-400'
                        )} />
                      )}
                    </div>

                    {/* Pulsing ring for current step */}
                    {isCurrent && (
                      <span className={cn(
                        'absolute inset-0 rounded-full border-2 animate-ping opacity-40',
                        colors.ring
                      )} />
                    )}
                  </motion.div>

                  {/* Label */}
                  <div className="mt-2.5 text-center px-1">
                    <p className={cn(
                      'text-xs font-semibold leading-tight',
                      isCompleted || isCurrent ? 'text-charcoal-50' : 'text-charcoal-400'
                    )}>
                      {step.label}
                    </p>
                    <p className="text-xs text-charcoal-400 mt-0.5 hidden sm:block">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          {!isTerminal && (
            <div className="mt-6 pt-5 border-t border-charcoal-600/40 flex flex-wrap items-center gap-3">
              <span className="text-xs text-charcoal-300 mr-1">Next action:</span>

              {primaryNext.map(status => (
                status === 'returned' ? (
                  <Button
                    key={status}
                    variant="primary"
                    icon={<RotateCcw size={14} />}
                    onClick={() => navigate(`/returns?rental=${id}`)}
                  >
                    Process Return
                  </Button>
                ) : status === 'late_return' ? (
                  <Button
                    key={status}
                    onClick={() => handleAction(status)}
                    className="border border-red-500/40 bg-red-900/10 text-red-400 hover:bg-red-900/20 rounded-xl px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Clock size={14} /> Mark as Late Return
                  </Button>
                ) : (
                  <Button
                    key={status}
                    variant="primary"
                    icon={<ArrowRight size={14} />}
                    onClick={() => handleAction(status)}
                  >
                    {NEXT_ACTION_LABELS[status] || STATUS_LABELS[status]}
                  </Button>
                )
              ))}

              {canCancel && (
                <Button
                  variant="ghost"
                  onClick={() => handleAction('cancelled')}
                  className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-900/10"
                  icon={<XCircle size={14} />}
                >
                  Cancel Booking
                </Button>
              )}
            </div>
          )}

          {rental.status === 'completed' && (
            <div className="mt-5 pt-4 border-t border-charcoal-600/40 flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle size={15} /> Booking completed successfully
            </div>
          )}
        </Card>
      ) : (
        /* Cancelled state banner */
        <div className="flex items-center gap-3 p-4 bg-charcoal-600/20 border border-charcoal-500/30 rounded-2xl">
          <XCircle size={20} className="text-charcoal-300 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-charcoal-100">Booking Cancelled</p>
            <p className="text-xs text-charcoal-400 mt-0.5">This rental was cancelled and cannot be modified.</p>
          </div>
        </div>
      )}

      {/* ── Main Grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Main Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer */}
          <Card>
            <h4 className="text-sm font-semibold text-charcoal-100 mb-3">Customer</h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold-700/20 border border-gold-700/30 flex items-center justify-center">
                <span className="text-gold-400 font-semibold">{rental.customer_name?.charAt(0)}</span>
              </div>
              <div>
                <p className="font-semibold text-charcoal-50">{rental.customer_name}</p>
                <div className="flex gap-3 mt-0.5">
                  {rental.customer_phone && <span className="text-xs text-charcoal-200">{rental.customer_phone}</span>}
                  {rental.customer_email && <span className="text-xs text-charcoal-200">{rental.customer_email}</span>}
                </div>
              </div>
              <Button variant="ghost" className="ml-auto" onClick={() => navigate(`/customers/${rental.customer_id}`)}>
                View Profile <ChevronRight size={14} />
              </Button>
            </div>
          </Card>

          {/* Dates */}
          <Card>
            <h4 className="text-sm font-semibold text-charcoal-100 mb-3">Rental Period</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-charcoal-200">Pickup Date</p>
                <p className="font-medium text-charcoal-50 mt-0.5">{formatDate(rental.rental_start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-200">Return Date</p>
                <p className="font-medium text-charcoal-50 mt-0.5">{formatDate(rental.rental_end_date)}</p>
              </div>
              {rental.actual_return_date && (
                <div>
                  <p className="text-xs text-charcoal-200">Actual Return</p>
                  <p className="font-medium text-charcoal-50 mt-0.5">{formatDate(rental.actual_return_date)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Items */}
          <Card>
            <h4 className="text-sm font-semibold text-charcoal-100 mb-3">Rental Items ({rental.items?.length || 0})</h4>
            <div className="space-y-2">
              {rental.items?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-charcoal-600/40 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-charcoal-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.product_image ? <img src={item.product_image} alt="" className="w-full h-full object-cover" /> : <Package size={16} className="text-charcoal-300" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal-50">{item.product_name}</p>
                    <p className="text-xs text-charcoal-200">{[item.size, item.color].filter(Boolean).join(' / ')} · {item.variant_sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-charcoal-100">×{item.quantity}</p>
                    <p className="text-xs text-charcoal-200">{formatCurrency(item.rental_price_per_day)}/day</p>
                  </div>
                  <div className="ml-2">
                    <Badge variant={item.is_returned ? 'success' : 'warning'}>{item.is_returned ? 'Returned' : 'Out'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Payments */}
          <Card>
            <h4 className="text-sm font-semibold text-charcoal-100 mb-3">Payments</h4>
            {rental.payments?.length ? (
              <div className="space-y-2">
                {rental.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-charcoal-600/40 rounded-xl">
                    <div>
                      <p className="text-sm text-charcoal-50 capitalize">{p.payment_type?.replace('_', ' ')}</p>
                      <p className="text-xs text-charcoal-200">{p.payment_method} · {formatDateTime(p.created_at)}</p>
                    </div>
                    <p className={`font-medium ${p.payment_type === 'refund' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {p.payment_type === 'refund' ? '-' : '+'}{formatCurrency(p.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-charcoal-200 text-center py-4">No payments recorded</p>}
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Financial Summary */}
          <Card gold>
            <h4 className="text-sm font-semibold text-charcoal-100 mb-3">Financial Summary</h4>
            <div className="space-y-2.5">
              {[
                { label: 'Total Rental Cost', value: formatCurrency(rental.total_rental_cost), color: 'text-charcoal-50' },
                { label: 'Discount', value: rental.discount_amount > 0 ? `-${formatCurrency(rental.discount_amount)}` : '—', color: 'text-emerald-400' },
                { label: 'Total Paid', value: formatCurrency(totalPaid), color: 'text-emerald-400' },
                ...(Number(rental.total_fine) > 0 ? [{ label: 'Fine', value: formatCurrency(rental.total_fine), color: 'text-red-400' }] : []),
                { label: 'Balance Due', value: formatCurrency(balanceDue), color: balanceDue > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-charcoal-200">{label}</span>
                  <span className={color}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Fines */}
          {(rental.fines?.length ?? 0) > 0 && (
            <Card>
              <h4 className="text-sm font-semibold text-red-400 mb-3">Late Fines</h4>
              {rental.fines?.map((fine: any) => (
                <div key={fine.id} className="text-sm">
                  <p className="text-charcoal-50">{fine.days_late} days overdue</p>
                  <p className="text-charcoal-200">{formatCurrency(fine.fine_per_day)}/day × {fine.days_late} = {formatCurrency(fine.total_fine)}</p>
                  <Badge variant={fine.is_paid ? 'success' : 'error'} className="mt-1">
                    {fine.is_paid ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>
              ))}
            </Card>
          )}

          {/* Actions */}
          <Card>
            <h4 className="text-sm font-semibold text-charcoal-100 mb-3">Actions</h4>
            <div className="space-y-2">
              {(rental.status === 'picked_up' || rental.status === 'late_return') && (
                <Button variant="secondary" className="w-full" icon={<RotateCcw size={14} />} onClick={() => navigate(`/returns?rental=${id}`)}>
                  Process Return
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full"
                icon={<Bell size={14} />}
                loading={sendReminderMutation.isPending}
                onClick={() => sendReminderMutation.mutate()}
              >
                Send Reminder
              </Button>
            </div>
          </Card>

          {/* Notes */}
          {rental.notes && (
            <Card>
              <h4 className="text-sm font-semibold text-charcoal-100 mb-2">Notes</h4>
              <p className="text-sm text-charcoal-200">{rental.notes}</p>
            </Card>
          )}
        </div>
      </div>

      {/* ── Confirm Status Modal ─────────────────────────────────────────────── */}
      <Modal
        open={!!confirmStatus}
        onClose={() => { setConfirmStatus(null); setStatusNotes(''); setPickupTime(''); }}
        title={confirmStatus ? (NEXT_ACTION_LABELS[confirmStatus] ?? 'Update Status') : ''}
        variant="dialog"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setConfirmStatus(null); setStatusNotes(''); setPickupTime(''); }}>Cancel</Button>
            <Button
              variant={confirmStatus === 'cancelled' ? 'secondary' : 'primary'}
              className={confirmStatus === 'cancelled' ? 'border-red-500/40 text-red-400 hover:bg-red-900/20' : ''}
              onClick={() => updateStatusMutation.mutate({ status: confirmStatus!, notes: statusNotes, pickupTime })}
              loading={updateStatusMutation.isPending}
            >
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {confirmStatus === 'cancelled' && (
            <div className="flex items-start gap-2.5 p-3 bg-red-900/20 border border-red-700/30 rounded-xl text-sm text-red-300">
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
              This will cancel the booking and restore all items to inventory.
            </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-charcoal-600/30 rounded-xl">
            <Badge status={rental.status} />
            <ArrowRight size={14} className="text-charcoal-400" />
            {confirmStatus && <Badge status={confirmStatus as any} />}
          </div>
          {confirmStatus === 'ready_for_pickup' && (
            <Input
              label="Pickup Time (optional)"
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              hint="This time will be included in the notification sent to the customer"
            />
          )}
          <Input
            label="Notes (optional)"
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
            placeholder="Any notes about this status change..."
          />
        </div>
      </Modal>

      {/* ── Payment Modal ────────────────────────────────────────────────────── */}
      <Drawer
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Add Payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => addPaymentMutation.mutate({ ...payment, amount: parseFloat(payment.amount) })}
              loading={addPaymentMutation.isPending}
              disabled={!payment.amount}
            >
              Record Payment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Amount (LKR)" type="number" step="0.01" min="0" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} placeholder="0.00" required />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-100">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'cash',           label: 'Cash' },
                { value: 'card',           label: 'Card' },
                { value: 'mobile_payment', label: 'Mobile Pay' },
                { value: 'bank_transfer',  label: 'Bank Transfer' },
              ].map(o => (
                <button key={o.value} type="button" onClick={() => setPayment({ ...payment, paymentMethod: o.value })}
                  className={cn('px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-center',
                    payment.paymentMethod === o.value ? 'border-gold-500 bg-gold-700/15 text-gold-400' : 'border-charcoal-500 text-charcoal-300 hover:border-charcoal-400 hover:text-charcoal-100'
                  )}>{o.label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-charcoal-100">Payment Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'balance', label: 'Balance' },
                { value: 'advance', label: 'Advance' },
                { value: 'fine',    label: 'Fine' },
                { value: 'refund',  label: 'Refund' },
              ].map(o => (
                <button key={o.value} type="button" onClick={() => setPayment({ ...payment, paymentType: o.value })}
                  className={cn('px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-center',
                    payment.paymentType === o.value ? 'border-gold-500 bg-gold-700/15 text-gold-400' : 'border-charcoal-500 text-charcoal-300 hover:border-charcoal-400 hover:text-charcoal-100'
                  )}>{o.label}</button>
              ))}
            </div>
          </div>
          <Input label="Notes" value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} placeholder="Optional notes..." />
        </div>
      </Drawer>
    </div>
  );
}
