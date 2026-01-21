import { state } from './state'
import { buildSelector } from './selectors'
import { sendInspector } from './inspector'
import { postToPanel } from './panelBus'
import { notifyState, setPaused } from './actions'
import { ensureOverlay, hideOverlay, positionOverlay } from './ui/overlay'
import { hideCard, prepareHoverCard, updateHoverCard } from './ui/hoverCard'
import { unmountToolbar } from './ui/toolbar'
import { isInsideQwikCSSUI } from './ui/guard'

function getElementFromPoint(x: number, y: number) {
  const el = document.elementFromPoint(x, y)
  if (!el) return null
  if (isInsideQwikCSSUI(el)) return null
  return el
}

function onMouseMove(ev: MouseEvent) {
  if (!state.picking) return
  if (state.inspectPaused) return

  const raw = document.elementFromPoint(ev.clientX, ev.clientY)
  if (raw && isInsideQwikCSSUI(raw)) return

  const el = getElementFromPoint(ev.clientX, ev.clientY)
  if (!el) {
    state.lastHover = null
    hideOverlay()
    hideCard()
    return
  }

  if (el !== state.lastHover) {
    state.lastHover = el
    positionOverlay(el)
    updateHoverCard(el)
  }
}

function onClick(ev: MouseEvent) {
  if (!state.picking) return
  const target = ev.target
  if (target instanceof Element && isInsideQwikCSSUI(target)) return
  if (state.inspectPaused) return

  ev.preventDefault()
  ev.stopPropagation()

  const el = getElementFromPoint(ev.clientX, ev.clientY)
  if (!el) return

  const selector = buildSelector(el)

  state.currentSelector = selector
  state.currentElement = el
  sendInspector()

  postToPanel({
    type: 'QWIKCSS_SELECTED',
    selector,
    tag: el.tagName.toLowerCase(),
    id: (el as HTMLElement).id || null,
    className: (el as HTMLElement).className || null,
  })

  state.cardPinned = true
  setPaused(true)
  notifyState()

  updateHoverCard(el)
  positionOverlay(el)
}

export function startPicking() {
  if (state.picking) return
  state.picking = true
  setPaused(false)

  ensureOverlay()
  prepareHoverCard()

  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('click', onClick, true)
  notifyState()
}

export function stopPicking() {
  if (!state.picking) return
  state.picking = false
  setPaused(false)
  state.lastHover = null

  hideOverlay()
  hideCard()
  unmountToolbar()

  document.removeEventListener('mousemove', onMouseMove, true)
  document.removeEventListener('click', onClick, true)
  notifyState()
}
