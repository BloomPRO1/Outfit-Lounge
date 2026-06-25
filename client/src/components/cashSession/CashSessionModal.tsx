import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Banknote, Lock, Sun, Moon, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cashSessionService, type CashSession } from '@/services/cashSessionService';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';

interface Props {
  mode: 'open' | 'close';
  session?: CashSession | null;
  onDone: () => void;
  onCancel?: () => void;
  onLogout?: () => void;
}

export default function CashSessionModal({ mode, session, onDone, onCancel, onLogout }: Props) {
  const qc = useQueryClient();
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');

  const openMutation = useMutation({
    mutationFn: () => cashSessionService.open(parseFloat(balance), notes || undefined),
    onSuccess: () => {
      toast.success('Day started — session opened');
      qc.invalidateQueries({ queryKey: ['cash-session-current'] });
      onDone();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to open session'),
  });

  const closeMutation = useMutation({
    mutationFn: () => cashSessionService.close(parseFloat(balance), notes || undefined),
    onSuccess: () => {
      toast.success('Day closed — session saved');
      qc.invalidateQueries({ queryKey: ['cash-session-current'] });
      onDone();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to close session'),
  });

  const isOpen = mode === 'open';
  const balanceAmt = parseFloat(balance || '0');
  const isPending = openMutation.isPending || closeMutation.isPending;

  const handleSubmit = () => {
    if (isNaN(balanceAmt) || balance === '') {
      toast.error('Please enter a valid amount');
      return;
    }
    if (isOpen) openMutation.mutate();
    else closeMutation.mutate();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="cash-session-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="bg-charcoal-800 border border-charcoal-600 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          {/* Header */}
          <div className={cn(
            'flex items-center gap-3 px-5 py-4 border-b border-charcoal-600',
            isOpen ? 'bg-emerald-500/8' : 'bg-amber-500/8'
          )}>
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              isOpen ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
            )}>
              {isOpen ? <Sun size={20} /> : <Moon size={20} />}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-charcoal-50">
                {isOpen ? 'Start of Day' : 'End of Day'}
              </h3>
              <p className="text-xs text-charcoal-300 mt-0.5">
                {isOpen ? 'Enter the opening cash balance in the till' : 'Enter the closing cash balance in the till'}
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Show opening balance for close mode */}
            {!isOpen && session && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-charcoal-700/60 border border-charcoal-600">
                <span className="text-sm text-charcoal-300">Opening Balance</span>
                <span className="text-sm font-semibold text-charcoal-50">
                  {formatCurrency(Number(session.opening_balance))}
                </span>
              </div>
            )}

            <Input
              label={isOpen ? 'Opening Cash Balance (LKR)' : 'Closing Cash Balance (LKR)'}
              type="number"
              step="0.01"
              min="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              hint={isOpen ? 'Count the cash in the till before you start' : 'Count the cash in the till at end of day'}
              autoFocus
            />

            {/* Difference indicator for close mode */}
            {!isOpen && session && balance !== '' && !isNaN(balanceAmt) && (
              <div className={cn(
                'flex items-center justify-between px-4 py-3 rounded-xl border',
                balanceAmt > Number(session.opening_balance)
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : balanceAmt < Number(session.opening_balance)
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-charcoal-700/60 border-charcoal-600'
              )}>
                <span className="text-sm text-charcoal-300">
                  {balanceAmt > Number(session.opening_balance) ? 'Cash Over' :
                   balanceAmt < Number(session.opening_balance) ? 'Cash Short' : 'Balanced'}
                </span>
                <span className={cn('text-sm font-bold',
                  balanceAmt > Number(session.opening_balance) ? 'text-emerald-400' :
                  balanceAmt < Number(session.opening_balance) ? 'text-red-400' : 'text-charcoal-200'
                )}>
                  {balanceAmt !== Number(session.opening_balance)
                    ? formatCurrency(Math.abs(balanceAmt - Number(session.opening_balance)))
                    : '—'}
                </span>
              </div>
            )}

            <Input
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any remarks about the cash..."
            />

            <div className="flex gap-2 pt-1">
              {onCancel && (
                <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={isPending}>
                  Cancel
                </Button>
              )}
              <Button
                variant="primary"
                className="flex-1"
                icon={isOpen ? <Banknote size={15} /> : <Lock size={15} />}
                onClick={handleSubmit}
                loading={isPending}
                disabled={balance === ''}
              >
                {isOpen ? 'Open Day' : 'Close Day'}
              </Button>
            </div>

            {isOpen && onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-charcoal-400 hover:text-red-400 transition-colors pt-1"
              >
                <LogOut size={12} />
                Sign out instead
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
