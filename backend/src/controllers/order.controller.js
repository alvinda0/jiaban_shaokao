const OrderService = require('../services/order.service');
const { success, error } = require('../utils/response');
const { pool } = require('../config/db');

// ==================== ORDER CRUD ====================

// Get all orders (with filters and pagination)
const getAllOrders = async (req, res) => {
  try {
    // For protected routes, use storeId from params
    // For public routes, use store_id from query
    const store_id = req.params.storeId || req.query.store_id;
    const { status, order_type, table_id, date_from, date_to, page, limit } = req.query;

    if (!store_id) {
      return error(res, 'store_id is required', 400);
    }

    const filters = {
      status,
      order_type,
      table_id,
      date_from,
      date_to,
      page: page || 1,
      limit: limit || 20,
    };

    const result = await OrderService.getAllOrders(store_id, filters);
    return success(res, result.data, 'Orders retrieved successfully', 200, result.pagination);
  } catch (err) {
    console.error('Get orders error:', err);
    return error(res, 'Failed to fetch orders', 500);
  }
};

// Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const { store_id } = req.query;

    const order = await OrderService.getOrderById(id, store_id);

    if (!order) {
      return error(res, 'Order not found', 404);
    }

    return success(res, order, 'Order retrieved successfully');
  } catch (err) {
    console.error('Get order error:', err);
    return error(res, 'Failed to fetch order', 500);
  }
};

// Get full order details with items, taxes, discounts, payments
const getFullOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await OrderService.getFullOrderDetails(id);

    if (!order) {
      return error(res, 'Order not found', 404);
    }

    return success(res, order, 'Order details retrieved successfully');
  } catch (err) {
    console.error('Get order details error:', err);
    return error(res, 'Failed to fetch order details', 500);
  }
};

// Create new order
const createOrder = async (req, res) => {
  try {
    // For protected routes, use storeId from params
    // For public routes, use store_id from body
    const store_id = req.params.storeId || req.body.store_id;
    const { 
      table_id, 
      order_type, 
      source, 
      customer_name,
      customer_phone, // No WhatsApp (optional)
      guest_count, 
      notes,
      voucher_code, // Voucher code for discount
      items // Array of items to add: [{ product_id, qty, variants, notes }]
    } = req.body;
    const created_by = req.user?.id;
    
    console.log('🔍 ===== CREATE ORDER REQUEST =====');
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📦 Items:', items ? JSON.stringify(items, null, 2) : 'NONE');
    console.log('🔍 ==================================');

    if (!store_id) {
      return error(res, 'store_id is required', 400);
    }

    // Validate table_id required for dine_in
    if (order_type === 'dine_in' && !table_id) {
      return error(res, 'table_id is required for dine_in orders', 400);
    }

    // Validate items if provided
    if (items && (!Array.isArray(items) || items.length === 0)) {
      return error(res, 'items must be a non-empty array', 400);
    }

    // Validate each item has product_id and check stock
    if (items) {
      for (const item of items) {
        if (!item.product_id) {
          return error(res, 'Each item must have product_id', 400);
        }
        if (!item.qty || item.qty < 1) {
          return error(res, 'Each item must have qty >= 1', 400);
        }

        // Check product stock BEFORE creating order
        const product = await require('../models/product.model').findById(item.product_id);
        if (!product) {
          return error(res, `Product not found: ${item.product_id}`, 404);
        }

        // If product tracks stock and stock is 0 or negative, reject order
        if (product.track_stock && parseFloat(product.stock_qty) <= 0) {
          return error(res, `Product "${product.name}" is out of stock`, 400);
        }

        // If stock is less than requested qty
        if (product.track_stock && parseFloat(product.stock_qty) < item.qty) {
          return error(res, `Insufficient stock for "${product.name}". Available: ${product.stock_qty}, Requested: ${item.qty}`, 400);
        }
      }
    }

    // Create order
    const order = await OrderService.createOrder({
      store_id,
      table_id,
      order_type: order_type || 'dine_in',
      source: source || 'pos',
      customer_name,
      customer_phone,
      guest_count,
      notes,
      voucher_code, // Pass voucher code to service
      created_by,
    });

    // Add items if provided
    if (items && items.length > 0) {
      for (const itemData of items) {
        await OrderService.addOrderItem(order.id, {
          ...itemData,
          created_by,
        }, store_id);
      }
    }

    // Get full order details with items
    const fullOrder = await OrderService.getFullOrderDetails(order.id);

    // Broadcast via WebSocket if available
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_created',
        data: fullOrder,
      });
    }

    return success(res, fullOrder, 'Order created successfully', 201);
  } catch (err) {
    console.error('Create order error:', err);
    return error(res, err.message || 'Failed to create order', 500);
  }
};

