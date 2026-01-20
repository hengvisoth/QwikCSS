<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const status = ref<string>('')
const selected = ref<string>('none')
const prop = ref<string>('background')
const value = ref<string>('#ff0')
const exported = ref<string>('')
const computed = ref<Record<string, string>>({})
const presets = [
  { label: 'Padding 8px', prop: 'padding', value: '8px' },
  { label: 'Padding 16px', prop: 'padding', value: '16px' },
  { label: 'Margin 16px', prop: 'margin', value: '16px' },
  { label: 'Center text', prop: 'text-align', value: 'center' },
  { label: 'Rounded 12px', prop: 'border-radius', value: '12px' },
  { label: 'Outline red', prop: 'outline', value: '2px solid red' },
]

const startPick = () => window.parent.postMessage({ type: 'QWIKCSS_START_PICK' }, '*')
const stopPick = () => window.parent.postMessage({ type: 'QWIKCSS_STOP_PICK' }, '*')
const close = () => window.parent.postMessage({ type: 'QWIKCSS_CLOSE' }, '*')

const apply = () =>
  window.parent.postMessage({ type: 'QWIKCSS_APPLY', prop: prop.value, value: value.value }, '*')

const remove = () => window.parent.postMessage({ type: 'QWIKCSS_REMOVE', prop: prop.value }, '*')

const doExport = () => window.parent.postMessage({ type: 'QWIKCSS_EXPORT' }, '*')
const clearSite = () => window.parent.postMessage({ type: 'QWIKCSS_CLEAR_SITE' }, '*')

const useRow = (k: string, v: string) => {
  prop.value = k
  value.value = v
}
const applyPreset = (p: { prop: string; value: string }) => {
  prop.value = p.prop
  value.value = p.value
  apply()
}

const onMsg = (e: MessageEvent) => {
  if (e?.data?.type === 'QWIKCSS_EXPORT_RESULT') {
    exported.value = e.data.css || ''
  }

  if (e?.data?.type === 'QWIKCSS_LOADED') status.value = 'Loaded saved styles for this site'
  if (e?.data?.type === 'QWIKCSS_SAVED') status.value = 'Saved'
  if (e?.data?.type === 'QWIKCSS_CLEARED') status.value = 'Cleared'
  if (e?.data?.type === 'QWIKCSS_SAVE_ERROR') status.value = `Save error: ${e.data.message}`
  if (e?.data?.type === 'QWIKCSS_SELECTED') {
    selected.value = e.data.selector || 'none'
    exported.value = ''
    computed.value = {}
  }

  if (e?.data?.type === 'QWIKCSS_INSPECT') {
    if (e.data.selector) selected.value = e.data.selector
    computed.value = e.data.computed || {}
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
        <button @click="clearSite">Clear</button>
      </div>
    </div>

    <div class="body">
      <div v-if="status"><b>Status:</b> {{ status }}</div>

      <div><b>Selected:</b> {{ selected }}</div>
      <div class="section">
        <div class="sectionTitle">Presets</div>
        <div class="chips">
          <button v-for="p in presets" :key="p.label" @click="applyPreset(p)">
            {{ p.label }}
          </button>
        </div>
      </div>

      <div class="section">
        <div class="sectionTitle">Inspector (computed)</div>

        <div v-if="Object.keys(computed).length === 0" class="muted">
          Pick an element to see computed styles.
        </div>

        <div v-else class="grid">
          <div
            v-for="(v, k) in computed"
            :key="k"
            class="rowItem"
            @click="useRow(String(k), String(v))"
            title="Click to fill inputs"
          >
            <div class="k">{{ k }}</div>
            <div class="v">{{ v }}</div>
          </div>
        </div>
      </div>

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

.section {
  margin-top: 6px;
}
.sectionTitle {
  font-weight: 600;
  margin-bottom: 8px;
}
.muted {
  opacity: 0.7;
  font-size: 13px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chips button {
  padding: 6px 10px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
}

.rowItem {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
}

.k {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  opacity: 0.85;
}
.v {
  text-align: right;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
</style>
