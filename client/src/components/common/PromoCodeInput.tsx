import { useState } from 'react';
import { Tag, X, Loader2 } from 'lucide-react';
import { promotionCodeService, calculateCodeDiscount } from '@/services/promotionCodeService';
import type { PromotionCode } from '@/types';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n);

interface PromoCodeInputProps {
  scope: 'pos' | 'rental';
  subtotal: number;
  appliedCode: PromotionCode | null;
  onApply: (code: PromotionCode | null) => void;
}

export default function PromoCodeInput({ scope, subtotal, appliedCode, onApply }: PromoCodeInputProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleApply() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const code = await promotionCodeService.validate(trimmed, scope);
      onApply(code);
      setInput('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Invalid promotion code');
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    onApply(null);
    setError('');
  }

  if (appliedCode) {
    const discount = calculateCodeDiscount(appliedCode, subtotal);
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal-100">Promo Code</p>
        <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-900/20 border border-emerald-700/30 rounded-xl">
          <Tag size={13} className="text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-300 tracking-wide">{appliedCode.code}</p>
            <p className="text-xs text-emerald-400/70">{appliedCode.name}</p>
          </div>
          <span className="text-sm font-medium text-emerald-400 shrink-0">-{formatCurrency(discount)}</span>
          <button
            type="button"
            onClick={handleRemove}
            className="text-charcoal-400 hover:text-red-400 transition-colors ml-1"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-charcoal-100">
        Promo Code <span className="text-charcoal-300 font-normal">(optional)</span>
      </p>
      <div className="flex gap-2">
        <input
          className="input-dark flex-1 text-sm uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
          placeholder="Enter code…"
          value={input}
          onChange={e => { setInput(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApply(); } }}
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={!input.trim() || loading}
          className="px-4 py-2 rounded-xl bg-gold-700/20 border border-gold-700/30 text-gold-400 text-sm font-medium hover:bg-gold-700/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : 'Apply'}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