// Update order basic info
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { store_id } = req.query;
    const { table_id, order_type, customer_name, guest_count, notes, status } = req.body;

    const order = await OrderService.updateOrder(
      id,
      { table_id, order_type, customer_name, guest_count, notes, status },
      store_id
    );

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_updated',
        data: order,
      });
    }

    return success(res, order, 'Order updated successfully');
  } catch (err) {
    console.error('Update order error:', err);

    if (err.message === 'Order not found') {
      return error(res, err.message, 404);
    }

    return error(res, err.message || 'Failed to update order', 500);
  }
};

// Delete order
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { store_id } = req.query;

    await OrderService.deleteOrder(id, store_id);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_deleted',
        data: { order_id: id },
      });
    }

    return success(res, null, 'Order deleted successfully');
  } catch (err) {
    console.error('Delete order error:', err);

    if (err.message === 'Order not found') {
      return error(res, err.message, 404);
    }

    if (err.message.includes('Cannot delete')) {
      return error(res, err.message, 400);
    }

    return error(res, err.message || 'Failed to delete order', 500);
  }
};

// Void order
const voidOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { store_id, void_reason } = req.body;
    const voided_by = req.user?.id;

    const order = await OrderService.voidOrder(id, voided_by, void_reason, store_id);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_voided',
        data: order,
      });
    }

    return success(res, order, 'Order voided successfully');
  } catch (err) {
    console.error('Void order error:', err);

    if (err.message === 'Order not found') {
      return error(res, err.message, 404);
    }

    return error(res, err.message || 'Failed to void order', 500);
  }
};

