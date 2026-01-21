import { STORAGE_KEY } from './constants'
import { applyDecl, clearPatch, exportCSS, removeDecl } from './patch'
import { postToPanel } from './panelBus'
import { state } from './state'
import { notifyState, setPaused } from './actions'
import { startPicking, stopPicking } from './picker'

export type PanelMessageHandlers = {
  onClose?: () => void
}

export function createPanelMessageHandler(handlers: PanelMessageHandlers = {}) {
  return function onPanelMessage(e: MessageEvent) {
    const t = e?.data?.type

    if (t === 'QWIKCSS_CLOSE') handlers.onClose?.()
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
      if (!state.currentSelector) return
      const prop = String(e.data.prop || '').trim()
      const value = String(e.data.value || '').trim()
      if (!prop || !value) return
      applyDecl(state.currentSelector, prop, value)
    }

    if (t === 'QWIKCSS_REMOVE') {
      if (!state.currentSelector) return
      const prop = String(e.data.prop || '').trim()
      if (!prop) return
      removeDecl(state.currentSelector, prop)
    }

    if (t === 'QWIKCSS_EXPORT') {
      const css = exportCSS()
      postToPanel({ type: 'QWIKCSS_EXPORT_RESULT', css })
    }

    if (t === 'QWIKCSS_CLEAR_SITE') {
      clearPatch()
      state.currentElement = null
      state.currentSelector = null
      chrome.storage.local.remove(STORAGE_KEY)
      postToPanel({ type: 'QWIKCSS_CLEARED' })
    }
  }
}
