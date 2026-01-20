<script setup lang="ts">
const close = () => {
window.parent.postMessage({ type: 'QWIKCSS_CLOSE' }, '*')
}
</script>

<template>
  <div class="wrap">
    <div class="bar">
    <strong>QwikCSS</strong>
      <button @click="close">Close</button>
    </div>
    <div class="body">
      Panel is running (iframe).
    </div>
  </div>
</template>

<style scoped>
.wrap { font-family: system-ui, sans-serif; height: 100vh; }
.bar  { display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid #ddd; }
.body { padding: 12px; font-size: 14px; }
button { padding: 6px 10px; }
</style>
