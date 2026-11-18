import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast, { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
} from '@/services/product.service'
import { getCategories } from '@/services/category.service'
import SimpleVariantInput, { type SimpleVariant } from '@/components/SimpleVariantInput'
import styles from './ProductsPage.module.css'

interface FormState {
  name: string
  category_id: string
  sku: string
  description: string
  image_url: string
  price: number
  cost_price: number
  track_stock: number
  stock_qty: number
  min_stock: number
  is_available: number
  is_active: number
  sort_order: number
  variants: SimpleVariant[]
}

const defaultForm: FormState = {
  name: '',
  category_id: '',
  sku: '',
  description: '',
  image_url: '',
  price: 0,
  cost_price: 0,
  track_stock: 1, // Wajib track stock
  stock_qty: 0,
  min_stock: 0,
  is_available: 1,
  is_active: 1,
  sort_order: 0,
  variants: [],
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const { currentStoreId, activeStore } = useAuthStore()
  const storeId = currentStoreId ?? activeStore?.id ?? ''

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['products', storeId],
    queryFn: () => getProducts(storeId),
    enabled: !!storeId,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => getCategories(storeId),
    enabled: !!storeId && (modal === 'create' || modal === 'edit'),
  })

  const products = data?.data ?? []
  const categories = categoriesData?.data ?? []

  // Build category tree for dropdown
  const categoryTree: Array<{ id: string; name: string; isChild: boolean }> = []
  
  // Get parents first
  const parents = categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order)
  
  parents.forEach((parent) => {
    // Add parent
    categoryTree.push({ id: parent.id, name: parent.name, isChild: false })
    
    // Add children of this parent
    const children = categories
      .filter((c) => c.parent_id === parent.id)
      .sort((a, b) => a.sort_order - b.sort_order)
    
    children.forEach((child) => {
      categoryTree.push({ id: child.id, name: child.name, isChild: true })
    })
  })

  // Group by category
  const grouped = products.reduce((acc, p) => {
    const cat = p.category_name || 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<string, Product[]>)

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => createProduct(storeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', storeId] })
      toast.success('Produk berhasil ditambahkan!')
      closeModal()
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || 'Gagal menambahkan produk'
      toast.error(errorMsg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: any) => updateProduct(storeId, editTarget!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', storeId] })
      toast.success('Produk berhasil diupdate!')
      closeModal()
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || 'Gagal mengupdate produk'
      toast.error(errorMsg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(storeId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', storeId] })
      toast.success('Produk berhasil dihapus!')
      setConfirmDelete(null)
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || 'Gagal menghapus produk'
      toast.error(errorMsg)
    },
  })

  // Handlers
  const openCreate = () => {
    setForm(defaultForm)
    setModal('create')
  }

  const openEdit = (product: Product) => {
    console.log('Opening edit for product:', product)
    console.log('Product variants:', product.variants)
    
    setEditTarget(product)
    
    // Convert complex variants to simple format - flatten all options
    const simpleVariants: SimpleVariant[] = []
    if (product.variants && Array.isArray(product.variants)) {
      product.variants.forEach(group => {
        if (group.options && Array.isArray(group.options)) {
          group.options.forEach(option => {
            simpleVariants.push({
              name: option.name,
              price_adjustment: option.price_adjustment || 0
            })
          })
        }
      })
    }
    
    console.log('Simple variants:', simpleVariants)
    
    setForm({
      name: product.name,
      category_id: product.category_id,
      sku: product.sku || '',
      description: product.description || '',
      image_url: product.image_url || '',
      price: product.price,
      cost_price: product.cost_price,
      track_stock: product.track_stock ? 1 : 0, // Convert to 1 or 0
      stock_qty: product.stock_qty,
      min_stock: product.min_stock,
      is_available: product.is_available ? 1 : 0,
      is_active: product.is_active ? 1 : 0,
      sort_order: product.sort_order,
      variants: simpleVariants,
    })
    setModal('edit')
  }

  const closeModal = () => {
    setModal(null)
    setEditTarget(null)
    setForm(defaultForm)
  }

  const handleSubmit = () => {
    // Convert simple variants to API format (single group with all options)
    const formattedVariants = form.variants.length > 0 ? [{
      group: {
        name: 'Pilihan',
        is_required: 0,
        min_select: 0,
        max_select: 1,
        sort_order: 0,
      },
      options: form.variants.map((v, index) => ({
        name: v.name,
        price_adjustment: v.price_adjustment,
        is_default: index === 0 ? 1 : 0,
        is_active: 1,
        sort_order: index,
      })),
    }] : undefined

    const payload = {
      ...form,
      variants: formattedVariants,
    }

    if (modal === 'create') {
      createMutation.mutate(payload as any)
    } else {
      updateMutation.mutate(payload as any)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    const formData = new FormData()
    formData.append('image', file)

    try {
      const token = useAuthStore.getState().token
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/stores/${storeId}/products/upload-image`,
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
        setForm((f) => ({ ...f, image_url: json.data.imageUrl }))
      } else {
        alert('Gagal upload: ' + (json.message || 'Unknown error'))
      }
    } catch (err) {
      console.error(err)
      alert('Gagal upload gambar')
    } finally {
      setUploading(false)
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
      <Toaster position="top-right" />
      
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Produk</h1>
          <p className={styles.subtitle}>
            {activeStore?.name} · {products.length} produk
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}>
          + Tambah Produk
        </button>
      </div>

      {isLoading && <div className={styles.loading}>Loading...</div>}

      {/* Products by Category */}
      {Object.keys(grouped).length > 0 &&
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className={styles.categorySection}>
            <h2 className={styles.categoryTitle}>{cat}</h2>
            <div className={styles.grid}>
              {items.map((p) => (
                <div key={p.id} className={styles.card}>
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className={styles.productImage}
                    />
                  )}
                  <div className={styles.cardHeader}>
                    <h3 className={styles.productName}>{p.name}</h3>
                    <span
                      className={
                        p.is_active ? styles.badgeActive : styles.badgeInactive
                      }
                    >
                      {p.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </div>

                  {p.sku && <div className={styles.sku}>SKU: {p.sku}</div>}

                  <div className={styles.price}>
                    Rp {Math.round(p.price).toLocaleString('id-ID')}
                  </div>

                  {p.track_stock === 1 && (
                    <div className={styles.stock}>
                      <span>Stock:</span>
                      <span
                        className={
                          p.stock_qty <= p.min_stock
                            ? styles.stockLow
                            : styles.stockOk
                        }
                      >
                        {Math.round(p.stock_qty)}
                        {p.stock_qty <= p.min_stock && ' ⚠️'}
                      </span>
                    </div>
                  )}

                  <div className={styles.cardActions}>
                    <button
                      className={styles.btnSecondary}
                      onClick={() => openEdit(p)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className={styles.btnDanger}
                      onClick={() => setConfirmDelete(p)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      {products.length === 0 && !isLoading && (
        <div className={styles.empty}>
          <span>🍽️</span>
          <p>Belum ada produk. Klik "Tambah Produk" untuk membuat.</p>
        </div>
      )}

      {/* Modal Create/Edit */}
      {(modal === 'create' || modal === 'edit') && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modal === 'create' ? '✨ Tambah Produk Baru' : `✏️ Edit Produk`}
              </h2>
              <button className={styles.btnClose} onClick={closeModal}>✕</button>
            </div>

            {/* Informasi Dasar */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>📋 Informasi Dasar</h3>
              
              <div className={styles.row}>
                <div>
                  <label className={styles.label}>Nama Produk *</label>
                  <input
                    className={styles.input}
                    placeholder="Contoh: Sate Kambing"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div>
                  <label className={styles.label}>Kategori *</label>
                  <select
                    className={styles.input}
                    value={form.category_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category_id: e.target.value }))
                    }
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categoryTree.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.isChild ? `  └─ ${item.name}` : item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.row}>
                <div>
                  <label className={styles.label}>SKU (opsional)</label>
                  <input
                    className={styles.input}
                    placeholder="Kode produk"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={styles.label}>Deskripsi</label>
                  <input
                    className={styles.input}
                    placeholder="Deskripsi singkat"
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Harga */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>💰 Harga</h3>
              
              <div className={styles.row}>
                <div>
                  <label className={styles.label}>Harga Jual *</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="50000"
                    value={form.price ? Math.round(form.price).toString() : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setForm((f) => ({ ...f, price: parseFloat(value) || 0 }))
                    }}
                  />
                  {form.price > 0 && (
                    <div className={styles.hint}>
                      Rp {Math.round(form.price).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
                <div>
                  <label className={styles.label}>HPP (opsional)</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="30000"
                    value={form.cost_price ? Math.round(form.cost_price).toString() : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setForm((f) => ({ ...f, cost_price: parseFloat(value) || 0 }))
                    }}
                  />
                  {form.cost_price > 0 && (
                    <div className={styles.hint}>
                      Rp {Math.round(form.cost_price).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stok */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>📦 Manajemen Stok</h3>
              
              <label className={styles.checkboxCard}>
                <input
                  type="checkbox"
                  checked={form.track_stock === 1}
                  disabled={true}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, track_stock: e.target.checked ? 1 : 0 }))
                  }
                />
                <div>
                  <span className={styles.checkboxTitle}>Track Stock (Wajib)</span>
                  <span className={styles.checkboxDesc}>
                    Semua produk wajib melacak jumlah stok
                  </span>
                </div>
              </label>

              {form.track_stock === 1 && (
                <div className={styles.row}>
                  <div>
                    <label className={styles.label}>Stock Awal *</label>
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="100"
                      value={form.stock_qty ? Math.round(form.stock_qty).toString() : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        setForm((f) => ({ ...f, stock_qty: parseFloat(value) || 0 }))
                      }}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Min Stock *</label>
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="10"
                      value={form.min_stock ? Math.round(form.min_stock).toString() : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        setForm((f) => ({ ...f, min_stock: parseFloat(value) || 0 }))
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Gambar & Varian */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🖼️ Gambar & Varian</h3>
              
              <div className={styles.imageVariantRow}>
                <div className={styles.imageSection}>
                  <label className={styles.label}>Gambar Produk</label>
                  <div className={styles.imageUpload}>
                    {form.image_url && (
                      <img
                        src={form.image_url}
                        alt="Preview"
                        className={styles.imagePreview}
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className={styles.fileInput}
                    />
                    {uploading && <span className={styles.uploadingText}>Uploading...</span>}
                  </div>
                </div>

                <div className={styles.variantSection}>
                  <SimpleVariantInput
                    variants={form.variants}
                    onChange={(variants) => setForm((f) => ({ ...f, variants }))}
                  />
                </div>
              </div>
            </div>

            {/* Status (hanya untuk edit) */}
            {modal === 'edit' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>⚙️ Status</h3>
                
                <div className={styles.toggleContainer}>
                  <div className={styles.toggleWrapper}>
                    <div>
                      <div className={styles.toggleTitle}>Status Produk</div>
                      <div className={styles.toggleDesc}>
                        {form.is_active ? 'Produk aktif dan dapat dijual' : 'Produk tidak aktif'}
                      </div>
                    </div>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={form.is_active === 1}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, is_active: e.target.checked ? 1 : 0 }))
                        }
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                  </div>
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

            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={closeModal}>
                Batal
              </button>
              <button
                className={styles.btnPrimary}
                disabled={
                  !form.name ||
                  !form.category_id ||
                  form.stock_qty <= 0 ||
                  form.min_stock <= 0 ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                onClick={handleSubmit}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? '⏳ Menyimpan...'
                  : modal === 'create' ? '✓ Tambah Produk' : '✓ Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Hapus Produk</h2>
            <p className={styles.modalDesc}>
              Yakin ingin menghapus <strong>{confirmDelete.name}</strong>?
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
