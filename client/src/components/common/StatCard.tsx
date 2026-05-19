import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  changeLabel?: string;
  color?: 'gold' | 'blue' | 'green' | 'red' | 'purple';
  loading?: boolean;
  onClick?: () => void;
}

const COLORS = {
  gold: { icon: 'bg-gold-700/20 text-gold-400', border: 'hover:border-gold-700/40' },
  blue: { icon: 'bg-blue-500/15 text-blue-400', border: 'hover:border-blue-500/30' },
  green: { icon: 'bg-emerald-500/15 text-emerald-400', border: 'hover:border-emerald-500/30' },
  red: { icon: 'bg-red-500/15 text-red-400', border: 'hover:border-red-500/30' },
  purple: { icon: 'bg-purple-500/15 text-purple-400', border: 'hover:border-purple-500/30' },
};

export default function StatCard({ title, value, icon, change, changeLabel, color = 'gold', loading, onClick }: StatCardProps) {
  const c = COLORS[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={cn(
        'stat-card transition-all duration-300 cursor-default',
        c.border,
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-charcoal-200 text-sm font-medium mb-1 truncate">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-charcoal-500 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-semibold text-charcoal-50 truncate">{value}</p>
          )}
          {change !== undefined && !loading && (
            <p className={cn('text-xs mt-1.5', change >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% {changeLabel || ''}
            </p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-xl flex-shrink-0', c.icon)}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
