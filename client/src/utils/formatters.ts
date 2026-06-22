export function formatCurrency(amount: number | string | null | undefined, symbol = 'LKR'): string {
  const num = parseFloat(String(amount || 0));
  if (isNaN(num)) return `${symbol} 0.00`;
  return `${symbol} ${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return formatDate(dateStr);
}

function toLocalMidnight(d: string | Date): Date {
  if (d instanceof Date) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }
  const [y, m, day] = d.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function getDaysDiff(from: string | Date, to: string | Date): number {
  return Math.ceil((toLocalMidnight(to).getTime() - toLocalMidnight(from).getTime()) / (1000 * 60 * 60 * 24));
}

export function getRentalDays(startDate: string, endDate: string): number {
  return Math.max(1, getDaysDiff(startDate, endDate));
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '…';
}

export const STATUS_LABELS: Record<string, string> = {
  reserved: 'Reserved',
  ready_for_pickup: 'Ready for Pickup',
  picked_up: 'Picked Up',
  returned: 'Returned',
  late_return: 'Late Return',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<string, string> = {
  reserved: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  ready_for_pickup: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  picked_up: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  returned: 'bg-green-500/15 text-green-400 border-green-500/30',
  late_return: 'bg-red-500/15 text-red-400 border-red-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-charcoal-400/15 text-charcoal-100 border-charcoal-400/30',
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  cashier: 'Cashier',
  inventory_staff: 'Inventory Staff',
};

export const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-gold-700/20 text-gold-400',
  manager: 'bg-purple-500/15 text-purple-400',
  cashier: 'bg-blue-500/15 text-blue-400',
  inventory_staff: 'bg-green-500/15 text-green-400',
};
