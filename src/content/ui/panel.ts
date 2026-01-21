import { CONTAINER_ID, PANEL_HEIGHT, PANEL_MARGIN, PANEL_WIDTH } from '../constants'
import { state } from '../state'

export type PanelHandlers = {
  onTogglePause: () => void
  onTogglePicking: () => void
}

let panelContainer: HTMLDivElement | null = null
let panelPauseBtn: HTMLButtonElement | null = null
let panelStopBtn: HTMLButtonElement | null = null
let panelPauseIcon: SVGElement | null = null
let panelPlayIcon: SVGElement | null = null
let panelStopIcon: SVGElement | null = null
let panelStartIcon: SVGElement | null = null

export function mountPanel(handlers: PanelHandlers) {
  if (document.getElementById(CONTAINER_ID)) return

  const container = document.createElement('div')
  container.id = CONTAINER_ID
  container.style.position = 'fixed'
  container.style.left = `calc(50% - ${PANEL_WIDTH / 2}px)`
  container.style.bottom = `${PANEL_MARGIN}px`
  container.style.transform = 'none'
  container.style.setProperty('transform', 'none', 'important')
  container.style.right = 'auto'
  container.style.top = 'auto'
  container.style.height = `${PANEL_HEIGHT}px`
  container.style.width = `${PANEL_WIDTH}px`
  container.style.zIndex = '2147483647'
  container.style.background = 'transparent'
  container.style.setProperty('background', 'transparent', 'important')
  container.style.setProperty('background-color', 'transparent', 'important')
  container.style.pointerEvents = 'auto'

  const shadow = container.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = `
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    .wrap {
      height: 100%;
      width: 100%;
      background: transparent;
      display: grid;
      place-items: center;
      font-family: 'Space Grotesk', 'Manrope', 'Avenir Next', sans-serif;
    }

    .dock {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(24, 26, 30, 0.95), rgba(14, 15, 18, 0.95));
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow:
        0 16px 40px rgba(0, 0, 0, 0.45),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
      animation: dock-in 240ms ease-out;
    }

    .divider {
      width: 1px;
      height: 22px;
      background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    }

    .iconBtn {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.06);
      color: #f3f5f7;
      cursor: pointer;
      transition:
        transform 120ms ease,
        background 120ms ease,
        border-color 120ms ease,
        color 120ms ease;
    }

    .iconBtn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.22);
    }

    .iconBtn:active {
      transform: translateY(1px) scale(0.98);
    }

    .iconBtn:focus-visible {
      outline: 2px solid rgba(84, 255, 141, 0.6);
      outline-offset: 2px;
    }

    .iconBtn[aria-pressed='true'] {
      color: #7cffad;
      border-color: rgba(124, 255, 173, 0.5);
      background: rgba(124, 255, 173, 0.14);
    }

    .iconBtn.stop {
      color: #ff8f8f;
      border-color: rgba(255, 143, 143, 0.4);
    }

    .iconBtn.stop:hover {
      background: rgba(255, 143, 143, 0.16);
    }

    .iconBtn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .icon {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }

    .icon[hidden] {
      display: none;
    }

    @keyframes dock-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 540px) {
      .dock {
        padding: 8px 12px;
      }
      .iconBtn {
        width: 36px;
        height: 36px;
      }
      .icon {
        width: 16px;
        height: 16px;
      }
    }
  `

  const wrap = document.createElement('div')
  wrap.className = 'wrap'
  wrap.innerHTML = `
    <div class="dock" role="toolbar" aria-label="Inspector controls">
      <button class="iconBtn pauseBtn" type="button" aria-pressed="false" title="Pause inspector">
        <svg class="icon icon-pause" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="5" width="4" height="14" rx="1"></rect>
          <rect x="14" y="5" width="4" height="14" rx="1"></rect>
        </svg>
        <svg class="icon icon-play" viewBox="0 0 24 24" aria-hidden="true" hidden>
          <path d="M8 5 L19 12 L8 19 Z"></path>
        </svg>
      </button>

      <div class="divider" aria-hidden="true"></div>

      <button class="iconBtn stopBtn stop" type="button" title="Stop inspector">
        <svg class="icon icon-stop" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="7" y="7" width="10" height="10" rx="1"></rect>
        </svg>
        <svg class="icon icon-start" viewBox="0 0 24 24" aria-hidden="true" hidden>
          <circle cx="12" cy="12" r="5"></circle>
        </svg>
      </button>
    </div>
  `

  shadow.appendChild(style)
  shadow.appendChild(wrap)
  document.documentElement.appendChild(container)

  panelContainer = container
  panelPauseBtn = wrap.querySelector<HTMLButtonElement>('.pauseBtn')
  panelStopBtn = wrap.querySelector<HTMLButtonElement>('.stopBtn')
  panelPauseIcon = wrap.querySelector<SVGElement>('.icon-pause')
  panelPlayIcon = wrap.querySelector<SVGElement>('.icon-play')
  panelStopIcon = wrap.querySelector<SVGElement>('.icon-stop')
  panelStartIcon = wrap.querySelector<SVGElement>('.icon-start')

  panelPauseBtn?.addEventListener('click', handlers.onTogglePause)
  panelStopBtn?.addEventListener('click', handlers.onTogglePicking)

  updatePanelState()
}

export function unmountPanel() {
  panelContainer?.remove()
  panelContainer = null
  panelPauseBtn = null
  panelStopBtn = null
  panelPauseIcon = null
  panelPlayIcon = null
  panelStopIcon = null
  panelStartIcon = null
}

export function updatePanelState() {
  if (!panelPauseBtn || !panelStopBtn) return
  panelPauseBtn.disabled = !state.picking
  panelPauseBtn.setAttribute('aria-pressed', state.inspectPaused ? 'true' : 'false')
  panelPauseBtn.title = state.inspectPaused ? 'Resume inspector' : 'Pause inspector'
  panelStopBtn.title = state.picking ? 'Stop inspector' : 'Start inspector'

  panelPauseIcon?.toggleAttribute('hidden', state.inspectPaused)
  panelPlayIcon?.toggleAttribute('hidden', !state.inspectPaused)
  panelStopIcon?.toggleAttribute('hidden', !state.picking)
  panelStartIcon?.toggleAttribute('hidden', state.picking)
}
