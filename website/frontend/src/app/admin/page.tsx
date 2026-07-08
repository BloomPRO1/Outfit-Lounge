"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { fetchOverview, Overview } from "@/lib/adminData";

function formatMoney(value: string): string {
  return `Rs ${parseFloat(value).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border-light bg-white p-6">
      <div className="text-[13px] text-text-faint">{label}</div>
      <div className="mt-2 font-serif text-3xl text-ink">{value}</div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview().then(setOverview).catch(() => setError("Could not load overview"));
  }, []);

  return (
    <AdminLayout>
      <div className="font-serif text-3xl text-ink">Overview</div>
      <div className="mt-1 text-sm text-text-muted">
        Website operations at a glance — stock, orders, rentals, customers, promotions.
      </div>

      {error && <div className="mt-6 text-sm text-red-600">{error}</div>}

      {overview && (
        <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
          <StatCard label="Active Products (ERP catalog)" value={overview.activeProducts} />
          <StatCard label="Total Stock Units" value={overview.totalStockUnits} />
          <StatCard label="Units Available For Rent" value={overview.totalAvailableForRent} />
          <StatCard label="Stock Value (at selling price)" value={formatMoney(overview.stockValue)} />
          <StatCard label="Website Orders" value={overview.websiteOrders} />
          <StatCard label="Website Revenue" value={formatMoney(overview.websiteRevenue)} />
          <StatCard label="Website Rentals" value={overview.websiteRentals} />
          <StatCard label="Active Rentals" value={overview.activeWebsiteRentals} />
          <StatCard label="Website Customers" value={overview.websiteCustomers} />
          <StatCard label="Active Promotions" value={overview.activePromotions} />
        </div>
      )}
    </AdminLayout>
  );
}
