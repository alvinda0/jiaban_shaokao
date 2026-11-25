import api from '@/utils/axios';
import type {
  ApiResponse,
  Order,
  OrderDetails,
  OrderFilters,
  CreateOrderRequest,
  UpdateOrderRequest,
  AddOrderItemRequest,
  UpdateOrderItemRequest,
  ApplyDiscountRequest,
  AddPaymentRequest,
  SetComplimentaryRequest,
  MergeOrdersRequest,
  SplitBillRequest,
  OrderItem,
  OrderDiscount,
  Payment,
  OrderBill,
  PaymentMethod,
  Product,
  ProductWithVariants,
  Table,
} from '@/types/order';

// ==================== ORDER CRUD ====================

// Get all orders with filters (Public)
export const getOrders = async (filters: OrderFilters): Promise<ApiResponse<Order[]>> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  
  const res = await api.get<ApiResponse<Order[]>>(`/orders?${params.toString()}`);
  return res.data;
};

// Get all orders (Protected - for admin)
export const getOrdersAdmin = async (
  storeId: string,
  filters?: Omit<OrderFilters, 'store_id'>
): Promise<ApiResponse<Order[]>> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }
  
  const res = await api.get<ApiResponse<Order[]>>(
    `/stores/${storeId}/orders?${params.toString()}`
  );
  return res.data;
};

// Get single order (Public)
export const getOrder = async (orderId: string, storeId: string): Promise<ApiResponse<Order>> => {
  const res = await api.get<ApiResponse<Order>>(`/orders/${orderId}?store_id=${storeId}`);
  return res.data;
};

// Get full order details (Public)
export const getOrderDetails = async (orderId: string): Promise<ApiResponse<OrderDetails>> => {
  const res = await api.get<ApiResponse<OrderDetails>>(`/orders/${orderId}/details`);
  return res.data;
};

// Get full order details (Protected)
export const getOrderDetailsAdmin = async (
  storeId: string,
  orderId: string
): Promise<ApiResponse<OrderDetails>> => {
  const res = await api.get<ApiResponse<OrderDetails>>(
    `/stores/${storeId}/orders/${orderId}/details`
  );
  return res.data;
};

// Create order (Public)
export const createOrder = async (data: CreateOrderRequest): Promise<ApiResponse<Order>> => {
  const res = await api.post<ApiResponse<Order>>('/orders', data);
  return res.data;
};

// Create order (Protected)
export const createOrderAdmin = async (
  storeId: string,
  data: Omit<CreateOrderRequest, 'store_id'>
): Promise<ApiResponse<Order>> => {
  const res = await api.post<ApiResponse<Order>>(`/stores/${storeId}/orders`, data);
  return res.data;
};

// Update order (Protected)
export const updateOrder = async (
  storeId: string,
  orderId: string,
  data: UpdateOrderRequest
): Promise<ApiResponse<Order>> => {
  const res = await api.put<ApiResponse<Order>>(`/stores/${storeId}/orders/${orderId}`, data);
  return res.data;
};

// Delete order (Protected)
export const deleteOrder = async (storeId: string, orderId: string): Promise<ApiResponse<null>> => {
  const res = await api.delete<ApiResponse<null>>(`/stores/${storeId}/orders/${orderId}`);
  return res.data;
};

// Void order (Protected)
export const voidOrder = async (
  storeId: string,
  orderId: string,
  voidReason: string
): Promise<ApiResponse<Order>> => {
  const res = await api.post<ApiResponse<Order>>(`/stores/${storeId}/orders/${orderId}/void`, {
    void_reason: voidReason,
  });
  return res.data;
};

// Update order status (Protected)
export const updateOrderStatus = async (
  storeId: string,
  orderId: string,
  status: 'pending' | 'processing' | 'paid' | 'void' | 'merged'
): Promise<ApiResponse<Order>> => {
  const res = await api.patch<ApiResponse<Order>>(`/stores/${storeId}/orders/${orderId}/status`, {
    status,
  });
  return res.data;
};

// Accept order and get details for kitchen printing (Protected)
export const acceptOrder = async (
  storeId: string,
  orderId: string
): Promise<ApiResponse<OrderDetails>> => {
  const res = await api.post<ApiResponse<OrderDetails>>(
    `/stores/${storeId}/orders/${orderId}/accept`
  );
  return res.data;
};

// ==================== ORDER ITEMS ====================

// Add item to order (Public)
export const addOrderItem = async (
  orderId: string,
  data: AddOrderItemRequest
): Promise<ApiResponse<OrderItem>> => {
  const res = await api.post<ApiResponse<OrderItem>>(`/orders/${orderId}/items`, data);
  return res.data;
};

