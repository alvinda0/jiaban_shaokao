import api from '@/utils/axios'
import type { ApiResponse } from '@/types'

export interface User {
  id: string
  name: string
  email: string
  role_id: string
  role_name: string
  store_id: string | null
  store_name?: string | null
  is_active: number
  created_at: string
}

export interface Role {
  id: string
  name: string
}

export interface UserPayload {
  name: string
  email: string
  password?: string
  role_id: string
  store_id?: string | null
  is_active?: number
}

export const getUsers = async () => {
  const res = await api.get<ApiResponse<User[]>>('/users')
  return res.data
}

export const getUser = async (id: string) => {
  const res = await api.get<ApiResponse<User>>(`/users/${id}`)
  return res.data
}

export const getRoles = async () => {
  const res = await api.get<ApiResponse<Role[]>>('/users/roles')
  return res.data
}

export const createUser = async (payload: UserPayload) => {
  const res = await api.post<ApiResponse<User>>('/users', payload)
  return res.data
}

export const updateUser = async (id: string, payload: Partial<UserPayload>) => {
  const res = await api.put<ApiResponse<User>>(`/users/${id}`, payload)
  return res.data
}

export const deleteUser = async (id: string) => {
  const res = await api.delete<ApiResponse<null>>(`/users/${id}`)
  return res.data
}
