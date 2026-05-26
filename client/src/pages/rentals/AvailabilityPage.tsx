import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays, Search, CheckCircle2, XCircle, Package,
  AlertCircle, Layers, Tags,
} from 'lucide-react';
import { rentalService, type AvailabilityItem } from '@/services/rentalService';

interface ProductGroup {
  product_id: string;
  product_name: string;
  category_name: string | null;
  product_image: string | null;
  variants: AvailabilityItem[];
}

function statusChip(v: AvailabilityItem) {
  const pct = v.rental_stock > 0 ? (v.available_qty / v.rental_stock) * 100 : 0;
  if (v.available_qty === 0)
    return { label: 'Fully Booked', cls: 'text-red-400 bg-red-500/10 border-red-500/25' };
  if (pct <= 50)
    return { label: `${v.available_qty} / ${v.rental_stock}`, cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' };
  return { label: `${v.available_qty} / ${v.rental_stock}`, cls: 'text-green-400 bg-green-500/10 border-green-500/25' };
}

export default function AvailabilityPage() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [querySearch, setQuerySearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuerySearch(val), 300);
  };

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['availability', date, querySearch],
    queryFn: () => rentalService.getAvailability(date, querySearch || undefined),
    staleTime: 30_000,
    enabled: !!date,
  });

  const grouped = useMemo<ProductGroup[]>(() => {
    const map = new Map<string, ProductGroup>();
    for (const item of data) {
      if (!map.has(item.product_id)) {
        map.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product_name,
          category_name: item.category_name,
          product_image: item.product_image,
          variants: [],
        });
      }
      map.get(item.product_id)!.variants.push(item);
    }
    return Array.from(map.values());
  }, [data]);

  const totalProducts  = grouped.length;
  const totalVariants  = data.length;
  const availableCount = data.filter(v => v.available_qty > 0).length;
  const bookedCount    = data.filter(v => v.available_qty === 0 && v.rental_stock > 0).length;
  const totalUnits     = data.reduce((s, v) => s + v.rental_stock, 0);
  const freeUnits      = data.reduce((s, v) => s + v.available_qty, 0);

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });

  const skeletonRows = 8;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Top bar ─────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-5">
          <div className="flex-1">
            <h1 className="page-title">Availability</h1>
            <p className="text-charcoal-300 text-sm mt-0.5">
              Rental stock availability by date
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-300 pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input-dark pl-9 pr-3 py-2 text-sm min-w-[175px]"
              />
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-300 pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, size, color, SKU…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="input-dark pl-9 pr-3 py-2 text-sm w-full sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Products',       value: totalProducts,  color: 'text-charcoal-50',  Icon: Package },
            { label: 'Variants',       value: totalVariants,  color: 'text-charcoal-50',  Icon: Layers },
            { label: 'Rental Units',   value: totalUnits,     color: 'text-charcoal-50',  Icon: Tags },
            { label: 'Free Units',     value: freeUnits,      color: 'text-green-400',    Icon: CheckCircle2 },
            { label: 'Avail Variants', value: availableCount, color: 'text-green-400',    Icon: CheckCircle2 },
            { label: 'Fully Booked',   value: bookedCount,    color: 'text-red-400',      Icon: XCircle },
          ].map(s => (
            <div key={s.label} className="card px-4 py-3 flex items-center gap-3">
              <s.Icon size={16} className={`${s.color} flex-shrink-0 opacity-70`} />
              <div>
                <p className="text-charcoal-400 text-[10px] uppercase tracking-wide leading-none mb-0.5">{s.label}</p>
                <p className={`text-lg font-bold leading-none ${s.color}`}>
                  {isLoading ? '—' : s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Date label */}
        {date && !isLoading && (
          <p className="text-xs text-gold-600 mt-3">
            {fmtDate(date)}
            {data.length > 0 && ` · ${freeUnits} unit${freeUnits !== 1 ? 's' : ''} available across ${availableCount} variant${availableCount !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {/* ── Table area ──────────────────────────── */}
      <div className="flex-1 overflow-auto px-6 pb-6 min-h-0">

        {isError && (
          <div className="card p-5 flex items-center gap-3 text-red-400 border-red-500/20">
            <AlertCircle size={18} />
            <span className="text-sm">Failed to load availability. Please try again.</span>
          </div>
        )}

        {/* Table */}
        {!isError && (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-charcoal-600 bg-charcoal-800">
                  <th className="text-left px-4 py-3 text-charcoal-300 font-medium text-xs uppercase tracking-wide w-10">#</th>
                  <th className="text-left px-4 py-3 text-charcoal-300 font-medium text-xs uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-charcoal-300 font-medium text-xs uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-charcoal-300 font-medium text-xs uppercase tracking-wide">Variant</th>
                  <th className="text-left px-4 py-3 text-charcoal-300 font-medium text-xs uppercase tracking-wide hidden lg:table-cell">SKU</th>
                  <th className="text-right px-4 py-3 text-charcoal-300 font-medium text-xs uppercase tracking-wide hidden sm:table-cell">Price / Day</th>
                  <th className="text-center px-4 py-3 text-charcoal-300 font-medium text-xs uppercase tracking-wide">Stock</th>
                  <th className="text-center px-4 py-3 text-charcoal-300 font-medium text-xs uppercase tracking-wide hidden sm:table-cell">Booked</th>
                  <th className="text-center px-4 py-3 text-charcoal-300 font-medium text-xs uppercase tracking-wide">Available</th>
                  <th className="text-center px-4 py-3 text-charcoal-300 font-medium text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>

              <tbody>
                {isLoading && Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i} className="border-b border-charcoal-700/50">
                    {[10, 40, 15, 20, 15, 12, 8, 8, 8, 14].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className={`h-3.5 rounded animate-pulse bg-charcoal-700 w-${w === 40 ? 'full' : `[${w}%]`}`} />
                      </td>
                    ))}
                  </tr>
                ))}

                {!isLoading && grouped.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-16">
                      <Package size={40} className="mx-auto text-charcoal-500 mb-3" />
                      <p className="text-charcoal-200 font-medium">No rental items found</p>
                      <p className="text-charcoal-400 text-xs mt-1">
                        {querySearch ? 'Try a different search term.' : 'No rental products are configured.'}
                      </p>
                    </td>
                  </tr>
                )}

                {!isLoading && grouped.map((product, pi) => (
                  <AnimatePresence key={product.product_id}>
                    {/* Product group header row */}
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`${pi > 0 ? 'border-t-2 border-charcoal-600' : ''} bg-charcoal-800/60`}
                    >
                      <td className="px-4 py-2.5" />
                      <td className="px-4 py-2.5" colSpan={9}>
                        <div className="flex items-center gap-2.5">
                          {product.product_image ? (
                            <img
                              src={product.product_image}
                              alt={product.product_name}
                              className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-charcoal-700 flex items-center justify-center flex-shrink-0">
                              <Package size={14} className="text-charcoal-400" />
                            </div>
                          )}
                          <span className="font-semibold text-charcoal-100 text-sm">{product.product_name}</span>
                          {product.category_name && (
                            <span className="text-xs text-charcoal-400 hidden md:inline">— {product.category_name}</span>
                          )}
                          <span className="text-xs text-charcoal-500 ml-auto pr-2">
                            {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                    </motion.tr>

                    {/* Variant rows */}
                    {product.variants.map((v, vi) => {
                      const chip = statusChip(v);
                      const variantLabel = [v.size, v.color].filter(Boolean).join(' / ') || '—';
                      const isLast = vi === product.variants.length - 1;
                      return (
                        <motion.tr
                          key={v.variant_id}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: vi * 0.02 }}
                          className={`border-b ${isLast ? 'border-charcoal-700/30' : 'border-charcoal-700/50'} hover:bg-charcoal-700/30 transition-colors`}
                        >
                          {/* row # */}
                          <td className="px-4 py-3 text-charcoal-500 text-xs pl-8">{vi + 1}</td>

                          {/* product name (compact, mobile only) */}
                          <td className="px-4 py-3">
                            <span className="text-charcoal-400 text-xs md:hidden">{product.product_name}</span>
                          </td>

                          {/* category */}
                          <td className="px-4 py-3 text-charcoal-400 text-xs hidden md:table-cell">
                            {v.category_name ?? '—'}
                          </td>

                          {/* variant */}
                          <td className="px-4 py-3">
                            <span className="text-charcoal-100 font-medium">{variantLabel}</span>
                            {v.material && (
                              <span className="text-charcoal-400 text-xs block">{v.material}</span>
                            )}
                          </td>

                          {/* sku */}
                          <td className="px-4 py-3 text-charcoal-400 text-xs font-mono hidden lg:table-cell">
                            {v.sku}
                          </td>

                          {/* price */}
                          <td className="px-4 py-3 text-right text-charcoal-200 hidden sm:table-cell">
                            LKR {parseFloat(String(v.price_per_day)).toLocaleString()}
                            <span className="text-charcoal-400 text-xs">/day</span>
                          </td>

                          {/* rental stock */}
                          <td className="px-4 py-3 text-center">
                            <span className="text-charcoal-100 font-semibold">{v.rental_stock}</span>
                          </td>

                          {/* booked */}
                          <td className="px-4 py-3 text-center hidden sm:table-cell">
                            <span className={v.booked_qty > 0 ? 'text-amber-400 font-medium' : 'text-charcoal-500'}>
                              {v.booked_qty}
                            </span>
                          </td>

                          {/* available */}
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${v.available_qty === 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {v.available_qty}
                            </span>
                          </td>

                          {/* status chip */}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${chip.cls}`}>
                              {chip.label}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
