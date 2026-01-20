// src/main.ts (content script)

const CONTAINER_ID = '__qwikcss_root__'
const IFRAME_ID = '__qwikcss_iframe__'
const PANEL_HEIGHT = 280
const patch: Record<string, Record<string, string>> = {}

const OVERLAY_ID = '__qwikcss_overlay__'
const LABEL_ID = '__qwikcss_label__'
const STYLE_ID = '__qwikcss_style__'
const STORAGE_KEY = `qwikcss:${location.host}`
const TOOLBAR_ID = '__qwikcss_toolbar__'
const CARD_ID = '__qwikcss_hovercard__'
const CARD_HANDLE_ID = '__qwikcss_hovercard_handle__'

const INSPECT_PROPS = [
  'display',
  'position',
  'width',
  'height',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'font-size',
  'font-weight',
  'line-height',
  'color',
  'background-color',
  'border-radius',
  'box-shadow',
] as const

let picking = false
let lastHover: Element | null = null
let currentSelector: string | null = null
let saveTimer: number | null = null
let currentElement: Element | null = null
let inspectActive = false
let inspectPaused = false

let cardPinned = false
let dragging = false
let dragOffsetX = 0
let dragOffsetY = 0

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

  if (t === 'QWIKCSS_CLEAR_SITE') {
    for (const k of Object.keys(patch)) delete patch[k]
    rebuildCSS()
    chrome.storage.local.remove(STORAGE_KEY)
    postToPanel({ type: 'QWIKCSS_CLEARED' })
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
    // Anything inside our injected UIs
    !!el.closest?.(`#${CONTAINER_ID}, #${TOOLBAR_ID}, #${CARD_ID}`) ||
    // Or the UI roots themselves
    el.id === CONTAINER_ID ||
    el.id === TOOLBAR_ID ||
    el.id === CARD_ID ||
    el.id === CARD_HANDLE_ID ||
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
  if (inspectPaused) return

  const raw = document.elementFromPoint(ev.clientX, ev.clientY)
  if (raw && isInsideQwikCSSUI(raw)) {
    // Don’t update hover target while interacting with QwikCSS UI
    return
  }

  const el = getElementFromPoint(ev.clientX, ev.clientY)
  if (!el) {
    lastHover = null
    hideOverlay()
    hideCard()
    return
  }

  if (el !== lastHover) {
    lastHover = el
    positionOverlay(el)
    updateHoverCard(el)
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
  currentElement = el
  sendInspector()

  const payload = {
    type: 'QWIKCSS_SELECTED',
    selector,
    tag: el.tagName.toLowerCase(),
    id: (el as HTMLElement).id || null,
    className: (el as HTMLElement).className || null,
  }

  const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null
  iframe?.contentWindow?.postMessage(payload, '*')

  // Keep inspect running.
  // Freeze the popup on the clicked element (pin), but keep hover optional.
  currentElement = el
  currentSelector = selector
  cardPinned = true
  inspectPaused = true // optional: click freezes until user resumes
  updateHoverCard(el)
  positionOverlay(el)
}

function startPicking() {
  if (picking) return
  picking = true
  inspectActive = true
  inspectPaused = false
  cardPinned = false

  ensureOverlay()
  ensureHoverCard()
  mountToolbar()

  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('click', onClick, true)
}

function stopPicking() {
  if (!picking) return
  picking = false
  inspectActive = false
  inspectPaused = false
  lastHover = null

  hideOverlay()
  hideCard()
  unmountToolbar()

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
  scheduleSave()
}

function applyDecl(selector: string, prop: string, value: string) {
  if (!patch[selector]) patch[selector] = {}
  patch[selector][prop] = value
  rebuildCSS()
  sendInspector()
}

function removeDecl(selector: string, prop: string) {
  if (!patch[selector]) return
  delete patch[selector][prop]
  if (Object.keys(patch[selector]).length === 0) delete patch[selector]
  rebuildCSS()
  sendInspector()
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

function postToPanel(msg: any) {
  const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null
  iframe?.contentWindow?.postMessage(msg, '*')
}

function scheduleSave() {
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(async () => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: patch })
      postToPanel({ type: 'QWIKCSS_SAVED' })
    } catch (err) {
      postToPanel({ type: 'QWIKCSS_SAVE_ERROR', message: String(err) })
    }
  }, 200)
}

