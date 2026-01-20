<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const status = ref<string>('')
const selected = ref<string>('none')
const prop = ref<string>('background')
const value = ref<string>('#ff0')
const exported = ref<string>('')

const startPick = () => window.parent.postMessage({ type: 'QWIKCSS_START_PICK' }, '*')
const stopPick = () => window.parent.postMessage({ type: 'QWIKCSS_STOP_PICK' }, '*')
const close = () => window.parent.postMessage({ type: 'QWIKCSS_CLOSE' }, '*')

const apply = () =>
  window.parent.postMessage({ type: 'QWIKCSS_APPLY', prop: prop.value, value: value.value }, '*')

const remove = () => window.parent.postMessage({ type: 'QWIKCSS_REMOVE', prop: prop.value }, '*')

const doExport = () => window.parent.postMessage({ type: 'QWIKCSS_EXPORT' }, '*')
const clearSite = () => window.parent.postMessage({ type: 'QWIKCSS_CLEAR_SITE' }, '*')

const onMsg = (e: MessageEvent) => {
  if (e?.data?.type === 'QWIKCSS_SELECTED') {
    selected.value = e.data.selector || 'none'
    exported.value = ''
  }
  if (e?.data?.type === 'QWIKCSS_EXPORT_RESULT') {
    exported.value = e.data.css || ''
  }

  if (e?.data?.type === 'QWIKCSS_LOADED') status.value = 'Loaded saved styles for this site'
  if (e?.data?.type === 'QWIKCSS_SAVED') status.value = 'Saved'
  if (e?.data?.type === 'QWIKCSS_CLEARED') status.value = 'Cleared'
  if (e?.data?.type === 'QWIKCSS_SAVE_ERROR') status.value = `Save error: ${e.data.message}`
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
        <button @click="clearSite">Clear</button>
      </div>
    </div>

    <div class="body">
      <div v-if="status"><b>Status:</b> {{ status }}</div>

      <div><b>Selected:</b> {{ selected }}</div>

      <div class="row">
        <input class="inp" v-model="prop" placeholder="property (e.g. margin-top)" />
        <input class="inp" v-model="value" placeholder="value (e.g. 12px)" />
        <button @click="apply">Apply</button>
        <button @click="remove">Remove</button>
        <button @click="doExport">Export</button>
      </div>

      <textarea v-if="exported" class="out" readonly :value="exported"></textarea>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  font-family: system-ui, sans-serif;
  height: 100vh;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #ddd;
}
.actions {
  display: flex;
  gap: 8px;
}
.body {
  padding: 12px;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.inp {
  padding: 6px 8px;
  min-width: 220px;
}
button {
  padding: 6px 10px;
}
.out {
  width: 100%;
  height: 120px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
</style>
