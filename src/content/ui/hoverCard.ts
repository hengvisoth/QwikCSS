import { createApp, type App } from 'vue'
import { CARD_HANDLE_ID, CARD_ID, COLOR_PROPS, INSPECT_PROPS } from '../constants'
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
import HoverCardView from './HoverCard.vue'
import './hoverCard.css'

type GeomField = {
  key: 'x' | 'y' | 'rotate' | 'width' | 'height' | 'radius'
  label: string
  kind: 'transform' | 'prop'
  prop?: string
  unit: string
}

const GEOM_FIELDS: GeomField[] = [
  { key: 'x', label: 'X', kind: 'transform', unit: 'px' },
  { key: 'y', label: 'Y', kind: 'transform', unit: 'px' },
  { key: 'rotate', label: 'ROT', kind: 'transform', unit: 'deg' },
  { key: 'width', label: 'W', kind: 'prop', prop: 'width', unit: 'px' },
  { key: 'height', label: 'H', kind: 'prop', prop: 'height', unit: 'px' },
  { key: 'radius', label: 'R', kind: 'prop', prop: 'border-radius', unit: 'px' },
]

type TransformParts = { x: string; y: string; r: string }

const transformStore: Record<string, TransformParts> = {}
let hoverCardApp: App<Element> | null = null

