// Order Types
export type OrderStatus = 'pending' | 'processing' | 'paid' | 'void' | 'merged';
export type OrderItemStatus = 'pending' | 'processing' | 'ready' | 'void';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type OrderSource = 'pos' | 'mobile' | 'web' | 'kiosk';

export interface Order {
  id: string;
  store_id: string;
  table_id: string | null;
  order_number: string;
  order_type: OrderType;
  source: OrderSource;
  status: OrderStatus;
  customer_name: string | null;
  customer_phone: string | null;
  guest_count: number | null;
  notes: string | null;
  
  // Financial
  subtotal: number;
  discount_total: number;
  service_charge_total: number;
  tax_total: number;
  rounding: number;
  grand_total: number;
  paid_total: number;
  
  // Complimentary
  is_complimentary: boolean;
  complimentary_amount: number;
  complimentary_reason: string | null;
  complimentary_by: string | null;
  
  // Void
  voided_by: string | null;
  void_reason: string | null;
  
  // Merge
  merged_into_order_id: string | null;
  
  // Split
  is_split: boolean;
  
  // Timestamps
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations (populated)
  table_number?: string;
  table_name?: string;
  created_by_name?: string;
  complimentary_by_name?: string;
  voided_by_name?: string;
  payment_methods?: string; // Comma-separated payment method names
}

// Order Item Types
export interface OrderItemVariant {
  id: string;
  order_item_id: string;
  variant_option_id: string | null;
  group_name: string;
  option_name: string;
  price_adjustment: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  variant_total: number;
  discount_amount: number;
  line_total: number;
  notes: string | null;
  status: OrderItemStatus;
  
  // Complimentary
  is_complimentary: boolean;
  complimentary_reason: string | null;
  complimentary_by: string | null;
  
  // Void
  voided_by: string | null;
  void_reason: string | null;
  
  // Original order (for merged orders)
  original_order_id: string | null;
  original_order_number?: string | null; // From JOIN query (legacy)
  merged_from_order_number?: string | null; // New column - direct storage
  
  created_by: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations
  variants?: OrderItemVariant[];
  current_product_name?: string;
  created_by_name?: string;
  complimentary_by_name?: string;
  category_name?: string;
}

// Discount Types
export type DiscountType = 'percentage' | 'fixed';
export type DiscountStage = 'order' | 'payment';

export interface OrderDiscount {
  id: string;
  order_id: string;
  order_item_id: string | null;
  discount_id: string | null;
  bill_id: string | null;  // NEW: Link to specific bill for split payment promo
  name: string;
  type: DiscountType;
  value: number;
  amount: number;
  applied_stage: DiscountStage;
  approved_by: string | null;
  applied_by: string | null;
  created_at: string;
  
  // Relations
  applied_by_name?: string;
  approved_by_name?: string;
}

// Tax Types
export interface OrderTax {
  id: string;
  order_id: string;
  tax_rule_id: string | null;
  code: string; // 'PB1', 'SC'
  rate: number;
  base_amount: number;
  amount: number;
  created_at: string;
  
  // Relations
  tax_name?: string;
}

// Payment Types
export type PaymentStatus = 'paid' | 'void';

export interface Payment {
  id: string;
  order_id: string;
  bill_id: string | null;
  payment_method_id: string;
  amount: number;
  tendered_amount: number | null;
  change_amount: number;
  reference_no: string | null;
  status: PaymentStatus;
  received_by: string | null;
  voided_by: string | null;
  void_reason: string | null;
  paid_at: string;
  created_at: string;
  
  // Relations
  payment_method_name?: string;
  payment_method_type?: string;
  received_by_name?: string;
}

// Payment Method Types
export interface PaymentMethod {
  id: string;
  store_id: string | null;
  name: string;
  type: string; // 'cash', 'qris', 'debit', 'ewallet', etc.
  is_active: boolean;
  sort_order: number;
}

// Bill Types (for split payment)
export type BillStatus = 'pending' | 'paid';

