import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUsers,
  getRoles,
  createUser,
  updateUser,
  deleteUser,
  type User,
  type UserPayload,
} from '@/services/user.service'
import { getStores, type Store } from '@/services/store.service'
import styles from './UsersPage.module.css'

interface FormState {
  name: string
  email: string
  password: string
  role_id: string
  store_id: string
  is_active: number
}

const defaultForm: FormState = {
  name: '',
  email: '',
  password: '',
  role_id: '',
  store_id: '',
  is_active: 1,
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  })

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: getStores,
  })

  const users: User[] = usersData?.data ?? []
  const roles = rolesData?.data ?? []
  const stores: Store[] = storesData?.data ?? []

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: UserPayload) => createUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      closeModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<UserPayload>) =>
      updateUser(editTarget!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setConfirmDelete(null)
    },
  })

  // Handlers
  const openCreate = () => {
    setForm(defaultForm)
    setModal('create')
  }

  const openEdit = (user: User) => {
    setEditTarget(user)
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role_id: user.role_id,
      store_id: user.store_id || '',
      is_active: user.is_active,
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
      const payload: UserPayload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role_id: form.role_id,
        store_id: form.store_id || null,
        is_active: form.is_active,
      }
      createMutation.mutate(payload)
    } else {
      const payload: Partial<UserPayload> = {
        name: form.name,
        email: form.email,
        role_id: form.role_id,
        store_id: form.store_id || null,
        is_active: form.is_active,
      }
      // Tambahkan password jika diisi
      if (form.password.trim()) {
        payload.password = form.password
      }
      updateMutation.mutate(payload)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Pengguna</h1>
          <p className={styles.subtitle}>{users.length} pengguna</p>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}>
          + Tambah Pengguna
        </button>
      </div>

      {isLoading && <div className={styles.loading}>Loading...</div>}

      <div className={styles.table}>
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Store</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={styles.badge}>{user.role_name}</span>
                </td>
                <td>{user.store_name || '—'}</td>
                <td>
                  <span
                    className={
                      user.is_active ? styles.badgeActive : styles.badgeInactive
                    }
                  >
                    {user.is_active ? 'Aktif' : 'Non-aktif'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.btnEdit}
                      onClick={() => openEdit(user)}
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.btnDelete}
                      onClick={() => setConfirmDelete(user)}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && !isLoading && (
          <div className={styles.empty}>
            <span>👤</span>
            <p>Belum ada pengguna. Klik "Tambah Pengguna" untuk membuat.</p>
          </div>
        )}
      </div>

      {/* Modal Create/Edit */}
      {(modal === 'create' || modal === 'edit') && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modal === 'create'
                  ? '✨ Tambah Pengguna Baru'
                  : '✏️ Edit Pengguna'}
              </h2>
              <button className={styles.btnClose} onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <label className={styles.label}>Nama *</label>
              <input
                className={styles.input}
                placeholder="Contoh: John Doe"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                autoFocus
              />

              <label className={styles.label}>Email *</label>
              <input
                type="email"
                className={styles.input}
                placeholder="contoh@email.com"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />

              <label className={styles.label}>
                Password {modal === 'edit' ? '(kosongkan jika tidak diubah)' : '*'}
              </label>
              <input
                type="password"
                className={styles.input}
                placeholder={modal === 'create' ? 'Minimal 6 karakter' : 'Isi untuk ubah password'}
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />

              <label className={styles.label}>Role *</label>
              <select
                className={styles.select}
                value={form.role_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role_id: e.target.value }))
                }
              >
                <option value="">-- Pilih Role --</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>

              <label className={styles.label}>Store (opsional)</label>
              <select
                className={styles.select}
                value={form.store_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, store_id: e.target.value }))
                }
              >
                <option value="">-- Tidak ada (Superuser) --</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>

              {modal === 'edit' && (
                <div className={styles.toggleContainer}>
                  <div className={styles.toggleWrapper}>
                    <div>
                      <div className={styles.toggleTitle}>Status Pengguna</div>
                      <div className={styles.toggleDesc}>
                        {form.is_active
                          ? 'Pengguna aktif dan dapat login'
                          : 'Pengguna tidak aktif'}
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
                  !form.email ||
                  !form.role_id ||
                  (modal === 'create' && !form.password) ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                onClick={handleSubmit}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? '⏳ Menyimpan...'
                  : modal === 'create'
                  ? '✓ Tambah Pengguna'
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
              <h2 className={styles.modalTitle}>Hapus Pengguna</h2>
              <button
                className={styles.btnClose}
                onClick={() => setConfirmDelete(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Yakin ingin menghapus pengguna{' '}
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
