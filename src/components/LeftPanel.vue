<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useStore } from "../composables/useStore";

const { state, addCharge, removeCharge, loadPreset, setProblem } = useStore();

const newQ = ref(2);
const newXCm = ref(50);
const newYCm = ref(0);
const newZCm = ref(0);

const isCollapsed = ref(false);
const activeTab = ref<'charges' | 'viz' | 'ai' | 'examples'>('charges');

function handleAdd() {
  if (isNaN(newQ.value)) return;
  addCharge(
    newQ.value,
    (newXCm.value || 0) / 100,
    (newYCm.value || 0) / 100,
    (newZCm.value || 0) / 100,
  );
}

function handleKey(e: KeyboardEvent) {
  if (e.key === "Enter") handleAdd();
}

const resLabel = (n: number) => `${n}×${n}`;

const problemText = ref("");
const apiKey = ref(localStorage.getItem("gemini_api_key") || "");
const loading = ref(false);
const aiError = ref("");
const showApiKeyInput = ref(true);

onMounted(async () => {
  try {
    const response = await fetch("/api/config");
    if (response.ok) {
      const data = await response.json();
      if (data.hasGeminiKey) {
        showApiKeyInput.value = false;
      }
    }
  } catch (err) {
    console.warn("No se pudo verificar la configuración de Gemini en el backend:", err);
  }
});

const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || "";
if (envKey) {
  apiKey.value = envKey;
  showApiKeyInput.value = false;
}

