export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface User {
  id: string
  user_id?: string
  name: string
  email: string
  role_name?: string
  role?: string
  is_active: number
  created_at: string
  stores: StoreUser[]
  store_id?: string
}

export interface Store {
  id: string
  name: string
  logo: string | null
  logo_url?: string | null
  address: string | null
  phone: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export interface StoreUser {
  store_id: string
  store_name: string
  store_role: string
}

export type TableType = 'reguler' | 'lantai2' | 'takeaway' | 'vvip'

export interface Table {
  id: string
  store_id: string
  number: string
  type: TableType
  qr_token: string
  qr_url: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export interface TablesGrouped {
  reguler?: Table[]
  lantai2?: Table[]
  takeaway?: Table[]
  vvip?: Table[]
}

export interface TablesResponse {
  tables: Table[]
  grouped: TablesGrouped
}

// ── Menu public ──────────────────────────────────────────────
export interface MenuVariant {
  id: string
  name: string
  price: number
}

export interface MenuItem {
  id: string
  name: string
  description: string | null
  image: string | null
  variants: MenuVariant[]
}

export interface MenuResponse {
  store: {
    id: string
    name: string
    logo: string | null
    address: string | null
    phone: string | null
  }
  table: {
    id: string
    number: string
    type: TableType
  }
  menu: Record<string, MenuItem[]>
}
