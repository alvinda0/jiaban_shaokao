const VoucherModel = require('../models/voucher.model');

class VoucherService {
  static async getAllVouchers(storeId = null) {
    return await VoucherModel.findAll(storeId);
  }

  static async getVoucherById(id) {
    const voucher = await VoucherModel.findById(id);
    if (!voucher) {
      throw { status: 404, message: 'Voucher not found' };
    }
    return voucher;
  }

  static async createVoucher(data) {
    const existing = await VoucherModel.findByCode(data.code);
    if (existing) {
      throw { status: 400, message: 'Voucher code already exists' };
    }

    if (data.type === 'discount') {
      if (!data.discount_type || !data.discount_value) {
        throw { status: 400, message: 'Discount type and value are required for discount voucher' };
      }
      if (data.discount_type === 'percentage' && (data.discount_value < 0 || data.discount_value > 100)) {
        throw { status: 400, message: 'Percentage discount must be between 0 and 100' };
      }
    } else if (data.type === 'bundle') {
      if (!data.bundle_product_id || !data.bundle_qty || !data.bundle_price) {
        throw { status: 400, message: 'Product, quantity, and price are required for bundle voucher' };
      }
    }

    const result = await VoucherModel.create(data);
    return await VoucherModel.findById(result.insertId);
  }

  static async updateVoucher(id, data) {
    const voucher = await VoucherModel.findById(id);
    if (!voucher) {
      throw { status: 404, message: 'Voucher not found' };
    }

    if (data.code && data.code !== voucher.code) {
      const existing = await VoucherModel.findByCode(data.code);
      if (existing) {
        throw { status: 400, message: 'Voucher code already exists' };
      }
    }

    await VoucherModel.update(id, data);
    return await VoucherModel.findById(id);
  }

  static async deleteVoucher(id) {
    const voucher = await VoucherModel.findById(id);
    if (!voucher) {
      throw { status: 404, message: 'Voucher not found' };
    }

    await VoucherModel.delete(id);
    return { message: 'Voucher deleted successfully' };
  }

 
  static async validateVoucher(code, cart, userId = null, skipMinPurchaseCheck = false) {
    console.log('🔍 VoucherService.validateVoucher called with:', {
      code,
      cart_subtotal: cart?.subtotal,
      cart_items: cart?.items?.length || 0,
      userId,
      skipMinPurchaseCheck
    });

    const voucher = await VoucherModel.findByCode(code);
    
    if (!voucher) {
      throw { status: 404, message: 'Voucher not found' };
    }

    if (!voucher.is_active) {
      throw { status: 400, message: 'Voucher is not active' };
    }

    const now = new Date();
    const validFrom = new Date(voucher.valid_from);
    const validUntil = new Date(voucher.valid_until);

    if (now < validFrom) {
      throw { status: 400, message: 'Voucher not yet valid' };
    }

    if (now > validUntil) {
      throw { status: 400, message: 'Voucher has expired' };
    }

    if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit) {
      throw { status: 400, message: 'Voucher usage limit reached' };
    }

    if (voucher.usage_per_user && userId) {
      const userUsageCount = await VoucherModel.getUserUsageCount(voucher.id, userId);
      if (userUsageCount >= voucher.usage_per_user) {
        throw { status: 400, message: 'You have reached the usage limit for this voucher' };
      }
    }

    // Validate cart data
    if (!cart || typeof cart !== 'object') {
      throw { status: 400, message: 'Invalid cart data' };
    }

    const cartSubtotal = parseFloat(cart.subtotal || 0);
    if (!Number.isFinite(cartSubtotal)) {
      throw { status: 400, message: `Invalid subtotal: ${cart.subtotal}` };
    }

    let discount = 0;
    let bundleApplied = false;
    let bundleItemCount = 0;

    if (voucher.type === 'discount') {
      // Check minimum purchase (skip during recalculation)
      if (!skipMinPurchaseCheck && cartSubtotal < voucher.min_purchase) {
        throw { 
          status: 400, 
          message: `Minimum purchase of Rp ${Math.round(voucher.min_purchase).toLocaleString('id-ID')} required` 
        };
      }

      console.log('💰 Calculating discount:', {
        subtotal: cartSubtotal,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        max_discount: voucher.max_discount,
        skipMinPurchaseCheck
      });

      if (voucher.discount_type === 'percentage') {
        discount = (cartSubtotal * voucher.discount_value) / 100;
        
        console.log('📊 Percentage discount calculated:', discount);
        
        if (voucher.max_discount && discount > voucher.max_discount) {
          console.log('🔒 Applying max_discount limit:', voucher.max_discount);
          discount = voucher.max_discount;
        }
        
        console.log('✅ Final discount amount:', discount);
      } else if (voucher.discount_type === 'fixed') {
        discount = voucher.discount_value;
        
        if (discount > cartSubtotal) {
          discount = cartSubtotal;
        }
      }
    } else if (voucher.type === 'bundle') {
      const bundleItem = cart.items?.find(item => item.product_id === voucher.bundle_product_id);
      
      if (!bundleItem || bundleItem.quantity < voucher.bundle_qty) {
        throw { 
          status: 400, 
          message: `This voucher requires ${voucher.bundle_qty}x ${voucher.bundle_product_name}` 
        };
      }

      const normalPrice = voucher.bundle_product_price * voucher.bundle_qty;
      const bundlePrice = voucher.bundle_price;
      discount = normalPrice - bundlePrice;
      bundleApplied = true;
      bundleItemCount = voucher.bundle_qty;
    }

    // Validate discount
    if (!Number.isFinite(discount)) {
      console.error('❌ Discount is NaN!', {
        discount,
        cartSubtotal,
        voucher_discount_type: voucher.discount_type,
        voucher_discount_value: voucher.discount_value,
        voucher_max_discount: voucher.max_discount
      });
      throw { status: 400, message: `Invalid discount calculation: ${discount}` };
    }

    return {
      voucher: {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name,
        type: voucher.type,
        discount_type: voucher.discount_type,
        bundle_product_id: voucher.bundle_product_id,
        bundle_qty: voucher.bundle_qty,
      },
      discount: Math.round(discount),
      bundleApplied,
      bundleItemCount,
      finalTotal: Math.round(cart.subtotal - discount)
    };
  }
}

module.exports = VoucherService;
