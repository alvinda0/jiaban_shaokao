const { success, error } = require('../utils/response');
const OrderService = require('../services/order.service');
const OrderModel = require('../models/order.model');
const UserModel = require('../models/user.model');
const { pool } = require('../config/db');

const MAX_PIN_ATTEMPTS = 3;
const PIN_LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Store failed attempts in memory (in production, use Redis)
const pinAttempts = {};

const verifyPinAttempt = (orderId) => {
  if (!pinAttempts[orderId]) {
    pinAttempts[orderId] = { count: 0, lockedUntil: null };
  }

  const attempt = pinAttempts[orderId];
  
  // Check if locked
  if (attempt.lockedUntil && new Date() < new Date(attempt.lockedUntil)) {
    const remainingTime = Math.ceil((attempt.lockedUntil - new Date()) / 1000);
    return {
      allowed: false,
      message: `Account locked. Try again in ${remainingTime} seconds`,
      remainingSeconds: remainingTime
    };
  }

  // Reset if lockout expired
  if (attempt.lockedUntil && new Date() >= new Date(attempt.lockedUntil)) {
    attempt.count = 0;
    attempt.lockedUntil = null;
  }

  return { allowed: true };
};

const recordFailedAttempt = (orderId) => {
  if (!pinAttempts[orderId]) {
    pinAttempts[orderId] = { count: 0, lockedUntil: null };
  }

  const attempt = pinAttempts[orderId];
  attempt.count++;

  if (attempt.count >= MAX_PIN_ATTEMPTS) {
    attempt.lockedUntil = new Date(Date.now() + PIN_LOCKOUT_DURATION);
    return {
      locked: true,
      remainingAttempts: 0,
      message: 'Too many failed attempts. Account locked for 15 minutes'
    };
  }

  return {
    locked: false,
    remainingAttempts: MAX_PIN_ATTEMPTS - attempt.count
  };
};

const resetAttempts = (orderId) => {
  if (pinAttempts[orderId]) {
    pinAttempts[orderId] = { count: 0, lockedUntil: null };
  }
};

// Verify PIN
const verifyPin = async (req, res) => {
  try {
    const { orderId, pin } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!orderId || !pin) {
      return error(res, 'Order ID and PIN are required', 400);
    }

    // Check authorization
    if (!['captain', 'superuser'].includes(userRole)) {
      return error(res, 'Unauthorized. Only Captain and Superuser can use PIN', 403);
    }

    // Check attempt limit
    const attemptCheck = verifyPinAttempt(orderId);
    if (!attemptCheck.allowed) {
      return error(res, attemptCheck.message, 429, { remainingSeconds: attemptCheck.remainingSeconds });
    }

    // Get user's PIN from database
    const userResult = await pool.query('SELECT pin FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return error(res, 'User not found', 404);
    }

    const storedPin = userResult.rows[0].pin;
    if (!storedPin) {
      return error(res, 'PIN not configured for this user', 400);
    }

    // Verify PIN (in production, use bcrypt)
    const isPinValid = pin === storedPin;

    if (!isPinValid) {
      console.log('❌ Invalid PIN attempt for user:', userId);
      const failureResult = recordFailedAttempt(orderId);
      
      if (failureResult.locked) {
        return error(res, failureResult.message, 429);
      }

      return error(res, `Invalid PIN. ${failureResult.remainingAttempts} attempt(s) remaining`, 401);
    }

    // PIN verified successfully
    console.log('✅ PIN verified for user:', userId);
    resetAttempts(orderId);

    return success(res, { verified: true }, 'PIN verified successfully', 200);
  } catch (err) {
    console.error('PIN verification error:', err);
    return error(res, err.message || 'PIN verification failed', 500);
  }
};

