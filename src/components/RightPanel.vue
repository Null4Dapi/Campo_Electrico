<script setup lang="ts">
import { ref, watch } from "vue";
import { useStore } from "../composables/useStore";
import {
  k_e,
  subVec,
  magVec,
  normVec,
  eFieldFromCharge,
  totalEField,
  totalEPotential,
  formatNum,
} from "../composables/usePhysics";

const { state } = useStore();

const pxCm = ref(0);
const pyCm = ref(10);
const pzCm = ref(0);
const solutionHtml = ref("");
const hasSolution = ref(false);
const isSolutionVisible = ref(false);

watch(
  () => state.solvePoint,
  (pt) => {
    if (pt) {
      pxCm.value = Math.round(pt.x * 1000);
      pyCm.value = Math.round(pt.y * 1000);
      pzCm.value = 0;
      computeSolution();
      isSolutionVisible.value = true;
    }
  },
);

function solve() {
  if (state.charges.length === 0) {
    solutionHtml.value = `<p class="msg-warn">⚠ Agrega al menos una carga al sistema.</p>`;
    hasSolution.value = false;
    isSolutionVisible.value = true;
    return;
  }
  const P = {
    x: (pxCm.value || 0) / 1000,
    y: (pyCm.value || 0) / 1000,
    z: 0,
  };
  state.solvePoint = P;
  computeSolution();
  isSolutionVisible.value = true;
}