// Accept order (mark as accepted)
const acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { store_id } = req.query;
    const accepted_by = req.user?.id;

    const order = await OrderService.acceptOrder(id, accepted_by, store_id);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_accepted',
        data: order,
      });
    }

    return success(res, order, 'Order accepted successfully');
  } catch (err) {
    console.error('Accept order error:', err);

    if (err.message === 'Order not found') {
      return error(res, err.message, 404);
    }

    return error(res, err.message || 'Failed to accept order', 500);
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated_by = req.user?.id;

    // Validate status
    const validStatuses = ['pending', 'processing', 'paid', 'void', 'merged'];
    if (!status || !validStatuses.includes(status)) {
      return error(res, `Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const order = await OrderService.updateOrderStatus(id, status, updated_by);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_status_updated',
        data: order,
      });
    }

    return success(res, order, 'Order status updated successfully');
  } catch (err) {
    console.error('Update order status error:', err);

    if (err.message === 'Order not found') {
      return error(res, err.message, 404);
    }

    return error(res, err.message || 'Failed to update order status', 500);
  }
};

// ==================== ORDER ITEMS ====================

// Add item to order
const addOrderItem = async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { store_id, product_id, qty, notes, variants, items } = req.body;
    const created_by = req.user?.id;

    // Handle batch items (new format with "items" array)
    if (items && Array.isArray(items) && items.length > 0) {
      console.log('📦 [BATCH ADD ITEMS] Received batch request for order:', order_id);
      console.log('📦 [BATCH ADD ITEMS] Store ID:', store_id);
      console.log('📦 [BATCH ADD ITEMS] Items count:', items.length);
      console.log('📦 [BATCH ADD ITEMS] Items data:', JSON.stringify(items, null, 2));
      
      // Validate stock for all items first
      const ProductModel = require('../models/product.model');
      for (const itemData of items) {
        const product = await ProductModel.findById(itemData.product_id);
        if (!product) {
          return error(res, `Product not found: ${itemData.product_id}`, 404);
        }
        
        // Check stock if product tracks stock
        if (product.track_stock && parseFloat(product.stock_qty) <= 0) {
          return error(res, `Product "${product.name}" is out of stock`, 400);
        }
        
        if (product.track_stock && parseFloat(product.stock_qty) < itemData.qty) {
          return error(res, `Insufficient stock for "${product.name}". Available: ${product.stock_qty}, Requested: ${itemData.qty}`, 400);
        }
      }
      
      const addedItems = [];
      
      for (const itemData of items) {
        // Transform single variant_id to variants array format
        let variantsArray = null;
        if (itemData.variant_id) {
          // Fetch variant details to get group_name
          const variantQuery = `
            SELECT vo.id as option_id, vg.id as group_id, vg.name as group_name
            FROM variant_options vo
            JOIN variant_groups vg ON vo.variant_group_id = vg.id
            WHERE vo.id = $1
          `;
          const variantResult = await pool.query(variantQuery, [itemData.variant_id]);
          
          if (variantResult.rows.length > 0) {
            const variantData = variantResult.rows[0];
            variantsArray = [{
              group_id: variantData.group_id,
              option_id: variantData.option_id
            }];
          }
        }

        const item = await OrderService.addOrderItem(
          order_id,
          { 
            product_id: itemData.product_id, 
            qty: itemData.qty, 
            notes: itemData.notes || null,
            variants: variantsArray,
            created_by 
          },
          store_id
        );
        addedItems.push(item);
      }

      // Broadcast via WebSocket
      if (global.wss) {
        global.wss.broadcast({
          type: 'order_items_added_batch',
          data: { order_id, items: addedItems },
        });
      }

      console.log('✅ [BATCH ADD ITEMS] Successfully added', addedItems.length, 'items');
      return success(res, addedItems, 'Items added successfully', 201);
    }

    // Handle single item (legacy format)
    // Validate stock before adding
    if (product_id) {
      const ProductModel = require('../models/product.model');
      const product = await ProductModel.findById(product_id);
      
      if (!product) {
        return error(res, `Product not found: ${product_id}`, 404);
      }
      
      // Check stock if product tracks stock
      if (product.track_stock && parseFloat(product.stock_qty) <= 0) {
        return error(res, `Product "${product.name}" is out of stock`, 400);
      }
      
      if (product.track_stock && parseFloat(product.stock_qty) < qty) {
        return error(res, `Insufficient stock for "${product.name}". Available: ${product.stock_qty}, Requested: ${qty}`, 400);
      }
    }

    const item = await OrderService.addOrderItem(
      order_id,
      { product_id, qty, notes, variants, created_by },
      store_id
    );

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_item_added',
        data: { order_id, item },
      });
    }

    return success(res, item, 'Item added successfully', 201);
  } catch (err) {
    console.error('Add item error:', err);

    if (err.message.includes('not found')) {
      return error(res, err.message, 404);
    }

    if (err.message.includes('Cannot add')) {
      return error(res, err.message, 400);
    }

    return error(res, err.message || 'Failed to add item', 500);
  }
};

// Update order item
const updateOrderItem = async (req, res) => {
  try {
    const { item_id } = req.params;
    const { qty, notes, variants } = req.body;

    const item = await OrderService.updateOrderItem(item_id, { qty, notes, variants });

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_item_updated',
        data: item,
      });
    }

    return success(res, item, 'Item updated successfully');
  } catch (err) {
    console.error('Update item error:', err);

    if (err.message.includes('not found')) {
      return error(res, err.message, 404);
    }

    if (err.message.includes('Cannot update')) {
      return error(res, err.message, 400);
    }

    return error(res, err.message || 'Failed to update item', 500);
  }
};

// Delete order item
const deleteOrderItem = async (req, res) => {
  try {
    const { item_id } = req.params;

    await OrderService.deleteOrderItem(item_id);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_item_deleted',
        data: { item_id },
      });
    }

    return success(res, null, 'Item deleted successfully');
  } catch (err) {
    console.error('Delete item error:', err);

    if (err.message.includes('not found')) {
      return error(res, err.message, 404);
    }

    if (err.message.includes('Cannot delete')) {
      return error(res, err.message, 400);
    }

    return error(res, err.message || 'Failed to delete item', 500);
  }
};

// Void order item
const voidOrderItem = async (req, res) => {
  try {
    const { item_id } = req.params;
    const { void_reason } = req.body;
    const voided_by = req.user?.id;

    const item = await OrderService.voidOrderItem(item_id, voided_by, void_reason);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_item_voided',
        data: item,
      });
    }

    return success(res, item, 'Item voided successfully');
  } catch (err) {
    console.error('Void item error:', err);

    if (err.message.includes('not found')) {
      return error(res, err.message, 404);
    }

    return error(res, err.message || 'Failed to void item', 500);
  }
};

// Set item as complimentary
const setItemComplimentary = async (req, res) => {
  try {
    const { item_id } = req.params;
    const { is_complimentary, complimentary_reason } = req.body;
    const complimentary_by = req.user?.id;

    const item = await OrderService.setItemComplimentary(item_id, {
      is_complimentary,
      complimentary_reason,
      complimentary_by,
    });

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_item_complimentary',
        data: item,
      });
    }

    return success(res, item, 'Item complimentary status updated');
  } catch (err) {
    console.error('Set item complimentary error:', err);

    if (err.message.includes('not found')) {
      return error(res, err.message, 404);
    }

    return error(res, err.message || 'Failed to update item', 500);
  }
};

// Update order item status
const updateOrderItemStatus = async (req, res) => {
  try {
    const { item_id } = req.params;
    const { status } = req.body;
    const updated_by = req.user?.id;

    // Validate status
    const validStatuses = ['pending', 'processing', 'ready', 'void'];
    if (!status || !validStatuses.includes(status)) {
      return error(res, `Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const item = await OrderService.updateOrderItemStatus(item_id, status, updated_by);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_item_status_updated',
        data: item,
      });
    }

    return success(res, item, 'Item status updated successfully');
  } catch (err) {
    console.error('Update item status error:', err);

    if (err.message.includes('not found')) {
      return error(res, err.message, 404);
    }

    return error(res, err.message || 'Failed to update item status', 500);
  }
};

