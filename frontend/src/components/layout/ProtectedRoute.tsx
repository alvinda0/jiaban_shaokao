import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getMe } from '@/services/auth.service'

export default function ProtectedRoute() {
  const { isAuthenticated, user, setUser, clearAuth, currentStoreId, setCurrentStoreId } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      if (isAuthenticated() && !user) {
        try {
          const res = await getMe()
          setUser(res.data)
          
          // Auto-set currentStoreId untuk non-superuser
          if (res.data.store_id && res.data.role_name !== 'superuser') {
            setCurrentStoreId(res.data.store_id)
          }
        } catch (err) {
          console.error('Failed to fetch user:', err)
          clearAuth()
        }
      } else if (user && !currentStoreId && user.store_id && user.role_name !== 'superuser') {
        // User sudah ada tapi currentStoreId belum di-set
        setCurrentStoreId(user.store_id)
      }
      setLoading(false)
    }

    fetchUser()
  }, [isAuthenticated, user, setUser, clearAuth, currentStoreId, setCurrentStoreId])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        Loading...
      </div>
    )
  }

  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />
}