function computeSolution() {
  const P = {
    x: (pxCm.value || 0) / 1000,
    y: (pyCm.value || 0) / 1000,
    z: 0,
  };
  const charges = state.charges;

  if (charges.length === 0) return;

  let html = "";

  html += `
    <section class="sol-block">
      <div class="sol-block-title accent">Datos del problema</div>
      <div class="data-grid">
        <div class="data-row"><span class="dl">Punto P</span><span class="dv">(${(P.x * 1000).toFixed(1)}, ${(P.y * 1000).toFixed(1)}) cm</span></div>
        <div class="data-row"><span class="dl">Nº de cargas</span><span class="dv">${charges.length}</span></div>
        <div class="data-row"><span class="dl">k</span><span class="dv">8.99 × 10<sup>9</sup> N·m²/C²</span></div>
      </div>
      <div class="formula-box">
        <div class="fb-label">Principio de superposición (2D)</div>
        <div class="fb-eq">Ē<sub>total</sub> = Ē<sub>1</sub> + Ē<sub>2</sub> + … + Ē<sub>n</sub></div>
        <div class="fb-sub">donde Ē<sub>i</sub> = k·Q<sub>i</sub> / |r<sub>i</sub>|² · r̂<sub>i</sub></div>
      </div>
    </section>
  `;

  const contributions: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < charges.length; i++) {
    const c = charges[i];
    const rq = { x: c.x, y: c.y, z: 0 };
    const r_vec = subVec(P, rq);
    const r_mag = magVec(r_vec);
    const r_hat = normVec(r_vec);
    const q_C = c.q_nC * 1e-9;
    const E_scalar = (k_e * q_C) / r_mag ** 2;
    const E_i = eFieldFromCharge(c.q_nC, rq, P);
    const E_mag = magVec(E_i);
    contributions.push(E_i);

    const isPos = c.q_nC >= 0;
    const sign = isPos ? "+" : "";
    const titleColor = isPos ? "#ef4444" : "#60a5fa";
    const scalarStr = formatNum(E_scalar, 2);

    html += `
      <section class="sol-block">
        <div class="sol-block-title" style="color:${titleColor}">
          Contribución Q<sub>${i + 1}</sub> = ${sign}${c.q_nC} nC &nbsp;en&nbsp; (${(c.x * 1000).toFixed(1)}, ${(c.y * 1000).toFixed(1)}) cm
        </div>

        <div class="step">
          <span class="step-n">①</span>
          <span class="step-txt">Vector posición relativa (cm):</span>
        </div>
        <div class="formula-box">
          <div class="fb-eq">
            r⃗<sub>${i + 1}</sub> = P − r<sub>Q${i + 1}</sub>
            = (${(P.x * 1000).toFixed(1)}, ${(P.y * 1000).toFixed(1)}) − (${(c.x * 1000).toFixed(1)}, ${(c.y * 1000).toFixed(1)})
          </div>
          <div class="fb-result">
            r⃗<sub>${i + 1}</sub> = (${(r_vec.x * 1000).toFixed(2)}, ${(r_vec.y * 1000).toFixed(2)}) cm
          </div>
        </div>

        <div class="step">
          <span class="step-n">②</span>
          <span class="step-txt">Magnitud:</span>
        </div>
        <div class="formula-box">
          <div class="fb-eq">
            |r<sub>${i + 1}</sub>| = √(${(r_vec.x * 1000).toFixed(2)}² + ${(r_vec.y * 1000).toFixed(2)}²)
          </div>
          <div class="fb-result">|r<sub>${i + 1}</sub>| = ${(r_mag * 1000).toFixed(2)} cm = ${r_mag.toFixed(4)} m</div>
        </div>

        <div class="step">
          <span class="step-n">③</span>
          <span class="step-txt">Vector unitario r̂:</span>
        </div>
        <div class="formula-box">
          <div class="fb-result">
            r̂<sub>${i + 1}</sub> = (${r_hat.x.toFixed(4)}, ${r_hat.y.toFixed(4)})
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
          <div class="fb-eq" style="color:${isPos ? "#fca5a5" : "#93c5fd"}">
            = ${sign}${scalarStr} N/C · r̂
          </div>
          <div class="fb-result">
            Ē<sub>${i + 1}</sub> = (${E_i.x.toFixed(2)}, ${E_i.y.toFixed(2)}) N/C
          </div>
        </div>
        <div class="mag-line">
          |Ē<sub>${i + 1}</sub>| = <strong>${E_mag.toFixed(2)} N/C</strong>
        </div>
      </section>
    `;
  }

  const E_total = totalEField(charges, P);
  const E_mag = magVec(E_total);
  const E_dir = normVec(E_total);
  const V_total = totalEPotential(charges, P);

  const sumStr = contributions
    .map(
      (e, i) =>
        `Ē<sub>${i + 1}</sub> = (${e.x.toFixed(2)}, ${e.y.toFixed(2)})`,
    )
    .join("<br>");

  html += `
    <section class="sol-block">
      <div class="sol-block-title" style="color:var(--green)">Resultado Final</div>

      <div class="formula-box">
        <div class="fb-label">Suma de contribuciones:</div>
        <div class="fb-eq" style="line-height:2">${sumStr}</div>
        <div class="fb-eq">
          Ē<sub>total</sub> = ${contributions.map((_, i) => `Ē<sub>${i + 1}</sub>`).join(" + ")}
        </div>
      </div>

      <div class="result-card accent-card">
        <div class="rc-label">Campo eléctrico total en P</div>
        <div class="rc-value">Ē = (${E_total.x.toFixed(2)},  ${E_total.y.toFixed(2)}) N/C</div>
        <div class="rc-sub">|Ē| = ${E_mag.toFixed(2)} N/C</div>
        <div class="rc-sub">r̂<sub>E</sub> = (${E_dir.x.toFixed(3)}, ${E_dir.y.toFixed(3)})</div>
      </div>

      <div class="result-card yellow-card" style="margin-top:10px">
        <div class="rc-label">Potencial eléctrico en P</div>
        <div class="rc-value">V = ${V_total.toFixed(2)} V</div>
        <div class="rc-sub">V = k·Q<sub>1</sub>/r<sub>1</sub> + k·Q<sub>2</sub>/r<sub>2</sub> + …</div>
      </div>
    </section>
  `;

  solutionHtml.value = html;
  hasSolution.value = true;
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Enter") solve();
}
</script>