const AUTO_PX_PROPS = new Set([
  'width',
  'height',
  'border-radius',
  'font-size',
  'letter-spacing',
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

const FONT_FAMILY_OPTIONS = [
  { label: 'Space Grotesk', value: "'Space Grotesk', system-ui, sans-serif" },
  { label: 'Manrope', value: "'Manrope', system-ui, sans-serif" },
  { label: 'Avenir Next', value: "'Avenir Next', system-ui, sans-serif" },
  { label: 'Inter', value: "'Inter', system-ui, sans-serif" },
  { label: 'Roboto', value: "'Roboto', system-ui, sans-serif" },
  { label: 'Helvetica', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: 'Georgia', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Courier', value: "'Courier New', Courier, monospace" },
  { label: 'System', value: 'system-ui' },
]

const FONT_WEIGHT_OPTIONS = [
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  'normal',
  'bold',
]

function ensureHoverCard() {
  if (document.getElementById(CARD_ID)) return

  if (hoverCardApp) {
    hoverCardApp.unmount()
    hoverCardApp = null
  }

  const card = document.createElement('div')
  card.id = CARD_ID
  card.style.position = 'fixed'
  card.style.zIndex = '2147483647'
  card.style.width = '320px'
  card.style.display = 'none'
  card.style.userSelect = 'none'
  document.documentElement.appendChild(card)
  hoverCardApp = createApp(HoverCardView)
  hoverCardApp.mount(card)

  const closeBtn = card.querySelector<HTMLButtonElement>('.qwikcss-card-close')
  if (closeBtn) {
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
  }

  card.addEventListener('click', handleCardClick)
  card.addEventListener('input', handleCardInput)
  card.addEventListener('change', handleCardInput)
  card.addEventListener('mousedown', handleScrubStart, true)

  const handle = card.querySelector<HTMLElement>(`#${CARD_HANDLE_ID}`)
  if (handle) {
    handle.addEventListener('mousedown', (ev) => {
      state.dragging = true
      state.cardPinned = true
      const rect = card.getBoundingClientRect()
      state.dragOffsetX = ev.clientX - rect.left
      state.dragOffsetY = ev.clientY - rect.top
      ev.preventDefault()
      ev.stopPropagation()
    })
  }

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
let openSection: string | null = null

function setCardMode(editing: boolean) {
  const card = document.getElementById(CARD_ID) as HTMLDivElement | null
  if (!card) return
  card.dataset.mode = editing ? 'edit' : 'inspect'
  card.style.width = editing ? '360px' : '320px'
}

function setOpenSection(section: string | null) {
  openSection = section
  const card = document.getElementById(CARD_ID) as HTMLDivElement | null
  if (!card) return
  if (section) card.dataset.sectionOpen = section
  else delete card.dataset.sectionOpen
  card.querySelectorAll<HTMLElement>('.qwikcss-card-section').forEach((btn) => {
    const active = btn.dataset.section === section
    btn.classList.toggle('is-open', active)
  })
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

function normalizeInlineValue(prop: string, raw: string) {
  const value = raw.trim()
  if (!value) return ''
  if (!AUTO_PX_PROPS.has(prop)) return value
  if (!/^[+-]?(?:\d+|\d*\.\d+)$/.test(value)) return value
  return `${value}px`
}

function normalizeComputedValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return '0'
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i)
  if (!match) return trimmed
  return `${formatNumber(Number(match[1]))}${match[2] || ''}`
}

function getUnitFromValue(value: string, fallback = 'px') {
  const trimmed = value.trim()
  const match = trimmed.match(/^-?\d+(?:\.\d+)?([a-z%]*)$/i)
  if (!match) return fallback
  return match[1] || fallback
}

function formatFontLabel(value: string) {
  const first = value.split(',')[0]?.trim() || value.trim()
  return first.replace(/^['"]|['"]$/g, '') || value
}

function renderFontOptions(current: string) {
  const options = [...FONT_FAMILY_OPTIONS]
  const currentLabel = current ? formatFontLabel(current) : ''
  if (current && !options.some((opt) => opt.value === current)) {
    options.unshift({ label: currentLabel || current, value: current })
  }
  return options
    .map((opt) => {
      const selected = opt.value === current ? ' selected' : ''
      return `<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(
        opt.label
      )}</option>`
    })
    .join('')
}

function renderWeightOptions(current: string) {
  const options = [...FONT_WEIGHT_OPTIONS]
  if (current && !options.includes(current)) options.unshift(current)
  return options
    .map((opt) => {
      const selected = opt === current ? ' selected' : ''
      return `<option value="${escapeHtml(opt)}"${selected}>${escapeHtml(opt)}</option>`
    })
    .join('')
}

function normalizeHexColor(value: string) {
  const v = value.trim()
  const hex3 = v.match(/^#([0-9a-f]{3})$/i)
  if (hex3) {
    const full = hex3[1]
      .split('')
      .map((ch) => ch + ch)
      .join('')
    return `#${full.toLowerCase()}`
  }
  const hex6 = v.match(/^#([0-9a-f]{6})$/i)
  if (hex6) return `#${hex6[1].toLowerCase()}`
  return null
}

function rgbToHex(value: string) {
  const match = value.trim().match(/^rgba?\(([^)]+)\)$/i)
  if (!match) return null
  const parts = match[1].split(',').map((v) => Number.parseFloat(v.trim()))
  if (parts.length < 3 || parts.some((v) => Number.isNaN(v))) return null
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)))
    return clamped.toString(16).padStart(2, '0')
  }
  return `#${toHex(parts[0])}${toHex(parts[1])}${toHex(parts[2])}`
}

function normalizeColorValue(value: string) {
  if (!value) return null
  const hex = normalizeHexColor(value)
  if (hex) return hex
  return rgbToHex(value)
}

function parseTransform(value: string): TransformParts {
  const fallback = { x: '0px', y: '0px', r: '0deg' }
  if (!value || value === 'none') return fallback
  const matrixMatch = value.match(/^matrix\(([^)]+)\)$/)
  if (matrixMatch) {
    const parts = matrixMatch[1].split(',').map((v) => Number.parseFloat(v.trim()))
    if (parts.length === 6 && parts.every((v) => !Number.isNaN(v))) {
      const [a, b, _c, _d, tx, ty] = parts
      const angle = (Math.atan2(b, a) * 180) / Math.PI
      return {
        x: `${formatNumber(tx)}px`,
        y: `${formatNumber(ty)}px`,
        r: `${formatNumber(angle)}deg`,
      }
    }
  }
  const matrix3dMatch = value.match(/^matrix3d\(([^)]+)\)$/)
  if (matrix3dMatch) {
    const parts = matrix3dMatch[1].split(',').map((v) => Number.parseFloat(v.trim()))
    if (parts.length === 16 && parts.every((v) => !Number.isNaN(v))) {
      const tx = parts[12]
      const ty = parts[13]
      const angle = (Math.atan2(parts[1], parts[0]) * 180) / Math.PI
      return {
        x: `${formatNumber(tx)}px`,
        y: `${formatNumber(ty)}px`,
        r: `${formatNumber(angle)}deg`,
      }
    }
  }
  return fallback
}

function normalizeTransformValue(field: 'x' | 'y' | 'rotate', raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return field === 'rotate' ? '0deg' : '0px'
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i)
  if (!match) return trimmed
  const unit = match[2] || (field === 'rotate' ? 'deg' : 'px')
  return `${formatNumber(Number(match[1]))}${unit}`
}

