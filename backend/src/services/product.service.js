const ProductModel = require('../models/product.model');
const VariantModel = require('../models/variant.model');

class ProductService {
  static async getProductsByStore(store_id) {
    const products = await ProductModel.findByStore(store_id);
    
    for (let product of products) {
      product.variants = await VariantModel.getProductVariants(product.id);
    }
    
    return products;
  }

  static async getPublicMenu(store_id) {
    const products = await ProductModel.findByStore(store_id);
    
    // Filter for active and available products (PostgreSQL uses true/false, not 1/0)
    const activeProducts = products.filter(p => p.is_active && p.is_available);
    
    for (let product of activeProducts) {
      product.variants = await VariantModel.getProductVariants(product.id);
    }
    
    return activeProducts;
  }

  static async getLowStockProducts(store_id) {
    return await ProductModel.findLowStock(store_id);
  }

  static async getProductById(id, store_id) {
    const product = await ProductModel.findById(id);

    if (!product || product.store_id !== store_id) {
      return null;
    }

    product.variants = await VariantModel.getProductVariants(id);

    return product;
  }

  static async createProduct(data) {
    const { store_id, name, price, category_id, stock_qty, created_by, variants } = data;

    if (!name || !category_id || price === undefined) {
      throw new Error('Name, category, and price are required');
    }

    if (price < 0) {
      throw new Error('Price cannot be negative');
    }

    // Check for duplicate name
    const nameExists = await ProductModel.existsByName(store_id, name);
    if (nameExists) {
      throw new Error('Product name already exists in this store');
    }

    const result = await ProductModel.create(data);
    const productId = result.id;

    if (data.track_stock && stock_qty > 0) {
      await ProductModel.addStockMovement({
        store_id,
        product_id: productId,
        type: 'purchase',
        quantity: stock_qty, // Change from qty_change to quantity
        notes: 'Initial stock',
        created_by,
      });
    }

    if (variants && Array.isArray(variants) && variants.length > 0) {
      for (let variantGroup of variants) {
        const { group, options } = variantGroup;
        
        if (group && group.name) {
          await VariantModel.createVariantGroupWithOptions(
            productId,
            group,
            options || []
          );
        }
      }
    }

    const product = await ProductModel.findById(productId);
    product.variants = await VariantModel.getProductVariants(productId);

    return product;
  }

  static async updateProduct(id, store_id, data, user_id) {
    // Add defensive check
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid update data');
    }

    const product = await this.getProductById(id, store_id);

    if (!product) {
      throw new Error('Product not found');
    }

    const { name, price, stock_qty } = data;

    // Validate
    if (name !== undefined && !name) {
      throw new Error('Name cannot be empty');
    }

    if (price !== undefined && price < 0) {
      throw new Error('Price cannot be negative');
    }

    // Check for duplicate name (exclude current product)
    if (name !== undefined && name !== product.name) {
      const nameExists = await ProductModel.existsByName(store_id, name, id);
      if (nameExists) {
        throw new Error('Product name already exists in this store');
      }
    }

    const stockChanged = stock_qty !== undefined && stock_qty !== product.stock_qty;
    const oldStock = product.stock_qty || 0; // Default to 0 if null

    await ProductModel.update(id, {
      category_id: data.category_id !== undefined ? data.category_id : product.category_id,
      sku: data.sku !== undefined ? data.sku : product.sku,
      name: name !== undefined ? name : product.name,
      description: data.description !== undefined ? data.description : product.description,
      image_url: data.image_url !== undefined ? data.image_url : product.image_url,
      price: price !== undefined ? price : product.price,
      cost_price: data.cost_price !== undefined ? data.cost_price : product.cost_price,
      track_stock: data.track_stock !== undefined ? data.track_stock : product.track_stock,
      stock_qty: stock_qty !== undefined ? stock_qty : product.stock_qty,
      min_stock: data.min_stock !== undefined ? data.min_stock : product.min_stock,
      is_available: data.is_available !== undefined ? data.is_available : product.is_available,
      is_active: data.is_active !== undefined ? data.is_active : product.is_active,
      sort_order: data.sort_order !== undefined ? data.sort_order : product.sort_order,
    });

    if (stockChanged && product.track_stock) {
      const qty_change = stock_qty - oldStock;
      await ProductModel.addStockMovement({
        store_id,
        product_id: id,
        type: 'adjustment',
        quantity: qty_change, // Change from qty_change to quantity
        notes: data.stock_notes || 'Stock adjustment',
        created_by: user_id,
      });
    }

    if (data.variants && Array.isArray(data.variants)) {
      await VariantModel.deleteProductVariants(id);
      
      for (let variantGroup of data.variants) {
        const { group, options } = variantGroup;
        
        if (group && group.name && options && options.length > 0) {
          await VariantModel.createVariantGroupWithOptions(
            id,
            group,
            options
          );
        }
      }
    }

    const updatedProduct = await ProductModel.findById(id);
    updatedProduct.variants = await VariantModel.getProductVariants(id);

    return updatedProduct;
  }

  static async adjustStock(id, store_id, data, user_id) {
    const { type, qty_change, notes } = data;
    const product = await this.getProductById(id, store_id);

    if (!product) {
      throw new Error('Product not found');
    }

    if (!product.track_stock) {
      throw new Error('Stock tracking is not enabled for this product');
    }

    if (!qty_change || qty_change === 0) {
      throw new Error('Quantity change is required');
    }

    const newStock = parseFloat(product.stock_qty) + parseFloat(qty_change);

    if (newStock < 0) {
      throw new Error('Insufficient stock');
    }

    await ProductModel.updateStock(id, newStock);

    await ProductModel.addStockMovement({
      store_id,
      product_id: id,
      type: type || 'adjustment',
      qty_change,
      qty_after: newStock,
      notes,
      created_by: user_id,
    });

    return await ProductModel.findById(id);
  }

  static async getStockHistory(id, store_id) {
    const product = await this.getProductById(id, store_id);

    if (!product) {
      throw new Error('Product not found');
    }

    return await ProductModel.getStockHistory(id);
  }

  static async deleteProduct(id, store_id) {
    const product = await this.getProductById(id, store_id);

    if (!product) {
      throw new Error('Product not found');
    }

    const isUsed = await ProductModel.isUsedInOrders(id);
    if (isUsed) {
      throw new Error(
        'Cannot delete product that is used in orders. Set to inactive instead.'
      );
    }

    const hasMovements = await ProductModel.hasStockMovements(id);
    if (hasMovements) {
      throw new Error(
        'Cannot delete product that has stock movement history. Set to inactive instead.'
      );
    }

    await ProductModel.remove(id);
    return true;
  }
}

module.exports = ProductService;
