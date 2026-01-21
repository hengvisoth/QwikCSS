function cssEscapeIdent(v: string) {
  return v.replace(/([ !"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1')
}

function getAttrSelector(el: Element) {
  const preferred = ['data-testid', 'data-test', 'data-cy', 'data-qa', 'aria-label', 'name']
  for (const a of preferred) {
    const val = el.getAttribute(a)
    if (val && val.length <= 64) return `[${a}="${val.replace(/"/g, '\\"')}"]`
  }
  return null
}

function isUniqueSelector(sel: string) {
  try {
    return document.querySelectorAll(sel).length === 1
  } catch {
    return false
  }
}

export function buildSelector(el: Element) {
  const id = (el as HTMLElement).id
  if (id) {
    const s = `#${cssEscapeIdent(id)}`
    if (isUniqueSelector(s)) return s
  }

  const attrSel = getAttrSelector(el)
  if (attrSel) {
    const s = `${el.tagName.toLowerCase()}${attrSel}`
    if (isUniqueSelector(s)) return s
    if (isUniqueSelector(attrSel)) return attrSel
  }

  const parts: string[] = []
  let cur: Element | null = el

  while (cur && cur !== document.documentElement && parts.length < 6) {
    const tag = cur.tagName.toLowerCase()

    const cid = (cur as HTMLElement).id
    if (cid) {
      parts.unshift(`${tag}#${cssEscapeIdent(cid)}`)
      const s = parts.join(' > ')
      if (isUniqueSelector(s)) return s
      break
    }

    const classList = Array.from((cur as HTMLElement).classList || [])
      .filter(Boolean)
      .slice(0, 2)
      .map((c) => `.${cssEscapeIdent(c)}`)

    let part = tag + classList.join('')

    const parent = cur.parentElement
    if (parent) {
      const siblingsSameTag = Array.from(parent.children).filter((c) => c.tagName === cur!.tagName)
      if (siblingsSameTag.length > 1) {
        const idx = siblingsSameTag.indexOf(cur) + 1
        part += `:nth-of-type(${idx})`
      }
    }

    parts.unshift(part)
    const selector = parts.join(' > ')
    if (isUniqueSelector(selector)) return selector

    cur = cur.parentElement
  }

  return parts.join(' > ') || el.tagName.toLowerCase()
}
