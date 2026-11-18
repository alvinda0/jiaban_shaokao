import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getStores,
  createStore,
  updateStore,
  deleteStore,
  type Store,
} from '@/services/store.service'
import styles from './StorePage.module.css'

interface FormState {
  name: string
  address: string
  phone: string
  logo_url: string
  is_active: number
}

const defaultForm: FormState = {
  name: '',
  address: '',
  phone: '',
  logo_url: '',
  is_active: 1,
}

export default function StorePage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Store | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<Store | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: getStores,
  })

  const stores: Store[] = data?.data ?? []

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: FormState) => createStore(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] })
      closeModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: FormState) => updateStore(editTarget!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] })
      setConfirmDelete(null)
    },
  })

  // Handlers
  const openCreate = () => {
    setForm(defaultForm)
    setModal('create')
  }

  const openEdit = (store: Store) => {
    setEditTarget(store)
    setForm({
      name: store.name,
      address: store.address || '',
      phone: store.phone || '',
      logo_url: store.logo_url || '',
      is_active: store.is_active,
    })
    setModal('edit')
  }

  const closeModal = () => {
    setModal(null)
    setEditTarget(null)
    setForm(defaultForm)
  }

  const handleSubmit = () => {
    if (modal === 'create') {
      createMutation.mutate(form)
    } else {
      updateMutation.mutate(form)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    const formData = new FormData()
    formData.append('logo', file)

    try {
      const token = useAuthStore.getState().token
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/stores/upload-logo`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      )

      const json = await res.json()

      if (json.success && json.data?.imageUrl) {
        setForm((f) => ({ ...f, logo_url: json.data.imageUrl }))
      } else {
        alert('Gagal upload: ' + (json.message || 'Unknown error'))
      }
    } catch (err) {
      console.error(err)
      alert('Gagal upload logo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Stores</h1>
          <p className={styles.subtitle}>{stores.length} store(s)</p>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}>
          + Tambah Store
        </button>
      </div>

      {isLoading && <div className={styles.loading}>Loading...</div>}

      <div className={styles.grid}>
        {stores.map((store) => (
          <div key={store.id} className={styles.card}>
            {store.logo_url && (
              <img
                src={store.logo_url}
                alt={store.name}
                className={styles.storeLogo}
              />
            )}
            <div className={styles.cardHeader}>
              <h3 className={styles.storeName}>{store.name}</h3>
              <span
                className={
                  store.is_active ? styles.badgeActive : styles.badgeInactive
                }
              >
                {store.is_active ? 'Aktif' : 'Non-aktif'}
              </span>
            </div>

            {store.address && (
              <p className={styles.address}>📍 {store.address}</p>
            )}
            {store.phone && <p className={styles.phone}>📞 {store.phone}</p>}

            <div className={styles.cardActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => openEdit(store)}
              >
                ✏️ Edit
              </button>
              <button
                className={styles.btnDanger}
                onClick={() => setConfirmDelete(store)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {stores.length === 0 && !isLoading && (
        <div className={styles.empty}>
          <span>🏪</span>
          <p>Belum ada store. Klik "Tambah Store" untuk membuat.</p>
        </div>
      )}

      {/* Modal Create/Edit */}
      {(modal === 'create' || modal === 'edit') && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modal === 'create' ? '✨ Tambah Store Baru' : '✏️ Edit Store'}
              </h2>
              <button className={styles.btnClose} onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <label className={styles.label}>Nama Store *</label>
              <input
                className={styles.input}
                placeholder="Contoh: Shaokao Main Store"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />

              <label className={styles.label}>Alamat</label>
              <textarea
                className={styles.textarea}
                placeholder="Alamat lengkap store"
                rows={3}
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
              />

              <label className={styles.label}>No. Telepon</label>
              <input
                className={styles.input}
                placeholder="Contoh: 081234567890"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />

              <label className={styles.label}>Logo Store</label>
              <div className={styles.logoUpload}>
                {form.logo_url && (
                  <img
                    src={form.logo_url}
                    alt="Preview"
                    className={styles.logoPreview}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className={styles.fileInput}
                />
                {uploading && (
                  <span className={styles.uploadingText}>Uploading...</span>
                )}
              </div>

              {modal === 'edit' && (
                <div className={styles.toggleContainer}>
                  <div className={styles.toggleWrapper}>
                    <div>
                      <div className={styles.toggleTitle}>Status Store</div>
                      <div className={styles.toggleDesc}>
                        {form.is_active
                          ? 'Store aktif dan dapat digunakan'
                          : 'Store tidak aktif'}
                      </div>
                    </div>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={form.is_active === 1}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            is_active: e.target.checked ? 1 : 0,
                          }))
                        }
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                  </div>
                </div>
              )}

              {(createMutation.error || updateMutation.error) && (
                <p className={styles.errMsg}>
                  {(createMutation.error as any)?.response?.data?.message ||
                    (updateMutation.error as any)?.response?.data?.message ||
                    (createMutation.error as Error)?.message ||
                    (updateMutation.error as Error)?.message}
                </p>
              )}
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={closeModal}>
                Batal
              </button>
              <button
                className={styles.btnPrimary}
                disabled={
                  !form.name ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                onClick={handleSubmit}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? '⏳ Menyimpan...'
                  : modal === 'create'
                  ? '✓ Tambah Store'
                  : '✓ Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Hapus Store</h2>
              <button
                className={styles.btnClose}
                onClick={() => setConfirmDelete(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Yakin ingin menghapus store{' '}
                <strong>{confirmDelete.name}</strong>?
              </p>

              {deleteMutation.error && (
                <p className={styles.errMsg}>
                  {(deleteMutation.error as any)?.response?.data?.message ||
                    (deleteMutation.error as Error)?.message}
                </p>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => setConfirmDelete(null)}
              >
                Batal
              </button>
              <button
                className={styles.btnDanger}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
              >
                {deleteMutation.isPending ? '⏳ Menghapus...' : '🗑️ Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