async function loadPatchFromStorage() {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEY)
    const saved = res?.[STORAGE_KEY]
    if (saved && typeof saved === 'object') {
      // replace existing patch contents
      for (const k of Object.keys(patch)) delete patch[k]
      Object.assign(patch, saved)
      rebuildCSS()
      postToPanel({ type: 'QWIKCSS_LOADED' })
    }
  } catch (err) {
    postToPanel({ type: 'QWIKCSS_SAVE_ERROR', message: String(err) })
  }
}

function getComputedSnapshot(el: Element) {
  const cs = getComputedStyle(el as Element)
  const out: Record<string, string> = {}
  for (const p of INSPECT_PROPS) out[p] = cs.getPropertyValue(p).trim()
  return out
}

function sendInspector() {
  if (!currentElement || !currentSelector) return
  const computed = getComputedSnapshot(currentElement)
  postToPanel({
    type: 'QWIKCSS_INSPECT',
    selector: currentSelector,
    computed,
  })
}

function mountToolbar() {
  if (document.getElementById(TOOLBAR_ID)) return

  const bar = document.createElement('div')
  bar.id = TOOLBAR_ID
  bar.style.position = 'fixed'
  bar.style.left = '14px'
  bar.style.top = '14px'
  bar.style.zIndex = '2147483647'
  bar.style.display = 'flex'
  bar.style.gap = '8px'
  bar.style.alignItems = 'center'
  bar.style.padding = '8px 10px'
  bar.style.borderRadius = '999px'
  bar.style.background = 'rgba(20,20,20,0.92)'
  bar.style.color = '#fff'
  bar.style.font = '12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial'
  bar.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'
  bar.style.userSelect = 'none'

  const btn = document.createElement('button')
  btn.textContent = 'Pause Inspect'
  btn.style.padding = '6px 10px'
  btn.style.borderRadius = '999px'
  btn.style.border = '1px solid rgba(255,255,255,0.18)'
  btn.style.background = 'transparent'
  btn.style.color = 'inherit'
  btn.style.cursor = 'pointer'
  btn.onclick = () => {
    inspectPaused = !inspectPaused
    btn.textContent = inspectPaused ? 'Resume Inspect' : 'Pause Inspect'
    if (!inspectPaused) {
      cardPinned = false
    }
  }

  const pin = document.createElement('button')
  pin.textContent = 'Pin'
  pin.style.padding = '6px 10px'
  pin.style.borderRadius = '999px'
  pin.style.border = '1px solid rgba(255,255,255,0.18)'
  pin.style.background = 'transparent'
  pin.style.color = 'inherit'
  pin.style.cursor = 'pointer'
  pin.onclick = () => {
    cardPinned = !cardPinned
    pin.textContent = cardPinned ? 'Unpin' : 'Pin'
  }

  bar.appendChild(btn)
  bar.appendChild(pin)
  document.documentElement.appendChild(bar)
}

function unmountToolbar() {
  document.getElementById(TOOLBAR_ID)?.remove()
}