// ==================== DISCOUNTS ====================

// Apply discount to order
const applyDiscount = async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { name, type, value, applied_stage, order_item_id, approved_by } = req.body;
    const applied_by = req.user?.id;

    const discounts = await OrderService.applyDiscount(order_id, {
      name,
      type,
      value,
      applied_stage: applied_stage || 'order',
      order_item_id,
      applied_by,
      approved_by,
    });

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_discount_applied',
        data: { order_id, discounts },
      });
    }

    return success(res, discounts, 'Discount applied successfully');
  } catch (err) {
    console.error('Apply discount error:', err);

    if (err.message.includes('not found')) {
      return error(res, err.message, 404);
    }

    if (err.message.includes('required') || err.message.includes('must be')) {
      return error(res, err.message, 400);
    }

    return error(res, err.message || 'Failed to apply discount', 500);
  }
};

// Remove discount
const removeDiscount = async (req, res) => {
  try {
    const { id: order_id, discount_id } = req.params;

    const discounts = await OrderService.removeDiscount(discount_id, order_id);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_discount_removed',
        data: { order_id, discounts },
      });
    }

    return success(res, discounts, 'Discount removed successfully');
  } catch (err) {
    console.error('Remove discount error:', err);
    return error(res, err.message || 'Failed to remove discount', 500);
  }
};

// ==================== PAYMENTS ====================

// Add payment to order
const addPayment = async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { payment_method_id, amount, tendered_amount, change_amount, reference_no, bill_id, voucher_code } = req.body;
    const received_by = req.user?.id;

    console.log('🎯 Controller received payment data:', { payment_method_id, amount, voucher_code });

    const payments = await OrderService.addPayment(order_id, {
      payment_method_id,
      amount,
      tendered_amount,
      change_amount,
      reference_no,
      received_by,
      bill_id,
      voucher_code,
    });

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_payment_added',
        data: { order_id, payments },
      });
    }

    return success(res, payments, 'Payment added successfully', 201);
  } catch (err) {
    console.error('Add payment error:', err);

    if (err.message.includes('not found')) {
      return error(res, err.message, 404);
    }

    if (err.message.includes('already paid') || err.message.includes('Cannot add')) {
      return error(res, err.message, 400);
    }

    return error(res, err.message || 'Failed to add payment', 500);
  }
};

