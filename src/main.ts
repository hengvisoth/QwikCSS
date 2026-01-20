// src/main.ts (content script)

const CONTAINER_ID = '__qwikcss_root__'
const IFRAME_ID = '__qwikcss_iframe__'
const PANEL_HEIGHT = 280
const patch: Record<string, Record<string, string>> = {}

const OVERLAY_ID = '__qwikcss_overlay__'
const LABEL_ID = '__qwikcss_label__'
const STYLE_ID = '__qwikcss_style__'

let picking = false
let lastHover: Element | null = null
let currentSelector: string | null = null

/** ---------------- Panel (iframe) ---------------- */
function mountPanel() {
  if (document.getElementById(CONTAINER_ID)) return

  const container = document.createElement('div')
  container.id = CONTAINER_ID
  container.style.position = 'fixed'
  container.style.left = '0'
  container.style.right = '0'
  container.style.bottom = '0'
  container.style.height = `${PANEL_HEIGHT}px`
  container.style.zIndex = '2147483647'
  container.style.background = 'transparent'

  const iframe = document.createElement('iframe')
  iframe.id = IFRAME_ID
  iframe.src = chrome.runtime.getURL('src/ui/panel.html')
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  iframe.style.border = '0'
  iframe.style.background = 'white'
  iframe.style.boxShadow = '0 -8px 24px rgba(0,0,0,0.15)'

  container.appendChild(iframe)
  document.documentElement.appendChild(container)

  window.addEventListener('message', onPanelMessage)
}

function unmountPanel() {
  stopPicking()
  window.removeEventListener('message', onPanelMessage)
  document.getElementById(CONTAINER_ID)?.remove()
  removeOverlay()
}

function onPanelMessage(e: MessageEvent) {
  const t = e?.data?.type

  if (t === 'QWIKCSS_CLOSE') unmountPanel()
  if (t === 'QWIKCSS_START_PICK') startPicking()
  if (t === 'QWIKCSS_STOP_PICK') stopPicking()

  if (t === 'QWIKCSS_APPLY') {
    if (!currentSelector) return
    const prop = String(e.data.prop || '').trim()
    const value = String(e.data.value || '').trim()
    if (!prop || !value) return
    applyDecl(currentSelector, prop, value)
  }

  if (t === 'QWIKCSS_REMOVE') {
    if (!currentSelector) return
    const prop = String(e.data.prop || '').trim()
    if (!prop) return
    removeDecl(currentSelector, prop)
  }

  if (t === 'QWIKCSS_EXPORT') {
    const css = exportCSS()
    const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null
    iframe?.contentWindow?.postMessage({ type: 'QWIKCSS_EXPORT_RESULT', css }, '*')
  }
}

/** ---------------- Overlay (highlight box) ---------------- */
function ensureOverlay() {
  if (document.getElementById(OVERLAY_ID)) return

  const overlay = document.createElement('div')
  overlay.id = OVERLAY_ID
  overlay.style.position = 'fixed'
  overlay.style.pointerEvents = 'none'
  overlay.style.zIndex = '2147483647'
  overlay.style.border = '2px solid #2b6cff'
  overlay.style.background = 'rgba(43,108,255,0.12)'
  overlay.style.display = 'none'

  const label = document.createElement('div')
  label.id = LABEL_ID
  label.style.position = 'fixed'
  label.style.pointerEvents = 'none'
  label.style.zIndex = '2147483647'
  label.style.padding = '4px 6px'
  label.style.borderRadius = '6px'
  label.style.background = 'rgba(0,0,0,0.8)'
  label.style.color = 'white'
  label.style.font = '12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial'
  label.style.display = 'none'
  label.style.maxWidth = '60vw'
  label.style.whiteSpace = 'nowrap'
  label.style.overflow = 'hidden'
  label.style.textOverflow = 'ellipsis'

  document.documentElement.appendChild(overlay)
  document.documentElement.appendChild(label)
}

function removeOverlay() {
  document.getElementById(OVERLAY_ID)?.remove()
  document.getElementById(LABEL_ID)?.remove()
}

function hideOverlay() {
  const overlay = document.getElementById(OVERLAY_ID) as HTMLDivElement | null
  const label = document.getElementById(LABEL_ID) as HTMLDivElement | null
  if (overlay) overlay.style.display = 'none'
  if (label) label.style.display = 'none'
}

function isInsideQwikCSSUI(el: Element) {
  return (
    !!el.closest?.(`#${CONTAINER_ID}`) ||
    el.id === CONTAINER_ID ||
    el.id === OVERLAY_ID ||
    el.id === LABEL_ID
  )
}

