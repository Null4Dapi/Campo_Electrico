<script setup lang="ts">
import { ref } from 'vue'
import Home             from './views/Home.vue'
import CampoElectrico   from './views/CampoElectrico.vue'
import LorentzModule    from './modules/lorentz/index.vue'
import BiotSavartModule from './modules/biot-savart/index.vue'

type ModuleId = 'home' | 'campo-electrico' | 'lorentz' | 'biot-savart'
const current = ref<ModuleId>('home')
</script>

<template>
  <Home
    v-if="current === 'home'"
    @navigate="(m: string) => (current = m as ModuleId)"
  />
  <CampoElectrico
    v-else-if="current === 'campo-electrico'"
    @back="current = 'home'"
  />
  <LorentzModule
    v-else-if="current === 'lorentz'"
    @back="current = 'home'"
  />
  <BiotSavartModule
    v-else-if="current === 'biot-savart'"
    @back="current = 'home'"
  />
</template>
