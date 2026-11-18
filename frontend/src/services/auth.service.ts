import api from '@/utils/axios'
import type { ApiResponse, User } from '@/types'

export const login = async (email: string, password: string) => {
  const res = await api.post<ApiResponse<{ token: string }>>('/auth/login', { email, password })
  return res.data
}

export const getMe = async () => {
  const res = await api.get<ApiResponse<User>>('/auth/me')
  return res.data
}

export const register = async (data: {
  name: string
  email: string
  password: string
  role: string
  store_id: string
}) => {
  const res = await api.post<ApiResponse<User>>('/auth/register', data)
  return res.data
}
