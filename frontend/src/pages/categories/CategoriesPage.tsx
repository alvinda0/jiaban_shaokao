import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getCategoriesTree,
  getParentCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type CategoryTree,
} from '@/services/category.service'
import styles from './CategoriesPage.module.css'

interface FormState {
  name: string
  parent_id: string | null
  sort_order: number
  is_active: number
}

const defaultForm: FormState = {
  name: '',
  parent_id: null,
  sort_order: 0,
  is_active: 1,
}

export default function CategoriesPage() {
  const qc = useQueryClient()
  const { currentStoreId, activeStore } = useAuthStore()
  const storeId = currentStoreId ?? activeStore?.id ?? ''

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null)

  // Queries
  const { data: treeData, isLoading } = useQuery({
    queryKey: ['categories-tree', storeId],
    queryFn: () => getCategoriesTree(storeId),
    enabled: !!storeId,
  })

  const { data: parentsData } = useQuery({
    queryKey: ['categories-parents', storeId],
    queryFn: () => getParentCategories(storeId),
    enabled: !!storeId && (modal === 'create' || modal === 'edit'),
  })

  const tree = treeData?.data ?? []
  const parents = parentsData?.data ?? []

  // Mutations
  const createMutation = useMutation({
    mutationFn: () =>
      createCategory(storeId, {
        name: form.name,
        parent_id: form.parent_id || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories-tree', storeId] })
      qc.invalidateQueries({ queryKey: ['categories-parents', storeId] })
      closeModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCategory(storeId, editTarget!.id, {
        name: form.name,
        parent_id: form.parent_id || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories-tree', storeId] })
      qc.invalidateQueries({ queryKey: ['categories-parents', storeId] })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(storeId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories-tree', storeId] })
      qc.invalidateQueries({ queryKey: ['categories-parents', storeId] })
      setConfirmDelete(null)
    },
  })

  // Handlers
  const openCreate = () => {
    setForm(defaultForm)
    setModal('create')
  }

  const openEdit = (cat: Category) => {
    setEditTarget(cat)
    setForm({
      name: cat.name,
      parent_id: cat.parent_id,
      sort_order: cat.sort_order,
      is_active: cat.is_active,
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

  // Render tree recursively
  const renderTree = (items: CategoryTree[], level = 0) => {
    return items.map((cat) => (
      <div key={cat.id}>
        <div
          className={styles.categoryRow}
          style={{ paddingLeft: `${level * 24}px` }}
        >
          <div className={styles.categoryInfo}>
            {level > 0 && <span className={styles.indent}>└─</span>}
            <span className={styles.categoryName}>{cat.name}</span>
            <span className={styles.sortOrder}>#{cat.sort_order}</span>
            <span
              className={
                cat.is_active ? styles.badgeActive : styles.badgeInactive
              }
            >
              {cat.is_active ? 'Aktif' : 'Non-aktif'}
            </span>
          </div>
          <div className={styles.categoryActions}>
            <button
              className={styles.btnIcon}
              title="Edit"
              onClick={() => openEdit(cat)}
            >
              ✏️
            </button>
            <button
              className={styles.btnIcon}
              title="Hapus"
              onClick={() => setConfirmDelete(cat)}
            >
              🗑️
            </button>
          </div>
        </div>
        {cat.children && cat.children.length > 0 && renderTree(cat.children, level + 1)}
      </div>
    ))
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
          <h1 className={styles.title}>Kategori Produk</h1>
          <p className={styles.subtitle}>{activeStore?.name}</p>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}>
          + Tambah Kategori
        </button>
      </div>

      {isLoading && <div className={styles.loading}>Loading...</div>}

      {/* Category Tree */}
      {tree.length > 0 && (
        <div className={styles.treeContainer}>{renderTree(tree)}</div>
      )}

      {tree.length === 0 && !isLoading && (
        <div className={styles.empty}>
          <span>📦</span>
          <p>Belum ada kategori. Klik "Tambah Kategori" untuk membuat.</p>
        </div>
      )}

      {/* Modal Create/Edit */}
      {(modal === 'create' || modal === 'edit') && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {modal === 'create'
                ? 'Tambah Kategori'
                : `Edit Kategori: ${editTarget?.name}`}
            </h2>

            <label className={styles.label}>Nama Kategori</label>
            <input
              className={styles.input}
              placeholder="Contoh: Makanan, Minuman"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />

            <label className={styles.label}>
              Parent Kategori{' '}
              <span style={{ color: '#6b7280', fontWeight: 400 }}>
                (opsional - kosongkan untuk kategori utama)
              </span>
            </label>
            <select
              className={styles.input}
              value={form.parent_id || ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  parent_id: e.target.value || null,
                }))
              }
            >
              <option value="">-- Kategori Utama --</option>
              {parents
                .filter((p) => p.id !== editTarget?.id) // Prevent self-parent
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>

            <label className={styles.label}>Urutan</label>
            <input
              className={styles.input}
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) =>
                setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))
              }
            />

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
                {(createMutation.error as Error)?.message ||
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
            <h2 className={styles.modalTitle}>Hapus Kategori</h2>
            <p className={styles.modalDesc}>
              Yakin ingin menghapus kategori <strong>{confirmDelete.name}</strong>?
              <br />
              <br />
              <span style={{ color: '#ef4444' }}>
                ⚠️ Kategori yang punya subkategori atau produk tidak bisa
                dihapus.
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
