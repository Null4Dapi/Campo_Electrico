<script setup lang="ts">
import { ref } from 'vue'
import { useStore } from '../composables/useStore'

const { state, addCharge, removeCharge, loadPreset } = useStore()

const newQ = ref(2)
const newXCm = ref(50)
const newYCm = ref(0)
const newZCm = ref(0)

function handleAdd() {
  if (isNaN(newQ.value)) return
  addCharge(newQ.value, (newXCm.value || 0) / 100, (newYCm.value || 0) / 100, (newZCm.value || 0) / 100)
}

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Enter') handleAdd()
}

const resLabel = (n: number) => `${n}×${n}`
</script>

<template>
  <aside class="left-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="logo">
        <span class="logo-icon">⚡</span>
        <div>
          <div class="logo-title">FísicaViz 3D</div>
          <div class="logo-sub">Campo Eléctrico · Ley de Coulomb</div>
        </div>
      </div>
    </div>

    <!-- Charges section -->
    <div class="section">
      <div class="section-title">Cargas del sistema</div>

      <div class="charge-list">
        <div v-if="state.charges.length === 0" class="empty-msg">
          Sin cargas. Agrega una abajo.
        </div>
        <div
          v-for="c in state.charges"
          :key="c.id"
          class="charge-item"
        >
          <div class="charge-dot" :class="c.q_nC >= 0 ? 'pos' : 'neg'">
            {{ c.q_nC >= 0 ? '+' : '−' }}
          </div>
          <div class="charge-info">
            <span class="charge-q" :class="c.q_nC >= 0 ? 'text-pos' : 'text-neg'">
              {{ c.q_nC >= 0 ? '+' : '' }}{{ c.q_nC }} nC
            </span>
            <span class="charge-pos">({{ (c.x * 100).toFixed(1) }}, {{ (c.y * 100).toFixed(1) }}, {{ (c.z * 100).toFixed(1) }}) cm</span>
          </div>
          <button class="btn-remove" @click="removeCharge(c.id)">×</button>
        </div>
      </div>

      <!-- Add charge form -->
      <div class="add-form">
        <div class="form-row full">
          <label>Q (nC) — negativo para carga negativa</label>
          <input
            v-model.number="newQ"
            type="number"
            step="0.5"
            placeholder="ej: 2 o -3"
            @keyup="handleKey"
          />
        </div>
        <div class="form-row cols3">
          <div class="form-group">
            <label>x (cm)</label>
            <input v-model.number="newXCm" type="number" step="1" @keyup="handleKey" />
          </div>
          <div class="form-group">
            <label>y (cm)</label>
            <input v-model.number="newYCm" type="number" step="1" @keyup="handleKey" />
          </div>
          <div class="form-group">
            <label>z (cm)</label>
            <input v-model.number="newZCm" type="number" step="1" @keyup="handleKey" />
          </div>
        </div>
        <button class="btn primary" @click="handleAdd">+ Agregar carga</button>
      </div>
    </div>

    <!-- Visualization section -->
    <div class="section">
      <div class="section-title">Visualización</div>

      <div class="field-row">
        <div class="field-label">Resolución de vectores</div>
        <span class="badge">{{ resLabel(state.resolution) }}</span>
      </div>
      <input
        v-model.number="state.resolution"
        type="range" min="3" max="11" step="2"
        class="slider"
      />

      <div class="field-row" style="margin-top: 10px;">
        <div class="field-label">Plano de visualización</div>
      </div>
      <div class="plane-group">
        <button
          v-for="p in (['xy', 'xz', 'yz'] as const)"
          :key="p"
          class="plane-btn"
          :class="{ active: state.plane === p }"
          @click="state.plane = p"
        >{{ p.toUpperCase() }}</button>
      </div>

      <div class="divider" />

      <div class="toggle-row">
        <span class="toggle-label">Vectores E</span>
        <label class="toggle">
          <input v-model="state.showVectors" type="checkbox" />
          <span class="track"></span>
        </label>
      </div>

      <div class="toggle-row">
        <span class="toggle-label">Potencial V (mapa de color)</span>
        <label class="toggle">
          <input v-model="state.showPotential" type="checkbox" />
          <span class="track"></span>
        </label>
      </div>
    </div>

    <!-- Presets section -->
    <div class="section">
      <div class="section-title">Ejercicios de ejemplo</div>
      <button class="btn secondary" @click="loadPreset('dipole')">Dipolo eléctrico</button>
      <button class="btn secondary" @click="loadPreset('triangle')">Triángulo de cargas</button>
      <button class="btn secondary" @click="loadPreset('square')">Cuadrado de cargas</button>
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
  padding: 14px 16px;
  background: var(--panel-2);
  border-bottom: 1px solid var(--border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 22px;
}

.logo-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--accent-light);
  letter-spacing: 0.3px;
}

.logo-sub {
  font-size: 10px;
  color: var(--muted);
  margin-top: 1px;
}

.section {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  margin-bottom: 10px;
}

/* Charge list */
.charge-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
  max-height: 180px;
  overflow-y: auto;
}

.empty-msg {
  color: var(--muted);
  font-style: italic;
  font-size: 12px;
  text-align: center;
  padding: 8px 0;
}

.charge-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.charge-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.charge-dot.pos {
  background: rgba(239, 68, 68, 0.15);
  color: var(--positive);
  border: 2px solid var(--positive);
}

.charge-dot.neg {
  background: rgba(96, 165, 250, 0.15);
  color: var(--negative);
  border: 2px solid var(--negative);
}

.charge-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.charge-q {
  font-weight: 600;
  font-size: 13px;
}

.charge-pos {
  font-size: 10px;
  color: var(--muted);
}

.text-pos { color: var(--positive); }
.text-neg { color: var(--negative); }

.btn-remove {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0 4px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.btn-remove:hover {
  color: var(--positive);
  background: rgba(239, 68, 68, 0.15);
}

/* Form */
.add-form {
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.form-row.cols3 {
  flex-direction: row;
  gap: 6px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

label {
  font-size: 10px;
  color: var(--muted);
  font-weight: 500;
}

input[type='number'] {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 5px 7px;
  border-radius: 5px;
  font-size: 12px;
  width: 100%;
  outline: none;
  transition: border-color 0.15s;
}

input[type='number']:focus {
  border-color: var(--accent);
}

/* Buttons */
.btn {
  padding: 7px 12px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  width: 100%;
  transition: background 0.15s;
}

.btn.primary {
  background: var(--accent);
  color: #fff;
}

.btn.primary:hover {
  background: #2563eb;
}

.btn.secondary {
  background: var(--panel-2);
  border: 1px solid var(--border);
  color: var(--text);
  margin-bottom: 5px;
}

.btn.secondary:hover {
  background: var(--border);
}

/* Slider */
.slider {
  width: 100%;
  accent-color: var(--accent);
  margin-top: 4px;
}

/* Plane group */
.plane-group {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.plane-btn {
  flex: 1;
  padding: 5px 0;
  border-radius: 5px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--muted);
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.15s;
}

.plane-btn.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: var(--accent);
  color: var(--accent-light);
}

/* Field rows */
.field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-label {
  font-size: 12px;
  color: var(--muted);
}

.badge {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-light);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 600;
}

/* Toggle */
.divider {
  height: 1px;
  background: var(--border);
  margin: 10px 0;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.toggle-label {
  font-size: 12px;
  color: var(--muted);
}

.toggle {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.track {
  position: absolute;
  inset: 0;
  background: var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.track::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle input:checked + .track {
  background: var(--accent);
}

.toggle input:checked + .track::before {
  transform: translateX(16px);
}
</style>
