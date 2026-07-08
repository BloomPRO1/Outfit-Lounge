"use client";

import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PromotionForm } from "@/components/admin/PromotionForm";
import { createAdminPromotion, PromotionFormInput } from "@/lib/adminData";

export default function NewPromotionPage() {
  const router = useRouter();

  async function handleSubmit(input: PromotionFormInput) {
    await createAdminPromotion(input);
    router.push("/admin/promotions");
  }

  return (
    <AdminLayout>
      <div className="font-serif text-3xl text-ink">New Promotion</div>
      <div className="mt-1 mb-8 text-sm text-text-muted">
        This will auto-apply at checkout/booking for matching orders — no code needed.
      </div>
      <PromotionForm onSubmit={handleSubmit} submitLabel="Create Promotion" />
    </AdminLayout>
  );
}
