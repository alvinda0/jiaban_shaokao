import { useState, KeyboardEvent } from 'react'
import styles from './SimpleVariantInput.module.css'

export interface SimpleVariant {
  name: string
  price_adjustment: number
}

interface Props {
  variants: SimpleVariant[]
  onChange: (variants: SimpleVariant[]) => void
}

export default function SimpleVariantInput({ variants, onChange }: Props) {
  const [inputValue, setInputValue] = useState('')
  const [priceAdjustment, setPriceAdjustment] = useState(0)

  const addVariant = () => {
    if (inputValue.trim()) {
      onChange([
        ...variants,
        {
          name: inputValue.trim(),
          price_adjustment: priceAdjustment,
        },
      ])
      setInputValue('')
      setPriceAdjustment(0)
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addVariant()
    }
  }

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index))
  }

  const updateVariant = (index: number, updates: Partial<SimpleVariant>) => {
    const updated = [...variants]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  return (
    <div className={styles.container}>
      <label className={styles.label}>Varian Produk (Opsional)</label>
      <p className={styles.description}>
        Contoh: Pedas, Tidak Pedas, Dingin, Panas, dll.
      </p>

      <div className={styles.inputRow}>
        <input
          className={styles.inputName}
          placeholder="Nama varian (cth: Pedas)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <input
          className={styles.inputPrice}
          type="text"
          placeholder="Harga tambahan (opsional)"
          value={priceAdjustment || ''}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '')
            setPriceAdjustment(parseInt(value) || 0)
          }}
          onKeyPress={handleKeyPress}
        />
        <button
          type="button"
          className={styles.btnAdd}
          onClick={addVariant}
        >
          + Tambah
        </button>
      </div>

      {variants.length > 0 && (
        <div className={styles.variantsList}>
          {variants.map((variant, index) => (
            <div key={index} className={styles.variantTag}>
              <div className={styles.variantInfo}>
                <input
                  className={styles.editName}
                  value={variant.name}
                  onChange={(e) =>
                    updateVariant(index, { name: e.target.value })
                  }
                />
                <input
                  className={styles.editPrice}
                  type="text"
                  placeholder="0"
                  value={variant.price_adjustment || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    updateVariant(index, {
                      price_adjustment: parseInt(value) || 0,
                    })
                  }}
                />
                {variant.price_adjustment > 0 && (
                  <span className={styles.priceLabel}>
                    +Rp {variant.price_adjustment.toLocaleString()}
                  </span>
                )}
              </div>
              <button
                type="button"
                className={styles.btnRemove}
                onClick={() => removeVariant(index)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {variants.length === 0 && (
        <div className={styles.empty}>
          Belum ada varian. Tambahkan varian seperti "Pedas", "Tidak Pedas", dll.
        </div>
      )}

      <div className={styles.hint}>
        💡 Customer bisa pilih salah satu varian saat order
      </div>
    </div>
  )
}
