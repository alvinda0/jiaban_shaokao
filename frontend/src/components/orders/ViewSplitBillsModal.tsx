import { X } from 'lucide-react';
import { format } from 'date-fns';
import type { OrderBill } from '@/types/order';
import styles from './SplitBillModal.module.css';

interface ViewSplitBillsModalProps {
  isOpen: boolean;
  orderNumber: string;
  bills: OrderBill[];
  payments?: any[]; // Payment list for showing payment methods
  orderStatus?: string; // Order status to determine if editable
  onClose: () => void;
  onPayBill?: (billId: string) => void;
  onEditSplit?: () => void; // Callback to re-open split modal for editing
}

export function ViewSplitBillsModal({ 
  isOpen, 
  orderNumber, 
  bills, 
  payments = [],
  orderStatus,
  onClose,
  onPayBill,
  onEditSplit 
}: ViewSplitBillsModalProps) {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return `Rp ${Math.round(amount || 0).toLocaleString('id-ID')}`;
  };

  const totalAllBills = bills.reduce((sum, b) => sum + parseFloat(b.grand_total?.toString() || '0'), 0);
  const totalPaid = bills.reduce((sum, b) => sum + parseFloat(b.paid_total?.toString() || '0'), 0);
  const remainingTotal = totalAllBills - totalPaid;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Split Bills</h2>
            <p className={styles.subtitle}>{orderNumber}</p>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Summary */}
          <div className={styles.totalInfo}>
            <div className={styles.infoRow}>
              <span>Total All Bills:</span>
              <span className={styles.amount}>{formatCurrency(totalAllBills)}</span>
            </div>
            <div className={styles.infoRow}>
              <span>Total Paid:</span>
              <span className={styles.amountPaid}>{formatCurrency(totalPaid)}</span>
            </div>
            {remainingTotal > 0 && (
              <div className={styles.infoRow}>
                <span>Remaining:</span>
                <span className={styles.amountRemaining}>{formatCurrency(remainingTotal)}</span>
              </div>
            )}
          </div>

          {/* Bills List */}
          <div className={styles.section}>
            <label className={styles.label}>Bills ({bills.length})</label>
            <div className={styles.splits}>
              {bills.map((bill) => {
                const isPaid = bill.status === 'paid';
                const grandTotal = parseFloat(bill.grand_total?.toString() || '0');
                const paidTotal = parseFloat(bill.paid_total?.toString() || '0');
                const remaining = grandTotal - paidTotal;
                
                // Get payments for this bill
                const billPayments = payments.filter(p => p.bill_id === bill.id);
                const hasPayment = billPayments.length > 0;
                
                return (
                  <div key={bill.id} className={styles.splitCard}>
                    <div className={styles.splitHeader}>
                      <div>
                        <div className={styles.splitTitle}>
                          {bill.label || `Bill ${bill.bill_number}`}
                        </div>
                        <div className={styles.splitSubtitle}>
                          Bill #{bill.bill_number}
                        </div>
                      </div>
                      <span 
                        className={`${styles.statusBadge} ${
                          isPaid ? styles.statusPaid : styles.statusUnpaid
                        }`}
                      >
                        {isPaid ? 'PAID' : 'UNPAID'}
                      </span>
                    </div>

                    {/* Bill Breakdown */}
                    <div className={styles.splitTotals}>
                      {/* Show subtotal - if 0, try to infer from payments or grand_total */}
                      <div className={styles.totalRow}>
                        <span>Subtotal:</span>
                        <span>{formatCurrency(
                          parseFloat(bill.subtotal?.toString() || '0') > 0 
                            ? parseFloat(bill.subtotal?.toString() || '0')
                            : parseFloat(bill.grand_total?.toString() || '0')
                        )}</span>
                      </div>
                      
                      {parseFloat(bill.discount_total?.toString() || '0') > 0 && (
                        <div className={styles.totalRow}>
                          <span>Discount:</span>
                          <span className={styles.discount}>-{formatCurrency(parseFloat(bill.discount_total?.toString() || '0'))}</span>
                        </div>
                      )}
                      
                      {parseFloat(bill.service_charge_total?.toString() || '0') > 0 && (
                        <div className={styles.totalRow}>
                          <span>SC (5%):</span>
                          <span>{formatCurrency(parseFloat(bill.service_charge_total?.toString() || '0'))}</span>
                        </div>
                      )}
                      
                      {parseFloat(bill.tax_total?.toString() || '0') > 0 && (
                        <div className={styles.totalRow}>
                          <span>PB1 (10%):</span>
                          <span>{formatCurrency(parseFloat(bill.tax_total?.toString() || '0'))}</span>
                        </div>
                      )}
                      
                      <div className={styles.totalRowGrand}>
                        <span>Total:</span>
                        <span>{formatCurrency(grandTotal)}</span>
                      </div>

                      {paidTotal > 0 && (
                        <div className={styles.totalRow} style={{ color: '#10b981' }}>
                          <span>Paid:</span>
                          <span>{formatCurrency(paidTotal)}</span>
                        </div>
                      )}

                      {remaining > 0 && (
                        <div className={styles.totalRow} style={{ color: '#f59e0b' }}>
                          <span>Remaining:</span>
                          <span>{formatCurrency(remaining)}</span>
                        </div>
                      )}
                    </div>

                    {/* Payment Methods (if paid) */}
                    {billPayments.length > 0 && (
                      <div className={styles.paidInfo} style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '8px', color: '#166534' }}>
                          💳 Payment Methods:
                        </div>
                        {billPayments.map((payment, idx) => {
                          const isCash = payment.payment_method_type === 'cash' || payment.payment_method_id === 'cash';
                          const tenderedAmount = parseFloat(payment.tendered_amount?.toString() || '0');
                          const changeAmount = parseFloat(payment.change_amount?.toString() || '0');
                          
                          return (
                            <div key={payment.id} style={{ marginBottom: idx < billPayments.length - 1 ? '12px' : '0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' }}>
                                <span style={{ fontWeight: 600 }}>• {payment.payment_method_name || payment.payment_method_type}</span>
                                <span style={{ fontWeight: 600 }}>{formatCurrency(parseFloat(payment.amount?.toString() || '0'))}</span>
                              </div>
                              {isCash && tenderedAmount > 0 && (
                                <div style={{ marginLeft: '12px', fontSize: '13px', color: '#166534' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                    <span>Uang Diterima:</span>
                                    <span>{formatCurrency(tenderedAmount)}</span>
                                  </div>
                                  {changeAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span>Kembalian:</span>
                                      <span>{formatCurrency(changeAmount)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {bill.paid_at && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#15803d', borderTop: '1px solid #d1fae5', paddingTop: '8px' }}>
                            ✓ Paid at {format(new Date(bill.paid_at), 'dd MMM yyyy, HH:mm')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Items */}
                    {bill.items && bill.items.length > 0 && (
                      <div className={styles.itemSelection}>
                        <label>Items ({bill.items.length})</label>
                        <div className={styles.items}>
                          {bill.items.map((item) => (
                            <div key={item.id} className={styles.billItem}>
                              <div className={styles.itemInfo}>
                                <div>{item.product_name || 'Item'}</div>
                                <div className={styles.itemMeta}>
                                  Qty: {item.qty} × {formatCurrency(item.unit_price)}
                                </div>
                              </div>
                              <div className={styles.itemPrice}>
                                {formatCurrency(item.line_total)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pay Button - Hide if already has payment OR fully paid OR order completed */}
                    {!hasPayment && !isPaid && onPayBill && remaining > 0 && orderStatus !== 'paid' && orderStatus !== 'void' && (
                      <button
                        onClick={() => onPayBill(bill.id)}
                        className={styles.btnPayBill}
                      >
                        Pay {formatCurrency(remaining)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {onEditSplit && orderStatus !== 'paid' && orderStatus !== 'void' && (
            <button onClick={onEditSplit} className={styles.btnSubmit}>
              ✏️ Edit Split
            </button>
          )}
          <button onClick={onClose} className={styles.btnCancel}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
