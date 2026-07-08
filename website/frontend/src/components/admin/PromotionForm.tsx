"use client";

import { useEffect, useState } from "react";
import { AdminCategory, AdminPromotion, PromotionFormInput, fetchAdminCategories } from "@/lib/adminData";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PromotionForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: AdminPromotion;
  onSubmit: (input: PromotionFormInput) => Promise<void>;
  submitLabel: string;
}) {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [bannerImage, setBannerImage] = useState<string | null>(initial?.banner_image ?? null);
  const [discountType, setDiscountType] = useState<"percentage" | "flat_amount">(
    initial?.discount_type ?? "percentage"
  );
  const [discountValue, setDiscountValue] = useState<string>(initial?.discount_value ?? "10");
  const [scope, setScope] = useState<"sale" | "rental" | "both">(initial?.scope ?? "both");
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.category_ids ?? []);
  const [weekendOnly, setWeekendOnly] = useState(initial?.weekend_only ?? false);
  const [minOrderAmount, setMinOrderAmount] = useState<string>(initial?.min_order_amount ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date?.slice(0, 10) ?? todayStr());
  const [endDate, setEndDate] = useState(initial?.end_date?.slice(0, 10) ?? todayStr());
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAdminCategories().then(setCategories).catch(() => {});
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBannerImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const discountValueNum = parseFloat(discountValue);
    if (!title.trim()) return setError("Title is required");
    if (isNaN(discountValueNum) || discountValueNum <= 0) return setError("Enter a valid discount value");
    if (discountType === "percentage" && discountValueNum > 100) {
      return setError("A percentage discount cannot exceed 100");
    }
    if (startDate > endDate) return setError("Start date must be on or before end date");

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        bannerImage,
        discountType,
        discountValue: discountValueNum,
        scope,
        categoryIds,
        weekendOnly,
        minOrderAmount: minOrderAmount.trim() ? parseFloat(minOrderAmount) : null,
        startDate,
        endDate,
        isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save promotion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      <div>
        <div className="mb-1.5 text-[13px] text-text-body">Title</div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-border-light px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
          placeholder="e.g. Weekend Fragrance Sale"
        />
      </div>

      <div>
        <div className="mb-1.5 text-[13px] text-text-body">Description</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded border border-border-light px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
          placeholder="Shown to customers on the Promotions page"
        />
      </div>

      <div>
        <div className="mb-1.5 text-[13px] text-text-body">Banner Image</div>
        {bannerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerImage} alt="Banner preview" className="mb-2.5 h-32 w-full rounded object-cover" />
        )}
        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
          {bannerImage && (
            <button
              type="button"
              onClick={() => setBannerImage(null)}
              className="text-[13px] text-red-600 underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <div className="mb-1.5 text-[13px] text-text-body">Discount Type</div>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "percentage" | "flat_amount")}
            className="w-full rounded border border-border-light px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="flat_amount">Flat Amount (Rs)</option>
          </select>
        </div>
        <div>
          <div className="mb-1.5 text-[13px] text-text-body">
            Discount Value {discountType === "percentage" ? "(%)" : "(Rs)"}
          </div>
          <input
            type="number"
            min={0}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className="w-full rounded border border-border-light px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[13px] text-text-body">Applies To</div>
        <div className="flex gap-2">
          {(["sale", "rental", "both"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={
                "rounded-full border px-4 py-1.5 text-[13px] capitalize " +
                (scope === s ? "border-ink bg-ink text-white" : "border-border-light text-text-body")
              }
            >
              {s === "sale" ? "Shop" : s === "rental" ? "Rent" : "Both"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[13px] text-text-body">
          Categories <span className="text-text-faint">(none selected = applies to all)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCategory(c.id)}
              className={
                "rounded-full border px-4 py-1.5 text-[13px] " +
                (categoryIds.includes(c.id)
                  ? "border-gold bg-gold text-ink"
                  : "border-border-light text-text-body")
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <div className="mb-1.5 text-[13px] text-text-body">Start Date</div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded border border-border-light px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <div className="mb-1.5 text-[13px] text-text-body">End Date</div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded border border-border-light px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[13px] text-text-body">
          Minimum Order Amount <span className="text-text-faint">(optional)</span>
        </div>
        <input
          type="number"
          min={0}
          value={minOrderAmount}
          onChange={(e) => setMinOrderAmount(e.target.value)}
          placeholder="No minimum"
          className="w-full max-w-50 rounded border border-border-light px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-2.5 text-[13px] text-text-body">
        <input type="checkbox" checked={weekendOnly} onChange={(e) => setWeekendOnly(e.target.checked)} />
        Weekend only (Saturday & Sunday)
      </label>

      <label className="flex items-center gap-2.5 text-[13px] text-text-body">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>

      {error && <div className="text-[13px] text-red-600">{error}</div>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 w-fit rounded-sm bg-ink px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-gold-deep disabled:opacity-50"
      >
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
