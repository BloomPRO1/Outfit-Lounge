import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { usePermissions } from './hooks/usePermissions';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductsPage from './pages/products/ProductsPage';
import ProductFormPage from './pages/products/ProductFormPage';
import ProductDetailPage from './pages/products/ProductDetailPage';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import RentalsPage from './pages/rentals/RentalsPage';
import NewRentalPage from './pages/rentals/NewRentalPage';
import RentalDetailPage from './pages/rentals/RentalDetailPage';
import AvailabilityPage from './pages/rentals/AvailabilityPage';
import POSPage from './pages/pos/POSPage';
import InventoryPage from './pages/inventory/InventoryPage';
import ReturnsPage from './pages/returns/ReturnsPage';
import ReportsPage from './pages/reports/ReportsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import SettingsPage from './pages/settings/SettingsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import EmployeesPage from './pages/employees/EmployeesPage';
import PayrollPage from './pages/payroll/PayrollPage';
import PromotionsPage from './pages/promotions/PromotionsPage';

// Redirects to the role's default home page
function HomeRedirect() {
  const { user } = useAuthStore();
  return <Navigate to={user?.role === 'cashier' ? '/pos' : '/dashboard'} replace />;
}

// Guards a route by module permission — blocks until permissions are loaded
function ModuleRoute({ module, element }: { module: string; element: React.ReactElement }) {
  const { user } = useAuthStore();
  const { canAccess, isLoading, isSuperAdmin } = usePermissions();

  if (isSuperAdmin) return element;

  // Wait for permissions to load before rendering or redirecting
  if (isLoading) return null;

  if (!canAccess(module)) {
    const home = user?.role === 'cashier' ? '/pos' : '/dashboard';
    return <Navigate to={home} replace />;
  }

  return element;
}

export default function App() {
  const { token } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/dashboard"    element={<ModuleRoute module="dashboard"     element={<DashboardPage />} />} />

          <Route path="/products"     element={<ModuleRoute module="products"      element={<ProductsPage />} />} />
          <Route path="/products/new" element={<ModuleRoute module="products"      element={<ProductFormPage />} />} />
          <Route path="/products/:id" element={<ModuleRoute module="products"      element={<ProductDetailPage />} />} />
          <Route path="/products/:id/edit" element={<ModuleRoute module="products" element={<ProductFormPage />} />} />

          <Route path="/customers"    element={<ModuleRoute module="customers"     element={<CustomersPage />} />} />
          <Route path="/customers/:id" element={<ModuleRoute module="customers"    element={<CustomerDetailPage />} />} />

          <Route path="/rentals"            element={<ModuleRoute module="rentals" element={<RentalsPage />} />} />
          <Route path="/rentals/new"        element={<ModuleRoute module="rentals" element={<NewRentalPage />} />} />
          <Route path="/rentals/:id"        element={<ModuleRoute module="rentals" element={<RentalDetailPage />} />} />
          <Route path="/availability"       element={<ModuleRoute module="rentals" element={<AvailabilityPage />} />} />

          <Route path="/pos"          element={<ModuleRoute module="pos"           element={<POSPage />} />} />
          <Route path="/inventory"    element={<ModuleRoute module="inventory"     element={<InventoryPage />} />} />
          <Route path="/returns"      element={<ModuleRoute module="returns"       element={<ReturnsPage />} />} />
          <Route path="/promotions"   element={<ModuleRoute module="promotions"    element={<PromotionsPage />} />} />
          <Route path="/reports"      element={<ModuleRoute module="reports"       element={<ReportsPage />} />} />
          <Route path="/analytics"    element={<ModuleRoute module="analytics"     element={<AnalyticsPage />} />} />
          <Route path="/expenses"     element={<ModuleRoute module="analytics"     element={<ExpensesPage />} />} />
          <Route path="/employees"    element={<ModuleRoute module="employees"     element={<EmployeesPage />} />} />
          <Route path="/payroll"      element={<ModuleRoute module="payroll"       element={<PayrollPage />} />} />
          <Route path="/notifications" element={<ModuleRoute module="notifications" element={<NotificationsPage />} />} />
          <Route path="/settings"     element={<ModuleRoute module="settings"      element={<SettingsPage />} />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