// Cancel full order with PIN
const cancelFullOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { pin, reason } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!pin) {
      return error(res, 'PIN is required', 400);
    }

    // Check authorization
    if (!['captain', 'superuser'].includes(userRole)) {
      return error(res, 'Unauthorized. Only Captain and Superuser can cancel orders', 403);
    }

    // Verify PIN
    const userResult = await pool.query('SELECT pin FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0 || !userResult.rows[0].pin || pin !== userResult.rows[0].pin) {
      recordFailedAttempt(orderId);
      return error(res, 'Invalid PIN', 401);
    }

    // Get order
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return error(res, 'Order not found', 404);
    }

    if (order.status === 'void') {
      return error(res, 'Order is already void', 400);
    }

    // Void all items
    const items = await OrderModel.getOrderItems(orderId);
    for (const item of items) {
      if (item.status !== 'void') {
        await OrderModel.updateOrderItem(item.id, {
          qty: item.qty,
          unit_price: item.unit_price,
          variant_total: item.variant_total || 0,
          discount_amount: item.discount_amount || 0,
          line_total: item.line_total, // Keep original line_total for audit
          status: 'void',
          notes: `${item.notes || ''}\n[CANCELLED BY ${userRole.toUpperCase()}] ${reason || 'No reason provided'}`
        });
        
        // Restore stock if needed
        if (item.qty > 0) {
          await pool.query(
            'UPDATE products SET stock = stock + $1 WHERE id = $2',
            [item.qty, item.product_id]
          ).catch(() => {});
        }
      }
    }

    // Update order status and notes
    await OrderModel.updateStatus(orderId, 'void');
    await OrderModel.updateOrderNotes(orderId, `Full order cancelled by ${userRole}\nReason: ${reason || 'No reason provided'}`);

    // Recalculate totals
    await OrderService.recalculateOrderTotals(orderId, order.order_type);

    console.log(`✅ Order ${orderId} cancelled by ${userRole} (${userId})`);
    resetAttempts(orderId);

    const cancelledOrder = await OrderModel.getFullOrderDetails(orderId);
    return success(res, cancelledOrder, 'Order cancelled successfully', 200);
  } catch (err) {
    console.error('Cancel order error:', err);
    return error(res, err.message || 'Failed to cancel order', 500);
  }
};

// Cancel single item with PIN
const cancelOrderItem = async (req, res) => {
  try {
    const { id: orderId, itemId } = req.params;
    const { pin, reason } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!pin) {
      return error(res, 'PIN is required', 400);
    }

    // Check authorization
    if (!['captain', 'superuser'].includes(userRole)) {
      return error(res, 'Unauthorized. Only Captain and Superuser can cancel items', 403);
    }

    // Verify PIN
    const userResult = await pool.query('SELECT pin FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0 || !userResult.rows[0].pin || pin !== userResult.rows[0].pin) {
      recordFailedAttempt(orderId);
      return error(res, 'Invalid PIN', 401);
    }

    // Get item
    const itemResult = await pool.query(
      'SELECT * FROM order_items WHERE id = $1 AND order_id = $2',
      [itemId, orderId]
    );

    if (itemResult.rows.length === 0) {
      return error(res, 'Item not found', 404);
    }

    const item = itemResult.rows[0];

    if (item.status === 'void') {
      return error(res, 'Item is already void', 400);
    }

    // Void the item
    await OrderModel.updateOrderItem(itemId, {
      qty: item.qty,
      unit_price: item.unit_price,
      variant_total: item.variant_total || 0,
      discount_amount: item.discount_amount || 0,
      line_total: item.line_total, // Keep original line_total for audit
      status: 'void',
      notes: `${item.notes || ''}\n[CANCELLED BY ${userRole.toUpperCase()}] ${reason || 'No reason provided'}`
    });

    // Restore stock
    if (item.qty > 0) {
      await pool.query(
        'UPDATE products SET stock = stock + $1 WHERE id = $2',
        [item.qty, item.product_id]
      ).catch(() => {});
    }

    // Recalculate order totals
    const order = await OrderModel.findById(orderId);
    if (order) {
      await OrderService.recalculateOrderTotals(orderId, order.order_type);
    }

    console.log(`✅ Item ${itemId} in order ${orderId} cancelled by ${userRole} (${userId})`);
    resetAttempts(orderId);

    const updatedItem = await OrderModel.getOrderItemById(itemId);
    return success(res, updatedItem, 'Item cancelled successfully', 200);
  } catch (err) {
    console.error('Cancel item error:', err);
    return error(res, err.message || 'Failed to cancel item', 500);
  }
};

