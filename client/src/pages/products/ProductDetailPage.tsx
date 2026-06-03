import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Package, Printer, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { productService } from '@/services/productService';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import BarcodePrintModal, { type BarcodeItem } from '@/components/common/BarcodePrintModal';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/utils/cn';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);
  const [barcodeItem, setBarcodeItem] = useState<BarcodeItem | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState(false);
  const [confirmDeleteVariantId, setConfirmDeleteVariantId] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getById(id!),
    enabled: !!id,
  });

  const deleteProductMutation = useMutation({
    mutationFn: () => productService.delete(id!),
    onSuccess: () => {
      toast.success('Product deleted');
      qc.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete product');
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) => productService.deleteVariant(id!, variantId),
    onSuccess: () => {
      toast.success('Variant deleted');
      qc.invalidateQueries({ queryKey: ['product', id] });
      setConfirmDeleteVariantId(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete variant');
      setConfirmDeleteVariantId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 bg-charcoal-600 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="aspect-square bg-charcoal-600 rounded-2xl animate-pulse col-span-1" />
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-charcoal-600 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) return <div className="text-charcoal-200">Product not found.</div>;

  const images = product.images || [];
  const variants = product.variants || [];

  const TYPE_COLORS: Record<string, string> = {
    rental: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    sale: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    both: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/products')}>
          Back
        </Button>
        <div className="flex-1">
          <h2 className="page-title">{product.name}</h2>
        </div>
        <Button variant="secondary" icon={<Edit size={16} />} onClick={() => navigate(`/products/${id}/edit`)}>
          Edit
        </Button>
        <Button variant="danger" size="sm" icon={<Trash2 size={15} />} onClick={() => setConfirmDeleteProduct(true)}>
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Images */}
        <Card padding="none" className="lg:col-span-1">
          <div className="aspect-square bg-charcoal-600/50 flex items-center justify-center rounded-t-2xl overflow-hidden">
            {images[activeImage] ? (
              <img src={images[activeImage].url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Package size={48} className="text-charcoal-300" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {images.map((img: any, i: number) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors',
                    i === activeImage ? 'border-gold-600' : 'border-charcoal-400'
                  )}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-display text-xl font-semibold text-charcoal-50">{product.name}</h3>
                {product.description && <p className="text-charcoal-200 text-sm mt-1">{product.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('badge-status border text-xs px-2.5 py-1', TYPE_COLORS[product.type])}>
                  {product.type === 'both' ? 'Rental & Sale' : product.type === 'rental' ? 'Rental' : 'Sale'}
                </span>
                <Badge variant={product.is_active ? 'success' : 'neutral'}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Pricing */}
          <Card>
            <h4 className="text-sm font-semibold text-charcoal-100 mb-3">Pricing</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.selling_price && (
                <div className="p-3 bg-charcoal-600/50 rounded-xl">
                  <p className="text-xs text-charcoal-200">Selling Price</p>
                  <p className="text-lg font-semibold text-charcoal-50">{formatCurrency(product.selling_price)}</p>
                </div>
              )}
              {product.rental_price_per_day && (
                <div className="p-3 bg-charcoal-600/50 rounded-xl">
                  <p className="text-xs text-charcoal-200">Rental / Day</p>
                  <p className="text-lg font-semibold text-charcoal-50">{formatCurrency(product.rental_price_per_day)}</p>
                </div>
              )}
              {(product.late_fine_per_day ?? 0) > 0 && (
                <div className="p-3 bg-charcoal-600/50 rounded-xl">
                  <p className="text-xs text-charcoal-200">Late Fine / Day</p>
                  <p className="text-lg font-semibold text-red-400">{formatCurrency(product.late_fine_per_day)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* IDs */}
          <Card>
            <h4 className="text-sm font-semibold text-charcoal-100 mb-3">Product Identifiers</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-charcoal-200 mb-1">SKU</p>
                <code className="text-sm text-gold-400 bg-charcoal-600/50 px-2 py-1 rounded">{product.sku}</code>
              </div>
              {product.barcode && (
                <div>
                  <p className="text-xs text-charcoal-200 mb-1">Barcode</p>
                  <code className="text-sm text-charcoal-50 bg-charcoal-600/50 px-2 py-1 rounded">{product.barcode}</code>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <BarcodePrintModal
        open={!!barcodeItem}
        onClose={() => setBarcodeItem(null)}
        item={barcodeItem}
      />

      <ConfirmDialog
        open={confirmDeleteProduct}
        onClose={() => setConfirmDeleteProduct(false)}
        onConfirm={() => deleteProductMutation.mutate()}
        title="Delete Product"
        message={`Are you sure you want to permanently delete "${product?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteProductMutation.isPending}
      />

      <ConfirmDialog
        open={!!confirmDeleteVariantId}
        onClose={() => setConfirmDeleteVariantId(null)}
        onConfirm={() => confirmDeleteVariantId && deleteVariantMutation.mutate(confirmDeleteVariantId)}
        title="Delete Variant"
        message="Are you sure you want to permanently delete this variant? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteVariantMutation.isPending}
      />

      {/* Variants */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-charcoal-50">Product Variants ({variants.length})</h4>
        </div>
        {variants.length === 0 ? (
          <p className="text-sm text-charcoal-200 text-center py-6">No variants available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-charcoal-500 text-left">
                  {['SKU', 'Size', 'Color', 'Material', 'Selling Price', 'Rental/Day', 'Stock', 'Available', 'Damaged', 'Actions'].map((h) => (
                    <th key={h} className="py-2 px-3 text-xs text-charcoal-200 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map((v: any) => (
                  <tr key={v.id} className="border-b border-charcoal-600 hover:bg-charcoal-600/30">
                    <td className="py-2.5 px-3"><code className="text-xs text-gold-500">{v.sku}</code></td>
                    <td className="py-2.5 px-3">{v.size || '—'}</td>
                    <td className="py-2.5 px-3">{v.color || '—'}</td>
                    <td className="py-2.5 px-3">{v.material || '—'}</td>
                    <td className="py-2.5 px-3">
                      {v.selling_price != null
                        ? <span className="text-gold-400 font-medium">{formatCurrency(v.selling_price)}</span>
                        : <span className="text-charcoal-400 text-xs">default</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {v.rental_price_per_day != null
                        ? <span className="text-gold-400 font-medium">{formatCurrency(v.rental_price_per_day)}</span>
                        : <span className="text-charcoal-400 text-xs">default</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn('font-medium', v.stock_quantity <= 3 ? 'text-red-400' : 'text-charcoal-50')}>
                        {v.stock_quantity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-charcoal-100">{v.available_for_rent}</td>
                    <td className="py-2.5 px-3 text-red-400">{v.damaged_count || 0}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-3">
                        <button
                          className="inline-flex items-center gap-1 text-xs text-charcoal-200 hover:text-gold-400 transition-colors"
                          onClick={() => setBarcodeItem({
                            sku: v.sku,
                            labelId: v.label_id,
                            productName: product.name,
                            size: v.size,
                            color: v.color,
                            price: v.selling_price ?? product.selling_price,
                            stockQty: v.stock_quantity,
                          })}
                        >
                          <Printer size={12} />
                          Barcode
                        </button>
                        <button
                          className="inline-flex items-center gap-1 text-xs text-charcoal-200 hover:text-red-400 transition-colors"
                          onClick={() => setConfirmDeleteVariantId(v.id)}
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
