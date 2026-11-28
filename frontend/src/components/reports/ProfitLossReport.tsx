import { useState, useEffect } from 'react'
import styles from './ProfitLossReport.module.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface DailyRevenueData {
  date: string
  order_count: number
  total_revenue: number
  subtotal: number
  discount_total: number
  service_charge: number
  tax_total: number
  complimentary_total: number
}

interface TopProduct {
  product_id: string
  product_name: string
  qty_sold: number
  unit_price: number
  sales_value: number
  total_cogs: number
  product_margin: number
  margin_percentage: number
}

interface ProfitLossData {
  period: { date_from: string; date_to: string }
  A_pendapatan: {
    total_subtotal: number
    total_discount: number
    total_service_charge: number
    total_tax: number
    total_revenue: number
    complimentary_amount: number
    total_revenue_with_complimentary: number
    order_count: number
  }
  B_harga_pokok_penjualan: {
    total_cogs: number
    total_items_sold: number
    avg_cogs_per_item: number
  }
  C_laba_kotor: {
    laba_kotor: number
    margin_percentage: number
  }
  D_pengeluaran: {
    discount_given: number
    complimentary: number
    refunds: number
    other_expenses: number
    total_expenses: number
  }
  E_laba_rugi_bersih: {
    laba_rugi_bersih: number
    margin_percentage: number
  }
  product_breakdown: Array<{
    product_name: string
    qty_sold: number
    unit_price: number
    avg_cost_price: number
    sales_value: number
    total_cogs: number
    product_margin: number
    margin_percentage: number
  }>
}

type MainTabType = 'profit-loss' | 'daily-revenue' | 'top-products'
type PLTabType = 'A' | 'B' | 'C' | 'D' | 'E' | 'products'
type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom'

function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return 'IDR 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

// Helper function to format local date without UTC conversion
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(period: PeriodType): { from: string; to: string } {
  const today = new Date()
  let from = new Date()

  switch (period) {
    case 'daily':
      from = new Date(today)
      from.setHours(0, 0, 0, 0)
      break
    case 'weekly':
      from = new Date(today)
      const day = from.getDay()
      from.setDate(from.getDate() - day)
      from.setHours(0, 0, 0, 0)
      break
    case 'monthly':
      from = new Date(today.getFullYear(), today.getMonth(), 1)
      break
    case 'custom':
      break
  }

  return {
    from: formatLocalDate(from),
    to: formatLocalDate(today),
  }
}

interface Props {
  storeId: string
}

