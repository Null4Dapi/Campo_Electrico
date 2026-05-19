<script setup lang="ts">
import { computed } from 'vue'
import { useLorentzStore } from './store'
import { crossVec } from '../../composables/useMagneticPhysics'
import { magVec } from '../../composables/usePhysics'

const { state } = useLorentzStore()

const sol = computed(() => state.solution)

function sci(n: number, d = 3): string {
  if (n === 0) return '0'
  if (Math.abs(n) >= 0.001 && Math.abs(n) < 1e5) return n.toFixed(d)
  const e = Math.floor(Math.log10(Math.abs(n)))
  const b = n / 10 ** e
  return `${b.toFixed(2)} × 10<sup>${e}</sup>`
}

function vecStr(v: {x:number,y:number,z:number}, d = 3) {
  return `(${v.x.toFixed(d)}, ${v.y.toFixed(d)}, ${v.z.toFixed(d)})`
}

const B  = computed(() => ({ x: state.Bx, y: state.By, z: state.Bz }))
const v0 = computed(() => ({ x: state.vx, y: state.vy, z: state.vz }))
const vxB = computed(() => crossVec(v0.value, B.value))
</script>

<template>
  <aside class="right-panel">
    <div class="panel-header">
      <div class="logo">
        <span>📐</span>
        <div>
          <div class="logo-title">Desarrollo paso a paso</div>
          <div class="logo-sub">Fuerza de Lorentz · F = q(v × B)</div>
        </div>
      </div>
    </div>

    <div class="solution-area" v-if="sol">

      <!-- Datos -->
      <section class="block">
        <div class="btitle accent">Datos del problema</div>
        <div class="data-grid">
          <div class="dr"><span class="dl">Partícula</span>
            <span class="dv">{{ state.particleType === 'proton' ? 'Protón' : state.particleType === 'electron' ? 'Electrón' : state.particleType === 'alpha' ? 'Part. α' : 'Personalizado' }}</span></div>
          <div class="dr"><span class="dl">q</span>
            <span class="dv" v-html="(state.q >= 0 ? '+' : '') + sci(state.q) + ' C'"></span></div>
          <div class="dr"><span class="dl">m</span>
            <span class="dv" v-html="sci(state.m) + ' kg'"></span></div>
          <div class="dr"><span class="dl">v₀</span>
            <span class="dv">{{ vecStr(v0, 2) }} m/s</span></div>
          <div class="dr"><span class="dl">|v₀|</span>
            <span class="dv" v-html="sci(sol.v0mag) + ' m/s'"></span></div>
          <div class="dr"><span class="dl">B</span>
            <span class="dv">{{ vecStr(B, 4) }} T</span></div>
          <div class="dr"><span class="dl">|B|</span>
            <span class="dv" v-html="sci(magVec(B)) + ' T'"></span></div>
        </div>
      </section>

      <!-- Paso 1: v × B -->
      <section class="block">
        <div class="btitle">① Producto vectorial v₀ × B</div>
        <div class="fbox">
          <div class="feq">v₀ × B = det |î  ĵ  k̂|</div>
          <div class="feq" style="color:var(--muted)">
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|{{ state.vx.toFixed(2) }} &nbsp; {{ state.vy.toFixed(2) }} &nbsp; {{ state.vz.toFixed(2) }}|
          </div>
          <div class="feq" style="color:var(--muted)">
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|{{ state.Bx.toFixed(4) }} &nbsp; {{ state.By.toFixed(4) }} &nbsp; {{ state.Bz.toFixed(4) }}|
          </div>
          <div class="fresult">v₀ × B = {{ vecStr(vxB, 2) }} m·T/s</div>
        </div>
      </section>

      <!-- Paso 2: Fuerza -->
      <section class="block">
        <div class="btitle">② Fuerza de Lorentz F = q(v × B)</div>
        <div class="fbox">
          <div class="feq">F = q · (v₀ × B)</div>
          <div class="feq" style="color:var(--muted)"
            v-html="'= (' + sci(state.q) + ') × ' + vecStr(vxB, 2)"></div>
          <div class="fresult" v-html="'F = ' + vecStr({x: state.q*vxB.x, y: state.q*vxB.y, z: state.q*vxB.z}, 2) + ' N'"></div>
          <div class="fsmall" v-html="'|F| = ' + sci(sol.Fmag_init) + ' N'"></div>
        </div>
        <div class="info-note">⚡ F ⊥ v siempre → la fuerza no realiza trabajo, |v| = constante.</div>
      </section>

      <!-- Paso 3: tipo de movimiento -->
      <section class="block">
        <div class="btitle">③ Tipo de movimiento</div>
        <div class="fbox">
          <div class="feq">v_∥ (paralelo a B) = <strong v-html="sci(sol.v_par) + ' m/s'"></strong></div>
          <div class="feq">v_⊥ (perpendicular a B) = <strong v-html="sci(sol.v_perp) + ' m/s'"></strong></div>
        </div>
        <div class="motion-card" :class="sol.motionType">
          <div class="mc-icon">
            {{ sol.motionType === 'circular' ? '⭕' : sol.motionType === 'helical' ? '🌀' : '➡' }}
          </div>
          <div>
            <div class="mc-title">
              {{ sol.motionType === 'circular' ? 'Movimiento Circular Uniforme' :
                 sol.motionType === 'helical'  ? 'Movimiento Helicoidal Uniforme' :
                 'Movimiento Rectilíneo Uniforme' }}
            </div>
            <div class="mc-sub">
              {{ sol.motionType === 'circular' ? 'v_∥ = 0 → sólo gira en el plano ⊥ a B' :
                 sol.motionType === 'helical'  ? 'v_∥ > 0 → gira + avanza a lo largo de B' :
                 'v ∥ B → sin fuerza magnética' }}
            </div>
          </div>
        </div>
      </section>

      <!-- Paso 4: magnitudes -->
      <section class="block">
        <div class="btitle">④ Magnitudes características</div>

        <div class="result-card accent-card">
          <div class="rc-label">Radio ciclotrónico</div>
          <div class="rc-value" v-html="'r = mv_⊥ / (|q|B) = ' + sci(sol.r_c * 100, 4) + ' cm'"></div>
        </div>

        <div class="result-card green-card">
          <div class="rc-label">Frecuencia angular ciclotrónica</div>
          <div class="rc-value" v-html="'ω_c = |q|B / m = ' + sci(sol.omega_c, 4) + ' rad/s'"></div>
        </div>

        <div class="result-card yellow-card">
          <div class="rc-label">Período ciclotrónico</div>
          <div class="rc-value" v-html="'T = 2πm / (|q|B) = ' + sci(sol.T_c, 4) + ' s'"></div>
          <div class="rc-sub">⚠ T no depende de la velocidad (isocrono)</div>
        </div>

        <div class="result-card purple-card" v-if="sol.motionType === 'helical'">
          <div class="rc-label">Paso de la hélice</div>
          <div class="rc-value" v-html="'h = v_∥ · T = ' + sci(sol.pitch * 100, 4) + ' cm'"></div>
        </div>
      </section>

    </div>

    <div class="placeholder" v-else>
      <div class="ph-icon">🌀</div>
      <div class="ph-text">Configura la partícula y el campo B para ver el desarrollo completo.</div>
    </div>
  </aside>
