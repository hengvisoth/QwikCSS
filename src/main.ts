// src/main.ts (content script)

const CONTAINER_ID = '__qwikcss_root__'
const IFRAME_ID = '__qwikcss_iframe__'
const PANEL_HEIGHT = 280

const OVERLAY_ID = '__qwikcss_overlay__'
const LABEL_ID = '__qwikcss_label__'

const STYLE_ID = '__qwikcss_style__'
const STORAGE_KEY = `qwikcss:${location.host}`

const TOOLBAR_ID = '__qwikcss_toolbar__'
const CARD_ID = '__qwikcss_hovercard__'
const CARD_HANDLE_ID = '__qwikcss_hovercard_handle__'
const RESET_STYLE_ID = '__qwikcss_reset__'

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

// selector -> { prop -> value }
const patch: Record<string, Record<string, string>> = {}

let picking = false
let inspectPaused = false
let lastHover: Element | null = null

let currentSelector: string | null = null
let currentElement: Element | null = null

let saveTimer: number | null = null

let cardPinned = false
let dragging = false
let dragOffsetX = 0
let dragOffsetY = 0

let toolbarPauseBtn: HTMLButtonElement | null = null

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
  hideCard()
  unmountToolbar()

  document.getElementById(CARD_ID)?.remove()
  document.getElementById(RESET_STYLE_ID)?.remove()
}

function postToPanel(msg: any) {
  const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null
  iframe?.contentWindow?.postMessage(msg, '*')
}

function notifyState() {
  postToPanel({ type: 'QWIKCSS_STATE', paused: inspectPaused, picking })
}

function setPaused(paused: boolean) {
  inspectPaused = paused
  if (!paused) cardPinned = false
  if (toolbarPauseBtn) toolbarPauseBtn.textContent = paused ? 'Resume Inspect' : 'Pause Inspect'
}

