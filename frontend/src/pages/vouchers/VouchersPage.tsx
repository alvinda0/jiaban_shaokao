import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  type Voucher,
  type VoucherPayload,
} from '@/services/voucher.service'
import { getStores, type Store } from '@/services/store.service'
import { getProducts, type Product } from '@/services/product.service'
import { useAuthStore } from '@/store/authStore'
import styles from './VouchersPage.module.css'

interface FormState {
  store_id: string
  code: string
  name: string
  description: string
  type: 'discount' | 'bundle'
  discount_type: 'percentage' | 'fixed'
  discount_value: string
  bundle_product_id: string
  bundle_qty: string
  bundle_price: string
  min_purchase: string
  max_discount: string
  usage_limit: string
  usage_per_user: string
  valid_from: string
  valid_until: string
  is_active: number
}

const defaultForm: FormState = {
  store_id: '',
  code: '',
  name: '',
  description: '',
  type: 'discount',
  discount_type: 'percentage',
  discount_value: '',
  bundle_product_id: '',
  bundle_qty: '',
  bundle_price: '',
  min_purchase: '0',
  max_discount: '',
  usage_limit: '',
  usage_per_user: '',
  valid_from: '',
  valid_until: '',
  is_active: 1,
}

export default function VouchersPage() {
  const qc = useQueryClient()
  const currentStoreId = useAuthStore((s) => s.currentStoreId)
  const userRole = useAuthStore((s) => s.user?.role_name)
  const isSuperuser = userRole === 'superuser'
  
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Voucher | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<Voucher | null>(null)

  const { data: vouchersData, isLoading } = useQuery({
    queryKey: ['vouchers', currentStoreId],
    queryFn: () => getVouchers(currentStoreId || undefined),
  })

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: getStores,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', currentStoreId],
    queryFn: () => {
      if (!currentStoreId) return Promise.resolve({ success: false, message: '', data: [] } as any)
      return getProducts(currentStoreId) as Promise<{ success: boolean; message: string; data: Product[] }>
    },
    enabled: !!currentStoreId,
  })

  const vouchers: Voucher[] = vouchersData?.data ?? []
  const stores: Store[] = storesData?.data ?? []
  const products: Product[] = productsData?.data ?? []

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: VoucherPayload) => createVoucher(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] })
      closeModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<VoucherPayload>) =>
      updateVoucher(editTarget!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVoucher(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] })
      setConfirmDelete(null)
    },
  })

  // Handlers
  const openCreate = () => {
    setForm({ ...defaultForm, store_id: currentStoreId || '' })
    setModal('create')
  }

  const openEdit = (voucher: Voucher) => {
    setEditTarget(voucher)
    setForm({
      store_id: voucher.store_id || '',
      code: voucher.code,
      name: voucher.name,
      description: voucher.description || '',
      type: voucher.type,
      discount_type: voucher.discount_type || 'percentage',
      discount_value: voucher.discount_value?.toString() || '',
      bundle_product_id: voucher.bundle_product_id || '',
      bundle_qty: voucher.bundle_qty?.toString() || '',
      bundle_price: voucher.bundle_price?.toString() || '',
      min_purchase: voucher.min_purchase?.toString() || '0',
      max_discount: voucher.max_discount?.toString() || '',
      usage_limit: voucher.usage_limit?.toString() || '',
      usage_per_user: voucher.usage_per_user?.toString() || '',
      valid_from: voucher.valid_from.slice(0, 16),
      valid_until: voucher.valid_until.slice(0, 16),
      is_active: voucher.is_active,
    })
    setModal('edit')
  }

  const closeModal = () => {
    setModal(null)
    setEditTarget(null)
    setForm(defaultForm)
  }

  const handleSubmit = () => {
    const payload: VoucherPayload = {
      store_id: form.store_id || null,
      code: form.code,
      name: form.name,
      description: form.description,
      type: form.type,
      valid_from: form.valid_from,
      valid_until: form.valid_until,
      min_purchase: parseFloat(form.min_purchase) || 0,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
      usage_per_user: form.usage_per_user ? parseInt(form.usage_per_user) : undefined,
      is_active: form.is_active,
    }

    if (form.type === 'discount') {
      payload.discount_type = form.discount_type
      payload.discount_value = parseFloat(form.discount_value)
      if (form.max_discount) {
        payload.max_discount = parseFloat(form.max_discount)
      }
    } else {
      payload.bundle_product_id = form.bundle_product_id
      payload.bundle_qty = parseInt(form.bundle_qty)
      payload.bundle_price = parseFloat(form.bundle_price)
    }

    if (modal === 'create') {
      createMutation.mutate(payload)
    } else {
      updateMutation.mutate(payload)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Voucher</h1>
          <p className={styles.subtitle}>{vouchers.length} voucher</p>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}>
          + Tambah Voucher
        </button>
      </div>

      {isLoading && <div className={styles.loading}>Loading...</div>}

      <div className={styles.grid}>
        {vouchers.map((v) => (
          <div key={v.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.voucherName}>{v.name}</h3>
                <code className={styles.code}>{v.code}</code>
              </div>
              <span
                className={
                  v.is_active ? styles.badgeActive : styles.badgeInactive
                }
              >
                {v.is_active ? 'Aktif' : 'Non-aktif'}
              </span>
            </div>

            <div className={styles.voucherType}>
              {v.type === 'discount' ? (
                <span className={styles.typeDiscount}>
                  💰 Diskon{' '}
                  {v.discount_type === 'percentage'
                    ? `${v.discount_value}%`
                    : `Rp ${Math.round(v.discount_value || 0).toLocaleString('id-ID')}`}
                </span>
              ) : (
                <span className={styles.typeBundle}>
                  🎁 Bundle {v.bundle_qty}x {v.bundle_product_name} → Rp{' '}
                  {Math.round(v.bundle_price || 0).toLocaleString('id-ID')}
                </span>
              )}
            </div>

            {v.description && (
              <p className={styles.description}>{v.description}</p>
            )}

            <div className={styles.validity}>
              📅 {formatDate(v.valid_from)} - {formatDate(v.valid_until)}
            </div>

            <div className={styles.usage}>
              Digunakan: {v.usage_count}
              {v.usage_limit && ` / ${v.usage_limit}`}
            </div>

            <div className={styles.cardActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => openEdit(v)}
              >
                ✏️ Edit
              </button>
              <button
                className={styles.btnDanger}
                onClick={() => setConfirmDelete(v)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {vouchers.length === 0 && !isLoading && (
        <div className={styles.empty}>
          <span>🎟️</span>
          <p>Belum ada voucher. Klik "Tambah Voucher" untuk membuat.</p>
        </div>
      )}

      {/* Modal Create/Edit */}
      {(modal === 'create' || modal === 'edit') && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modal === 'create'
                  ? '✨ Tambah Voucher Baru'
                  : '✏️ Edit Voucher'}
              </h2>
              <button className={styles.btnClose} onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.row}>
                <div className={styles.col}>
                  <label className={styles.label}>Kode Voucher *</label>
                  <input
                    className={styles.input}
                    placeholder="Contoh: DISKON50"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                    }
                    autoFocus
                  />
                </div>
                {isSuperuser && (
                  <div className={styles.col}>
                    <label className={styles.label}>Store (opsional)</label>
                    <select
                      className={styles.select}
                      value={form.store_id}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, store_id: e.target.value }))
                      }
                    >
                      <option value="">Semua Store</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <label className={styles.label}>Nama Voucher *</label>
              <input
                className={styles.input}
                placeholder="Contoh: Diskon 50% Semua Menu"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />

              <label className={styles.label}>Deskripsi</label>
              <textarea
                className={styles.textarea}
                placeholder="Deskripsi voucher"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />

              <label className={styles.label}>Tipe Voucher *</label>
              <div className={styles.radioGroup}>
                <label className={styles.radio}>
                  <input
                    type="radio"
                    checked={form.type === 'discount'}
                    onChange={() =>
                      setForm((f) => ({ ...f, type: 'discount' }))
                    }
                  />
                  <span>💰 Diskon</span>
                </label>
                <label className={styles.radio}>
                  <input
                    type="radio"
                    checked={form.type === 'bundle'}
                    onChange={() => setForm((f) => ({ ...f, type: 'bundle' }))}
                  />
                  <span>🎁 Bundling</span>
                </label>
              </div>

              {form.type === 'discount' && (
                <>
                  <div className={styles.row}>
                    <div className={styles.col}>
                      <label className={styles.label}>Tipe Diskon *</label>
                      <select
                        className={styles.select}
                        value={form.discount_type}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            discount_type: e.target.value as 'percentage' | 'fixed',
                          }))
                        }
                      >
                        <option value="percentage">Persentase (%)</option>
                        <option value="fixed">Nominal (Rp)</option>
                      </select>
                    </div>
                    <div className={styles.col}>
                      <label className={styles.label}>Nilai Diskon *</label>
                      <input
                        type="number"
                        className={styles.input}
                        placeholder={
                          form.discount_type === 'percentage' ? '0-100' : '10000'
                        }
                        value={form.discount_value}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            discount_value: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.col}>
                      <label className={styles.label}>Min. Pembelian</label>
                      <input
                        type="number"
                        className={styles.input}
                        placeholder="0"
                        value={form.min_purchase}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            min_purchase: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className={styles.col}>
                      <label className={styles.label}>Max. Diskon</label>
                      <input
                        type="number"
                        className={styles.input}
                        placeholder="Tanpa batas"
                        value={form.max_discount}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, max_discount: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {form.type === 'bundle' && (
                <>
                  <label className={styles.label}>Produk Bundle *</label>
                  <select
                    className={styles.select}
                    value={form.bundle_product_id}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bundle_product_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">-- Pilih Produk --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Rp {Math.round(p.price).toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>

                  <div className={styles.row}>
                    <div className={styles.col}>
                      <label className={styles.label}>Jumlah Item *</label>
                      <input
                        type="number"
                        className={styles.input}
                        placeholder="5"
                        value={form.bundle_qty}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, bundle_qty: e.target.value }))
                        }
                      />
                    </div>
                    <div className={styles.col}>
                      <label className={styles.label}>Harga Bundle *</label>
                      <input
                        type="number"
                        className={styles.input}
                        placeholder="100000"
                        value={form.bundle_price}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, bundle_price: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              <div className={styles.row}>
                <div className={styles.col}>
                  <label className={styles.label}>Berlaku Dari *</label>
                  <input
                    type="datetime-local"
                    className={styles.input}
                    value={form.valid_from}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valid_from: e.target.value }))
                    }
                  />
                </div>
                <div className={styles.col}>
                  <label className={styles.label}>Berlaku Sampai *</label>
                  <input
                    type="datetime-local"
                    className={styles.input}
                    value={form.valid_until}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valid_until: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.col}>
                  <label className={styles.label}>Limit Penggunaan</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="Unlimited"
                    value={form.usage_limit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, usage_limit: e.target.value }))
                    }
                  />
                </div>
                <div className={styles.col}>
                  <label className={styles.label}>Limit Per User</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="Unlimited"
                    value={form.usage_per_user}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, usage_per_user: e.target.value }))
                    }
                  />
                </div>
              </div>

              {modal === 'edit' && (
                <div className={styles.toggleContainer}>
                  <div className={styles.toggleWrapper}>
                    <div>
                      <div className={styles.toggleTitle}>Status Voucher</div>
                      <div className={styles.toggleDesc}>
                        {form.is_active
                          ? 'Voucher aktif dan dapat digunakan'
                          : 'Voucher tidak aktif'}
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
                  !form.code ||
                  !form.name ||
                  !form.valid_from ||
                  !form.valid_until ||
                  (form.type === 'discount' && !form.discount_value) ||
                  (form.type === 'bundle' &&
                    (!form.bundle_product_id ||
                      !form.bundle_qty ||
                      !form.bundle_price)) ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                onClick={handleSubmit}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? '⏳ Menyimpan...'
                  : modal === 'create'
                  ? '✓ Tambah Voucher'
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
              <h2 className={styles.modalTitle}>Hapus Voucher</h2>
              <button
                className={styles.btnClose}
                onClick={() => setConfirmDelete(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Yakin ingin menghapus voucher{' '}
                <strong>{confirmDelete.name}</strong> (Kode: {confirmDelete.code})?
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