export interface OrderBill {
  id: string;
  order_id: string;
  bill_number: number;
  label: string | null;
  status: BillStatus;
  subtotal: number;
  discount_total: number;
  service_charge_total: number;
  tax_total: number;
  rounding: number;
  grand_total: number;
  paid_total: number;
  paid_at: string | null;
  paid_total_updated_at: string | null;  // NEW: Track when bill totals were last updated
  created_at: string;
  
  // Relations
  items?: OrderBillItem[];
  payments?: Payment[];
}

export interface OrderBillItem {
  id: string;
  bill_id: string;
  order_item_id: string;
  qty: number;
  unit_price: number;
  line_total: number;
  
  // Relations
  product_name?: string;
}

// Full Order Details
export interface OrderDetails extends Order {
  items: OrderItem[];
  discounts: OrderDiscount[];
  taxes: OrderTax[];
  payments: Payment[];
  bills: OrderBill[];
}

// Product Types (simplified for order)
export interface Product {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  is_available: boolean;
  is_active: boolean;
  category_name?: string;
  variants?: VariantGroup[];
}

export interface VariantGroup {
  id: string;
  product_id: string;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  options: VariantOption[];
}

export interface VariantOption {
  id: string;
  variant_group_id: string;
  name: string;
  price_adjustment: string | number;  // API returns as string
  is_default?: boolean;
  is_active: boolean;
}

export interface ProductWithVariants extends Product {
  variants?: VariantGroup[];
}

// Table Types
export interface Table {
  id: string;
  store_id: string;
  table_number: string;
  name: string;
  capacity: number;
  is_active: boolean;
  qr_url: string | null;
}

// API Request Types
export interface CreateOrderRequest {
  store_id: string;
  table_id?: string;
  order_type?: OrderType;
  source?: OrderSource;
  customer_name?: string;
  customer_phone?: string;
  guest_count?: number;
  notes?: string;
  items?: AddOrderItemRequest[]; // Support creating order with items
}

export interface UpdateOrderRequest {
  table_id?: string;
  order_type?: OrderType;
  customer_name?: string;
  customer_phone?: string;
  guest_count?: number;
  notes?: string;
  status?: OrderStatus;
}

export interface AddOrderItemRequest {
  store_id: string;
  product_id: string;
  qty: number;
  notes?: string;
  variants?: {
    variant_option_id?: string;
    group_name: string;
    option_name: string;
    price_adjustment: number;
  }[];
}

export interface UpdateOrderItemRequest {
  qty?: number;
  notes?: string;
  variants?: {
    variant_option_id?: string;
    group_name: string;
    option_name: string;
    price_adjustment: number;
  }[];
}

export interface ApplyDiscountRequest {
  name: string;
  type: DiscountType;
  value: number;
  applied_stage: DiscountStage;
  order_item_id?: string;
  approved_by?: string;
}

export interface AddPaymentRequest {
  payment_method_id: string;
  amount: number;
  tendered_amount?: number;
  change_amount?: number;
  reference_no?: string;
  bill_id?: string;
}

export interface SetComplimentaryRequest {
  is_complimentary: boolean;
  complimentary_amount?: number;
  complimentary_reason?: string;
}

export interface MergeOrdersRequest {
  target_order_id: string;
  source_order_id: string;
}

export interface SplitBillRequest {
  bills: {
    label?: string;
    items: {
      order_item_id: string;
      qty: number;
    }[];
  }[];
}

// WebSocket Event Types
export type WebSocketEventType =
  | 'connection'
  | 'order_created'
  | 'order_updated'
  | 'order_deleted'
  | 'order_voided'
  | 'order_item_added'
  | 'order_item_updated'
  | 'order_item_deleted'
  | 'order_item_voided'
  | 'order_item_complimentary'
  | 'order_discount_applied'
  | 'order_discount_removed'
  | 'order_payment_added'
  | 'order_payment_voided'
  | 'order_complimentary'
  | 'orders_merged'
  | 'order_split_bills_created'
  | 'error';

export interface WebSocketMessage {
  type: WebSocketEventType;
  message?: string;
  data?: any;
  store_id?: string;
  client_id?: string;
}

// Filter Types
export interface OrderFilters {
  store_id: string;
  status?: OrderStatus;
  order_type?: OrderType;
  table_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// Pagination Types
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
}

export interface ApiError {
  success: false;
  message: string;
}
