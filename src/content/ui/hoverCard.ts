import { CARD_HANDLE_ID, CARD_ID, COLOR_PROPS, INSPECT_PROPS, RESET_STYLE_ID } from '../constants'
import { notifyState, setPaused } from '../actions'
import { sendInspector } from '../inspector'
import {
  applyInlineDecl,
  clearInlineSelector,
  getInlineDecls,
  hasInlineDecl,
  removeInlineDecl,
} from '../inlineStyles'
import { postToPanel } from '../panelBus'
import { buildSelector } from '../selectors'
import { state } from '../state'
import { describeElement, escapeHtml, formatNumber, getElementPath, isTrivialValue } from '../utils'
import { hideOverlay, positionOverlay } from './overlay'

const EDIT_PROPS = [
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
] as const

const FLEX_PROPS = ['align-items', 'justify-content', 'gap'] as const

const SELECT_OPTIONS: Record<string, string[]> = {
  display: [
    'block',
    'inline',
    'inline-block',
    'flex',
    'inline-flex',
    'grid',
    'inline-grid',
    'none',
    'contents',
  ],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
}

const AUTO_PX_PROPS = new Set([
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'gap',
])

function ensureQwikCSSResetStyle() {
  if (document.getElementById(RESET_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = RESET_STYLE_ID
  s.textContent = `
    #${CARD_ID}, #${CARD_ID} * {
      box-sizing: border-box;
      outline: none !important;
      box-shadow: none;
    }
    #${CARD_ID} {
      --card-bg: linear-gradient(180deg, rgba(20, 22, 28, 0.96), rgba(12, 13, 16, 0.98));
      --card-border: rgba(255, 255, 255, 0.12);
      --card-text: #e7edf5;
      --card-muted: rgba(231, 237, 245, 0.6);
      --card-accent: #6ee7ff;
      --card-accent-2: #7cffad;
      font-family: 'Space Grotesk', 'Manrope', 'Avenir Next', system-ui, sans-serif;
      font-size: 12px;
      line-height: 1.35;
      color: var(--card-text);
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(14px);
      -webkit-user-select: none;
      user-select: none;
      overflow: hidden;
    }
    #${CARD_ID} .qwikcss-card-handle {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      cursor: move;
    }
    #${CARD_ID} .qwikcss-card-crumbs {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }
    #${CARD_ID} .qwikcss-card-crumb {
      position: relative;
      font-size: 11px;
      padding-left: 14px;
      color: rgba(231, 237, 245, 0.6);
      letter-spacing: 0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #${CARD_ID} .qwikcss-card-crumb::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 50%;
      width: 4px;
      height: 4px;
      border-radius: 999px;
      background: rgba(110, 231, 255, 0.5);
      transform: translateY(-50%);
    }
    #${CARD_ID} .qwikcss-card-crumb.is-current {
      color: var(--card-accent);
      font-weight: 600;
    }
    #${CARD_ID} .qwikcss-card-crumb.is-current::before {
      background: var(--card-accent);
    }
    #${CARD_ID} .qwikcss-card-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #${CARD_ID} .qwikcss-card-close {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.06);
      color: inherit;
      cursor: pointer;
      font-size: 16px;
      line-height: 26px;
      padding: 0;
    }
    #${CARD_ID} .qwikcss-card-close:hover {
      border-color: rgba(255, 255, 255, 0.32);
      background: rgba(255, 255, 255, 0.12);
    }
    #${CARD_ID} .qwikcss-card-body {
      padding: 10px 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    #${CARD_ID} .qwikcss-card-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--card-accent);
      letter-spacing: 0.01em;
    }
    #${CARD_ID} .qwikcss-card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    #${CARD_ID} .qwikcss-card-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.06);
      color: rgba(231, 237, 245, 0.9);
      font-size: 11px;
    }
    #${CARD_ID} .qwikcss-card-chip .chip-label {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 9px;
      color: var(--card-muted);
    }
    #${CARD_ID} .qwikcss-card-props {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 260px;
      overflow: auto;
      padding-right: 4px;
    }
    #${CARD_ID} .qwikcss-card-props::-webkit-scrollbar {
      width: 6px;
    }
    #${CARD_ID} .qwikcss-card-props::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 999px;
    }
    #${CARD_ID} .qwikcss-card-prop {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.03);
    }
    #${CARD_ID} .qwikcss-card-prop .k {
      color: var(--card-accent);
      font-size: 14px;
      letter-spacing: 0.03em;
    }
    #${CARD_ID} .qwikcss-card-prop .v {
      color: rgba(231, 237, 245, 0.9);
      font-size: 14px;
      text-align: right;
      word-break: break-word;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      justify-content: flex-end;
    }
    #${CARD_ID} .qwikcss-card-prop .swatch {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
      flex-shrink: 0;
    }
    #${CARD_ID}[data-mode='edit'] .qwikcss-card-props {
      display: none;
    }
    #${CARD_ID} .qwikcss-card-edit {
      display: none;
      flex-direction: column;
      gap: 10px;
    }
    #${CARD_ID}[data-mode='edit'] .qwikcss-card-edit {
      display: flex;
    }
    #${CARD_ID} .qwikcss-card-edit-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    #${CARD_ID} .qwikcss-card-btn {
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.06);
      color: inherit;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
    }
    #${CARD_ID} .qwikcss-card-btn:hover {
      border-color: rgba(255, 255, 255, 0.32);
      background: rgba(255, 255, 255, 0.12);
    }
    #${CARD_ID} .qwikcss-card-btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    #${CARD_ID} .qwikcss-card-hint {
      font-size: 10px;
      color: var(--card-muted);
    }
    #${CARD_ID} .qwikcss-card-edit-props {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 260px;
      overflow: auto;
      padding-right: 4px;
    }
    #${CARD_ID} .qwikcss-card-edit-props::-webkit-scrollbar {
      width: 6px;
    }
    #${CARD_ID} .qwikcss-card-edit-props::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 999px;
    }
    #${CARD_ID} .qwikcss-card-edit-row {
      display: grid;
      grid-template-columns: minmax(110px, 1fr) minmax(0, 1.5fr) auto;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
    }
    #${CARD_ID} .qwikcss-card-edit-row.is-overridden {
      border-color: rgba(124, 255, 173, 0.45);
      background: rgba(124, 255, 173, 0.12);
    }
    #${CARD_ID} .qwikcss-card-edit-row .label {
      color: var(--card-accent);
      font-size: 11px;
      letter-spacing: 0.03em;
    }
    #${CARD_ID} .qwikcss-card-input,
    #${CARD_ID} .qwikcss-card-select {
      width: 100%;
      padding: 4px 6px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(12, 13, 16, 0.75);
      color: var(--card-text);
      font-size: 12px;
    }
    #${CARD_ID} .qwikcss-card-input::placeholder {
      color: var(--card-muted);
    }
    #${CARD_ID} .qwikcss-card-reset {
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.06);
      color: inherit;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
    }
    #${CARD_ID} .qwikcss-card-reset:hover {
      border-color: rgba(255, 255, 255, 0.32);
      background: rgba(255, 255, 255, 0.12);
    }
    #${CARD_ID} .qwikcss-card-reset:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    #${CARD_ID} input,
    #${CARD_ID} select {
      -webkit-user-select: text;
      user-select: text;
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
  card.style.width = '320px'
  card.style.display = 'none'
  card.style.userSelect = 'none'

  const handle = document.createElement('div')
  handle.id = CARD_HANDLE_ID
  handle.className = 'qwikcss-card-handle'

  const crumbs = document.createElement('div')
  crumbs.id = '__qwikcss_card_crumbs__'
  crumbs.className = 'qwikcss-card-crumbs'

  const right = document.createElement('div')
  right.className = 'qwikcss-card-actions'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'qwikcss-card-close'
  closeBtn.textContent = '×'
  closeBtn.setAttribute('type', 'button')
  closeBtn.title = 'Resume inspect'

  closeBtn.addEventListener('mousedown', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
  })
  closeBtn.addEventListener('click', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    if (state.cardEditing) {
      exitEdit()
      return
    }
    if (state.inspectPaused) {
      setPaused(false)
      notifyState()
    }
    state.cardPinned = false
    hideOverlay()
    hideCard()
  })

  right.appendChild(closeBtn)

  handle.appendChild(crumbs)
  handle.appendChild(right)

  const body = document.createElement('div')
  body.className = 'qwikcss-card-body'
  body.innerHTML = `
    <div class="qwikcss-card-title" id="__qwikcss_card_title__">—</div>
    <div class="qwikcss-card-meta">
      <div class="qwikcss-card-chip">
        <span class="chip-label">size</span>
        <span id="__qwikcss_card_size__">—</span>
      </div>
      <div class="qwikcss-card-chip">
        <span class="chip-label">font</span>
        <span id="__qwikcss_card_font__">—</span>
      </div>
    </div>
    <div class="qwikcss-card-props" id="__qwikcss_card_props__"></div>
    <div class="qwikcss-card-edit" id="__qwikcss_card_edit__">
      <div class="qwikcss-card-edit-actions">
        <button class="qwikcss-card-btn" type="button" data-action="reset-all">Reset all</button>
        <span class="qwikcss-card-hint">Close edit to resume inspect</span>
      </div>
      <div class="qwikcss-card-edit-props" id="__qwikcss_card_edit_props__"></div>
    </div>
  `

  card.appendChild(handle)
  card.appendChild(body)
  document.documentElement.appendChild(card)

  card.addEventListener('click', handleCardClick)
  card.addEventListener('input', handleCardInput)
  card.addEventListener('change', handleCardInput)

  handle.addEventListener('mousedown', (ev) => {
    state.dragging = true
    state.cardPinned = true
    const rect = card.getBoundingClientRect()
    state.dragOffsetX = ev.clientX - rect.left
    state.dragOffsetY = ev.clientY - rect.top
    ev.preventDefault()
    ev.stopPropagation()
  })

  document.addEventListener(
    'mousemove',
    (ev) => {
      if (!state.dragging) return
      setCardPos(ev.clientX - state.dragOffsetX, ev.clientY - state.dragOffsetY)
    },
    true
  )

  document.addEventListener(
    'mouseup',
    () => {
      state.dragging = false
    },
    true
  )
}

let pinnedCheckTimer: number | null = null
let overlayRaf: number | null = null

function setCardMode(editing: boolean) {
  const card = document.getElementById(CARD_ID) as HTMLDivElement | null
  if (!card) return
  card.dataset.mode = editing ? 'edit' : 'inspect'
  card.style.width = editing ? '360px' : '320px'
}

function queueOverlayUpdate() {
  if (overlayRaf) return
  overlayRaf = window.requestAnimationFrame(() => {
    overlayRaf = null
    const el = state.currentElement
    if (el && el.isConnected) positionOverlay(el)
  })
}

function startPinnedCheck() {
  if (pinnedCheckTimer) return
  pinnedCheckTimer = window.setInterval(() => {
    if (!state.cardEditing) {
      stopPinnedCheck()
      return
    }
    const el = state.currentElement
    if (!el || !el.isConnected) {
      exitEdit({ hide: true })
      return
    }
    positionOverlay(el)
  }, 500)
}

function stopPinnedCheck() {
  if (!pinnedCheckTimer) return
  window.clearInterval(pinnedCheckTimer)
  pinnedCheckTimer = null
}

function shouldShowFlex(cs: CSSStyleDeclaration, overrides: Record<string, string>) {
  const display = (overrides.display || cs.display || '').toLowerCase()
  return display.includes('flex')
}

function normalizeInlineValue(prop: string, raw: string) {
  const value = raw.trim()
  if (!value) return ''
  if (!AUTO_PX_PROPS.has(prop)) return value
  if (!/^[+-]?(?:\d+|\d*\.\d+)$/.test(value)) return value
  return `${value}px`
}

function renderSelectOptions(options: string[], current: string) {
  const value = current.trim()
  const list = options.slice()
  if (value && !list.includes(value)) list.unshift(value)
  if (!value) list.unshift('')
  return list
    .map((opt) => {
      const label = opt || '-'
      const selected = opt === value ? ' selected' : ''
      return `<option value="${escapeHtml(opt)}"${selected}>${escapeHtml(label)}</option>`
    })
    .join('')
}

function updateResetAllButton(selector: string | null) {
  const card = document.getElementById(CARD_ID)
  const btn = card?.querySelector<HTMLButtonElement>('[data-action="reset-all"]')
  if (!btn) return
  if (!selector) {
    btn.disabled = true
    return
  }
  btn.disabled = Object.keys(getInlineDecls(selector)).length === 0
}

function renderEditProps(el: Element, cs: CSSStyleDeclaration) {
  const props = document.getElementById('__qwikcss_card_edit_props__')
  if (!props) return
  const selector = state.currentSelector || buildSelector(el)
  if (!state.currentSelector) state.currentSelector = selector
  const overrides = selector ? getInlineDecls(selector) : {}
  const showFlex = shouldShowFlex(cs, overrides)
  const editProps = showFlex ? [...EDIT_PROPS, ...FLEX_PROPS] : [...EDIT_PROPS]

  props.innerHTML = editProps
    .map((prop) => {
      const computed = cs.getPropertyValue(prop).trim()
      const override = selector ? overrides[prop] : undefined
      const value = override ?? computed
      const placeholder = override ? computed : ''
      const isSelect = Object.prototype.hasOwnProperty.call(SELECT_OPTIONS, prop)
      const options = isSelect
        ? SELECT_OPTIONS[prop as keyof typeof SELECT_OPTIONS]
        : undefined
      const control = isSelect
        ? `<select class="qwikcss-card-select" data-prop="${prop}">
            ${renderSelectOptions(options || [], value)}
          </select>`
        : `<input class="qwikcss-card-input" type="text" data-prop="${prop}" value="${escapeHtml(
            value || ''
          )}"${placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ''} />`
      const overridden = selector ? hasInlineDecl(selector, prop) : false
      return `
        <div class="qwikcss-card-edit-row${overridden ? ' is-overridden' : ''}" data-prop="${prop}">
          <span class="label">${escapeHtml(prop)}</span>
          ${control}
          <button class="qwikcss-card-reset" type="button" data-action="reset-prop" data-prop="${prop}"${
            overridden ? '' : ' disabled'
          }>Reset</button>
        </div>
      `
    })
    .join('')

  updateResetAllButton(selector)
}

