import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import toast from 'react-hot-toast'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import '@/i18n/config'
import styles from './OrderPage.module.css'

interface Product {
  id: string
  name: string
  description: string | null
  price: number | string
  image_url: string | null
  category_name: string
  is_available: boolean
  track_stock: boolean
  stock_qty: number | string
  variants?: any[]
}

interface Store {
  id: string
  name: string
  address: string | null
  phone: string | null
  logo_url: string | null
}

interface CartItem {
  product: Product
  qty: number
  notes?: string
  variants?: VariantSelection[]
}

interface VariantSelection {
  variant_option_id: string
  group_name: string
  option_name: string
  price_adjustment: number
}

export default function OrderPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, VariantSelection>>({})
  const [itemNotes, setItemNotes] = useState('')
  
  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<(() => void) | string | null>(null)
  const [confirmMessage, setConfirmMessage] = useState('')
  
  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Order info
  const [orderType, setOrderType] = useState<'dine_in' | 'take_away'>('dine_in')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null)
  const [checkingVoucher, setCheckingVoucher] = useState(false)
  
  // Current order ID (if exists)
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  
  const tableCode = searchParams.get('table')
  const storeId = searchParams.get('store_id')
  
  // Get cart storage key
  const getCartStorageKey = () => {
    return `cart_${storeId}_${tableCode}`
  }
  
  // Load cart from localStorage on mount
  useEffect(() => {
    if (storeId && tableCode) {
      const storageKey = getCartStorageKey()
      const savedCart = localStorage.getItem(storageKey)
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart))
          console.log('🛒 Cart loaded from storage:', JSON.parse(savedCart))
        } catch (err) {
          console.error('Error loading cart:', err)
        }
      }
    }
  }, [storeId, tableCode])
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (storeId && tableCode && cart.length > 0) {
      const storageKey = getCartStorageKey()
      localStorage.setItem(storageKey, JSON.stringify(cart))
      console.log('💾 Cart saved to storage')
    } else if (storeId && tableCode && cart.length === 0) {
      const storageKey = getCartStorageKey()
      localStorage.removeItem(storageKey)
      console.log('🗑️ Cart cleared from storage')
    }
  }, [cart, storeId, tableCode])
  
  // Get order history storage key
  const getOrderStorageKey = () => {
    return `order_history_${storeId}_${tableCode}`
  }
  
  // Load existing order from localStorage on mount
  useEffect(() => {
    if (storeId && tableCode) {
      const storageKey = getOrderStorageKey()
      const storedOrderData = localStorage.getItem(storageKey)
      
      if (storedOrderData) {
        try {
          const orderData = JSON.parse(storedOrderData)
          // Check if order is still recent (within last 24 hours)
          const orderTime = new Date(orderData.created_at).getTime()
          const now = new Date().getTime()
          const hoursDiff = (now - orderTime) / (1000 * 60 * 60)
          
          if (hoursDiff < 24 && orderData.status !== 'paid' && orderData.status !== 'void') {
            setCurrentOrderId(orderData.order_id)
            console.log('📝 Found existing order:', orderData.order_id)
            
            // Load order details to get voucher info
            loadExistingOrderDetails(orderData.order_id)
          } else {
            // Order is too old or already completed, clear it
            localStorage.removeItem(storageKey)
            console.log('🗑️ Cleared old/completed order')
          }
        } catch (error) {
          console.error('Error loading order history:', error)
          localStorage.removeItem(storageKey)
        }
      }
    }
  }, [storeId, tableCode])
  
  // Load existing order details and extract voucher
  const loadExistingOrderDetails = async (order_id: string) => {
    try {
      console.log('📥 Loading existing order details:', order_id)
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/orders/${order_id}?store_id=${storeId}`
      )
      
      const orderDetails = response.data.data
      console.log('📦 Order details:', orderDetails)
      console.log('💰 Order discount_total:', orderDetails.discount_total)
      
      // Extract voucher from notes
      if (orderDetails.notes && orderDetails.notes.includes('Voucher:')) {
        const voucherMatch = orderDetails.notes.match(/Voucher:\s*([A-Z0-9]+)/i)
        if (voucherMatch) {
          const existingVoucherCode = voucherMatch[1]
          console.log('🎫 Found existing voucher in order:', existingVoucherCode)
          
          // Set voucher code
          setVoucherCode(existingVoucherCode)
          
          // Set applied voucher with ACTUAL discount from order
          setAppliedVoucher({
            code: existingVoucherCode,
            name: existingVoucherCode,
            calculatedDiscount: orderDetails.discount_total || 0  // Use actual discount from backend!
          })
          
          console.log('✅ Voucher auto-applied with discount:', orderDetails.discount_total)
          
        }
      } else {
        console.log('ℹ️ No voucher found in order notes')
        // Clear voucher if order doesn't have one
        setVoucherCode('')
        setAppliedVoucher(null)
      }
    } catch (error) {
      console.error('❌ Error loading order details:', error)
    }
  }

  // Fetch store info
  const { data: storeData } = useQuery({
    queryKey: ['store', storeId],
    queryFn: async () => {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/stores/public/${storeId}`)
      return res.data
    },
    enabled: !!storeId,
  })

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', storeId],
    queryFn: async () => {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/products?store_id=${storeId}`)
      return res.data
    },
    enabled: !!storeId,
  })

  // Fetch tables to get table_id from table code
  const { data: tablesData } = useQuery({
    queryKey: ['tables', storeId],
    queryFn: async () => {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/tables?store_id=${storeId}`)
      return res.data
    },
    enabled: !!storeId && !!tableCode,
  })

  // Fetch tax rules
  const { data: taxData } = useQuery({
    queryKey: ['taxes', storeId],
    queryFn: async () => {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/public/stores/${storeId}/taxes`)
      return res.data
    },
    enabled: !!storeId,
  })

  const store: Store | undefined = storeData?.data
  const products: Product[] = productsData?.data || []
  const tables = tablesData?.data || []
  const taxes = taxData?.data || []
  
  // Find table ID from table code
  const table = tables.find((t: any) => t.number === tableCode)
  const tableId = table?.id

  // Find tax rules
  const pb1Tax = taxes.find((t: any) => t.code === 'PB1')
  const scTax = taxes.find((t: any) => t.code === 'SC')
  
  // Debug log
  console.log('💰 Tax data:', { pb1Tax, scTax })

  // Group products by category
  const grouped = products.reduce((acc, p) => {
    const cat = p.category_name || 'Lainnya'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<string, Product[]>)

  // Get categories list
  const categories = Object.keys(grouped)

  // Debug: log product data
  useEffect(() => {
    if (products.length > 0) {
      console.log('📦 Products data:', products.map(p => ({
        id: p.id,
        name: p.name,
        is_available: p.is_available,
        track_stock: p.track_stock,
        stock_qty: p.stock_qty
      })))
    }
  }, [products])

  // Filter products based on selected category
  const filteredGrouped = selectedCategory === 'all' 
    ? grouped 
    : { [selectedCategory]: grouped[selectedCategory] || [] }

  // Sort products within each category: available items first, sold out last
  const sortedFilteredGrouped = Object.entries(filteredGrouped).reduce((acc, [category, products]) => {
    const sorted = [...products].sort((a, b) => {
      const aIsSoldOut = a.is_available === false || (a.track_stock === true && parseFloat(a.stock_qty as any) <= 0)
      const bIsSoldOut = b.is_available === false || (b.track_stock === true && parseFloat(b.stock_qty as any) <= 0)
      
      // Available items first (false < true)
      if (aIsSoldOut === bIsSoldOut) return 0
      return aIsSoldOut ? 1 : -1
    })
    acc[category] = sorted
    return acc
  }, {} as Record<string, Product[]>)

  // Add to cart
  const addToCart = (product: Product) => {
    // Check if product has variants
    if (product.variants && product.variants.length > 0) {
      // Open variant modal
      setSelectedProduct(product)
      setSelectedVariants({})
      setItemNotes('')
      setShowVariantModal(true)
      return
    }

    // No variants, add directly
    const existingItem = cart.find(item => item.product.id === product.id && !item.variants)
    
    if (existingItem) {
      // Increase quantity
      setCart(cart.map(item => 
        item.product.id === product.id && !item.variants
          ? { ...item, qty: item.qty + 1 }
          : item
      ))
      toast.success(`${product.name} ${t('addedToCart')}`)
    } else {
      // Add new item
      setCart([...cart, { product, qty: 1 }])
      toast.success(`${product.name} ${t('addedToCart')}`)
    }
  }

  // Add to cart with variants
  const addToCartWithVariants = () => {
    if (!selectedProduct) return

    const variantsArray = Object.values(selectedVariants)
    // Check if item with same variants exists
    const existingItem = cart.find(item => {
      if (item.product.id !== selectedProduct.id) return false
      if (!item.variants || item.variants.length !== variantsArray.length) return false
      
      return item.variants.every(v => 
        variantsArray.some(sv => sv.variant_option_id === v.variant_option_id)
      )
    })

    if (existingItem) {
      setCart(cart.map(item => 
        item === existingItem
          ? { ...item, qty: item.qty + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        product: selectedProduct,
        qty: 1,
        variants: variantsArray,
        notes: itemNotes
      }])
    }

    toast.success(`${selectedProduct.name} ${t('addedToCart')}`)
    setShowVariantModal(false)
    setSelectedProduct(null)
    setSelectedVariants({})
    setItemNotes('')
  }

  // Select variant option
  const selectVariant = (groupId: string, option: any) => {
    setSelectedVariants({
      ...selectedVariants,
      [groupId]: {
        variant_option_id: option.id,
        group_name: option.group_name,
        option_name: option.name,
        price_adjustment: parseFloat(option.price_adjustment) || 0
      }
    })
  }

  // Remove from cart
  const removeFromCart = (productId: string, variants?: VariantSelection[]) => {
    if (variants) {
      setCart(cart.filter(item => {
        if (item.product.id !== productId) return true
        if (!item.variants || item.variants.length !== variants.length) return true
        return !item.variants.every(v => 
          variants.some(sv => sv.variant_option_id === v.variant_option_id)
        )
      }))
    } else {
      setCart(cart.filter(item => item.product.id !== productId && !item.variants))
    }
    toast.success(t('removedFromCart'))
  }

  // Update quantity
  const updateQty = (productId: string, newQty: number, variants?: VariantSelection[]) => {
    if (newQty < 1) {
      removeFromCart(productId, variants)
      return
    }
    
    setCart(cart.map(item => {
      if (item.product.id !== productId) return item
      
      // Check if variants match
      if (variants) {
        if (!item.variants || item.variants.length !== variants.length) return item
        const variantsMatch = item.variants.every(v => 
          variants.some(sv => sv.variant_option_id === v.variant_option_id)
        )
        if (!variantsMatch) return item
      } else {
        if (item.variants) return item
      }
      
      return { ...item, qty: newQty }
    }))
  }

  // Apply voucher
  const applyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error(t('enterVoucherCode'))
      return
    }

    setCheckingVoucher(true)
    try {
      console.log('🎫 Validating voucher:', voucherCode.trim())
      console.log('🛒 Cart data:', {
        subtotal: cartSubtotal,
        items_count: cart.length
      })
      
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/vouchers/validate`, {
        code: voucherCode.trim(),
        cart: {
          subtotal: cartSubtotal,
          items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.qty,
            price: parseFloat(item.product.price as any),
            line_total: (parseFloat(item.product.price as any) + 
              (item.variants?.reduce((sum, v) => sum + (parseFloat(v.price_adjustment as any) || 0), 0) || 0)) * item.qty
          }))
        },
        user_id: null // QR order - no user
      })

      console.log('✅ Voucher validation response:', response.data)

      if (response.data.success) {
        console.log('✅ Voucher data:', response.data.data)
        // Store both voucher info and calculated discount
        setAppliedVoucher({
          ...response.data.data.voucher,
          calculatedDiscount: response.data.data.discount // Use pre-calculated discount from API
        })
        toast.success(t('voucherApplied'))
      }
    } catch (error: any) {
      console.error('❌ Voucher error:', error)
      console.error('❌ Error response:', error.response?.data)
      toast.error(error.response?.data?.message || t('invalidVoucher'))
    } finally {
      setCheckingVoucher(false)
    }
  }

  // Remove voucher
  const removeVoucher = () => {
    setAppliedVoucher(null)
    setVoucherCode('')
    toast.success(t('voucherRemoved'))
  }

  const cartSubtotal = cart.reduce((sum, item) => {
    const variantTotal = item.variants?.reduce((vsum, v) => vsum + (parseFloat(v.price_adjustment as any) || 0), 0) || 0
    return sum + ((parseFloat(item.product.price as any) + variantTotal) * item.qty)
  }, 0)
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0)

  // Apply voucher discount
  let discountAmount = 0
  // DON'T calculate from frontend cart! Always use backend data for existing orders
  if (appliedVoucher && cartSubtotal > 0 && !currentOrderId) {  
    // Only calculate for NEW orders (not existing orders)
    console.log('🎫 Applied voucher (new order):', appliedVoucher)
    
    if (appliedVoucher.calculatedDiscount) {
      discountAmount = parseFloat(appliedVoucher.calculatedDiscount)
      console.log('💰 Using calculated discount from API:', discountAmount)
    }
  } else if (currentOrderId) {
    console.log('ℹ️ Existing order - discount will be calculated by backend')
    discountAmount = 0 // Backend handles this
  }

  const subtotalAfterDiscount = cartSubtotal - discountAmount
  console.log('💰 Subtotal after discount:', subtotalAfterDiscount)

  // Calculate tax
  // URUTAN: SC dulu, baru PB1
  const scAmount = (orderType === 'dine_in' && scTax) ? (subtotalAfterDiscount * (parseFloat(scTax.rate) / 100)) : 0
  const baseForPB1 = subtotalAfterDiscount + scAmount
  const pb1Amount = pb1Tax ? (baseForPB1 * (parseFloat(pb1Tax.rate) / 100)) : 0
  const cartTotal = subtotalAfterDiscount + scAmount + pb1Amount
  
  console.log('💰 PB1 amount:', pb1Amount)
  console.log('💰 SC amount:', scAmount)
  console.log('💰 Cart total:', cartTotal)

  // Submit order
  const submitOrder = async () => {
    // Show confirmation modal
    const message = currentOrderId 
      ? `Tambah ${cartItemCount} item ke pesanan?`
      : `Buat pesanan dengan ${cartItemCount} item?`;
    
    setConfirmMessage(message)
    setConfirmAction(() => executeSubmitOrder)
    setShowConfirmModal(true)
  }

  // Execute actual order submission
  const executeSubmitOrder = async () => {
    setShowConfirmModal(false)
    
    console.log('🚀 submitOrder called')
    console.log('📊 Cart length:', cart.length)
    console.log('📍 Table ID:', tableId)
    console.log('📝 Current Order ID:', currentOrderId)
    
    if (cart.length === 0) {
      console.log('❌ Cart is empty')
      toast.error(t('emptyCart'))
      return
    }

    if (!tableId) {
      console.log('❌ Table ID not found')
      toast.error(t('tableNotFound'))
      return
    }

    console.log('✅ Validation passed, preparing order data...')

    try {
      // If we have an existing order, add items to it
      if (currentOrderId) {
        console.log('➕ Adding items to existing order:', currentOrderId)
        
        // Add each item to the existing order
        for (const item of cart) {
          const itemData = {
            store_id: storeId,
            product_id: item.product.id,
            qty: item.qty,
            notes: item.notes,
            variants: item.variants
          }
          
          await axios.post(
            `${import.meta.env.VITE_API_URL}/orders/${currentOrderId}/items`,
            itemData,
            { timeout: 30000 }
          )
        }
        
        console.log('✅ Items added to existing order')
        
        // Clear cart first
        setCart([])
        
        // Re-load order details to sync voucher discount (AWAIT THIS!)
        console.log('🔄 Re-loading order details to sync voucher')
        try {
          await loadExistingOrderDetails(currentOrderId)
          console.log('✅ Voucher synced successfully')
          
          // Show success AFTER voucher loaded
          toast.success(t('itemsAdded') || 'Items added to order!')
          
          // Close modal AFTER voucher loaded
          setShowCart(false)
        } catch (error) {
          console.error('❌ Error syncing voucher:', error)
          // Still close and show success even if sync fails
          toast.success(t('itemsAdded') || 'Items added to order!')
          setShowCart(false)
        }
        
      } else {
        // Create new order
        console.log('📤 Creating new order...', {
          store_id: storeId,
          table_id: tableId,
          order_type: orderType,
          customer_name: customerName,
          customer_phone: customerPhone,
          voucher_code: appliedVoucher ? appliedVoucher.code : null,
          items_count: cart.length
        })

        const orderData = {
          store_id: storeId,
          table_id: tableId,
          order_type: orderType,
          source: 'qr',
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          voucher_code: appliedVoucher ? appliedVoucher.code : null,
          items: cart.map(item => ({
            product_id: item.product.id,
            qty: item.qty,
            notes: item.notes,
            variants: item.variants
          }))
        }

        console.log('📦 Order data:', JSON.stringify(orderData, null, 2))
        console.log('🌐 API URL:', `${import.meta.env.VITE_API_URL}/api/orders`)
        console.log('⏱️ Starting axios request...')

        const response = await axios.post(`${import.meta.env.VITE_API_URL}/orders`, orderData, {
          timeout: 30000 // 30 second timeout
        })
        
        console.log('✅ Order response received:', response.data)
        
        // Save order ID to localStorage
        const orderInfo = {
          order_id: response.data.data.id,
          store_id: storeId,
          table_code: tableCode,
          created_at: new Date().toISOString(),
          status: response.data.data.status
        }
        
        const storageKey = getOrderStorageKey()
        localStorage.setItem(storageKey, JSON.stringify(orderInfo))
        setCurrentOrderId(response.data.data.id)
        
        console.log('💾 Order saved to localStorage:', orderInfo)
        
        // Show success modal
        setSuccessMessage(`Pesanan berhasil dipesan!\n\nPesanan Anda akan diproses oleh kasir.\nMohon tunggu...`)
        setShowSuccessModal(true)
        
        // Clear form
        setCart([])
        setShowCart(false)
        setCustomerName('')
        setCustomerPhone('')
        setOrderType('dine_in')
        
        // Clear active order after success - allow new order
        setTimeout(() => {
          setCurrentOrderId(null)
          const storageKey = getOrderStorageKey()
          localStorage.removeItem(storageKey)
          setShowSuccessModal(false)
        }, 3000)
      }
    } catch (error: any) {
      console.error('❌ Order error:', error)
      console.error('❌ Error response:', error.response?.data)
      console.error('❌ Error message:', error.message)
      console.error('❌ Error code:', error.code)
      
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout - Server tidak merespon')
      } else {
        toast.error(error.response?.data?.message || error.message || t('orderFailed'))
      }
    }
  }

  // Jika tidak ada query params, tampilkan welcome screen
  if (!tableCode || !storeId) {
    return (
      <div className={styles.welcome}>
        <div className={styles.welcomeContent}>
          <span className={styles.welcomeIcon}>🍽️</span>
          <h1 className={styles.welcomeTitle}>{t('welcome')}</h1>
          <p className={styles.welcomeDesc}>
            {t('scanQR')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.storeInfo}>
          {store?.logo_url && (
            <img src={store.logo_url} alt={store.name} className={styles.logo} />
          )}
        </div>
        {currentOrderId && (
          <div className={styles.activeOrderBadge}>
            🔔 {t('activeOrder') || 'Active Order'}
            <button 
              onClick={() => {
                if (window.confirm(t('startNewOrderConfirm') || 'Start a new order? Current order will remain active.')) {
                  const storageKey = getOrderStorageKey()
                  localStorage.removeItem(storageKey)
                  setCurrentOrderId(null)
                  // Clear voucher when starting new order
                  setVoucherCode('')
                  setAppliedVoucher(null)
                  toast.success(t('newOrderStarted') || 'New order started')
                }
              }}
              className={styles.newOrderBtn}
            >
              {t('newOrder') || 'New Order'}
            </button>
          </div>
        )}
        <LanguageSwitcher />
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className={styles.filterBar}>
          <div className={styles.filterScroll}>
            <button
              className={`${styles.filterBtn} ${selectedCategory === 'all' ? styles.filterBtnActive : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              {t('all')}
            </button>
            {categories.map((category) => (
              <button
                key={category}
                className={`${styles.filterBtn} ${selectedCategory === category ? styles.filterBtnActive : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className={styles.content}>
        {isLoading && (
          <div className={styles.loading}>{t('loadingMenu')}</div>
        )}

        {!isLoading && products.length === 0 && (
          <div className={styles.empty}>
            <span>🍽️</span>
            <p>{t('noMenu')}</p>
          </div>
        )}

        {Object.entries(sortedFilteredGrouped).map(([category, items]) => (
          <div key={category} className={styles.category}>
            <h2 className={styles.categoryTitle}>{category}</h2>
            <div className={styles.productGrid}>
              {items.map((product) => (
                <div key={product.id} className={styles.productCard}>
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className={styles.productImage}
                    />
                  )}
                  <div className={styles.productInfo}>
                    <h3 className={styles.productName}>{product.name}</h3>
                    {product.description && (
                      <p className={styles.productDesc}>{product.description}</p>
                    )}
                    <div className={styles.productFooter}>
                      <span className={styles.price}>
                        Rp {Math.round(parseFloat(product.price as any)).toLocaleString('id-ID')}
                      </span>
                      <button 
                        onClick={() => addToCart(product)}
                        className={styles.btnAdd}
                        disabled={product.is_available === false || (product.track_stock === true && parseFloat(product.stock_qty as any) <= 0)}
                      >
                        + {t('addToCart')}
                      </button>
                    </div>
                  </div>
                  {(product.is_available === false || (product.track_stock === true && parseFloat(product.stock_qty as any) <= 0)) && (
                    <div className={styles.stockOut}>SOLD OUT</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Cart Float Button */}
      {cart.length > 0 && (
        <button 
          onClick={() => setShowCart(true)}
          className={styles.cartButton}
        >
          <div className={styles.cartButtonContent}>
            <div className={styles.cartButtonText}>
              <div className={styles.cartItemCount}>{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</div>
              {cart.length > 0 && (
                <div className={styles.cartItemName}>
                  {cart[cart.length - 1].product.name.substring(0, 35)}
                  {cart[cart.length - 1].product.name.length > 35 ? '...' : ''}
                </div>
              )}
            </div>
            <div className={styles.cartPrice}>
              Rp {Math.round(cartSubtotal).toLocaleString('id-ID')}
            </div>
          </div>
          <div className={styles.cartIconWrapper}>
            <div className={styles.cartBadge}>{cartItemCount}</div>
            <div className={styles.cartIcon}>🛒</div>
          </div>
        </button>
      )}

      {/* Variant Modal */}
      {showVariantModal && selectedProduct && (
        <div className={styles.cartModal}>
          <div className={styles.cartOverlay} onClick={() => setShowVariantModal(false)} />
          <div className={styles.cartContent}>
            <div className={styles.cartHeader}>
              <h2>{selectedProduct.name}</h2>
              <button onClick={() => setShowVariantModal(false)} className={styles.btnClose}>
                ✕
              </button>
            </div>

            <div className={styles.cartBody}>
              {/* Product Info */}
              <div className={styles.variantProductInfo}>
                {selectedProduct.image_url && (
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name}
                    className={styles.variantProductImage}
                  />
                )}
                <div className={styles.variantProductPrice}>
                  {t('basePrice')}: Rp {Math.round(parseFloat(selectedProduct.price as any)).toLocaleString('id-ID')}
                </div>
              </div>

              {/* Variant Groups */}
              {selectedProduct.variants?.map((group: any) => (
                <div key={group.id} className={styles.variantGroup}>
                  <h3 className={styles.variantGroupTitle}>{group.name}</h3>
                  <div className={styles.variantOptions}>
                    {group.options?.map((option: any) => {
                      const isSelected = selectedVariants[group.id]?.variant_option_id === option.id
                      return (
                        <button
                          key={option.id}
                          onClick={() => selectVariant(group.id, { ...option, group_name: group.name })}
                          className={`${styles.variantOption} ${isSelected ? styles.variantOptionSelected : ''}`}
                        >
                          <span className={styles.variantOptionName}>{option.name}</span>
                          {option.price_adjustment > 0 && (
                            <span className={styles.variantOptionPrice}>
                              +Rp {Math.round(option.price_adjustment).toLocaleString('id-ID')}
                            </span>
                          )}
                          {isSelected && <span className={styles.variantOptionCheck}>✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Notes */}
              <div className={styles.variantGroup}>
                <h3 className={styles.variantGroupTitle}>{t('notesOptional')}</h3>
                <textarea
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder={t('notesPlaceholder')}
                  className={styles.notesInput}
                  rows={3}
                />
              </div>
            </div>

            <div className={styles.cartFooter}>
              <div className={styles.cartSummary}>
                <div className={styles.summaryRow}>
                  <span>{t('total')}</span>
                  <span className={styles.summaryAmount}>
                    Rp {Math.round(
                      parseFloat(selectedProduct.price as any) + 
                      Object.values(selectedVariants).reduce((sum, v) => sum + (parseFloat(v.price_adjustment as any) || 0), 0)
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={addToCartWithVariants}
                disabled={selectedProduct.variants?.some((g: any) => !selectedVariants[g.id])}
                className={styles.btnCheckout}
              >
                {t('addToCart')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className={styles.cartModal}>
          <div className={styles.cartOverlay} onClick={() => setShowCart(false)} />
          <div className={styles.cartContent}>
            <div className={styles.cartHeader}>
              <h2>{t('cart')}</h2>
              <button onClick={() => setShowCart(false)} className={styles.btnClose}>
                ✕
              </button>
            </div>

            <div className={styles.cartBody}>
              {cart.length === 0 ? (
                <div className={styles.cartEmpty}>
                  <span>🛒</span>
                  <p>{t('emptyCart')}</p>
                </div>
              ) : (
                <>
                  {/* Order Type Selection */}
                  <div className={styles.orderTypeSection}>
                    <h3 className={styles.sectionTitle}>{t('orderType')}</h3>
                    <div className={styles.orderTypeButtons}>
                      <button
                        className={`${styles.orderTypeBtn} ${orderType === 'dine_in' ? styles.orderTypeBtnActive : ''}`}
                        onClick={() => setOrderType('dine_in')}
                      >
                        🍽️ {t('dineIn')}
                      </button>
                      <button
                        className={`${styles.orderTypeBtn} ${orderType === 'take_away' ? styles.orderTypeBtnActive : ''}`}
                        onClick={() => setOrderType('take_away')}
                      >
                        🥡 {t('takeAway')}
                      </button>
                    </div>
                  </div>

                  {/* Customer Info (Optional) */}
                  <div className={styles.customerInfoSection}>
                    <h3 className={styles.sectionTitle}>{t('customerInfo')} ({t('optional')})</h3>
                    <div className={styles.customerInfoRow}>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={t('customerName')}
                        className={styles.inputField}
                      />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder={t('customerPhone')}
                        className={styles.inputField}
                      />
                    </div>
                  </div>

                  {/* Voucher Section */}
                  <div className={styles.voucherSection}>
                    <h3 className={styles.sectionTitle}>
                      {t('promoCode')} ({t('optional')})
                      {currentOrderId && appliedVoucher && (
                        <span className={styles.voucherAutoApplied}> - {t('autoApplied') || 'Auto-applied'}</span>
                      )}
                    </h3>
                    {!appliedVoucher ? (
                      <div className={styles.voucherInputGroup}>
                        <input
                          type="text"
                          value={voucherCode}
                          onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                          placeholder={t('enterPromoCode')}
                          className={styles.inputField}
                          disabled={!!(checkingVoucher || currentOrderId)} // Disable for existing orders
                        />
                        <button
                          onClick={applyVoucher}
                          disabled={!!(checkingVoucher || !voucherCode.trim() || currentOrderId)}
                          className={styles.btnApplyVoucher}
                        >
                          {checkingVoucher ? t('checking') : t('apply')}
                        </button>
                      </div>
                    ) : (
                      <div className={styles.appliedVoucherCard}>
                        <div className={styles.appliedVoucherInfo}>
                          <span className={styles.voucherIcon}>🎉</span>
                          <div>
                            <div className={styles.voucherCode}>{appliedVoucher.code}</div>
                            <div className={styles.voucherDesc}>
                              {appliedVoucher.discount_type === 'percentage' 
                                ? `Discount ${appliedVoucher.discount_value}%`
                                : `Diskon Rp ${Math.round(appliedVoucher.calculatedDiscount || 0).toLocaleString('id-ID')}`
                              }
                              {currentOrderId && (
                                <span className={styles.voucherFromOrder}> (dari order sebelumnya)</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {!currentOrderId && (
                          <button onClick={removeVoucher} className={styles.btnRemoveVoucher}>
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cart Items */}
                  <h3 className={styles.sectionTitle}>{t('orderItems')}</h3>
                  <div className={styles.cartItems}>
                    {cart.map((item) => {
                      const variantTotal = item.variants?.reduce((sum, v) => sum + (parseFloat(v.price_adjustment as any) || 0), 0) || 0
                      const itemPrice = parseFloat(item.product.price as any) + variantTotal
                      
                      return (
                        <div key={`${item.product.id}-${item.variants?.map(v => v.variant_option_id).join('-')}`} className={styles.cartItem}>
                          <div className={styles.cartItemInfo}>
                            <h4>{item.product.name}</h4>
                            {item.variants && item.variants.length > 0 && (
                              <div className={styles.cartItemVariants}>
                                {item.variants.map((v, idx) => (
                                  <span key={idx} className={styles.variantTag}>
                                    {v.option_name}
                                    {v.price_adjustment > 0 && ` (+${Math.round(v.price_adjustment).toLocaleString('id-ID')})`}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.notes && (
                              <p className={styles.cartItemNotes}>📝 {item.notes}</p>
                            )}
                            <p className={styles.cartItemPrice}>
                              Rp {Math.round(itemPrice).toLocaleString('id-ID')}
                            </p>
                          </div>
                          
                          <div className={styles.cartItemActions}>
                            <div className={styles.qtyControl}>
                              <button 
                                onClick={() => updateQty(item.product.id, item.qty - 1, item.variants)}
                                className={styles.btnQty}
                              >
                                -
                              </button>
                              <span className={styles.qty}>{item.qty}</span>
                              <button 
                                onClick={() => updateQty(item.product.id, item.qty + 1, item.variants)}
                                className={styles.btnQty}
                              >
                                +
                              </button>
                            </div>
                            
                            <button 
                              onClick={() => removeFromCart(item.product.id, item.variants)}
                              className={styles.btnRemove}
                            >
                              🗑️
                            </button>
                          </div>
                          
                          <div className={styles.cartItemTotal}>
                            Rp {Math.round(itemPrice * item.qty).toLocaleString('id-ID')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div className={styles.cartFooter}>
                <div className={styles.cartSummary}>
                  <div className={styles.summaryRow}>
                    <span>{t('subtotal')}</span>
                    <span className={styles.summaryAmount}>
                      Rp {Math.round(cartSubtotal).toLocaleString('id-ID')}
                    </span>
                  </div>
                  
                  {appliedVoucher && discountAmount > 0 && (
                    <div className={styles.summaryRow} style={{ color: '#22C55E' }}>
                      <span>{t('discount')} ({appliedVoucher.code})</span>
                      <span className={styles.summaryAmount}>
                        -Rp {Math.round(discountAmount).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                  
                  {orderType === 'dine_in' && scTax && (
                    <div className={styles.summaryRow}>
                      <span>{scTax.name} ({parseFloat(scTax.rate) % 1 === 0 ? parseInt(scTax.rate) : scTax.rate}%)</span>
                      <span className={styles.summaryAmount}>
                        Rp {Math.round(scAmount).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                  
                  {pb1Tax && (
                    <div className={styles.summaryRow}>
                      <span>{pb1Tax.name} ({parseFloat(pb1Tax.rate) % 1 === 0 ? parseInt(pb1Tax.rate) : pb1Tax.rate}%)</span>
                      <span className={styles.summaryAmount}>
                        Rp {Math.round(pb1Amount).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                  
                  <div className={styles.summaryRowTotal}>
                    <span>{t('grandTotal')}</span>
                    <span className={styles.summaryAmountTotal}>
                      Rp {Math.round(cartTotal).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={submitOrder}
                  className={styles.btnCheckout}
                >
                  {currentOrderId 
                    ? `➕ ${t('addItems')} (${cartItemCount} ${t('items')})`
                    : `${t('createOrder')} (${cartItemCount} ${t('items')})`
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className={styles.cartModal}>
          <div className={styles.cartOverlay} onClick={() => setShowConfirmModal(false)} />
          <div className={styles.confirmModal}>
            <div className={styles.cartHeader}>
              <h2>Konfirmasi</h2>
              <button onClick={() => setShowConfirmModal(false)} className={styles.btnClose}>
                ✕
              </button>
            </div>

            <div className={styles.cartBody} style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ fontSize: '16px', marginBottom: '24px', color: '#000' }}>
                {confirmMessage}
              </p>
            </div>

            <div className={styles.modalActions}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className={styles.btnSecondary}
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  if (confirmAction === 'qty_adjustment') {
                    setShowConfirmModal(false)
                    // Auto submit order setelah user set qty
                    setTimeout(() => {
                      executeSubmitOrder()
                    }, 100)
                  } else if (typeof confirmAction === 'function') {
                    confirmAction()
                  }
                  setConfirmAction(null)
                }}
                className={styles.btnCheckout}
              >
                {confirmAction === 'qty_adjustment' ? 'Lanjutkan Pesan' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className={styles.cartModal}>
          <div className={styles.cartOverlay} onClick={() => setShowSuccessModal(false)} />
          <div className={styles.confirmModal} style={{ textAlign: 'center' }}>
            <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
              {/* Success Icon */}
              <div style={{ fontSize: '64px' }}>
                ✅
              </div>

              {/* Success Message */}
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#22C55E', margin: '0 0 12px 0' }}>
                  Pesanan Berhasil!
                </h2>
                <p style={{ fontSize: '16px', color: '#666', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {successMessage}
                </p>
              </div>

              {/* Loading Indicator */}
              <div style={{ fontSize: '32px' }}>
                ⏳
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
