export type PanelMessage = Record<string, any>

export function postToPanel(_msg: PanelMessage) {
  // Panel now renders in-page; keep a no-op bridge for future UI hookups.
}