function getTransformParts(selector: string | null, el: Element | null) {
  if (!selector) return { x: '0px', y: '0px', r: '0deg' }
  if (transformStore[selector]) return transformStore[selector]
  if (!el) return { x: '0px', y: '0px', r: '0deg' }
  const parts = parseTransform(getComputedStyle(el).transform)
  transformStore[selector] = parts
  return parts
}

function setTransformParts(selector: string, parts: TransformParts) {
  transformStore[selector] = parts
  applyInlineDecl(selector, 'transform', `translate(${parts.x}, ${parts.y}) rotate(${parts.r})`)
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

function findFieldContainer(input: HTMLElement) {
  return input.closest(
    '.qwikcss-card-field, .qwikcss-spacing-cell, .qwikcss-spacing-pad-cell, .qwikcss-typography-field'
  )
}

function getPropMeta(
  prop: string,
  cs: CSSStyleDeclaration,
  overrides: Record<string, string>,
  selector: string | null
) {
  const computedRaw = cs.getPropertyValue(prop).trim()
  const overrideRaw = selector ? overrides[prop] : undefined
  const value = normalizeComputedValue(overrideRaw ?? computedRaw)
  const placeholder = overrideRaw ? normalizeComputedValue(computedRaw) : ''
  const unit = getUnitFromValue(value, getUnitFromValue(computedRaw, 'px'))
  const overridden = selector ? hasInlineDecl(selector, prop) : false
  return { value, placeholder, unit, overridden }
}

function renderSpacingPanel(
  cs: CSSStyleDeclaration,
  overrides: Record<string, string>,
  selector: string | null
) {
  const spacing = document.getElementById('__qwikcss_card_spacing__')
  if (!spacing) return

  const mt = getPropMeta('margin-top', cs, overrides, selector)
  const mr = getPropMeta('margin-right', cs, overrides, selector)
  const mb = getPropMeta('margin-bottom', cs, overrides, selector)
  const ml = getPropMeta('margin-left', cs, overrides, selector)
  const pt = getPropMeta('padding-top', cs, overrides, selector)
  const pr = getPropMeta('padding-right', cs, overrides, selector)
  const pb = getPropMeta('padding-bottom', cs, overrides, selector)
  const pl = getPropMeta('padding-left', cs, overrides, selector)

  const input = (meta: ReturnType<typeof getPropMeta>, prop: string) => {
    const placeholder = meta.placeholder ? ` placeholder="${escapeHtml(meta.placeholder)}"` : ''
    return `<input class="qwikcss-spacing-input qc-w-full qc-bg-transparent qc-text-center qc-text-[12px] qc-font-semibold qc-text-white/90 qc-outline-none qc-cursor-ew-resize focus:qc-cursor-text" type="text" data-prop="${prop}" data-scrub="true" data-unit="${escapeHtml(
      meta.unit
    )}" value="${escapeHtml(meta.value)}"${placeholder} />`
  }

  spacing.innerHTML = `
    <div class="qwikcss-spacing-label qc-mb-2 qc-text-[11px] qc-italic qc-text-[color:var(--qc-muted)]">Margin</div>
    <div class="qwikcss-spacing-grid qc-grid qc-grid-cols-[minmax(0,1fr)_minmax(120px,1.1fr)_minmax(0,1fr)] qc-grid-rows-[auto_auto_auto] qc-gap-2 qc-items-center">
      <div class="qwikcss-spacing-cell qwikcss-spacing-top qc-col-start-2 qc-row-start-1 qc-flex qc-items-center qc-justify-center qc-rounded-lg qc-border qc-border-white/10 qc-bg-white/5 qc-p-1.5${
        mt.overridden ? ' is-overridden' : ''
      }">
        ${input(mt, 'margin-top')}
      </div>
      <div class="qwikcss-spacing-cell qwikcss-spacing-left qc-col-start-1 qc-row-start-2 qc-flex qc-items-center qc-justify-center qc-rounded-lg qc-border qc-border-white/10 qc-bg-white/5 qc-p-1.5${
        ml.overridden ? ' is-overridden' : ''
      }">
        ${input(ml, 'margin-left')}
      </div>
      <div class="qwikcss-spacing-pad qc-col-start-2 qc-row-start-2 qc-grid qc-grid-cols-3 qc-grid-rows-3 qc-gap-1.5 qc-items-center qc-rounded-lg qc-border qc-border-emerald-200/40 qc-bg-emerald-200/10 qc-p-2">
        <div class="qwikcss-spacing-pad-cell qwikcss-pad-top qc-col-start-2 qc-row-start-1 qc-flex qc-items-center qc-justify-center qc-rounded-md qc-border qc-border-white/10 qc-bg-black/30 qc-p-1${
          pt.overridden ? ' is-overridden' : ''
        }">
          ${input(pt, 'padding-top')}
        </div>
        <div class="qwikcss-spacing-pad-cell qwikcss-pad-left qc-col-start-1 qc-row-start-2 qc-flex qc-items-center qc-justify-center qc-rounded-md qc-border qc-border-white/10 qc-bg-black/30 qc-p-1${
          pl.overridden ? ' is-overridden' : ''
        }">
          ${input(pl, 'padding-left')}
        </div>
        <div class="pad-label qc-col-start-2 qc-row-start-2 qc-text-[11px] qc-italic qc-text-[color:var(--qc-muted)] qc-text-center">Padding</div>
        <div class="qwikcss-spacing-pad-cell qwikcss-pad-right qc-col-start-3 qc-row-start-2 qc-flex qc-items-center qc-justify-center qc-rounded-md qc-border qc-border-white/10 qc-bg-black/30 qc-p-1${
          pr.overridden ? ' is-overridden' : ''
        }">
          ${input(pr, 'padding-right')}
        </div>
        <div class="qwikcss-spacing-pad-cell qwikcss-pad-bottom qc-col-start-2 qc-row-start-3 qc-flex qc-items-center qc-justify-center qc-rounded-md qc-border qc-border-white/10 qc-bg-black/30 qc-p-1${
          pb.overridden ? ' is-overridden' : ''
        }">
          ${input(pb, 'padding-bottom')}
        </div>
      </div>
      <div class="qwikcss-spacing-cell qwikcss-spacing-right qc-col-start-3 qc-row-start-2 qc-flex qc-items-center qc-justify-center qc-rounded-lg qc-border qc-border-white/10 qc-bg-white/5 qc-p-1.5${
        mr.overridden ? ' is-overridden' : ''
      }">
        ${input(mr, 'margin-right')}
      </div>
      <div class="qwikcss-spacing-cell qwikcss-spacing-bottom qc-col-start-2 qc-row-start-3 qc-flex qc-items-center qc-justify-center qc-rounded-lg qc-border qc-border-white/10 qc-bg-white/5 qc-p-1.5${
        mb.overridden ? ' is-overridden' : ''
      }">
        ${input(mb, 'margin-bottom')}
      </div>
    </div>
  `
}

function renderTypographyPanel(
  cs: CSSStyleDeclaration,
  overrides: Record<string, string>,
  selector: string | null
) {
  const panel = document.getElementById('__qwikcss_card_typography__')
  if (!panel) return

  const fontFamilyRaw = overrides['font-family'] ?? cs.getPropertyValue('font-family').trim()
  const fontWeightRaw = overrides['font-weight'] ?? cs.getPropertyValue('font-weight').trim()
  const fontWeightValue = normalizeComputedValue(fontWeightRaw)
  const fontSize = getPropMeta('font-size', cs, overrides, selector)
  const lineHeight = getPropMeta('line-height', cs, overrides, selector)
  const letterSpacing = getPropMeta('letter-spacing', cs, overrides, selector)
  const colorRaw = overrides.color ?? cs.getPropertyValue('color').trim()
  const colorHex = normalizeColorValue(colorRaw)
  const colorText = colorHex || colorRaw || '#ffffff'
  const textAlignRaw = overrides['text-align'] ?? cs.getPropertyValue('text-align').trim()
  const textAlign = (textAlignRaw || 'left').toLowerCase()
  const decorationLine =
    overrides['text-decoration-line'] ?? cs.getPropertyValue('text-decoration-line').trim()
  const decoration = decorationLine || cs.getPropertyValue('text-decoration').trim() || ''
  const underlineActive = decoration.toLowerCase().includes('underline')

  const familyOverridden = selector ? hasInlineDecl(selector, 'font-family') : false
  const weightOverridden = selector ? hasInlineDecl(selector, 'font-weight') : false
  const colorOverridden = selector ? hasInlineDecl(selector, 'color') : false
  const alignOverridden = selector ? hasInlineDecl(selector, 'text-align') : false
  const underlineOverridden = selector ? hasInlineDecl(selector, 'text-decoration-line') : false

  const fieldInput = (
    label: string,
    meta: ReturnType<typeof getPropMeta>,
    prop: string,
    extraClass = ''
  ) => {
    const placeholder = meta.placeholder ? ` placeholder="${escapeHtml(meta.placeholder)}"` : ''
    return `
      <div class="qwikcss-typography-field qc-flex qc-flex-col qc-gap-1 qc-rounded-lg qc-border qc-border-white/10 qc-bg-white/5 qc-px-2 qc-py-1.5${
        meta.overridden ? ' is-overridden' : ''
      } ${extraClass}">
        <span class="label qc-text-[10px] qc-uppercase qc-tracking-[0.2em] qc-text-[color:var(--qc-muted)]">${escapeHtml(
          label
        )}</span>
        <input class="qc-bg-transparent qc-text-[12px] qc-font-semibold qc-text-white/90 qc-outline-none qc-cursor-ew-resize focus:qc-cursor-text" type="text" data-prop="${prop}" data-scrub="true" data-unit="${escapeHtml(
          meta.unit
        )}" value="${escapeHtml(meta.value)}"${placeholder} />
      </div>
    `
  }

  panel.innerHTML = `
    <div class="qwikcss-typography-row qc-grid qc-grid-cols-1 qc-gap-2">
      <div class="qwikcss-typography-field qc-flex qc-items-center qc-rounded-lg qc-border qc-border-white/10 qc-bg-white/5 qc-px-2 qc-py-1.5${
        familyOverridden ? ' is-overridden' : ''
      }">
        <select class="qwikcss-typography-select qc-w-full qc-bg-transparent qc-text-[12px] qc-text-white/90 qc-outline-none" data-prop="font-family">
          ${renderFontOptions(fontFamilyRaw)}
        </select>
      </div>
    </div>
    <div class="qwikcss-typography-row qc-grid qc-grid-cols-[minmax(0,1fr)_auto_auto] qc-items-center qc-gap-2">
      <div class="qwikcss-typography-field qc-flex qc-items-center qc-rounded-lg qc-border qc-border-white/10 qc-bg-white/5 qc-px-2 qc-py-1.5${
        weightOverridden ? ' is-overridden' : ''
      }">
        <select class="qwikcss-typography-select qc-w-full qc-bg-transparent qc-text-[12px] qc-text-white/90 qc-outline-none" data-prop="font-weight">
          ${renderWeightOptions(fontWeightValue)}
        </select>
      </div>
      ${fieldInput('A', fontSize, 'font-size')}
      ${fieldInput('LH', lineHeight, 'line-height')}
    </div>
    <div class="qwikcss-typography-row qc-grid qc-grid-cols-[minmax(0,1fr)_auto] qc-items-center qc-gap-2">
      <div class="qwikcss-typography-field qwikcss-typography-color qc-flex qc-items-center qc-gap-2 qc-rounded-lg qc-border qc-border-white/10 qc-bg-white/5 qc-px-2 qc-py-1.5${
        colorOverridden ? ' is-overridden' : ''
      }">
        <input class="qc-h-6 qc-w-6 qc-shrink-0 qc-rounded-full qc-border qc-border-white/20 qc-bg-transparent qc-p-0" type="color" data-prop="color" value="${escapeHtml(
          colorHex || '#ffffff'
        )}" />
        <input class="qc-w-full qc-bg-transparent qc-text-[12px] qc-font-semibold qc-text-white/90 qc-outline-none" type="text" data-prop="color" value="${escapeHtml(
          colorText
        )}" />
      </div>
      ${fieldInput('LS', letterSpacing, 'letter-spacing')}
    </div>
    <div class="qwikcss-typography-row qc-grid qc-grid-cols-[minmax(0,1fr)_auto] qc-items-center qc-gap-2">
      <div class="qwikcss-typography-buttons qc-flex qc-items-center qc-gap-1 qc-rounded-lg qc-border qc-border-white/10 qc-bg-white/5 qc-px-2 qc-py-1.5${
        alignOverridden ? ' is-overridden' : ''
      }">
        <button class="qwikcss-typography-btn qc-flex qc-h-7 qc-w-7 qc-items-center qc-justify-center qc-rounded-md qc-border qc-border-white/10 qc-bg-white/5 qc-text-[11px] qc-font-semibold qc-text-white/80 qc-transition hover:qc-border-white/40 hover:qc-bg-white/15${
          textAlign === 'left' ? ' is-active' : ''
        }" type="button" data-action="text-align" data-value="left" aria-pressed="${
          textAlign === 'left' ? 'true' : 'false'
        }">L</button>
        <button class="qwikcss-typography-btn qc-flex qc-h-7 qc-w-7 qc-items-center qc-justify-center qc-rounded-md qc-border qc-border-white/10 qc-bg-white/5 qc-text-[11px] qc-font-semibold qc-text-white/80 qc-transition hover:qc-border-white/40 hover:qc-bg-white/15${
          textAlign === 'center' ? ' is-active' : ''
        }" type="button" data-action="text-align" data-value="center" aria-pressed="${
          textAlign === 'center' ? 'true' : 'false'
        }">C</button>
        <button class="qwikcss-typography-btn qc-flex qc-h-7 qc-w-7 qc-items-center qc-justify-center qc-rounded-md qc-border qc-border-white/10 qc-bg-white/5 qc-text-[11px] qc-font-semibold qc-text-white/80 qc-transition hover:qc-border-white/40 hover:qc-bg-white/15${
          textAlign === 'right' ? ' is-active' : ''
        }" type="button" data-action="text-align" data-value="right" aria-pressed="${
          textAlign === 'right' ? 'true' : 'false'
        }">R</button>
        <button class="qwikcss-typography-btn qc-flex qc-h-7 qc-w-7 qc-items-center qc-justify-center qc-rounded-md qc-border qc-border-white/10 qc-bg-white/5 qc-text-[11px] qc-font-semibold qc-text-white/80 qc-transition hover:qc-border-white/40 hover:qc-bg-white/15${
          textAlign === 'justify' ? ' is-active' : ''
        }" type="button" data-action="text-align" data-value="justify" aria-pressed="${
          textAlign === 'justify' ? 'true' : 'false'
        }">J</button>
      </div>
      <button class="qwikcss-typography-btn qc-flex qc-h-7 qc-w-7 qc-items-center qc-justify-center qc-rounded-md qc-border qc-border-white/10 qc-bg-white/5 qc-text-[11px] qc-font-semibold qc-text-white/80 qc-transition hover:qc-border-white/40 hover:qc-bg-white/15${
        underlineActive ? ' is-active' : ''
      }${underlineOverridden ? ' is-overridden' : ''}" type="button" data-action="toggle-underline" aria-pressed="${
        underlineActive ? 'true' : 'false'
      }">U</button>
    </div>
  `
}

function renderEditPanel(el: Element, cs: CSSStyleDeclaration) {
  const geom = document.getElementById('__qwikcss_card_geom__')
  if (!geom) return
  const selector = state.currentSelector || buildSelector(el)
  if (!state.currentSelector) state.currentSelector = selector
  const overrides = selector ? getInlineDecls(selector) : {}
  const transform = selector ? getTransformParts(selector, el) : { x: '0px', y: '0px', r: '0deg' }
  const transformOverridden = selector ? hasInlineDecl(selector, 'transform') : false

  geom.innerHTML = GEOM_FIELDS.map((field) => {
    let value = ''
    let overridden = false
    if (field.kind === 'transform') {
      overridden = transformOverridden
      if (field.key === 'x') value = transform.x
      if (field.key === 'y') value = transform.y
      if (field.key === 'rotate') value = transform.r
    } else if (field.prop) {
      const raw = overrides[field.prop] ?? cs.getPropertyValue(field.prop).trim()
      value = normalizeComputedValue(raw)
      overridden = selector ? hasInlineDecl(selector, field.prop) : false
    }

    const dataAttr =
      field.kind === 'transform' ? `data-field="${field.key}"` : `data-prop="${field.prop}"`
    return `
      <div class="qwikcss-card-field qc-flex qc-flex-col qc-gap-1.5 qc-rounded-lg qc-border qc-border-white/10 qc-bg-white/5 qc-p-2${
        overridden ? ' is-overridden' : ''
      }">
        <span class="label qc-text-[10px] qc-uppercase qc-tracking-[0.2em] qc-text-[color:var(--qc-muted)]">${escapeHtml(
          field.label
        )}</span>
        <input class="qwikcss-card-input qc-bg-transparent qc-text-[13px] qc-font-semibold qc-text-white/90 qc-outline-none qc-cursor-ew-resize focus:qc-cursor-text" type="text" ${dataAttr} data-scrub="true" data-unit="${
          field.unit
        }" value="${escapeHtml(value)}" />
      </div>
    `
  }).join('')

  renderSpacingPanel(cs, overrides, selector)
  renderTypographyPanel(cs, overrides, selector)
  updateResetAllButton(selector)
}

function updateFieldState(field: Element | null, overridden: boolean) {
  if (!field) return
  field.classList.toggle('is-overridden', overridden)
}

function applyPropValue(
  selector: string,
  prop: string,
  raw: string,
  input: HTMLInputElement | HTMLSelectElement,
  commit: boolean
) {
  const value = raw.trim()
  if (!value) {
    removeInlineDecl(selector, prop)
    updateFieldState(findFieldContainer(input), false)
    updateResetAllButton(selector)
    queueOverlayUpdate()
    return
  }

  const normalized = normalizeInlineValue(prop, value)
  if (commit && normalized && normalized !== value) input.value = normalized
  applyInlineDecl(selector, prop, normalized)
  updateFieldState(findFieldContainer(input), true)
  updateResetAllButton(selector)
  queueOverlayUpdate()
}

function applyTransformValue(
  selector: string,
  field: 'x' | 'y' | 'rotate',
  raw: string,
  input: HTMLInputElement,
  commit: boolean
) {
  const normalized = normalizeTransformValue(field, raw)
  if (commit && normalized !== raw) input.value = normalized
  const parts = getTransformParts(selector, state.currentElement)
  if (field === 'x') parts.x = normalized
  if (field === 'y') parts.y = normalized
  if (field === 'rotate') parts.r = normalized
  setTransformParts(selector, parts)
  updateFieldState(findFieldContainer(input), true)
  updateResetAllButton(selector)
  queueOverlayUpdate()
}

type ScrubState = {
  input: HTMLInputElement
  selector: string
  prop?: string
  field?: 'x' | 'y' | 'rotate'
  startX: number
  startValue: number
  unit: string
  active: boolean
}

let scrubState: ScrubState | null = null

function parseScrubValue(raw: string, fallbackUnit: string) {
  const trimmed = raw.trim()
  if (!trimmed) return { value: 0, unit: fallbackUnit || 'px' }
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i)
  if (!match) return null
  const unit = match[2] || fallbackUnit
  if (!unit) return null
  return { value: Number(match[1]), unit }
}

