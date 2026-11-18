import { X } from 'lucide-react';
import type { OrderDetails } from '@/types/order';
import styles from './OrderDetailModal.module.css';

interface OrderDetailModalProps {
  isOpen: boolean;
  order: OrderDetails | null;
  onClose: () => void;
}

export function OrderDetailModal({ isOpen, order, onClose }: OrderDetailModalProps) {
  if (!isOpen || !order) return null;

  const formatCurrency = (amount: number) => {
    return `Rp ${Math.round(amount || 0).toLocaleString('id-ID')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Pending',
      paid: 'Selesai',
      void: 'Batal',
      merged: 'Digabung',
    };
    return labels[status] || status;
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      dine_in: 'Makan di Tempat',
      takeaway: 'Bawa Pulang',
      delivery: 'Antar',
    };
    return labels[type] || type;
  };

  // Group items by source (original order or added items)
  const groupItemsByAddition = () => {
    if (!order.items || order.items.length === 0) return [];
    
    // Debug: Check what data we have
    console.log('🔍 Order items:', order.items.map(item => ({
      name: item.product_name,
      original_order_id: item.original_order_id,
      merged_from_order_number: item.merged_from_order_number,
      notes: item.notes
    })));
    
    // Sort items by created_at
    const sortedItems = [...order.items].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const groups: Array<{ 
      label: string; 
      items: typeof order.items; 
      timestamp: string; 
      isMerged?: boolean;
      originalOrderNumber?: string;
    }> = [];
    let currentTimestamp: string | null = null;
    let additionCount = 0;
    
    sortedItems.forEach((item) => {
      const itemTime = new Date(item.created_at).getTime();
      
      // Check if this item has merged_from_order_number (merged item)
      const mergedFromOrderNumber = item.merged_from_order_number;
      const isMergedItem = !!mergedFromOrderNumber;
      
      // Check if this is from a merged order
      if (isMergedItem) {
        // Check if we already have a group for this specific original order
        const existingMergedGroup = groups.find(
          g => g.isMerged && g.originalOrderNumber === mergedFromOrderNumber
        );
        
        if (existingMergedGroup) {
          existingMergedGroup.items.push(item);
        } else {
          groups.push({ 
            label: 'Gabung Orderan', 
            items: [item], 
            timestamp: item.created_at,
            isMerged: true,
            originalOrderNumber: mergedFromOrderNumber
          });
        }
      } else {
        // Regular item (not from merged order)
        // If this is a new timestamp group (more than 10 seconds difference), create new group
        if (!currentTimestamp || 
            Math.abs(itemTime - new Date(currentTimestamp).getTime()) > 10000) {
          currentTimestamp = item.created_at;
          additionCount++;
          
          const label = additionCount === 1 
            ? 'Pesanan Awal' 
            : `Tambahan ke-${additionCount - 1}`;
          
          groups.push({ label, items: [item], timestamp: item.created_at });
        } else {
          // Add to current group
          groups[groups.length - 1].items.push(item);
        }
      }
    });
    
    return groups;
  };

  const itemGroups = groupItemsByAddition();

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{order.order_number}</h2>
            <p className={styles.subtitle}>{formatDate(order.opened_at)}</p>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Order Info */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Informasi Pesanan</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Status Pesanan</span>
                <span className={styles.infoBadge}>{getStatusLabel(order.status)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Tipe Pesanan</span>
                <span className={styles.infoValue}>{getOrderTypeLabel(order.order_type)}</span>
              </div>
              {order.table_number && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Meja</span>
                  <span className={styles.infoValue}>{order.table_number}</span>
                </div>
              )}
              {order.customer_name && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Pelanggan</span>
                  <span className={styles.infoValue}>{order.customer_name}</span>
                </div>
              )}
              {order.customer_phone && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>No. WhatsApp</span>
                  <span className={styles.infoValue}>{order.customer_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Item Pesanan</h3>
            <div className={styles.itemsList}>
              {itemGroups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  {/* Group Label Badge */}
                  {itemGroups.length > 1 && (
                    <div style={{
                      background: group.isMerged ? '#F59E0B' : (groupIndex === 0 ? '#10B981' : '#3B82F6'),
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      marginBottom: '12px',
                      display: 'inline-block'
                    }}>
                      {group.isMerged 
                        ? `${group.label} dari ${group.originalOrderNumber}` 
                        : `${group.label} - ${formatDate(group.timestamp)}`
                      }
                    </div>
                  )}
                  
                  {/* Items in this group */}
                  {group.items.map((item) => (
                    <div key={item.id} className={styles.item}>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemName}>{item.product_name}</div>
                        {item.variants && item.variants.length > 0 && (
                          <div className={styles.itemVariants}>
                            {item.variants.map((v, i) => (
                              <span key={i}>
                                {v.group_name}: {v.option_name}
                                {i < item.variants!.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <div className={styles.itemNotes}>Catatan: {item.notes}</div>
                        )}
                        <div className={styles.itemQty}>Qty: {item.qty}</div>
                      </div>
                      <div className={styles.itemPrice}>
                        {formatCurrency(item.line_total)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Ringkasan</h3>
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              
              {order.discount_total > 0 && (
                <div className={styles.summaryRow}>
                  <span className={styles.discountText}>Diskon</span>
                  <span className={styles.discountText}>
                    - {formatCurrency(order.discount_total)}
                  </span>
                </div>
              )}
              
              {order.service_charge_total > 0 && (
                <div className={styles.summaryRow}>
                  <span>Service Charge</span>
                  <span>{formatCurrency(order.service_charge_total)}</span>
                </div>
              )}
              
              {order.tax_total > 0 && (
                <div className={styles.summaryRow}>
                  <span>Pajak</span>
                  <span>{formatCurrency(order.tax_total)}</span>
                </div>
              )}
              
              <div className={styles.totalRow}>
                <span>Total</span>
                <span>{formatCurrency(order.grand_total)}</span>
              </div>
              
              {order.paid_total > 0 && (
                <>
                  <div className={styles.summaryRow}>
                    <span className={styles.paidText}>Dibayar</span>
                    <span className={styles.paidText}>
                      {formatCurrency(order.paid_total)}
                    </span>
                  </div>
                  
                  {/* Show tendered and change amounts if available */}
                  {order.payments && order.payments.length > 0 && order.payments[0].tendered_amount && Number(order.payments[0].tendered_amount) > 0 && (
                    <>
                      <div className={styles.summaryRow}>
                        <span>Uang Diterima</span>
                        <span>{formatCurrency(Number(order.payments[0].tendered_amount))}</span>
                      </div>
                      {Number(order.payments[0].change_amount) > 0 && (
                        <div className={styles.summaryRow}>
                          <span>Kembalian</span>
                          <span>{formatCurrency(Number(order.payments[0].change_amount))}</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {order.paid_total < order.grand_total && (
                    <div className={styles.summaryRow}>
                      <span className={styles.remainingText}>Sisa</span>
                      <span className={styles.remainingText}>
                        {formatCurrency(order.grand_total - order.paid_total)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Payments */}
          {order.payments && order.payments.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Pembayaran</h3>
              <div className={styles.paymentsList}>
                {order.payments.map((payment) => (
                  <div key={payment.id} className={styles.payment}>
                    <div className={styles.paymentInfo}>
                      <div className={styles.paymentMethod}>
                        {payment.payment_method_name || 'Cash'}
                      </div>
                      <div className={styles.paymentDate}>
                        {formatDate(payment.paid_at)}
                      </div>
                    </div>
                    <div className={styles.paymentAmount}>
                      {formatCurrency(Number(payment.amount))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.closeButton}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
