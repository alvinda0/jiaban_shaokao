import api from '@/utils/axios'
import type { ApiResponse, Table, TablesResponse } from '@/types'

const base = (storeId: string) => `/stores/${storeId}/tables`

// Public endpoint - no auth required (for QR code customers)
export const getPublicTables = async (storeId: string) => {
  const res = await api.get<ApiResponse<TablesResponse>>('/tables', {
    params: { store_id: storeId },
  })
  return res.data
}

export const getTables = async (storeId: string) => {
  const res = await api.get<ApiResponse<TablesResponse>>(base(storeId))
  return res.data
}

export const getTable = async (storeId: string, id: string) => {
  const res = await api.get<ApiResponse<Table>>(`${base(storeId)}/${id}`)
  return res.data
}

export const createTable = async (storeId: string, data: { number: string; type: string; qr_url?: string }) => {
  const res = await api.post<ApiResponse<Table[]>>(base(storeId), data)
  return res.data
}

export const createTablesBulk = async (
  storeId: string,
  tables: { number: string; type: string; qr_url?: string }[]
) => {
  const res = await api.post<ApiResponse<Table[]>>(base(storeId), { tables })
  return res.data
}

export const updateTable = async (
  storeId: string,
  id: string,
  data: { number: string; type: string; qr_url?: string; is_active: number }
) => {
  const res = await api.put<ApiResponse<Table>>(`${base(storeId)}/${id}`, data)
  return res.data
}

export const regenerateQr = async (storeId: string, id: string) => {
  const res = await api.post<ApiResponse<{ qr_token: string }>>(
    `${base(storeId)}/${id}/regenerate-qr`
  )
  return res.data
}

export const deleteTable = async (storeId: string, id: string) => {
  const res = await api.delete<ApiResponse<null>>(`${base(storeId)}/${id}`)
  return res.data
}
