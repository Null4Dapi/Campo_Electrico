<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStore } from '../composables/useStore'
import {
  k_e,
  subVec,
  magVec,
  normVec,
  eFieldFromCharge,
  totalEField,
  totalEPotential,
  formatNum,
} from '../composables/usePhysics'

const { state } = useStore()

const pxCm = ref(0)
const pyCm = ref(100)
const pzCm = ref(0)
const solutionHtml = ref('')
const hasSolution = ref(false)

// Sync with solvePoint picked via double-click on canvas
watch(
  () => state.solvePoint,
  (pt) => {
    if (pt) {
      pxCm.value = Math.round(pt.x * 100)
      pyCm.value = Math.round(pt.y * 100)
      pzCm.value = Math.round(pt.z * 100)
      computeSolution()
    }
  }
)

// Keep solvePoint in sync with inputs when solving
function solve() {
  if (state.charges.length === 0) {
    solutionHtml.value = `<p class="msg-warn">⚠ Agrega al menos una carga al sistema.</p>`
    hasSolution.value = false
    return
  }
  const P = { x: (pxCm.value || 0) / 100, y: (pyCm.value || 0) / 100, z: (pzCm.value || 0) / 100 }
  state.solvePoint = P
  computeSolution()
}

function computeSolution() {
  const P = { x: (pxCm.value || 0) / 100, y: (pyCm.value || 0) / 100, z: (pzCm.value || 0) / 100 }
  const charges = state.charges

  if (charges.length === 0) return

  let html = ''

  // ── Datos ──────────────────────────────────────────────────────────────────
  html += `
    <section class="sol-block">
      <div class="sol-block-title accent">Datos del problema</div>
      <div class="data-grid">
        <div class="data-row"><span class="dl">Punto P</span><span class="dv">(${ (P.x * 100).toFixed(1) }, ${ (P.y * 100).toFixed(1) }, ${ (P.z * 100).toFixed(1) }) cm</span></div>
        <div class="data-row"><span class="dl">Nº de cargas</span><span class="dv">${charges.length}</span></div>
        <div class="data-row"><span class="dl">k</span><span class="dv">8.99 × 10<sup>9</sup> N·m²/C²</span></div>
      </div>
      <div class="formula-box">
        <div class="fb-label">Principio de superposición</div>
        <div class="fb-eq">Ē<sub>total</sub> = Ē<sub>1</sub> + Ē<sub>2</sub> + … + Ē<sub>n</sub></div>
        <div class="fb-sub">donde Ē<sub>i</sub> = k·Q<sub>i</sub> / |r<sub>i</sub>|² · r̂<sub>i</sub></div>
      </div>
    </section>
  `

  // ── Por carga ──────────────────────────────────────────────────────────────
  const contributions: { x: number; y: number; z: number }[] = []

  for (let i = 0; i < charges.length; i++) {
    const c = charges[i]
    const rq = { x: c.x, y: c.y, z: c.z }
    const r_vec = subVec(P, rq)
    const r_mag = magVec(r_vec)
    const r_hat = normVec(r_vec)
    const q_C = c.q_nC * 1e-9
    const E_scalar = k_e * q_C / (r_mag ** 2)
    const E_i = eFieldFromCharge(c.q_nC, rq, P)
    const E_mag = magVec(E_i)
    contributions.push(E_i)

    const isPos = c.q_nC >= 0
    const sign = isPos ? '+' : ''
    const titleColor = isPos ? '#ef4444' : '#60a5fa'
    const scalarStr = formatNum(E_scalar, 2)

    html += `
      <section class="sol-block">
        <div class="sol-block-title" style="color:${titleColor}">
          Contribución Q<sub>${i + 1}</sub> = ${sign}${c.q_nC} nC &nbsp;en&nbsp; (${(c.x*100).toFixed(1)}, ${(c.y*100).toFixed(1)}, ${(c.z*100).toFixed(1)}) cm
        </div>

        <div class="step">
          <span class="step-n">①</span>
          <span class="step-txt">Vector posición relativa (cm):</span>
        </div>
        <div class="formula-box">
          <div class="fb-eq">
            r⃗<sub>${i + 1}</sub> = P − r<sub>Q${i + 1}</sub>
            = (${(P.x*100).toFixed(1)}, ${(P.y*100).toFixed(1)}, ${(P.z*100).toFixed(1)}) − (${(c.x*100).toFixed(1)}, ${(c.y*100).toFixed(1)}, ${(c.z*100).toFixed(1)})
          </div>
          <div class="fb-result">
            r⃗<sub>${i + 1}</sub> = (${(r_vec.x*100).toFixed(2)}, ${(r_vec.y*100).toFixed(2)}, ${(r_vec.z*100).toFixed(2)}) cm
          </div>
        </div>

        <div class="step">
          <span class="step-n">②</span>
          <span class="step-txt">Magnitud:</span>
        </div>
        <div class="formula-box">
          <div class="fb-eq">
            |r<sub>${i + 1}</sub>| = √(${(r_vec.x*100).toFixed(2)}² + ${(r_vec.y*100).toFixed(2)}² + ${(r_vec.z*100).toFixed(2)}²)
          </div>
          <div class="fb-result">|r<sub>${i + 1}</sub>| = ${(r_mag*100).toFixed(2)} cm = ${r_mag.toFixed(4)} m</div>
        </div>

        <div class="step">
          <span class="step-n">③</span>
          <span class="step-txt">Vector unitario r̂:</span>
        </div>
        <div class="formula-box">
          <div class="fb-result">
            r̂<sub>${i + 1}</sub> = (${r_hat.x.toFixed(4)}, ${r_hat.y.toFixed(4)}, ${r_hat.z.toFixed(4)})
          </div>
        </div>

        <div class="step">
          <span class="step-n">④</span>
          <span class="step-txt">Campo eléctrico:</span>
        </div>
        <div class="formula-box">
          <div class="fb-eq">
            Ē<sub>${i + 1}</sub> = k·Q<sub>${i + 1}</sub> / |r|² · r̂
          </div>
          <div class="fb-eq">
            = (8.99×10⁹)(${sign}${c.q_nC}×10⁻⁹) / (${r_mag.toFixed(4)})²  ·  r̂
          </div>
          <div class="fb-eq" style="color:${isPos ? '#fca5a5' : '#93c5fd'}">
            = ${sign}${scalarStr} N/C · r̂
          </div>
          <div class="fb-result">
            Ē<sub>${i + 1}</sub> = (${E_i.x.toFixed(2)}, ${E_i.y.toFixed(2)}, ${E_i.z.toFixed(2)}) N/C
          </div>
        </div>
        <div class="mag-line">
          |Ē<sub>${i + 1}</sub>| = <strong>${E_mag.toFixed(2)} N/C</strong>
        </div>
      </section>
    `
  }

  // ── Superposición ──────────────────────────────────────────────────────────
  const E_total = totalEField(charges, P)
  const E_mag = magVec(E_total)
  const E_dir = normVec(E_total)
  const V_total = totalEPotential(charges, P)

  const sumStr = contributions
    .map((e, i) => `Ē<sub>${i + 1}</sub> = (${e.x.toFixed(2)}, ${e.y.toFixed(2)}, ${e.z.toFixed(2)})`)
    .join('<br>')

  html += `
    <section class="sol-block">
      <div class="sol-block-title" style="color:var(--green)">Resultado Final</div>

      <div class="formula-box">
        <div class="fb-label">Suma de contribuciones:</div>
        <div class="fb-eq" style="line-height:2">${sumStr}</div>
        <div class="fb-eq">
          Ē<sub>total</sub> = ${contributions.map((_, i) => `Ē<sub>${i + 1}</sub>`).join(' + ')}
        </div>
      </div>

      <div class="result-card accent-card">
        <div class="rc-label">Campo eléctrico total en P</div>
        <div class="rc-value">Ē = (${E_total.x.toFixed(2)},  ${E_total.y.toFixed(2)},  ${E_total.z.toFixed(2)}) N/C</div>
        <div class="rc-sub">|Ē| = ${E_mag.toFixed(2)} N/C</div>
        <div class="rc-sub">r̂<sub>E</sub> = (${E_dir.x.toFixed(3)}, ${E_dir.y.toFixed(3)}, ${E_dir.z.toFixed(3)})</div>
      </div>

      <div class="result-card yellow-card" style="margin-top:10px">
        <div class="rc-label">Potencial eléctrico en P</div>
        <div class="rc-value">V = ${V_total.toFixed(2)} V</div>
        <div class="rc-sub">V = k·Q<sub>1</sub>/r<sub>1</sub> + k·Q<sub>2</sub>/r<sub>2</sub> + …</div>
      </div>
    </section>
  `

  solutionHtml.value = html
  hasSolution.value = true
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') solve()
}
</script>

