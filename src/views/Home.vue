<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ navigate: [module: string] }>()

const exerciseText = ref('')
const detected = ref<{ module: string; reason: string; keywords: string[] } | null>(null)
const analyzing = ref(false)

type ModuleId = 'campo-electrico' | 'lorentz' | 'biot-savart' | 'ondas' | 'potencial'

interface ModuleCard {
  id: ModuleId
  icon: string
  title: string
  subtitle: string
  topics: string[]
  ready: boolean
  color: string
}

const modules: ModuleCard[] = [
  {
    id: 'campo-electrico', icon: '⚡', title: 'Campo Eléctrico',
    subtitle: 'Ley de Coulomb · Superposición',
    topics: ['Cargas puntuales', 'Múltiples cargas', 'Potencial eléctrico'],
    ready: true, color: '#3b82f6',
  },
  {
    id: 'lorentz', icon: '🌀', title: 'Fuerza de Lorentz',
    subtitle: 'F = q(v × B) · Trayectoria en B',
    topics: ['Movimiento circular', 'Hélice en campo B', 'Radio y período ciclotrónico'],
    ready: true, color: '#a855f7',
  },
  {
    id: 'biot-savart', icon: '🧲', title: 'Ley de Biot-Savart',
    subtitle: 'Campo magnético de conductores',
    topics: ['Varilla rectilínea', 'Espira circular', 'Solenoide'],
    ready: true, color: '#06b6d4',
  },
  {
    id: 'ondas', icon: '〰', title: 'Ondas Mecánicas',
    subtitle: 'Ondas en cuerdas · Armónicos',
    topics: ['Onda armónica', 'Onda estacionaria', 'Modos normales'],
    ready: false, color: '#22c55e',
  },
  {
    id: 'potencial', icon: '🔋', title: 'Potencial Eléctrico',
    subtitle: 'Superficies equipotenciales',
    topics: ['V por cargas puntuales', 'Trabajo del campo', 'Gradiente → E'],
    ready: false, color: '#f59e0b',
  },
]

// ── Exercise interpreter ──────────────────────────────────────────────────────

const PATTERNS: { module: ModuleId; keywords: string[]; reason: string }[] = [
  {
    module: 'lorentz',
    keywords: ['lorentz', 'campo magnético', 'campo b', 'fuerza magnética', 'v × b', 'v x b',
               'partícula cargada', 'trayectoria', 'helicoidal', 'circular.*campo',
               'radio ciclotrónico', 'período ciclotrónico', 'velocidad.*campo.*magnético'],
    reason: 'El ejercicio menciona partícula cargada en campo magnético B',
  },
  {
    module: 'biot-savart',
    keywords: ['biot-savart', 'biot savart', 'conductor.*corriente', 'espira.*corriente',
               'solenoide', 'campo.*corriente', 'ampere', 'ampère'],
    reason: 'El ejercicio involucra campo magnético generado por corrientes',
  },
  {
    module: 'ondas',
    keywords: ['onda.*cuerda', 'longitud de onda', 'frecuencia.*onda', 'amplitud.*onda',
               'armónico', 'modo normal', 'estacion', 'propagación.*onda'],
    reason: 'El ejercicio trata sobre ondas mecánicas en cuerdas',
  },
  {
    module: 'campo-electrico',
    keywords: ['campo eléctrico', 'carga puntual', 'coulomb', 'intensidad.*campo',
               'fuerza eléctrica', 'superposición.*carg', 'distribución.*carg'],
    reason: 'El ejercicio calcula campo eléctrico por cargas',
  },
  {
    module: 'potencial',
    keywords: ['potencial eléctrico', 'diferencia de potencial', 'voltaje', 'equipotencial',
               'trabajo.*campo eléctrico', 'energía potencial eléctrica'],
    reason: 'El ejercicio involucra potencial eléctrico',
  },
]

function analyze() {
  const text = exerciseText.value.toLowerCase()
  if (!text.trim()) return

  analyzing.value = true
  setTimeout(() => {
    for (const p of PATTERNS) {
      const matched = p.keywords.filter(kw => new RegExp(kw, 'i').test(text))
      if (matched.length > 0) {
        detected.value = { module: p.module, reason: p.reason, keywords: matched.slice(0, 3) }
        analyzing.value = false
        return
      }
    }
    detected.value = { module: 'campo-electrico', reason: 'No se detectó un módulo específico — usando Campo Eléctrico por defecto', keywords: [] }
    analyzing.value = false
  }, 600)
}

function goToDetected() {
  if (detected.value) emit('navigate', detected.value.module)
}
</script>

