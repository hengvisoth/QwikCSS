<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const isPaused = ref(false)
const isPicking = ref(false)

const startPick = () => {
  isPicking.value = true
  isPaused.value = false
  window.parent.postMessage({ type: 'QWIKCSS_START_PICK' }, '*')
}

const stopPick = () => {
  isPicking.value = false
  isPaused.value = false
  window.parent.postMessage({ type: 'QWIKCSS_STOP_PICK' }, '*')
}

const togglePick = () => {
  if (isPicking.value) stopPick()
  else startPick()
}

const togglePause = () => {
  if (!isPicking.value) return
  const next = !isPaused.value
  isPaused.value = next
  window.parent.postMessage(
    { type: next ? 'QWIKCSS_PAUSE_INSPECT' : 'QWIKCSS_RESUME_INSPECT' },
    '*'
  )
}

const onMsg = (e: MessageEvent) => {
  if (e?.data?.type === 'QWIKCSS_STATE') {
    if (typeof e.data.paused === 'boolean') isPaused.value = e.data.paused
    if (typeof e.data.picking === 'boolean') isPicking.value = e.data.picking
  }
}

onMounted(() => {
  window.addEventListener('message', onMsg)
  window.parent.postMessage({ type: 'QWIKCSS_START_PICK' }, '*')
  window.parent.postMessage({ type: 'QWIKCSS_GET_STATE' }, '*')
  isPicking.value = true
  isPaused.value = false
})

onBeforeUnmount(() => window.removeEventListener('message', onMsg))
</script>

<template>
  <div class="wrap">
    <div class="dock" role="toolbar" aria-label="Inspector controls">
      <button
        class="iconBtn"
        type="button"
        :aria-pressed="isPaused"
        :title="isPaused ? 'Resume inspector' : 'Pause inspector'"
        :disabled="!isPicking"
        @click="togglePause"
      >
        <svg v-if="!isPaused" class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="5" width="4" height="14" rx="1"></rect>
          <rect x="14" y="5" width="4" height="14" rx="1"></rect>
        </svg>
        <svg v-else class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5 L19 12 L8 19 Z"></path>
        </svg>
      </button>

      <div class="divider" aria-hidden="true"></div>

      <button
        class="iconBtn stop"
        type="button"
        :title="isPicking ? 'Stop inspector' : 'Start inspector'"
        @click="togglePick"
      >
        <svg v-if="isPicking" class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="7" y="7" width="10" height="10" rx="1"></rect>
        </svg>
        <svg v-else class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="5"></circle>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  height: 100%;
}

:global(body) {
  margin: 0;
  background: transparent !important;
}

:global(html) {
  background: transparent !important;
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
</style>
