<script setup lang="ts">
import LeftPanel  from '../components/LeftPanel.vue'
import ThreeScene from '../components/ThreeScene.vue'
import RightPanel from '../components/RightPanel.vue'

defineEmits<{ back: [] }>()
</script>

<template>
  <div class="layout">
    <LeftPanel />
    <ThreeScene />
    <RightPanel />
    <button class="btn-back" @click="$emit('back')">← Módulos</button>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  width: 100%;
  position: relative;
}

.btn-back {
  position: absolute;
  top: 10px;
  /* sitúa el botón sobre la escena, a la derecha del panel izquierdo */
  left: 282px;
  z-index: 20;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid #374151;
  color: #9ca3af;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  transition: color 0.15s;
}
.btn-back:hover { color: #e2e8f0; }
</style>
