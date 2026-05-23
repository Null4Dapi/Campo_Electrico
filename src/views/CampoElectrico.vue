<script setup lang="ts">
import LeftPanel  from '../components/LeftPanel.vue'
import ThreeScene from '../components/ThreeScene.vue'
import RightPanel from '../components/RightPanel.vue'
</script>

<template>
  <main class="layout-container">
    <ThreeScene />
    <LeftPanel />
    <RightPanel />
  </main>
</template>

<style scoped>
.layout-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #020617; /* slate-950 de base */
}
</style>