<template>
  <div class="solution-wrapper">
    <div class="top-controls-row">
      <div class="quick-solver-bar">
        <span class="bar-title">📍 Punto P (cm)</span>
        <div class="bar-inputs">
          <input
            v-model.number="pxCm"
            type="number"
            step="1"
            placeholder="x"
            @keyup="onKey"
          />
          <input
            v-model.number="pyCm"
            type="number"
            step="1"
            placeholder="y"
            @keyup="onKey"
          />
        </div>
        <button class="btn-calc" @click="solve">Calcular</button>
        <button
          v-if="state.solvePoint"
          class="btn-target"
          title="Centrar en Punto P"
          @click="
            state.focusTarget = {
              x: state.solvePoint.x,
              y: state.solvePoint.y,
              z: 0,
              type: 'pointP',
            }
          "
        >
          🎯
        </button>
      </div>

      <button
        v-if="hasSolution"
        class="btn-toggle-solution"
        :class="{ active: isSolutionVisible }"
        @click="isSolutionVisible = !isSolutionVisible"
      >
        <span class="btn-icon">📝</span>
        <span>{{
          isSolutionVisible ? "Ocultar Solución" : "Ver Solución"
        }}</span>
      </button>
    </div>

    <aside
      v-if="hasSolution && isSolutionVisible"
      class="solution-panel-floating"
    >
      <div class="solution-header">
        <div class="title-row">
          <span class="header-icon">📐</span>
          <div>
            <div class="h-title">Solución Analítica</div>
            <div class="h-sub">Desarrollo matemático en P</div>
          </div>
        </div>
        <button
          class="btn-close-sol"
          title="Cerrar solución"
          @click="isSolutionVisible = false"
        >
          ×
        </button>
      </div>

      <div class="solution-area">
        <div v-html="solutionHtml"></div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.solution-wrapper {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.top-controls-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.quick-solver-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
}

.bar-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--muted);
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.bar-inputs {
  display: flex;
  gap: 6px;
  width: 160px;
}

.bar-inputs input {
  flex: 1;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 5px 2px;
  border-radius: 8px;
  font-size: 11px;
  text-align: center;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.bar-inputs input::-webkit-outer-spin-button,
.bar-inputs input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.bar-inputs input[type="number"] {
  -moz-appearance: textfield;
}

.bar-inputs input:focus {
  border-color: var(--accent);
  background: rgba(0, 0, 0, 0.6);
}
@import url("https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap");

.solution-wrapper {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.top-controls-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.quick-solver-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
}

.bar-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--muted);
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.bar-inputs {
  display: flex;
  gap: 6px;
  width: 160px;
}

.bar-inputs input {
  flex: 1;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 5px 2px;
  border-radius: 8px;
  font-size: 11px;
  text-align: center;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.bar-inputs input::-webkit-outer-spin-button,
.bar-inputs input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.bar-inputs input[type="number"] {
  -moz-appearance: textfield;
}

.bar-inputs input:focus {
  border-color: var(--accent);
  background: rgba(0, 0, 0, 0.6);
}

.btn-calc {
  background: var(--accent);
  border: none;
  color: #fff;
  padding: 5px 12px;
  border-radius: 15px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-calc:hover {
  background: #2563eb;
}

.btn-target {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  font-size: 11px;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-target:hover {
  background: rgba(255, 255, 255, 0.12);
}

.btn-toggle-solution {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  font-weight: 600;
  font-size: 12px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-toggle-solution:hover,
.btn-toggle-solution.active {
  background: rgba(59, 130, 246, 0.25);
  border-color: var(--accent);
  transform: translateY(-1px);
}

.solution-panel-floating {
  width: 360px;
  height: calc(100vh - 100px);
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.solution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: rgba(30, 41, 59, 0.45);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 16px;
}

.h-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-light);
  font-family: "Architects Daughter", cursive, sans-serif;
}

.h-sub {
  font-size: 9px;
  color: var(--muted);
  margin-top: 1px;
}

.btn-close-sol {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.btn-close-sol:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.solution-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  font-family: "Architects Daughter", "Caveat", cursive, sans-serif;
  font-size: 13.5px;
  line-height: 1.6;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(12px);
  color: #f8fafc;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.15);
}

.solution-area::-webkit-scrollbar {
  width: 5px;
}

.solution-area::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.15);
}

