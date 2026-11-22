import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import styles from './DashboardPage.module.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface DashboardData {
  today: {
    order_count: number
    total_revenue: number
    subtotal: number
    discount_total: number
    service_charge: number
    tax_total: number
  }
  this_month: {
    order_count: number
    total_revenue: number
    subtotal: number
    discount_total: number
    service_charge: number
    tax_total: number
  }
  counts: {
    total_stores: number
    total_users: number
    total_menu: number
  }
  weekly_chart: Array<{
    date: string
    day: string
    order_count: number
    revenue: number
    subtotal: number
    discount: number
    service_charge: number
    tax: number
  }>
  top_products_daily: Array<{
    date: string
    day: string
    products: Array<{
      id: string
      name: string
      qty_sold: number
      sales_value: number
    }>
  }>
  payment_methods: Array<{
    name: string
    transaction_count: number
    total_amount: number
  }>
}

interface StatCard {
  label: string
  value: string
  icon: string
  color: string
  roles: string[]
}

const statCards: StatCard[] = [
  { label: 'Total Store', value: '—', icon: '🏪', color: '#6366f1', roles: ['superuser'] },
  { label: 'Total User', value: '—', icon: '👥', color: '#0ea5e9', roles: ['superuser'] },
  { label: 'Total Menu', value: '—', icon: '🍽️', color: '#f59e0b', roles: ['superuser', 'admin'] },
  { label: 'Order Hari Ini', value: '—', icon: '🧾', color: '#ec4899', roles: ['superuser', 'admin', 'captain'] },
  { label: 'Pendapatan Hari Ini', value: '—', icon: '💰', color: '#f59e0b', roles: ['superuser', 'admin'] },
  { label: 'Order Pending', value: '—', icon: '⏳', color: '#f97316', roles: ['captain', 'kitchen'] },
  { label: 'Voucher Aktif', value: '—', icon: '🎟️', color: '#a855f7', roles: ['superuser', 'admin'] },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function DashboardPage() {
  const { user, currentStoreId } = useAuthStore()
  const role = (user?.role || user?.role_name) ?? ''
  const selectedStore = currentStoreId || user?.store_id || ''

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('🔍 Dashboard useEffect:', { selectedStore, role })
    if (!selectedStore) {
      console.log('⚠️ No selectedStore, skipping fetch')
      return
    }
    fetchDashboardData()
  }, [selectedStore])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      console.log('🔑 Token:', token ? 'exists' : 'NOT FOUND')
      
      if (!token) {
        setError('Token tidak ditemukan')
        return
      }

      const url = `${API_BASE_URL}/stores/${selectedStore}/dashboard`
      console.log('📡 Fetching:', url)
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('📊 Response status:', res.status)
      
      if (!res.ok) {
        const text = await res.text()
        console.error('❌ Error response:', text)
        throw new Error(`HTTP ${res.status}: ${text}`)
      }
      
      const result = await res.json()
      console.log('✅ Dashboard data:', result)
      
      if (result.success) {
        console.log('📊 Weekly chart data:', result.data.weekly_chart)
        console.log('🏆 Daily products data:', result.data.top_products_daily)
        setDashboardData(result.data)
        setError(null)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error fetching data'
      console.error('❌ Fetch error:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const filteredStats = statCards.filter(s => s.roles.includes(role))

  // Update stat cards dengan data dari API
  const updatedStats = filteredStats.map(card => {
    if (!dashboardData) return card
    
    switch (card.label) {
      case 'Total Store':
        return { ...card, value: dashboardData.counts.total_stores.toString() }
      case 'Total User':
        return { ...card, value: dashboardData.counts.total_users.toString() }
      case 'Total Menu':
        return { ...card, value: dashboardData.counts.total_menu.toString() }
      case 'Order Hari Ini':
        return { ...card, value: dashboardData.today.order_count.toString() }
      case 'Pendapatan Hari Ini':
        return { ...card, value: formatCurrency(dashboardData.today.total_revenue) }
      default:
        return card
    }
  })

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <span>❌ {error}</span>
          <button onClick={fetchDashboardData}>🔄 Coba Lagi</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Stats */}
      <div className={styles.statsGrid}>
        {updatedStats.map(card => (
          <div key={card.label} className={styles.statCard}>
            <div className={styles.statIconWrap} style={{ background: `${card.color}20` }}>
              <span className={styles.statIcon}>{card.icon}</span>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{loading ? '...' : card.value}</span>
              <span className={styles.statLabel}>{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Revenue Chart */}
      {dashboardData && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>📈 Pendapatan Mingguan</h2>
          <div className={styles.chartWrapper}>
            {dashboardData.weekly_chart.length > 0 ? (
              <div className={styles.barChart}>
                {dashboardData.weekly_chart.map(day => {
                  const maxRevenue = Math.max(...dashboardData.weekly_chart.map(d => d.revenue), 1)
                  const heightPercent = (day.revenue / maxRevenue) * 100
                  return (
                    <div key={day.date} className={styles.barItem}>
                      <div className={styles.barContainer}>
                        <div
                          className={styles.bar}
                          style={{ height: `${heightPercent}%` }}
                          title={`${day.day}: ${formatCurrency(day.revenue)}`}
                        />
                      </div>
                      <div className={styles.barLabel}>
                        <div className={styles.dayName}>{day.day}</div>
                        <div className={styles.barValue}>{formatCurrency(day.revenue)}</div>
                        <div className={styles.barOrders}>{day.order_count} orders</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={styles.emptyDay}>Tidak ada data penjualan minggu ini</div>
            )}
          </div>
        </div>
      )}

      {/* Top Products Daily */}
      {dashboardData && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🏆 Menu Paling Laris (Mingguan)</h2>
          {dashboardData.top_products_daily.length > 0 ? (
            <div className={styles.dailyProductsWrapper}>
              {dashboardData.top_products_daily.map(day => (
                <div key={day.date} className={styles.dailyProductsCard}>
                  <div className={styles.dayHeader}>
                    <h3>{day.day}</h3>
                    <span className={styles.dateSubtitle}>{day.date}</span>
                  </div>
                  <div className={styles.productsList}>
                    {day.products.length > 0 ? (
                      day.products.map((product, idx) => (
                        <div key={product.id} className={styles.productItem}>
                          <span className={styles.productRank}>#{idx + 1}</span>
                          <div className={styles.productInfo}>
                            <div className={styles.productName}>{product.name}</div>
                            <div className={styles.productMeta}>
                              {product.qty_sold} terjual • {formatCurrency(product.sales_value)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.emptyDay}>Tidak ada penjualan</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyDay}>Tidak ada data produk minggu ini</div>
          )}
        </div>
      )}
    </div>
  )
}