function handleScrubStart(ev: MouseEvent) {
  if (!state.cardEditing) return
  if (ev.button !== 0) return
  const target = ev.target
  if (!(target instanceof HTMLInputElement)) return
  if (!target.dataset.scrub) return
  const selector = state.currentSelector
  if (!selector) return
  const field = target.getAttribute('data-field') as 'x' | 'y' | 'rotate' | null
  const prop = target.getAttribute('data-prop')
  if (!field && !prop) return
  const parsed = parseScrubValue(target.value, target.dataset.unit || '')
  if (!parsed) return

  scrubState = {
    input: target,
    selector,
    prop: prop || undefined,
    field: field || undefined,
    startX: ev.clientX,
    startValue: parsed.value,
    unit: parsed.unit,
    active: false,
  }

  document.addEventListener('mousemove', handleScrubMove, true)
  document.addEventListener('mouseup', handleScrubEnd, true)
}

function handleScrubMove(ev: MouseEvent) {
  if (!scrubState) return
  const delta = ev.clientX - scrubState.startX
  if (!scrubState.active) {
    if (Math.abs(delta) < 3) return
    scrubState.active = true
  }

  const step = ev.altKey ? 0.1 : ev.shiftKey ? 10 : 1
  const next = scrubState.startValue + delta * step
  const nextValue = `${formatNumber(next)}${scrubState.unit}`
  scrubState.input.value = nextValue

  if (scrubState.field) {
    applyTransformValue(scrubState.selector, scrubState.field, nextValue, scrubState.input, false)
  } else if (scrubState.prop) {
    applyPropValue(scrubState.selector, scrubState.prop, nextValue, scrubState.input, false)
  }
  ev.preventDefault()
}