// Add item to order (Protected)
export const addOrderItemAdmin = async (
  storeId: string,
  orderId: string,
  data: Omit<AddOrderItemRequest, 'store_id'>
): Promise<ApiResponse<OrderItem>> => {
  const res = await api.post<ApiResponse<OrderItem>>(
    `/stores/${storeId}/orders/${orderId}/items`,
    data
  );
  return res.data;
};

// Add multiple items to order in batch (Protected)
export const addOrderItemsAdminBatch = async (
  storeId: string,
  orderId: string,
  items: Array<{
    product_id: string;
    qty: number;
    notes?: string;
    variant_id?: string;
  }>
): Promise<ApiResponse<OrderItem[]>> => {
  const requestBody = {
    store_id: storeId,
    items: items.map(item => ({
      product_id: item.product_id,
      qty: item.qty,
      notes: item.notes || null,
      variant_id: item.variant_id || null,
    })),
  };
  
  console.log('📤 Batch request body:', JSON.stringify(requestBody, null, 2));
  
  const res = await api.post<ApiResponse<OrderItem[]>>(
    `/stores/${storeId}/orders/${orderId}/items`,
    requestBody
  );
  return res.data;
};

// Update order item (Public)
export const updateOrderItem = async (
  orderId: string,
  itemId: string,
  data: UpdateOrderItemRequest
): Promise<ApiResponse<OrderItem>> => {
  const res = await api.put<ApiResponse<OrderItem>>(`/orders/${orderId}/items/${itemId}`, data);
  return res.data;
};

// Update order item (Protected)
export const updateOrderItemAdmin = async (
  storeId: string,
  orderId: string,
  itemId: string,
  data: UpdateOrderItemRequest
): Promise<ApiResponse<OrderItem>> => {
  const res = await api.put<ApiResponse<OrderItem>>(
    `/stores/${storeId}/orders/${orderId}/items/${itemId}`,
    data
  );
  return res.data;
};

// Delete order item (Public)
export const deleteOrderItem = async (orderId: string, itemId: string): Promise<ApiResponse<null>> => {
  const res = await api.delete<ApiResponse<null>>(`/orders/${orderId}/items/${itemId}`);
  return res.data;
};

// Delete order item (Protected)
export const deleteOrderItemAdmin = async (
  storeId: string,
  orderId: string,
  itemId: string
): Promise<ApiResponse<null>> => {
  const res = await api.delete<ApiResponse<null>>(
    `/stores/${storeId}/orders/${orderId}/items/${itemId}`
  );
  return res.data;
};

// Void order item (Protected)
export const voidOrderItem = async (
  storeId: string,
  orderId: string,
  itemId: string,
  voidReason: string
): Promise<ApiResponse<OrderItem>> => {
  const res = await api.post<ApiResponse<OrderItem>>(
    `/stores/${storeId}/orders/${orderId}/items/${itemId}/void`,
    { void_reason: voidReason }
  );
  return res.data;
};

// Set item as complimentary (Protected)
export const setItemComplimentary = async (
  storeId: string,
  orderId: string,
  itemId: string,
  data: SetComplimentaryRequest
): Promise<ApiResponse<OrderItem>> => {
  const res = await api.post<ApiResponse<OrderItem>>(
    `/stores/${storeId}/orders/${orderId}/items/${itemId}/complimentary`,
    data
  );
  return res.data;
};

// Update order item status (Protected)
export const updateOrderItemStatus = async (
  storeId: string,
  orderId: string,
  itemId: string,
  status: 'pending' | 'processing' | 'ready' | 'void'
): Promise<ApiResponse<OrderItem>> => {
  const res = await api.patch<ApiResponse<OrderItem>>(
    `/stores/${storeId}/orders/${orderId}/items/${itemId}/status`,
    { status }
  );
  return res.data;
};

// ==================== DISCOUNTS ====================

// Apply discount (Protected)
export const applyDiscount = async (
  storeId: string,
  orderId: string,
  data: ApplyDiscountRequest
): Promise<ApiResponse<OrderDiscount[]>> => {
  const res = await api.post<ApiResponse<OrderDiscount[]>>(
    `/stores/${storeId}/orders/${orderId}/discounts`,
    data
  );
  return res.data;
};

// Remove discount (Protected)
export const removeDiscount = async (
  storeId: string,
  orderId: string,
  discountId: string
): Promise<ApiResponse<OrderDiscount[]>> => {
  const res = await api.delete<ApiResponse<OrderDiscount[]>>(
    `/stores/${storeId}/orders/${orderId}/discounts/${discountId}`
  );
  return res.data;
};

// ==================== PAYMENTS ====================

