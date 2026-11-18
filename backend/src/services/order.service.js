const OrderModel = require('../models/order.model');
const TaxModel = require('../models/tax.model');
const ProductModel = require('../models/product.model');
const VoucherService = require('./voucher.service');
const VoucherModel = require('../models/voucher.model');
const { pool } = require('../config/db');

class OrderService {
  // ==================== ORDER CRUD ====================

  // Get all orders with filters
  async getAllOrders(store_id, filters = {}) {
    return await OrderModel.findByStore(store_id, filters);
  }

  // Get single order by ID
  async getOrderById(order_id, store_id = null) {
    return await OrderModel.findById(order_id, store_id);
  }

  // Get full order details
  async getFullOrderDetails(order_id) {
    return await OrderModel.getFullOrderDetails(order_id);
  }

  // Create new order
  async createOrder(data) {
    const { store_id, table_id, order_type, source, customer_name, customer_phone, guest_count, notes, created_by, voucher_code } = data;

    // Validate store_id
    if (!store_id) {
      throw new Error('store_id is required');
    }
    
    // Prepare notes with voucher if provided
    let finalNotes = notes || '';
    if (voucher_code) {
      // Add voucher to notes so it can be applied during recalculation
      finalNotes = (finalNotes ? finalNotes + ' | ' : '') + `Voucher: ${voucher_code}`;
      console.log('🎫 Voucher code added to order notes:', voucher_code);
    }

    // Create order
    const result = await OrderModel.create({
      store_id,
      table_id,
      order_type: order_type || 'dine_in',
      source: source || 'pos',
      customer_name,
      customer_phone,
      guest_count,
      notes: finalNotes,
      created_by,
    });

    const order_id = result.insertId;
    
    console.log('📝 Order created with ID:', order_id);
    console.log('🎫 Voucher code received:', voucher_code);
    console.log('📍 Order source:', source);
    console.log('📝 Final notes:', finalNotes);

    // Get created order
    const order = await OrderModel.findById(order_id);
    return order;
  }

  // Update order basic info
  async updateOrder(order_id, data, store_id = null) {
    // Verify order exists
    const exists = await OrderModel.exists(order_id, store_id);
    if (!exists) {
      throw new Error('Order not found');
    }

    console.log('🔄 Updating order:', order_id, 'with data:', data);

    // If notes are being updated, preserve voucher code
    if (data.notes !== undefined) {
      // Get current order to check for voucher in notes
      const currentOrder = await OrderModel.findById(order_id);
      const voucherMatch = currentOrder.notes?.match(/Voucher:\s*([A-Z0-9]+)/i);
      
      if (voucherMatch) {
        const voucherCode = voucherMatch[1];
        console.log('🎫 Preserving voucher in notes:', voucherCode);
        // Preserve voucher in new notes
        if (data.notes && !data.notes.includes('Voucher:')) {
          data.notes = `Voucher: ${voucherCode}\n${data.notes}`;
        } else if (!data.notes) {
          data.notes = `Voucher: ${voucherCode}`;
        }
      }
    }

    // If status is being updated to 'processing', also update all pending items
    if (data.status === 'processing') {
      console.log('📝 Updating order items to processing status');
      const itemsResult = await pool.query(
        `UPDATE order_items 
         SET status = 'processing' 
         WHERE order_id = $1 AND status = 'pending'
         RETURNING id`,
        [order_id]
      );
      console.log(`✅ Updated ${itemsResult.rowCount} order items to processing`);
    }

    await OrderModel.update(order_id, data);
    const updatedOrder = await OrderModel.findById(order_id);
    console.log('✅ Order updated, new status:', updatedOrder.status);
    return updatedOrder;
  }

  // Delete order (only if no items)
  async deleteOrder(order_id, store_id = null) {
    // Verify order exists
    const exists = await OrderModel.exists(order_id, store_id);
    if (!exists) {
      throw new Error('Order not found');
    }

    // Check if order has items
    const items = await OrderModel.getOrderItems(order_id);
    if (items.length > 0) {
      throw new Error('Cannot delete order with items');
    }

    await OrderModel.remove(order_id);
    return { success: true };
  }

  // Void order
  async voidOrder(order_id, voided_by, void_reason, store_id = null) {
    const exists = await OrderModel.exists(order_id, store_id);
    if (!exists) {
      throw new Error('Order not found');
    }

    await OrderModel.updateStatus(order_id, 'void', { voided_by, void_reason });
    return await OrderModel.findById(order_id);
  }

  // Update order status
  async updateOrderStatus(order_id, status, updated_by, store_id = null) {
    const exists = await OrderModel.exists(order_id, store_id);
    if (!exists) {
      throw new Error('Order not found');
    }

    await OrderModel.updateStatus(order_id, status, { updated_by });
    return await OrderModel.findById(order_id);
  }

  // Accept order - mark as processing and return full details with items grouped by category
  async acceptOrder(order_id, accepted_by, store_id = null) {
    // Verify order exists
    const order = await OrderModel.findById(order_id, store_id);
    if (!order) {
      throw new Error('Order not found');
    }

    // Update status to processing
    await OrderModel.updateStatus(order_id, 'processing', { updated_by: accepted_by });
    
    // Return full order details with category information for kitchen printing
    const fullOrder = await OrderModel.getFullOrderDetails(order_id);
    
    console.log('✅ Order accepted:', order_id);
    console.log('📋 Items:', fullOrder.items?.length);
    
    return fullOrder;
  }

  // ==================== ORDER ITEMS ====================