<template>
  <div class="home">
    <!-- Header -->
    <header class="home-header">
      <div class="header-inner">
        <div class="brand">
          <span class="brand-icon">⚡</span>
          <div>
            <h1 class="brand-name">FísicaViz 3D</h1>
            <p class="brand-sub">Visualizador interactivo de física · Powered by Three.js</p>
          </div>
        </div>
      </div>
    </header>

    <main class="home-main">

      <!-- Exercise interpreter -->
      <section class="interpreter-card">
        <div class="interp-title">
          🔍 Intérprete de ejercicios
          <span class="interp-hint">Pega tu ejercicio y detectamos el módulo correcto automáticamente</span>
        </div>
        <textarea
          v-model="exerciseText"
          placeholder="Ej: Una partícula de carga q = +2 μC se mueve con velocidad v = 3×10⁶ m/s en dirección +x dentro de un campo magnético uniforme B = 0.5 T en dirección +z. Calcule la fuerza de Lorentz y describa la trayectoria..."
          class="exercise-input"
          rows="4"
        ></textarea>
        <div class="interp-actions">
          <button class="btn-analyze" @click="analyze" :disabled="!exerciseText.trim()">
            {{ analyzing ? 'Analizando...' : 'Analizar ejercicio →' }}
          </button>
        </div>

        <!-- Detection result -->
        <div class="detection-result" v-if="detected">
          <div class="det-module">
            <span class="det-icon">
              {{ modules.find(m => m.id === detected!.module)?.icon }}
            </span>
            <div>
              <div class="det-title">
                Módulo detectado: <strong>{{ modules.find(m => m.id === detected!.module)?.title }}</strong>
              </div>
              <div class="det-reason">{{ detected!.reason }}</div>
              <div class="det-keywords" v-if="detected!.keywords.length">
                Palabras clave: <span v-for="kw in detected!.keywords" :key="kw" class="kw-chip">{{ kw }}</span>
              </div>
            </div>
          </div>
          <button class="btn-go" @click="goToDetected">
            Ir al módulo →
          </button>
        </div>
      </section>

      <!-- Divider -->
      <div class="divider-row">
        <div class="div-line"></div>
        <span class="div-text">o selecciona un módulo</span>
        <div class="div-line"></div>
      </div>

      <!-- Module grid -->
      <div class="modules-grid">
        <div
          v-for="m in modules"
          :key="m.id"
          class="module-card"
          :class="{ ready: m.ready, disabled: !m.ready }"
          :style="m.ready ? `--accent-c: ${m.color}` : ''"
          @click="m.ready && emit('navigate', m.id)"
        >
          <div class="mc-head">
            <span class="mc-icon">{{ m.icon }}</span>
            <span class="mc-badge" :class="m.ready ? 'ready' : 'soon'">
              {{ m.ready ? '✓ Disponible' : '🔜 Próximamente' }}
            </span>
          </div>
          <div class="mc-title">{{ m.title }}</div>
          <div class="mc-sub">{{ m.subtitle }}</div>
          <ul class="mc-topics">
            <li v-for="t in m.topics" :key="t">{{ t }}</li>
          </ul>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* Header */
.home-header {
  border-bottom: 1px solid var(--border);
  background: var(--panel-2);
  padding: 18px 0;
}
.header-inner {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 24px;
}
.brand { display: flex; align-items: center; gap: 14px; }
.brand-icon { font-size: 32px; }
.brand-name {
  font-size: 24px; font-weight: 800; color: var(--accent-light);
  letter-spacing: -0.5px; margin: 0;
}
.brand-sub { font-size: 12px; color: var(--muted); margin: 2px 0 0; }

/* Main */
.home-main {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px 48px;
  width: 100%;
}

/* Interpreter */
.interpreter-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 32px;
}
.interp-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.interp-hint {
  font-size: 11px;
  color: var(--muted);
  font-weight: 400;
}
.exercise-input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color .15s;
}
.exercise-input:focus { border-color: var(--accent); }
.exercise-input::placeholder { color: var(--muted); }
.interp-actions { margin-top: 10px; display: flex; justify-content: flex-end; }
.btn-analyze {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 9px 20px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.btn-analyze:hover:not(:disabled) { background: #2563eb; }
.btn-analyze:disabled { opacity: .5; cursor: not-allowed; }

/* Detection result */
.detection-result {
  margin-top: 14px;
  background: rgba(59,130,246,.08);
  border: 1px solid rgba(59,130,246,.3);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.det-module { display: flex; align-items: flex-start; gap: 12px; flex: 1; }
.det-icon { font-size: 28px; }
.det-title { font-size: 13px; color: var(--text); margin-bottom: 3px; }
.det-title strong { color: var(--accent-light); }
.det-reason { font-size: 11px; color: var(--muted); }
.det-keywords { font-size: 11px; color: var(--muted); margin-top: 5px; }
.kw-chip {
  background: rgba(59,130,246,.2);
  color: var(--accent-light);
  border-radius: 4px;
  padding: 1px 6px;
  margin-left: 4px;
  font-size: 10px;
}
.btn-go {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background .15s;
}
.btn-go:hover { background: #2563eb; }

/* Divider */
.divider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}
.div-line { flex: 1; height: 1px; background: var(--border); }
.div-text { color: var(--muted); font-size: 12px; white-space: nowrap; }

/* Module grid */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}
.module-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  transition: all .2s;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.module-card.ready {
  cursor: pointer;
  border-color: color-mix(in srgb, var(--accent-c) 30%, var(--border));
}
.module-card.ready:hover {
  background: color-mix(in srgb, var(--accent-c) 8%, var(--panel));
  border-color: var(--accent-c);
  transform: translateY(-2px);
}
.module-card.disabled { opacity: .5; }
.mc-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.mc-icon { font-size: 26px; }
.mc-badge { font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
.mc-badge.ready   { background: rgba(34,197,94,.15); color: #86efac; }
.mc-badge.soon    { background: rgba(255,255,255,.06); color: var(--muted); }
.mc-title { font-size: 14px; font-weight: 700; color: var(--text); }
.mc-sub   { font-size: 11px; color: var(--muted); }
.mc-topics { list-style: none; padding: 0; margin-top: 4px; display: flex; flex-direction: column; gap: 3px; }
.mc-topics li { font-size: 11px; color: var(--muted); }
.mc-topics li::before { content: '·  '; }
</style>
