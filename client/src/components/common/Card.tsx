import { cn } from '@/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  gold?: boolean;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({ children, className, gold, hover, onClick, padding = 'md' }: CardProps) {
  const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };
  return (
    <div
      onClick={onClick}
      className={cn(
        'card',
        paddings[padding],
        gold && 'border-gold-700/40 shadow-gold',
        hover && 'hover:shadow-card-hover hover:border-charcoal-400 transition-all duration-300',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
