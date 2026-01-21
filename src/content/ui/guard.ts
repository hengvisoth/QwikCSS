import {
  CARD_HANDLE_ID,
  CARD_ID,
  CONTAINER_ID,
  LABEL_ID,
  OVERLAY_ID,
  TOOLBAR_ID,
} from '../constants'

export function isInsideQwikCSSUI(el: Element) {
  if (
    !!el.closest?.(`#${CONTAINER_ID}, #${TOOLBAR_ID}, #${CARD_ID}`) ||
    el.id === CONTAINER_ID ||
    el.id === TOOLBAR_ID ||
    el.id === CARD_ID ||
    el.id === CARD_HANDLE_ID ||
    el.id === OVERLAY_ID ||
    el.id === LABEL_ID
  ) {
    return true
  }

  const root = el.getRootNode()
  if (root instanceof ShadowRoot) {
    const host = root.host
    if (host instanceof HTMLElement) {
      return host.id === CONTAINER_ID || host.id === TOOLBAR_ID || host.id === CARD_ID
    }
  }

  return false
}
