import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { OrderDetails, ProductWithVariants } from '@/types/order';
import * as orderService from '@/services/order.service';
import * as productService from '@/services/product.service';
import styles from './CreateOrderModal.module.css'; // Use same CSS as CreateOrderModal

interface AddItemsModalProps {
  isOpen: boolean;
  order: OrderDetails;
  storeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface SelectedItem {
  product_id: string;
  product?: ProductWithVariants;
  qty: number;
  notes: string;
  variant_id?: string;  // Add variant_id
  tempId: string;
}

export function AddItemsModal({ isOpen, order, storeId, onClose, onSuccess }: AddItemsModalProps) {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);

  // Variant modal state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Load products and categories
  useEffect(() => {
    if (isOpen && storeId) {
      loadProducts();
      loadVouchers();
    }
  }, [isOpen, storeId]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await productService.getProducts(storeId);
      const activeProducts = response.data.filter((p: any) => p.is_available && p.is_active) as unknown as ProductWithVariants[];
      
      // Debug: log products and variants
      console.log('📦 Products loaded:', activeProducts.length);
      activeProducts.slice(0, 3).forEach((p: any) => {
        console.log(`  - ${p.name}:`, {
          id: p.id,
          has_variants: !!p.variants,
          variants_count: p.variants?.length || 0,
          variants: p.variants,
        });
      });
      
      setProducts(activeProducts);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(activeProducts.map((p: any) => p.category_id)))
        .filter(Boolean)
        .map(id => {
          const product = activeProducts.find((p: any) => p.category_id === id);
          return { id, name: product?.category_name || 'Other' };
        });
      setCategories(uniqueCategories);
    } catch (error: any) {
      toast.error('Gagal memuat produk');
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadVouchers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/stores/${storeId}/vouchers`);
      if (!response.ok) {
        console.log('Voucher endpoint not available (401), skipping vouchers');
        setVouchers([]);
        return;
      }
      const responseData = await response.json();
      const data = responseData.data || responseData;
      // Filter active vouchers only
      const activeVouchers = Array.isArray(data) ? data.filter((v: any) => v.is_active) : [];
      setVouchers(activeVouchers);
    } catch (error: any) {
      console.error('Failed to load vouchers:', error);
      setVouchers([]);
    }
  };

  // Calculate summary with taxes
  const calculateSummary = () => {
    const subtotal = calculateNewTotal();
    const discount = appliedVoucher ? appliedVoucher.calculated_discount : 0;
    const subtotalAfterDiscount = subtotal - discount;
    
    // Service Charge (5% dari subtotal after discount)
    const serviceCharge = subtotalAfterDiscount * 0.05;
    
    // PB1 (10% dari subtotal + service charge)
    const baseForPB1 = subtotalAfterDiscount + serviceCharge;
    const pb1 = baseForPB1 * 0.10;
    
    // Total new items with taxes
    const totalNewItems = subtotalAfterDiscount + serviceCharge + pb1;
    
    return {
      subtotal,
      discount,
      subtotalAfterDiscount,
      serviceCharge,
      pb1,
      totalNewItems
    };
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${Math.round(amount || 0).toLocaleString('id-ID')}`;
  };

  // Filter products by category
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || (p as any).category_id === selectedCategory;
    return matchesCategory;
  });

  // Get quantity for a product (sum of all variants)
  const getProductQty = (productId: string): number => {
    const totalQty = selectedItems
      .filter(i => i.product_id === productId)
      .reduce((sum, item) => sum + item.qty, 0);
    return totalQty;
  };

  // Add product to cart
  // Add product to cart
  const handleAddProduct = (product: ProductWithVariants) => {
    // Check if product has variants
    if (product.variants && product.variants.length > 0) {
      // Show variant modal
      setSelectedProduct(product);
      setSelectedVariants({});
      setShowVariantModal(true);
      return;
    }

    // Check if product already exists (without variants)
    const existingItem = selectedItems.find(item => item.product_id === product.id && !item.variant_id);
    if (existingItem) {
      handleUpdateProductQty(product.id, 1);
      return;
    }
    
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const newItem: SelectedItem = {
      product_id: product.id,
      qty: 1,
      notes: '',
      product,
      tempId,
    };
    console.log('✅ Adding product to cart:', product.name);
    setSelectedItems([...selectedItems, newItem]);
  };

  // Handle variant selection and add to cart
  const handleAddWithVariants = () => {
    if (!selectedProduct) return;
    
    // Validate all variant groups are selected
    if (selectedProduct.variants) {
      for (const group of selectedProduct.variants) {
        if (!selectedVariants[group.id]) {
          toast.error(`Please select ${group.name}`);
          return;
        }
      }
    }
    
    // Get first selected variant_id for API
    const firstVariantId = Object.values(selectedVariants)[0];
    
    // Check if item with same product_id and variant_id already exists
    const existingItem = selectedItems.find(
      item => item.product_id === selectedProduct.id && item.variant_id === firstVariantId
    );
    
    console.log('✅ Adding variant item:', selectedProduct.name, 'variant:', firstVariantId, 'existing:', !!existingItem);
    
    if (existingItem) {
      // Increment qty of existing item
      setSelectedItems(items =>
        items.map(item =>
          item.tempId === existingItem.tempId
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      );
      toast.success(`${selectedProduct.name} qty updated`);
    } else {
      // Create new item
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const newItem: SelectedItem = {
        product_id: selectedProduct.id,
        qty: 1,
        notes: '',
        product: selectedProduct,
        variant_id: firstVariantId,
        tempId,
      };
      
      setSelectedItems([...selectedItems, newItem]);
      toast.success(`${selectedProduct.name} added`);
    }
    
    setShowVariantModal(false);
    setSelectedProduct(null);
    setSelectedVariants({});
  };

  // Update quantity for product (can be from product card)
  const handleUpdateProductQty = (productId: string, delta: number) => {
    // Find all items for this product
    const productItems = selectedItems.filter(i => i.product_id === productId);
    if (productItems.length === 0) {
      if (delta > 0) {
        const product = products.find(p => p.id === productId);
        if (product) handleAddProduct(product);
      }
      return;
    }
    
    if (delta > 0) {
      // Adding - show variant modal
      const product = products.find(p => p.id === productId);
      if (product) handleAddProduct(product);
      return;
    }
    
    // Removing (delta < 0) - remove from the last item
    const lastItem = productItems[productItems.length - 1];
    const newQty = lastItem.qty + delta;
    
    if (newQty <= 0) {
      handleRemoveItem(lastItem.tempId);
    } else {
      setSelectedItems(items =>
        items.map(i => i.tempId === lastItem.tempId ? { ...i, qty: newQty } : i)
      );
    }
  };

  // Update item quantity
  const handleUpdateQty = (tempId: string, delta: number) => {
    setSelectedItems(items =>
      items.map(item => {
        if (item.tempId === tempId) {
          const newQty = Math.max(1, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      })
    );
  };

  // Update item notes
  const handleUpdateNotes = (tempId: string, notes: string) => {
    setSelectedItems(items =>
      items.map(item =>
        item.tempId === tempId ? { ...item, notes } : item
      )
    );
  };

  // Remove item
  const handleRemoveItem = (tempId: string) => {
    setSelectedItems(items => items.filter(item => item.tempId !== tempId));
  };

  // Calculate new items total
  const calculateNewTotal = () => {
    return selectedItems.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (price * item.qty);
    }, 0);
  };

  const handleVoucherChange = (code: string) => {
    setSelectedVoucher(code);
    if (code) {
      const voucher = vouchers.find(v => v.code === code);
      if (voucher) {
        // Calculate discount
        const newTotal = calculateNewTotal();
        let discountAmount = 0;
        
        if (voucher.discount_type === 'percentage') {
          discountAmount = newTotal * (parseFloat(voucher.discount_value) / 100);
        } else {
          discountAmount = parseFloat(voucher.discount_value);
        }
        
        setAppliedVoucher({
          ...voucher,
          calculated_discount: discountAmount
        });
      }
    } else {
      setAppliedVoucher(null);
    }
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error('Tambahkan minimal 1 item ke pesanan');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare batch items
      const batchItems = selectedItems.map(item => ({
        product_id: item.product_id,
        qty: item.qty,
        notes: item.notes || undefined,
        variant_id: item.variant_id || undefined,
      }));

      console.log('📦 Batch items to add:', batchItems);

      // Add all items in batch to the order
      console.log('📢 Calling API with storeId:', storeId, 'orderId:', order.id);
      await orderService.addOrderItemsAdminBatch(storeId, order.id, batchItems);

      toast.success(`${selectedItems.length} item berhasil ditambahkan ke pesanan`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to add items:', error);
      toast.error(error.response?.data?.message || 'Gagal menambahkan item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedItems([]);
    setSelectedVoucher('');
    setAppliedVoucher(null);
    onClose();
  };

  if (!isOpen) return null;

  const existingSubtotal = Number(order.subtotal) || 0;
  const existingTotal = Number(order.grand_total) || 0;
  
  const summary = calculateSummary();
  
  // Gabungkan subtotal lama + baru
  const combinedSubtotal = existingSubtotal + summary.subtotal;
  const combinedDiscount = summary.discount; // Discount hanya untuk item baru
  const subtotalAfterDiscount = combinedSubtotal - combinedDiscount;
  
  // Hitung ulang SC dan PB1 dari subtotal gabungan
  const combinedSC = subtotalAfterDiscount * 0.05;
  const baseForPB1 = subtotalAfterDiscount + combinedSC;
  const combinedPB1 = baseForPB1 * 0.10;
  
  // Total baru adalah subtotal + SC + PB1
  const grandTotal = subtotalAfterDiscount + combinedSC + combinedPB1;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2>Tambah Pesanan</h2>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>{order.order_number}</p>
          </div>
          <button onClick={handleClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Left Panel - Products */}
          <div className={styles.leftPanel}>
            {/* Category Filter */}
            <div className={styles.categoryFilter}>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`${styles.categoryBtn} ${selectedCategory === 'all' ? styles.categoryBtnActive : ''}`}
              >
                🍽️ All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`${styles.categoryBtn} ${selectedCategory === cat.id ? styles.categoryBtnActive : ''}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className={styles.productList}>
              {loadingProducts ? (
                <p className={styles.loading}>Loading products...</p>
              ) : filteredProducts.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No products found</p>
                </div>
              ) : (
                filteredProducts.map(product => {
                  const qty = getProductQty(product.id);
                  return (
                    <div key={product.id} className={styles.productCard}>
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className={styles.productImage}
                        />
                      )}
                      <div className={styles.productInfo}>
                        <div className={styles.productName}>{product.name}</div>
                        <div className={styles.productFooter}>
                          <div className={styles.productPrice}>
                            {formatCurrency(Number(product.price))}
                          </div>
                          
                          {qty === 0 ? (
                            <button
                              onClick={() => handleAddProduct(product)}
                              className={styles.addProductBtn}
                            >
                              <Plus size={18} />
                            </button>
                          ) : (
                            <div className={styles.productQtyControl}>
                              <button
                                onClick={() => handleUpdateProductQty(product.id, -1)}
                                className={styles.productQtyBtn}
                              >
                                <Minus size={14} />
                              </button>
                              <span className={styles.productQtyValue}>{qty}</span>
                              <button
                                onClick={() => handleAddProduct(product)}
                                className={styles.productQtyBtn}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel - Cart & Summary */}
          <div className={styles.rightPanel}>
            {/* Order Info Row (Display only - read-only) */}
            <div className={styles.orderInfoRow}>
              {/* Order Type - Read-only */}
              <div className={styles.orderTypeDisplay}>
                <span style={{ fontSize: '13px', color: '#666', fontWeight: '600' }}>
                  {order.order_type === 'dine_in' ? '🍽️ Dine In' : 
                   order.order_type === 'takeaway' ? '🥡 Takeaway' : '🚚 Delivery'}
                </span>
              </div>

              {/* Table - Read-only */}
              <div className={styles.tableDisplay}>
                <span style={{ fontSize: '13px', color: '#666', fontWeight: '600' }}>
                  {order.table_number ? `🪑 ${order.table_number}` : '—'}
                </span>
              </div>

              {/* Customer Info - Read-only */}
              <div className={styles.customerDisplay}>
                <span style={{ fontSize: '13px', color: '#666', fontWeight: '600' }}>
                  {order.customer_name ? `👤 ${order.customer_name}` : '—'}
                </span>
              </div>
            </div>

            {/* Existing Order Info */}
            <div style={{ 
              padding: '16px', 
              background: '#f9fafb', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '13px', color: '#666' }}>
                PESANAN SAAT INI (TIDAK DAPAT DIUBAH)
              </div>
              {order.items.map((item) => (
                <div key={item.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  fontSize: '14px',
                  opacity: 0.7
                }}>
                  <span>
                    {item.product_name}
                    {item.variants && item.variants.length > 0 && (
                      <span style={{ fontSize: '12px', color: '#666', marginLeft: '4px' }}>
                        ({item.variants.map((v: any) => v.option_name).join(', ')})
                      </span>
                    )}
                    {' '}× {item.qty}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>{formatCurrency(Number(item.line_total))}</span>
                    <button
                      onClick={() => {
                        // Add same item with same variant to new cart
                        const product = products.find(p => p.id === item.product_id);
                        if (product) {
                          if (item.variants && item.variants.length > 0) {
                            // Has variants - need to add with variant_id
                            // For now, find matching variant by option_name
                            const variantOption = product.variants
                              ?.flatMap((vg: any) => vg.options || [])
                              .find((opt: any) => opt.name === item.variants?.[0]?.option_name);
                            
                            if (variantOption) {
                              // Check if already in new cart
                              const existingNewItem = selectedItems.find(
                                si => si.product_id === item.product_id && si.variant_id === variantOption.id
                              );
                              
                              if (existingNewItem) {
                                // Increment qty
                                setSelectedItems(items =>
                                  items.map(si =>
                                    si.tempId === existingNewItem.tempId
                                      ? { ...si, qty: si.qty + 1 }
                                      : si
                                  )
                                );
                              } else {
                                // Add new
                                const tempId = `temp-${Date.now()}-${Math.random()}`;
                                setSelectedItems([...selectedItems, {
                                  product_id: item.product_id,
                                  product,
                                  qty: 1,
                                  notes: '',
                                  variant_id: variantOption.id,
                                  tempId,
                                }]);
                              }
                            }
                          } else {
                            // No variants
                            const existingNewItem = selectedItems.find(
                              si => si.product_id === item.product_id && !si.variant_id
                            );
                            
                            if (existingNewItem) {
                              // Increment qty
                              setSelectedItems(items =>
                                items.map(si =>
                                  si.tempId === existingNewItem.tempId
                                    ? { ...si, qty: si.qty + 1 }
                                    : si
                                )
                              );
                            } else {
                              // Add new
                              const tempId = `temp-${Date.now()}-${Math.random()}`;
                              setSelectedItems([...selectedItems, {
                                product_id: item.product_id,
                                product,
                                qty: 1,
                                notes: '',
                                tempId,
                              }]);
                            }
                          }
                          toast.success(`${item.product_name} added to new cart`);
                        }
                      }}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                paddingTop: '8px',
                marginTop: '8px',
                borderTop: '1px solid #d1d5db',
                fontWeight: '600'
              }}>
                <span>Subtotal Lama:</span>
                <span>{formatCurrency(existingTotal)}</span>
              </div>
            </div>

            {/* New Items Cart */}
            <div className={styles.cartContainer}>
              {selectedItems.length === 0 ? (
                <div className={styles.emptyCart}>
                  <p>Pilih produk untuk ditambahkan</p>
                </div>
              ) : (
                selectedItems.map(item => (
                  <div key={item.tempId} className={styles.cartItemCompact}>
                    <div className={styles.cartItemRow}>
                      {item.product?.image_url && (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className={styles.cartItemThumb}
                        />
                      )}
                      <div className={styles.cartItemDetails}>
                        <div className={styles.cartItemName}>
                          {item.product?.name}
                          {item.variant_id && item.product?.variants && (
                            <span style={{ fontSize: '12px', color: '#666', marginLeft: '4px' }}>
                              ({item.product.variants
                                .flatMap((vg: any) => vg.options || [])
                                .find((opt: any) => opt.id === item.variant_id)?.name || 'Selected variant'}
                              )
                            </span>
                          )}
                        </div>
                        <div className={styles.cartItemPrice}>
                          {formatCurrency(Number(item.product?.price || 0))}
                        </div>
                      </div>
                      
                      <div className={styles.cartItemActions}>
                        <button
                          onClick={() => handleUpdateQty(item.tempId, -1)}
                          className={styles.cartQtyBtn}
                        >
                          <Minus size={14} />
                        </button>
                        <span className={styles.cartQtyValue}>{item.qty}</span>
                        <button
                          onClick={() => handleUpdateQty(item.tempId, 1)}
                          className={styles.cartQtyBtn}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => handleUpdateNotes(item.tempId, e.target.value)}
                      placeholder="Add notes (optional)"
                      className={styles.cartNotesInput}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Summary */}
            <div className={styles.summary}>
              {/* Voucher Section */}
              <div className={styles.voucherSection}>
                <div className={styles.voucherInput}>
                  <select
                    value={selectedVoucher}
                    onChange={(e) => handleVoucherChange(e.target.value)}
                    className={styles.voucherField}
                  >
                    <option value="">-- Pilih Voucher (Opsional) --</option>
                    {vouchers.map((v) => (
                      <option key={v.id} value={v.code}>
                        {v.name} ({v.code}) - {v.discount_type === 'percentage' ? `${v.discount_value}%` : `Rp ${parseFloat(v.discount_value).toLocaleString()}`}
                      </option>
                    ))}
                  </select>
                  {appliedVoucher && (
                    <button
                      onClick={() => handleVoucherChange('')}
                      className={styles.voucherRemoveBtn}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {appliedVoucher && (
                  <div className={styles.voucherApplied}>
                    ✓ {appliedVoucher.name} applied
                  </div>
                )}
              </div>

              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>{formatCurrency(combinedSubtotal)}</span>
              </div>
              
              {combinedDiscount > 0 && (
                <div className={styles.summaryRow}>
                  <span className={styles.discountText}>Discount</span>
                  <span className={styles.discountText}>- {formatCurrency(combinedDiscount)}</span>
                </div>
              )}
              
              <div className={styles.summaryRow}>
                <span>Service Charge (5.00%)</span>
                <span>{formatCurrency(combinedSC)}</span>
              </div>
              
              <div className={styles.summaryRow}>
                <span>PB1 (10.00%)</span>
                <span>{formatCurrency(combinedPB1)}</span>
              </div>
              
              <div className={styles.totalRow}>
                <span>Total Baru</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedItems.length === 0}
                className={`${styles.placeOrderBtn} ${
                  (isSubmitting || selectedItems.length === 0)
                    ? styles.placeOrderBtnDisabled
                    : ''
                }`}
              >
                {isSubmitting ? 'Menambahkan...' : `Tambah ${selectedItems.length} Item`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Variant Selection Modal */}
      {showVariantModal && selectedProduct && (
        <div className={styles.variantOverlay} onClick={() => setShowVariantModal(false)}>
          <div className={styles.variantModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.variantHeader}>
              <h3>{selectedProduct.name}</h3>
              <button onClick={() => setShowVariantModal(false)} className={styles.variantCloseBtn}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.variantContent}>
              {selectedProduct.variants?.map(group => (
                <div key={group.id} className={styles.variantGroup}>
                  <label className={styles.variantLabel}>{group.name}</label>
                  <div className={styles.variantOptions}>
                    {group.options?.map(option => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedVariants(prev => ({
                          ...prev,
                          [group.id]: option.id
                        }))}
                        className={`${styles.variantOption} ${
                          selectedVariants[group.id] === option.id ? styles.variantOptionActive : ''
                        }`}
                      >
                        <span>{option.name}</span>
                        {option.price_adjustment && !isNaN(Number(option.price_adjustment)) && Number(option.price_adjustment) !== 0 && (
                          <span className={styles.variantPrice}>
                            {Number(option.price_adjustment) > 0 ? '+' : ''}
                            Rp {Math.round(Number(option.price_adjustment)).toLocaleString('id-ID')}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className={styles.variantFooter}>
              <button onClick={() => setShowVariantModal(false)} className={styles.variantCancelBtn}>
                Cancel
              </button>
              <button onClick={handleAddWithVariants} className={styles.variantAddBtn}>
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
