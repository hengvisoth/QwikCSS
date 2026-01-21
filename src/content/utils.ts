export function describeElement(el: Element) {
  const tag = el.tagName.toLowerCase()
  const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : ''
  const cls =
    (el as HTMLElement).classList && (el as HTMLElement).classList.length
      ? '.' +
        Array.from((el as HTMLElement).classList)
          .slice(0, 3)
          .join('.')
      : ''
  return `${tag}${id}${cls}`
}

export function formatNumber(n: number) {
  const rounded = Math.round(n * 100) / 100
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2)
}

export function escapeHtml(value: string) {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return value.replace(/[&<>"']/g, (ch) => map[ch] || ch)
}

export function isTrivialValue(value: string) {
  const v = value.trim().toLowerCase()
  if (v === 'none') return true
  const normalized = v.replace(/\s*\/\s*/g, ' ')
  return /^0(?:\.0+)?([a-z%]+)?(\s+0(?:\.0+)?([a-z%]+)?)*$/.test(normalized)
}

export function getElementPath(el: Element, maxDepth = 4) {
  const raw: string[] = []
  let cur: Element | null = el
  while (cur && cur.tagName.toLowerCase() !== 'html') {
    if (cur.tagName.toLowerCase() !== 'body') raw.push(describeElement(cur))
    cur = cur.parentElement
  }
  const ordered = raw.reverse()
  if (ordered.length > maxDepth) return ['...', ...ordered.slice(ordered.length - maxDepth)]
  return ordered.length ? ordered : [describeElement(el)]
}
