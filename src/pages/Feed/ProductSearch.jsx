import { useState, useMemo, useRef } from 'react'
import { fuzzyScore } from '../../lib/filters'

// Typo-tolerant product search with a suggestion dropdown.
// `value`/`onChange` drive the actual feed query; suggestions just help fill it.
export default function ProductSearch({ value, onChange, suggestions = [] }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState(value ?? '')
  const blurTimer = useRef(null)

  const matches = useMemo(() => {
    const q = typed.trim()
    if (q.length < 2) return []
    return suggestions
      .map((name) => ({ name, score: fuzzyScore(q, name) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((m) => m.name)
  }, [typed, suggestions])

  function pick(name) {
    setTyped(name)
    onChange(name)
    setOpen(false)
  }

  function handleChange(e) {
    const v = e.target.value
    setTyped(v)
    onChange(v)
    setOpen(true)
  }

  return (
    <div className="relative">
      <input
        type="search"
        value={typed}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150) }}
        placeholder="ابحث عن منتج... (مثال: Augm)"
        className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-2.5 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-primary"
        dir="auto"
        autoComplete="off"
      />
      {typed && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setTyped(''); onChange(''); setOpen(false) }}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-lg"
          aria-label="مسح"
        >×</button>
      )}

      {open && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full bg-brand-card border border-brand-border rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {matches.map((name) => (
            <li key={name}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); clearTimeout(blurTimer.current); pick(name) }}
                className="w-full text-right px-4 py-2.5 text-sm text-brand-text hover:bg-brand-bg border-b border-brand-border last:border-0"
                dir="ltr"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
