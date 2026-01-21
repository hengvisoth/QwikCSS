import { INSPECT_PROPS } from './constants'
import { postToPanel } from './panelBus'
import { state } from './state'

export function getComputedSnapshot(el: Element) {
  const cs = getComputedStyle(el)
  const out: Record<string, string> = {}
  for (const p of INSPECT_PROPS) out[p] = cs.getPropertyValue(p).trim()
  return out
}

export function sendInspector() {
  if (!state.currentElement || !state.currentSelector) return
  postToPanel({
    type: 'QWIKCSS_INSPECT',
    selector: state.currentSelector,
    computed: getComputedSnapshot(state.currentElement),
  })
}
