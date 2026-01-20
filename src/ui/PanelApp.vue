<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const selected = ref<string>('none')

const startPick = () => window.parent.postMessage({ type: 'QWIKCSS_START_PICK' }, '*')
const stopPick = () => window.parent.postMessage({ type: 'QWIKCSS_STOP_PICK' }, '*')
const close = () => window.parent.postMessage({ type: 'QWIKCSS_CLOSE' }, '*')

const onMsg = (e: MessageEvent) => {
  if (e?.data?.type === 'QWIKCSS_SELECTED') {
    const { tag, id, className } = e.data
    const idPart = id ? `#${id}` : ''
    const clsPart = className ? '.' + String(className).trim().split(/\s+/).slice(0, 3).join('.') : ''
    selected.value = `${tag}${idPart}${clsPart}`
  }
}

onMounted(() => window.addEventListener('message', onMsg))
onBeforeUnmount(() => window.removeEventListener('message', onMsg))
</script>

<template>
  <div class="wrap">
    <div class="bar">
      <strong>QwikCSS</strong>

      <div class="actions">
        <button @click="startPick">Pick</button>
        <button @click="stopPick">Stop</button>
        <button @click="close">Close</button>
      </div>
    </div>

    <div class="body">
      <div><b>Selected:</b> {{ selected }}</div>
    </div>
  </div>
</template>

<style scoped>
.wrap { font-family: system-ui, sans-serif; height: 100vh; }
.bar  { display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid #ddd; }
.actions { display:flex; gap:8px; }
.body { padding: 12px; font-size: 14px; }
button { padding: 6px 10px; }
</style>
