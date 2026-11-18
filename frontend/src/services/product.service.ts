import api from '@/utils/axios'
import type { ApiResponse } from '@/types'
import type { VariantGroup } from '@/components/VariantManager'

export interface Product {
  id: string
  store_id: string
  category_id: string
  category_name?: string
  sku: string | null
  name: string
  description: string | null
  image_url: string | null
  price: number
  cost_price: number
  track_stock: number
  stock_qty: number
  min_stock: number
  is_available: number
  is_active: number
  sort_order: number
  created_at: string
  updated_at: string
  variants?: VariantGroup[]
}

export interface StockMovement {
  id: string
  store_id: string
  product_id: string
  type: string
  qty_change: number
  qty_after: number
  notes: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
}

const base = (storeId: string) => `/stores/${storeId}/products`

// Public endpoint - no auth required (for QR code customers)
export const getPublicProducts = async (storeId: string, search?: string) => {
  const res = await api.get<ApiResponse<Product[]>>('/products', {
    params: { store_id: storeId, ...(search && { search }) },
  })
  return res.data
}

export const getProducts = async (storeId: string) => {
  const res = await api.get<ApiResponse<Product[]>>(base(storeId))
  return res.data
}

export const getLowStockProducts = async (storeId: string) => {
  const res = await api.get<ApiResponse<Product[]>>(`${base(storeId)}/low-stock`)
  return res.data
}

export const getProduct = async (storeId: string, id: string) => {
  const res = await api.get<ApiResponse<Product>>(`${base(storeId)}/${id}`)
  return res.data
}

export const getStockHistory = async (storeId: string, id: string) => {
  const res = await api.get<ApiResponse<StockMovement[]>>(`${base(storeId)}/${id}/stock-history`)
  return res.data
}

export const createProduct = async (storeId: string, data: Partial<Product>) => {
  const res = await api.post<ApiResponse<Product>>(base(storeId), data)
  return res.data
}

export const updateProduct = async (storeId: string, id: string, data: Partial<Product>) => {
  const res = await api.put<ApiResponse<Product>>(`${base(storeId)}/${id}`, data)
  return res.data
}

export const adjustStock = async (
  storeId: string,
  id: string,
  data: { type: string; qty_change: number; notes?: string }
) => {
  const res = await api.post<ApiResponse<Product>>(`${base(storeId)}/${id}/adjust-stock`, data)
  return res.data
}

export const deleteProduct = async (storeId: string, id: string) => {
  const res = await api.delete<ApiResponse<null>>(`${base(storeId)}/${id}`)
  return res.data
}