function ensureHoverCard() {
  if (document.getElementById(CARD_ID)) return

  const card = document.createElement('div')
  card.id = CARD_ID
  card.style.position = 'fixed'
  card.style.zIndex = '2147483647'
  card.style.width = '260px'
  card.style.borderRadius = '14px'
  card.style.background = 'rgba(20,20,20,0.94)'
  card.style.color = '#fff'
  card.style.boxShadow = '0 14px 38px rgba(0,0,0,0.35)'
  card.style.backdropFilter = 'blur(10px)'
  card.style.font = '12px/1.25 system-ui, -apple-system, Segoe UI, Roboto, Arial'
  card.style.display = 'none'
  card.style.userSelect = 'none'

  const handle = document.createElement('div')
  handle.id = CARD_HANDLE_ID
  handle.style.display = 'flex'
  handle.style.justifyContent = 'space-between'
  handle.style.alignItems = 'center'
  handle.style.padding = '10px 12px'
  handle.style.cursor = 'move'
  handle.style.borderBottom = '1px solid rgba(255,255,255,0.10)'

  const title = document.createElement('div')
  title.style.fontWeight = '700'
  title.textContent = 'Inspect'

  const hint = document.createElement('div')
  hint.style.opacity = '0.7'
  hint.textContent = 'drag'

  handle.appendChild(title)
  handle.appendChild(hint)

  const body = document.createElement('div')
  body.style.padding = '10px 12px'
  body.innerHTML = `
    <div style="opacity:.85;margin-bottom:8px" id="__qwikcss_card_line1__">—</div>
    <div style="opacity:.85;margin-bottom:8px" id="__qwikcss_card_line2__">—</div>
    <div style="opacity:.85" id="__qwikcss_card_line3__">—</div>
  `
  ensureQwikCSSResetStyle()
  card.appendChild(handle)
  card.appendChild(body)
  document.documentElement.appendChild(card)

  // Drag logic
  handle.addEventListener('mousedown', (ev) => {
    dragging = true
    cardPinned = true // dragging implies pin
    const rect = card.getBoundingClientRect()
    dragOffsetX = ev.clientX - rect.left
    dragOffsetY = ev.clientY - rect.top
    ev.preventDefault()
    ev.stopPropagation()
  })

  document.addEventListener(
    'mousemove',
    (ev) => {
      if (!dragging) return
      const x = ev.clientX - dragOffsetX
      const y = ev.clientY - dragOffsetY
      setCardPos(x, y)
    },
    true
  )

  document.addEventListener(
    'mouseup',
    () => {
      dragging = false
    },
    true
  )
}

function setCardPos(x: number, y: number) {
  const card = document.getElementById(CARD_ID) as HTMLDivElement | null
  if (!card) return
  const w = card.offsetWidth || 260
  const h = card.offsetHeight || 120
  const px = Math.min(window.innerWidth - 10, Math.max(10, x))
  const py = Math.min(window.innerHeight - 10, Math.max(10, y))
  card.style.left = `${Math.min(px, window.innerWidth - w - 10)}px`
  card.style.top = `${Math.min(py, window.innerHeight - h - 10)}px`
}

function showCard() {
  const card = document.getElementById(CARD_ID) as HTMLDivElement | null
  if (card) card.style.display = 'block'
}

function hideCard() {
  const card = document.getElementById(CARD_ID) as HTMLDivElement | null
  if (card) card.style.display = 'none'
}

function updateHoverCard(el: Element) {
  ensureHoverCard()
  showCard()

  const rect = el.getBoundingClientRect()
  const cs = getComputedStyle(el as Element)

  const tag = el.tagName.toLowerCase()
  const w = Math.round(rect.width)
  const h = Math.round(rect.height)

  const fontFamily = (cs.fontFamily || '').split(',')[0]?.trim() || '—'
  const fontSize = cs.fontSize || '—'

  const line1 = document.getElementById('__qwikcss_card_line1__')
  const line2 = document.getElementById('__qwikcss_card_line2__')
  const line3 = document.getElementById('__qwikcss_card_line3__')

  if (line1) line1.textContent = `${tag}  —  ${w}×${h}`
  if (line2) line2.textContent = `font: ${fontFamily}  ${fontSize}`
  if (line3) line3.textContent = `pos: ${Math.round(rect.left)}, ${Math.round(rect.top)}`

  // If not pinned by user, place it near hovered element (like CSS Pro)
  if (!cardPinned && !dragging) {
    const pad = 10
    const x = rect.right + pad
    const y = rect.top
    setCardPos(x, y)
  }
}

function ensureQwikCSSResetStyle() {
  const id = '__qwikcss_reset__'
  if (document.getElementById(id)) return
  const s = document.createElement('style')
  s.id = id
  s.textContent = `
    #${CARD_ID}, #${CARD_ID} * {
      outline: none !important;
      box-shadow: none;
    }
    #${CARD_HANDLE_ID}:focus, #${CARD_HANDLE_ID}:active {
      outline: none !important;
      box-shadow: none !important;
    }
    #${CARD_ID} {
      -webkit-user-select: none;
      user-select: none;
    }
  `
  document.documentElement.appendChild(s)
}

/** Boot */
mountPanel()
loadPatchFromStorage()
