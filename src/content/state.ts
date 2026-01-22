export type PatchMap = Record<string, Record<string, string>>

export const state = {
  picking: false,
  inspectPaused: false,
  lastHover: null as Element | null,
  currentSelector: null as string | null,
  currentElement: null as Element | null,
  saveTimer: null as number | null,
  cardPinned: false,
  cardEditing: false,
  dragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  patch: {} as PatchMap,
}
