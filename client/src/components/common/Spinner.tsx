import { cn } from '@/utils/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-charcoal-400 border-t-gold-600',
        sizes[size],
        className
      )}
    />
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-charcoal-800 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 animate-spin rounded-full border-2 border-charcoal-500 border-t-gold-600" />
      <p className="text-charcoal-200 text-sm">Loading...</p>
    </div>
  );
}