function onPanelMessage(e: MessageEvent) {
  const t = e?.data?.type

  if (t === 'QWIKCSS_CLOSE') unmountPanel()
  if (t === 'QWIKCSS_START_PICK') startPicking()
  if (t === 'QWIKCSS_STOP_PICK') stopPicking()
  if (t === 'QWIKCSS_PAUSE_INSPECT') {
    setPaused(true)
    notifyState()
  }
  if (t === 'QWIKCSS_RESUME_INSPECT') {
    setPaused(false)
    notifyState()
  }
  if (t === 'QWIKCSS_GET_STATE') notifyState()

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
    postToPanel({ type: 'QWIKCSS_EXPORT_RESULT', css })
  }

  if (t === 'QWIKCSS_CLEAR_SITE') {
    for (const k of Object.keys(patch)) delete patch[k]
    currentElement = null
    currentSelector = null
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
    !!el.closest?.(`#${CONTAINER_ID}, #${TOOLBAR_ID}, #${CARD_ID}`) ||
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
  if (raw && isInsideQwikCSSUI(raw)) return

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

function onClick(ev: MouseEvent) {
  if (!picking) return
  const target = ev.target
  if (target instanceof Element && isInsideQwikCSSUI(target)) return
  if (inspectPaused) return

  ev.preventDefault()
  ev.stopPropagation()

  const el = getElementFromPoint(ev.clientX, ev.clientY)
  if (!el) return

  const selector = buildSelector(el)

  currentSelector = selector
  currentElement = el
  sendInspector()

  postToPanel({
    type: 'QWIKCSS_SELECTED',
    selector,
    tag: el.tagName.toLowerCase(),
    id: (el as HTMLElement).id || null,
    className: (el as HTMLElement).className || null,
  })

  // Pin card on clicked element and pause hover until user resumes via X/toolbar
  cardPinned = true
  setPaused(true)
  notifyState()

  updateHoverCard(el)
  positionOverlay(el)
}

function startPicking() {
  if (picking) return
  picking = true
  setPaused(false)

  ensureOverlay()
  ensureHoverCard()
  mountToolbar()

  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('click', onClick, true)
  notifyState()
}

function stopPicking() {
  if (!picking) return
  picking = false
  setPaused(false)
  lastHover = null

  hideOverlay()
  hideCard()
  unmountToolbar()

  document.removeEventListener('mousemove', onMouseMove, true)
  document.removeEventListener('click', onClick, true)
  notifyState()
}

/** ---------------- Selector generator ---------------- */
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

function buildSelector(el: Element) {
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

/** ---------------- CSS injection + persistence ---------------- */
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
  const rules: string[] = []
  for (const [selector, decls] of Object.entries(patch)) {
    const lines = Object.entries(decls).map(([k, v]) => `  ${k}: ${v} !important;`)
    if (lines.length) rules.push(`${selector} {\n${lines.join('\n')}\n}`)
  }
  return rules.join('\n\n')
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

/** ---------------- Inspector (computed) ---------------- */
function getComputedSnapshot(el: Element) {
  const cs = getComputedStyle(el)
  const out: Record<string, string> = {}
  for (const p of INSPECT_PROPS) out[p] = cs.getPropertyValue(p).trim()
  return out
}

function sendInspector() {
  if (!currentElement || !currentSelector) return
  postToPanel({
    type: 'QWIKCSS_INSPECT',
    selector: currentSelector,
    computed: getComputedSnapshot(currentElement),
  })
}

/** ---------------- Toolbar + hover card ---------------- */
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
  btn.textContent = inspectPaused ? 'Resume Inspect' : 'Pause Inspect'
  btn.style.padding = '6px 10px'
  btn.style.borderRadius = '999px'
  btn.style.border = '1px solid rgba(255,255,255,0.18)'
  btn.style.background = 'transparent'
  btn.style.color = 'inherit'
  btn.style.cursor = 'pointer'
  btn.onclick = () => {
    setPaused(!inspectPaused)
    notifyState()
  }
  toolbarPauseBtn = btn

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
  toolbarPauseBtn = null
}

function ensureQwikCSSResetStyle() {
  if (document.getElementById(RESET_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = RESET_STYLE_ID
  s.textContent = `
    #${CARD_ID}, #${CARD_ID} * {
      outline: none !important;
      box-shadow: none;
    }
    #${CARD_ID} {
      -webkit-user-select: none;
      user-select: none;
    }
  `
  document.documentElement.appendChild(s)
}

function ensureHoverCard() {
  if (document.getElementById(CARD_ID)) return

  ensureQwikCSSResetStyle()

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

  const left = document.createElement('div')
  left.style.display = 'flex'
  left.style.alignItems = 'center'
  left.style.gap = '10px'

  const title = document.createElement('div')
  title.style.fontWeight = '700'
  title.textContent = 'Inspect'

  const hint = document.createElement('div')
  hint.style.opacity = '0.7'
  hint.textContent = 'drag'

  left.appendChild(title)
  left.appendChild(hint)

  const right = document.createElement('div')
  right.style.display = 'flex'
  right.style.alignItems = 'center'
  right.style.gap = '8px'

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '×'
  closeBtn.setAttribute('type', 'button')
  closeBtn.style.width = '26px'
  closeBtn.style.height = '26px'
  closeBtn.style.borderRadius = '8px'
  closeBtn.style.border = '1px solid rgba(255,255,255,0.18)'
  closeBtn.style.background = 'transparent'
  closeBtn.style.color = 'white'
  closeBtn.style.cursor = 'pointer'
  closeBtn.style.lineHeight = '24px'
  closeBtn.style.fontSize = '16px'
  closeBtn.style.padding = '0'
  closeBtn.title = 'Resume inspect'

  closeBtn.addEventListener('mousedown', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
  })
  closeBtn.addEventListener('click', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    setPaused(false)
    notifyState()
  })

  right.appendChild(closeBtn)

  handle.appendChild(left)
  handle.appendChild(right)

  const body = document.createElement('div')
  body.style.padding = '10px 12px'
  body.innerHTML = `
    <div style="opacity:.85;margin-bottom:8px" id="__qwikcss_card_line1__">—</div>
    <div style="opacity:.85;margin-bottom:8px" id="__qwikcss_card_line2__">—</div>
    <div style="opacity:.85" id="__qwikcss_card_line3__">—</div>
  `

  card.appendChild(handle)
  card.appendChild(body)
  document.documentElement.appendChild(card)

  handle.addEventListener('mousedown', (ev) => {
    dragging = true
    cardPinned = true
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
      setCardPos(ev.clientX - dragOffsetX, ev.clientY - dragOffsetY)
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
  const cs = getComputedStyle(el)

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

  if (!cardPinned && !dragging) {
    setCardPos(rect.right + 10, rect.top)
  }
}

/** Boot */
mountPanel()