<template>
  <aside class="right-panel">
    <div class="panel-header">
      <div class="logo">
        <span class="logo-icon">📐</span>
        <div>
          <div class="logo-title">Resolver</div>
          <div class="logo-sub">Procedimiento paso a paso</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Punto P (cm)</div>
      <div class="p-inputs">
        <div class="form-group">
          <label>x</label>
          <input v-model.number="pxCm" type="number" step="1" @keyup="onKey" />
        </div>
        <div class="form-group">
          <label>y</label>
          <input v-model.number="pyCm" type="number" step="1" @keyup="onKey" />
        </div>
        <div class="form-group">
          <label>z</label>
          <input v-model.number="pzCm" type="number" step="1" @keyup="onKey" />
        </div>
      </div>
      <div class="hint">También puedes hacer <strong>doble clic</strong> en la escena 3D.</div>
      <button class="btn-solve" @click="solve">Calcular campo en P →</button>
    </div>

    <div class="solution-area" v-if="hasSolution">
      <div v-html="solutionHtml"></div>
    </div>

    <div class="placeholder" v-else>
      <div class="ph-icon">⚡</div>
      <div class="ph-text">
        Agrega cargas y presiona<br>
        <strong>Calcular campo en P</strong><br>
        para ver el desarrollo paso a paso.
      </div>
    </div>
  </aside>
