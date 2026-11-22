import { useAuthStore } from '@/store/authStore'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import StoreSelector from './StoreSelector'
import styles from './Header.module.css'

// Mapping path ke nama halaman
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/profile': 'Profile',
  '/stores': 'Toko',
  '/users': 'Pengguna',
  '/vouchers': 'Voucher',
  '/tables': 'Meja',
  '/categories': 'Kategori Produk',
  '/products': 'Produk',
  '/taxes': 'Pajak',
  '/orders': 'Order',
  '/kitchen': 'Dapur',
  '/reports': 'Laporan',
}

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const role = (user?.role || user?.role_name) ?? ''
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get current page title
  const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard'

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const handleProfile = () => {
    navigate('/profile')
    setIsDropdownOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {/* Page Title */}
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
        
        {/* Store Selector — superuser only */}
        {role === 'superuser' && (
          <div className={styles.storeSelectorWrapper}>
            <StoreSelector />
          </div>
        )}
      </div>

      <div className={styles.right}>
        <div className={styles.userInfoWrapper} ref={dropdownRef}>
          <div 
            className={styles.userInfo}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.avatar}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userDetail}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userRole}>{role}</span>
            </div>
            <div className={styles.chevron}>
              {isDropdownOpen ? '▲' : '▼'}
            </div>
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className={styles.dropdown}>
              <button className={styles.dropdownItem} onClick={handleProfile}>
                <span className={styles.dropdownIcon}>👤</span>
                <span>Profile</span>
              </button>
              <div className={styles.dropdownDivider} />
              <button className={styles.dropdownItem} onClick={handleLogout}>
                <span className={styles.dropdownIcon}>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
