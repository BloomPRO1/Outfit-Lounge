import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote, RefreshCw, CheckCircle, Users, TrendingUp, Clock,
  Edit2, X, Plus, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { hrService } from '@/services/hrService';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import StatCard from '@/components/common/StatCard';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-charcoal-500/40 text-charcoal-300 border-charcoal-400',
  processed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  paid:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin', manager: 'Manager', cashier: 'Cashier', inventory_staff: 'Staff',
};

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

interface DrawerProps {
  employeeId: string;
  period: string;
  onClose: () => void;
}

function PayrollEditDrawer({ employeeId, period, onClose }: DrawerProps) {
  const qc = useQueryClient();

  // Always read from live query so allowances list auto-updates
  const { data: payrollData } = useQuery({
    queryKey: ['payroll', period],
    queryFn: () => hrService.getPayroll(period),
  });
  const row: any = payrollData?.data?.find((r: any) => r.employee_id === employeeId) || {};

  const allowancesList: any[] = row.allowances_list || [];
  const isPaid = row.status === 'paid';

  const [deductions, setDeductions] = useState(() => String(parseFloat(row.deductions || 0)));
  const [notes, setNotes] = useState(() => row.notes || '');
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const allowancesTotal = allowancesList.reduce((s: number, a: any) => s + parseFloat(a.amount), 0);
  const baseSalary = parseFloat(row.base_salary || row.profile_salary || 0);
  const netPay = baseSalary + allowancesTotal - (parseFloat(deductions) || 0);

  const addMutation = useMutation({
    mutationFn: () => hrService.addAllowance(row.payroll_id, { label: newLabel, amount: parseFloat(newAmount) || 0 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll'] });
      setNewLabel('');
      setNewAmount('');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to add allowance'),
  });

  const delMutation = useMutation({
    mutationFn: (aId: string) => hrService.deleteAllowance(row.payroll_id, aId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const saveMutation = useMutation({
    mutationFn: () => hrService.updatePayrollRecord(row.payroll_id, {
      deductions: parseFloat(deductions) || 0,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Payroll record saved');
      qc.invalidateQueries({ queryKey: ['payroll'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to save'),
  });

  const canAddAllowance = newLabel.trim() && newAmount && !isPaid && !!row.payroll_id;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-md bg-charcoal-800 border-l border-charcoal-600 h-full overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-charcoal-600">
          <div>
            <h2 className="text-base font-semibold text-charcoal-50">Edit Payroll</h2>
            <p className="text-sm text-charcoal-300 mt-0.5">{row.name}</p>
            <p className="text-xs text-charcoal-400">
              {[ROLE_LABELS[row.role], row.department].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-charcoal-700 text-charcoal-300 hover:text-charcoal-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6">
          {/* Base Salary */}
          <div>
            <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-1">Base Salary</p>
            <p className="text-xl font-semibold text-charcoal-50">{formatCurrency(baseSalary)}</p>
          </div>

          {/* Allowances */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Allowances</p>
              {allowancesTotal > 0 && (
                <span className="text-xs text-emerald-400 font-medium">+{formatCurrency(allowancesTotal)}</span>
              )}
            </div>

            {/* Allowance list */}
            {allowancesList.length === 0 ? (
              <p className="text-xs text-charcoal-400 italic mb-3">No allowances added yet.</p>
            ) : (
              <div className="space-y-2 mb-3">
                {allowancesList.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between bg-charcoal-700/50 rounded-xl px-3 py-2.5">
                    <span className="text-sm text-charcoal-100">{a.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-400">{formatCurrency(parseFloat(a.amount))}</span>
                      {!isPaid && (
                        <button
                          onClick={() => delMutation.mutate(a.id)}
                          disabled={delMutation.isPending}
                          className="p-1 rounded-lg text-charcoal-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add allowance form */}
            {!isPaid && row.payroll_id && (
              <div className="flex gap-2">
                <input
                  placeholder="Label (e.g. Transport)"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && canAddAllowance) addMutation.mutate(); }}
                  className="flex-1 min-w-0 bg-charcoal-700 border border-charcoal-500 rounded-xl px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-400 focus:ring-2 focus:ring-gold-600 outline-none"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && canAddAllowance) addMutation.mutate(); }}
                  className="w-28 bg-charcoal-700 border border-charcoal-500 rounded-xl px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-400 focus:ring-2 focus:ring-gold-600 outline-none"
                />
                <button
                  onClick={() => addMutation.mutate()}
                  disabled={!canAddAllowance || addMutation.isPending}
                  className={cn(
                    'px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium',
                    canAddAllowance
                      ? 'bg-gold-700/30 text-gold-400 hover:bg-gold-700/50 border border-gold-700/50'
                      : 'bg-charcoal-700 text-charcoal-500 border border-charcoal-600 cursor-not-allowed'
                  )}
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Deductions */}
          <div>
            <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Deductions</p>
            {isPaid ? (
              <p className="text-sm text-charcoal-100">{formatCurrency(parseFloat(row.deductions || 0))}</p>
            ) : (
              <input
                type="number"
                min="0"
                step="0.01"
                value={deductions}
                onChange={e => setDeductions(e.target.value)}
                className="w-full bg-charcoal-700 border border-charcoal-500 rounded-xl px-3 py-2 text-sm text-charcoal-100 focus:ring-2 focus:ring-gold-600 outline-none"
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Notes</p>
            {isPaid ? (
              <p className="text-sm text-charcoal-300">{row.notes || '—'}</p>
            ) : (
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full bg-charcoal-700 border border-charcoal-500 rounded-xl px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-400 focus:ring-2 focus:ring-gold-600 outline-none resize-none"
              />
            )}
          </div>

          {/* Net Pay */}
          <div className="bg-charcoal-700/50 rounded-2xl p-4 border border-charcoal-600">
            <p className="text-xs text-charcoal-400 mb-1">Net Pay</p>
            <p className={cn('text-2xl font-bold', netPay >= 0 ? 'text-gold-400' : 'text-red-400')}>
              {formatCurrency(netPay)}
            </p>
            <p className="text-xs text-charcoal-400 mt-1">
              {formatCurrency(baseSalary)} base + {formatCurrency(allowancesTotal)} allowances − {formatCurrency(parseFloat(deductions) || 0)} deductions
            </p>
          </div>
        </div>

        {/* Footer */}
        {!isPaid && row.payroll_id && (
          <div className="p-5 border-t border-charcoal-600 flex gap-3">
            <Button
              variant="primary"
              className="flex-1"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Save Changes
            </Button>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        )}
        {isPaid && (
          <div className="p-5 border-t border-charcoal-600">
            <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState(currentPeriod());
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);

  const { data: payrollData, isLoading } = useQuery({
    queryKey: ['payroll', period],
    queryFn: () => hrService.getPayroll(period),
  });

  const generateMutation = useMutation({
    mutationFn: () => hrService.generatePayroll(period),
    onSuccess: (data) => { toast.success(data.message); qc.invalidateQueries({ queryKey: ['payroll'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const markPaidMutation = useMutation({
    mutationFn: hrService.markPaid,
    onSuccess: () => { toast.success('Marked as paid'); qc.invalidateQueries({ queryKey: ['payroll'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const bulkPaidMutation = useMutation({
    mutationFn: () => hrService.bulkMarkPaid(period),
    onSuccess: (data) => { toast.success(data.message); qc.invalidateQueries({ queryKey: ['payroll'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const rows: any[] = payrollData?.data || [];
  const summary = payrollData?.summary || {};
  const hasRecords = rows.some((r: any) => r.payroll_id);
  const allPaid = hasRecords && rows.filter((r: any) => r.payroll_id).every((r: any) => r.status === 'paid');
  const outstanding = (summary.totalPayroll || 0) - (summary.totalPaid || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gold-700/20"><Banknote size={22} className="text-gold-400" /></div>
          <div>
            <h1 className="page-title">Payroll</h1>
            <p className="text-sm text-charcoal-200">Monthly salary management</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="bg-charcoal-700 border border-charcoal-500 rounded-xl px-3 py-2 text-sm text-charcoal-100 focus:ring-2 focus:ring-gold-600 outline-none"
          />
          {!hasRecords ? (
            <Button
              variant="primary"
              icon={<RefreshCw size={15} />}
              loading={generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              Generate Payroll
            </Button>
          ) : !allPaid && (
            <Button
              variant="secondary"
              icon={<CheckCircle size={15} />}
              loading={bulkPaidMutation.isPending}
              onClick={() => { if (window.confirm('Mark all employees as paid for this period?')) bulkPaidMutation.mutate(); }}
            >
              Pay All
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Payroll" value={formatCurrency(summary.totalPayroll || 0)} icon={<TrendingUp size={20} />} color="gold" loading={isLoading} />
        <StatCard title="Total Paid" value={formatCurrency(summary.totalPaid || 0)} icon={<CheckCircle size={20} />} color="green" loading={isLoading} />
        <StatCard title="Outstanding" value={formatCurrency(outstanding)} icon={<Clock size={20} />} color={outstanding > 0 ? 'red' : 'green'} loading={isLoading} />
        <StatCard title="Employees" value={summary.employeeCount || 0} icon={<Users size={20} />} color="blue" loading={isLoading} />
      </div>

      {/* Payroll table */}
      <Card>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-charcoal-600 rounded-xl animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-charcoal-200 text-center py-10">No employees found. Add users in Settings first.</p>
        ) : !hasRecords ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-charcoal-200 text-sm">No payroll generated for {period} yet.</p>
            <p className="text-charcoal-300 text-xs">Click "Generate Payroll" to create records for all {rows.length} employees.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_110px_110px_110px_110px_100px_90px] gap-3 px-3 pb-2 border-b border-charcoal-600 text-xs text-charcoal-300 font-medium">
              <span>Employee</span>
              <span>Base Salary</span>
              <span>Allowances</span>
              <span>Deductions</span>
              <span>Net Pay</span>
              <span>Status</span>
              <span></span>
            </div>

            <div className="space-y-1 mt-2">
              {rows.map((row: any) => (
                <motion.div
                  key={row.employee_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-[1fr_110px_110px_110px_110px_100px_90px] gap-3 items-center px-3 py-3 rounded-xl hover:bg-charcoal-700/50 transition-colors"
                >
                  {/* Employee */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold-700/30 border border-gold-700/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-gold-400 text-xs font-semibold">{row.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-charcoal-50">{row.name}</p>
                      <p className="text-xs text-charcoal-300">{[ROLE_LABELS[row.role], row.department].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>

                  {/* Base Salary */}
                  <div>
                    <span className="md:hidden text-xs text-charcoal-300 mr-1">Base:</span>
                    <span className="text-sm text-charcoal-100">{formatCurrency(parseFloat(row.base_salary || row.profile_salary || 0))}</span>
                  </div>

                  {/* Allowances */}
                  <div>
                    <span className="md:hidden text-xs text-charcoal-300 mr-1">Allowances:</span>
                    <div>
                      <span className="text-sm text-charcoal-100">{formatCurrency(parseFloat(row.allowances || 0))}</span>
                      {row.allowances_list?.length > 0 && (
                        <span className="ml-1 text-xs text-charcoal-400">({row.allowances_list.length})</span>
                      )}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div>
                    <span className="md:hidden text-xs text-charcoal-300 mr-1">Deductions:</span>
                    <span className="text-sm text-charcoal-100">{formatCurrency(parseFloat(row.deductions || 0))}</span>
                  </div>

                  {/* Net Pay */}
                  <div>
                    <span className="md:hidden text-xs text-charcoal-300 mr-1">Net Pay:</span>
                    <span className={cn('text-sm font-semibold', row.payroll_id ? 'text-gold-400' : 'text-charcoal-300')}>
                      {row.payroll_id ? formatCurrency(parseFloat(row.net_pay || 0)) : '—'}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    {row.payroll_id ? (
                      <span className={cn('text-xs px-2 py-1 rounded-full border font-medium', STATUS_STYLES[row.status])}>
                        {row.status}
                      </span>
                    ) : (
                      <span className="text-xs text-charcoal-400">no record</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {row.payroll_id && (
                      <button
                        onClick={() => setEditEmployeeId(row.employee_id)}
                        className="p-1.5 rounded-lg text-charcoal-400 hover:text-gold-400 hover:bg-gold-700/20 transition-colors"
                        title="Edit payroll"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {row.payroll_id && row.status !== 'paid' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={markPaidMutation.isPending}
                        onClick={() => markPaidMutation.mutate(row.payroll_id)}
                        icon={<CheckCircle size={12} />}
                      >
                        Pay
                      </Button>
                    )}
                    {row.status === 'paid' && row.paid_at && (
                      <span className="text-xs text-charcoal-400">{formatDate(row.paid_at)}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Edit Drawer */}
      <AnimatePresence>
        {editEmployeeId && (
          <PayrollEditDrawer
            employeeId={editEmployeeId}
            period={period}
            onClose={() => setEditEmployeeId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