function updateRowState(row: Element | null, overridden: boolean) {
  if (!row) return
  row.classList.toggle('is-overridden', overridden)
  const resetBtn = row.querySelector<HTMLButtonElement>('[data-action="reset-prop"]')
  if (resetBtn) resetBtn.disabled = !overridden
}

function handleCardInput(ev: Event) {
  if (!state.cardEditing) return
  const target = ev.target
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return
  const prop = target.getAttribute('data-prop')
  if (!prop) return
  const selector = state.currentSelector
  if (!selector) return
  const raw = target.value.trim()

  if (!raw) {
    removeInlineDecl(selector, prop)
    updateRowState(target.closest('.qwikcss-card-edit-row'), false)
    updateResetAllButton(selector)
    queueOverlayUpdate()
    return
  }

  const normalized = normalizeInlineValue(prop, raw)
  if (ev.type === 'change' && normalized && normalized !== raw) target.value = normalized
  applyInlineDecl(selector, prop, normalized)
  updateRowState(target.closest('.qwikcss-card-edit-row'), true)
  updateResetAllButton(selector)
  queueOverlayUpdate()

  if (prop === 'display' && ev.type === 'change' && state.currentElement) {
    updateHoverCard(state.currentElement)
  }
}

function handleCardClick(ev: MouseEvent) {
  const target = ev.target as HTMLElement | null
  if (!target) return
  const actionEl = target.closest<HTMLElement>('[data-action]')
  if (actionEl) {
    ev.preventDefault()
    ev.stopPropagation()
    const action = actionEl.getAttribute('data-action')
    if (action === 'reset-all') {
      const selector = state.currentSelector
      if (!selector) return
      clearInlineSelector(selector)
      if (state.currentElement) updateHoverCard(state.currentElement)
      return
    }
    if (action === 'reset-prop') {
      const selector = state.currentSelector
      const prop = actionEl.getAttribute('data-prop')
      if (!selector || !prop) return
      removeInlineDecl(selector, prop)
      if (state.currentElement) updateHoverCard(state.currentElement)
      return
    }
  }

  if (state.cardEditing) return
  if (target.closest('input, select, button, a')) return
  const hoverEl = state.lastHover || state.currentElement
  if (!hoverEl || !hoverEl.isConnected) return
  enterEdit(hoverEl)
}

