import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

const features = [
  {
    icon: '📱',
    title: 'Order via QR Code',
    desc: 'Customer scan QR di meja, langsung pilih menu tanpa antri ke kasir.',
  },
  {
    icon: '🏪',
    title: 'Multi Store',
    desc: 'Kelola beberapa cabang restoran dalam satu platform terpadu.',
  },
  {
    icon: '🎟️',
    title: 'Voucher & Promo',
    desc: 'Buat promo diskon dan voucher untuk meningkatkan penjualan.',
  },
  {
    icon: '👨‍🍳',
    title: 'Kitchen Display',
    desc: 'Dapur terima notifikasi order real-time tanpa perlu kertas.',
  },
  {
    icon: '📊',
    title: 'Laporan Penjualan',
    desc: 'Monitor performa setiap store dengan laporan lengkap dan akurat.',
  },
  {
    icon: '💳',
    title: 'Multi Pembayaran',
    desc: 'Terima cash, transfer, QRIS, maupun kartu dalam satu transaksi.',
  },
]

const roles = [
  { role: 'Superuser', desc: 'Akses penuh ke semua store dan manajemen global.', color: '#6366f1' },
  { role: 'Admin', desc: 'Kelola menu, stok, voucher, dan laporan per store.', color: '#0ea5e9' },
  { role: 'Captain', desc: 'Proses order meja dan koordinasi pelayanan.', color: '#f59e0b' },
  { role: 'Kitchen', desc: 'Terima dan update status antrian order masuk.', color: '#10b981' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.wrapper}>

      {/* Navbar */}
      <nav className={styles.nav}>
        <span className={styles.navBrand}>🔥 Shaokao POS</span>
        <button className={styles.navBtn} onClick={() => navigate('/login')}>
          Masuk
        </button>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>Sistem POS Restoran Modern</div>
        <h1 className={styles.heroTitle}>
          Kelola Restoran Lebih <span className={styles.heroAccent}>Mudah & Cepat</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Dari order meja via QR Code, manajemen stok, hingga laporan penjualan —
          semua dalam satu platform yang dirancang khusus untuk restoran Anda.
        </p>
        <div className={styles.heroCta}>
          <button className={styles.btnPrimary} onClick={() => navigate('/login')}>
            Mulai Sekarang →
          </button>
          <button className={styles.btnSecondary}>
            Lihat Demo
          </button>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>Multi</span>
            <span className={styles.statLabel}>Store</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>Real-time</span>
            <span className={styles.statLabel}>Order</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>QR Code</span>
            <span className={styles.statLabel}>Menu</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Fitur Lengkap untuk Restoran Anda</h2>
          <p className={styles.sectionSubtitle}>
            Semua yang dibutuhkan untuk operasional restoran modern.
          </p>
        </div>
        <div className={styles.featureGrid}>
          {features.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className={styles.sectionAlt}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Akses Sesuai Peran</h2>
          <p className={styles.sectionSubtitle}>
            Setiap anggota tim punya akses yang tepat sesuai tugasnya.
          </p>
        </div>
        <div className={styles.roleGrid}>
          {roles.map((r) => (
            <div key={r.role} className={styles.roleCard}>
              <div className={styles.roleTag} style={{ background: r.color }}>
                {r.role}
              </div>
              <p className={styles.roleDesc}>{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <h2 className={styles.ctaTitle}>Siap Tingkatkan Operasional Restoran?</h2>
        <p className={styles.ctaSubtitle}>
          Login sekarang dan mulai kelola restoran Anda dengan lebih efisien.
        </p>
        <button className={styles.btnPrimary} onClick={() => navigate('/login')}>
          Login ke Dashboard →
        </button>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2026 Shaokao POS. All rights reserved.</p>
      </footer>

    </div>
  )
}
