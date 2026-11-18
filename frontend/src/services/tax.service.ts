import api from '@/utils/axios'
import type { ApiResponse } from '@/types'

export interface TaxRule {
  id: string
  store_id: string
  code: 'PB1' | 'SC'
  name: string
  rate: number
  apply_dine_in: number
  apply_take_away: number
  apply_delivery: number
  include_sc_in_base: number
  is_active: number
  created_at: string
  updated_at: string
}

const base = (storeId: string) => `/stores/${storeId}/taxes`

// Public endpoint - no auth required (for QR code customers)
export const getPublicTaxRules = async (storeId: string) => {
  const res = await api.get<ApiResponse<TaxRule[]>>(`/public/stores/${storeId}/taxes`)
  return res.data
}

// Get all tax rules
export const getTaxRules = async (storeId: string) => {
  const res = await api.get<ApiResponse<TaxRule[]>>(base(storeId))
  return res.data
}

// Get single tax rule
export const getTaxRule = async (storeId: string, id: string) => {
  const res = await api.get<ApiResponse<TaxRule>>(`${base(storeId)}/${id}`)
  return res.data
}

// Create tax rule
export const createTaxRule = async (
  storeId: string,
  data: {
    code: 'PB1' | 'SC'
    name: string
    rate: number
    apply_dine_in?: number
    apply_take_away?: number
    apply_delivery?: number
    include_sc_in_base?: number
    is_active?: number
  }
) => {
  const res = await api.post<ApiResponse<TaxRule>>(base(storeId), data)
  return res.data
}

// Update tax rule
export const updateTaxRule = async (
  storeId: string,
  id: string,
  data: {
    name?: string
    rate?: number
    apply_dine_in?: number
    apply_take_away?: number
    apply_delivery?: number
    include_sc_in_base?: number
    is_active?: number
  }
) => {
  const res = await api.put<ApiResponse<TaxRule>>(`${base(storeId)}/${id}`, data)
  return res.data
}

// Delete tax rule
export const deleteTaxRule = async (storeId: string, id: string) => {
  const res = await api.delete<ApiResponse<null>>(`${base(storeId)}/${id}`)
  return res.data
}