async function solveWithAI() {
  if (!problemText.value.trim()) return;

  loading.value = true;
  aiError.value = "";

  if (apiKey.value && apiKey.value !== envKey) {
    localStorage.setItem("gemini_api_key", apiKey.value);
  }

  try {
    const response = await fetch("/api/extract-problem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemText: problemText.value,
        apiKey: apiKey.value || null
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Error al procesar con la IA");
    }

    const data = await response.json();
    if (!data.charges || !Array.isArray(data.charges)) {
      throw new Error("El formato devuelto por el backend no contiene la lista de cargas.");
    }

    setProblem(data.charges, data.solvePoint);
    problemText.value = "";
  } catch (err: any) {
    console.error(err);
    aiError.value = "Error al procesar el problema: " + (err.message || err.toString());
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <button 
      v-if="isCollapsed" 
      class="legend-btn-collapsed" 
      title="Desplegar Leyenda de Controles"
      @click="isCollapsed = false"
    >
      <span class="l-icon">⚡</span>
      <span class="l-text">Controles</span>
    </button>

    <aside v-else class="legend-panel-floating">
      <div class="legend-header">
        <div class="legend-logo">
          <span class="logo-icon">⚡</span>
          <div>
            <div class="logo-title">FísicaViz 3D</div>
            <div class="logo-sub">Simulador de Campo</div>
          </div>
        </div>
        <button class="btn-collapse" title="Minimizar panel" @click="isCollapsed = true">−</button>
      </div>

      <nav class="tab-selector">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'charges' }" 
          title="Agregar y Mostrar Cargas"
          @click="activeTab = 'charges'"
        >🔋 Cargas</button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'viz' }" 
          title="Ajustes de Vectores y Vista"
          @click="activeTab = 'viz'"
        >👁️ Vista</button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'ai' }" 
          title="Extraer enunciado con IA"
          @click="activeTab = 'ai'"
        >🤖 IA</button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'examples' }" 
          title="Ejemplos predefinidos"
          @click="activeTab = 'examples'"
        >📚 Ejemplos</button>
      </nav>

      <div class="tab-content">
        <div v-if="activeTab === 'charges'" class="tab-pane">
          <div class="pane-section">
            <div class="section-title">Cargas del sistema</div>
            
            <div class="charge-list">
              <div v-if="state.charges.length === 0" class="empty-msg">
                Sin cargas en la escena.
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
                  <span class="charge-pos">({{ (c.x * 100).toFixed(1) }}, {{ (c.y * 100).toFixed(1) }}) cm</span>
                </div>
                <button class="btn-focus" title="Enfocar carga en escena 3D" @click="state.focusTarget = { x: c.x, y: c.y, z: 0, type: 'charge' }">🎯</button>
                <button class="btn-remove" @click="removeCharge(c.id)">×</button>
              </div>
            </div>
          </div>

          <div class="pane-section border-top">
            <div class="section-title">Agregar nueva carga</div>
            <div class="add-form">
              <div class="form-row full">
                <label>Magnitud Q (nC)</label>
                <input
                  v-model.number="newQ"
                  type="number"
                  step="0.5"
                  placeholder="Ej: 2 o -3"
                  @keyup="handleKey"
                />
              </div>
              <div class="form-row cols2">
                <div class="form-group">
                  <label>x (cm)</label>
                  <input v-model.number="newXCm" type="number" step="1" @keyup="handleKey" />
                </div>
                <div class="form-group">
                  <label>y (cm)</label>
                  <input v-model.number="newYCm" type="number" step="1" @keyup="handleKey" />
                </div>
              </div>
              <button class="btn primary btn-sm" @click="handleAdd">+ Agregar Carga</button>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'viz'" class="tab-pane">
          <div class="pane-section">
            <div class="section-title">Simulación 2D</div>
            <div class="plane-group-static">
              <span class="active-plane-badge">Plano activo: XY</span>
            </div>
          </div>

          <div class="pane-section border-top">
            <div class="section-title">Parámetros de vectores</div>
            <div class="field-row">
              <div class="field-label">Resolución de malla</div>
              <span class="badge">{{ resLabel(state.resolution) }}</span>
            </div>
            <input
              v-model.number="state.resolution"
              type="range" min="3" max="11" step="2"
              class="slider"
            />
          </div>

          <div class="pane-section border-top">
            <div class="section-title">Capas de campo</div>
            
            <div class="toggle-row">
              <span class="toggle-label">Vectores de Campo (Ē)</span>
              <label class="toggle">
                <input v-model="state.showVectors" type="checkbox" />
                <span class="track"></span>
              </label>
            </div>

            <div class="toggle-row">
              <span class="toggle-label">Potencial V (Calor 2D)</span>
              <label class="toggle">
                <input v-model="state.showPotential" type="checkbox" />
                <span class="track"></span>
              </label>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'ai'" class="tab-pane">
          <div class="pane-section">
            <div class="section-title">🤖 Extractor con IA (Gemini)</div>
            <div class="ai-form">
              <textarea
                v-model="problemText"
                placeholder="Escribe el problema de física. Ej: Dos cargas positivas de 3nC en (0, 10) cm y (0, -10) cm..."
                rows="4"
                class="problem-textarea"
              ></textarea>
              
              <div class="api-key-row" v-if="showApiKeyInput">
                <label>Gemini API Key</label>
                <input
                  v-model="apiKey"
                  type="password"
                  placeholder="Introduce tu API Key"
                  class="api-input"
                />
              </div>
              
              <button
                class="btn primary ai-btn"
                :disabled="loading || !problemText.trim()"
                @click="solveWithAI"
              >
                <span v-if="loading">⏳ Procesando...</span>
                <span v-else>🔍 Analizar y Cargar</span>
              </button>
              
              <div v-if="aiError" class="ai-error-msg">
                {{ aiError }}
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'examples'" class="tab-pane">
          <div class="pane-section">
            <div class="section-title">Ejercicios Teóricos Comunes</div>
            <div class="presets-list">
              <button class="btn secondary btn-preset" @click="loadPreset('dipole')">
                <span class="p-icon">🔋</span>
                <div class="p-desc">
                  <span class="p-title">Dipolo Eléctrico</span>
                  <span class="p-sub">Cargas opuestas en el eje X</span>
                </div>
              </button>
              
              <button class="btn secondary btn-preset" @click="loadPreset('triangle')">
                <span class="p-icon">🔺</span>
                <div class="p-desc">
                  <span class="p-title">Triángulo de Cargas</span>
                  <span class="p-sub">Distribución simétrica en 2D</span>
                </div>
              </button>
              
              <button class="btn secondary btn-preset" @click="loadPreset('square')">
                <span class="p-icon">🔲</span>
                <div class="p-desc">
                  <span class="p-title">Cuadrado de Cargas</span>
                  <span class="p-sub">Configuración cuadrupolar</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.legend-btn-collapsed {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
  font-size: 13px;
}

.legend-btn-collapsed:hover {
  background: rgba(59, 130, 246, 0.25);
  border-color: var(--accent);
  transform: translateY(-2px);
}

.legend-btn-collapsed .l-icon {
  font-size: 16px;
  color: var(--accent-light);
}

.legend-panel-floating {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 310px;
  max-height: 80vh;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  animation: floatIn 0.4s ease-out;
}

@keyframes floatIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.legend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: rgba(30, 41, 59, 0.45);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.legend-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 18px;
}

.logo-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-light);
}

.logo-sub {
  font-size: 9px;
  color: var(--muted);
  margin-top: 1px;
}

