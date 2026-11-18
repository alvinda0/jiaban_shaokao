import { useState } from 'react'
import styles from './VariantManager.module.css'

export interface VariantOption {
  id?: string
  name: string
  price_adjustment: number
  is_default?: number
  is_active?: number
  sort_order: number
}

export interface VariantGroup {
  id?: string
  name: string
  is_required: number
  min_select: number
  max_select: number
  sort_order: number
  options: VariantOption[]
}

interface Props {
  variants: VariantGroup[]
  onChange: (variants: VariantGroup[]) => void
}

export default function VariantManager({ variants, onChange }: Props) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})

  const addGroup = () => {
    const newGroup: VariantGroup = {
      name: '',
      is_required: 0,
      min_select: 0,
      max_select: 1,
      sort_order: variants.length,
      options: [],
    }
    onChange([...variants, newGroup])
  }

  const updateGroup = (index: number, updates: Partial<VariantGroup>) => {
    const updated = [...variants]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  const removeGroup = (index: number) => {
    onChange(variants.filter((_, i) => i !== index))
  }

  const addOption = (groupIndex: number) => {
    const newOption: VariantOption = {
      name: '',
      price_adjustment: 0,
      is_default: 0,
      is_active: 1,
      sort_order: variants[groupIndex].options.length,
    }
    updateGroup(groupIndex, {
      options: [...variants[groupIndex].options, newOption],
    })
  }

  const updateOption = (
    groupIndex: number,
    optionIndex: number,
    updates: Partial<VariantOption>
  ) => {
    const updatedOptions = [...variants[groupIndex].options]
    updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], ...updates }
    updateGroup(groupIndex, { options: updatedOptions })
  }

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const updatedOptions = variants[groupIndex].options.filter(
      (_, i) => i !== optionIndex
    )
    updateGroup(groupIndex, { options: updatedOptions })
  }

  const toggleCollapse = (index: number) => {
    setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const moveGroup = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === variants.length - 1)
    ) {
      return
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const updated = [...variants]
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]

    // Update sort_order
    updated[index].sort_order = index
    updated[newIndex].sort_order = newIndex

    onChange(updated)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label className={styles.label}>Varian Produk (Opsional)</label>
        <button
          type="button"
          className={styles.btnAdd}
          onClick={addGroup}
        >
          + Tambah Varian
        </button>
      </div>

      {variants.length === 0 && (
        <div className={styles.empty}>
          <p>Belum ada varian. Klik "Tambah Varian" untuk menambahkan.</p>
          <small>Contoh: Ukuran, Level Pedas, Topping, dll.</small>
        </div>
      )}

      {variants.map((group, groupIndex) => (
        <div key={groupIndex} className={styles.group}>
          <div className={styles.groupHeader}>
            <div className={styles.groupTitle}>
              <button
                type="button"
                className={styles.btnCollapse}
                onClick={() => toggleCollapse(groupIndex)}
              >
                {collapsed[groupIndex] ? '▶' : '▼'}
              </button>
              <input
                className={styles.inputGroupName}
                placeholder="Nama Varian (cth: Ukuran, Level Pedas)"
                value={group.name}
                onChange={(e) =>
                  updateGroup(groupIndex, { name: e.target.value })
                }
              />
            </div>
            <div className={styles.groupActions}>
              <button
                type="button"
                className={styles.btnIcon}
                onClick={() => moveGroup(groupIndex, 'up')}
                disabled={groupIndex === 0}
                title="Naik"
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.btnIcon}
                onClick={() => moveGroup(groupIndex, 'down')}
                disabled={groupIndex === variants.length - 1}
                title="Turun"
              >
                ↓
              </button>
              <button
                type="button"
                className={styles.btnRemove}
                onClick={() => removeGroup(groupIndex)}
                title="Hapus varian"
              >
                🗑️
              </button>
            </div>
          </div>

          {!collapsed[groupIndex] && (
            <>
              <div className={styles.groupSettings}>
                <label className={styles.checkboxInline}>
                  <input
                    type="checkbox"
                    checked={group.is_required === 1}
                    onChange={(e) =>
                      updateGroup(groupIndex, {
                        is_required: e.target.checked ? 1 : 0,
                      })
                    }
                  />
                  <span>Wajib Pilih</span>
                </label>

                <div className={styles.selectField}>
                  <label>Pilihan:</label>
                  <select
                    value={group.max_select}
                    onChange={(e) => {
                      const max = parseInt(e.target.value)
                      updateGroup(groupIndex, {
                        max_select: max,
                        min_select: group.is_required ? 1 : 0,
                      })
                    }}
                  >
                    <option value={1}>Pilih 1 (Radio)</option>
                    <option value={3}>Multi (Max 3)</option>
                    <option value={5}>Multi (Max 5)</option>
                    <option value={10}>Multi (Max 10)</option>
                  </select>
                </div>
              </div>

              <div className={styles.optionsHeader}>
                <span className={styles.optionsLabel}>Opsi Pilihan</span>
                <button
                  type="button"
                  className={styles.btnAddOption}
                  onClick={() => addOption(groupIndex)}
                >
                  + Tambah Opsi
                </button>
              </div>

              {group.options.length === 0 && (
                <div className={styles.emptyOptions}>
                  Belum ada opsi. Klik "Tambah Opsi" untuk menambahkan.
                </div>
              )}

              {group.options.map((option, optionIndex) => (
                <div key={optionIndex} className={styles.option}>
                  <div className={styles.optionInputs}>
                    <input
                      className={styles.inputOptionName}
                      placeholder="Nama opsi (cth: Small, Pedas)"
                      value={option.name}
                      onChange={(e) =>
                        updateOption(groupIndex, optionIndex, {
                          name: e.target.value,
                        })
                      }
                    />
                    <input
                      className={styles.inputPrice}
                      type="text"
                      placeholder="0"
                      value={option.price_adjustment || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        updateOption(groupIndex, optionIndex, {
                          price_adjustment: parseInt(value) || 0,
                        })
                      }}
                    />
                    <span className={styles.priceLabel}>
                      {option.price_adjustment > 0
                        ? `+${option.price_adjustment.toLocaleString()}`
                        : option.price_adjustment < 0
                        ? option.price_adjustment.toLocaleString()
                        : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.btnRemoveOption}
                    onClick={() => removeOption(groupIndex, optionIndex)}
                    title="Hapus opsi"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      ))}

      {variants.length > 0 && (
        <div className={styles.hint}>
          💡 Tip: Varian bersifat opsional. Produk tanpa varian juga bisa dijual langsung.
        </div>
      )}
    </div>
  )
}