function describeElement(el: Element) {
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

function positionOverlay(el: Element) {
  const overlay = document.getElementById(OVERLAY_ID) as HTMLDivElement | null
  const label = document.getElementById(LABEL_ID) as HTMLDivElement | null
  if (!overlay || !label) return

  const rect = el.getBoundingClientRect()

  overlay.style.display = 'block'
  overlay.style.left = `${Math.max(0, rect.left)}px`
  overlay.style.top = `${Math.max(0, rect.top)}px`
  overlay.style.width = `${Math.max(0, rect.width)}px`
  overlay.style.height = `${Math.max(0, rect.height)}px`

  label.style.display = 'block'
  label.textContent = describeElement(el)

  const lx = Math.min(window.innerWidth - 10, Math.max(10, rect.left))
  const ly = Math.max(10, rect.top - 26)
  label.style.left = `${lx}px`
  label.style.top = `${ly}px`
}

function getElementFromPoint(x: number, y: number) {
  const el = document.elementFromPoint(x, y)
  if (!el) return null
  if (isInsideQwikCSSUI(el)) return null
  return el
}

/** ---------------- Picking logic ---------------- */
function onMouseMove(ev: MouseEvent) {
  if (!picking) return
  const el = getElementFromPoint(ev.clientX, ev.clientY)
  if (!el) {
    lastHover = null
    hideOverlay()
    return
  }
  if (el !== lastHover) {
    lastHover = el
    positionOverlay(el)
  }
}

function cssEscapeIdent(v: string) {
  // Minimal safe escape (good enough for ids/classes most of the time)
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

function buildSelector(el: Element) {
  // 1) id
  const id = (el as HTMLElement).id
  if (id) {
    const s = `#${cssEscapeIdent(id)}`
    if (isUniqueSelector(s)) return s
  }

  // 2) stable attributes
  const attrSel = getAttrSelector(el)
  if (attrSel) {
    const s = `${el.tagName.toLowerCase()}${attrSel}`
    if (isUniqueSelector(s)) return s
    if (isUniqueSelector(attrSel)) return attrSel
  }

  // 3) build path upwards with classes / nth-of-type until unique
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

    // If still not unique at this level, add nth-of-type
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

  // fallback (not guaranteed unique)
  return parts.join(' > ') || el.tagName.toLowerCase()
}

function onClick(ev: MouseEvent) {
  if (!picking) return

  // block site interactions during pick
  ev.preventDefault()
  ev.stopPropagation()

  const el = getElementFromPoint(ev.clientX, ev.clientY)
  if (!el) return

  const selector = buildSelector(el)
  currentSelector = selector

  const payload = {
    type: 'QWIKCSS_SELECTED',
    selector,
    tag: el.tagName.toLowerCase(),
    id: (el as HTMLElement).id || null,
    className: (el as HTMLElement).className || null,
  }

  const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null
  iframe?.contentWindow?.postMessage(payload, '*')

  stopPicking()
}

function startPicking() {
  if (picking) return
  picking = true
  ensureOverlay()
  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('click', onClick, true)
}

function stopPicking() {
  if (!picking) return
  picking = false
  lastHover = null
  hideOverlay()
  document.removeEventListener('mousemove', onMouseMove, true)
  document.removeEventListener('click', onClick, true)
}

function ensureStyleTag() {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.documentElement.appendChild(style)
  }
  return style
}

function rebuildCSS() {
  const style = ensureStyleTag()
  const rules: string[] = []

  for (const [selector, decls] of Object.entries(patch)) {
    const lines = Object.entries(decls).map(([k, v]) => `  ${k}: ${v} !important;`)
    if (lines.length) rules.push(`${selector} {\n${lines.join('\n')}\n}`)
  }

  style.textContent = rules.join('\n\n')
}

function applyDecl(selector: string, prop: string, value: string) {
  if (!patch[selector]) patch[selector] = {}
  patch[selector][prop] = value
  rebuildCSS()
}

function removeDecl(selector: string, prop: string) {
  if (!patch[selector]) return
  delete patch[selector][prop]
  if (Object.keys(patch[selector]).length === 0) delete patch[selector]
  rebuildCSS()
}

function exportCSS() {
  // return exactly what we injected
  const rules: string[] = []
  for (const [selector, decls] of Object.entries(patch)) {
    const lines = Object.entries(decls).map(([k, v]) => `  ${k}: ${v} !important;`)
    if (lines.length) rules.push(`${selector} {\n${lines.join('\n')}\n}`)
  }
  return rules.join('\n\n')
}

/** Boot */
mountPanel()
