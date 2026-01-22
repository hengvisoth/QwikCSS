import { INLINE_STYLE_ID } from './constants'

type InlinePatch = Record<string, Record<string, string>>

const inlinePatch: InlinePatch = {}

function ensureInlineStyleTag() {
  let style = document.getElementById(INLINE_STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = INLINE_STYLE_ID
    document.documentElement.appendChild(style)
  }
  return style
}

function isUniqueSelector(selector: string) {
  try {
    return document.querySelectorAll(selector).length === 1
  } catch {
    return false
  }
}

export function rebuildInlineCSS() {
  const style = ensureInlineStyleTag()
  const rules: string[] = []

  for (const [selector, decls] of Object.entries(inlinePatch)) {
    if (!isUniqueSelector(selector)) continue
    const lines = Object.entries(decls).map(([k, v]) => `  ${k}: ${v} !important;`)
    if (lines.length) rules.push(`${selector} {\n${lines.join('\n')}\n}`)
  }

  style.textContent = rules.join('\n\n')
}

export function applyInlineDecl(selector: string, prop: string, value: string) {
  if (!selector) return
  if (!inlinePatch[selector]) inlinePatch[selector] = {}
  inlinePatch[selector][prop] = value
  rebuildInlineCSS()
}

export function removeInlineDecl(selector: string, prop: string) {
  if (!selector || !inlinePatch[selector]) return
  delete inlinePatch[selector][prop]
  if (Object.keys(inlinePatch[selector]).length === 0) delete inlinePatch[selector]
  rebuildInlineCSS()
}

export function clearInlineSelector(selector: string) {
  if (!selector || !inlinePatch[selector]) return
  delete inlinePatch[selector]
  rebuildInlineCSS()
}

export function getInlineDecls(selector: string) {
  return inlinePatch[selector] || {}
}

export function hasInlineDecl(selector: string, prop: string) {
  return !!inlinePatch[selector]?.[prop]
}
