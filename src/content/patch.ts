import { STORAGE_KEY, STYLE_ID } from './constants'
import { sendInspector } from './inspector'
import { postToPanel } from './panelBus'
import { state } from './state'

function ensureStyleTag() {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.documentElement.appendChild(style)
  }
  return style
}

export function rebuildCSS() {
  const style = ensureStyleTag()
  const rules: string[] = []

  for (const [selector, decls] of Object.entries(state.patch)) {
    const lines = Object.entries(decls).map(([k, v]) => `  ${k}: ${v} !important;`)
    if (lines.length) rules.push(`${selector} {\n${lines.join('\n')}\n}`)
  }

  style.textContent = rules.join('\n\n')
  scheduleSave()
}

export function applyDecl(selector: string, prop: string, value: string) {
  if (!state.patch[selector]) state.patch[selector] = {}
  state.patch[selector][prop] = value
  rebuildCSS()
  sendInspector()
}

export function removeDecl(selector: string, prop: string) {
  if (!state.patch[selector]) return
  delete state.patch[selector][prop]
  if (Object.keys(state.patch[selector]).length === 0) delete state.patch[selector]
  rebuildCSS()
  sendInspector()
}

export function clearPatch() {
  for (const k of Object.keys(state.patch)) delete state.patch[k]
  rebuildCSS()
}

export function exportCSS() {
  const rules: string[] = []
  for (const [selector, decls] of Object.entries(state.patch)) {
    const lines = Object.entries(decls).map(([k, v]) => `  ${k}: ${v} !important;`)
    if (lines.length) rules.push(`${selector} {\n${lines.join('\n')}\n}`)
  }
  return rules.join('\n\n')
}

export function scheduleSave() {
  if (state.saveTimer) window.clearTimeout(state.saveTimer)
  state.saveTimer = window.setTimeout(async () => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: state.patch })
      postToPanel({ type: 'QWIKCSS_SAVED' })
    } catch (err) {
      postToPanel({ type: 'QWIKCSS_SAVE_ERROR', message: String(err) })
    }
  }, 200)
}
