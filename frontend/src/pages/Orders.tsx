import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Plus, RefreshCw, Filter } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
// import { useOrderWebSocket } from '@/hooks/useWebSocket';
import { OrderList } from '@/components/orders/OrderList';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { CreateOrderModal } from '@/components/orders/CreateOrderModal';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { AddItemsModal } from '@/components/orders/AddItemsModal';
import { TransferTableModal } from '@/components/orders/TransferTableModal';
import { MergeOrderModal } from '@/components/orders/MergeOrderModal';
import { SplitBillModal } from '@/components/orders/SplitBillModal';
import { ViewSplitBillsModal } from '@/components/orders/ViewSplitBillsModal';
import { PaymentModal } from '@/components/orders/PaymentModal';
import * as orderService from '@/services/order.service';
import * as voucherService from '@/services/voucher.service';
import type { Order, OrderDetails } from '@/types/order';
import styles from './Orders.module.css';

export default function Orders() {
  const queryClient = useQueryClient();
  const { currentStoreId } = useAuthStore();
  const {
    orders,
    selectedOrder,
    isLoadingOrders,
    setOrders,
    setSelectedOrder,
    setLoadingOrders,
  } = useOrderStore();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [showTransferTableModal, setShowTransferTableModal] = useState(false);
  const [showMergeOrderModal, setShowMergeOrderModal] = useState(false);
  const [transferOrder, setTransferOrder] = useState<OrderDetails | null>(null);
  const [mergeSourceOrder, setMergeSourceOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<OrderDetails | null>(null);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [splitBillOrder, setSplitBillOrder] = useState<OrderDetails | null>(null);
  const [showViewSplitBillsModal, setShowViewSplitBillsModal] = useState(false);
  const [viewSplitBillsOrder, setViewSplitBillsOrder] = useState<OrderDetails | null>(null);
  
  // Payment modal for split bills
  const [showBillPaymentModal, setShowBillPaymentModal] = useState(false);
  const [billPaymentData, setBillPaymentData] = useState<{
    orderId: string;
    billId: string;
    total: number;
    subtotal: number;
    discount: number;
    tax: number;
    serviceCharge: number;
    orderType: 'dine_in' | 'take_away' | 'takeaway' | 'delivery';
  } | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Available vouchers from API
  const [availableVouchers, setAvailableVouchers] = useState<Array<{
    id: string;
    code: string;
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    description?: string;
  }>>([]);

  // Load vouchers
  const loadVouchers = async () => {
    if (!currentStoreId) return;
    
    try {
      const response = await voucherService.getVouchers(currentStoreId);
      // Map voucher data to promo format
      const promos = response.data
        .filter((v) => v.is_active && v.type === 'discount') // Only active discount vouchers
        .map((v) => ({
          id: v.id,
          code: v.code,
          name: v.name,
          type: (v.discount_type || 'fixed') as 'percentage' | 'fixed',
          value: v.discount_value || 0,
          description: v.description || undefined,
        }));
      setAvailableVouchers(promos);
    } catch (error: any) {
      console.error('Failed to load vouchers:', error);
    }
  };

  // WebSocket connection for real-time updates (DISABLED)
  // const { isConnected, connectionStatus } = useOrderWebSocket({
  //   storeId: currentStoreId || '',
  //   userId: user?.id,
  //   enabled: !!currentStoreId,
  //   onOrderCreated: (order) => {
  //     handleOrderCreated(order);
  //   },
  //   onOrderUpdated: (order) => {
  //     handleOrderUpdated(order);
  //   },
  //   onOrderItemAdded: () => {
  //     if (selectedOrderId) {
  //       loadOrderDetails(selectedOrderId);
  //     }
  //   },
  //   onOrderPaymentAdded: () => {
  //     if (selectedOrderId) {
  //       loadOrderDetails(selectedOrderId);
  //     }
  //   },
  // });

  // Handle order status update
  const handleUpdateOrderStatus = async (
    orderId: string,
    status: 'pending' | 'processing' | 'paid' | 'void' | 'merged'
  ) => {
    if (!currentStoreId) return;

    try {
      await orderService.updateOrderStatus(currentStoreId, orderId, status);
      toast.success('Order status updated');
      
      // Reload orders and detail if needed
      await loadOrders();
      if (selectedOrderId === orderId) {
        await loadOrderDetails(orderId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
      throw error;
    }
  };

  // Handle item status update
  const handleUpdateItemStatus = async (
    orderId: string,
    itemId: string,
    status: 'pending' | 'processing' | 'ready' | 'void'
  ) => {
    if (!currentStoreId) return;

    try {
      await orderService.updateOrderItemStatus(currentStoreId, orderId, itemId, status);
      toast.success('Item status updated');
      
      // Reload detail
      if (selectedOrderId === orderId) {
        await loadOrderDetails(orderId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update item status');
      throw error;
    }
  };

  // Load orders
  const loadOrders = async (page?: number) => {
    if (!currentStoreId) {
      toast.error('Please select a store');
      return;
    }

    try {
      setLoadingOrders(true);
      const pageToLoad = page !== undefined ? page : currentPage;
      const filters: any = { 
        store_id: currentStoreId,
        page: pageToLoad,
        limit: pageSize
      };
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      const response = await orderService.getOrdersAdmin(currentStoreId, filters);
      setOrders(response.data);
      
      // Update pagination state from response
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotalOrders(response.pagination.total);
        setCurrentPage(response.pagination.page);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load order details
  const loadOrderDetails = async (orderId: string) => {
    if (!currentStoreId) return;

    try {
      const response = await orderService.getOrderDetailsAdmin(currentStoreId, orderId);
      setSelectedOrder(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load order details');
    }
  };

  // Handle order selection
  const handleSelectOrder = async (order: Order) => {
    if (!currentStoreId) return;

    try {
      setSelectedOrderId(order.id);
      const response = await orderService.getOrderDetailsAdmin(currentStoreId, order.id);
      
      // Update both selectedOrder (for main detail view) and detailOrder (for modal)
      setSelectedOrder(response.data);
      setDetailOrder(response.data);
      setShowDetailModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load order details');
    }
  };

  // Create new order
  const handleCreateOrder = async (data: {
    table_id?: string;
    order_type: 'dine_in' | 'takeaway' | 'delivery';
    customer_name?: string;
    customer_phone?: string;
    items: any[];
  }) => {
    console.log('handleCreateOrder called with data:', data);
    
    if (!currentStoreId) {
      toast.error('Please select a store');
      return;
    }

    try {
      console.log('Calling createOrderAdmin API...');
      const response = await orderService.createOrderAdmin(currentStoreId, data);
      console.log('Order created response:', response);
      
      // Only show ONE success toast
      toast.success(`Pesanan ${response.data.order_number} berhasil dibuat!`);
      
      // Invalidate products query to refresh stock
      queryClient.invalidateQueries({ queryKey: ['products', currentStoreId] });
      
      setShowCreateModal(false);
      await loadOrders();
      handleSelectOrder(response.data);
    } catch (error: any) {
      console.error('Create order error:', error);
      toast.error(error.response?.data?.message || 'Failed to create order');
    }
  };

  // Add item to order
  const handleAddItem = () => {
    if (!selectedOrder) {
      toast.error('Pilih order terlebih dahulu');
      return;
    }
    setShowAddItemsModal(true);
  };

  const handleAddItemsFromList = (order: Order) => {
    // Load full order details first
    if (!currentStoreId) return;
    
    orderService.getOrderDetailsAdmin(currentStoreId, order.id).then((response) => {
      setSelectedOrder(response.data);
      setShowAddItemsModal(true);
    }).catch((error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memuat detail order');
    });
  };

  const handleTransferTableFromList = (order: Order) => {
    // Load full order details first
    if (!currentStoreId) return;
    
    orderService.getOrderDetailsAdmin(currentStoreId, order.id).then((response) => {
      setTransferOrder(response.data);
      setShowTransferTableModal(true);
    }).catch((error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memuat detail order');
    });
  };

  const handleMergeOrderFromList = (order: Order) => {
    setMergeSourceOrder(order);
    setShowMergeOrderModal(true);
  };

  const handleAddItemsSuccess = async () => {
    // Reload orders and order detail after adding items
    console.log('📢 handleAddItemsSuccess called');
    await loadOrders();
    if (selectedOrder) {
      console.log('📢 Loading order details for:', selectedOrder.id);
      await loadOrderDetails(selectedOrder.id);
    }
  };

  // Apply discount
  const handleApplyDiscount = () => {
    toast.loading('Apply discount feature - to be implemented');
  };

  // Add payment
  const handlePayment = async (orderId: string, data: any) => {
    if (!currentStoreId) return;

    try {
      console.log('💰 Payment data received:', data);
      
      // Map payment method to actual payment method ID from backend
      const paymentData = {
        payment_method_id: data.method,
        amount: data.amount,
        tendered_amount: data.tenderedAmount,
        change_amount: data.changeAmount,
        reference_no: data.referenceNo,
        voucher_code: data.promoCode, // Pass voucher code to backend
      };

      console.log('📤 Sending payment to backend:', paymentData);

      await orderService.addPayment(currentStoreId, orderId, paymentData);
      
      // Success message based on whether voucher was used
      if (data.promoCode) {
        const promo = availableVouchers.find(p => p.code === data.promoCode);
        if (promo) {
          toast.success(`Pembayaran berhasil dengan voucher ${data.promoCode}!`);
        } else {
          toast.success('Pembayaran berhasil!');
        }
      } else {
        toast.success('Pembayaran berhasil ditambahkan');
      }
      
      await loadOrders();
      
      if (selectedOrderId === orderId) {
        await loadOrderDetails(orderId);
      }
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      toast.error(error.response?.data?.message || 'Gagal menambahkan pembayaran');
    }
  };

  // Split bill
  const handleSplitBill = async (orderId: string) => {
    if (!currentStoreId) return;
    
    try {
      // Load full order details
      const response = await orderService.getOrderDetailsAdmin(currentStoreId, orderId);
      setSplitBillOrder(response.data);
      setShowSplitBillModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal memuat detail order');
    }
  };

  const handleSplitBillSubmit = async (splits: Array<{ id: string; label: string; item_ids: string[]; amount: number }>, splitBy: 'item' | 'amount') => {
    if (!splitBillOrder || !currentStoreId) return;
    
    try {
      await orderService.splitBill(currentStoreId, splitBillOrder.id, {
        splits,
        split_by: splitBy
      });
      
      toast.success(`Bill berhasil di-split jadi ${splits.length} bills!`);
      setShowSplitBillModal(false);
      
      // Close detail modal if open
      setShowDetailModal(false);
      setDetailOrder(null);
      
      // Reload orders and reopen detail with updated data
      await loadOrders();
      
      if (selectedOrderId === splitBillOrder.id) {
        await loadOrderDetails(splitBillOrder.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal split bill');
    }
  };

  // View split bills (allow re-splitting)
  const handleViewSplitBills = async (order: Order) => {
    if (!currentStoreId) return;
    
    try {
      // Load full order details
      const response = await orderService.getOrderDetailsAdmin(currentStoreId, order.id);
      
      // If order is already split, show ViewSplitBills with payment options
      // Otherwise, show SplitBillModal to create split
      if (response.data.is_split && response.data.bills && response.data.bills.length > 0) {
        setViewSplitBillsOrder(response.data);
        setShowViewSplitBillsModal(true);
      } else {
        setSplitBillOrder(response.data);
        setShowSplitBillModal(true);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal memuat detail order');
    }
  };

  // Handle edit split - close view modal and open split modal for editing
  const handleEditSplit = () => {
    if (!viewSplitBillsOrder) return;
    
    setShowViewSplitBillsModal(false);
    setSplitBillOrder(viewSplitBillsOrder);
    setShowSplitBillModal(true);
  };

  // Handle pay single bill
  const handlePayBill = async (billId: string) => {
    if (!viewSplitBillsOrder || !currentStoreId) return;
    
    // Find the bill
    const bill = viewSplitBillsOrder.bills?.find(b => b.id === billId);
    if (!bill) return;
    
    // Close view modal and open payment modal for this specific bill
    setShowViewSplitBillsModal(false);
    
    // Set payment data with BILL info (not order info)
    setBillPaymentData({
      orderId: viewSplitBillsOrder.id,
      billId: billId,
      total: bill.grand_total,
      subtotal: bill.subtotal,
      discount: bill.discount_total,
      tax: bill.tax_total,
      serviceCharge: bill.service_charge_total,
      orderType: viewSplitBillsOrder.order_type,
    });
    setShowBillPaymentModal(true);
  };

  // Handle bill payment submit
  const handleBillPaymentSubmit = async (paymentData: any) => {
    if (!billPaymentData || !currentStoreId) return;
    
    try {
      console.log('💰 Bill payment data received:', paymentData);
      
      // Transform payment data to match backend format
      const backendPaymentData = {
        payment_method_id: paymentData.method, // Transform method to payment_method_id
        amount: paymentData.amount,
        tendered_amount: paymentData.tenderedAmount,
        change_amount: paymentData.changeAmount,
        reference_no: paymentData.referenceNo,
        voucher_code: paymentData.promoCode,
        bill_id: billPaymentData.billId, // Important: pass bill_id for split payment
      };
      
      console.log('📤 Sending bill payment to backend:', backendPaymentData);
      
      await orderService.addPayment(currentStoreId, billPaymentData.orderId, backendPaymentData);
      
      toast.success('Pembayaran bill berhasil!');
      setShowBillPaymentModal(false);
      setBillPaymentData(null);
      
      // Reload orders
      await loadOrders();
      
      // Reload bill details if still viewing - ALWAYS reload to show updated status
      const response = await orderService.getOrderDetailsAdmin(currentStoreId, billPaymentData.orderId);
      console.log('🔄 Reloaded order after payment:', response.data);
      console.log('📋 Bills after payment:', response.data.bills);
      setViewSplitBillsOrder(response.data);
      setShowViewSplitBillsModal(true);
    } catch (error: any) {
      console.error('❌ Bill payment error:', error);
      toast.error(error.response?.data?.message || 'Gagal memproses pembayaran');
    }
  };

  // Void order
  const handleVoidOrder = async () => {
    if (!selectedOrder || !currentStoreId) return;

    const confirm = window.confirm('Are you sure you want to void this order?');
    if (!confirm) return;

    const reason = window.prompt('Void reason:');
    if (!reason) return;

    try {
      await orderService.voidOrder(currentStoreId, selectedOrder.id, reason);
      toast.success('Order voided');
      await loadOrders();
      setSelectedOrder(null);
      setSelectedOrderId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to void order');
    }
  };

  // Accept order (change status from pending to accepted) and print to kitchen
  const handleAcceptOrder = async (orderId: string) => {
    if (!currentStoreId) return;

    try {
      console.log('🎬 Accept order:', orderId);
      
      // Call acceptOrder endpoint to get full order details with categories
      const response = await orderService.acceptOrder(currentStoreId, orderId);
      const orderDetails = response.data;
      
      console.log('📦 Order accepted, items:', orderDetails.items?.length);
      console.log('📋 Order data:', {
        orderId: orderDetails.id,
        orderNumber: orderDetails.order_number,
        table: orderDetails.table_number,
        itemCount: orderDetails.items?.length
      });
      
      // Group items by category for kitchen printing
      const itemsByCategory = new Map<string, any[]>();
      
      if (orderDetails.items && orderDetails.items.length > 0) {
        for (const item of orderDetails.items) {
          const categoryName = item.category_name || 'Lainnya';
          if (!itemsByCategory.has(categoryName)) {
            itemsByCategory.set(categoryName, []);
          }
          itemsByCategory.get(categoryName)!.push(item);
        }
      }
      
      console.log('🏪 Items grouped by category:');
      for (const [categoryName, items] of itemsByCategory) {
        console.log(`   📂 ${categoryName}: ${items.length} item(s)`);
        items.forEach((item, idx) => {
          console.log(`      ${idx + 1}. ${item.product_name} x${item.qty}`);
        });
      }
      
      // TODO: Implement kitchen printing
      // 1. Get printer configurations from PrinterRepository
      // 2. For each category, find matching kitchen printer
      // 3. Format order using formatKitchenReceipt
      // 4. Send to printer via PrinterService.printKitchenOrders()
      // 5. Also print checker (summary of all items) to cashier printer
      console.log('🖨️ Next: Implement kitchen printing for categories:', Array.from(itemsByCategory.keys()));
      
      toast.success('Pesanan diterima! Status masakan: Diproses');
      await loadOrders();
    } catch (error: any) {
      console.error('Accept order error:', error);
      toast.error(error.response?.data?.message || 'Gagal menerima pesanan');
    }
  };

  // Mark order as completed (only if already paid)
  const handleMarkReady = async (orderId: string) => {
    if (!currentStoreId) return;

    try {
      // Get order details first to check payment status
      const response = await orderService.getOrderDetailsAdmin(currentStoreId, orderId);
      const order = response.data;

      // Check if order has been paid
      if (!order.payment_methods && order.paid_total === 0) {
        toast.error('Order harus dibayar terlebih dahulu!');
        return;
      }

      // Check if fully paid (for split bills, check all bills are paid)
      if (order.is_split) {
        // For split orders, check if all bills are paid
        const response = await orderService.getOrderDetailsAdmin(currentStoreId, orderId);
        console.log('🔍 Checking split bills:', response.data.bills);
        
        const allBillsPaid = response.data.bills?.every(b => {
          console.log(`  Bill ${b.bill_number}: status=${b.status}, paid=${b.paid_total}, total=${b.grand_total}`);
          return b.status === 'paid';
        });
        
        console.log('✅ All bills paid?', allBillsPaid);
        
        if (!allBillsPaid) {
          toast.error('Semua bills harus dibayar penuh sebelum order bisa diselesaikan!');
          return;
        }
      } else {
        // For regular orders, check paid_total
        if (order.paid_total < order.grand_total) {
          toast.error('Order belum dibayar penuh!');
          return;
        }
      }

      // Update order status to 'paid' (completed)
      await orderService.updateOrder(currentStoreId, orderId, {
        status: 'paid',
      });
      
      toast.success('Pesanan selesai!');
      await loadOrders();
    } catch (error: any) {
      console.error('Mark complete error:', error);
      toast.error(error.response?.data?.message || 'Gagal menandai pesanan selesai');
    }
  };

  // Delete order item
  const handleDeleteItem = async (itemId: string) => {
    if (!selectedOrder || !currentStoreId) return;

    const confirm = window.confirm('Are you sure you want to delete this item?');
    if (!confirm) return;

    try {
      await orderService.deleteOrderItemAdmin(currentStoreId, selectedOrder.id, itemId);
      toast.success('Item deleted');
      await loadOrderDetails(selectedOrder.id);
      await loadOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    }
  };

  // Load orders on mount and filter change
  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 on filter change
    loadOrders();
    loadVouchers(); // Load vouchers
  }, [currentStoreId, statusFilter, pageSize]);

  // Load orders on page change
  useEffect(() => {
    if (currentPage > 0) {
      loadOrders(currentPage);
    }
  }, [currentPage]);

  // Filter orders by status (exclude merged orders from display)
  const filteredOrders = statusFilter === 'all' 
    ? orders.filter(o => o.status !== 'merged')
    : orders.filter(o => o.status === statusFilter);

  return (
    <div className={styles.page}>
      <Toaster position="top-right" />

      <div className={styles.container}>
        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterTop}>
            <div className={styles.filterLeft}>
              <Filter size={20} className={styles.filterLabel} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.select}
              >
                <option value="all">Semua Pesanan</option>
                <option value="open">Pending</option>
                <option value="paid">Selesai</option>
                <option value="void">Batal</option>
              </select>
            </div>
            <div className={styles.filterRight}>
              {/* WebSocket status hidden */}
              <button onClick={() => loadOrders()} className={styles.btnRefresh}>
                <RefreshCw size={16} />
                Refresh
              </button>
              <button onClick={() => setShowCreateModal(true)} className={styles.btnNew}>
                <Plus size={20} />
                Pesanan Baru
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={styles.grid}>
          {/* Orders List */}
          <div className={styles.listSection}>
            {isLoadingOrders ? (
              <div className={styles.loading}>
                <RefreshCw size={32} />
                <p>Loading orders...</p>
              </div>
            ) : (
              <>
                <OrderList
                  orders={filteredOrders}
                  onSelectOrder={handleSelectOrder}
                  onAcceptOrder={handleAcceptOrder}
                  onMarkReady={handleMarkReady}
                  onAddItems={handleAddItemsFromList}
                  onTransferTable={handleTransferTableFromList}
                  onMergeOrder={handleMergeOrderFromList}
                  onPayment={handlePayment}
                  onViewSplitBills={handleViewSplitBills}
                  selectedOrderId={selectedOrderId || undefined}
                  availablePromos={availableVouchers}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalOrders={totalOrders}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </div>

          {/* Order Detail */}
          <div className={styles.detailSection}>
            {selectedOrder ? (
              <OrderDetail
                order={selectedOrder}
                onAddItem={handleAddItem}
                onDeleteItem={handleDeleteItem}
                onApplyDiscount={handleApplyDiscount}
                onAddPayment={() => handlePayment(selectedOrder.id, {})}
                onSplitBill={() => handleSplitBill(selectedOrder.id)}
                onVoidOrder={handleVoidOrder}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onUpdateItemStatus={handleUpdateItemStatus}
              />
            ) : (
              <div className={styles.emptyState}></div>
            )}
          </div>
        </div>
      </div>

      {/* Create Order Modal */}
      {currentStoreId && (
        <CreateOrderModal
          isOpen={showCreateModal}
          storeId={currentStoreId}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateOrder}
        />
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={showDetailModal}
        order={detailOrder}
        onClose={() => {
          setShowDetailModal(false);
          setDetailOrder(null);
          setSelectedOrderId(null);
        }}
      />

      {/* Add Items Modal */}
      {selectedOrder && currentStoreId && (
        <AddItemsModal
          isOpen={showAddItemsModal}
          order={selectedOrder}
          storeId={currentStoreId}
          onClose={() => setShowAddItemsModal(false)}
          onSuccess={handleAddItemsSuccess}
        />
      )}

      {/* Transfer Table Modal */}
      {transferOrder && currentStoreId && (
        <TransferTableModal
          isOpen={showTransferTableModal}
          orderId={transferOrder.id}
          currentTableNumber={transferOrder.table_number || 'N/A'}
          storeId={currentStoreId}
          onClose={() => setShowTransferTableModal(false)}
          onSuccess={handleAddItemsSuccess}
        />
      )}

      {/* Merge Order Modal */}
      {mergeSourceOrder && currentStoreId && (
        <MergeOrderModal
          isOpen={showMergeOrderModal}
          sourceOrder={mergeSourceOrder}
          availableOrders={orders}
          storeId={currentStoreId}
          onClose={() => setShowMergeOrderModal(false)}
          onSuccess={handleAddItemsSuccess}
        />
      )}

      {/* Split Bill Modal */}
      {splitBillOrder && (
        <SplitBillModal
          isOpen={showSplitBillModal}
          order={splitBillOrder}
          onClose={() => setShowSplitBillModal(false)}
          onSubmit={handleSplitBillSubmit}
        />
      )}

      {/* View Split Bills Modal */}
      {viewSplitBillsOrder && (
        <ViewSplitBillsModal
          isOpen={showViewSplitBillsModal}
          orderNumber={viewSplitBillsOrder.order_number}
          bills={viewSplitBillsOrder.bills || []}
          payments={viewSplitBillsOrder.payments || []}
          orderStatus={viewSplitBillsOrder.status}
          onClose={() => {
            setShowViewSplitBillsModal(false);
            setViewSplitBillsOrder(null);
          }}
          onPayBill={handlePayBill}
          onEditSplit={handleEditSplit}
        />
      )}

      {/* Payment Modal for Split Bills */}
      {billPaymentData && (
        <PaymentModal
          isOpen={showBillPaymentModal}
          onClose={() => {
            setShowBillPaymentModal(false);
            setBillPaymentData(null);
          }}
          orderTotal={billPaymentData.total}
          orderSubtotal={billPaymentData.subtotal}
          orderDiscount={billPaymentData.discount}
          orderDiscountName=""
          orderTax={billPaymentData.tax}
          orderServiceCharge={billPaymentData.serviceCharge}
          orderType={billPaymentData.orderType}
          availablePromos={[]}
          onPayment={handleBillPaymentSubmit}
        />
      )}
    </div>
  );
}