function enterEdit(el: Element) {
  if (!el.isConnected) return
  state.cardEditing = true
  state.cardPinned = true
  state.lastHover = el
  state.currentElement = el
  state.currentSelector = buildSelector(el)
  setPaused(true)
  notifyState()
  positionOverlay(el)
  sendInspector()
  postToPanel({
    type: 'QWIKCSS_SELECTED',
    selector: state.currentSelector,
    tag: el.tagName.toLowerCase(),
    id: (el as HTMLElement).id || null,
    className: (el as HTMLElement).className || null,
  })
  updateHoverCard(el)
  startPinnedCheck()
}

function exitEdit(opts: { hide?: boolean } = {}) {
  if (!state.cardEditing) return
  state.cardEditing = false
  stopPinnedCheck()
  setPaused(false)
  notifyState()
  if (opts.hide) {
    hideOverlay()
    hideCard()
    return
  }
  if (state.lastHover && state.lastHover.isConnected) {
    updateHoverCard(state.lastHover)
  } else {
    hideCard()
  }
}

export function prepareHoverCard() {
  ensureHoverCard()
}

function setCardPos(x: number, y: number) {
  const card = document.getElementById(CARD_ID) as HTMLDivElement | null
  if (!card) return
  const w = card.offsetWidth || 320
  const h = card.offsetHeight || 200

  const px = Math.min(window.innerWidth - 10, Math.max(10, x))
  const py = Math.min(window.innerHeight - 10, Math.max(10, y))

  card.style.left = `${Math.min(px, window.innerWidth - w - 10)}px`
  card.style.top = `${Math.min(py, window.innerHeight - h - 10)}px`
}

