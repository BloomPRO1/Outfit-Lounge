"use client";

import { DateRange } from "@/lib/api";

function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function DateRangePicker({
  value,
  onChange,
  theme = "light",
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  theme?: "light" | "dark";
}) {
  const isDark = theme === "dark";
  const min = todayStr();

  return (
    <div
      className={
        "flex flex-wrap items-end gap-4 rounded-md border p-4 " +
        (isDark ? "border-gold/30 bg-ink-soft" : "border-border-light bg-cream-soft")
      }
    >
      <div>
        <label className={"block text-[11px] tracking-wide " + (isDark ? "text-gold" : "text-text-body")}>
          PICK UP
        </label>
        <input
          type="date"
          min={min}
          value={value.startDate}
          onChange={(e) => {
            const startDate = e.target.value;
            const endDate = value.endDate < startDate ? startDate : value.endDate;
            onChange({ startDate, endDate });
          }}
          className={
            "mt-1 rounded border px-3 py-2 text-sm " +
            (isDark ? "border-gold/30 bg-ink text-cream" : "border-border-light bg-white text-ink")
          }
        />
      </div>
      <div>
        <label className={"block text-[11px] tracking-wide " + (isDark ? "text-gold" : "text-text-body")}>
          RETURN
        </label>
        <input
          type="date"
          min={value.startDate}
          value={value.endDate}
          onChange={(e) => onChange({ ...value, endDate: e.target.value })}
          className={
            "mt-1 rounded border px-3 py-2 text-sm " +
            (isDark ? "border-gold/30 bg-ink text-cream" : "border-border-light bg-white text-ink")
          }
        />
      </div>
    </div>
  );
}

export function defaultDateRange(): DateRange {
  return { startDate: todayStr(), endDate: todayStr(2) };
}
