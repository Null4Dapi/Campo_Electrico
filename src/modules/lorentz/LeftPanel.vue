<script setup lang="ts">
import { useLorentzStore } from './store'

const { state, setParticle, loadPreset } = useLorentzStore()

const emit = defineEmits<{ back: [] }>()

const particleOptions = [
  { value: 'proton',   label: 'Protón (p⁺)' },
  { value: 'electron', label: 'Electrón (e⁻)' },
  { value: 'alpha',    label: 'Part. α' },
  { value: 'custom',   label: 'Personalizado' },
]

function fmtSci(n: number): string {
  if (n === 0) return '0'
  const e = Math.floor(Math.log10(Math.abs(n)))
  return `${(n / 10 ** e).toFixed(3)} × 10^${e}`
}
</script>

<template>
  <aside class="left-panel">
    <div class="panel-header">
      <button class="btn-back" @click="emit('back')">← Módulos</button>
      <div class="logo">
        <span>🌀</span>
        <div>
          <div class="logo-title">Fuerza de Lorentz</div>
          <div class="logo-sub">Trayectoria de partícula en campo B</div>
        </div>
      </div>
    </div>

    <!-- Particle -->
    <div class="section">
      <div class="section-title">Partícula cargada</div>
      <div class="form-group">
        <label>Tipo de partícula</label>
        <select v-model="state.particleType" @change="setParticle(state.particleType as any)">
          <option v-for="o in particleOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <div class="two-col" v-if="state.particleType === 'custom'">
        <div class="form-group">
          <label>q (C)</label>
          <input v-model.number="state.q" type="number" step="1e-19" />
        </div>
        <div class="form-group">
          <label>m (kg)</label>
          <input v-model.number="state.m" type="number" step="1e-27" />
        </div>
      </div>
      <div class="info-chip" v-else>
        q = {{ state.q > 0 ? '+' : '' }}{{ fmtSci(state.q) }} C &nbsp;·&nbsp;
        m = {{ fmtSci(state.m) }} kg
      </div>
    </div>

    <!-- Velocity -->
    <div class="section">
      <div class="section-title">Velocidad inicial v₀ (m/s)</div>
      <div class="three-col">
        <div class="form-group">
          <label>vₓ</label>
          <input v-model.number="state.vx" type="number" step="1e5" />
        </div>
        <div class="form-group">
          <label>v_y</label>
          <input v-model.number="state.vy" type="number" step="1e5" />
        </div>
        <div class="form-group">
          <label>v_z</label>
          <input v-model.number="state.vz" type="number" step="1e5" />
        </div>
      </div>
    </div>

    <!-- Magnetic field -->
    <div class="section">
      <div class="section-title">Campo magnético B (T)</div>
      <div class="three-col">
        <div class="form-group">
          <label>Bₓ</label>
          <input v-model.number="state.Bx" type="number" step="0.001" />
        </div>
        <div class="form-group">
          <label>B_y</label>
          <input v-model.number="state.By" type="number" step="0.001" />
        </div>
        <div class="form-group">
          <label>B_z</label>
          <input v-model.number="state.Bz" type="number" step="0.001" />
        </div>
      </div>
    </div>

    <!-- Animation -->
    <div class="section">
      <div class="section-title">Animación</div>
      <div class="field-row">
        <span class="field-label">Períodos a mostrar</span>
        <span class="badge">{{ state.numPeriods }}</span>
      </div>
      <input v-model.number="state.numPeriods" type="range" min="1" max="8" step="1" class="slider" />
      <div class="toggle-row" style="margin-top: 10px">
        <span class="field-label">Reproducir animación</span>
        <label class="toggle">
          <input v-model="state.isPlaying" type="checkbox" />
          <span class="track"></span>
        </label>
      </div>
    </div>

    <!-- Presets -->
    <div class="section">
      <div class="section-title">Ejercicios de ejemplo</div>
      <button class="btn secondary" @click="loadPreset('circular')">Movimiento circular (protón)</button>
      <button class="btn secondary" @click="loadPreset('helical')">Movimiento helicoidal</button>
      <button class="btn secondary" @click="loadPreset('electron')">Electrón rápido</button>
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

.form-group { display: flex; flex-direction: column; gap: 3px; margin-bottom: 6px; }
label { font-size: 10px; color: var(--muted); font-weight: 500; }

input[type='number'], select {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 5px 7px;
  border-radius: 5px;
  font-size: 12px;
  width: 100%;
  outline: none;
}
input[type='number']:focus, select:focus { border-color: var(--accent); }

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }

.info-chip {
  font-size: 11px;
  color: var(--muted);
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 6px 8px;
  margin-top: 4px;
}

.field-row { display: flex; justify-content: space-between; align-items: center; }
.field-label { font-size: 12px; color: var(--muted); }
.badge {
  background: rgba(59,130,246,.15); color: var(--accent-light);
  border: 1px solid rgba(59,130,246,.3); border-radius: 4px;
  padding: 1px 7px; font-size: 11px; font-weight: 600;
}
.slider { width: 100%; accent-color: var(--accent); margin-top: 4px; }

.toggle-row { display: flex; justify-content: space-between; align-items: center; }
.toggle { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; }
.toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.track {
  position: absolute; inset: 0;
  background: var(--border); border-radius: 10px; cursor: pointer; transition: background .2s;
}
.track::before {
  content: ''; position: absolute;
  width: 14px; height: 14px; left: 3px; top: 3px;
  background: #fff; border-radius: 50%; transition: transform .2s;
}
.toggle input:checked + .track { background: var(--accent); }
.toggle input:checked + .track::before { transform: translateX(16px); }

.btn {
  padding: 7px 12px; border-radius: 6px; border: none;
  cursor: pointer; font-size: 12px; font-weight: 600; width: 100%;
  transition: background .15s; margin-bottom: 5px;
}
.btn.secondary {
  background: var(--panel-2); border: 1px solid var(--border); color: var(--text);
}
.btn.secondary:hover { background: var(--border); }
</style>
