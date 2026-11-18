import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { useAuthStore } from '@/store/authStore'
import {
  getTables, createTable, createTablesBulk, updateTable,
  deleteTable, regenerateQr,
} from '@/services/table.service'
import type { Table } from '@/types'
import styles from './TablesPage.module.css'

const TYPE_LABELS: Record<string, string> = {
  reguler:  'Reguler (Lantai 1)',
  lantai2:  'Lantai 2',
  takeaway: 'Takeaway',
  vvip:     'VVIP',
}

const TYPE_COLORS: Record<string, string> = {
  reguler:  '#6366f1',
  lantai2:  '#f59e0b',
  takeaway: '#0ea5e9',
  vvip:     '#a855f7',
}

const TYPE_ORDER: string[] = ['reguler', 'lantai2', 'takeaway', 'vvip']

// ── Single form ──────────────────────────────────────────────
interface FormState {
  number: string
  type: string        // 'reguler' | 'lantai2' | 'takeaway' | 'vvip'
  baseUrl: string     // base URL tanpa params
  qr_url: string      // final URL yang disimpan
  is_active: number
}
const defaultForm: FormState = { number: '', type: 'reguler', baseUrl: '', qr_url: '', is_active: 1 }

// Build QR URL dari base + number + store_id
function buildQrUrl(base: string, number: string, storeId: string): string {
  if (!base || !number) return ''
  try {
    const url = new URL(base)
    url.searchParams.set('table', number)
    url.searchParams.set('store_id', storeId)
    return url.toString()
  } catch {
    return ''
  }
}

// ── Generate form ─────────────────────────────────────────────
interface GenForm {
  prefix: string      // A, B, TA, V
  startNum: number    // nomor awal
  count: number       // jumlah meja
  type: string        // 'reguler' | 'lantai2' | 'takeaway' | 'vvip'
  qrUrlTemplate: string // misal https://domain.com/?table={number}&store_id={store_id}
}
const defaultGen: GenForm = {
  prefix: 'A', startNum: 1, count: 5, type: 'reguler', qrUrlTemplate: '',
}

// Parsing: pisahkan prefix huruf dan nomor akhir
// A1 → prefix=A, num=1 | TA3 → prefix=TA, num=3
function parseTableNumber(s: string): { prefix: string; num: number } | null {
  const m = s.match(/^([A-Za-z]+)(\d+)$/)
  if (!m) return null
  return { prefix: m[1].toUpperCase(), num: parseInt(m[2]) }
}

