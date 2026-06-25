import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import Sidebar from './Sidebar';
import Header from './Header';
import CashSessionModal from '@/components/cashSession/CashSessionModal';
import { cashSessionService } from '@/services/cashSessionService';
import { useAuthStore } from '@/store/authStore';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isCashier = user?.role === 'cashier';

  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [pendingLogout, setPendingLogout] = useState(false);
  // Set to true when cashier closes the day — prevents re-prompting for opening balance
  const [sessionClosedToday, setSessionClosedToday] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Check for open cash session — only for cashiers
  const { data: currentSession, isSuccess } = useQuery({
    queryKey: ['cash-session-current'],
    queryFn: cashSessionService.getCurrent,
    enabled: isCashier,
    staleTime: 60_000,
  });

  // Prompt to open a session if cashier has none for today
  useEffect(() => {
    if (!isCashier || !isSuccess || sessionClosedToday) return;
    if (!currentSession) {
      setShowOpenModal(true);
    }
  }, [isCashier, isSuccess, currentSession, sessionClosedToday]);

  const handleLogoutRequest = () => {
    if (isCashier && currentSession) {
      // Must close the day before logging out
      setPendingLogout(true);
      setShowOpenModal(false);
      setShowCloseModal(true);
    } else {
      logout();
      navigate('/login');
    }
  };

  const handleCloseDone = () => {
    setSessionClosedToday(true);
    setShowCloseModal(false);
    if (pendingLogout) {
      setPendingLogout(false);
      logout();
      navigate('/login');
    }
  };

  const sidebarWidth = collapsed ? 70 : 240;

  return (
    <div className="h-screen bg-charcoal-800 flex overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onCloseDay={isCashier && !!currentSession ? () => setShowCloseModal(true) : undefined}
          hasOpenSession={!!currentSession}
        />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed left-0 top-0 z-30">
          <Sidebar
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onCloseDay={isCashier && !!currentSession ? () => setShowCloseModal(true) : undefined}
            hasOpenSession={!!currentSession}
          />
        </div>
      )}

      {/* Main content */}
      <motion.main
        animate={{ marginLeft: isMobile ? 0 : sidebarWidth }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: 0 }}
      >
        <Header onMenuClick={() => setMobileOpen(!mobileOpen)} sidebarCollapsed={collapsed} onLogoutRequest={handleLogoutRequest} />
        <div className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full p-4 lg:p-6 max-w-screen-2xl flex flex-col"
          >
            <Outlet />
          </motion.div>
        </div>
      </motion.main>

      {/* Open-day modal — cashier must enter opening balance, no skip */}
      {showOpenModal && (
        <CashSessionModal
          mode="open"
          onDone={() => setShowOpenModal(false)}
          onLogout={() => { logout(); navigate('/login'); }}
        />
      )}

      {/* Close-day modal */}
      {showCloseModal && (
        <CashSessionModal
          mode="close"
          session={currentSession}
          onDone={handleCloseDone}
          onCancel={pendingLogout ? undefined : () => setShowCloseModal(false)}
        />
      )}
    </div>
  );
}
