"use client";

import { useEffect, useState } from "react";
import { Admin, fetchAdminMe, adminLogout as adminLogoutLocal } from "@/lib/adminAuth";

export function useAdminAuth() {
  const [admin, setAdmin] = useState<Admin | null | undefined>(undefined);

  useEffect(() => {
    fetchAdminMe().then(setAdmin);
  }, []);

  return {
    admin,
    loading: admin === undefined,
    logout: () => {
      adminLogoutLocal();
      setAdmin(null);
    },
  };
}