export default function TablesPage() {
  const qc = useQueryClient()
  const { currentStoreId, user } = useAuthStore()
  const userRole = user?.role_name ?? ''
  const isSuperuser = userRole === 'superuser'
  const storeId = currentStoreId ?? ''

  const [modal, setModal] = useState<'create' | 'generate' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Table | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [gen, setGen] = useState<GenForm>(defaultGen)
  const [confirmDelete, setConfirmDelete] = useState<Table | null>(null)
  const [qrView, setQrView] = useState<Table | null>(null)
  const qrRef = useRef<SVGSVGElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['tables', storeId],
    queryFn: () => getTables(storeId),
    enabled: !!storeId,
  })

  const allTables = data?.data?.tables ?? []

  // Preview meja yang akan di-generate
  const generatedPreview = useMemo(() => {
    if (!gen.prefix || gen.count < 1 || gen.count > 100) return []
    return Array.from({ length: gen.count }, (_, i) => {
      const num = gen.startNum + i
      const number = `${gen.prefix.toUpperCase()}${num}`
      const qr_url = gen.qrUrlTemplate
        ? buildQrUrl(gen.qrUrlTemplate, number, storeId)
        : undefined
      return { number, type: gen.type, qr_url }
    })
  }, [gen, storeId])

  // ── Mutations ─────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () => {
      const qr_url = buildQrUrl(form.baseUrl, form.number, storeId) || form.qr_url || undefined
      return createTable(storeId, { number: form.number, type: form.type, qr_url })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', storeId] }); closeModal() },
  })

  const generateMutation = useMutation({
    mutationFn: () => createTablesBulk(storeId, generatedPreview),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', storeId] }); closeModal() },
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      const qr_url = buildQrUrl(form.baseUrl, form.number, storeId) || form.qr_url || undefined
      return updateTable(storeId, editTarget!.id, {
        number: form.number, type: form.type, qr_url, is_active: form.is_active,
      })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', storeId] }); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTable(storeId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', storeId] }); setConfirmDelete(null) },
  })

  const regenMutation = useMutation({
    mutationFn: (id: string) => regenerateQr(storeId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables', storeId] }),
  })

  // ── Handlers ─────────────────────────────────────────────
  const openCreate = () => { setForm(defaultForm); setModal('create') }
  const openGenerate = () => { setGen(defaultGen); setModal('generate') }
  const openEdit = (t: Table) => {
    setEditTarget(t)
    // Extract base URL (tanpa query params) dari qr_url yang tersimpan
    let baseUrl = ''
    if (t.qr_url) {
      try {
        const u = new URL(t.qr_url)
        u.searchParams.delete('table')
        u.searchParams.delete('store_id')
        baseUrl = u.searchParams.toString()
          ? `${u.origin}${u.pathname}?${u.searchParams.toString()}`
          : `${u.origin}${u.pathname}`
      } catch { baseUrl = t.qr_url }
    }
    setForm({ 
      number: t.number, 
      type: t.type || 'reguler',
      baseUrl, 
      qr_url: t.qr_url ?? '', 
      is_active: t.is_active 
    })
    setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditTarget(null); setForm(defaultForm); setGen(defaultGen) }

  // Auto-fill prefix & nomor awal dari input nomor meja
  const handleNumberBlur = () => {
    const parsed = parseTableNumber(form.number)
    if (parsed) {
      setGen(g => ({ ...g, prefix: parsed.prefix, startNum: parsed.num }))
    }
  }

  const downloadQr = () => {
    if (!qrRef.current || !qrView) return
    const svg = qrRef.current
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const size = 300
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      const a = document.createElement('a')
      a.download = `QR-${qrView.number}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  if (!storeId) return (
    <div className={styles.noStore}>
      <span>🏪</span>
      {isSuperuser ? (
        <p>Pilih store spesifik dari sidebar untuk mengelola meja.</p>
      ) : (
        <p>Pilih store terlebih dahulu dari sidebar.</p>
      )}
    </div>
  )

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Manajemen Meja</h1>
          <p className={styles.subtitle}>{user?.name} · {allTables.length} meja</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={openGenerate}>⚡ Generate Otomatis</button>
          <button className={styles.btnPrimary} onClick={openCreate}>+ Tambah Manual</button>
        </div>
      </div>

      {isLoading && <div className={styles.loading}>Loading...</div>}

      {/* Table Grid - Grouped by Type */}
      {allTables.length > 0 && TYPE_ORDER.map(type => {
        const filtered = allTables.filter(t => t.type === type)
        if (filtered.length === 0) return null
        
        return (
          <section key={type} className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.typeLabel} style={{ color: TYPE_COLORS[type] }}>
                {TYPE_LABELS[type]}
              </span>
              <span className={styles.typeCount}>{filtered.length} meja</span>
            </div>
            <div className={styles.tableGrid}>
              {filtered.map(t => (
                <div key={t.id} className={`${styles.tableCard} ${!t.is_active ? styles.tableCardInactive : ''}`}>
                  <div className={styles.tableNumber}>{t.number}</div>
                  <div className={styles.tableMeta}>
                    <span className={t.is_active ? styles.badgeActive : styles.badgeInactive}>
                      {t.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </div>
                  <div className={styles.tableActions}>
                    <button className={styles.btnIcon} title="Lihat QR" onClick={() => setQrView(t)}>🔗</button>
                    <button className={styles.btnIcon} title="Edit" onClick={() => openEdit(t)}>✏️</button>
                    <button className={styles.btnIcon} title="Hapus" onClick={() => setConfirmDelete(t)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {allTables.length === 0 && !isLoading && (
        <div className={styles.empty}>
          <span>🪑</span>
          <p>Belum ada meja. Klik "Generate Otomatis" atau "Tambah Manual".</p>
        </div>
      )}

      {/* ── Modal Tambah Manual ── */}
      {(modal === 'create' || modal === 'edit') && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {modal === 'create' ? 'Tambah Meja' : `Edit Meja ${editTarget?.number}`}
            </h2>

            <label className={styles.label}>Nomor Meja</label>
            <input
              className={styles.input}
              placeholder="Contoh: A1, TA1, V2"
              value={form.number}
              onBlur={handleNumberBlur}
              onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
            />

            <label className={styles.label}>
              Base URL QR <span style={{ color: '#4b5563', fontWeight: 400 }}>(opsional)</span>
            </label>
            <input
              className={styles.input}
              placeholder="https://smkmuhse.sch.id"
              value={form.baseUrl}
              onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
            />
            {form.baseUrl && form.number && (
              <p className={styles.hint}>
                QR akan encode: <code style={{ color: '#a5b4fc', fontSize: 11 }}>
                  {buildQrUrl(form.baseUrl, form.number, storeId)}
                </code>
              </p>
            )}

            <label className={styles.label}>Tipe</label>
            <div className={styles.typeGrid}>
              {Object.keys(TYPE_LABELS).map(t => (
                <button key={t} type="button"
                  className={`${styles.typeBtn} ${form.type === t ? styles.typeBtnActive : ''}`}
                  style={form.type === t ? { borderColor: TYPE_COLORS[t], color: TYPE_COLORS[t] } : {}}
                  onClick={() => setForm(f => ({ ...f, type: t }))}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {modal === 'edit' && (
              <>
                <label className={styles.label}>Status</label>
                <div className={styles.typeGrid}>
                  {[1, 0].map(v => (
                    <button key={v} type="button"
                      className={`${styles.typeBtn} ${form.is_active === v ? styles.typeBtnActive : ''}`}
                      onClick={() => setForm(f => ({ ...f, is_active: v }))}>
                      {v ? 'Aktif' : 'Non-aktif'}
                    </button>
                  ))}
                </div>
              </>
            )}

            {(createMutation.error || updateMutation.error) && (
              <p className={styles.errMsg}>
                {(createMutation.error as Error)?.message || (updateMutation.error as Error)?.message}
              </p>
            )}

            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={closeModal}>Batal</button>
              <button className={styles.btnPrimary}
                disabled={!form.number || createMutation.isPending || updateMutation.isPending}
                onClick={() => modal === 'create' ? createMutation.mutate() : updateMutation.mutate()}>
                {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Generate Otomatis ── */}
      {modal === 'generate' && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modalWide} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>⚡ Generate Meja Otomatis</h2>

            <div className={styles.genGrid}>
              <div>
                <label className={styles.label}>Prefix</label>
                <input className={styles.input} placeholder="Contoh: A, B, TA, V"
                  value={gen.prefix}
                  onChange={e => setGen(g => ({ ...g, prefix: e.target.value.toUpperCase() }))} />
                <p className={styles.hint}>Huruf depan nomor meja</p>
              </div>
              <div>
                <label className={styles.label}>Nomor Awal</label>
                <input className={styles.input} type="number" min={1}
                  value={gen.startNum}
                  onChange={e => setGen(g => ({ ...g, startNum: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className={styles.label}>Jumlah Meja</label>
                <input className={styles.input} type="number" min={1} max={100}
                  value={gen.count}
                  onChange={e => setGen(g => ({ ...g, count: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>

            <label className={styles.label}>Tipe</label>
            <div className={styles.typeGrid}>
              {Object.keys(TYPE_LABELS).map(t => (
                <button key={t} type="button"
                  className={`${styles.typeBtn} ${gen.type === t ? styles.typeBtnActive : ''}`}
                  style={gen.type === t ? { borderColor: TYPE_COLORS[t], color: TYPE_COLORS[t] } : {}}
                  onClick={() => setGen(g => ({ ...g, type: t }))}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <label className={styles.label}>
              Base URL QR <span style={{ color: '#4b5563', fontWeight: 400 }}>(opsional)</span>
            </label>
            <input className={styles.input}
              placeholder="https://smkmuhse.sch.id"
              value={gen.qrUrlTemplate}
              onChange={e => setGen(g => ({ ...g, qrUrlTemplate: e.target.value }))} />
            <p className={styles.hint}>
              Parameter <code style={{ color: '#a5b4fc' }}>?table=A1&store_id=xxx</code> akan ditambahkan otomatis ke URL ini.
            </p>

            {/* Preview */}
            {generatedPreview.length > 0 && (
              <div className={styles.previewBox}>
                <p className={styles.previewTitle}>Preview — {generatedPreview.length} meja akan dibuat:</p>
                <div className={styles.previewChips}>
                  {generatedPreview.map(t => (
                    <span key={t.number} className={styles.previewChip}
                      style={{ borderColor: TYPE_COLORS[gen.type], color: TYPE_COLORS[gen.type] }}>
                      {t.number}
                    </span>
                  ))}
                </div>
                {gen.qrUrlTemplate && (
                  <p className={styles.previewUrl}>
                    Contoh URL: <code>{generatedPreview[0]?.qr_url}</code>
                  </p>
                )}
              </div>
            )}

            {generateMutation.error && (
              <p className={styles.errMsg}>{(generateMutation.error as Error)?.message}</p>
            )}

            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={closeModal}>Batal</button>
              <button className={styles.btnPrimary}
                disabled={generatedPreview.length === 0 || generateMutation.isPending}
                onClick={() => generateMutation.mutate()}>
                {generateMutation.isPending ? 'Membuat...' : `Buat ${generatedPreview.length} Meja`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirm Delete ── */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Hapus Meja</h2>
            <p className={styles.modalDesc}>
              Yakin ingin menghapus meja <strong>{confirmDelete.number}</strong>? Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setConfirmDelete(null)}>Batal</button>
              <button className={styles.btnDanger}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(confirmDelete.id)}>
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal QR View ── */}
      {qrView && (
        <div className={styles.overlay} onClick={() => setQrView(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>QR Code — Meja {qrView.number}</h2>

            {qrView.qr_url ? (
              <div className={styles.qrWrapper}>
                <QRCodeSVG ref={qrRef} value={qrView.qr_url}
                  size={220} bgColor="#ffffff" fgColor="#0f0f0f" level="M"
                  style={{ borderRadius: 8 }} />
                <p className={styles.qrLabel}>{qrView.number}</p>
                <p className={styles.qrUrlText}>
                  <a href={qrView.qr_url} target="_blank" rel="noopener noreferrer">{qrView.qr_url}</a>
                </p>
              </div>
            ) : (
              <div className={styles.qrNoUrl}>
                <span>⚠️</span>
                <p>QR URL belum diset. Edit meja untuk menambahkan URL.</p>
              </div>
            )}

            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} disabled={regenMutation.isPending}
                onClick={() => { regenMutation.mutate(qrView.id); setQrView(null) }}>
                🔄 Regenerate Token
              </button>
              {qrView.qr_url && (
                <button className={styles.btnSecondary} onClick={downloadQr}>⬇️ Download QR</button>
              )}
              <button className={styles.btnPrimary} onClick={() => setQrView(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
