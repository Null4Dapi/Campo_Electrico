<script setup lang="ts">
import { computed, watch } from 'vue'
import { useBiotStore } from './store'
import { solveBiot, MU0 } from './physics'
import { formatNum } from '../../composables/usePhysics'

const { state, getSceneScale } = useBiotStore()

const sol = computed(() =>
  solveBiot({
    conductorType:   state.conductorType,
    I:               state.I,
    wireLength:      state.wireLength,
    loopRadius:      state.loopRadius,
    solenoidLength:  state.solenoidLength,
    solenoidRadius:  state.solenoidRadius,
    solenoidTurns:   state.solenoidTurns,
    solvePoint:      state.solvePoint,
    sceneScale:      getSceneScale(),
  })
)

watch(sol, (s) => { state.solution = s }, { immediate: true })

function sci(n: number, d = 3): string {
  if (n === 0) return '0'
  if (Math.abs(n) >= 0.001 && Math.abs(n) < 1e5) return n.toFixed(d)
  const e = Math.floor(Math.log10(Math.abs(n)))
  const b = n / 10 ** e
  return `${b.toFixed(2)} × 10<sup>${e}</sup>`
}
</script>

<template>
  <aside class="right-panel">
    <div class="panel-header">
      <div class="logo">
        <span>📐</span>
        <div>
          <div class="logo-title">Desarrollo paso a paso</div>
          <div class="logo-sub">Ley de Biot-Savart</div>
        </div>
      </div>
    </div>

    <div class="solution-area">

      <!-- Step 1: Setup -->
      <section class="block">
        <div class="btitle accent">① Datos del conductor</div>
        <div class="data-grid">
          <div class="dr"><span class="dl">Tipo</span>
            <span class="dv">
              {{ state.conductorType === 'wire' ? 'Cable recto'
               : state.conductorType === 'loop' ? 'Espira circular'
               : 'Solenoide' }}
            </span>
          </div>
          <div class="dr"><span class="dl">Corriente I</span>
            <span class="dv">{{ state.I }} A</span>
          </div>
          <template v-if="state.conductorType === 'wire'">
            <div class="dr"><span class="dl">Longitud L</span>
              <span class="dv">{{ (state.wireLength * 100).toFixed(1) }} cm</span>
            </div>
          </template>
          <template v-else-if="state.conductorType === 'loop'">
            <div class="dr"><span class="dl">Radio R</span>
              <span class="dv">{{ (state.loopRadius * 100).toFixed(1) }} cm</span>
            </div>
          </template>
          <template v-else>
            <div class="dr"><span class="dl">Longitud L</span>
              <span class="dv">{{ (state.solenoidLength * 100).toFixed(1) }} cm</span>
            </div>
            <div class="dr"><span class="dl">Radio R</span>
              <span class="dv">{{ (state.solenoidRadius * 100).toFixed(1) }} cm</span>
            </div>
            <div class="dr"><span class="dl">Vueltas N</span>
              <span class="dv">{{ state.solenoidTurns }}</span>
            </div>
            <div class="dr"><span class="dl">n = N/L</span>
              <span class="dv">{{ (state.solenoidTurns / (state.solenoidLength * 100)).toFixed(2) }} vueltas/cm</span>
            </div>
          </template>
        </div>
      </section>

      <!-- Step 2: Law -->
      <section class="block">
        <div class="btitle">② Ley de Biot-Savart</div>
        <div class="fbox">
          <div class="feq">dB = (μ₀/4π) · I dl × r̂ / r²</div>
          <div class="feq small" style="margin-top:4px; font-style: italic">
            Integrado sobre todo el conductor:
          </div>
        </div>

        <!-- Wire formula -->
        <template v-if="state.conductorType === 'wire'">
          <div class="formula-card">
            <div class="fc-label">Cable infinito a distancia d</div>
            <div class="fc-eq">B = μ₀I / (2πd)</div>
          </div>
          <div class="formula-card" style="margin-top:6px">
            <div class="fc-label">Cable finito (longitud L, a distancia d)</div>
            <div class="fc-eq">B = (μ₀I/4πd)(sin θ₂ − sin θ₁)</div>
            <div class="fc-note">θ₁, θ₂: ángulos en los extremos</div>
          </div>
        </template>

        <!-- Loop formula -->
        <template v-else-if="state.conductorType === 'loop'">
          <div class="formula-card">
            <div class="fc-label">En el centro (z = 0)</div>
            <div class="fc-eq">B = μ₀I / (2R)</div>
          </div>
          <div class="formula-card" style="margin-top:6px">
            <div class="fc-label">Sobre el eje a distancia z</div>
            <div class="fc-eq">B = μ₀IR² / [2(R²+z²)^(3/2)]</div>
          </div>
        </template>

        <!-- Solenoid formula -->
        <template v-else>
          <div class="formula-card">
            <div class="fc-label">Interior (solenoide ideal)</div>
            <div class="fc-eq">B = μ₀nI</div>
            <div class="fc-note">n = N/L espiras por metro</div>
          </div>
          <div class="formula-card" style="margin-top:6px">
            <div class="fc-label">En los extremos</div>
            <div class="fc-eq">B ≈ μ₀nI / 2</div>
          </div>
        </template>
      </section>

      <!-- Step 3: Constants -->
      <section class="block">
        <div class="btitle">③ Constantes físicas</div>
        <div class="data-grid">
          <div class="dr">
            <span class="dl">μ₀</span>
            <span class="dv">4π × 10⁻⁷ T·m/A</span>
          </div>
          <div class="dr">
            <span class="dl">μ₀/4π</span>
            <span class="dv">10⁻⁷ T·m/A</span>
          </div>
        </div>
      </section>

      <!-- Step 4: Result -->
      <section class="block">
        <div class="btitle">④ Resultado principal</div>

        <!-- Wire: B at reference distance -->
        <div v-if="state.conductorType === 'wire'">
          <div class="result-card accent-card">
            <div class="rc-label">B a 10 cm del cable (aprox. infinito)</div>
            <div class="rc-value" v-html="'B = ' + sci(MU0 * state.I / (2 * Math.PI * 0.1)) + ' T'"></div>
            <div class="rc-sub">
              = μ₀ × {{ state.I }} / (2π × 0.1 m)
            </div>
          </div>
          <div class="info-note">
            ⚡ El campo B forma anillos concéntricos alrededor del cable (regla de la mano derecha).
            A doble distancia → B se reduce a la mitad.
          </div>
        </div>

        <!-- Loop: B at center -->
        <div v-else-if="state.conductorType === 'loop'">
          <div class="result-card accent-card">
            <div class="rc-label">B en el centro de la espira</div>
            <div class="rc-value" v-html="'B = ' + sci(sol.Bcenter) + ' T'"></div>
            <div class="rc-sub" v-html="
              '= μ₀ × ' + state.I + ' / (2 × ' + (state.loopRadius*100).toFixed(1) + ' cm) = ' + sci(sol.Bcenter) + ' T'
            "></div>
          </div>
          <div class="result-card green-card" style="margin-top:6px">
            <div class="rc-label">B en el eje a z = R</div>
            <div class="rc-value"
              v-html="sci((MU0*state.I*state.loopRadius**2)/(2*(state.loopRadius**2+state.loopRadius**2)**1.5)) + ' T'">
            </div>
            <div class="rc-sub">≈ B_centro / 2√2</div>
          </div>
          <div class="info-note">
            ⚡ Las líneas de B salen por el centro de la espira, como un imán dipolar.
          </div>
        </div>

        <!-- Solenoid: B inside -->
        <div v-else>
          <div class="result-card accent-card">
            <div class="rc-label">B interior (campo uniforme)</div>
            <div class="rc-value" v-html="'B = μ₀nI = ' + sci(sol.Binside) + ' T'"></div>
            <div class="rc-sub"
              v-html="'= 4π×10⁻⁷ × ' + (state.solenoidTurns/state.solenoidLength).toFixed(1) + ' × ' + state.I + ' A'">
            </div>
          </div>
          <div class="result-card yellow-card" style="margin-top:6px">
            <div class="rc-label">B en los extremos</div>
            <div class="rc-value" v-html="sci(sol.Binside / 2) + ' T'"></div>
            <div class="rc-sub">= B_interior / 2</div>
          </div>
          <div class="info-note">
            ⚡ El campo interior es uniforme y paralelo al eje. Fuera del solenoide B ≈ 0 (campo de dispersión).
          </div>
        </div>
      </section>

      <!-- Step 5: Solve point -->
      <section class="block" v-if="sol.Bat_P">
        <div class="btitle">⑤ Campo en punto P (doble clic)</div>
        <div class="data-grid">
          <div class="dr"><span class="dl">Posición P</span>
            <span class="dv">({{ (state.solvePoint!.x / getSceneScale() * 100).toFixed(2) }} cm,
             {{ (state.solvePoint!.y / getSceneScale() * 100).toFixed(2) }} cm,
             {{ (state.solvePoint!.z / getSceneScale() * 100).toFixed(2) }} cm)</span>
          </div>
          <div class="dr"><span class="dl">|B| en P</span>
            <span class="dv" v-html="sci(sol.Bmag_P!) + ' T'"></span>
          </div>
          <div class="dr"><span class="dl">Bx</span>
            <span class="dv" v-html="sci(sol.Bat_P.x) + ' T'"></span>
          </div>
          <div class="dr"><span class="dl">By</span>
            <span class="dv" v-html="sci(sol.Bat_P.y) + ' T'"></span>
          </div>
          <div class="dr"><span class="dl">Bz</span>
            <span class="dv" v-html="sci(sol.Bat_P.z) + ' T'"></span>
          </div>
        </div>
        <div class="info-note" style="margin-top: 8px">
          Calculado numéricamente con la ley de Biot-Savart discretizada en segmentos de corriente.
        </div>
      </section>
      <section class="block no-pt" v-else>
        <div class="hint">💡 Doble clic en la escena 3D para calcular el campo B en un punto específico</div>
      </section>

    </div>
  </aside>
