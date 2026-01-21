import { CARD_HANDLE_ID, CARD_ID, INSPECT_PROPS, COLOR_PROPS, RESET_STYLE_ID } from '../constants'
import { state } from '../state'
import { describeElement, escapeHtml, formatNumber, getElementPath, isTrivialValue } from '../utils'

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
    state.cardPinned = false
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
  `

  card.appendChild(handle)
  card.appendChild(body)
  document.documentElement.appendChild(card)

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
  showCard()

  const rect = el.getBoundingClientRect()
  const cs = getComputedStyle(el)

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

  if (crumbs) {
    const path = getElementPath(el)
    crumbs.innerHTML = path
      .map((item, index) => {
        const cls =
          index === path.length - 1 ? 'qwikcss-card-crumb is-current' : 'qwikcss-card-crumb'
        const pad = index * 10
        return `<div class="${cls}" style="margin-left:${pad}px">${escapeHtml(item)}</div>`
      })
      .join('')
  }
  if (title) title.textContent = describeElement(el)
  if (size) size.textContent = `${w}×${h}`
  if (font) font.textContent = `${fontFamily} ${fontSize}`
  if (props) {
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

  if (!state.cardPinned && !state.dragging) {
    setCardPos(rect.right + 10, rect.top)
  }
}
