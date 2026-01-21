import { LABEL_ID, OVERLAY_ID } from '../constants'
import { describeElement } from '../utils'

export function ensureOverlay() {
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

export function removeOverlay() {
  document.getElementById(OVERLAY_ID)?.remove()
  document.getElementById(LABEL_ID)?.remove()
}

export function hideOverlay() {
  const overlay = document.getElementById(OVERLAY_ID) as HTMLDivElement | null
  const label = document.getElementById(LABEL_ID) as HTMLDivElement | null
  if (overlay) overlay.style.display = 'none'
  if (label) label.style.display = 'none'
}

export function positionOverlay(el: Element) {
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