// Void payment
const voidPayment = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { void_reason } = req.body;
    const voided_by = req.user?.id;

    await OrderService.voidPayment(payment_id, voided_by, void_reason);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_payment_voided',
        data: { payment_id },
      });
    }

    return success(res, null, 'Payment voided successfully');
  } catch (err) {
    console.error('Void payment error:', err);
    return error(res, err.message || 'Failed to void payment', 500);
  }
};

// ==================== COMPLEMENT ====================

// Set order as complimentary
const setOrderComplimentary = async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { is_complimentary, complimentary_amount, complimentary_reason } = req.body;
    const complimentary_by = req.user?.id;

    const order = await OrderService.setOrderComplimentary(order_id, {
      is_complimentary,
      complimentary_amount,
      complimentary_reason,
      complimentary_by,
    });

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_complimentary',
        data: order,
      });
    }

    return success(res, order, 'Order complimentary status updated');
  } catch (err) {
    console.error('Set order complimentary error:', err);

    if (err.message === 'Order not found') {
      return error(res, err.message, 404);
    }

    return error(res, err.message || 'Failed to update order', 500);
  }
};

// ==================== MERGE ORDERS ====================

// Transfer order to another table
const transferTable = async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { new_table_id } = req.body;
    const transferred_by = req.user?.id;

    if (!new_table_id) {
      return error(res, 'new_table_id is required', 400);
    }

    const order = await OrderService.transferTable(order_id, new_table_id, transferred_by);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_table_transferred',
        data: order,
      });
    }

    return success(res, order, 'Order transferred to new table successfully');
  } catch (err) {
    console.error('Transfer table error:', err);

    if (err.message.includes('not found')) {
      return error(res, err.message, 404);
    }

    if (err.message.includes('Cannot transfer') || err.message.includes('already has')) {
      return error(res, err.message, 400);
    }

    return error(res, err.message || 'Failed to transfer table', 500);
  }
};

// Merge two orders
const mergeOrders = async (req, res) => {
  try {
    const { target_order_id, source_order_id } = req.body;
    const merged_by = req.user?.id;

    if (!target_order_id || !source_order_id) {
      return error(res, 'target_order_id and source_order_id are required', 400);
    }

    const order = await OrderService.mergeOrders(target_order_id, source_order_id, merged_by);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'orders_merged',
        data: { target_order_id, source_order_id, order },
      });
    }

    return success(res, order, 'Orders merged successfully');
  } catch (err) {
    console.error('Merge orders error:', err);

    if (err.message.includes('not found')) {
      return error(res, err.message, 404);
    }

    if (err.message.includes('Can only') || err.message.includes('Cannot merge')) {
      return error(res, err.message, 400);
    }

    return error(res, err.message || 'Failed to merge orders', 500);
  }
};

// ==================== SPLIT PAYMENT ====================

// Create bills for split payment
const createSplitBills = async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { bills } = req.body;

    if (!bills || !Array.isArray(bills) || bills.length === 0) {
      return error(res, 'bills array is required', 400);
    }

    const createdBills = await OrderService.createSplitBills(order_id, bills);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'order_split_bills_created',
        data: { order_id, bills: createdBills },
      });
    }

    return success(res, createdBills, 'Split bills created successfully', 201);
  } catch (err) {
    console.error('Create split bills error:', err);

    if (err.message === 'Order not found') {
      return error(res, err.message, 404);
    }

    if (err.message.includes('Can only')) {
      return error(res, err.message, 400);
    }

    return error(res, err.message || 'Failed to create split bills', 500);
  }
};

