"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PromotionForm } from "@/components/admin/PromotionForm";
import {
  fetchAdminPromotions,
  updateAdminPromotion,
  AdminPromotion,
  PromotionFormInput,
} from "@/lib/adminData";

export default function EditPromotionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [promotion, setPromotion] = useState<AdminPromotion | null | undefined>(undefined);

  useEffect(() => {
    // Reuse the list endpoint and find the one we need — simplest given the
    // admin promotion count is small; avoids a second GET-by-id round trip.
    fetchAdminPromotions()
      .then((list) => setPromotion(list.find((p) => p.id === params.id) ?? null))
      .catch(() => setPromotion(null));
  }, [params.id]);

  async function handleSubmit(input: PromotionFormInput) {
    await updateAdminPromotion(params.id, input);
    router.push("/admin/promotions");
  }

  return (
    <AdminLayout>
      <div className="font-serif text-3xl text-ink">Edit Promotion</div>
      <div className="mt-1 mb-8 text-sm text-text-muted">Update this promotion&apos;s details.</div>

      {promotion === undefined && <div className="text-sm text-text-faint">Loading…</div>}
      {promotion === null && <div className="text-sm text-red-600">Promotion not found.</div>}
      {promotion && (
        <PromotionForm initial={promotion} onSubmit={handleSubmit} submitLabel="Save Changes" />
      )}
    </AdminLayout>
  );
}
