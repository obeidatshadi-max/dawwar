const DAY = 1000 * 60 * 60 * 24

export function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.floor((new Date(dateStr) - new Date()) / DAY)
}

// Bucket keys by remaining shelf life.
export function expiryBucket(dateStr) {
  const d = daysUntil(dateStr)
  if (d === null) return null
  if (d < 0) return 'expired'
  if (d < 30) return 'lt1'
  if (d < 90) return '1to3'
  if (d < 180) return '3to6'
  return 'gt6'
}

// Color + label per bucket (Tailwind classes).
export const EXPIRY_META = {
  expired: { label: 'منتهي', text: 'text-red-700', bg: 'bg-red-200', dot: 'bg-red-700', border: 'border-red-400' },
  lt1: { label: 'أقل من شهر', text: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500', border: 'border-red-300' },
  '1to3': { label: '1–3 أشهر', text: 'text-orange-600', bg: 'bg-orange-100', dot: 'bg-orange-500', border: 'border-orange-300' },
  '3to6': { label: '3–6 أشهر', text: 'text-amber-600', bg: 'bg-amber-100', dot: 'bg-amber-500', border: 'border-amber-300' },
  gt6: { label: 'أكثر من 6 أشهر', text: 'text-emerald-600', bg: 'bg-emerald-100', dot: 'bg-emerald-500', border: 'border-emerald-300' },
}

// Feed filter dropdown options (null = all).
export const EXPIRY_FILTERS = [
  { value: null, label: 'كل التواريخ' },
  { value: 'lt1', label: 'أقل من شهر' },
  { value: '1to3', label: '1–3 أشهر' },
  { value: '3to6', label: '3–6 أشهر' },
]

// Distance options in km (null = whole city).
export const RADIUS_OPTIONS = [
  { label: 'كل المدينة', value: null },
  { label: '١٠٠ م', value: 0.1 },
  { label: '٥٠٠ م', value: 0.5 },
  { label: '١ كم', value: 1 },
]

function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    [prev, curr] = [curr, prev]
  }
  return prev[n]
}

// Typo-tolerant relevance score. Higher = better; -1 = no match.
export function fuzzyScore(query, target) {
  if (!query) return 0
  const q = query.toLowerCase().trim()
  const t = (target ?? '').toLowerCase()
  if (!t) return -1
  if (t.includes(q)) return 100 - t.indexOf(q)

  // in-order subsequence (handles abbreviations / gaps)
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  if (qi === q.length) return 50

  // typo tolerance against the leading slice
  const dist = levenshtein(q, t.slice(0, q.length + 2))
  const allowed = Math.max(1, Math.floor(q.length / 4))
  if (dist <= allowed) return 30 - dist
  return -1
}

// Common MENA/Iraq pharmacy drugs to seed autocomplete before the feed fills up.
export const COMMON_DRUGS = [
  'Augmentin 625mg', 'Augmentin 1g', 'Amoxicillin 500mg', 'Paracetamol 500mg',
  'Panadol', 'Brufen 400mg', 'Ibuprofen 400mg', 'Omeprazole 20mg', 'Nexium 40mg',
  'Metformin 500mg', 'Metformin 850mg', 'Glucophage', 'Amlodipine 5mg', 'Concor 5mg',
  'Atorvastatin 20mg', 'Lipitor 20mg', 'Losartan 50mg', 'Cataflam 50mg', 'Voltaren 75mg',
  'Azithromycin 500mg', 'Zithromax', 'Ciprofloxacin 500mg', 'Cefixime 400mg',
  'Ceftriaxone 1g', 'Insulin', 'Lantus', 'Ventolin', 'Claritine', 'Zyrtec',
  'Flagyl 500mg', 'Metronidazole 500mg',
]