export default function ProfitLossReport({ storeId }: Props) {
  const [mainTab, setMainTab] = useState<MainTabType>('profit-loss')
  const [plTab, setPlTab] = useState<PLTabType>('A')
  const [period, setPeriod] = useState<PeriodType>('monthly')

  const [plData, setPlData] = useState<ProfitLossData | null>(null)
  const [drData, setDrData] = useState<DailyRevenueData[]>([])
  const [tpData, setTpData] = useState<TopProduct[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [timeFrom, setTimeFrom] = useState('00:00')
  const [timeTo, setTimeTo] = useState('23:59')

  // Initialize dates
  useEffect(() => {
    const range = getDateRange(period)
    setDateFrom(range.from)
    setDateTo(range.to)
  }, [period])

  // Fetch data
  useEffect(() => {
    if (!dateFrom || !dateTo) return
    fetchAllData()
  }, [dateFrom, dateTo, storeId])

  const fetchAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Token tidak ditemukan. Silakan login kembali.')
        setLoading(false)
        return
      }

      // Adjust dates: subtract 7 hours for UTC+7 timezone
      const fromDate = new Date(`${dateFrom}T00:00:00`);
      fromDate.setHours(fromDate.getHours() - 7);
      const adjustedDateFrom = fromDate.toISOString().split('T')[0];

      const toDate = new Date(`${dateTo}T23:59:59`);
      toDate.setHours(toDate.getHours() - 7);
      const adjustedDateTo = toDate.toISOString().split('T')[0];

      console.log('📊 ProfitLossReport - Date adjustment:', { dateFrom, dateTo, adjustedDateFrom, adjustedDateTo });

      // Fetch profit-loss report
      const plUrl = `${API_BASE_URL}/stores/${storeId}/reports/profit-loss?date_from=${adjustedDateFrom}&date_to=${adjustedDateTo}`
      const plRes = await fetch(plUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (plRes.ok) {
        const plResult = await plRes.json()
        if (plResult.success) setPlData(plResult.data)
      }

      // Fetch daily revenue
      const timeParams = new URLSearchParams()
      timeParams.append('date_from', adjustedDateFrom)
      timeParams.append('date_to', adjustedDateTo)
      if (timeFrom) timeParams.append('time_from', timeFrom)
      if (timeTo) timeParams.append('time_to', timeTo)

      const drUrl = `${API_BASE_URL}/stores/${storeId}/reports/daily-revenue?${timeParams}`
      const drRes = await fetch(drUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (drRes.ok) {
        const drResult = await drRes.json()
        if (drResult.success) setDrData(drResult.data)
      }

      // Fetch top products
      const tpUrl = `${API_BASE_URL}/stores/${storeId}/reports/top-products?${timeParams}&limit=20`
      const tpRes = await fetch(tpUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (tpRes.ok) {
        const tpResult = await tpRes.json()
        if (tpResult.success) setTpData(tpResult.data)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan'
      setError(errorMessage)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}>📊 Memuat laporan...</div>
  }

  if (error) {
    return (
      <div className={styles.error}>
        <span>❌ {error}</span>
        <button onClick={fetchAllData}>🔄 Coba Lagi</button>
      </div>
    )
  }

  if (!plData) {
    return <div className={styles.loading}>📭 Tidak ada data</div>
  }

  const profitMargin = plData.A_pendapatan.total_revenue
    ? ((plData.E_laba_rugi_bersih.laba_rugi_bersih / plData.A_pendapatan.total_revenue) * 100).toFixed(2)
    : 0

  return (
    <div className={styles.report}>
      {/* Period Filter & Time Range */}
      <div className={styles.filterBar}>
        <div className={styles.filterSection}>
          <div>
            <label>Periode:</label>
            <select value={period} onChange={e => setPeriod(e.target.value as PeriodType)} className={styles.select}>
              <option value="daily">📅 Harian</option>
              <option value="weekly">📆 Mingguan</option>
              <option value="monthly">📊 Bulanan</option>
              <option value="custom">🗓️ Custom</option>
            </select>
          </div>

          <div>
            <label>Dari:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className={styles.input}
            />
          </div>

          <div>
            <label>Sampai:</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className={styles.input}
            />
          </div>

          <div>
            <label>Jam Dari (24-jam) *:</label>
            <input
              type="time"
              value={timeFrom}
              onChange={e => setTimeFrom(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div>
            <label>Jam Sampai (24-jam) *:</label>
            <input
              type="time"
              value={timeTo}
              onChange={e => setTimeTo(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <button onClick={fetchAllData} className={styles.refreshBtn}>
            🔄 Muat Ulang
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={`${styles.card} ${styles.revenue}`}>
          <div className={styles.label}>Total Pendapatan</div>
          <div className={styles.value}>{formatCurrency(plData.A_pendapatan.total_revenue)}</div>
          <div className={styles.subtext}>{plData.A_pendapatan.order_count} pesanan</div>
        </div>
        <div className={`${styles.card} ${styles.cogs}`}>
          <div className={styles.label}>PPH</div>
          <div className={styles.value}>{formatCurrency(plData.B_harga_pokok_penjualan.total_cogs)}</div>
          <div className={styles.subtext}>{plData.B_harga_pokok_penjualan.total_items_sold} item</div>
        </div>
        <div className={`${styles.card} ${styles.profit}`}>
          <div className={styles.label}>Laba Kotor</div>
          <div className={styles.value}>{formatCurrency(plData.C_laba_kotor.laba_kotor)}</div>
          <div className={styles.subtext}>{plData.C_laba_kotor.margin_percentage}%</div>
        </div>
        <div className={`${styles.card} ${styles.netProfit}`}>
          <div className={styles.label}>Laba Bersih</div>
          <div className={`${styles.value} ${plData.E_laba_rugi_bersih.laba_rugi_bersih >= 0 ? styles.positive : styles.negative}`}>
            {formatCurrency(plData.E_laba_rugi_bersih.laba_rugi_bersih)}
          </div>
          <div className={styles.subtext}>{profitMargin}%</div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className={styles.mainTabs}>
        <button
          className={`${styles.tab} ${mainTab === 'profit-loss' ? styles.active : ''}`}
          onClick={() => setMainTab('profit-loss')}
        >
          💹 Laba/Rugi
        </button>
        <button
          className={`${styles.tab} ${mainTab === 'daily-revenue' ? styles.active : ''}`}
          onClick={() => setMainTab('daily-revenue')}
        >
          📈 Pendapatan Harian
        </button>
        <button
          className={`${styles.tab} ${mainTab === 'top-products' ? styles.active : ''}`}
          onClick={() => setMainTab('top-products')}
        >
          🏆 Menu Paling Laku
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* PROFIT LOSS TAB */}
        {mainTab === 'profit-loss' && (
          <div>
            <div className={styles.subTabs}>
              <button className={`${styles.tab} ${plTab === 'A' ? styles.active : ''}`} onClick={() => setPlTab('A')}>
                📈 Pendapatan
              </button>
              <button className={`${styles.tab} ${plTab === 'B' ? styles.active : ''}`} onClick={() => setPlTab('B')}>
                📦 Harga Pokok
              </button>
              <button className={`${styles.tab} ${plTab === 'C' ? styles.active : ''}`} onClick={() => setPlTab('C')}>
                💹 Laba Kotor
              </button>
              <button className={`${styles.tab} ${plTab === 'D' ? styles.active : ''}`} onClick={() => setPlTab('D')}>
                💸 Pengeluaran
              </button>
              <button className={`${styles.tab} ${plTab === 'E' ? styles.active : ''}`} onClick={() => setPlTab('E')}>
                ✅ Laba Bersih
              </button>
              <button className={`${styles.tab} ${plTab === 'products' ? styles.active : ''}`} onClick={() => setPlTab('products')}>
                🛍️ Produk
              </button>
            </div>

            {plTab === 'A' && (
              <div className={styles.content}>
                <h3>Pendapatan</h3>
                <div className={styles.metric}>
                  <span>Subtotal Item:</span>
                  <span>{formatCurrency(plData.A_pendapatan.total_subtotal)}</span>
                </div>
                <div className={styles.metric}>
                  <span>Diskon:</span>
                  <span>{formatCurrency(plData.A_pendapatan.total_discount)}</span>
                </div>
                <div className={styles.metric}>
                  <span>Complimentary:</span>
                  <span>{formatCurrency(plData.A_pendapatan.complimentary_amount)}</span>
                </div>
                <div className={styles.metric}>
                  <span>Biaya Layanan:</span>
                  <span>{formatCurrency(plData.A_pendapatan.total_service_charge)}</span>
                </div>
                <div className={styles.metric}>
                  <span>Pajak:</span>
                  <span>{formatCurrency(plData.A_pendapatan.total_tax)}</span>
                </div>
                <div className={`${styles.metric} ${styles.highlight}`}>
                  <span>Total Pendapatan:</span>
                  <span>{formatCurrency(plData.A_pendapatan.total_revenue_with_complimentary)}</span>
                </div>
              </div>
            )}

            {plTab === 'B' && (
              <div className={styles.content}>
                <h3>Harga Pokok Penjualan</h3>
                <div className={styles.metric}>
                  <span>Total Item:</span>
                  <span>{plData.B_harga_pokok_penjualan.total_items_sold}</span>
                </div>
                <div className={styles.metric}>
                  <span>Rata-rata per Item:</span>
                  <span>{formatCurrency(plData.B_harga_pokok_penjualan.avg_cogs_per_item)}</span>
                </div>
                <div className={`${styles.metric} ${styles.highlight}`}>
                  <span>Total PPH:</span>
                  <span>{formatCurrency(plData.B_harga_pokok_penjualan.total_cogs)}</span>
                </div>
              </div>
            )}

            {plTab === 'C' && (
              <div className={styles.content}>
                <h3>Laba Kotor</h3>
                <div className={`${styles.metric} ${styles.highlight}`}>
                  <span>Laba Kotor:</span>
                  <span>{formatCurrency(plData.C_laba_kotor.laba_kotor)}</span>
                </div>
                <div className={styles.metric}>
                  <span>Margin:</span>
                  <span>{plData.C_laba_kotor.margin_percentage}%</span>
                </div>
              </div>
            )}

            {plTab === 'D' && (
              <div className={styles.content}>
                <h3>Pengeluaran</h3>
                <div className={styles.metric}>
                  <span>Diskon Diberikan:</span>
                  <span>{formatCurrency(plData.D_pengeluaran.discount_given)}</span>
                </div>
                <div className={styles.metric}>
                  <span>Complimentary:</span>
                  <span>{formatCurrency(plData.D_pengeluaran.complimentary)}</span>
                </div>
                <div className={styles.metric}>
                  <span>Pengembalian:</span>
                  <span>{formatCurrency(plData.D_pengeluaran.refunds)}</span>
                </div>
                <div className={styles.metric}>
                  <span>Lainnya:</span>
                  <span>{formatCurrency(plData.D_pengeluaran.other_expenses)}</span>
                </div>
                <div className={`${styles.metric} ${styles.highlight}`}>
                  <span>Total Pengeluaran:</span>
                  <span>{formatCurrency(plData.D_pengeluaran.total_expenses)}</span>
                </div>
              </div>
            )}

            {plTab === 'E' && (
              <div className={styles.content}>
                <h3>Laba/Rugi Bersih</h3>
                <div className={`${styles.metric} ${styles.highlight} ${plData.E_laba_rugi_bersih.laba_rugi_bersih >= 0 ? styles.positive : styles.negative}`}>
                  <span>Laba Bersih:</span>
                  <span>{formatCurrency(plData.E_laba_rugi_bersih.laba_rugi_bersih)}</span>
                </div>
                <div className={styles.metric}>
                  <span>Margin:</span>
                  <span>{plData.E_laba_rugi_bersih.margin_percentage}%</span>
                </div>
              </div>
            )}

            {plTab === 'products' && plData.product_breakdown.length > 0 && (
              <div className={styles.content}>
                <h3>Rincian Produk</h3>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>Qty</th>
                        <th>Harga</th>
                        <th>Pokok</th>
                        <th>Penjualan</th>
                        <th>PPH</th>
                        <th>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plData.product_breakdown.map((p, i) => (
                        <tr key={i}>
                          <td className={styles.name}>{p.product_name}</td>
                          <td>{p.qty_sold}</td>
                          <td>{formatCurrency(p.unit_price)}</td>
                          <td>{formatCurrency(p.avg_cost_price)}</td>
                          <td>{formatCurrency(p.sales_value)}</td>
                          <td>{formatCurrency(p.total_cogs)}</td>
                          <td className={p.product_margin >= 0 ? styles.positive : styles.negative}>
                            {formatCurrency(p.product_margin)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DAILY REVENUE TAB */}
        {mainTab === 'daily-revenue' && (
          <div className={styles.content}>
            <h3>Pendapatan Harian</h3>
            {drData.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Pesanan</th>
                      <th>Subtotal Item</th>
                      <th>Diskon</th>
                      <th>Complimentary</th>
                      <th>Biaya Layanan</th>
                      <th>Pajak</th>
                      <th>Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drData.map((row, i) => (
                      <tr key={i}>
                        <td>{row.date}</td>
                        <td>{row.order_count}</td>
                        <td>{formatCurrency(row.subtotal)}</td>
                        <td>{formatCurrency(row.discount_total)}</td>
                        <td>{formatCurrency(row.complimentary_total)}</td>
                        <td>{formatCurrency(row.service_charge)}</td>
                        <td>{formatCurrency(row.tax_total)}</td>
                        <td className={styles.highlight}>{formatCurrency(row.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>📭 Tidak ada data</p>
            )}
          </div>
        )}

        {/* TOP PRODUCTS TAB */}
        {mainTab === 'top-products' && (
          <div className={styles.content}>
            <h3>Menu Paling Laku</h3>
            {tpData.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Menu</th>
                      <th>Qty Terjual</th>
                      <th>Harga Satuan</th>
                      <th>Total Penjualan</th>
                      <th>Total PPH</th>
                      <th>Margin</th>
                      <th>Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tpData.map((row, i) => (
                      <tr key={i}>
                        <td className={styles.name}>{row.product_name}</td>
                        <td>{row.qty_sold}</td>
                        <td>{formatCurrency(row.unit_price)}</td>
                        <td>{formatCurrency(row.sales_value)}</td>
                        <td>{formatCurrency(row.total_cogs)}</td>
                        <td className={row.product_margin >= 0 ? styles.positive : styles.negative}>
                          {formatCurrency(row.product_margin)}
                        </td>
                        <td className={row.margin_percentage >= 0 ? styles.positive : styles.negative}>
                          {row.margin_percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>📭 Tidak ada data</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
