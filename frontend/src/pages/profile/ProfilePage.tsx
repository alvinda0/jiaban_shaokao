import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement update profile logic
    console.log('Update profile:', formData)
    setIsEditing(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header Card */}
        <div className={styles.headerCard}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarLarge}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className={styles.headerInfo}>
              <h1 className={styles.headerName}>{user?.name}</h1>
              <p className={styles.headerEmail}>{user?.email}</p>
            </div>
          </div>
          <div className={styles.roleBadgeLarge}>
            {user?.role_name}
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.content}>
          {/* Profile Information Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Informasi Profile</h2>
              {!isEditing && (
                <button 
                  className={styles.btnEdit}
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nama</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    className={styles.btnCancel}
                    onClick={() => {
                      setIsEditing(false)
                      setFormData({
                        name: user?.name || '',
                        email: user?.email || '',
                      })
                    }}
                  >
                    Batal
                  </button>
                  <button type="submit" className={styles.btnSave}>
                    Simpan
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Nama Lengkap</span>
                  <span className={styles.infoValue}>{user?.name}</span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>{user?.email}</span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Role</span>
                  <span className={styles.roleBadge}>{user?.role_name}</span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>User ID</span>
                  <span className={styles.infoValue}>{user?.user_id}</span>
                </div>
              </div>
            )}
          </div>

          {/* Account Settings Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Keamanan Akun</h2>
            </div>

            <div className={styles.settingsList}>
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingTitle}>🔐 Ganti Password</span>
                  <span className={styles.settingDesc}>Update password Anda secara berkala</span>
                </div>
                <button className={styles.btnSetting}>
                  Ubah
                </button>
              </div>

              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingTitle}>📱 Two-Factor Authentication</span>
                  <span className={styles.settingDesc}>Tambahkan keamanan ekstra ke akun Anda</span>
                </div>
                <button className={styles.btnSetting}>
                  Aktifkan
                </button>
              </div>

              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingTitle}>🔔 Notifikasi</span>
                  <span className={styles.settingDesc}>Kelola preferensi notifikasi Anda</span>
                </div>
                <button className={styles.btnSetting}>
                  Atur
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
