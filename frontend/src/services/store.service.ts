import api from '@/utils/axios'
import type { ApiResponse, Store } from '@/types'

export const getStores = async () => {
  const res = await api.get<ApiResponse<Store[]>>('/stores')
  return res.data
}

export const getStore = async (id: string) => {
  const res = await api.get<ApiResponse<Store>>(`/stores/${id}`)
  return res.data
}

export interface StorePayload {
  name: string
  address?: string
  phone?: string
  logo_url?: string
  is_active?: number
}

export const createStore = async (payload: StorePayload) => {
  const res = await api.post<ApiResponse<Store>>('/stores', payload)
  return res.data
}

export const updateStore = async (id: string, payload: StorePayload) => {
  const res = await api.put<ApiResponse<Store>>(`/stores/${id}`, payload)
  return res.data
}

export const deleteStore = async (id: string) => {
  const res = await api.delete<ApiResponse<null>>(`/stores/${id}`)
  return res.data
}

export type { Store }
