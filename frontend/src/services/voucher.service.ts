import api from '@/utils/axios'
import type { ApiResponse } from '@/types'

export interface Voucher {
  id: string
  store_id: string | null
  store_name?: string | null
  code: string
  name: string
  description?: string | null
  type: 'discount' | 'bundle'
  discount_type?: 'percentage' | 'fixed' | null
  discount_value?: number | null
  bundle_product_id?: string | null
  bundle_product_name?: string | null
  bundle_qty?: number | null
  bundle_price?: number | null
  min_purchase?: number | null
  max_discount?: number | null
  usage_limit?: number | null
  usage_count: number
  usage_per_user?: number | null
  valid_from: string
  valid_until: string
  is_active: number
  created_at: string
}

export interface VoucherPayload {
  store_id?: string | null
  code: string
  name: string
  description?: string
  type: 'discount' | 'bundle'
  discount_type?: 'percentage' | 'fixed'
  discount_value?: number
  bundle_product_id?: string
  bundle_qty?: number
  bundle_price?: number
  min_purchase?: number
  max_discount?: number
  usage_limit?: number
  usage_per_user?: number
  valid_from: string
  valid_until: string
  is_active?: number
}

export interface ValidateVoucherPayload {
  code: string
  cart: {
    subtotal: number
    items: Array<{
      product_id: string
      quantity: number
    }>
  }
  user_id?: string
}

export interface ValidateVoucherResult {
  voucher: {
    id: string
    code: string
    name: string
    type: string
  }
  discount: number
  bundleApplied: boolean
  bundleItemCount: number
  finalTotal: number
}

export const getVouchers = async (storeId?: string) => {
  const params = storeId ? { store_id: storeId } : {}
  const res = await api.get<ApiResponse<Voucher[]>>('/vouchers', { params })
  return res.data
}

export const getVoucher = async (id: string) => {
  const res = await api.get<ApiResponse<Voucher>>(`/vouchers/${id}`)
  return res.data
}

export const createVoucher = async (payload: VoucherPayload) => {
  const res = await api.post<ApiResponse<Voucher>>('/vouchers', payload)
  return res.data
}

export const updateVoucher = async (id: string, payload: Partial<VoucherPayload>) => {
  const res = await api.put<ApiResponse<Voucher>>(`/vouchers/${id}`, payload)
  return res.data
}

export const deleteVoucher = async (id: string) => {
  const res = await api.delete<ApiResponse<null>>(`/vouchers/${id}`)
  return res.data
}

export const validateVoucher = async (payload: ValidateVoucherPayload) => {
  const res = await api.post<ApiResponse<ValidateVoucherResult>>('/vouchers/validate', payload)
  return res.data
}