function showCard() {
  const card = document.getElementById(CARD_ID) as HTMLDivElement | null
  if (card) card.style.display = 'block'
}

export function hideCard() {
  const card = document.getElementById(CARD_ID) as HTMLDivElement | null
  if (card) card.style.display = 'none'
}

export function updateHoverCard(el: Element) {
  ensureHoverCard()
  const activeEl = state.cardEditing ? state.currentElement || el : el
  if (!activeEl) return
  if (state.cardEditing && state.currentElement && !state.currentElement.isConnected) {
    exitEdit({ hide: true })
    return
  }
  showCard()
  setCardMode(state.cardEditing)

  const rect = activeEl.getBoundingClientRect()
  const cs = getComputedStyle(activeEl)

  const w = formatNumber(rect.width)
  const h = formatNumber(rect.height)

  const rawFont = (cs.fontFamily || '').split(',')[0] || ''
  const fontFamily = rawFont.replace(/^['"]|['"]$/g, '').trim() || '—'
  const fontSize = cs.fontSize || '—'

  const crumbs = document.getElementById('__qwikcss_card_crumbs__')
  const title = document.getElementById('__qwikcss_card_title__')
  const size = document.getElementById('__qwikcss_card_size__')
  const font = document.getElementById('__qwikcss_card_font__')
  const props = document.getElementById('__qwikcss_card_props__')
  const closeBtn = document.querySelector<HTMLButtonElement>(`#${CARD_ID} .qwikcss-card-close`)

  if (closeBtn) {
    closeBtn.title = state.cardEditing
      ? 'Close edit'
      : state.inspectPaused
        ? 'Resume inspect'
        : 'Hide card'
  }
  if (crumbs) {
    const path = getElementPath(activeEl)
    crumbs.innerHTML = path
      .map((item, index) => {
        const cls =
          index === path.length - 1 ? 'qwikcss-card-crumb is-current' : 'qwikcss-card-crumb'
        const pad = index * 10
        return `<div class="${cls}" style="margin-left:${pad}px">${escapeHtml(item)}</div>`
      })
      .join('')
  }
  if (title) title.textContent = describeElement(activeEl)
  if (size) size.textContent = `${w}×${h}`
  if (font) font.textContent = `${fontFamily} ${fontSize}`
  if (props && !state.cardEditing) {
    const rows: string[] = []
    for (const prop of INSPECT_PROPS) {
      const value = cs.getPropertyValue(prop).trim()
      if (!value || isTrivialValue(value)) continue
      const safeValue = escapeHtml(value)
      const showSwatch =
        COLOR_PROPS.has(prop) &&
        value !== 'transparent' &&
        value !== 'rgba(0, 0, 0, 0)' &&
        value !== 'rgba(0,0,0,0)'
      const swatch = showSwatch
        ? `<span class="swatch" style="background:${safeValue}"></span>`
        : ''
      rows.push(
        `<div class="qwikcss-card-prop"><span class="k">${prop}</span><span class="v">${swatch}${safeValue}</span></div>`
      )
    }
    props.innerHTML = rows.join('')
  }

  if (state.cardEditing) renderEditProps(activeEl, cs)

  if (!state.cardPinned && !state.dragging && !state.cardEditing) {
    setCardPos(rect.right + 10, rect.top)
  }
}
