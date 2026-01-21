export const CONTAINER_ID = '__qwikcss_root__'
export const PANEL_HEIGHT = 88
export const PANEL_WIDTH = 220
export const PANEL_MARGIN = 16

export const OVERLAY_ID = '__qwikcss_overlay__'
export const LABEL_ID = '__qwikcss_label__'

export const STYLE_ID = '__qwikcss_style__'
export const STORAGE_KEY = `qwikcss:${location.host}`

export const TOOLBAR_ID = '__qwikcss_toolbar__'
export const CARD_ID = '__qwikcss_hovercard__'
export const CARD_HANDLE_ID = '__qwikcss_hovercard_handle__'
export const RESET_STYLE_ID = '__qwikcss_reset__'

export const INSPECT_PROPS = [
  'display',
  'position',
  'box-sizing',
  'width',
  'height',
  'max-width',
  'max-height',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'align-items',
  'justify-content',
  'gap',
  'text-align',
  'font-size',
  'font-family',
  'font-weight',
  'line-height',
  'color',
  'background-color',
  'border',
  'border-color',
  'border-radius',
  'box-shadow',
  'opacity',
] as const

export type InspectProp = (typeof INSPECT_PROPS)[number]

export const COLOR_PROPS = new Set(['color', 'background-color', 'border-color'])
