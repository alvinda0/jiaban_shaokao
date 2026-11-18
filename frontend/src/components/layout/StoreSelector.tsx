import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStores } from '@/services/store.service'
import { useAuthStore } from '@/store/authStore'
import type { Store } from '@/types'
import styles from './StoreSelector.module.css'

export default function StoreSelector() {
  const { activeStore, setActiveStore, setCurrentStoreId } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['stores'],
    queryFn: getStores,
  })

  const stores: Store[] = data?.data ?? []

  // Tutup dropdown klik di luar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (store: Store) => {
    setActiveStore(store)
    setCurrentStoreId(store.id)
    setOpen(false)
  }

  const handleClear = () => {
    setActiveStore(null)
    setCurrentStoreId(null)
    setOpen(false)
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <span className={styles.triggerIcon}>🏪</span>
        <span className={styles.triggerLabel}>
          {activeStore ? activeStore.name : 'Semua Store'}
        </span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {/* Semua store */}
          <button
            className={`${styles.option} ${!activeStore ? styles.optionActive : ''}`}
            onClick={handleClear}
          >
            <span className={styles.optionIcon}>🌐</span>
            <span>Semua Store</span>
            {!activeStore && <span className={styles.check}>✓</span>}
          </button>

          <div className={styles.divider} />

          {stores.length === 0 && (
            <p className={styles.empty}>Belum ada store</p>
          )}

          {stores.map(store => (
            <button
              key={store.id}
              className={`${styles.option} ${activeStore?.id === store.id ? styles.optionActive : ''}`}
              onClick={() => handleSelect(store)}
            >
              {store.logo
                ? <img src={store.logo} alt="" className={styles.storeLogo} />
                : <span className={styles.optionIcon}>🏪</span>
              }
              <div className={styles.storeInfo}>
                <span className={styles.storeName}>{store.name}</span>
                {store.address && (
                  <span className={styles.storeAddress}>{store.address}</span>
                )}
              </div>
              {activeStore?.id === store.id && (
                <span className={styles.check}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
