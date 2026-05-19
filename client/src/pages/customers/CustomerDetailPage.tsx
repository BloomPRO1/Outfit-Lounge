import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { customerService } from '@/services/customerService';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerService.getById(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="animate-pulse space-y-5"><div className="h-32 bg-charcoal-600 rounded-2xl" /><div className="h-48 bg-charcoal-600 rounded-2xl" /></div>;
  if (!data) return <div className="text-charcoal-200">Customer not found.</div>;

  const outstandingFines = data.fines?.filter((f: any) => !f.is_paid).reduce((sum: number, f: any) => sum + parseFloat(f.total_fine), 0) || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/customers')}>Back</Button>
        <h2 className="page-title flex-1">{data.name}</h2>
        <Button variant="secondary" onClick={() => navigate('/rentals/new')}>New Rental</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile */}
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-16 h-16 rounded-full bg-gold-700/20 border border-gold-700/40 flex items-center justify-center mb-3">
                <span className="text-gold-400 text-2xl font-semibold font-display">{data.name.charAt(0)}</span>
              </div>
              <h3 className="font-semibold text-charcoal-50 text-lg">{data.name}</h3>
              <p className="text-xs text-charcoal-200">Since {formatDate(data.created_at)}</p>
            </div>

            <div className="space-y-2.5 mt-4 pt-4 border-t border-charcoal-500">
              {data.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-charcoal-300 flex-shrink-0" />
                  <span className="text-charcoal-100">{data.phone}</span>
                </div>
              )}
              {data.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-charcoal-300 flex-shrink-0" />
                  <span className="text-charcoal-100">{data.email}</span>
                </div>
              )}
              {data.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin size={14} className="text-charcoal-300 mt-0.5 flex-shrink-0" />
                  <span className="text-charcoal-100">{data.address}</span>
                </div>
              )}
              {data.notes && (
                <div className="mt-2 pt-2 border-t border-charcoal-500">
                  <p className="text-xs text-charcoal-200">{data.notes}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center py-4">
              <p className="text-2xl font-semibold text-charcoal-50">{data.rentals?.length || 0}</p>
              <p className="text-xs text-charcoal-200 mt-1">Total Rentals</p>
            </Card>
            <Card className={`text-center py-4 ${outstandingFines > 0 ? 'border-red-500/30' : ''}`}>
              <p className={`text-2xl font-semibold ${outstandingFines > 0 ? 'text-red-400' : 'text-charcoal-50'}`}>
                {formatCurrency(outstandingFines)}
              </p>
              <p className="text-xs text-charcoal-200 mt-1">Outstanding Fines</p>
            </Card>
          </div>
        </div>

        {/* History */}
        <div className="lg:col-span-2 space-y-5">
          {/* Rental History */}
          <Card>
            <h4 className="font-semibold text-charcoal-50 mb-4">Rental History</h4>
            {data.rentals?.length ? (
              <div className="space-y-2">
                {data.rentals.map((rental: any) => (
                  <div
                    key={rental.id}
                    className="flex items-center justify-between p-3 bg-charcoal-600/50 rounded-xl cursor-pointer hover:bg-charcoal-600 transition-colors"
                    onClick={() => navigate(`/rentals/${rental.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-charcoal-50">{rental.booking_number}</p>
                      <p className="text-xs text-charcoal-200">{formatDate(rental.rental_start_date)} → {formatDate(rental.rental_end_date)}</p>
                    </div>
                    <div className="text-right">
                      <Badge status={rental.status} />
                      <p className="text-xs text-charcoal-200 mt-1">{rental.item_count} items</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-charcoal-200 text-center py-6">No rental history</p>
            )}
          </Card>

          {/* Payment History */}
          <Card>
            <h4 className="font-semibold text-charcoal-50 mb-4">Payment History</h4>
            {data.payments?.length ? (
              <div className="space-y-2">
                {data.payments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-charcoal-600/50 rounded-xl">
                    <div>
                      <p className="text-sm text-charcoal-50 capitalize">{payment.payment_type?.replace('_', ' ')}</p>
                      <p className="text-xs text-charcoal-200">{payment.booking_number || payment.sale_number} · {payment.payment_method}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-emerald-400">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-charcoal-200">{formatDateTime(payment.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-charcoal-200 text-center py-6">No payment history</p>
            )}
          </Card>

          {/* Fines */}
          {data.fines?.length > 0 && (
            <Card>
              <h4 className="font-semibold text-charcoal-50 mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" /> Fine History
              </h4>
              <div className="space-y-2">
                {data.fines.map((fine: any) => (
                  <div key={fine.id} className="flex items-center justify-between p-3 rounded-xl bg-charcoal-600/50">
                    <div>
                      <p className="text-sm text-charcoal-50">{fine.booking_number}</p>
                      <p className="text-xs text-charcoal-200">{fine.days_late} days late · {formatCurrency(fine.fine_per_day)}/day</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-400">{formatCurrency(fine.total_fine)}</p>
                      <Badge variant={fine.is_paid ? 'success' : 'error'} size="sm">
                        {fine.is_paid ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
