import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getStore } from '@/services/store.service'
import styles from './Sidebar.module.css'

interface NavItem {
  label: string
  path: string
  icon: string
  roles: string[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard',  path: '/dashboard', icon: '📊', roles: ['superuser', 'admin', 'captain', 'kitchen'] },
  { label: 'Stores',     path: '/stores',    icon: '🏪', roles: ['superuser'] },
  { label: 'Users',      path: '/users',     icon: '👥', roles: ['superuser'] },
  { label: 'Meja',       path: '/tables',    icon: '🪑', roles: ['superuser', 'admin', 'captain'] },
  { label: 'Kategori',   path: '/categories',icon: '🗂️', roles: ['superuser', 'admin', 'captain'] },
  { label: 'Produk',     path: '/products',  icon: '🍽️', roles: ['superuser', 'admin', 'captain'] },
  { label: 'Pajak',      path: '/taxes',     icon: '💰', roles: ['superuser', 'admin', 'captain'] },
  { label: 'Orders',     path: '/orders',    icon: '🧾', roles: ['superuser', 'admin', 'captain'] },
  { label: 'Kitchen',    path: '/kitchen',   icon: '👨‍🍳', roles: ['kitchen'] },
  { label: 'Voucher',    path: '/vouchers',  icon: '🎟️', roles: ['superuser', 'admin', 'captain'] },
  { label: 'Laporan',    path: '/reports',   icon: '💹', roles: ['superuser', 'admin', 'captain'] },
]

export default function Sidebar() {
  const { user, currentStoreId, setCurrentStoreId } = useAuthStore()
  const role = (user?.role || user?.role_name) ?? ''
  const [currentStore, setCurrentStore] = useState<any>(null)

  // Determine logo URL
  let storeLogo = null
  if (user?.store?.logo_url) {
    // For non-superuser: use logo from user.store
    storeLogo = user.store.logo_url
  } else if (currentStore?.logo_url) {
    // For superuser: use logo from currentStore (fetched from API)
    storeLogo = currentStore.logo_url
  }

  console.log('🔍 Sidebar render:', {
    role,
    user_store_logo: user?.store?.logo_url,
    current_store_logo: currentStore?.logo_url,
    final_logo: storeLogo,
  })

  // Auto-set currentStoreId untuk non-superuser yang punya store_id
  useEffect(() => {
    if (user && role !== 'superuser' && user.store_id && !currentStoreId) {
      setCurrentStoreId(user.store_id)
    }
  }, [user, role, currentStoreId, setCurrentStoreId])

  // Fetch current store data for superuser
  useEffect(() => {
    if (currentStoreId && role === 'superuser') {
      getStore(currentStoreId)
        .then((res) => {
          setCurrentStore(res.data)
          console.log('✅ Store fetched:', res.data.name)
        })
        .catch((err) => {
          console.error('❌ Failed to fetch store:', err.message)
        })
    }
  }, [currentStoreId, role])

  const filtered = navItems.filter(item => item.roles.includes(role))

  return (
    <aside className={styles.sidebar}>
      {/* Brand Header */}
      <div className={styles.sidebarHeader}>
        <div className={styles.brand}>
          {storeLogo ? (
            <img src={storeLogo} alt="Store Logo" className={styles.brandIcon} />
          ) : (
            <span className={styles.brandIcon}>🔥</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {filtered.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