.solution-area::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
}

.solution-area :deep(span),
.solution-area :deep(div),
.solution-area :deep(p),
.solution-area :deep(strong) {
  font-family: "Architects Daughter", cursive, sans-serif;
}

.solution-area :deep(.sol-block) {
  margin-bottom: 18px;
  padding-bottom: 18px;
  border-bottom: 1.5px dashed rgba(255, 255, 255, 0.08);
}

.solution-area :deep(.sol-block:last-child) {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.solution-area :deep(.sol-block-title) {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  color: #fff;
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 4px;
}

.solution-area :deep(.sol-block-title.accent) {
  color: #38bdf8;
  text-shadow: 0 0 6px rgba(56, 189, 248, 0.45);
}

.solution-area :deep(.data-grid) {
  margin-bottom: 8px;
  padding-left: 6px;
}

.solution-area :deep(.data-row) {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.solution-area :deep(.dl) {
  color: var(--muted);
  min-width: 90px;
}

.solution-area :deep(.dv) {
  color: #fff;
  font-weight: 600;
}

.solution-area :deep(.formula-box) {
  background: rgba(56, 189, 248, 0.03);
  border: 1.5px dashed rgba(56, 189, 248, 0.25);
  border-radius: 8px;
  padding: 8px 10px;
  margin: 6px 0;
  color: #38bdf8;
  text-shadow: 0 0 6px rgba(56, 189, 248, 0.4);
}

.solution-area :deep(.fb-label) {
  font-size: 10px;
  color: var(--muted);
  margin-bottom: 2px;
}

.solution-area :deep(.fb-eq) {
  color: #38bdf8;
  margin-bottom: 2px;
}

.solution-area :deep(.fb-result) {
  color: #fff;
  font-weight: 700;
  margin-top: 4px;
  border-top: 1px dashed rgba(255, 255, 255, 0.15);
  padding-top: 4px;
}

.solution-area :deep(.fb-sub) {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

.solution-area :deep(.step) {
  display: flex;
  gap: 6px;
  align-items: baseline;
  margin-bottom: 2px;
  margin-top: 8px;
}

.solution-area :deep(.step-n) {
  color: #c084fc;
  font-weight: 700;
  font-size: 14px;
  text-shadow: 0 0 6px rgba(192, 132, 252, 0.4);
}

.solution-area :deep(.step-txt) {
  color: var(--muted);
  font-size: 11px;
}

.solution-area :deep(.mag-line) {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
  padding-left: 6px;
}

.solution-area :deep(.mag-line strong) {
  color: #fff;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.solution-area :deep(.result-card) {
  border-radius: 8px;
  padding: 10px 12px;
  border: 2px dashed;
  margin-top: 10px;
}

.solution-area :deep(.accent-card) {
  background: rgba(74, 222, 128, 0.03);
  border-color: rgba(74, 222, 128, 0.35);
  color: #4ade80;
  text-shadow: 0 0 8px rgba(74, 222, 128, 0.45);
}

.solution-area :deep(.yellow-card) {
  background: rgba(251, 191, 36, 0.03);
  border-color: rgba(251, 191, 36, 0.35);
  color: #fbbf24;
  text-shadow: 0 0 8px rgba(251, 191, 36, 0.45);
}

.solution-area :deep(.rc-label) {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 4px;
  border-bottom: 1.5px dashed rgba(255, 255, 255, 0.1);
  padding-bottom: 2px;
}

.solution-area :deep(.rc-value) {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.solution-area :deep(.rc-sub) {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

.solution-area :deep(.msg-warn) {
  color: #fde68a;
  padding: 8px;
  text-align: center;
  font-size: 12px;
}
</style>
