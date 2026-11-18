import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { OrderDetails } from '@/types/order';
import styles from './SplitBillModal.module.css';

interface Split {
  id: string;
  label: string;
  item_ids: string[];
  amount: number;
}

interface SplitBillModalProps {
  isOpen: boolean;
  order: OrderDetails;
  onClose: () => void;
  onSubmit: (splits: Split[], splitBy: 'item' | 'amount') => Promise<void>;
}

export function SplitBillModal({ isOpen, order, onClose, onSubmit }: SplitBillModalProps) {
  const [splitBy, setSplitBy] = useState<'item' | 'amount'>('amount');
  const [splits, setSplits] = useState<Split[]>([
    { id: '1', label: 'Bill 1', item_ids: [], amount: 0 },
    { id: '2', label: 'Bill 2', item_ids: [], amount: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Check if order already has bills (already split)
      if (order.bills && order.bills.length > 0) {
        // Load existing bills
        const existingSplits = order.bills.map((bill, index) => ({
          id: (index + 1).toString(),
          label: bill.label || `Bill ${bill.bill_number}`,
          item_ids: bill.items?.map(item => item.order_item_id) || [],
          amount: bill.subtotal,
        }));
        setSplits(existingSplits);
        
        // Determine split method based on existing bills
        const hasItems = order.bills.some(b => b.items && b.items.length > 0);
        setSplitBy(hasItems ? 'item' : 'amount');
      } else {
        // Reset splits when modal opens (new split)
        setSplits([
          { id: '1', label: 'Bill 1', item_ids: [], amount: 0 },
          { id: '2', label: 'Bill 2', item_ids: [], amount: 0 },
        ]);
        setSplitBy('amount');
      }
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const formatCurrency = (amount: number) => {
    return `Rp ${Math.round(amount || 0).toLocaleString('id-ID')}`;
  };

  const orderSubtotal = order.subtotal || 0;
  const orderDiscount = order.discount_total || 0;
  const orderSubtotalAfterDiscount = orderSubtotal - orderDiscount; // Subtotal after discount for validation

  // Calculate SC and PB1 for each split (based on subtotal after discount)
  const calculateTaxForAmount = (amount: number) => {
    const SC_RATE = 0.05; // 5%
    const PB1_RATE = 0.10; // 10%
    
    const sc = Math.round(amount * SC_RATE);
    const base_pb1 = amount + sc;
    const pb1 = Math.round(base_pb1 * PB1_RATE);
    const total = amount + sc + pb1;
    
    return { sc, pb1, total };
  };

  // Get split totals with SC and PB1
  const getSplitTotals = () => {
    return splits.map(split => {
      let subtotal = 0;
      let grandTotal = 0; // Input dari user adalah grand total
      
      if (splitBy === 'item') {
        // Calculate from assigned items
        order.items?.forEach(item => {
          if (split.item_ids.includes(item.id)) {
            subtotal += parseFloat(item.line_total.toString());
          }
        });
        
        // Apply discount proportionally if order has discount
        let discount = 0;
        if (orderDiscount > 0 && orderSubtotal > 0) {
          const discountRatio = orderDiscount / orderSubtotal;
          discount = Math.round(subtotal * discountRatio);
        }
        
        const subtotalAfterDiscount = subtotal - discount;
        const { sc, pb1, total } = calculateTaxForAmount(subtotalAfterDiscount);
        
        return {
          subtotal: Math.round(subtotal),
          discount,
          subtotalAfterDiscount,
          sc,
          pb1,
          total
        };
      } else {
        // User enters GRAND TOTAL (with SC and PB1)
        // We need to reverse-calculate subtotal
        grandTotal = split.amount;
        
        // Reverse formula:
        // total = subtotal_after_discount * 1.05 * 1.10
        // total = subtotal_after_discount * 1.155
        // subtotal_after_discount = total / 1.155
        
        const subtotalAfterDiscount = Math.round(grandTotal / 1.155);
        
        // Calculate discount if order has discount
        let discount = 0;
        if (orderDiscount > 0 && orderSubtotal > 0) {
          const discountRatio = orderDiscount / orderSubtotal;
          // subtotal (before discount) = subtotal_after_discount / (1 - discountRatio)
          subtotal = Math.round(subtotalAfterDiscount / (1 - discountRatio));
          discount = subtotal - subtotalAfterDiscount;
        } else {
          subtotal = subtotalAfterDiscount;
        }
        
        const { sc, pb1 } = calculateTaxForAmount(subtotalAfterDiscount);
        
        return {
          subtotal: Math.round(subtotal),
          discount,
          subtotalAfterDiscount,
          sc,
          pb1,
          total: grandTotal // Use user input as grand total
        };
      }
    });
  };

  const splitTotals = getSplitTotals();
  const grandTotalAllSplits = splitTotals.reduce((sum, s) => sum + s.total, 0);

  const addSplit = () => {
    const newId = (Math.max(...splits.map(s => parseInt(s.id))) + 1).toString();
    setSplits([...splits, { 
      id: newId, 
      label: `Bill ${splits.length + 1}`, 
      item_ids: [], 
      amount: 0 
    }]);
  };

  const removeSplit = (id: string) => {
    if (splits.length <= 2) {
      alert('Minimal 2 split');
      return;
    }
    setSplits(splits.filter(s => s.id !== id));
  };

  const updateSplitLabel = (id: string, label: string) => {
    setSplits(splits.map(s => s.id === id ? { ...s, label } : s));
  };

  const updateSplitAmount = (id: string, amount: number) => {
    setSplits(splits.map(s => s.id === id ? { ...s, amount } : s));
  };

  const toggleItemAssignment = (itemId: string, splitId: string) => {
    setSplits(splits.map(split => {
      if (split.id === splitId) {
        const hasItem = split.item_ids.includes(itemId);
        return {
          ...split,
          item_ids: hasItem 
            ? split.item_ids.filter(id => id !== itemId)
            : [...split.item_ids, itemId]
        };
      } else {
        // Remove from other splits
        return {
          ...split,
          item_ids: split.item_ids.filter(id => id !== itemId)
        };
      }
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (splitBy === 'amount') {
      const totalGrandTotal = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalGrandTotal - order.grand_total) > 1) {
        alert(`Total semua bill (${formatCurrency(totalGrandTotal)}) harus sama dengan total order (${formatCurrency(order.grand_total)})`);
        return;
      }
    } else {
      // Check all items assigned
      const assignedItems = new Set(splits.flatMap(s => s.item_ids));
      const allItems = order.items?.map(i => i.id) || [];
      if (assignedItems.size !== allItems.length) {
        alert('Semua item harus di-assign ke bill!');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Transform splits to send subtotal to backend (not grand total)
      const transformedSplits = splits.map((split, index) => {
        const totals = splitTotals[index];
        return {
          ...split,
          amount: totals.subtotal // Send subtotal to backend, not grand total
        };
      });
      
      await onSubmit(transformedSplits, splitBy);
      onClose();
    } catch (error) {
      console.error('Split bill error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              {order.is_split ? 'Edit Split Bill' : 'Split Bill'}
            </h2>
            <p className={styles.subtitle}>{order.order_number}</p>
            {order.is_split && (
              <p className={styles.hint} style={{ color: '#f59e0b', marginTop: '4px' }}>
                ⚠️ Order sudah di-split. Anda bisa edit atau tambah split baru.
              </p>
            )}
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Total Info */}
          <div className={styles.totalInfo}>
            <div className={styles.infoRow}>
              <span>Subtotal Order:</span>
              <span className={styles.amount}>{formatCurrency(orderSubtotal)}</span>
            </div>
            {orderDiscount > 0 && (
              <div className={styles.infoRow}>
                <span>Diskon:</span>
                <span className={styles.discount}>-{formatCurrency(orderDiscount)}</span>
              </div>
            )}
            {orderDiscount > 0 && (
              <div className={styles.infoRow}>
                <span>Subtotal setelah Diskon:</span>
                <span className={styles.amount} style={{ fontWeight: 600 }}>{formatCurrency(orderSubtotalAfterDiscount)}</span>
              </div>
            )}
            <div className={styles.infoRow}>
              <span>Total dengan SC & PB1:</span>
              <span className={styles.amount}>{formatCurrency(order.grand_total)}</span>
            </div>
          </div>

          {/* Split Method */}
          <div className={styles.section}>
            <label className={styles.label}>Metode Split</label>
            <div className={styles.methodButtons}>
              <button
                className={`${styles.methodBtn} ${splitBy === 'amount' ? styles.active : ''}`}
                onClick={() => setSplitBy('amount')}
              >
                Per Nominal
              </button>
              <button
                className={`${styles.methodBtn} ${splitBy === 'item' ? styles.active : ''}`}
                onClick={() => setSplitBy('item')}
              >
                Per Item
              </button>
            </div>
            <p className={styles.hint}>
              {splitBy === 'amount' 
                ? 'Masukkan TOTAL untuk setiap bill (sudah termasuk SC 5% dan PB1 10%). Total semua bill harus sama dengan total order.'
                : 'Pilih item untuk setiap bill. SC dan PB1 dihitung per bill.'
              }
            </p>
          </div>

          {/* Splits List */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <label className={styles.label}>Bills ({splits.length})</label>
              <button onClick={addSplit} className={styles.btnAddSplit}>
                <Plus size={16} />
                Tambah Bill
              </button>
            </div>

            <div className={styles.splits}>
              {splits.map((split, index) => {
                const totals = splitTotals[index];
                
                return (
                  <div key={split.id} className={styles.splitCard}>
                    <div className={styles.splitHeader}>
                      <input
                        type="text"
                        value={split.label}
                        onChange={(e) => updateSplitLabel(split.id, e.target.value)}
                        className={styles.splitLabelInput}
                        placeholder={`Bill ${index + 1}`}
                      />
                      {splits.length > 2 && (
                        <button 
                          onClick={() => removeSplit(split.id)}
                          className={styles.btnRemove}
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {splitBy === 'amount' ? (
                      <div className={styles.amountInput}>
                        <label>Total (dengan SC & PB1)</label>
                        <input
                          type="text"
                          value={split.amount ? Math.round(split.amount).toLocaleString('id-ID') : ''}
                          onChange={(e) => {
                            // Remove non-numeric characters and parse
                            const numericValue = e.target.value.replace(/[^\d]/g, '');
                            updateSplitAmount(split.id, parseFloat(numericValue) || 0);
                          }}
                          className={styles.input}
                          placeholder="0"
                          inputMode="numeric"
                        />
                        <p className={styles.hint} style={{ fontSize: '12px', marginTop: '4px', color: '#666' }}>
                          Masukkan total yang ingin dibayar (sudah termasuk SC 5% dan PB1 10%)
                        </p>
                      </div>
                    ) : (
                      <div className={styles.itemSelection}>
                        <label>Pilih Item ({split.item_ids.length} item)</label>
                        <div className={styles.items}>
                          {order.items?.map(item => {
                            const isAssigned = split.item_ids.includes(item.id);
                            const assignedTo = splits.find(s => s.item_ids.includes(item.id));
                            const isDisabled = assignedTo && assignedTo.id !== split.id;
                            
                            return (
                              <label 
                                key={item.id} 
                                className={`${styles.itemCheckbox} ${isDisabled ? styles.disabled : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  onChange={() => toggleItemAssignment(item.id, split.id)}
                                  disabled={isDisabled}
                                />
                                <div className={styles.itemInfo}>
                                  <div>{item.product_name}</div>
                                  <div className={styles.itemPrice}>
                                    {formatCurrency(parseFloat(item.line_total.toString()))}
                                  </div>
                                </div>
                                {isDisabled && assignedTo && (
                                  <span className={styles.assignedBadge}>→ {assignedTo.label}</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Totals Preview */}
                    <div className={styles.splitTotals}>
                      <div className={styles.totalRow}>
                        <span>Subtotal:</span>
                        <span>{formatCurrency(totals.subtotal)}</span>
                      </div>
                      {totals.discount > 0 && (
                        <div className={styles.totalRow}>
                          <span>Diskon:</span>
                          <span className={styles.discount}>-{formatCurrency(totals.discount)}</span>
                        </div>
                      )}
                      <div className={styles.totalRow}>
                        <span>SC (5%):</span>
                        <span>{formatCurrency(totals.sc)}</span>
                      </div>
                      <div className={styles.totalRow}>
                        <span>PB1 (10%):</span>
                        <span>{formatCurrency(totals.pb1)}</span>
                      </div>
                      <div className={styles.totalRowGrand}>
                        <span>Total:</span>
                        <span>{formatCurrency(totals.total)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grand Total Check */}
          <div className={styles.grandTotal}>
            <div className={styles.grandTotalRow}>
              <span>Total Semua Bill:</span>
              <span className={styles.grandTotalAmount}>
                {formatCurrency(grandTotalAllSplits)}
              </span>
            </div>
            {splitBy === 'amount' && (
              <div className={styles.validationMessage}>
                {Math.abs(splits.reduce((sum, s) => sum + s.amount, 0) - order.grand_total) <= 1 ? (
                  <span className={styles.valid}>✓ Total sudah sesuai</span>
                ) : (
                  <span className={styles.invalid}>
                    ✗ Total harus {formatCurrency(order.grand_total)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.btnCancel}>
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={styles.btnSubmit}
          >
            {isSubmitting ? 'Memproses...' : `Split Bill (${splits.length} bills)`}
          </button>
        </div>
      </div>
    </div>
  );
}