// Get bills with details
const getOrderBills = async (req, res) => {
  try {
    const { id: order_id } = req.params;

    const bills = await OrderService.getOrderBillsWithDetails(order_id);
    
    // Transform bills to match frontend expectations
    const transformedBills = bills.map(bill => {
      const parseNum = (val) => {
        if (typeof val === 'number') return parseInt(val);
        if (typeof val === 'string') return parseInt(val);
        return 0;
      };
      
      return {
        ...bill,
        subtotal: parseNum(bill.subtotal),
        discount_total: parseNum(bill.discount_total),
        discount_amount: parseNum(bill.discount_amount || bill.discount_total),
        service_charge_total: parseNum(bill.service_charge_total),
        service_charge_amount: parseNum(bill.service_charge_amount || bill.service_charge_total),
        tax_total: parseNum(bill.tax_total),
        tax_amount: parseNum(bill.tax_amount || bill.tax_total),
        grand_total: parseNum(bill.grand_total),
        amount: parseNum(bill.grand_total || bill.amount),
        paid_amount: parseNum(bill.paid_amount || bill.paid_total || 0),
        paid_total: parseNum(bill.paid_amount || bill.paid_total || 0),
        items: bill.items.map(item => ({
          order_detail_id: item.order_item_id,
          quantity: parseNum(item.qty),
          unit_price: parseNum(item.unit_price || item.calculated_unit_price || 0),
          total_price: parseNum(item.amount),
        })),
        payments: bill.payments ? bill.payments.map(p => ({
          id: p.id,
          payment_method_name: p.payment_method_name,
          payment_method_type: p.payment_method_type,
          amount: parseNum(p.amount),
          tendered_amount: p.tendered_amount ? parseNum(p.tendered_amount) : null,
          change_amount: p.change_amount ? parseNum(p.change_amount) : null,
          paid_at: p.paid_at,
        })) : [],
      };
    });

    return success(res, transformedBills, 'Bills retrieved successfully');
  } catch (err) {
    console.error('Get bills error:', err);
    return error(res, 'Failed to fetch bills', 500);
  }
};

// Split bill
const splitBill = async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { splits, split_by } = req.body; // splits: [{ item_ids: [], amount: 0, label: '' }], split_by: 'item' | 'amount'

    if (!splits || !Array.isArray(splits) || splits.length < 2) {
      return error(res, 'At least 2 splits required', 400);
    }

    if (!['item', 'amount'].includes(split_by)) {
      return error(res, 'split_by must be either "item" or "amount"', 400);
    }

    const bills = await OrderService.splitBill(order_id, splits, split_by);

    // Broadcast via WebSocket
    if (global.wss) {
      global.wss.broadcast({
        type: 'bill_split',
        data: { order_id, bills },
      });
    }

    return success(res, bills, `Bill split into ${bills.length} parts`);
  } catch (err) {
    console.error('Split bill error:', err);

    if (err.message.includes('not found')) {
      return error(res, err.message, 404);
    }

    if (err.message.includes('Can only split')) {
      return error(res, err.message, 400);
    }

    return error(res, err.message || 'Failed to split bill', 500);
  }
};

// ==================== STATISTICS ====================

// Get today's order statistics
const getTodayStatistics = async (req, res) => {
  try {
    const store_id = req.params.storeId || req.query.store_id;

    if (!store_id) {
      return error(res, 'store_id is required', 400);
    }

    const stats = await OrderService.getTodayStatistics(store_id);
    
    console.log('📊 Statistics Response:', JSON.stringify(stats, null, 2));

    return success(res, stats, 'Statistics retrieved successfully');
  } catch (err) {
    console.error('Get statistics error:', err);
    return error(res, 'Failed to fetch statistics', 500);
  }
};

module.exports = {
  // Order CRUD
  getAllOrders,
  getOrderById,
  getFullOrderDetails,
  createOrder,
  updateOrder,
  deleteOrder,
  voidOrder,
  acceptOrder,
  updateOrderStatus,

  // Order Items
  addOrderItem,
  updateOrderItem,
  deleteOrderItem,
  voidOrderItem,
  setItemComplimentary,
  updateOrderItemStatus,

  // Discounts
  applyDiscount,
  removeDiscount,

  // Payments
  addPayment,
  voidPayment,

  // Complement
  setOrderComplimentary,

  // Merge & Transfer
  transferTable,
  mergeOrders,

  // Split Payment
  createSplitBills,
  getOrderBills,
  splitBill,

  // Statistics
  getTodayStatistics,
};