// Reduce item quantity with PIN
const reduceItemQty = async (req, res) => {
  try {
    const { id: orderId, itemId } = req.params;
    const { pin, qtyToRemove, reason } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!pin) {
      return error(res, 'PIN is required', 400);
    }

    if (!qtyToRemove || qtyToRemove <= 0) {
      return error(res, 'Valid quantity to remove is required', 400);
    }

    // Check authorization
    if (!['captain', 'superuser'].includes(userRole)) {
      return error(res, 'Unauthorized. Only Captain and Superuser can reduce quantities', 403);
    }

    // Verify PIN
    const userResult = await pool.query('SELECT pin FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0 || !userResult.rows[0].pin || pin !== userResult.rows[0].pin) {
      recordFailedAttempt(orderId);
      return error(res, 'Invalid PIN', 401);
    }

    // Get item
    const itemResult = await pool.query(
      'SELECT * FROM order_items WHERE id = $1 AND order_id = $2',
      [itemId, orderId]
    );

    if (itemResult.rows.length === 0) {
      return error(res, 'Item not found', 404);
    }

    const item = itemResult.rows[0];

    if (item.status === 'void') {
      return error(res, 'Cannot reduce qty of void item', 400);
    }

    if (qtyToRemove > item.qty) {
      return error(res, `Cannot remove ${qtyToRemove}. Item only has ${item.qty} units`, 400);
    }

    // Reduce the quantity (even if result is 0, don't void - just set qty=0)
    const newQty = item.qty - qtyToRemove;
    
    // Calculate new line_total based on remaining qty
    // Get price per unit from original line_total
    const pricePerUnit = item.qty > 0 ? item.line_total / item.qty : item.unit_price;
    
    // Calculate new line_total
    const newLineTotal = newQty > 0 ? pricePerUnit * newQty : 0;

    // Update item qty (keep existing status, don't auto-void)
    await OrderModel.updateOrderItem(itemId, {
      qty: newQty,
      unit_price: item.unit_price,
      variant_total: item.variant_total || 0,
      discount_amount: item.discount_amount || 0,
      line_total: newLineTotal,
      status: item.status, // Keep original status
      notes: `${item.notes || ''}\n[QTY REDUCED by ${userRole.toUpperCase()} from ${item.qty} to ${newQty}] ${reason || 'No reason provided'}`
    });

    // Restore stock
    if (qtyToRemove > 0) {
      await pool.query(
        'UPDATE products SET stock = stock + $1 WHERE id = $2',
        [qtyToRemove, item.product_id]
      ).catch(() => {});
    }

    // Recalculate order totals
    const order = await OrderModel.findById(orderId);
    if (order) {
      await OrderService.recalculateOrderTotals(orderId, order.order_type);
    }

    console.log(`✅ Item ${itemId} qty reduced from ${item.qty} to ${newQty} by ${userRole} (${userId})`);
    resetAttempts(orderId);

    const updatedItem = await OrderModel.getOrderItemById(itemId);
    return success(res, updatedItem, `Qty reduced from ${item.qty} to ${newQty}`, 200);
  } catch (err) {
    console.error('Reduce qty error:', err);
    return error(res, err.message || 'Failed to reduce quantity', 500);
  }
};

module.exports = {
  verifyPin,
  cancelFullOrder,
  cancelOrderItem,
  reduceItemQty,
};