</template>

<style scoped>
.right-panel {
  width: 340px; min-width: 340px;
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

.data-grid { display: flex; flex-direction: column; gap: 3px; margin-bottom: 6px; }
.dr { display: flex; gap: 8px; }
.dl { color: var(--muted); min-width: 80px; font-size: 11px; }
.dv { color: var(--text); font-weight: 500; font-size: 11px; }

.fbox {
  background: var(--panel-2); border: 1px solid var(--border);
  border-radius: 6px; padding: 8px 10px; margin: 6px 0; font-size: 12px;
}
.feq   { color: var(--muted); margin-bottom: 2px; }
.fresult { color: var(--text); font-weight: 600; margin-top: 5px; }
.fsmall  { color: var(--muted); font-size: 11px; margin-top: 3px; }

.info-note {
  font-size: 11px; color: var(--muted); margin-top: 6px;
  background: rgba(59,130,246,.07);
  border-left: 3px solid var(--accent);
  padding: 5px 8px; border-radius: 0 4px 4px 0;
}

.motion-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 7px; border: 1px solid;
  margin-top: 8px;
}
.motion-card.circular { background: rgba(59,130,246,.1); border-color: var(--accent); }
.motion-card.helical  { background: rgba(168,85,247,.1);  border-color: #a855f7; }
.motion-card.linear   { background: rgba(34,197,94,.1);   border-color: var(--green); }

.mc-icon  { font-size: 22px; }
.mc-title { font-size: 12px; font-weight: 700; color: var(--text); }
.mc-sub   { font-size: 11px; color: var(--muted); margin-top: 2px; }

.result-card {
  border-radius: 7px; padding: 8px 12px; border: 1px solid; margin-bottom: 6px;
}
.accent-card  { background: rgba(59,130,246,.1);  border-color: var(--accent); }
.green-card   { background: rgba(34,197,94,.08);  border-color: var(--green); }
.yellow-card  { background: rgba(234,179,8,.08);  border-color: var(--yellow); }
.purple-card  { background: rgba(168,85,247,.08); border-color: #a855f7; }

.rc-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--accent-light); margin-bottom: 3px; }
.green-card  .rc-label { color: #86efac; }
.yellow-card .rc-label { color: #fde68a; }
.purple-card .rc-label { color: #d8b4fe; }
.rc-value { font-size: 13px; font-weight: 700; color: var(--text); }
.rc-sub   { font-size: 11px; color: var(--muted); margin-top: 3px; }

.placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; color: var(--muted); }
.ph-icon { font-size: 36px; opacity: .4; }
.ph-text { text-align: center; font-size: 12px; line-height: 1.8; }
</style>
