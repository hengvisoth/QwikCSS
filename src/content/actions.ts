import { state } from './state'
import { updatePanelState } from './ui/panel'
import { updateToolbarState } from './ui/toolbar'

export function setPaused(paused: boolean) {
  state.inspectPaused = paused
  if (!paused) state.cardPinned = false
}

export function notifyState() {
  updatePanelState()
  updateToolbarState()
}