// Add payment (Protected)
export const addPayment = async (
  storeId: string,
  orderId: string,
  data: AddPaymentRequest
): Promise<ApiResponse<Payment[]>> => {
  const res = await api.post<ApiResponse<Payment[]>>(
    `/stores/${storeId}/orders/${orderId}/payments`,
    data
  );
  return res.data;
};

// Void payment (Protected)
export const voidPayment = async (
  storeId: string,
  orderId: string,
  paymentId: string,
  voidReason: string
): Promise<ApiResponse<null>> => {
  const res = await api.post<ApiResponse<null>>(
    `/stores/${storeId}/orders/${orderId}/payments/${paymentId}/void`,
    { void_reason: voidReason }
  );
  return res.data;
};

// Get payment methods
export const getPaymentMethods = async (storeId: string): Promise<ApiResponse<PaymentMethod[]>> => {
  const res = await api.get<ApiResponse<PaymentMethod[]>>(`/stores/${storeId}/payment-methods`);
  return res.data;
};

// ==================== COMPLEMENT ====================

// Set order as complimentary (Protected)
export const setOrderComplimentary = async (
  storeId: string,
  orderId: string,
  data: SetComplimentaryRequest
): Promise<ApiResponse<Order>> => {
  const res = await api.post<ApiResponse<Order>>(
    `/stores/${storeId}/orders/${orderId}/complimentary`,
    data
  );
  return res.data;
};

// ==================== MERGE ORDERS ====================

// Merge orders (Protected)
export const mergeOrders = async (
  storeId: string,
  data: MergeOrdersRequest
): Promise<ApiResponse<OrderDetails>> => {
  const res = await api.post<ApiResponse<OrderDetails>>(`/stores/${storeId}/orders/merge`, data);
  return res.data;
};

// ==================== SPLIT PAYMENT ====================

// Create split bills (Protected)
export const createSplitBills = async (
  storeId: string,
  orderId: string,
  data: SplitBillRequest
): Promise<ApiResponse<OrderBill[]>> => {
  const res = await api.post<ApiResponse<OrderBill[]>>(
    `/stores/${storeId}/orders/${orderId}/split-bills`,
    data
  );
  return res.data;
};

// Get order bills (Public)
export const getOrderBills = async (orderId: string): Promise<ApiResponse<OrderBill[]>> => {
  const res = await api.get<ApiResponse<OrderBill[]>>(`/orders/${orderId}/bills`);
  return res.data;
};

// Get order bills (Protected)
export const getOrderBillsAdmin = async (
  storeId: string,
  orderId: string
): Promise<ApiResponse<OrderBill[]>> => {
  const res = await api.get<ApiResponse<OrderBill[]>>(`/stores/${storeId}/orders/${orderId}/bills`);
  return res.data;
};

// ==================== HELPER SERVICES ====================

// Get products for ordering (Public)
export const getProductsForOrder = async (storeId: string): Promise<ApiResponse<Product[]>> => {
  const res = await api.get<ApiResponse<Product[]>>(`/products?store_id=${storeId}`);
  return res.data;
};

// Get product with variants (for adding to order)
export const getProductWithVariants = async (
  storeId: string,
  productId: string
): Promise<ApiResponse<ProductWithVariants>> => {
  const res = await api.get<ApiResponse<ProductWithVariants>>(
    `/stores/${storeId}/products/${productId}`
  );
  return res.data;
};

// Get tables (for order creation)
export const getTables = async (storeId: string): Promise<ApiResponse<Table[]>> => {
  const res = await api.get<ApiResponse<Table[]>>(`/stores/${storeId}/tables`);
  return res.data;
};

// ==================== WEBSOCKET URL ====================

export const getWebSocketUrl = (storeId: string, userId?: string): string => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const wsUrl = baseUrl.replace('http', 'ws');
  const params = new URLSearchParams({ store_id: storeId });
  if (userId) {
    params.append('user_id', userId);
  }
  return `${wsUrl}/ws/orders?${params.toString()}`;
};


// Split bill
export const splitBill = async (storeId: string, orderId: string, data: {
  splits: Array<{
    id: string;
    label: string;
    item_ids: string[];
    amount: number;
  }>;
  split_by: 'item' | 'amount';
}) => {
  return api.post(`/stores/${storeId}/orders/${orderId}/split-bill`, data);
};

// Get sales report
export const getSalesReport = async (
  storeId: string,
  filters: {
    date_from: string;
    date_to: string;
    time_from?: string;
    time_to?: string;
  }
): Promise<ApiResponse<any>> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  
  const res = await api.get<ApiResponse<any>>(`/stores/${storeId}/sales/report?${params.toString()}`);
  return res.data;
};
