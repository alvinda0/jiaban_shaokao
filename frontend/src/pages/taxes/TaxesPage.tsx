import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getTaxRules,
  createTaxRule,
  updateTaxRule,
  deleteTaxRule,
  type TaxRule,
} from '@/services/tax.service'
import styles from './TaxesPage.module.css'

interface FormState {
  code: 'PB1' | 'SC'
  name: string
  rate: number
  apply_dine_in: number
  apply_take_away: number
  apply_delivery: number
  include_sc_in_base: number
  is_active: number
}

const defaultForm: FormState = {
  code: 'PB1',
  name: '',
  rate: 0,
  apply_dine_in: 1,
  apply_take_away: 1,
  apply_delivery: 1,
  include_sc_in_base: 0,
  is_active: 1,
}

export default function TaxesPage() {
  const qc = useQueryClient()
  const { currentStoreId, activeStore } = useAuthStore()
  const storeId = currentStoreId ?? activeStore?.id ?? ''

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<TaxRule | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<TaxRule | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['taxes', storeId],
    queryFn: () => getTaxRules(storeId),
    enabled: !!storeId,
  })

  const taxes = data?.data ?? []

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => createTaxRule(storeId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taxes', storeId] })
      closeModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      updateTaxRule(storeId, editTarget!.id, {
        name: form.name,
        rate: form.rate,
        apply_dine_in: form.apply_dine_in,
        apply_take_away: form.apply_take_away,
        apply_delivery: form.apply_delivery,
        include_sc_in_base: form.include_sc_in_base,
        is_active: form.is_active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taxes', storeId] })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxRule(storeId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taxes', storeId] })
      setConfirmDelete(null)
    },
  })

  // Handlers
  const openCreate = () => {
    setForm(defaultForm)
    setModal('create')
  }

  const openEdit = (tax: TaxRule) => {
    setEditTarget(tax)
    setForm({
      code: tax.code,
      name: tax.name,
      rate: tax.rate,
      apply_dine_in: tax.apply_dine_in,
      apply_take_away: tax.apply_take_away,
      apply_delivery: tax.apply_delivery,
      include_sc_in_base: tax.include_sc_in_base,
      is_active: tax.is_active,
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
      createMutation.mutate()
    } else {
      updateMutation.mutate()
    }
  }

  if (!storeId)
    return (
      <div className={styles.noStore}>
        <span>🏪</span>
        <p>Pilih store terlebih dahulu dari sidebar.</p>
      </div>
    )

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Aturan Pajak</h1>
          <p className={styles.subtitle}>{activeStore?.name} · PB1 & Service Charge</p>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}>
          + Tambah Pajak
        </button>
      </div>

      {isLoading && <div className={styles.loading}>Loading...</div>}

      {/* Tax Cards */}
      {taxes.length > 0 && (
        <div className={styles.grid}>
          {taxes.map((tax) => (
            <div key={tax.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.code}>{tax.code}</span>
                  <h3 className={styles.taxName}>{tax.name}</h3>
                </div>
                <span
                  className={
                    tax.is_active ? styles.badgeActive : styles.badgeInactive
                  }
                >
                  {tax.is_active ? 'Aktif' : 'Non-aktif'}
                </span>
              </div>

              <div className={styles.rate}>{tax.rate}%</div>

              <div className={styles.applies}>
                <div className={styles.applyRow}>
                  <span>Dine In:</span>
                  <span className={tax.apply_dine_in ? styles.yes : styles.no}>
                    {tax.apply_dine_in ? '✓ Ya' : '✗ Tidak'}
                  </span>
                </div>
                <div className={styles.applyRow}>
                  <span>Take Away:</span>
                  <span
                    className={tax.apply_take_away ? styles.yes : styles.no}
                  >
                    {tax.apply_take_away ? '✓ Ya' : '✗ Tidak'}
                  </span>
                </div>
                <div className={styles.applyRow}>
                  <span>Delivery:</span>
                  <span className={tax.apply_delivery ? styles.yes : styles.no}>
                    {tax.apply_delivery ? '✓ Ya' : '✗ Tidak'}
                  </span>
                </div>
                {tax.code === 'PB1' && (
                  <div className={styles.applyRow}>
                    <span>Include SC in base:</span>
                    <span
                      className={tax.include_sc_in_base ? styles.yes : styles.no}
                    >
                      {tax.include_sc_in_base ? '✓ Ya' : '✗ Tidak'}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.cardActions}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => openEdit(tax)}
                >
                  ✏️ Edit
                </button>
                <button
                  className={styles.btnDanger}
                  onClick={() => setConfirmDelete(tax)}
                >
                  🗑️ Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {taxes.length === 0 && !isLoading && (
        <div className={styles.empty}>
          <span>💰</span>
          <p>Belum ada aturan pajak. Klik "Tambah Pajak" untuk membuat.</p>
        </div>
      )}

      {/* Modal Create/Edit */}
      {(modal === 'create' || modal === 'edit') && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {modal === 'create' ? 'Tambah Pajak' : `Edit: ${editTarget?.name}`}
            </h2>

            {modal === 'create' && (
              <>
                <label className={styles.label}>Kode Pajak</label>
                <div className={styles.codeGrid}>
                  {(['PB1', 'SC'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.codeBtn} ${
                        form.code === c ? styles.codeBtnActive : ''
                      }`}
                      onClick={() => setForm((f) => ({ ...f, code: c }))}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}

            <label className={styles.label}>Nama Pajak</label>
            <input
              className={styles.input}
              placeholder="Contoh: PB1, Service Charge"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />

            <label className={styles.label}>Rate (%)</label>
            <input
              className={styles.input}
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.rate}
              onChange={(e) =>
                setForm((f) => ({ ...f, rate: parseFloat(e.target.value) || 0 }))
              }
            />

            <label className={styles.label}>Berlaku Untuk:</label>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={form.apply_dine_in === 1}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      apply_dine_in: e.target.checked ? 1 : 0,
                    }))
                  }
                />
                <span>Dine In</span>
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={form.apply_take_away === 1}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      apply_take_away: e.target.checked ? 1 : 0,
                    }))
                  }
                />
                <span>Take Away</span>
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={form.apply_delivery === 1}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      apply_delivery: e.target.checked ? 1 : 0,
                    }))
                  }
                />
                <span>Delivery</span>
              </label>
            </div>

            {form.code === 'PB1' && (
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={form.include_sc_in_base === 1}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        include_sc_in_base: e.target.checked ? 1 : 0,
                      }))
                    }
                  />
                  <span>Include SC in base (PB1 dihitung dari subtotal + SC)</span>
                </label>
              </div>
            )}

            {modal === 'edit' && (
              <>
                <label className={styles.label}>Status</label>
                <div className={styles.statusGrid}>
                  {[1, 0].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`${styles.statusBtn} ${
                        form.is_active === v ? styles.statusBtnActive : ''
                      }`}
                      onClick={() => setForm((f) => ({ ...f, is_active: v }))}
                    >
                      {v ? 'Aktif' : 'Non-aktif'}
                    </button>
                  ))}
                </div>
              </>
            )}

            {(createMutation.error || updateMutation.error) && (
              <p className={styles.errMsg}>
                {(createMutation.error as any)?.response?.data?.message ||
                  (updateMutation.error as any)?.response?.data?.message ||
                  (createMutation.error as Error)?.message ||
                  (updateMutation.error as Error)?.message}
              </p>
            )}

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
                  ? 'Menyimpan...'
                  : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Hapus Pajak</h2>
            <p className={styles.modalDesc}>
              Yakin ingin menghapus pajak <strong>{confirmDelete.name}</strong>?
              <br />
              <br />
              <span style={{ color: '#ef4444' }}>
                ⚠️ Pajak yang sudah digunakan di order tidak bisa dihapus. Set
                ke non-aktif saja.
              </span>
            </p>

            {deleteMutation.error && (
              <p className={styles.errMsg}>
                {(deleteMutation.error as any)?.response?.data?.message ||
                  (deleteMutation.error as Error)?.message}
              </p>
            )}

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
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
