import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Order } from '@/types/order';
import styles from './MergeOrderModal.module.css';

interface MergeOrderModalProps {
  isOpen: boolean;
  sourceOrder: Order; // Order yang akan digabungkan (akan jadi merged)
  availableOrders: Order[]; // Order lain yang bisa dipilih sebagai target
  storeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function MergeOrderModal({
  isOpen,
  sourceOrder,
  availableOrders,
  storeId,
  onClose,
  onSuccess,
}: MergeOrderModalProps) {
  const [selectedTargetOrderId, setSelectedTargetOrderId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (amount: number) => {
    return `Rp ${Math.round(amount || 0).toLocaleString('id-ID')}`;
  };

  const handleSubmit = async () => {
    if (!selectedTargetOrderId) {
      toast.error('Pilih order tujuan untuk digabung');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/stores/${storeId}/orders/merge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            target_order_id: selectedTargetOrderId,
            source_order_id: sourceOrder.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal menggabungkan pesanan');
      }

      toast.success('Pesanan berhasil digabungkan');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Merge order error:', error);
      toast.error(error.message || 'Gagal menggabungkan pesanan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedTargetOrderId('');
    onClose();
  };

  if (!isOpen) return null;

  // Filter orders: only pending/processing, same store, not the source order itself
  const validTargetOrders = availableOrders.filter(
    (o) =>
      o.id !== sourceOrder.id &&
      (o.status === 'pending' || o.status === 'processing')
  );

  const selectedTargetOrder = validTargetOrders.find(
    (o) => o.id === selectedTargetOrderId
  );

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2>Gabung Pesanan</h2>
            <p className={styles.subtitle}>
              Gabungkan <strong>{sourceOrder.order_number}</strong> ke pesanan lain
            </p>
          </div>
          <button onClick={handleClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Source Order Info */}
          <div className={styles.sourceOrderCard}>
            <div className={styles.cardLabel}>Pesanan yang akan digabungkan:</div>
            <div className={styles.orderInfo}>
              <div className={styles.orderNumber}>{sourceOrder.order_number}</div>
              <div className={styles.orderDetails}>
                Meja: {sourceOrder.table_number || '-'} • Total:{' '}
                {formatCurrency(sourceOrder.grand_total)}
              </div>
            </div>
            <div className={styles.warningBox}>
              ⚠️ Pesanan ini akan berstatus <strong>"merged"</strong> dan tidak bisa
              diubah lagi
            </div>
          </div>

          {/* Target Order Selection */}
          {validTargetOrders.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Tidak ada pesanan lain yang bisa digabungkan</p>
              <p className={styles.emptyHint}>
                Hanya pesanan dengan status Pending atau Diproses yang bisa digabung
              </p>
            </div>
          ) : (
            <>
              <div className={styles.sectionLabel}>Pilih pesanan tujuan:</div>

              <div className={styles.ordersList}>
                {validTargetOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedTargetOrderId(order.id)}
                    className={`${styles.orderCard} ${
                      selectedTargetOrderId === order.id
                        ? styles.orderCardSelected
                        : ''
                    }`}
                  >
                    <div className={styles.orderCardHeader}>
                      <div className={styles.orderNumber}>{order.order_number}</div>
                      <div className={styles.orderStatus}>
                        {order.status === 'pending' ? 'Pending' : 'Diproses'}
                      </div>
                    </div>
                    <div className={styles.orderCardBody}>
                      <div>Meja: {order.table_number || '-'}</div>
                      <div>
                        Pelanggan: {order.customer_name || '-'}
                      </div>
                      <div className={styles.orderTotal}>
                        Total: {formatCurrency(order.grand_total)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Preview after merge */}
              {selectedTargetOrder && (
                <div className={styles.previewCard}>
                  <div className={styles.cardLabel}>Setelah digabung:</div>
                  <div className={styles.previewDetails}>
                    <div className={styles.previewRow}>
                      <span>No. Pesanan:</span>
                      <strong>{selectedTargetOrder.order_number}</strong>
                    </div>
                    
                    <div className={styles.divider}></div>
                    
                    <div className={styles.previewRow}>
                      <span>Subtotal:</span>
                      <span>
                        {formatCurrency(
                          Number(selectedTargetOrder.subtotal || 0) + Number(sourceOrder.subtotal || 0)
                        )}
                      </span>
                    </div>
                    
                    {(Number(selectedTargetOrder.discount_total || 0) + Number(sourceOrder.discount_total || 0)) > 0 && (
                      <div className={styles.previewRow}>
                        <span>Discount:</span>
                        <span style={{ color: '#DC2626' }}>
                          - {formatCurrency(
                            Number(selectedTargetOrder.discount_total || 0) + Number(sourceOrder.discount_total || 0)
                          )}
                        </span>
                      </div>
                    )}
                    
                    <div className={styles.previewRow}>
                      <span>Service Charge:</span>
                      <span>
                        {formatCurrency(
                          Number(selectedTargetOrder.service_charge_total || 0) + Number(sourceOrder.service_charge_total || 0)
                        )}
                      </span>
                    </div>
                    
                    <div className={styles.previewRow}>
                      <span>PB1:</span>
                      <span>
                        {formatCurrency(
                          Number(selectedTargetOrder.tax_total || 0) + Number(sourceOrder.tax_total || 0)
                        )}
                      </span>
                    </div>
                    
                    <div className={styles.divider}></div>
                    
                    <div className={styles.previewRow} style={{ fontWeight: 600, fontSize: '16px' }}>
                      <span>Total Gabungan:</span>
                      <strong>
                        {formatCurrency(
                          Number(selectedTargetOrder.grand_total || 0) + Number(sourceOrder.grand_total || 0)
                        )}
                      </strong>
                    </div>
                  </div>
                  <div className={styles.infoBox}>
                    ℹ️ Semua item dari {sourceOrder.order_number} akan dipindah ke{' '}
                    {selectedTargetOrder.order_number}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={handleClose} className={styles.cancelBtn}>
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedTargetOrderId}
            className={`${styles.submitBtn} ${
              isSubmitting || !selectedTargetOrderId ? styles.submitBtnDisabled : ''
            }`}
          >
            {isSubmitting ? 'Menggabungkan...' : 'Gabung Pesanan'}
          </button>
        </div>
      </div>
    </div>
  );
}
