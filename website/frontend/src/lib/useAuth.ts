"use client";

import { useEffect, useState } from "react";
import { Customer, fetchMe, logout as logoutLocal } from "@/lib/auth";

export function useAuth() {
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);

  useEffect(() => {
    fetchMe().then(setCustomer);
  }, []);

  return {
    customer,
    loading: customer === undefined,
    refresh: () => fetchMe().then(setCustomer),
    logout: () => {
      logoutLocal();
      setCustomer(null);
    },
  };
}
