import { useAuthStore } from '@/store/authStore'
import styles from './DashboardPage.module.css'

interface StatCard {
  label: string
  value: string
  icon: string
  color: string
  roles: string[]
}

const statCards: StatCard[] = [
  { label: 'Total Store',     value: '—', icon: '🏪', color: '#6366f1', roles: ['superuser'] },
  { label: 'Total User',      value: '—', icon: '👥', color: '#0ea5e9', roles: ['superuser'] },
  { label: 'Total Menu',      value: '—', icon: '🍽️', color: '#f59e0b', roles: ['superuser', 'admin'] },
  { label: 'Total Stok',      value: '—', icon: '📦', color: '#10b981', roles: ['superuser', 'admin'] },
  { label: 'Order Hari Ini',  value: '—', icon: '🧾', color: '#ec4899', roles: ['superuser', 'admin', 'captain'] },
  { label: 'Pendapatan Hari Ini', value: '—', icon: '💰', color: '#f59e0b', roles: ['superuser', 'admin'] },
  { label: 'Order Pending',   value: '—', icon: '⏳', color: '#f97316', roles: ['captain', 'kitchen'] },
  { label: 'Voucher Aktif',   value: '—', icon: '🎟️', color: '#a855f7', roles: ['superuser', 'admin'] },
]

const quickLinks = [
  { label: 'Kelola Store',  path: '/stores',     icon: '🏪', roles: ['superuser'] },
  { label: 'Kelola User',   path: '/users',      icon: '👥', roles: ['superuser'] },
  { label: 'Kelola Menu',   path: '/menu',       icon: '🍽️', roles: ['superuser', 'admin'] },
  { label: 'Lihat Orders',  path: '/orders',     icon: '🧾', roles: ['superuser', 'admin', 'captain'] },
  { label: 'Kitchen View',  path: '/kitchen',    icon: '👨‍🍳', roles: ['kitchen'] },
  { label: 'Voucher',       path: '/vouchers',   icon: '🎟️', roles: ['superuser', 'admin'] },
  { label: 'Laporan',       path: '/reports',    icon: '📈', roles: ['superuser', 'admin'] },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const role = user?.role_name ?? ''

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Selamat Pagi' : now.getHours() < 17 ? 'Selamat Siang' : 'Selamat Malam'

  const filteredStats  = statCards.filter(s => s.roles.includes(role))
  const filteredLinks  = quickLinks.filter(l => l.roles.includes(role))

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <p className={styles.greeting}>{greeting},</p>
          <h1 className={styles.title}>{user?.name} 👋</h1>
          <p className={styles.subtitle}>
            Berikut ringkasan aktivitas{role !== 'superuser' && user?.stores?.[0] ? ` di ${user.stores[0].store_name}` : ' sistem'} hari ini.
          </p>
        </div>
        <div className={styles.roleBadge} style={{ background: getRoleColor(role) }}>
          {role}
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {filteredStats.map(card => (
          <div key={card.label} className={styles.statCard}>
            <div className={styles.statIconWrap} style={{ background: `${card.color}20` }}>
              <span className={styles.statIcon}>{card.icon}</span>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{card.value}</span>
              <span className={styles.statLabel}>{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Akses Cepat</h2>
        <div className={styles.quickGrid}>
          {filteredLinks.map(link => (
            <a key={link.path} href={link.path} className={styles.quickCard}>
              <span className={styles.quickIcon}>{link.icon}</span>
              <span className={styles.quickLabel}>{link.label}</span>
              <span className={styles.quickArrow}>→</span>
            </a>
          ))}
        </div>
      </div>

      {/* Activity placeholder */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Aktivitas Terbaru</h2>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📋</span>
          <p>Belum ada aktivitas terbaru.</p>
        </div>
      </div>

    </div>
  )
}

function getRoleColor(role: string) {
  const map: Record<string, string> = {
    superuser: 'rgba(99,102,241,0.2)',
    admin:     'rgba(14,165,233,0.2)',
    captain:   'rgba(245,158,11,0.2)',
    kitchen:   'rgba(16,185,129,0.2)',
  }
  return map[role] ?? 'rgba(255,255,255,0.08)'
}