  // Add item to order
  async addOrderItem(order_id, itemData, store_id = null) {
    // Verify order exists
    const order = await OrderModel.findById(order_id, store_id);
    if (!order) {
      throw new Error('Order not found');
    }

    if (!['pending', 'processing'].includes(order.status)) {
      throw new Error('Cannot add items to closed/void/merged order');
    }

    const { product_id, qty, notes, variants, created_by } = itemData;
    
    console.log('🔍 addOrderItem called with itemData:', JSON.stringify(itemData, null, 2));
    console.log('🔍 Variants received:', variants ? JSON.stringify(variants, null, 2) : 'NONE');

    // Get product details
    const product = await ProductModel.findById(product_id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Calculate base price
    let unit_price = product.price;
    let variant_total = 0;

    // Add item
    const itemResult = await OrderModel.addOrderItem({
      order_id,
      product_id,
      product_name: product.name,
      qty: qty || 1,
      unit_price,
      variant_total: 0,
      discount_amount: 0,
      line_total: unit_price * (qty || 1),
      notes,
      created_by,
    });

    const order_item_id = itemResult.insertId;

    // Reduce stock if product tracks stock
    if (product.track_stock) {
      console.log(`📦 Reducing stock for product ${product.name} by ${qty || 1}`);
      
      try {
        // Check and reduce stock atomically - fail if stock insufficient
        const stockCheckResult = await ProductModel.reduceStockAtomic(product_id, qty || 1);
        
        if (!stockCheckResult) {
          throw new Error('Insufficient stock - product already sold out');
        }
        
        // Add stock movement record
        await ProductModel.addStockMovement({
          store_id: order.store_id,
          product_id,
          type: 'sale',
          quantity: -(qty || 1),
          reference_type: 'order',
          reference_id: order_id,
          notes: `Order ${order.order_number} - Item added`,
          created_by,
        }).catch(err => {
          console.error('❌ Error adding stock movement:', err.message);
        });
        
        console.log(`✅ Stock reduced successfully`);
      } catch (err) {
        console.error('❌ Error reducing stock:', err.message);
        throw new Error(`Stock tidak tersedia: ${err.message}`);
      }
    }

    // Add variants if provided
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        // Support both formats:
        // 1. Flutter format: { group_id, option_id }
        // 2. Old format: { variant_option_id, group_name, option_name, price_adjustment }
        
        let variantData;
        
        if (variant.group_id && variant.option_id) {
          // Flutter format - fetch variant details from database
          const variantResult = await pool.query(`
            SELECT 
              vg.id as group_id,
              vg.name as group_name,
              vo.id as option_id,
              vo.name as option_name,
              vo.price_adjustment
            FROM variant_groups vg
            INNER JOIN variant_options vo ON vo.variant_group_id = vg.id
            WHERE vg.id = $1 AND vo.id = $2
            LIMIT 1
          `, [variant.group_id, variant.option_id]);
          
          if (variantResult.rows.length > 0) {
            const v = variantResult.rows[0];
            variantData = {
              variant_option_id: v.option_id,
              group_name: v.group_name,
              option_name: v.option_name,
              price_adjustment: parseFloat(v.price_adjustment) || 0,
            };
            console.log(`📦 Variant resolved: ${v.group_name} = ${v.option_name} (+${v.price_adjustment})`);
          } else {
            console.warn(`⚠️ Variant not found: group_id=${variant.group_id}, option_id=${variant.option_id}`);
            continue; // Skip this variant
          }
        } else {
          // Old format - use as-is
          variantData = {
            variant_option_id: variant.variant_option_id,
            group_name: variant.group_name,
            option_name: variant.option_name,
            price_adjustment: variant.price_adjustment || 0,
          };
        }
        
        await OrderModel.addOrderItemVariant({
          order_item_id,
          ...variantData,
        });

        variant_total += variantData.price_adjustment;
      }

      // Update item with variant total
      const new_line_total = (unit_price + variant_total) * (qty || 1);
      await OrderModel.updateOrderItem(order_item_id, {
        qty: qty || 1,
        unit_price,
        variant_total,
        discount_amount: 0,
        line_total: new_line_total,
        notes,
        status: 'pending',
      });
    }

    // Recalculate order totals
    await this.recalculateOrderTotals(order_id, order.order_type);

