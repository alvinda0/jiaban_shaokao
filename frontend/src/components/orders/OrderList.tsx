import { useState } from 'react';
import type { Order } from '@/types/order';
import { PaymentModal } from './PaymentModal';
import styles from './OrderList.module.css';

interface OrderListProps {
  orders: Order[];
  onSelectOrder?: (order: Order) => void;
  onAcceptOrder?: (orderId: string) => void;
  onMarkReady?: (orderId: string) => void; // Mark cooking as ready/done
  onAddItems?: (order: Order) => void; // Add items to existing order
  onTransferTable?: (order: Order) => void; // Transfer to another table
  onMergeOrder?: (order: Order) => void; // Merge orders
  onPayment?: (orderId: string, data: any) => void;
  onViewSplitBills?: (order: Order) => void;
  onGetOrderDetails?: (orderId: string) => Promise<any>; // To fetch discount details
  selectedOrderId?: string;
  availablePromos?: Array<{
    id: string;
    code: string;
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    description?: string;
  }>;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  totalOrders?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export const OrderList = ({ 
  orders, 
  onSelectOrder, 
  onAcceptOrder,
  onMarkReady,
  onAddItems,
  onTransferTable,
  onMergeOrder,
  onPayment,
  onViewSplitBills,
  selectedOrderId,
  availablePromos = [],
  currentPage = 1,
  totalPages = 1,
  totalOrders = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange
}: OrderListProps) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentOrderData, setPaymentOrderData] = useState<{
    total: number;
    subtotal: number;
    discount: number;
    discountName: string;
    voucherCode: string;
    tax: number;
    serviceCharge: number;
    orderType: 'dine_in' | 'take_away' | 'takeaway' | 'delivery';
  }>({
    total: 0,
    subtotal: 0,
    discount: 0,
    discountName: '',
    voucherCode: '',
    tax: 0,
    serviceCharge: 0,
    orderType: 'dine_in',
  });

  const handlePaymentClick = (order: Order) => {
    setPaymentOrderId(order.id);
    
    // Extract discount name and voucher code from order notes
    let discountName = order.discount_total > 0 ? 'Diskon' : '';
    let voucherCode = '';
    
    // Try to extract voucher code from notes
    if (order.notes && order.notes.includes('Voucher:')) {
      const voucherMatch = order.notes.match(/Voucher:\s*([A-Z0-9]+)/i);
      if (voucherMatch) {
        voucherCode = voucherMatch[1];
        discountName = `Voucher ${voucherCode}`;
      }
    }
    
    setPaymentOrderData({
      total: order.grand_total,
      subtotal: order.subtotal,
      discount: order.discount_total,
      discountName: discountName,
      voucherCode: voucherCode, // Add voucher code
      tax: order.tax_total,
      serviceCharge: order.service_charge_total,
      orderType: order.order_type,
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = (data: any) => {
    console.log('💰 handlePaymentSubmit called with data:', data);
    console.log('💰 data.promoCode from modal:', data.promoCode);
    console.log('💰 paymentOrderData.voucherCode from order:', paymentOrderData.voucherCode);
    
    if (paymentOrderId && onPayment) {
      // Priority: use promo from modal if selected, otherwise use existing voucher from order
      const finalPromoCode = data.promoCode || paymentOrderData.voucherCode;
      
      if (finalPromoCode) {
        console.log('✅ Using promo code:', finalPromoCode);
        data.promoCode = finalPromoCode;
      }
      
      console.log('📤 Final payment data to send:', data);
      onPayment(paymentOrderId, data);
    }
    setShowPaymentModal(false);
    setPaymentOrderId(null);
  };

  const getStatusPesananClass = (status: Order['status']) => {
    const classes: Record<string, string> = {
      pending: styles.statusOpen,
      processing: styles.statusProcessing,
      paid: styles.statusPaid,
      void: styles.statusVoid,
      merged: styles.statusMerged,
    };
    return classes[status] || '';
  };

  const getStatusPesananLabel = (status: Order['status']) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      processing: 'Diproses',
      paid: 'Selesai',
      void: 'Batal',
      merged: 'Digabung',
    };
    return labels[status] || status;
  };

  const getOrderTypeLabel = (type: Order['order_type']) => {
    const labels = {
      dine_in: 'Makan di Tempat',
      takeaway: 'Bawa Pulang',
      delivery: 'Antar',
    };
    return labels[type];
  };

  // Status Masakan berdasarkan status order dan items (for future enhancement)
  const getStatusMasakan = (order: Order) => {
    if (order.status === 'void') return { label: '-', class: '' };
    if (order.status === 'paid') return { label: 'Selesai', class: styles.cookingServed };
    // Status 'pending' = Pending
    if (order.status === 'pending') return { label: 'Pending', class: styles.cookingPending };
    // Status 'processing' = Could be 'Diproses' or 'Selesai' depending on items
    // For now, show 'Diproses' - in future can check if all items are 'ready'
    if (order.status === 'processing') return { label: 'Diproses', class: styles.cookingPreparing };
    return { label: '-', class: '' };
  };

  // Metode Pembayaran berdasarkan payment methods
  const getMetodePembayaran = (order: Order) => {
    // If order has payment_methods populated from backend, use it
    if (order.payment_methods) {
      return order.payment_methods; // e.g., "QRIS, Cash"
    }
    
    // Fallback to status-based logic
    if (order.paid_total > 0) {
      return 'Sebagian';
    }
    
    return '-';
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${Math.round(amount || 0).toLocaleString('id-ID')}`;
  };

  if (orders.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🧾</span>
        <p className={styles.emptyTitle}>Tidak ada pesanan</p>
        <p className={styles.emptyDesc}>Pesanan akan muncul di sini setelah dibuat</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>No. Pesanan</th>
            <th>Meja</th>
            <th>Pelanggan</th>
            <th>Tipe</th>
            <th>Status Pesanan</th>
            <th>Status Masakan</th>
            <th>Metode Pembayaran</th>
            <th>Total</th>
            <th style={{ minWidth: '300px' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const statusMasakan = getStatusMasakan(order);
            
            return (
              <tr
                key={order.id}
                className={`${styles.row} ${
                  selectedOrderId === order.id ? styles.rowSelected : ''
                }`}
              >
                <td 
                  className={styles.orderNumber}
                  onClick={() => onSelectOrder?.(order)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {order.order_number}
                    {order.is_split && (
                      <span 
                        className={styles.splitBadge}
                        title="Order ini sudah di-split"
                      >
                        SPLIT
                      </span>
                    )}
                  </div>
                </td>
                <td onClick={() => onSelectOrder?.(order)} style={{ cursor: 'pointer' }}>
                  {order.table_number || '-'}
                </td>
                <td onClick={() => onSelectOrder?.(order)} style={{ cursor: 'pointer' }}>
                  {order.customer_name || '-'}
                </td>
                <td onClick={() => onSelectOrder?.(order)} style={{ cursor: 'pointer' }}>
                  {getOrderTypeLabel(order.order_type)}
                </td>
                <td onClick={() => onSelectOrder?.(order)} style={{ cursor: 'pointer' }}>
                  <span className={`${styles.statusBadge} ${getStatusPesananClass(order.status)}`}>
                    {getStatusPesananLabel(order.status)}
                  </span>
                </td>
                <td onClick={() => onSelectOrder?.(order)} style={{ cursor: 'pointer' }}>
                  {statusMasakan.label !== '-' ? (
                    <span className={`${styles.cookingBadge} ${statusMasakan.class}`}>
                      {statusMasakan.label}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td onClick={() => onSelectOrder?.(order)} style={{ cursor: 'pointer' }}>
                  {getMetodePembayaran(order)}
                </td>
                <td 
                  className={styles.total}
                  onClick={() => onSelectOrder?.(order)}
                  style={{ cursor: 'pointer' }}
                >
                  {formatCurrency(order.grand_total)}
                </td>
                <td style={{ minWidth: '300px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', alignItems: 'center' }}>
                    {/* Pending status actions */}
                    {order.status === 'pending' && onAcceptOrder && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAcceptOrder(order.id);
                        }}
                        className={styles.processBtn}
                      >
                        Proses
                      </button>
                    )}
                    
                    {/* Processing status - Selesai button */}
                    {order.status === 'processing' && order.payment_methods && onMarkReady && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkReady(order.id);
                        }}
                        className={styles.readyBtn}
                        title="Tandai pesanan selesai"
                      >
                        Selesai
                      </button>
                    )}
                    
                    {/* Processing status - Bayar button */}
                    {order.status === 'processing' && !order.payment_methods && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePaymentClick(order);
                        }}
                        className={styles.acceptBtn}
                      >
                        Bayar
                      </button>
                    )}
                    
                    {/* Split button for creating split (not yet split, not yet paid) */}
                    {order.status === 'processing' && !order.is_split && !order.payment_methods && onViewSplitBills && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewSplitBills(order);
                        }}
                        className={styles.splitBtn}
                        title="Split bill order ini"
                      >
                        Split
                      </button>
                    )}
                    
                    {/* Split Bills button - Show for split orders regardless of status */}
                    {order.is_split && onViewSplitBills && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewSplitBills(order);
                        }}
                        className={styles.viewSplitBtn}
                        title="Lihat detail split bills"
                      >
                        Split Bills
                      </button>
                    )}
                    
                    {/* Item button */}
                    {((order.status === 'pending' || (order.status === 'processing' && !order.payment_methods)) && onAddItems) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddItems(order);
                        }}
                        className={styles.addItemBtn}
                        title="Tambah pesanan ke order ini"
                      >
                        Item
                      </button>
                    )}
                    
                    {/* Meja button */}
                    {((order.status === 'pending' || (order.status === 'processing' && !order.payment_methods)) && order.order_type === 'dine_in' && onTransferTable) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTransferTable(order);
                        }}
                        className={styles.transferBtn}
                        title="Pindah meja"
                      >
                        Meja
                      </button>
                    )}
                    
                    {/* Gabung button */}
                    {((order.status === 'pending' || (order.status === 'processing' && !order.payment_methods)) && onMergeOrder) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMergeOrder(order);
                        }}
                        className={styles.mergeBtn}
                        title="Gabung dengan pesanan lain"
                      >
                        Gabung
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination - Inside table container */}
      {totalPages > 0 && (
        <div className={styles.pagination}>
          <div className={styles.paginationLeft}>
            <span className={styles.paginationInfo}>
              Halaman {currentPage} dari {totalPages} • Total {totalOrders} pesanan
            </span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className={styles.pageSizeSelect}
            >
              <option value={10}>10 per halaman</option>
              <option value={25}>25 per halaman</option>
              <option value={50}>50 per halaman</option>
              <option value={100}>100 per halaman</option>
            </select>
          </div>
          
          <div className={styles.paginationButtons}>
            <button
              onClick={() => onPageChange?.(1)}
              disabled={currentPage === 1}
              className={styles.paginationBtn}
            >
              ««
            </button>
            <button
              onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={styles.paginationBtn}
            >
              ‹
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  className={`${styles.paginationBtn} ${
                    currentPage === pageNum ? styles.paginationBtnActive : ''
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={styles.paginationBtn}
            >
              ›
            </button>
            <button
              onClick={() => onPageChange?.(totalPages)}
              disabled={currentPage === totalPages}
              className={styles.paginationBtn}
            >
              »»
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        orderTotal={paymentOrderData.total}
        orderSubtotal={paymentOrderData.subtotal}
        orderDiscount={paymentOrderData.discount}
        orderDiscountName={paymentOrderData.discountName}
        orderTax={paymentOrderData.tax}
        orderServiceCharge={paymentOrderData.serviceCharge}
        orderType={paymentOrderData.orderType}
        availablePromos={availablePromos}
        onPayment={handlePaymentSubmit}
      />
    </div>
  );
};
