import { useQuery } from '@tanstack/react-query';
import { permissionsService } from '@/services/permissionsService';
import { useAuthStore } from '@/store/authStore';

export function usePermissions() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  const { data: allPermissions, isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: permissionsService.getAll,
    enabled: !!user && !isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const hasPermission = (module: string, access: 'read' | 'write'): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    // Optimistic: allow while permissions are still loading (for sidebar)
    if (!allPermissions) return true;
    const rolePerms = allPermissions[user.role];
    if (!rolePerms) return false;
    const modPerms = rolePerms[module];
    if (!modPerms) return false;
    return access === 'read' ? modPerms.can_read : modPerms.can_write;
  };

  // Strict check — never optimistic, used for route guards
  const canAccess = (module: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    if (!allPermissions) return false; // block until loaded
    const rolePerms = allPermissions[user.role];
    if (!rolePerms) return false;
    return rolePerms[module]?.can_read ?? false;
  };

  return { hasPermission, canAccess, allPermissions, isLoading, isSuperAdmin };
}
