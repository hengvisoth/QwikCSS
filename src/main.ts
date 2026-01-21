// src/main.ts (content script)

import { CARD_ID, RESET_STYLE_ID } from './content/constants'
import { notifyState, setPaused } from './content/actions'
import { createPanelMessageHandler } from './content/messaging'
import { startPicking, stopPicking } from './content/picker'
import { state } from './content/state'
import { hideCard } from './content/ui/hoverCard'
import { removeOverlay } from './content/ui/overlay'
import { mountPanel, unmountPanel } from './content/ui/panel'
import { unmountToolbar } from './content/ui/toolbar'

let panelMessageHandler: ((e: MessageEvent) => void) | null = null

function handleTogglePause() {
  if (!state.picking) return
  setPaused(!state.inspectPaused)
  notifyState()
}

function handleTogglePicking() {
  if (state.picking) stopPicking()
  else startPicking()
}

function teardown() {
  stopPicking()
  if (panelMessageHandler) {
    window.removeEventListener('message', panelMessageHandler)
  }
  unmountPanel()
  removeOverlay()
  hideCard()
  unmountToolbar()
  document.getElementById(CARD_ID)?.remove()
  document.getElementById(RESET_STYLE_ID)?.remove()
}

function boot() {
  panelMessageHandler = createPanelMessageHandler({ onClose: teardown })
  window.addEventListener('message', panelMessageHandler)

  mountPanel({
    onTogglePause: handleTogglePause,
    onTogglePicking: handleTogglePicking,
  })

  startPicking()
}

boot()
