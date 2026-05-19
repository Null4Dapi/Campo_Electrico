<script setup lang="ts">
import { computed } from 'vue'
import { useBiotStore } from './store'

const emit = defineEmits<{ back: [] }>()
const { state, loadPreset } = useBiotStore()

// Conversion helpers: store uses meters, UI uses cm
const wireLengthCm = computed({
  get: () => Math.round(state.wireLength * 100 * 100) / 100,
  set: (val) => { state.wireLength = val / 100 }
})
const loopRadiusCm = computed({
  get: () => Math.round(state.loopRadius * 100 * 100) / 100,
  set: (val) => { state.loopRadius = val / 100 }
})
const solenoidLengthCm = computed({
  get: () => Math.round(state.solenoidLength * 100 * 100) / 100,
  set: (val) => { state.solenoidLength = val / 100 }
})
const solenoidRadiusCm = computed({
  get: () => Math.round(state.solenoidRadius * 100 * 100) / 100,
  set: (val) => { state.solenoidRadius = val / 100 }
})
</script>

<template>
  <aside class="left-panel">
    <div class="panel-header">
      <button class="btn-back" @click="emit('back')">← Módulos</button>
      <div class="logo">
        <span>🧲</span>
        <div>
          <div class="logo-title">Ley de Biot-Savart</div>
          <div class="logo-sub">Campo magnético de conductores</div>
        </div>
      </div>
    </div>

    <!-- Conductor type -->
    <div class="section">
      <div class="section-title">Tipo de conductor</div>
      <button
        class="cond-btn"
        :class="{ active: state.conductorType === 'wire' }"
        @click="loadPreset('wire')"
      >
        <span class="cond-icon">📏</span>
        <div>
          <div class="cond-name">Cable recto</div>
          <div class="cond-sub">B = μ₀I / (2πd)</div>
        </div>
      </button>
      <button
        class="cond-btn"
        :class="{ active: state.conductorType === 'loop' }"
        @click="loadPreset('loop')"
      >
        <span class="cond-icon">⭕</span>
        <div>
          <div class="cond-name">Espira circular</div>
          <div class="cond-sub">B = μ₀I / (2R) en el centro</div>
        </div>
      </button>
      <button
        class="cond-btn"
        :class="{ active: state.conductorType === 'solenoid' }"
        @click="loadPreset('solenoid')"
      >
        <span class="cond-icon">🌀</span>
        <div>
          <div class="cond-name">Solenoide</div>
          <div class="cond-sub">B = μ₀nI interior</div>
        </div>
      </button>
    </div>

    <!-- Current -->
    <div class="section">
      <div class="section-title">Corriente eléctrica</div>
      <div class="form-group">
        <label>I (A)</label>
        <input type="number" v-model.number="state.I" step="0.5" min="0.01" />
      </div>
    </div>

    <!-- Wire params -->
    <div class="section" v-if="state.conductorType === 'wire'">
      <div class="section-title">Parámetros del cable</div>
      <div class="form-group">
        <label>Longitud L (cm)</label>
        <input type="number" v-model.number="wireLengthCm" step="1" min="1" max="1000" />
      </div>
    </div>

    <!-- Loop params -->
    <div class="section" v-else-if="state.conductorType === 'loop'">
      <div class="section-title">Parámetros de la espira</div>
      <div class="form-group">
        <label>Radio R (cm)</label>
        <input type="number" v-model.number="loopRadiusCm" step="0.5" min="0.1" max="50" />
      </div>
    </div>

    <!-- Solenoid params -->
    <div class="section" v-else>
      <div class="section-title">Parámetros del solenoide</div>
      <div class="form-group">
        <label>Longitud L (cm)</label>
        <input type="number" v-model.number="solenoidLengthCm" step="1" min="1" max="100" />
      </div>
      <div class="form-group">
        <label>Radio R (cm)</label>
        <input type="number" v-model.number="solenoidRadiusCm" step="0.2" min="0.2" max="10" />
      </div>
      <div class="form-group">
        <label>N° de vueltas N</label>
        <input type="number" v-model.number="state.solenoidTurns" step="1" min="3" max="30" />
      </div>
    </div>

    <!-- Solve point -->
    <div class="section" v-if="state.solvePoint">
      <div class="section-title">Punto P seleccionado</div>
      <div class="info-chip" style="color: #86efac;">
        x={{ state.solvePoint.x.toFixed(2) }} ·
        y={{ state.solvePoint.y.toFixed(2) }} ·
        z={{ state.solvePoint.z.toFixed(2) }} u.e.
      </div>
      <button class="btn secondary" style="margin-top:8px" @click="state.solvePoint = null">
        Limpiar punto P
      </button>
    </div>
    <div class="section hint-section" v-else>
      <div class="hint">💡 Doble clic en la escena para calcular B en un punto específico</div>
    </div>
  </aside>
</template>

<style scoped>
.left-panel {
  width: 272px;
  min-width: 272px;
  background: var(--panel);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-header {
  padding: 10px 14px 12px;
  background: var(--panel-2);
  border-bottom: 1px solid var(--border);
}

.btn-back {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 11px;
  padding: 0;
  margin-bottom: 8px;
  transition: color 0.15s;
}
.btn-back:hover { color: var(--accent-light); }

.logo { display: flex; align-items: center; gap: 10px; }
.logo-title { font-size: 14px; font-weight: 700; color: var(--accent-light); }
.logo-sub { font-size: 10px; color: var(--muted); }

.section { padding: 12px 14px; border-bottom: 1px solid var(--border); }
.section-title {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; color: var(--muted); margin-bottom: 10px;
}

.cond-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: var(--panel-2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 10px;
  border-radius: 7px;
  cursor: pointer;
  text-align: left;
  margin-bottom: 6px;
  transition: all .15s;
}
.cond-btn:hover { border-color: var(--accent); }
.cond-btn.active {
  border-color: var(--accent);
  background: rgba(59,130,246,.12);
}
.cond-icon { font-size: 20px; }
.cond-name { font-size: 12px; font-weight: 600; color: var(--text); }
.cond-sub  { font-size: 10px; color: var(--muted); margin-top: 1px; }

.form-group { display: flex; flex-direction: column; gap: 3px; margin-bottom: 6px; }
label { font-size: 10px; color: var(--muted); font-weight: 500; }
input[type='number'] {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 5px 7px;
  border-radius: 5px;
  font-size: 12px;
  width: 100%;
  outline: none;
}
input[type='number']:focus { border-color: var(--accent); }

.info-chip {
  font-size: 11px;
  color: var(--muted);
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 6px 8px;
}

.btn {
  padding: 7px 12px; border-radius: 6px; border: none;
  cursor: pointer; font-size: 12px; font-weight: 600; width: 100%;
  transition: background .15s;
}
.btn.secondary {
  background: var(--panel-2); border: 1px solid var(--border); color: var(--text);
}
.btn.secondary:hover { background: var(--border); }

.hint-section { opacity: 0.7; }
.hint { font-size: 11px; color: var(--muted); font-style: italic; line-height: 1.5; }
</style>
