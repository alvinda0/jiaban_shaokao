import { format } from 'date-fns';
import { useState } from 'react';
import {
  ShoppingCart,
  Percent,
  DollarSign,
  Receipt,
  AlertCircle,
  Trash2,
  Gift,
  Plus,
  Eye,
} from 'lucide-react';
import type { OrderDetails } from '@/types/order';
import { OrderStatusButton, ItemStatusButton } from './StatusButtons';
import { ViewSplitBillsModal } from './ViewSplitBillsModal';

interface OrderDetailProps {
  order: OrderDetails;
  onAddItem?: () => void;
  onUpdateItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onApplyDiscount?: () => void;
  onAddPayment?: () => void;
  onVoidOrder?: () => void;
  onSplitBill?: () => void;
  onUpdateOrderStatus?: (orderId: string, status: 'pending' | 'processing' | 'paid' | 'void' | 'merged') => Promise<void>;
  onUpdateItemStatus?: (orderId: string, itemId: string, status: 'pending' | 'processing' | 'ready' | 'void') => Promise<void>;
}

export const OrderDetail = ({
  order,
  onAddItem,
  onDeleteItem,
  onApplyDiscount,
  onAddPayment,
  onVoidOrder,
  onSplitBill,
  onUpdateOrderStatus,
  onUpdateItemStatus,
}: OrderDetailProps) => {
  const [showViewBillsModal, setShowViewBillsModal] = useState(false);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const activeItems = order.items.filter((item) => item.status !== 'void');
  const canModify = order.status === 'pending' || order.status === 'processing';
  const canAddItems = ['pending', 'processing'].includes(order.status);
  const remainingAmount = order.grand_total - order.paid_total;

  console.log('🔍 Order status:', order.status);
  console.log('🔍 canAddItems:', canAddItems);

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{order.order_number}</h2>
            <p className="text-sm text-gray-500">
              {format(new Date(order.opened_at), 'HH:mm - dd MMM yyyy')}
            </p>
          </div>
          {onUpdateOrderStatus ? (
            <OrderStatusButton
              currentStatus={order.status as 'pending' | 'processing' | 'paid' | 'void' | 'merged'}
              orderId={order.id}
              onStatusChange={onUpdateOrderStatus}
            />
          ) : (
            <span className={`badge badge-${order.status}`}>
              {order.status.toUpperCase()}
            </span>
          )}
        </div>

        {order.table_number && (
          <div className="mb-2">
            <span className="text-sm text-gray-600">Table: </span>
            <span className="font-medium">{order.table_number}</span>
          </div>
        )}

        {order.customer_name && (
          <div className="mb-2">
            <span className="text-sm text-gray-600">Customer: </span>
            <span className="font-medium">{order.customer_name}</span>
          </div>
        )}

        {order.is_complimentary && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <Gift className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Complimentary Order</p>
              {order.complimentary_reason && (
                <p className="text-sm text-yellow-700">{order.complimentary_reason}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Items ({activeItems.length})
          </h3>
          {canAddItems && (
            <button onClick={onAddItem} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4 mr-1" />
              Tambah Pesanan
            </button>
          )}
        </div>

        <div className="space-y-3">
          {activeItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                  {item.is_complimentary && (
                    <span className="badge bg-yellow-100 text-yellow-800 text-xs">
                      FREE
                    </span>
                  )}
                  {onUpdateItemStatus && (
                    <ItemStatusButton
                      currentStatus={item.status as 'pending' | 'processing' | 'ready' | 'void'}
                      itemId={item.id}
                      orderId={order.id}
                      onStatusChange={onUpdateItemStatus}
                    />
                  )}
                </div>

                {item.variants && item.variants.length > 0 && (
                  <div className="mt-1 text-sm text-gray-600">
                    {item.variants.map((v) => (
                      <span key={v.id} className="mr-2">
                        {v.option_name}
                        {v.price_adjustment > 0 && ` (+${formatCurrency(v.price_adjustment)})`}
                      </span>
                    ))}
                  </div>
                )}

                {item.notes && (
                  <p className="mt-1 text-sm text-gray-500 italic">{item.notes}</p>
                )}

                <div className="mt-2 text-sm text-gray-600">
                  Qty: {item.qty} × {formatCurrency(item.unit_price + item.variant_total)}
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {formatCurrency(item.line_total)}
                </p>
                {canModify && !item.is_complimentary && (
                  <button
                    onClick={() => onDeleteItem?.(item.id)}
                    className="mt-2 text-red-600 hover:text-red-700 text-sm"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {activeItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No items in this order</p>
            </div>
          )}
        </div>
      </div>

      {/* Discounts */}
      {order.discounts.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Discounts
          </h3>
          <div className="space-y-2">
            {order.discounts.map((discount) => (
              <div key={discount.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {discount.name} ({discount.type === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value)})
                  {discount.applied_stage === 'payment' && ' - Payment Stage'}
                </span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(discount.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Summary
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(order.subtotal)}</span>
          </div>

          {order.discount_total > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(order.discount_total)}
              </span>
            </div>
          )}

          {order.service_charge_total > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Service Charge</span>
              <span className="font-medium">{formatCurrency(order.service_charge_total)}</span>
            </div>
          )}

          {order.tax_total > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium">{formatCurrency(order.tax_total)}</span>
            </div>
          )}

          {order.rounding !== 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Rounding</span>
              <span className="font-medium">{formatCurrency(order.rounding)}</span>
            </div>
          )}

          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Grand Total</span>
              <span className="font-bold text-xl text-gray-900">
                {formatCurrency(order.grand_total)}
              </span>
            </div>
          </div>

          {order.paid_total > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Paid</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(order.paid_total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Remaining</span>
                <span className="font-bold text-lg text-orange-600">
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Split Bills */}
      {order.bills && order.bills.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Split Bills ({order.bills.length})
          </h3>
          <div className="space-y-4">
            {order.bills.map((bill) => (
              <div 
                key={bill.id} 
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {bill.label || `Bill ${bill.bill_number}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      Bill #{bill.bill_number}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    bill.status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {bill.status === 'paid' ? 'PAID' : 'UNPAID'}
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(bill.subtotal)}</span>
                  </div>
                  
                  {bill.discount_total > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(bill.discount_total)}
                      </span>
                    </div>
                  )}
                  
                  {bill.service_charge_total > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Charge</span>
                      <span className="font-medium">{formatCurrency(bill.service_charge_total)}</span>
                    </div>
                  )}
                  
                  {bill.tax_total > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium">{formatCurrency(bill.tax_total)}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-300 pt-1 mt-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">{formatCurrency(bill.grand_total)}</span>
                    </div>
                  </div>

                  {bill.paid_total > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Paid</span>
                      <span>{formatCurrency(bill.paid_total)}</span>
                    </div>
                  )}

                  {bill.paid_at && (
                    <div className="text-xs text-gray-500 mt-2">
                      Paid at: {format(new Date(bill.paid_at), 'dd MMM yyyy, HH:mm')}
                    </div>
                  )}
                </div>

                {/* Show items if available */}
                {bill.items && bill.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="text-xs font-medium text-gray-700 mb-2">Items:</div>
                    <div className="space-y-1">
                      {bill.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs text-gray-600">
                          <span>{item.product_name || 'Item'} (x{item.qty})</span>
                          <span>{formatCurrency(item.line_total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Total Summary */}
            <div className="border-t-2 border-gray-300 pt-3 mt-3">
              <div className="flex justify-between font-bold text-lg">
                <span>Total All Bills:</span>
                <span className="text-blue-600">
                  {formatCurrency(order.bills.reduce((sum, b) => sum + b.grand_total, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payments */}
      {order.payments.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pembayaran
          </h3>
          <div className="space-y-3">
            {order.payments.map((payment) => (
              <div key={payment.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {payment.payment_method_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(payment.paid_at), 'dd MMM yyyy, HH:mm')}
                    </div>
                    {payment.reference_no && (
                      <div className="text-xs text-gray-500 mt-1">
                        Ref: {payment.reference_no}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(payment.amount)}
                    </div>
                  </div>
                </div>
                
                {/* Show tendered and change for cash payments */}
                {payment.tendered_amount && Number(payment.tendered_amount) > 0 && (
                  <div className="mt-2 pl-3 border-l-2 border-gray-200 text-sm space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Uang Diterima:</span>
                      <span className="font-medium">{formatCurrency(Number(payment.tendered_amount))}</span>
                    </div>
                    {Number(payment.change_amount) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Kembalian:</span>
                        <span className="font-medium">{formatCurrency(Number(payment.change_amount))}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {canModify && (
        <div className="card p-6">
          <div className="grid grid-cols-2 gap-3">
            {activeItems.length > 0 && (
              <>
                <button onClick={onApplyDiscount} className="btn btn-secondary">
                  <Percent className="w-4 h-4 mr-2" />
                  Apply Discount
                </button>
                <button onClick={onAddPayment} className="btn btn-primary">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Add Payment
                </button>
                {/* Show View Split Bills if order is split, otherwise Show Split Bill */}
                {order.is_split ? (
                  <button 
                    onClick={() => setShowViewBillsModal(true)} 
                    className="btn btn-secondary"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Split Bills ({order.bills?.length || 0})
                  </button>
                ) : (
                  <button onClick={onSplitBill} className="btn btn-secondary">
                    <Receipt className="w-4 h-4 mr-2" />
                    Split Bill
                  </button>
                )}
              </>
            )}
            <button onClick={onVoidOrder} className="btn btn-danger col-span-2">
              <AlertCircle className="w-4 h-4 mr-2" />
              Void Order
            </button>
          </div>
        </div>
      )}

      {/* View Split Bills Modal */}
      <ViewSplitBillsModal
        isOpen={showViewBillsModal}
        orderNumber={order.order_number}
        bills={order.bills || []}
        onClose={() => setShowViewBillsModal(false)}
      />
    </div>
  );
};
