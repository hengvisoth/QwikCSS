import { TOOLBAR_ID } from '../constants'
import { state } from '../state'

export type ToolbarHandlers = {
  onTogglePause: () => void
}

let toolbarPauseBtn: HTMLButtonElement | null = null

export function mountToolbar(handlers: ToolbarHandlers) {
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
  btn.textContent = state.inspectPaused ? 'Resume Inspect' : 'Pause Inspect'
  btn.style.padding = '6px 10px'
  btn.style.borderRadius = '999px'
  btn.style.border = '1px solid rgba(255,255,255,0.18)'
  btn.style.background = 'transparent'
  btn.style.color = 'inherit'
  btn.style.cursor = 'pointer'
  btn.onclick = handlers.onTogglePause
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
    state.cardPinned = !state.cardPinned
    pin.textContent = state.cardPinned ? 'Unpin' : 'Pin'
  }

  bar.appendChild(btn)
  bar.appendChild(pin)
  document.documentElement.appendChild(bar)
}

export function unmountToolbar() {
  document.getElementById(TOOLBAR_ID)?.remove()
  toolbarPauseBtn = null
}

export function updateToolbarState() {
  if (!toolbarPauseBtn) return
  toolbarPauseBtn.textContent = state.inspectPaused ? 'Resume Inspect' : 'Pause Inspect'
}
