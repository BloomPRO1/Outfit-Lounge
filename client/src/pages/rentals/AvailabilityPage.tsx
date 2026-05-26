import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Search, CheckCircle2, XCircle, Package, AlertCircle } from 'lucide-react';
import { rentalService, type AvailabilityItem } from '@/services/rentalService';

interface ProductGroup {
  product_id: string;
  product_name: string;
  category_name: string | null;
  product_image: string | null;
  variants: AvailabilityItem[];
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

  const totalVariants = data.length;
  const availableCount = data.filter(v => v.available_qty > 0).length;
  const bookedCount = data.filter(v => v.available_qty === 0 && v.total_stock > 0).length;

  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Availability</h1>
          <p className="text-charcoal-300 text-sm mt-1">
            Check which rental items are available on a specific date
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative">
          <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-300 pointer-events-none" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="input-dark pl-9 pr-3 py-2.5 min-w-[200px]"
          />
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, size, color, SKU…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="input-dark pl-9 pr-3 py-2.5 w-full"
          />
        </div>
      </div>

      {/* Date label */}
      {date && (
        <p className="text-sm text-gold-500 font-medium mb-4">
          Showing availability for: {fmt(date)}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-charcoal-300 text-xs uppercase tracking-wide mb-1">Total Variants</p>
          <p className="text-2xl font-bold text-charcoal-50">{isLoading ? '—' : totalVariants}</p>
        </div>
        <div className="card p-4" style={{ borderColor: 'rgba(74,222,128,0.2)' }}>
          <p className="text-green-400 text-xs uppercase tracking-wide mb-1">Available</p>
          <p className="text-2xl font-bold text-green-400">{isLoading ? '—' : availableCount}</p>
        </div>
        <div className="card p-4" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
          <p className="text-red-400 text-xs uppercase tracking-wide mb-1">Fully Booked</p>
          <p className="text-2xl font-bold text-red-400">{isLoading ? '—' : bookedCount}</p>
        </div>
      </div>

      {/* Content */}
      {isError && (
        <div className="card p-6 flex items-center gap-3 text-red-400 border-red-500/20">
          <AlertCircle size={20} />
          <span>Failed to load availability. Please try again.</span>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-52 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && !isError && grouped.length === 0 && (
        <div className="card p-14 text-center">
          <Package size={48} className="mx-auto text-charcoal-500 mb-3" />
          <p className="text-charcoal-200 font-medium mb-1">No rental items found</p>
          <p className="text-charcoal-400 text-sm">
            {querySearch ? 'Try a different search term.' : 'No rental products are set up yet.'}
          </p>
        </div>
      )}

      {!isLoading && !isError && grouped.length > 0 && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {grouped.map(product => {
            const allAvail = product.variants.every(v => v.available_qty > 0);
            const allBooked = product.variants.every(v => v.available_qty === 0);

            return (
              <div key={product.product_id} className="card overflow-hidden flex flex-col">
                {/* Product header */}
                <div className="flex items-center gap-3 p-4 border-b border-charcoal-600">
                  {product.product_image ? (
                    <img
                      src={product.product_image}
                      alt={product.product_name}
                      className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-charcoal-700 flex items-center justify-center flex-shrink-0">
                      <Package size={18} className="text-charcoal-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-charcoal-50 text-sm truncate">{product.product_name}</p>
                    {product.category_name && (
                      <p className="text-xs text-charcoal-400 truncate">{product.category_name}</p>
                    )}
                  </div>
                  {allAvail && <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />}
                  {allBooked && <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                </div>

                {/* Variants */}
                <div className="p-3 space-y-2 flex-1">
                  {product.variants.map(v => {
                    const pct = v.total_stock > 0 ? (v.available_qty / v.total_stock) * 100 : 0;
                    const chipClass =
                      v.available_qty === 0
                        ? 'text-red-400 bg-red-500/10 border border-red-500/25'
                        : pct <= 50
                        ? 'text-amber-400 bg-amber-500/10 border border-amber-500/25'
                        : 'text-green-400 bg-green-500/10 border border-green-500/25';
                    const chipLabel =
                      v.available_qty === 0 ? 'Booked' : `${v.available_qty} of ${v.total_stock}`;
                    const variantLabel =
                      [v.size, v.color].filter(Boolean).join(' / ') || v.sku;

                    return (
                      <div
                        key={v.variant_id}
                        className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-charcoal-700/50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-charcoal-100 font-medium truncate">{variantLabel}</p>
                          <p className="text-xs text-charcoal-400">
                            LKR {parseFloat(String(v.price_per_day)).toLocaleString()}/day
                            {v.material ? ` · ${v.material}` : ''}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${chipClass}`}>
                          {chipLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
