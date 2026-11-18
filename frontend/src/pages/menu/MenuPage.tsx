import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/utils/axios'
import type { MenuItem, MenuVariant } from '@/types'
import styles from './MenuPage.module.css'

const TABLE_TYPE_LABEL: Record<string, string> = {
  regular:  'Meja Reguler',
  takeaway: 'Takeaway',
  floor2:   'Lantai 2',
  vvip:     'VVIP',
}

const formatPrice = (p: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p)

export default function MenuPage() {
  const [params] = useSearchParams()
  const table    = params.get('table') ?? ''
  const store_id = params.get('store_id') ?? ''

  const { data, isLoading, isError } = useQuery({
    queryKey: ['menu', table, store_id],
    queryFn: async () => {
      if (!store_id) throw new Error('Store ID is required');
      // Call a public menu endpoint instead
      const res = await api.get(`/public/menu?store_id=${store_id}&table=${table}`)
      return res.data
    },
    enabled: !!table && !!store_id,
    retry: false,
  })

  const menuData = data

  // ── Error / loading states ────────────────────────────────
  if (!table || !store_id) return <ErrorState icon="🔗" message="QR Code tidak valid. Parameter table atau store_id tidak ditemukan." />
  if (isLoading) return <LoadingState />
  if (isError || !menuData) return <ErrorState icon="⚠️" message="Meja atau store tidak ditemukan. Pastikan QR Code yang kamu scan masih aktif." />

  const { store, table: tableInfo, menu } = menuData
  const categories = Object.keys(menu)

  return (
    <div className={styles.page}>

      {/* Store header */}
      <header className={styles.header}>
        {store.logo && (
          <img src={store.logo} alt={store.name} className={styles.storeLogo} />
        )}
        <div className={styles.storeInfo}>
          <h1 className={styles.storeName}>{store.name}</h1>
          {store.address && <p className={styles.storeAddress}>📍 {store.address}</p>}
        </div>
      </header>

      {/* Table info */}
      <div className={styles.tableInfo}>
        <span className={styles.tableIcon}>🪑</span>
        <div>
          <p className={styles.tableNumber}>Meja {tableInfo.number}</p>
          <p className={styles.tableType}>{TABLE_TYPE_LABEL[tableInfo.type] ?? tableInfo.type}</p>
        </div>
      </div>

      {/* Menu */}
      {categories.length === 0 ? (
        <div className={styles.emptyMenu}>
          <span>🍽️</span>
          <p>Menu belum tersedia saat ini.</p>
        </div>
      ) : (
        <div className={styles.menuContent}>
          {categories.map(category => (
            <section key={category} className={styles.categorySection}>
              <h2 className={styles.categoryTitle}>{category}</h2>
              <div className={styles.productGrid}>
                {menu[category].map((item: MenuItem) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <footer className={styles.footer}>
        <p>Powered by Shaokao POS 🔥</p>
      </footer>
    </div>
  )
}

function ProductCard({ item }: { item: MenuItem }) {
  const minPrice = Math.min(...item.variants.map((v: MenuVariant) => v.price))
  const maxPrice = Math.max(...item.variants.map((v: MenuVariant) => v.price))
  const priceStr = minPrice === maxPrice
    ? formatPrice(minPrice)
    : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`

  return (
    <div className={styles.productCard}>
      {item.image ? (
        <img src={item.image} alt={item.name} className={styles.productImage} />
      ) : (
        <div className={styles.productImagePlaceholder}>🍽️</div>
      )}
      <div className={styles.productBody}>
        <h3 className={styles.productName}>{item.name}</h3>
        {item.description && (
          <p className={styles.productDesc}>{item.description}</p>
        )}
        <p className={styles.productPrice}>{priceStr}</p>
        {item.variants.length > 1 && (
          <div className={styles.variantList}>
            {item.variants.map((v: MenuVariant) => (
              <span key={v.id} className={styles.variantChip}>
                {v.name} · {formatPrice(v.price)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className={styles.statePage}>
      <div className={styles.spinner} />
      <p>Memuat menu...</p>
    </div>
  )
}

function ErrorState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className={styles.statePage}>
      <span className={styles.stateIcon}>{icon}</span>
      <p className={styles.stateMsg}>{message}</p>
    </div>
  )
}