function handleScrubEnd(ev: MouseEvent) {
  if (!scrubState) return
  if (scrubState.active) ev.preventDefault()
  stopScrub()
}

function stopScrub() {
  document.removeEventListener('mousemove', handleScrubMove, true)
  document.removeEventListener('mouseup', handleScrubEnd, true)
  scrubState = null
}

function handleCardInput(ev: Event) {
  if (!state.cardEditing) return
  const target = ev.target
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return
  const prop = target.getAttribute('data-prop')
  const field = target.getAttribute('data-field') as 'x' | 'y' | 'rotate' | null
  const selector = state.currentSelector
  if (!selector) return
  const raw = target.value
  const commit = ev.type === 'change'

  if (field) {
    if (target instanceof HTMLInputElement) {
      applyTransformValue(selector, field, raw, target, commit)
    }
    return
  }
  if (!prop) return
  if (target instanceof HTMLInputElement && prop === 'color') {
    const container = target.closest('.qwikcss-typography-color')
    if (container) {
      if (target.type === 'color') {
        const textInput = container.querySelector<HTMLInputElement>('input[type="text"][data-prop="color"]')
        if (textInput) textInput.value = target.value
      } else {
        const colorValue = normalizeColorValue(target.value)
        const colorInput = container.querySelector<HTMLInputElement>('input[type="color"][data-prop="color"]')
        if (colorInput && colorValue) colorInput.value = colorValue
      }
    }
  }
  applyPropValue(selector, prop, raw, target, commit)
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
      delete transformStore[selector]
      if (state.currentElement) updateHoverCard(state.currentElement)
      return
    }
  }

  const alignBtn = target.closest<HTMLElement>('[data-action="text-align"]')
  if (alignBtn) {
    ev.preventDefault()
    ev.stopPropagation()
    const selector = state.currentSelector
    const value = alignBtn.getAttribute('data-value')
    if (!selector || !value) return
    applyInlineDecl(selector, 'text-align', value)
    const el = state.currentElement || state.lastHover
    if (el) updateHoverCard(el)
    return
  }

  const underlineBtn = target.closest<HTMLElement>('[data-action="toggle-underline"]')
  if (underlineBtn) {
    ev.preventDefault()
    ev.stopPropagation()
    const selector = state.currentSelector
    if (!selector) return
    const cs = state.currentElement ? getComputedStyle(state.currentElement) : null
    const current =
      (selector && getInlineDecls(selector)['text-decoration-line']) ||
      cs?.getPropertyValue('text-decoration-line').trim() ||
      cs?.getPropertyValue('text-decoration').trim() ||
      ''
    const next = current.toLowerCase().includes('underline') ? 'none' : 'underline'
    applyInlineDecl(selector, 'text-decoration-line', next)
    const el = state.currentElement || state.lastHover
    if (el) updateHoverCard(el)
    return
  }

  const sectionBtn = target.closest<HTMLElement>('.qwikcss-card-section')
  if (sectionBtn) {
    ev.preventDefault()
    ev.stopPropagation()
    const section = sectionBtn.dataset.section || null
    setOpenSection(openSection === section ? null : section)
    return
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
  stopScrub()
  state.cardEditing = false
  stopPinnedCheck()
  setOpenSection(null)
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
          index === path.length - 1
            ? 'qwikcss-card-crumb is-current qc-relative qc-pl-4 qc-text-[11px] qc-tracking-[0.06em] qc-text-[color:var(--qc-muted)] qc-whitespace-nowrap qc-overflow-hidden qc-text-ellipsis'
            : 'qwikcss-card-crumb qc-relative qc-pl-4 qc-text-[11px] qc-tracking-[0.06em] qc-text-[color:var(--qc-muted)] qc-whitespace-nowrap qc-overflow-hidden qc-text-ellipsis'
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
        ? `<span class="swatch qc-h-2.5 qc-w-2.5 qc-rounded qc-border qc-border-white/40 qc-shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)] qc-flex-shrink-0" style="background:${safeValue}"></span>`
        : ''
      rows.push(
        `<div class="qwikcss-card-prop qc-flex qc-items-start qc-justify-between qc-gap-2 qc-rounded-lg qc-border qc-border-white/5 qc-bg-white/5 qc-px-2 qc-py-1.5"><span class="k qc-text-[13px] qc-tracking-[0.05em] qc-text-[color:var(--qc-accent)]">${prop}</span><span class="v qc-inline-flex qc-items-center qc-justify-end qc-gap-1.5 qc-text-[13px] qc-text-white/90 qc-text-right">${swatch}${safeValue}</span></div>`
      )
    }
    props.innerHTML = rows.join('')
  }

  if (state.cardEditing) renderEditPanel(activeEl, cs)

  if (!state.cardPinned && !state.dragging && !state.cardEditing) {
    setCardPos(rect.right + 10, rect.top)
  }
}
