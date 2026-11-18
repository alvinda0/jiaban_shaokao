import api from '@/utils/axios'
import type { ApiResponse } from '@/types'

export interface Category {
  id: string
  store_id: string
  parent_id: string | null
  name: string
  sort_order: number
  is_active: number
  created_at: string
  updated_at: string
  children?: Category[]
}

export interface CategoryTree extends Category {
  children: CategoryTree[]
}

const base = (storeId: string) => `/stores/${storeId}/categories`

// Get all categories (flat list)
export const getCategories = async (storeId: string) => {
  const res = await api.get<ApiResponse<Category[]>>(base(storeId))
  return res.data
}

// Get categories as tree
export const getCategoriesTree = async (storeId: string) => {
  const res = await api.get<ApiResponse<CategoryTree[]>>(`${base(storeId)}?tree=true`)
  return res.data
}

// Get parent categories only
export const getParentCategories = async (storeId: string) => {
  const res = await api.get<ApiResponse<Category[]>>(`${base(storeId)}/parents`)
  return res.data
}

// Get single category
export const getCategory = async (storeId: string, id: string) => {
  const res = await api.get<ApiResponse<Category>>(`${base(storeId)}/${id}`)
  return res.data
}

// Get subcategories
export const getSubcategories = async (storeId: string, parentId: string) => {
  const res = await api.get<ApiResponse<Category[]>>(`${base(storeId)}/${parentId}/subcategories`)
  return res.data
}

// Create category
export const createCategory = async (
  storeId: string,
  data: {
    name: string
    parent_id?: string | null
    sort_order?: number
    is_active?: number
  }
) => {
  const res = await api.post<ApiResponse<Category>>(base(storeId), data)
  return res.data
}

// Update category
export const updateCategory = async (
  storeId: string,
  id: string,
  data: {
    name?: string
    parent_id?: string | null
    sort_order?: number
    is_active?: number
  }
) => {
  const res = await api.put<ApiResponse<Category>>(`${base(storeId)}/${id}`, data)
  return res.data
}

// Delete category
export const deleteCategory = async (storeId: string, id: string) => {
  const res = await api.delete<ApiResponse<null>>(`${base(storeId)}/${id}`)
  return res.data
}