</template>

<style scoped>
.right-panel {
  width: 340px;
  min-width: 340px;
  background: var(--panel);
  border-left: 1px solid var(--border);
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

.logo-icon { font-size: 20px; }
.logo-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--accent-light);
}
.logo-sub { font-size: 10px; color: var(--muted); margin-top: 1px; }

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

.p-inputs {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
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

.hint {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 8px;
}

.btn-solve {
  width: 100%;
  padding: 8px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-solve:hover {
  background: #2563eb;
}

/* Solution area */
.solution-area {
  padding: 12px 14px;
  flex: 1;
  font-size: 12px;
  line-height: 1.6;
}

/* Injected HTML styles */
.solution-area :deep(.sol-block) {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.solution-area :deep(.sol-block:last-child) {
  border-bottom: none;
}

.solution-area :deep(.sol-block-title) {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 10px;
}

.solution-area :deep(.sol-block-title.accent) {
  color: var(--accent-light);
}

.solution-area :deep(.data-grid) {
  margin-bottom: 8px;
}

.solution-area :deep(.data-row) {
  display: flex;
  gap: 8px;
  margin-bottom: 3px;
}

.solution-area :deep(.dl) {
  color: var(--muted);
  min-width: 90px;
}

.solution-area :deep(.dv) {
  color: var(--text);
  font-weight: 500;
}

.solution-area :deep(.formula-box) {
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  margin: 6px 0;
  font-size: 12px;
}

.solution-area :deep(.fb-label) {
  font-size: 10px;
  color: var(--muted);
  margin-bottom: 4px;
}

.solution-area :deep(.fb-eq) {
  color: var(--muted);
  margin-bottom: 2px;
}

.solution-area :deep(.fb-result) {
  color: var(--text);
  font-weight: 600;
  margin-top: 4px;
}

.solution-area :deep(.fb-sub) {
  font-size: 11px;
  color: var(--muted);
  margin-top: 3px;
}

.solution-area :deep(.step) {
  display: flex;
  gap: 6px;
  align-items: baseline;
  margin-bottom: 2px;
  margin-top: 6px;
}

.solution-area :deep(.step-n) {
  color: var(--accent);
  font-weight: 700;
  font-size: 13px;
}

.solution-area :deep(.step-txt) {
  color: var(--muted);
  font-size: 11px;
}

.solution-area :deep(.mag-line) {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}

.solution-area :deep(.mag-line strong) {
  color: var(--text);
}

.solution-area :deep(.result-card) {
  border-radius: 7px;
  padding: 10px 12px;
  border: 1px solid;
}

.solution-area :deep(.accent-card) {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--accent);
}

.solution-area :deep(.yellow-card) {
  background: rgba(234, 179, 8, 0.08);
  border-color: var(--yellow);
}

.solution-area :deep(.rc-label) {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent-light);
  margin-bottom: 4px;
}

.solution-area :deep(.yellow-card .rc-label) {
  color: #fde68a;
}

.solution-area :deep(.rc-value) {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.solution-area :deep(.rc-sub) {
  font-size: 11px;
  color: var(--muted);
}

.solution-area :deep(.msg-warn) {
  color: var(--yellow);
  padding: 8px;
  text-align: center;
}

/* Placeholder */
.placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: var(--muted);
}

.ph-icon {
  font-size: 36px;
  opacity: 0.4;
}

.ph-text {
  text-align: center;
  font-size: 12px;
  line-height: 1.8;
}

.ph-text strong {
  color: var(--accent-light);
}
</style>
