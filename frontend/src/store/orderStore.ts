import { create } from 'zustand';
import type {
  Order,
  OrderDetails,
  OrderItem,
  Product,
  PaymentMethod,
  Table,
  OrderFilters,
} from '@/types/order';

interface OrderState {
  // Orders list
  orders: Order[];
  selectedOrder: OrderDetails | null;
  orderFilters: Partial<OrderFilters>;
  
  // UI state
  isLoadingOrders: boolean;
  isLoadingOrderDetails: boolean;
  
  // Data for creating orders
  products: Product[];
  paymentMethods: PaymentMethod[];
  tables: Table[];
  
  // Modal states
  showAddItemModal: boolean;
  showPaymentModal: boolean;
  showDiscountModal: boolean;
  showSplitBillModal: boolean;
  showMergeOrderModal: boolean;
  
  // Selected items for operations
  selectedOrderForMerge: Order | null;
  selectedItemForDiscount: OrderItem | null;
  
  // Actions - Orders
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  removeOrder: (orderId: string) => void;
  setSelectedOrder: (order: OrderDetails | null) => void;
  setOrderFilters: (filters: Partial<OrderFilters>) => void;
  
  // Actions - Order Details
  updateSelectedOrderItem: (itemId: string, updates: Partial<OrderItem>) => void;
  removeSelectedOrderItem: (itemId: string) => void;
  addItemToSelectedOrder: (item: OrderItem) => void;
  
  // Actions - Data
  setProducts: (products: Product[]) => void;
  setPaymentMethods: (methods: PaymentMethod[]) => void;
  setTables: (tables: Table[]) => void;
  
  // Actions - Loading states
  setLoadingOrders: (loading: boolean) => void;
  setLoadingOrderDetails: (loading: boolean) => void;
  
  // Actions - Modals
  openAddItemModal: () => void;
  closeAddItemModal: () => void;
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  openDiscountModal: (item?: OrderItem) => void;
  closeDiscountModal: () => void;
  openSplitBillModal: () => void;
  closeSplitBillModal: () => void;
  openMergeOrderModal: (order?: Order) => void;
  closeMergeOrderModal: () => void;
  
  // Actions - WebSocket updates
  handleOrderCreated: (order: Order) => void;
  handleOrderUpdated: (order: Order) => void;
  handleOrderDeleted: (orderId: string) => void;
  
  // Actions - Reset
  reset: () => void;
}

const initialState = {
  orders: [],
  selectedOrder: null,
  orderFilters: {},
  isLoadingOrders: false,
  isLoadingOrderDetails: false,
  products: [],
  paymentMethods: [],
  tables: [],
  showAddItemModal: false,
  showPaymentModal: false,
  showDiscountModal: false,
  showSplitBillModal: false,
  showMergeOrderModal: false,
  selectedOrderForMerge: null,
  selectedItemForDiscount: null,
};

export const useOrderStore = create<OrderState>((set, get) => ({
  ...initialState,

  // Orders actions
  setOrders: (orders) => set({ orders }),

  addOrder: (order) =>
    set((state) => ({
      orders: [order, ...state.orders],
    })),

  updateOrder: (orderId, updates) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order
      ),
      selectedOrder:
        state.selectedOrder?.id === orderId
          ? { ...state.selectedOrder, ...updates }
          : state.selectedOrder,
    })),

  removeOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((order) => order.id !== orderId),
      selectedOrder: state.selectedOrder?.id === orderId ? null : state.selectedOrder,
    })),

  setSelectedOrder: (order) => set({ selectedOrder: order }),

  setOrderFilters: (filters) =>
    set((state) => ({
      orderFilters: { ...state.orderFilters, ...filters },
    })),

  // Order Details actions
  updateSelectedOrderItem: (itemId, updates) =>
    set((state) => {
      if (!state.selectedOrder) return state;

      return {
        selectedOrder: {
          ...state.selectedOrder,
          items: state.selectedOrder.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        },
      };
    }),

  removeSelectedOrderItem: (itemId) =>
    set((state) => {
      if (!state.selectedOrder) return state;

      return {
        selectedOrder: {
          ...state.selectedOrder,
          items: state.selectedOrder.items.filter((item) => item.id !== itemId),
        },
      };
    }),

  addItemToSelectedOrder: (item) =>
    set((state) => {
      if (!state.selectedOrder) return state;

      return {
        selectedOrder: {
          ...state.selectedOrder,
          items: [...state.selectedOrder.items, item],
        },
      };
    }),

  // Data actions
  setProducts: (products) => set({ products }),
  setPaymentMethods: (methods) => set({ paymentMethods: methods }),
  setTables: (tables) => set({ tables }),

  // Loading states
  setLoadingOrders: (loading) => set({ isLoadingOrders: loading }),
  setLoadingOrderDetails: (loading) => set({ isLoadingOrderDetails: loading }),

  // Modal actions
  openAddItemModal: () => set({ showAddItemModal: true }),
  closeAddItemModal: () => set({ showAddItemModal: false }),

  openPaymentModal: () => set({ showPaymentModal: true }),
  closePaymentModal: () => set({ showPaymentModal: false }),

  openDiscountModal: (item) =>
    set({ showDiscountModal: true, selectedItemForDiscount: item || null }),
  closeDiscountModal: () =>
    set({ showDiscountModal: false, selectedItemForDiscount: null }),

  openSplitBillModal: () => set({ showSplitBillModal: true }),
  closeSplitBillModal: () => set({ showSplitBillModal: false }),

  openMergeOrderModal: (order) =>
    set({ showMergeOrderModal: true, selectedOrderForMerge: order || null }),
  closeMergeOrderModal: () =>
    set({ showMergeOrderModal: false, selectedOrderForMerge: null }),

  // WebSocket update handlers
  handleOrderCreated: (order) => {
    const state = get();
    // Only add if it matches current filters
    const shouldAdd =
      !state.orderFilters.status || order.status === state.orderFilters.status;

    if (shouldAdd) {
      state.addOrder(order);
    }
  },

  handleOrderUpdated: (order) => {
    const state = get();
    state.updateOrder(order.id, order);
  },

  handleOrderDeleted: (orderId) => {
    const state = get();
    state.removeOrder(orderId);
  },

  // Reset
  reset: () => set(initialState),
}));

// Selectors
export const selectOpenOrders = (state: OrderState) =>
  state.orders.filter((order) => order.status === 'pending' || order.status === 'processing');

export const selectPaidOrders = (state: OrderState) =>
  state.orders.filter((order) => order.status === 'paid');

export const selectOrdersByTable = (state: OrderState, tableId: string) =>
  state.orders.filter((order) => order.table_id === tableId && (order.status === 'pending' || order.status === 'processing'));

export const selectOrdersCount = (state: OrderState) => state.orders.length;

export const selectOpenOrdersCount = (state: OrderState) =>
  state.orders.filter((order) => order.status === 'pending' || order.status === 'processing').length;

export const selectTotalRevenue = (state: OrderState) =>
  state.orders
    .filter((order) => order.status === 'paid')
    .reduce((sum, order) => sum + order.grand_total, 0);
