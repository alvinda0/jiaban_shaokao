import { useState, useEffect } from 'react';
import { X, Plus, Minus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import * as productService from '@/services/product.service';
import * as tableService from '@/services/table.service';
import * as taxService from '@/services/tax.service';
import * as voucherService from '@/services/voucher.service';
import type { Table } from '@/types';
import type { AddOrderItemRequest } from '@/types/order';
import styles from './CreateOrderModal.module.css';

interface CreateOrderModalProps {
  isOpen: boolean;
  storeId: string;
  onClose: () => void;
  onSubmit: (data: {
    table_id?: string;
    order_type: 'dine_in' | 'takeaway' | 'delivery';
    customer_name?: string;
    customer_phone?: string;
    voucher_code?: string;
    items: AddOrderItemRequest[];
  }) => void;
}

interface SelectedItem extends AddOrderItemRequest {
  product?: productService.Product;
  tempId: string;
}

export function CreateOrderModal({ isOpen, storeId, onClose, onSubmit }: CreateOrderModalProps) {
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [voucherCode, setVoucherCode] = useState('');
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<productService.Product | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<productService.Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [taxRules, setTaxRules] = useState<taxService.TaxRule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Load tables and products
  useEffect(() => {
    if (isOpen && storeId) {
      loadTables();
      loadProducts();
      loadTaxRules();
      loadVouchers();
    }
  }, [isOpen, storeId]);

  const loadTables = async () => {
    try {
      const response = await tableService.getTables(storeId);
      // Response structure: { data: { tables: [...], grouped: {...} } }
      const tablesData = response.data.tables || response.data;
      setTables(Array.isArray(tablesData) ? tablesData.filter((t: Table) => t.is_active) : []);
    } catch (error: any) {
      toast.error('Failed to load tables');
      setTables([]);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await productService.getProducts(storeId);
      const activeProducts = response.data.filter((p: productService.Product) => p.is_available && p.is_active);
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
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };
  
  const loadTaxRules = async () => {
    try {
      const response = await taxService.getTaxRules(storeId);
      setTaxRules(response.data.filter((t: taxService.TaxRule) => t.is_active));
    } catch (error: any) {
      console.error('Failed to load tax rules:', error);
      // Don't show error toast, just use default rates
      setTaxRules([]);
    }
  };
  
  const loadVouchers = async () => {
    try {
      const response = await voucherService.getVouchers();
      // Filter active vouchers only
      const activeVouchers = response.data.filter((v: any) => v.is_active);
      setVouchers(activeVouchers);
    } catch (error: any) {
      console.error('Failed to load vouchers:', error);
      setVouchers([]);
    }
  };

  // Filter products by search and category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || (p as any).category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  // Filter tables by search
  const filteredTables = tables.filter(t => 
    t.number.toLowerCase().includes(tableSearch.toLowerCase()) ||
    t.type.toLowerCase().includes(tableSearch.toLowerCase())
  );
  
  // Handle table selection from filtered list
  const handleTableSelect = (tableId: string) => {
    setSelectedTable(tableId);
    const table = tables.find(t => t.id === tableId);
    if (table) {
      setTableSearch(table.number);
    }
  };

  // Add product to selected items
  const handleAddProduct = (product: productService.Product) => {
    // Check if product has variants
    if (product.variants && product.variants.length > 0) {
      // Show variant modal
      setSelectedProduct(product);
      setSelectedVariants({});
      setShowVariantModal(true);
      return;
    }
    
    // Check if product already exists
    const existingItem = selectedItems.find(item => item.product_id === product.id);
    if (existingItem) {
      handleUpdateQty(existingItem.tempId, 1);
      return;
    }
    
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const newItem: SelectedItem = {
      product_id: product.id,
      qty: 1,
      notes: '',
      store_id: storeId,
      product,
      tempId,
    };
    setSelectedItems([...selectedItems, newItem]);
    toast.success(`${product.name} added`);
  };
  
  // Handle variant selection and add to cart
  const handleAddWithVariants = () => {
    if (!selectedProduct) return;
    
    // Validate all variant groups are selected
    if (selectedProduct.variants) {
      for (const group of selectedProduct.variants) {
        if (!selectedVariants[group.id as string]) {
          toast.error(`Please select ${group.name}`);
          return;
        }
      }
    }
    
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const newItem: SelectedItem = {
      product_id: selectedProduct.id,
      qty: 1,
      notes: '',
      store_id: storeId,
      product: selectedProduct,
      tempId,
      variants: selectedProduct.variants?.map(group => {
        const optionId = selectedVariants[group.id as string];
        const option = group.options?.find(o => o.id === optionId);
        return {
          variant_option_id: optionId,
          group_name: group.name,
          option_name: option?.name || '',
          price_adjustment: Number(option?.price_adjustment) || 0
        };
      }) || []
    };
    
    setSelectedItems([...selectedItems, newItem]);
    toast.success(`${selectedProduct.name} added`);
    setShowVariantModal(false);
    setSelectedProduct(null);
    setSelectedVariants({});
  };
  
  // Get quantity for a product
  const getProductQty = (productId: string): number => {
    const item = selectedItems.find(i => i.product_id === productId);
    return item?.qty || 0;
  };
  
  // Update quantity for product (can be from product card)
  const handleUpdateProductQty = (productId: string, delta: number) => {
    const item = selectedItems.find(i => i.product_id === productId);
    if (!item) {
      // Add new item if delta is positive
      if (delta > 0) {
        const product = products.find(p => p.id === productId);
        if (product) handleAddProduct(product);
      }
      return;
    }
    
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      handleRemoveItem(item.tempId);
    } else {
      setSelectedItems(items =>
        items.map(i => i.tempId === item.tempId ? { ...i, qty: newQty } : i)
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

  // Calculate total
  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (price * item.qty);
    }, 0);
  };
  
  // Calculate taxes and totals
  const calculateSummary = () => {
    const subtotal = calculateTotal();
    
    // Step 1: Apply Discount first (from voucher - already calculated by API)
    let discount = 0;
    if (appliedVoucher && appliedVoucher.discount_value) {
      discount = appliedVoucher.discount_value;
    }
    
    // Subtotal after discount
    const subtotalAfterDiscount = subtotal - discount;
    
    // Step 2: Calculate Service Charge first - based on subtotal after discount
    const scTax = taxRules.find(t => t.code === 'SC');
    let serviceCharge = 0;
    
    if (scTax) {
      const shouldApply = 
        (orderType === 'dine_in' && scTax.apply_dine_in) ||
        (orderType === 'takeaway' && scTax.apply_take_away);
      
      if (shouldApply) {
        serviceCharge = subtotalAfterDiscount * (scTax.rate / 100);
      }
    }
    
    // Step 3: Calculate PB1 based on (subtotal after discount + SC)
    const pb1Tax = taxRules.find(t => t.code === 'PB1');
    let pb1 = 0;
    
    if (pb1Tax) {
      const shouldApply = 
        (orderType === 'dine_in' && pb1Tax.apply_dine_in) ||
        (orderType === 'takeaway' && pb1Tax.apply_take_away);
      
      if (shouldApply) {
        const baseForPB1 = subtotalAfterDiscount + serviceCharge;
        pb1 = baseForPB1 * (pb1Tax.rate / 100);
      }
    }
    
    // Step 4: Calculate Total Payable
    const totalPayable = subtotalAfterDiscount + pb1 + serviceCharge;
    
    // Format rate to remove .00 if integer
    const formatRate = (rate: number) => {
      return rate % 1 === 0 ? rate.toString() : rate.toFixed(2);
    };
    
    return {
      subtotal,
      pb1,
      pb1Rate: formatRate(pb1Tax?.rate || 0),
      pb1Name: pb1Tax?.name || 'PB1',
      serviceCharge,
      scRate: formatRate(scTax?.rate || 0),
      scName: scTax?.name || 'Service Charge',
      discount,
      totalPayable: Math.max(0, totalPayable)
    };
  };
  
  // Apply voucher
  const handleApplyVoucherByCode = async (code: string) => {
    if (!code.trim()) {
      return;
    }
    
    try {
      // Prepare cart data for validation
      const cartData = {
        subtotal: calculateTotal(),
        items: selectedItems.map(item => ({
          product_id: item.product_id,
          quantity: item.qty
        }))
      };
      
      // Call voucher validation API
      const response = await voucherService.validateVoucher({
        code: code.trim(),
        cart: cartData
      });
      
      setAppliedVoucher({
        ...response.data.voucher,
        discount_value: response.data.discount,
        discount_type: 'fixed' // Since API returns calculated discount amount
      });
      toast.success(`Voucher "${response.data.voucher.name}" applied!`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid voucher code');
      setAppliedVoucher(null);
      setVoucherCode('');
    }
  };
  
  // Remove voucher
  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setAppliedVoucher(null);
    toast.success('Voucher removed');
  };

  // Handle submit
  const handleSubmit = async () => {
    console.log('CreateOrderModal handleSubmit called');
    
    // Prevent double submit
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate call');
      return;
    }
    
    console.log('Order Type:', orderType);
    console.log('Selected Table:', selectedTable);
    console.log('Selected Items:', selectedItems);
    
    // Validation
    if (orderType === 'dine_in' && !selectedTable) {
      toast.error('Please select a table for dine-in order');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare items
      const items: AddOrderItemRequest[] = selectedItems.map(item => ({
        product_id: item.product_id,
        qty: item.qty,
        notes: item.notes || undefined,
        store_id: storeId,
      }));

      console.log('Prepared items:', items);

      // Submit
      const submitData = {
        table_id: orderType === 'dine_in' ? selectedTable : undefined,
        order_type: orderType,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        voucher_code: voucherCode || undefined,
        items,
      };
      
      console.log('Submitting order data:', submitData);
      await onSubmit(submitData);

      // Reset form
      handleReset();
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setOrderType('dine_in');
    setSelectedTable('');
    setTableSearch('');
    setCustomerName('');
    setCustomerPhone('');
    setSelectedItems([]);
    setSearchQuery('');
    setVoucherCode('');
    setAppliedVoucher(null);
  };

  // Handle close
  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2>Create New Order</h2>
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
              
              {/* Search Toggle */}
              <div className={styles.searchToggle}>
                {!showProductSearch ? (
                  <button
                    onClick={() => setShowProductSearch(true)}
                    className={styles.searchIconBtn}
                  >
                    <Search size={20} />
                  </button>
                ) : (
                  <div className={styles.searchBoxExpanded}>
                    <Search size={20} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className={styles.searchInput}
                      autoFocus
                      onBlur={() => {
                        if (!searchQuery) setShowProductSearch(false);
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setShowProductSearch(false);
                        }}
                        className={styles.searchClearBtn}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
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
                            Rp {Math.round(product.price).toLocaleString('id-ID')}
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
                                onClick={() => handleUpdateProductQty(product.id, 1)}
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

          {/* Right Panel - Cart & Order Info */}
          <div className={styles.rightPanel}>
            {/* Order Info Row (3 columns: Order Type | Table | Customer Info) */}
            <div className={styles.orderInfoRow}>
              {/* Order Type */}
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                className={styles.orderTypeSelect}
              >
                <option value="dine_in">Dine In</option>
                <option value="takeaway">Takeaway</option>
              </select>

              {/* Table Search */}
              <div className={styles.tableSearchWrapper}>
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setSelectedTable('');
                  }}
                  placeholder="Search table..."
                  className={styles.tableSearchInput}
                />
                {filteredTables.length > 0 && tableSearch && !selectedTable && (
                  <div className={styles.tableDropdown}>
                    {filteredTables.map(table => (
                      <div
                        key={table.id}
                        onClick={() => handleTableSelect(table.id)}
                        className={styles.tableOption}
                      >
                        <span className={styles.tableOptionNumber}>{table.number}</span>
                        <span className={styles.tableOptionType}>{table.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Info Toggle */}
              <button
                type="button"
                onClick={() => setShowCustomerInfo(!showCustomerInfo)}
                className={styles.customerToggleBtn}
              >
                <span>Customer Info</span>
                <span className={styles.toggleIcon}>{showCustomerInfo ? '▲' : '▼'}</span>
              </button>
            </div>

            {/* Customer Info Fields (Collapsible) */}
            {showCustomerInfo && (
              <div className={styles.customerSection}>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name (Optional)"
                  className={styles.customerInput}
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="WhatsApp Number (Optional)"
                  className={styles.customerInput}
                />
              </div>
            )}

            {/* Cart Items List */}
            <div className={styles.cartContainer}>
              {selectedItems.length === 0 ? (
                <div className={styles.emptyCart}>
                  <p>No items selected</p>
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
                        <div className={styles.cartItemName}>{item.product?.name}</div>
                        <div className={styles.cartItemPrice}>
                          Rp {Math.round((item.product?.price || 0)).toLocaleString('id-ID')}
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
                    
                    {/* Notes Input */}
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
            {selectedItems.length > 0 && (
              <div className={styles.summary}>
                {/* Voucher Input */}
                <div className={styles.voucherSection}>
                  <div className={styles.voucherInput}>
                    <select
                      value={voucherCode}
                      onChange={(e) => {
                        setVoucherCode(e.target.value);
                        if (e.target.value) {
                          // Auto-apply when selected
                          setVoucherCode(e.target.value);
                          // Trigger apply
                          setTimeout(() => {
                            const selectedVoucher = vouchers.find(v => v.code === e.target.value);
                            if (selectedVoucher) {
                              handleApplyVoucherByCode(e.target.value);
                            }
                          }, 100);
                        } else {
                          handleRemoveVoucher();
                        }
                      }}
                      className={styles.voucherField}
                      disabled={!!appliedVoucher}
                    >
                      <option value="">-- Pilih Voucher (Opsional) --</option>
                      {vouchers.map((v) => (
                        <option key={v.id} value={v.code}>
                          {v.name} ({v.code}) - {v.type === 'discount' ? `Diskon ${v.discount_type === 'percentage' ? v.discount_value + '%' : 'Rp ' + v.discount_value.toLocaleString()}` : 'Bundle'}
                        </option>
                      ))}
                    </select>
                    {appliedVoucher && (
                      <button
                        onClick={handleRemoveVoucher}
                        className={styles.voucherRemoveBtn}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {appliedVoucher && (
                    <div className={styles.voucherApplied}>
                      ✓ {appliedVoucher.name || appliedVoucher.code} applied
                    </div>
                  )}
                </div>
                
                {(() => {
                  const summary = calculateSummary();
                  return (
                    <>
                      <div className={styles.summaryRow}>
                        <span>Subtotal</span>
                        <span>Rp {Math.round(summary.subtotal || 0).toLocaleString('id-ID')}</span>
                      </div>
                      
                      {summary.discount > 0 && (
                        <div className={styles.summaryRow}>
                          <span className={styles.discountText}>Discount</span>
                          <span className={styles.discountText}>- Rp {Math.round(summary.discount || 0).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      
                      {summary.serviceCharge > 0 && (
                        <div className={styles.summaryRow}>
                          <span>{summary.scName} ({summary.scRate}%)</span>
                          <span>Rp {Math.round(summary.serviceCharge || 0).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      
                      {summary.pb1 > 0 && (
                        <div className={styles.summaryRow}>
                          <span>{summary.pb1Name} ({summary.pb1Rate}%)</span>
                          <span>Rp {Math.round(summary.pb1 || 0).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      
                      <div className={styles.totalRow}>
                        <span>Total</span>
                        <span>Rp {Math.round(summary.totalPayable || 0).toLocaleString('id-ID')}</span>
                      </div>
                    </>
                  );
                })()}
                
                <button
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    selectedItems.length === 0 || 
                    (orderType === 'dine_in' && !selectedTable)
                  }
                  className={`${styles.placeOrderBtn} ${
                    (isSubmitting || selectedItems.length === 0 || (orderType === 'dine_in' && !selectedTable))
                      ? styles.placeOrderBtnDisabled
                      : ''
                  }`}
                >
                  {isSubmitting ? 'Processing...' : 'Order'}
                </button>
              </div>
            )}
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
                          [group.id as string]: option.id ?? ''
                        }))}
                        className={`${styles.variantOption} ${
                          selectedVariants[group.id as string] === option.id ? styles.variantOptionActive : ''
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
