import { useState } from 'react';
import { X, CreditCard, Wallet, Smartphone, ShoppingBag, Gift } from 'lucide-react';
import styles from './PaymentModal.module.css';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderTotal: number; // Grand total dari backend (source of truth)
  orderSubtotal?: number;
  orderDiscount?: number;
  orderDiscountName?: string;
  orderTax?: number;
  orderServiceCharge?: number;
  orderType?: 'dine_in' | 'take_away' | 'takeaway' | 'delivery';
  availablePromos?: PromoCode[];
  onPayment: (data: PaymentData) => void;
}

interface PromoCode {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  description?: string;
}

interface PaymentData {
  method: string;
  amount: number;
  tenderedAmount?: number;
  changeAmount?: number;
  referenceNo?: string;
  promoCode?: string;
}

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', type: 'cash', icon: Wallet },
  { id: 'qris', name: 'QRIS', type: 'qris', icon: Smartphone },
  { id: 'complimentary', name: 'Complimentary (Gratis)', type: 'complimentary', icon: Gift },
  { id: 'gofood', name: 'GoFood', type: 'ewallet', icon: ShoppingBag },
  { id: 'grabfood', name: 'GrabFood', type: 'ewallet', icon: ShoppingBag },
  { id: 'shopeefood', name: 'ShopeeFood', type: 'ewallet', icon: ShoppingBag },
  { id: 'cc_mandiri', name: 'Kartu Kredit Mandiri', type: 'credit_card', icon: CreditCard },
  { id: 'debit_mandiri', name: 'Debit Mandiri', type: 'debit', icon: CreditCard },
  { id: 'debit_bca', name: 'Debit BCA', type: 'debit', icon: CreditCard },
  { id: 'debit_bni', name: 'Debit BNI', type: 'debit', icon: CreditCard },
];

