import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Store } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  activeStore: Store | null
  currentStoreId: string | null
  setAuth: (token: string, user?: User) => void
  setUser: (user: User) => void
  clearAuth: () => void
  setActiveStore: (store: Store | null) => void
  setCurrentStoreId: (storeId: string | null) => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      activeStore: null,
      currentStoreId: null,
      setAuth: (token, user) => {
        localStorage.setItem('token', token)
        set({ token, user: user || null })
      },
      setUser: (user) => {
        console.log('setUser called:', { userId: user.id, storeId: user.store_id, role: user.role || user.role_name })
        set({ user })
        // Auto set currentStoreId dari user.store_id jika ada
        if (user.store_id) {
          console.log('Auto-setting currentStoreId:', user.store_id)
          set({ currentStoreId: user.store_id })
        }
      },
      clearAuth: () => {
        localStorage.removeItem('token')
        set({ token: null, user: null, activeStore: null, currentStoreId: null })
      },
      setActiveStore: (store) => set({ activeStore: store }),
      setCurrentStoreId: (storeId) => set({ currentStoreId: storeId }),
      isAuthenticated: () => !!get().token,
    }),
    { name: 'auth-storage' }
  )
)