    return await OrderModel.getOrderItemById(order_item_id);
  }

  // Update order item
  async updateOrderItem(order_item_id, itemData) {
    const item = await OrderModel.getOrderItemById(order_item_id);
    if (!item) {
      throw new Error('Order item not found');
    }

    const order = await OrderModel.findById(item.order_id);
    if (!['pending', 'processing'].includes(order.status)) {
      throw new Error('Cannot update items in closed/void/merged order');
    }

    const { qty, notes, variants } = itemData;

    // Remove old variants if updating variants
    if (variants !== undefined) {
      await OrderModel.removeOrderItemVariants(order_item_id);
    }

    let variant_total = 0;

    // Add new variants
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        // Support both formats:
        // 1. Flutter format: { group_id, option_id }
        // 2. Old format: { variant_option_id, group_name, option_name, price_adjustment }
        
        let variantData;
        
        if (variant.group_id && variant.option_id) {
          // Flutter format - fetch variant details from database
          const variantResult = await pool.query(`
            SELECT 
              vg.id as group_id,
              vg.name as group_name,
              vo.id as option_id,
              vo.name as option_name,
              vo.price_adjustment
            FROM variant_groups vg
            INNER JOIN variant_options vo ON vo.variant_group_id = vg.id
            WHERE vg.id = $1 AND vo.id = $2
            LIMIT 1
          `, [variant.group_id, variant.option_id]);
          
          if (variantResult.rows.length > 0) {
            const v = variantResult.rows[0];
            variantData = {
              variant_option_id: v.option_id,
              group_name: v.group_name,
              option_name: v.option_name,
              price_adjustment: parseFloat(v.price_adjustment) || 0,
            };
          } else {
            console.warn(`⚠️ Variant not found: group_id=${variant.group_id}, option_id=${variant.option_id}`);
            continue; // Skip this variant
          }
        } else {
          // Old format - use as-is
          variantData = {
            variant_option_id: variant.variant_option_id,
            group_name: variant.group_name,
            option_name: variant.option_name,
            price_adjustment: variant.price_adjustment || 0,
          };
        }
        
        await OrderModel.addOrderItemVariant({
          order_item_id,
          ...variantData,
        });

        variant_total += variantData.price_adjustment;
      }
    }

    // Calculate new line total
    const new_qty = qty !== undefined ? qty : item.qty;
    const new_line_total = (item.unit_price + variant_total) * new_qty;

    await OrderModel.updateOrderItem(order_item_id, {
      qty: new_qty,
      unit_price: item.unit_price,
      variant_total,
      discount_amount: item.discount_amount,
      line_total: new_line_total,
      notes: notes !== undefined ? notes : item.notes,
      status: item.status,
    });

    // Recalculate order totals
    await this.recalculateOrderTotals(item.order_id, order.order_type);

    return await OrderModel.getOrderItemById(order_item_id);
  }

  // Delete order item
  async deleteOrderItem(order_item_id) {
    const item = await OrderModel.getOrderItemById(order_item_id);
    if (!item) {
      throw new Error('Order item not found');
    }

    const order = await OrderModel.findById(item.order_id);
    if (!['pending', 'processing'].includes(order.status)) {
      throw new Error('Cannot delete items from closed/void/merged order');
    }

    // Remove variants first
    await OrderModel.removeOrderItemVariants(order_item_id);

    // Remove item
    await OrderModel.removeOrderItem(order_item_id);

    // Recalculate order totals
    await this.recalculateOrderTotals(item.order_id, order.order_type);

    return { success: true };
  }

  // Void order item
  async voidOrderItem(order_item_id, voided_by, void_reason) {
    const item = await OrderModel.getOrderItemById(order_item_id);
    if (!item) {
      throw new Error('Order item not found');
    }

    await OrderModel.voidOrderItem(order_item_id, voided_by, void_reason);

    // Recalculate order totals
    const order = await OrderModel.findById(item.order_id);
    await this.recalculateOrderTotals(item.order_id, order.order_type);

    return await OrderModel.getOrderItemById(order_item_id);
  }

  // Set item as complimentary
  async setItemComplimentary(order_item_id, data) {
    const { is_complimentary, complimentary_reason, complimentary_by } = data;

    const item = await OrderModel.getOrderItemById(order_item_id);
    if (!item) {
      throw new Error('Order item not found');
    }

    await OrderModel.setItemComplimentary(order_item_id, {
      is_complimentary,
      complimentary_reason,
      complimentary_by,
    });

    // Recalculate order totals
    const order = await OrderModel.findById(item.order_id);
    await this.recalculateOrderTotals(item.order_id, order.order_type);

    return await OrderModel.getOrderItemById(order_item_id);
  }

  // Update order item status
  async updateOrderItemStatus(order_item_id, status, updated_by) {
    const item = await OrderModel.getOrderItemById(order_item_id);
    if (!item) {
      throw new Error('Order item not found');
    }

    await OrderModel.updateOrderItem(order_item_id, { status });

    return await OrderModel.getOrderItemById(order_item_id);
  }

  // ==================== ORDER DISCOUNTS ====================

  // Apply discount to order (can be at order open or before payment)
  async applyDiscount(order_id, discountData) {
    const { name, type, value, applied_stage, order_item_id, applied_by, approved_by } = discountData;

    // Validate discount
    if (!name || !type || value === undefined) {
      throw new Error('Discount name, type, and value are required');
    }

    if (!['percentage', 'fixed'].includes(type)) {
      throw new Error('Discount type must be percentage or fixed');
    }

    if (!['order', 'payment'].includes(applied_stage)) {
      throw new Error('Applied stage must be order or payment');
    }

    const order = await OrderModel.findById(order_id);
    if (!order) {
      throw new Error('Order not found');
    }

    // Calculate discount amount
    let amount = 0;
    if (order_item_id) {
      // Item level discount
      const item = await OrderModel.getOrderItemById(order_item_id);
      if (!item) {
        throw new Error('Order item not found');
      }

      if (type === 'percentage') {
        amount = (item.line_total * value) / 100;
      } else {
        amount = value;
      }
    } else {
      // Order level discount - calculate based on current subtotal
      const items = await OrderModel.getOrderItems(order_id);
      const subtotal = items
        .filter((i) => i.status !== 'void' && !i.is_complimentary)
        .reduce((sum, i) => sum + i.line_total, 0);

      if (type === 'percentage') {
        amount = (subtotal * value) / 100;
      } else {
        amount = value;
      }
    }

    // Add discount
    await OrderModel.addDiscount({
      order_id,
      order_item_id,
      discount_id: null,
      name,
      type,
      value,
      amount,
      applied_stage,
      approved_by,
      applied_by,
    });

    // Recalculate totals
    await this.recalculateOrderTotals(order_id, order.order_type);

    return await OrderModel.getOrderDiscounts(order_id);
  }

  // Remove discount
  async removeDiscount(discount_record_id, order_id) {
    await OrderModel.removeDiscount(discount_record_id);

    const order = await OrderModel.findById(order_id);
    await this.recalculateOrderTotals(order_id, order.order_type);

    return await OrderModel.getOrderDiscounts(order_id);
  }

  // ==================== ORDER CALCULATION ====================

  // Recalculate order totals (subtotal, discount, tax, service charge, grand total)
  async recalculateOrderTotals(order_id, order_type) {
    console.log('');
    console.log('════════════════════════════════════════════════');
    console.log('🔍 RECALCULATE ORDER TOTALS START');
    console.log('════════════════════════════════════════════════');
    console.log('📝 Order ID:', order_id);
    
    // Get all order items (excluding void)
    const items = await OrderModel.getOrderItems(order_id);
    const activeItems = items.filter((i) => i.status !== 'void');

    // Calculate subtotal (sum of all non-complimentary items)
    let subtotal = 0;
    for (const item of activeItems) {
      if (!item.is_complimentary) {
        subtotal += parseFloat(item.line_total) || 0;
      }
    }
    
    // Round subtotal to avoid decimal issues
    subtotal = Math.round(subtotal);

    // Get order to check for voucher
    const order = await OrderModel.findById(order_id);
    
    console.log('📊 Subtotal:', subtotal);
    console.log('🎫 Order source:', order.source);
    console.log('📝 Order notes:', order.notes);
    console.log('📝 Notes includes "Voucher:"?', order.notes?.includes('Voucher:'));
    
    // Check if voucher exists in notes
    if (order.notes && order.notes.includes('Voucher:') && subtotal > 0) {
      const voucherMatch = order.notes.match(/Voucher:\s*([A-Z0-9]+)/i);
      console.log('🔍 Regex match result:', voucherMatch);
      
      if (voucherMatch) {
        const voucher_code = voucherMatch[1];
        console.log('✅ Extracted voucher code:', voucher_code);
        
        // Check if voucher discount already exists
        const existingDiscounts = await OrderModel.getOrderDiscounts(order_id);
        console.log('🔍 All existing discounts:', JSON.stringify(existingDiscounts, null, 2));
        
        const existingVoucherDiscount = existingDiscounts.find(d => d.name && d.name.toLowerCase().includes('voucher'));
        console.log('🔍 Existing voucher discount:', existingVoucherDiscount ? JSON.stringify(existingVoucherDiscount, null, 2) : 'NONE');
        
        // Prepare cartData for validation (used for both first time and recalculation)
        const cartData = {
          subtotal,
          items: activeItems.map(item => ({
            product_id: item.product_id,
            quantity: item.qty,
            price: item.unit_price,
            line_total: item.line_total
          }))
        };
        
        // Check if this is a merge scenario (multiple discounts exist)
        const isMergeScenario = existingDiscounts && existingDiscounts.length > 1;
        
        if (existingVoucherDiscount) {
          // Discount already exists
          console.log(`✅ Voucher ${voucher_code} already applied with amount Rp ${existingVoucherDiscount.amount}`);
          
          if (isMergeScenario) {
            // This is a merge - don't recalculate voucher, keep original amounts
            console.log(`✅ MERGE SCENARIO DETECTED (${existingDiscounts.length} discounts exist)`);
            console.log(`   → Skipping voucher recalculation, keeping original discount amounts`);
          } else {
            // Single order - recalculate voucher with current subtotal
            console.log(`   → RECALCULATING with current subtotal: Rp ${subtotal}`);
            
            try {
              const voucherResult = await VoucherService.validateVoucher(
                voucher_code, 
                cartData, 
                order.created_by,
                true  // skipMinPurchaseCheck = true (already validated before)
              );
              
              const newDiscountAmount = voucherResult.discount;
              console.log(`📊 RECALCULATED discount: Rp ${newDiscountAmount} (previous: Rp ${existingVoucherDiscount.amount})`);
              
              // Update to new calculated amount (for single order)
              if (newDiscountAmount !== existingVoucherDiscount.amount) {
                await OrderModel.updateDiscount(existingVoucherDiscount.id, {
                  value: newDiscountAmount,
                  amount: newDiscountAmount
                });
                console.log(`✅ Discount UPDATED: Rp ${existingVoucherDiscount.amount} → Rp ${newDiscountAmount}`);
              } else {
                console.log(`✅ Discount amount unchanged: Rp ${newDiscountAmount}`);
              }
              
            } catch (err) {
              console.error('❌ Error recalculating discount:', err.message);
              console.log('   → Keeping previous discount amount');
            }
          }
        } else {
          // First time applying voucher - calculate discount normally
          try {
            console.log('🎫 Applying voucher for the FIRST time:', JSON.stringify(cartData, null, 2));
            
            const voucherResult = await VoucherService.validateVoucher(
              voucher_code, 
              cartData, 
              order.created_by,
              false  // Don't skip min_purchase on first application
            );
            
            console.log('✅ Voucher validation result:', JSON.stringify(voucherResult, null, 2));
            
            // ADD new discount
            console.log(`➕ ADDING new voucher discount: Rp ${voucherResult.discount}`);
            
            await OrderModel.addDiscount({
              order_id,
              order_item_id: null,
              discount_id: null,
              name: `Voucher: ${voucher_code}`,
              type: 'fixed',
              value: voucherResult.discount,
              amount: voucherResult.discount,
              applied_stage: 'order',
              approved_by: order.created_by,
              applied_by: order.created_by,
            });
            
            // Record voucher usage (only first time)
            await VoucherModel.incrementUsage(voucherResult.voucher.id);
            await VoucherModel.recordUsage(voucherResult.voucher.id, order.created_by, order_id);
            
            console.log(`✅ Voucher ${voucher_code} APPLIED: -Rp ${voucherResult.discount}`);
            
          } catch (err) {
            console.error('❌ Voucher application error:', err.message);
            console.error('❌ Error stack:', err.stack);
          }
        }
      } else {
        console.log('❌ No voucher code found in regex match');
      }
    } else {
      if (!order.notes) {
        console.log('⚠️ Order notes is NULL or empty');
      } else if (!order.notes.includes('Voucher:')) {
        console.log('⚠️ Order notes does NOT contain "Voucher:"');
      } else if (subtotal === 0) {
        console.log('⚠️ Subtotal is 0, skipping voucher');
      }
    }

    // Get discounts (with updated voucher amount if any)
    const discounts = await OrderModel.getOrderDiscounts(order_id);
    const orderDiscounts = discounts.filter((d) => !d.order_item_id);

    // Calculate total discount
    let discount_total = 0;
    for (const discount of orderDiscounts) {
      discount_total += discount.amount;
    }
    
    console.log('💰 Total discount:', discount_total);

    // Amount after discount (base for tax calculation)
    const amount_after_discount = subtotal - discount_total;

    // Get tax rules for store (using order.store_id from above)
    const taxRules = await TaxModel.findByStore(order.store_id);

    let service_charge_total = 0;
    let tax_total = 0;

    // Step 1: Calculate Service Charge (SC) first - from amount after discount
    // Only for dine_in, not for take_away
    const scRule = taxRules.find((t) => t.code === 'SC' && t.is_active);
    if (scRule && order_type !== 'take_away') {
      service_charge_total = Math.round((amount_after_discount * scRule.rate) / 100);

      await OrderModel.upsertOrderTax({
        order_id,
        tax_rule_id: scRule.id,
        code: 'SC',
        rate: scRule.rate,
        base_amount: amount_after_discount,
        amount: service_charge_total,
      });
    } else {
      // Remove SC if take_away
      await OrderModel.removeOrderTax(order_id, 'SC');
    }

    // Step 2: Calculate PB1 (Tax) - from (amount_after_discount + SC)
    const pb1Rule = taxRules.find((t) => t.code === 'PB1' && t.is_active);
    if (pb1Rule) {
      const base_for_pb1 = amount_after_discount + service_charge_total; // subtotal + SC
      const pb1_amount = Math.round((base_for_pb1 * pb1Rule.rate) / 100);
      tax_total += pb1_amount;

      await OrderModel.upsertOrderTax({
        order_id,
        tax_rule_id: pb1Rule.id,
        code: 'PB1',
        rate: pb1Rule.rate,
        base_amount: base_for_pb1,
        amount: pb1_amount,
      });
    }

    // Calculate grand total
    const grand_total_raw = subtotal - discount_total + service_charge_total + tax_total;

    // Apply rounding
    const grand_total = Math.round(grand_total_raw);
    const rounding = grand_total - grand_total_raw;

    // Get current paid amount
    const payments = await OrderModel.getPayments(order_id);
    const paid_total = payments.reduce((sum, p) => sum + p.amount, 0);

    // Sanitize all values BEFORE database update (convert Infinity/NaN to 0)
    const sanitizeValue = (val) => {
      const num = Number(val) || 0;
      return isFinite(num) ? num : 0;
    };

    const sanitized = {
      subtotal: sanitizeValue(subtotal),
      discount_total: sanitizeValue(discount_total),
      service_charge_total: sanitizeValue(service_charge_total),
      tax_total: sanitizeValue(tax_total),
      rounding: sanitizeValue(rounding),
      grand_total: sanitizeValue(grand_total),
      paid_total: sanitizeValue(paid_total),
    };

    // Update order totals with sanitized values
    await OrderModel.updateTotals(order_id, sanitized);
    
    console.log('✅ ORDER TOTALS UPDATED:', {
      subtotal: sanitized.subtotal,
      discount_total: sanitized.discount_total,
      service_charge_total: sanitized.service_charge_total,
      tax_total: sanitized.tax_total,
      grand_total: sanitized.grand_total
    });
    console.log('════════════════════════════════════════════════');
    console.log('');

    // Ensure all values are valid numbers (not Infinity or NaN)
    const sanitizedReturn = {
      subtotal: sanitized.subtotal,
      discount_total: sanitized.discount_total,
      service_charge_total: sanitized.service_charge_total,
      tax_total: sanitized.tax_total,
      rounding: sanitized.rounding,
      grand_total: sanitized.grand_total,
      paid_total: sanitized.paid_total,
    };

    return sanitizedReturn;
  }

  // Helper: Map payment code to payment type
  mapCodeToType(code) {
    const typeMap = {
      'cash': 'cash',
      'qris': 'qris',
      'gofood': 'ewallet',
      'grabfood': 'ewallet',
      'shopeefood': 'ewallet',
      'gopay': 'ewallet',
      'ovo': 'ewallet',
      'dana': 'ewallet',
      'cc_mandiri': 'credit',
      'cc_bca': 'credit',
      'cc_bni': 'credit',
      'debit_mandiri': 'debit',
      'debit_bca': 'debit',
      'debit_bni': 'debit',
    };
    
    return typeMap[code.toLowerCase()] || 'other';
  }

  // ==================== PAYMENTS ====================

  // Add payment to order
  async addPayment(order_id, paymentData) {
    const {
      payment_method_id,
      amount,
      tendered_amount,
      change_amount,
      reference_no,
      received_by,
      bill_id,
      voucher_code, // Accept voucher code from payment
    } = paymentData;

    let order = await OrderModel.findById(order_id);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'paid') {
      throw new Error('Order is already paid');
    }

    if (!['pending', 'processing'].includes(order.status)) {
      throw new Error('Cannot add payment to void/merged order');
    }

    // If voucher code provided and not already in notes, add it
    if (voucher_code && (!order.notes || !order.notes.includes('Voucher:'))) {
      console.log('🎫 Voucher code received:', voucher_code);
      console.log('📝 Current order notes:', order.notes);
      
      const newNotes = order.notes ? `${order.notes} | Voucher: ${voucher_code}` : `Voucher: ${voucher_code}`;
      console.log('📝 Updating order notes to:', newNotes);
      
      await OrderModel.update(order_id, { notes: newNotes });
      
      // Reload order to get updated notes
      order = await OrderModel.findById(order_id);
      console.log('✅ Order notes updated:', order.notes);
    }

    // IMPORTANT: Recalculate order totals FIRST to ensure grand_total is up-to-date
    // This handles cases where voucher was applied but order not yet recalculated
    console.log('🔄 Recalculating order totals before payment validation...');
    await this.recalculateOrderTotals(order_id, order.order_type);
    
    // Reload order to get updated grand_total
    order = await OrderModel.findById(order_id);
    console.log('💰 Order grand_total after recalculate:', order.grand_total);
    console.log('💰 Payment amount:', amount);

    // VALIDATE: Payment amount must match order/bill grand_total (after recalculation)
    let expectedTotal = order.grand_total;
    
    // If paying for a specific bill (split payment), validate against bill total
    if (bill_id) {
      const bill = await OrderModel.getBillById(bill_id);
      if (!bill) {
        throw new Error('Bill not found');
      }
      expectedTotal = bill.grand_total;
      console.log('💰 This is a split bill payment. Bill grand_total:', expectedTotal);
    }
    
    const amountDiff = Math.abs(amount - expectedTotal);
    if (amountDiff > 1) { // Allow 1 rupiah rounding difference
      console.error('❌ Payment amount mismatch!');
      console.error('   Expected total:', expectedTotal);
      console.error('   Payment amount:', amount);
      console.error('   Difference:', amountDiff);
      throw new Error(`Payment amount (Rp ${Math.round(amount).toLocaleString('id-ID')}) does not match ${bill_id ? 'bill' : 'order'} total (Rp ${Math.round(expectedTotal).toLocaleString('id-ID')})`);
    }

    console.log('✅ Payment amount validated');

    // Resolve payment_method_id if it's a code (string not UUID format)
    let resolvedPaymentMethodId = payment_method_id;
    
    // Check if payment_method_id is not a UUID format (simple check for dashes)
    if (payment_method_id && !payment_method_id.includes('-')) {
      console.log('🔍 Resolving payment method code:', payment_method_id);
      
      // Try to find payment method by code
      const result = await pool.query(
        'SELECT id FROM payment_methods WHERE store_id = $1 AND code = $2 AND is_active = true LIMIT 1',
        [order.store_id, payment_method_id]
      );
      
      if (result.rows.length > 0) {
        resolvedPaymentMethodId = result.rows[0].id;
        console.log('✅ Resolved to payment method ID:', resolvedPaymentMethodId);
      } else {
        // Payment method not found, create a default one
        console.log('⚠️ Payment method not found, creating default method for code:', payment_method_id);
        
        const insertResult = await pool.query(
          `INSERT INTO payment_methods (store_id, code, name, type, is_active)
           VALUES ($1, $2, $3, $4, true)
           RETURNING id`,
          [
            order.store_id,
            payment_method_id,
            payment_method_id.toUpperCase(), // Use code as name
            this.mapCodeToType(payment_method_id)
          ]
        );
        
        resolvedPaymentMethodId = insertResult.rows[0].id;
        console.log('✅ Created payment method with ID:', resolvedPaymentMethodId);
      }
    }

    console.log('💰 Adding payment:', {
      order_id,
      payment_method_id: resolvedPaymentMethodId,
      amount
    });

    // Add payment
    await OrderModel.addPayment({
      order_id,
      bill_id,
      payment_method_id: resolvedPaymentMethodId,
      amount,
      tendered_amount,
      change_amount: change_amount || 0,
      reference_no,
      received_by,
    });

    // Get all payments
    const payments = await OrderModel.getPayments(order_id);
    const total_paid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Update order paid_total
    await OrderModel.updateTotals(order_id, {
      subtotal: order.subtotal,
      discount_total: order.discount_total,
      service_charge_total: order.service_charge_total,
      tax_total: order.tax_total,
      rounding: order.rounding || 0,
      grand_total: order.grand_total,
      paid_total: total_paid,
    });

    // Check if fully paid
    if (bill_id) {
      // Split payment - update bill
      const bill = await OrderModel.getBillById(bill_id);
      console.log(`📋 Bill before update:`, bill);
      
      const billPayments = await OrderModel.getPayments(order_id, bill_id);
      console.log(`💰 Bill payments:`, billPayments);
      
      const bill_paid = billPayments.reduce((sum, p) => sum + p.amount, 0);
      console.log(`💰 Total bill_paid: ${bill_paid}, grand_total: ${bill.grand_total}`);

      // Always update paid_total, and update status if fully paid
      const newStatus = bill_paid >= bill.grand_total ? 'paid' : 'unpaid';
      await OrderModel.updateBillPaid(bill_id, bill_paid, newStatus);
      
      console.log(`✅ Bill ${bill_id} updated: paid_total=${bill_paid}, status=${newStatus}`);

      // Check if all bills are paid
      const allBills = await OrderModel.getOrderBills(order_id);
      const allPaid = allBills.every((b) => {
        // Refresh: check if this is the current bill
        if (b.id === bill_id) {
          return newStatus === 'paid';
        }
        return b.status === 'paid';
      });
      
      // FIXED: Update order paid_total from all payments, not from bills
      // This prevents duplicate accumulation when multiple bills are paid
      const allPayments = await OrderModel.getPayments(order_id);
      const totalPaidFromPayments = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      
      await OrderModel.updateTotals(order_id, {
        subtotal: order.subtotal,
        discount_total: order.discount_total,
        service_charge_total: order.service_charge_total,
        tax_total: order.tax_total,
        rounding: order.rounding || 0,
        grand_total: order.grand_total,
        paid_total: totalPaidFromPayments,
      });
      
      console.log(`📊 Order paid_total updated: ${totalPaidFromPayments} (from ${allPayments.length} payments)`);

      if (allPaid) {
        console.log('🎉 All bills paid! Updating order status to PAID');
        await OrderModel.updateStatus(order_id, 'paid', { closed_at: new Date() });
      }
    } else {
      // Regular payment - check if fully paid
      if (total_paid >= order.grand_total) {
        await OrderModel.updateStatus(order_id, 'paid', { closed_at: new Date() });
      }
    }

    return await OrderModel.getPayments(order_id);
  }

  // Void payment
  async voidPayment(payment_id, voided_by, void_reason) {
    await OrderModel.voidPayment(payment_id, voided_by, void_reason);
    return { success: true };
  }

  // ==================== COMPLEMENT (FREE) ====================

  // Set entire order as complimentary
  async setOrderComplimentary(order_id, data) {
    const { is_complimentary, complimentary_amount, complimentary_reason, complimentary_by } = data;

    const order = await OrderModel.findById(order_id);
    if (!order) {
      throw new Error('Order not found');
    }

    await OrderModel.setComplimentary(order_id, {
      is_complimentary,
      complimentary_amount: complimentary_amount || order.grand_total,
      complimentary_reason,
      complimentary_by,
    });

    if (is_complimentary) {
      // Mark as paid if fully complimentary
      await OrderModel.updateStatus(order_id, 'paid', { closed_at: new Date() });
    }

    return await OrderModel.findById(order_id);
  }

  // ==================== MERGE ORDERS ====================

  // ==================== MERGE & TRANSFER ====================

  // Transfer order to another table
  async transferTable(order_id, new_table_id, transferred_by = null) {
    const order = await OrderModel.findById(order_id);
    if (!order) {
      throw new Error('Order not found');
    }

    // Validate order can be transferred
    if (order.status !== 'pending' && order.status !== 'processing') {
      throw new Error('Cannot transfer table for completed or void orders');
    }

    // Check if new table exists and is active
    const tableCheck = await pool.query(
      `SELECT id, is_active FROM tables WHERE id = $1 AND store_id = $2`,
      [new_table_id, order.store_id]
    );

    if (tableCheck.rows.length === 0) {
      throw new Error('Target table not found');
    }

    const targetTable = tableCheck.rows[0];

    if (!targetTable.is_active) {
      throw new Error('Target table is not active');
    }

    // Allow multiple orders per table - comment out this validation
    // const existingOrder = await pool.query(
    //   `SELECT id FROM orders 
    //    WHERE table_id = $1 
    //    AND status IN ('pending', 'processing') 
    //    AND id != $2`,
    //   [new_table_id, order_id]
    // );

    // if (existingOrder.rows.length > 0) {
    //   throw new Error('Target table already has an active order');
    // }

    // Update order table_id
    await pool.query(
      `UPDATE orders SET table_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [new_table_id, order_id]
    );

    // Get updated order
    const updatedOrder = await OrderModel.findById(order_id);
    return updatedOrder;
  }

  // Merge two orders
  async mergeOrders(target_order_id, source_order_id, merged_by) {
    const targetOrder = await OrderModel.findById(target_order_id);
    const sourceOrder = await OrderModel.findById(source_order_id);

    if (!targetOrder || !sourceOrder) {
      throw new Error('One or both orders not found');
    }

    if (!['pending', 'processing'].includes(targetOrder.status) || !['pending', 'processing'].includes(sourceOrder.status)) {
      throw new Error('Can only merge pending/processing orders');
    }

    if (targetOrder.store_id !== sourceOrder.store_id) {
      throw new Error('Cannot merge orders from different stores');
    }

    console.log('');
    console.log('🔀🔀🔀 MERGE ORDERS DEBUG 🔀🔀🔀');
    console.log('Target Order:', target_order_id, '- Number:', targetOrder.order_number);
    console.log('Target Notes:', targetOrder.notes);
    console.log('Source Order:', source_order_id, '- Number:', sourceOrder.order_number);
    console.log('Source Notes:', sourceOrder.notes);
    
    // If target doesn't have voucher but source does, copy the voucher notes to target
    const targetHasVoucher = targetOrder.notes && targetOrder.notes.includes('Voucher:');
    const sourceHasVoucher = sourceOrder.notes && sourceOrder.notes.includes('Voucher:');
    
    if (!targetHasVoucher && sourceHasVoucher) {
      console.log('📝 Copying voucher notes from source to target...');
      await OrderModel.updateOrderNotes(target_order_id, sourceOrder.notes);
      // Refresh target order data
      const updatedTarget = await OrderModel.findById(target_order_id);
      Object.assign(targetOrder, updatedTarget);
      console.log('✅ Voucher notes copied to target order');
    }
    
    // Check discounts BEFORE merge
    const targetDiscountsBefore = await OrderModel.getOrderDiscounts(target_order_id);
    const sourceDiscountsBefore = await OrderModel.getOrderDiscounts(source_order_id);
    console.log('Target discounts BEFORE merge:', JSON.stringify(targetDiscountsBefore, null, 2));
    console.log('Source discounts BEFORE merge:', JSON.stringify(sourceDiscountsBefore, null, 2));

    // If source has discount, copy it to target BEFORE deleting source
    if (sourceDiscountsBefore && sourceDiscountsBefore.length > 0) {
      console.log('📝 Processing source discounts during merge...');
      
      // IMPORTANT: Copy ALL discounts (including voucher) from source to target
      // Discount amounts are NOT recalculated - keep original amounts from each order
      for (const discount of sourceDiscountsBefore) {
        const newName = `${discount.name} (dari ${sourceOrder.order_number})`;
        await OrderModel.addDiscount({
          order_id: target_order_id,
          order_item_id: discount.order_item_id,
          discount_id: discount.discount_id,
          name: newName,
          type: discount.type,
          value: discount.value,
          amount: discount.amount,
          applied_stage: discount.applied_stage,
          approved_by: discount.approved_by,
          applied_by: discount.applied_by,
        });
        console.log(`✅ Discount copied: ${newName} - Rp ${discount.amount} (NOT recalculated)`);
      }
    }

    // Update discount name for existing target discounts to include source order info (if discount exists)
    if (targetDiscountsBefore && targetDiscountsBefore.length > 0) {
      for (const discount of targetDiscountsBefore) {
        if (discount.name && discount.name.toLowerCase().includes('voucher')) {
          const newName = `${discount.name} (dari ${targetOrder.order_number})`;
          console.log(`📝 Updating discount name to: ${newName}`);
          await OrderModel.updateDiscountName(discount.id, newName);
        }
      }
    }

    // Merge orders
    await OrderModel.mergeOrders(target_order_id, source_order_id, merged_by);
    
    // Check discounts AFTER merge but BEFORE recalculate
    const targetDiscountsAfterMerge = await OrderModel.getOrderDiscounts(target_order_id);
    console.log('Target discounts AFTER merge (before recalc):', JSON.stringify(targetDiscountsAfterMerge, null, 2));

    // Recalculate target order totals
    console.log('🔄 Starting recalculate...');
    await this.recalculateOrderTotals(target_order_id, targetOrder.order_type);

    // Check discounts AFTER recalculate
    const targetDiscountsAfterRecalc = await OrderModel.getOrderDiscounts(target_order_id);
    console.log('Target discounts AFTER recalculate:', JSON.stringify(targetDiscountsAfterRecalc, null, 2));
    console.log('🔀🔀🔀 END MERGE DEBUG 🔀🔀🔀');
    console.log('');

    // Add a small delay to ensure database transaction is fully committed
    await new Promise(resolve => setTimeout(resolve, 100));

    return await this.getFullOrderDetails(target_order_id);
  }

  // ==================== SPLIT PAYMENT ====================

  // Create bills for split payment
  async createSplitBills(order_id, billsData) {
    const order = await OrderModel.findById(order_id);
    if (!order) {
      throw new Error('Order not found');
    }

    if (!['pending', 'processing'].includes(order.status)) {
      throw new Error('Can only split payment for pending/processing orders');
    }

    // billsData format: [{ label, items: [{ order_item_id, qty }] }, ...]
    const createdBills = [];

    for (let i = 0; i < billsData.length; i++) {
      const billData = billsData[i];
      const bill_number = i + 1;

      // Calculate bill totals
      let subtotal = 0;
      const billItems = [];

      for (const billItem of billData.items) {
        const orderItem = await OrderModel.getOrderItemById(billItem.order_item_id);
        if (!orderItem) continue;

        const qty = billItem.qty || orderItem.qty;
        const unit_price = orderItem.unit_price + orderItem.variant_total;
        const line_total = unit_price * qty;

        subtotal += line_total;
        billItems.push({
          order_item_id: billItem.order_item_id,
          qty,
          unit_price,
          line_total,
        });
      }

      // Apply proportional discount
      const discount_ratio = order.discount_total / order.subtotal || 0;
      const discount_total = subtotal * discount_ratio;

      // Apply proportional service charge and tax
      const sc_ratio = order.service_charge_total / (order.subtotal - order.discount_total) || 0;
      const service_charge_total = (subtotal - discount_total) * sc_ratio;

      const tax_ratio = order.tax_total / (order.subtotal - order.discount_total + order.service_charge_total) || 0;
      const tax_total = (subtotal - discount_total + service_charge_total) * tax_ratio;

      const grand_total = Math.round(subtotal - discount_total + service_charge_total + tax_total);
      const rounding = grand_total - (subtotal - discount_total + service_charge_total + tax_total);

      // Create bill
      const billResult = await OrderModel.createBill({
        order_id,
        bill_number,
        label: billData.label || `Bill ${bill_number}`,
        subtotal,
        discount_total,
        service_charge_total,
        tax_total,
        rounding,
        grand_total,
      });

      // Add items to bill
      for (const billItem of billItems) {
        await OrderModel.addBillItem({
          bill_id: billResult.insertId,
          ...billItem,
        });
      }

      createdBills.push(await OrderModel.getBillById(billResult.insertId));
    }

    return createdBills;
  }

  // Get bills with details
  async getOrderBillsWithDetails(order_id) {
    const bills = await OrderModel.getOrderBills(order_id);
    const order = await OrderModel.findById(order_id);
    const taxRules = await TaxModel.findByStore(order.store_id);
    const scRule = taxRules.find((t) => t.code === 'SC' && t.is_active);
    const pb1Rule = taxRules.find((t) => t.code === 'PB1' && t.is_active);

    for (const bill of bills) {
      bill.items = await OrderModel.getBillItems(bill.id);
      bill.payments = await OrderModel.getPayments(order_id, bill.id);
    }
    
    // Check if all order items are assigned to bills
    if (bills.length > 0) {
      const orderItems = await OrderModel.getOrderItems(order_id);
      
      // Get all bill items
      const billItemIds = new Set();
      bills.forEach(bill => {
        bill.items.forEach(item => {
          billItemIds.add(item.order_item_id);
        });
      });
      
      // Find unassigned items
      const unassignedItems = orderItems.filter(item => !billItemIds.has(item.id));
      
      // If there are unassigned items, add them to the last bill
      if (unassignedItems.length > 0) {
        console.log(`⚠️ Found ${unassignedItems.length} unassigned items, adding to last bill`);
        const lastBill = bills[bills.length - 1];
        let addedSubtotal = 0;
        
        for (const unassignedItem of unassignedItems) {
          const billItem = {
            id: require('crypto').randomUUID(),
            bill_id: lastBill.id,
            order_item_id: unassignedItem.id,
            qty: unassignedItem.qty,
            amount: unassignedItem.line_total,
            product_name: unassignedItem.product_name,
            unit_price: unassignedItem.unit_price,
            calculated_unit_price: unassignedItem.unit_price,
          };
          lastBill.items.push(billItem);
          addedSubtotal += parseFloat(unassignedItem.line_total);
        }
        
        // Recalculate totals for the bill
        lastBill.subtotal = parseFloat(lastBill.subtotal) + addedSubtotal;
        const subtotalAfterDiscount = lastBill.subtotal - parseFloat(lastBill.discount_total);
        
        // Recalculate SC
        lastBill.service_charge_total = scRule 
          ? Math.round((subtotalAfterDiscount * scRule.rate) / 100)
          : 0;
        
        // Recalculate PB1
        lastBill.tax_total = pb1Rule 
          ? Math.round(((subtotalAfterDiscount + lastBill.service_charge_total) * pb1Rule.rate) / 100)
          : 0;
        
        // Recalculate grand total
        lastBill.grand_total = subtotalAfterDiscount + lastBill.service_charge_total + lastBill.tax_total;
      }
    }

    return bills;
  }

  // Split bill
  async splitBill(order_id, split_data, split_by) {
    const order = await OrderModel.findById(order_id);
    if (!order) {
      throw new Error('Order not found');
    }

    if (!['pending', 'processing'].includes(order.status)) {
      throw new Error('Can only split pending/processing orders');
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('💰 Starting split bill...');
      console.log('  Order:', order_id);
      console.log('  Split by:', split_by);
      console.log('  Number of splits:', split_data.length);
      for (let j = 0; j < split_data.length; j++) {
        const split = split_data[j];
        console.log(`  Split ${j + 1}:`, {
          label: split.label,
          itemsCount: split.items ? split.items.length : 0,
          items: split.items ? JSON.stringify(split.items, null, 2) : 'N/A',
          amount: split.amount
        });
      }

      // Check if order already has bills (re-split scenario)
      const existingBills = await OrderModel.getOrderBills(order_id);
      if (existingBills.length > 0) {
        console.log(`🗑️  Deleting ${existingBills.length} existing bills for re-split...`);
        
        // Delete existing bill items first
        for (const bill of existingBills) {
          await client.query('DELETE FROM order_bill_items WHERE bill_id = $1', [bill.id]);
        }
        
        // Delete existing bills
        await client.query('DELETE FROM order_bills WHERE order_id = $1', [order_id]);
        console.log('✅ Existing bills deleted');
      }

      // Get tax rules for SC and PB1
      const taxRules = await TaxModel.findByStore(order.store_id);
      const scRule = taxRules.find((t) => t.code === 'SC' && t.is_active);
      const pb1Rule = taxRules.find((t) => t.code === 'PB1' && t.is_active);

      const bills = [];
      
      // Get order discount ratio (if any)
      // If order has discount_total, calculate ratio to apply to each bill
      const orderSubtotal = parseFloat(order.subtotal);
      const orderDiscount = parseFloat(order.discount_total);
      const discountRatio = orderSubtotal > 0 ? orderDiscount / orderSubtotal : 0;
      
      console.log(`💸 Order discount ratio: ${(discountRatio * 100).toFixed(2)}%`);
      
      for (let i = 0; i < split_data.length; i++) {
        const split = split_data[i];
        
        let subtotal = 0;
        let items = [];
        
        if (split_by === 'item') {
          // Get items from split.items (sent by frontend) or split.item_ids (for API compatibility)
          const itemsData = split.items || [];
          console.log(`💳 Split ${i + 1} has ${itemsData.length} items:`, JSON.stringify(itemsData, null, 2));
          for (const itemData of itemsData) {
            const item = await OrderModel.getOrderItemById(itemData.order_detail_id || itemData.order_item_id);
            if (item && item.order_id === order_id) {
              // Override qty and unit_price from frontend
              item.qty = parseInt(itemData.quantity) || 0;
              item.unit_price = parseFloat(itemData.unit_price) || 0;
              item.line_total = item.qty * item.unit_price;
              console.log(`   Item: ${item.product_name}, qty=${item.qty}, unit_price=${item.unit_price}, line_total=${item.line_total}`);
              
              if (item.line_total === 0) {
                console.warn(`⚠️ WARNING: Item has zero line_total! qty=${item.qty}, unit_price=${item.unit_price}`);
              }
              
              subtotal += item.line_total;
              items.push(item);
            } else {
              console.warn(`⚠️ Item not found or order mismatch: order_detail_id=${itemData.order_detail_id}`);
            }
          }
        } else {
          // Manual split by amount
          subtotal = split.amount;
        }
        
        subtotal = Math.round(subtotal);
        
        // Apply discount proportionally to this bill
        let bill_discount = 0;
        if (discountRatio > 0) {
          bill_discount = Math.round(subtotal * discountRatio);
          console.log(`  Bill ${i + 1}: subtotal=${subtotal}, discount=${bill_discount}`);
        }
        
        // Subtotal after discount
        const subtotal_after_discount = subtotal - bill_discount;
        
        // Calculate SC (if dine_in) - based on subtotal AFTER discount
        let service_charge_total = 0;
        if (scRule && order.order_type !== 'take_away') {
          service_charge_total = Math.round((subtotal_after_discount * scRule.rate) / 100);
        }
        
        // Calculate PB1 - based on (subtotal_after_discount + SC)
        let tax_total = 0;
        if (pb1Rule) {
          const base_for_pb1 = subtotal_after_discount + service_charge_total;
          tax_total = Math.round((base_for_pb1 * pb1Rule.rate) / 100);
        }
        
        // Grand total
        const grand_total = subtotal_after_discount + service_charge_total + tax_total;
        
        // Generate bill number (integer for DB, string for display)
        const billNumberInt = i + 1;
        const billNumberDisplay = `${order.order_number}-B${billNumberInt}`;
        
        // Create bill
        const billResult = await client.query(
          `INSERT INTO order_bills 
           (order_id, bill_number, label, subtotal, discount_total, service_charge_total, 
            tax_total, rounding, grand_total, split_from_order_id, split_method, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING id`,
          [
            order_id,
            billNumberInt, // Use integer here
            split.label || `Bill ${billNumberInt}`,
            subtotal, // subtotal BEFORE discount
            bill_discount, // discount applied to this bill
            service_charge_total,
            tax_total,
            0, // rounding
            grand_total,
            order_id,
            split_by,
            'unpaid'
          ]
        );
        
        const billId = billResult.rows[0].id;
        
        // If split by item, assign items to this bill
        if (split_by === 'item') {
          for (const item of items) {
            const itemAmount = item.qty * item.unit_price;
            console.log(`🔍 INSERT order_bill_items: bill_id=${billId}, order_item_id=${item.id}, qty=${item.qty}, amount=${itemAmount}`);
            await client.query(
              `INSERT INTO order_bill_items (bill_id, order_item_id, qty, amount)
               VALUES ($1, $2, $3, $4)`,
              [billId, item.id, item.qty, itemAmount]
            );
          }
        }
        
        bills.push({
          id: billId,
          bill_number: billNumberDisplay, // Return display format
          subtotal,
          service_charge_total,
          tax_total,
          grand_total,
          items: split_by === 'item' ? items.length : 0
        });
        
        console.log(`  ✅ Created bill ${billNumberDisplay}: Rp ${grand_total}`);
      }
      
      await client.query('COMMIT');
      console.log('✅ Split bill completed!\n');
      
      // Mark order as split
      await pool.query(
        'UPDATE orders SET is_split = TRUE WHERE id = $1',
        [order_id]
      );
      
      return bills;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Split bill failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== STATISTICS ====================

  // Get today's order statistics
  async getTodayStatistics(store_id) {
    return await OrderModel.getTodayStatistics(store_id);
  }
}

module.exports = new OrderService();
