<script setup lang="ts">
import LeftPanel  from './LeftPanel.vue'
import ThreeScene from './ThreeScene.vue'
import RightPanel from './RightPanel.vue'

defineEmits<{ back: [] }>()
</script>

<template>
  <div class="module-layout">
    <LeftPanel @back="$emit('back')" />
    <ThreeScene />
    <RightPanel />
  </div>
</template>

<style scoped>
.module-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
</style>
