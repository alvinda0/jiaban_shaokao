import { useAuthStore } from '@/store/authStore'
import styles from './ReportsPage.module.css'
import ProfitLossReport from '@/components/reports/ProfitLossReport'

export default function ReportsPage() {
  const { user, currentStoreId } = useAuthStore()
  
  // Get store ID based on role:
  // - Superuser: from user.stores[0]
  // - Admin/Captain: from currentStoreId or user.store_id
  const storeId = currentStoreId || user?.stores?.[0]?.store_id || user?.store_id

  if (!storeId) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <p>❌ Tidak ada toko yang dipilih.</p>
          <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.5rem' }}>
            Silakan login kembali atau hubungi administrator.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>💹 Laporan Laba/Rugi</h1>
        <p className={styles.subtitle}>Pantau kinerja bisnis Anda dengan laporan terperinci</p>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <ProfitLossReport storeId={storeId} />
      </div>
    </div>
  )
}