.btn-collapse {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 16px;
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

.btn-collapse:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.tab-selector {
  display: flex;
  background: rgba(15, 23, 42, 0.3);
  padding: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  gap: 2px;
}

.tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  padding: 6px 2px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.03);
}

.tab-btn.active {
  color: #fff;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}

.tab-content::-webkit-scrollbar {
  width: 4px;
}

.tab-content::-webkit-scrollbar-track {
  background: transparent;
}

.tab-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
}

.tab-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.pane-section {
  padding-bottom: 8px;
}

.pane-section.border-top {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 10px;
  margin-top: 8px;
}

.section-title {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--muted);
  margin-bottom: 8px;
}

.charge-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 140px;
  overflow-y: auto;
}

.empty-msg {
  color: var(--muted);
  font-style: italic;
  font-size: 11px;
  text-align: center;
  padding: 8px 0;
}

.charge-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.charge-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.charge-dot.pos {
  background: rgba(239, 68, 68, 0.1);
  color: var(--positive);
  border: 1.5px solid var(--positive);
}

.charge-dot.neg {
  background: rgba(96, 165, 250, 0.1);
  color: var(--negative);
  border: 1.5px solid var(--negative);
}

.charge-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.charge-q {
  font-size: 11px;
  font-weight: 600;
}

.charge-pos {
  font-size: 9px;
  color: var(--muted);
}

.text-pos { color: var(--positive); }
.text-neg { color: var(--negative); }

.btn-focus {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 10px;
  border-radius: 4px;
  transition: background 0.15s;
}

.btn-focus:hover {
  background: rgba(255, 255, 255, 0.08);
}

.btn-remove {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.15s;
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row {
  display: flex;
  gap: 4px;
}

.form-row.full {
  flex-direction: column;
  gap: 2px;
}

.form-row.cols3 {
  display: flex;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

label {
  font-size: 8.5px;
  color: var(--muted);
  font-weight: 500;
}

input {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 4px 6px;
  border-radius: 5px;
  font-size: 11px;
  width: 100%;
  outline: none;
  transition: all 0.15s;
}

input:focus {
  border-color: var(--accent);
  background: rgba(15, 23, 42, 0.7);
}

.btn {
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn.primary {
  background: var(--accent);
  color: #fff;
}

.btn.primary:hover {
  background: #2563eb;
}

.btn-sm {
  padding: 6px 10px;
}

.btn.secondary {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
}

.btn.secondary:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.plane-group {
  display: flex;
  gap: 4px;
}

.plane-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: var(--muted);
  padding: 6px 0;
  font-size: 10px;
  font-weight: 700;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s;
}

.plane-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.plane-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.field-label {
  font-size: 11px;
  color: var(--muted);
}

.badge {
  font-size: 9px;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: var(--accent-light);
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 600;
}

.slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  accent-color: var(--accent);
  cursor: pointer;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.toggle-label {
  font-size: 11px;
  color: var(--muted);
}

.toggle {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle .track {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(255, 255, 255, 0.1);
  transition: .2s;
  border-radius: 34px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.toggle .track:before {
  position: absolute;
  content: "";
  height: 12px;
  width: 12px;
  left: 2px;
  bottom: 2px;
  background-color: #94a3b8;
  transition: .2s;
  border-radius: 50%;
}

.toggle input:checked + .track {
  background-color: var(--accent);
}

.toggle input:checked + .track:before {
  transform: translateX(14px);
  background-color: #fff;
}

.ai-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.problem-textarea {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  width: 100%;
  outline: none;
  transition: all 0.15s;
  resize: none;
}

.problem-textarea:focus {
  border-color: var(--accent);
  background: rgba(15, 23, 42, 0.7);
}

.api-key-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.api-input {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ai-btn {
  padding: 8px;
  background: #7c3aed;
  color: #fff;
  width: 100%;
}

.ai-btn:hover {
  background: #6d28d9;
}

.ai-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-error-msg {
  color: #f87171;
  font-size: 10px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.15);
  padding: 6px 8px;
  border-radius: 6px;
  line-height: 1.3;
}

.presets-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.btn-preset {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 8px 10px;
  justify-content: flex-start;
  width: 100%;
  border-radius: 8px;
}

.p-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.p-desc {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.p-title {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.p-sub {
  font-size: 9px;
  color: var(--muted);
}

.plane-group-static {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.08);
  border: 1px dashed rgba(59, 130, 246, 0.25);
  border-radius: 8px;
  padding: 6px 10px;
  margin-top: 4px;
}

.active-plane-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-light);
  letter-spacing: 0.5px;
}
</style>