</template>

<style scoped>
.right-panel {
  width: 320px; min-width: 320px;
  background: var(--panel);
  border-left: 1px solid var(--border);
  display: flex; flex-direction: column;
  overflow-y: auto;
}

.panel-header {
  padding: 14px 16px;
  background: var(--panel-2);
  border-bottom: 1px solid var(--border);
}
.logo { display: flex; align-items: center; gap: 10px; }
.logo-title { font-size: 14px; font-weight: 700; color: var(--accent-light); }
.logo-sub { font-size: 10px; color: var(--muted); margin-top: 1px; }

.solution-area { padding: 12px 14px; flex: 1; font-size: 12px; line-height: 1.6; }

.block {
  margin-bottom: 14px; padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.block:last-child { border-bottom: none; }

.btitle {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.8px; margin-bottom: 8px; color: var(--muted);
}
.btitle.accent { color: var(--accent-light); }

.data-grid { display: flex; flex-direction: column; gap: 4px; }
.dr { display: flex; gap: 8px; align-items: baseline; }
.dl { color: var(--muted); min-width: 90px; font-size: 11px; flex-shrink: 0; }
.dv { color: var(--text); font-weight: 500; font-size: 11px; }

.fbox {
  background: var(--panel-2); border: 1px solid var(--border);
  border-radius: 6px; padding: 8px 10px; margin: 4px 0;
}
.feq   { color: var(--text); }
.feq.small { font-size: 11px; color: var(--muted); }

.formula-card {
  background: rgba(59,130,246,.07);
  border: 1px solid rgba(59,130,246,.2);
  border-radius: 7px;
  padding: 8px 10px;
}
.fc-label { font-size: 10px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
.fc-eq    { font-size: 14px; font-weight: 700; color: #93c5fd; text-align: center; padding: 2px 0; }
.fc-note  { font-size: 10px; color: var(--muted); margin-top: 3px; }

.result-card {
  border-radius: 7px; padding: 8px 12px; border: 1px solid;
}
.accent-card  { background: rgba(59,130,246,.1);  border-color: var(--accent); }
.green-card   { background: rgba(34,197,94,.08);  border-color: #22c55e; }
.yellow-card  { background: rgba(234,179,8,.08);  border-color: #eab308; }

.rc-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--accent-light); margin-bottom: 4px; }
.green-card  .rc-label { color: #86efac; }
.yellow-card .rc-label { color: #fde68a; }
.rc-value { font-size: 13px; font-weight: 700; color: var(--text); }
.rc-sub   { font-size: 11px; color: var(--muted); margin-top: 3px; }

.info-note {
  font-size: 11px; color: var(--muted); margin-top: 8px;
  background: rgba(59,130,246,.07);
  border-left: 3px solid var(--accent);
  padding: 5px 8px; border-radius: 0 4px 4px 0;
  line-height: 1.5;
}

.no-pt { border-style: dashed; opacity: 0.7; }
.hint  { font-size: 11px; color: var(--muted); font-style: italic; }
</style>
