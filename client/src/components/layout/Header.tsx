import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, ChevronDown, Menu } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pos': 'Point of Sale',
  '/rentals': 'Rentals',
  '/returns': 'Returns & Fines',
  '/products': 'Products',
  '/customers': 'Customers',
  '/inventory': 'Inventory',
  '/reports': 'Reports & Analytics',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

interface HeaderProps {
  onMenuClick?: () => void;
  sidebarCollapsed?: boolean;
}

export default function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { data: unreadCount } = useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/logs', { params: { status: 'pending', limit: 1 } });
      return (data?.pagination?.total ?? 0) as number;
    },
    refetchInterval: 60_000,
  });

  const title = Object.entries(ROUTE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || 'Dashboard';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-charcoal-600 bg-charcoal-800/80 backdrop-blur-md flex items-center justify-between px-5 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-charcoal-200 hover:bg-charcoal-600 transition-colors"
        >
          <Menu size={18} />
        </button>
        <h1 className="font-display text-lg font-semibold text-charcoal-50">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-xl text-charcoal-200 hover:bg-charcoal-600 hover:text-charcoal-50 transition-colors"
          title="Notifications"
        >
          <Bell size={18} />
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gold-600" />
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-charcoal-600 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gold-700/30 border border-gold-700/50 flex items-center justify-center">
              <span className="text-gold-400 text-xs font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-charcoal-50 leading-none">{user?.name}</p>
              <p className="text-xs text-charcoal-200 mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <ChevronDown size={14} className={cn('text-charcoal-200 transition-transform', showUserMenu && 'rotate-180')} />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-charcoal-700 border border-charcoal-500 rounded-xl shadow-card z-20 overflow-hidden">
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-charcoal-100 hover:bg-charcoal-600 transition-colors"
                >
                  Settings
                </button>
                <div className="border-t border-charcoal-500" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-charcoal-600 transition-colors"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