export const PaymentModal = ({
  isOpen,
  onClose,
  orderTotal,
  orderSubtotal = 0,
  orderDiscount = 0,
  orderDiscountName = '',
  orderType = 'dine_in',
  availablePromos = [],
  onPayment,
}: PaymentModalProps) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [selectedPromo, setSelectedPromo] = useState<string>('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  if (!isOpen) return null;

  const formatCurrency = (value: number) => {
    return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
  };

  const parseAmount = (value: string): number => {
    return parseFloat(value.replace(/[^0-9]/g, '')) || 0;
  };

  const calculatePromoDiscount = (): number => {
    // Debug: Log values
    console.log('calculatePromoDiscount - orderDiscount:', orderDiscount, typeof orderDiscount);
    console.log('calculatePromoDiscount - selectedPromo:', selectedPromo);
    console.log('calculatePromoDiscount - availablePromos:', availablePromos);
    
    // Jika sudah ada diskon existing, tidak bisa pakai promo lagi
    if (Number(orderDiscount) > 0) {
      console.log('orderDiscount > 0, returning 0');
      return 0;
    }
    
    if (!selectedPromo) {
      console.log('no selectedPromo, returning 0');
      return 0;
    }
    
    const promo = availablePromos.find(p => p.code === selectedPromo);
    console.log('Found promo:', promo);
    
    if (!promo) {
      console.log('promo not found, returning 0');
      return 0;
    }

    const promoValue = Number(promo.value);
    
    if (promo.type === 'percentage') {
      const discount = (orderSubtotal * promoValue) / 100;
      console.log('percentage discount:', discount);
      return discount;
    } else {
      console.log('fixed discount:', promoValue);
      return promoValue;
    }
  };

  const getTotalDiscount = (): number => {
    return Number(orderDiscount) + calculatePromoDiscount();
  };

  const calculateFinalTotal = (): number => {
    // If no promo selected, use order total from backend (source of truth)
    const promoDiscount = calculatePromoDiscount();
    
    if (promoDiscount === 0) {
      // No additional promo, use backend total
      return orderTotal;
    }
    
    // If promo selected, recalculate
    const subtotalAfterPromo = orderSubtotal - Number(orderDiscount) - promoDiscount;
    
    // Use fixed rates: SC = 5%, PB1 = 10%
    const SC_RATE = 0.05;
    const PB1_RATE = 0.10;
    
    const newSC = (orderType === 'dine_in') ? subtotalAfterPromo * SC_RATE : 0;
    const newBaseForTax = subtotalAfterPromo + newSC;
    const newTax = newBaseForTax * PB1_RATE;
    
    return subtotalAfterPromo + newSC + newTax;
  };

  const calculateChange = (): number => {
    const finalTotal = calculateFinalTotal();
    const tenderedNum = parseAmount(tenderedAmount);
    return tenderedNum - finalTotal;
  };

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    setTenderedAmount('');
    setReferenceNo('');
    setSelectedPromo('');
    setShowPaymentForm(true);
  };

  const handlePayment = () => {
    if (!selectedMethod) return;

    const finalTotal = calculateFinalTotal();
    const tenderedNum = tenderedAmount ? parseAmount(tenderedAmount) : finalTotal;
    const changeNum = selectedMethod === 'cash' ? calculateChange() : 0;

    // Validate cash payment has enough tendered amount
    if (selectedMethod === 'cash' && tenderedNum < finalTotal) {
      alert(`Uang diterima tidak cukup! Minimal: ${formatCurrency(finalTotal)}`);
      return;
    }

    const paymentData: PaymentData = {
      method: selectedMethod,
      amount: finalTotal,
      tenderedAmount: selectedMethod === 'cash' ? tenderedNum : undefined,
      changeAmount: selectedMethod === 'cash' ? changeNum : undefined,
      referenceNo: referenceNo || undefined,
      promoCode: selectedPromo || undefined,
    };

    console.log('💰 Payment submitted:', paymentData);

    onPayment(paymentData);
    handleClose();
  };

  const handleClose = () => {
    setSelectedMethod(null);
    setTenderedAmount('');
    setReferenceNo('');
    setSelectedPromo('');
    setShowPaymentForm(false);
    onClose();
  };

  const selectedMethodData = PAYMENT_METHODS.find(m => m.id === selectedMethod);
  const changeAmount = selectedMethod === 'cash' ? calculateChange() : 0;
  const promoDiscount = calculatePromoDiscount();
  const totalDiscount = getTotalDiscount();
  const finalTotal = calculateFinalTotal();
  
  // Recalculate tax and service charge based on promo
  // URUTAN: SC dulu, baru PB1 (Tax)
  const subtotalAfterDiscount = orderSubtotal - totalDiscount;
  
  // Use fixed rates: SC = 5%, PB1 = 10%
  const SC_RATE = 0.05; // 5%
  const PB1_RATE = 0.10; // 10%
  
  // 1. Service Charge dari subtotal after discount (only for dine_in)
  const recalculatedSC = (orderType === 'dine_in') ? subtotalAfterDiscount * SC_RATE : 0;
  
  // 2. Tax dari (subtotal after discount + SC)
  const newBaseForTax = subtotalAfterDiscount + recalculatedSC;
  const recalculatedTax = newBaseForTax * PB1_RATE;
  
  const isValidPayment = selectedMethod && 
    (selectedMethod === 'complimentary' || selectedMethod !== 'cash' || parseAmount(tenderedAmount) >= finalTotal);

  // Debug log
  console.log('Render values:', {
    selectedPromo,
    promoDiscount,
    totalDiscount,
    subtotalAfterDiscount,
    recalculatedTax,
    recalculatedSC,
    finalTotal
  });

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Pembayaran</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className={styles.content}>
          {/* Order Total - Show always but update based on promo selection */}
          <div className={styles.totalSection}>
            <div className={styles.totalLabel}>Rincian Tagihan</div>
            
            <div className={styles.breakdown}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Subtotal</span>
                <span className={styles.breakdownValue}>{formatCurrency(orderSubtotal)}</span>
              </div>
              
              {totalDiscount > 0 && (
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>
                    Diskon
                    {selectedPromo && promoDiscount > 0 && (
                      <span className={styles.promoTag}> ({selectedPromo})</span>
                    )}
                    {orderDiscount > 0 && orderDiscountName && !selectedPromo && (
                      <span className={styles.promoTag}> ({orderDiscountName})</span>
                    )}
                  </span>
                  <span className={`${styles.breakdownValue} ${styles.breakdownDiscount}`}>
                    - {formatCurrency(totalDiscount)}
                  </span>
                </div>
              )}
              
              {recalculatedSC > 0 && (
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>Service Charge</span>
                  <span className={styles.breakdownValue}>
                    {formatCurrency(recalculatedSC)}
                  </span>
                </div>
              )}
              
              {recalculatedTax > 0 && (
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>Pajak</span>
                  <span className={styles.breakdownValue}>
                    {formatCurrency(recalculatedTax)}
                  </span>
                </div>
              )}
              
              <div className={styles.breakdownDivider}></div>
              
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownTotal}>Total</span>
                <span className={styles.breakdownTotalValue}>
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>
          </div>

          {!showPaymentForm ? (
            <>
              {/* Payment Methods */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Pilih Metode Pembayaran</h3>
                <div className={styles.selectWrapper}>
                  <select
                    className={styles.paymentSelect}
                    value={selectedMethod || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleMethodSelect(e.target.value);
                      }
                    }}
                  >
                    <option value="">-- Pilih Metode Pembayaran --</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                  <div className={styles.selectIcon}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Payment Form */}
              <div className={styles.paymentForm}>
                <div className={styles.selectedMethod}>
                  {selectedMethodData && (
                    <>
                      <selectedMethodData.icon className="w-5 h-5" />
                      <span>{selectedMethodData.name}</span>
                    </>
                  )}
                  <button
                    className={styles.changeMethodBtn}
                    onClick={() => setShowPaymentForm(false)}
                  >
                    Ganti Metode
                  </button>
                </div>

                {/* Promo Code */}
                {availablePromos.length > 0 && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Kode Promo (Optional)</label>
                    {orderDiscount > 0 ? (
                      <div className={styles.promoDisabled}>
                        <span className={styles.promoDisabledText}>
                          ✓ Diskon sudah diterapkan
                          {orderDiscountName && (
                            <span className={styles.promoCodeBadge}>{orderDiscountName}</span>
                          )}
                        </span>
                        <div className={styles.promoDisabledAmount}>
                          Potongan: {formatCurrency(orderDiscount)}
                        </div>
                        <p className={styles.promoDisabledNote}>
                          Promo tidak dapat digabungkan dengan diskon yang sudah ada
                        </p>
                      </div>
                    ) : (
                      <>
                        <select
                          className={styles.select}
                          value={selectedPromo}
                          onChange={(e) => {
                            console.log('Promo selected:', e.target.value);
                            setSelectedPromo(e.target.value);
                          }}
                        >
                          <option value="">Pilih Promo</option>
                          {availablePromos.map((promo) => (
                            <option key={promo.id} value={promo.code}>
                              {promo.code} - {promo.name} 
                              {promo.type === 'percentage' 
                                ? ` (${promo.value}%)` 
                                : ` (${formatCurrency(promo.value)})`}
                            </option>
                          ))}
                        </select>
                        {selectedPromo && (
                          <div className={styles.promoInfo}>
                            {availablePromos.find(p => p.code === selectedPromo)?.description}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Cash specific fields */}
                {selectedMethod === 'cash' && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Uang Diterima</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={tenderedAmount ? formatCurrency(parseAmount(tenderedAmount)) : ''}
                        onChange={(e) => setTenderedAmount(e.target.value)}
                        placeholder="Masukkan uang diterima"
                      />
                    </div>

                    {tenderedAmount && (
                      <div className={styles.changeSection}>
                        <span className={styles.changeLabel}>Kembalian:</span>
                        <span className={styles.changeAmount}>
                          {formatCurrency(changeAmount)}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Reference Number for non-cash and non-complimentary */}
                {selectedMethod !== 'cash' && selectedMethod !== 'complimentary' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>No. Referensi (Optional)</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="Masukkan nomor referensi"
                    />
                  </div>
                )}

                {/* Complimentary Note */}
                {selectedMethod === 'complimentary' && (
                  <div className={styles.formGroup}>
                    <div className={styles.complimentaryNote}>
                      <Gift className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className={styles.complimentaryTitle}>Pembayaran Gratis</p>
                        <p className={styles.complimentaryDesc}>
                          Order ini akan ditandai sebagai complimentary (gratis)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick amount buttons for cash */}
                {selectedMethod === 'cash' && (
                  <div className={styles.quickAmounts}>
                    <div className={styles.quickAmountsLabel}>Nominal Cepat:</div>
                    <div className={styles.quickAmountsGrid}>
                      {[50000, 100000, 200000, 500000].map((value) => (
                        <button
                          key={value}
                          className={styles.quickAmountBtn}
                          onClick={() => setTenderedAmount(value.toString())}
                        >
                          {formatCurrency(value)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className={styles.actions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setShowPaymentForm(false)}
                >
                  Kembali
                </button>
                <button
                  className={styles.confirmBtn}
                  onClick={handlePayment}
                  disabled={!isValidPayment}
                >
                  Bayar {formatCurrency(finalTotal)}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
