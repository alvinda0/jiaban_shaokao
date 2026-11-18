import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './TransferTableModal.module.css';

interface Table {
  id: string;
  number: string;
  type: string;
  is_active: boolean;
}

interface TransferTableModalProps {
  isOpen: boolean;
  orderId: string;
  currentTableNumber: string;
  storeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferTableModal({
  isOpen,
  orderId,
  currentTableNumber,
  storeId,
  onClose,
  onSuccess,
}: TransferTableModalProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && storeId) {
      loadTables();
    }
  }, [isOpen, storeId]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/stores/${storeId}/tables`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load tables');

      const data = await response.json();
      // Get tables from data.tables, filter only active tables
      const allTables = data.data.tables || [];
      const activeTables = allTables.filter(
        (t: Table) => t.is_active && t.number !== currentTableNumber
      );
      setTables(activeTables);
    } catch (error: any) {
      console.error('Failed to load tables:', error);
      toast.error('Gagal memuat daftar meja');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTableId) {
      toast.error('Pilih meja tujuan');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/stores/${storeId}/orders/${orderId}/transfer-table`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            new_table_id: selectedTableId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal pindah meja');
      }

      const selectedTable = tables.find((t) => t.id === selectedTableId);
      toast.success(
        `Pesanan berhasil dipindah ke meja ${selectedTable?.number}`
      );
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Transfer table error:', error);
      toast.error(error.message || 'Gagal pindah meja');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedTableId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2>Pindah Meja</h2>
            <p className={styles.subtitle}>
              Dari meja <strong>{currentTableNumber}</strong>
            </p>
          </div>
          <button onClick={handleClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Memuat daftar meja...</div>
          ) : tables.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Tidak ada meja tersedia saat ini</p>
            </div>
          ) : (
            <>
              <p className={styles.instruction}>
                Pilih meja tujuan untuk memindahkan pesanan:
              </p>

              <div className={styles.tableGrid}>
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTableId(table.id)}
                    className={`${styles.tableCard} ${
                      selectedTableId === table.id ? styles.tableCardSelected : ''
                    }`}
                  >
                    <div className={styles.tableNumber}>{table.number}</div>
                    <div className={styles.tableInfo}>
                      {table.type === 'vip' || table.type === 'vvip' ? '👑 VIP' : '🪑 Reguler'}
                    </div>
                  </button>
                ))}
              </div>
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
            disabled={isSubmitting || !selectedTableId}
            className={`${styles.submitBtn} ${
              isSubmitting || !selectedTableId ? styles.submitBtnDisabled : ''
            }`}
          >
            {isSubmitting ? 'Memindahkan...' : 'Pindah Meja'}
          </button>
        </div>
      </div>
    </div>
  );
}
