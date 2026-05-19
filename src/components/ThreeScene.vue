<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useStore } from '../composables/useStore'
import { totalEField, totalEPotential, traceFieldLine, magVec } from '../composables/usePhysics'
import type { Plane } from '../composables/useStore'
import { createStarfield, createLabeledAxes, createGlowingCharge, createLabel } from '../composables/useThreeUtils'

const { state } = useStore()
const canvasWrap = ref<HTMLDivElement>()

let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let animId: number
let raycaster: THREE.Raycaster
let clickPlane: THREE.Plane

const chargesGroup = new THREE.Group()
const vectorsGroup = new THREE.Group()
const particlesGroup = new THREE.Group()
const potentialGroup = new THREE.Group()
const pointPGroup = new THREE.Group()

let flowTime = 0
const flowParticles: { mesh: THREE.Mesh; line: THREE.Vector3[]; offset: number }[] = []

// ── helpers ──────────────────────────────────────────────────────────────────

function clearGroup(group: THREE.Group) {
  const items = [...group.children]
  for (const obj of items) {
    group.remove(obj)
    obj.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (child.material.map) child.material.map.dispose()
        if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose())
        else child.material.dispose()
      }
    })
  }
}

function magToColor(E_mag: number, E_max: number): THREE.Color {
  const t = E_max > 0 ? Math.log10(E_mag + 1) / Math.log10(E_max + 1) : 0
  const tc = Math.max(0, Math.min(1, t))
  const r = tc < 0.5 ? 0 : (tc - 0.5) * 2
  const g = tc < 0.5 ? tc * 2 : 1 - (tc - 0.5) * 2
  const b = tc < 0.5 ? 1 - tc * 2 : 0
  return new THREE.Color(r, g, b)
}

function getWorldPos(a: number, b: number, plane: Plane): THREE.Vector3 {
  if (plane === 'xy') return new THREE.Vector3(a, b, 0)
  if (plane === 'xz') return new THREE.Vector3(a, 0, b)
  return new THREE.Vector3(0, a, b)
}

// ── scene update functions ────────────────────────────────────────────────────

function updateCharges() {
  clearGroup(chargesGroup)

  for (const c of state.charges) {
    const isPos = c.q_nC >= 0
    const radius = Math.min(0.08, 0.03 + Math.abs(c.q_nC) * 0.01)
    
    const glowingCharge = createGlowingCharge(isPos, radius)
    glowingCharge.position.set(c.x, c.y, c.z)
    chargesGroup.add(glowingCharge)
  }
}

function updateFieldLines() {
  clearGroup(vectorsGroup)
  clearGroup(particlesGroup)
  flowParticles.length = 0
  
  if (!state.showVectors || state.charges.length === 0) return

  const lineMat = new THREE.LineBasicMaterial({ 
    color: 0xffffff, 
    transparent: true, 
    opacity: 0.18,
    blending: THREE.AdditiveBlending 
  })

  // Physical accuracy: lines proportional to |q|
  for (const c of state.charges) {
    const isPos = c.q_nC > 0
    const absQ = Math.abs(c.q_nC)
    const nLines = Math.min(64, Math.max(8, Math.round(absQ * 8)))
    
    for (let i = 0; i < nLines; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / nLines)
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5)
      
      const startOffset = 0.1
      const startPos = {
        x: c.x + startOffset * Math.sin(phi) * Math.cos(theta),
        y: c.y + startOffset * Math.sin(phi) * Math.sin(theta),
        z: c.z + startOffset * Math.cos(phi)
      }

      const points = traceFieldLine(state.charges, startPos, 300, 0.04)
      if (points.length < 2) continue

      const threePoints = points.map(p => new THREE.Vector3(p.x, p.y, p.z))
      const geometry = new THREE.BufferGeometry().setFromPoints(threePoints)
      const line = new THREE.Line(geometry, lineMat)
      vectorsGroup.add(line)

      if (i % 2 === 0) {
        const pGeo = new THREE.SphereGeometry(0.008, 6, 6)
        const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
        const pMesh = new THREE.Mesh(pGeo, pMat)
        particlesGroup.add(pMesh)
        const particlePoints = isPos ? threePoints : [...threePoints].reverse()
        flowParticles.push({ mesh: pMesh, line: particlePoints, offset: Math.random() })
      }
    }
  }
}

function updatePotential() {
  clearGroup(potentialGroup)
  if (!state.showPotential || state.charges.length === 0) return

  const N = 80
  const extent = 2.4
  const canvas = document.createElement('canvas')
  canvas.width = N
  canvas.height = N
  const ctx = canvas.getContext('2d')!

  const imgData = ctx.createImageData(N, N)
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = -extent + (i / (N - 1)) * 2 * extent
      const b = -extent + (j / (N - 1)) * 2 * extent
      const rp = getWorldPos(a, b, state.plane)
      const V = totalEPotential(state.charges, { x: rp.x, y: rp.y, z: rp.z })

      const idx = (j * N + i) * 4
      const t = Math.max(-1, Math.min(1, V / 50))
      if (t > 0) {
        imgData.data[idx] = 239; imgData.data[idx + 1] = 68; imgData.data[idx + 2] = 68
      } else {
        imgData.data[idx] = 59; imgData.data[idx + 1] = 130; imgData.data[idx + 2] = 246
      }
      imgData.data[idx + 3] = Math.abs(t) * 180
    }
  }
  ctx.putImageData(imgData, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
  const geo = new THREE.PlaneGeometry(extent * 2, extent * 2)
  const mesh = new THREE.Mesh(geo, mat)

  if (state.plane === 'xz') mesh.rotation.x = -Math.PI / 2
  else if (state.plane === 'yz') mesh.rotation.y = Math.PI / 2

  potentialGroup.add(mesh)
}

function updatePointP() {
  clearGroup(pointPGroup)
  const pt = state.solvePoint
  if (!pt) return

  // Ultra-minimal P marker (tiny dot)
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.01, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  )
  sphere.position.set(pt.x, pt.y, pt.z)
  pointPGroup.add(sphere)

  // Microscopic label 'P'
  const label = createLabel('P', new THREE.Vector3(pt.x, pt.y + 0.04, pt.z), '#86efac')
  label.scale.set(0.03, 0.03, 1)
  pointPGroup.add(label)

  // Almost invisible projection lines
  const lineMat = new THREE.LineBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.06 })
  const mkLine = (a: THREE.Vector3, b: THREE.Vector3) =>
    new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), lineMat)

  pointPGroup.add(mkLine(new THREE.Vector3(-3, pt.y, pt.z), new THREE.Vector3(3, pt.y, pt.z)))
  pointPGroup.add(mkLine(new THREE.Vector3(pt.x, -3, pt.z), new THREE.Vector3(pt.x, 3, pt.z)))
  pointPGroup.add(mkLine(new THREE.Vector3(pt.x, pt.y, -3), new THREE.Vector3(pt.x, pt.y, 3)))

  // Ultra-short E arrow at P (minimal compass)
  const E3 = totalEField(state.charges, pt)
  const E = new THREE.Vector3(E3.x, E3.y, E3.z)
  const mag = E.length()
  if (mag > 1e-3) {
    // Ultra-short arrow
    const len = Math.min(0.12, Math.log10(mag + 1) * 0.04)
    const arrow = new THREE.ArrowHelper(
      E.clone().normalize(),
      new THREE.Vector3(pt.x, pt.y, pt.z),
      len, 
      0x22c55e, 
      len * 0.4, // Relative head size
      len * 0.3
    )
    pointPGroup.add(arrow)
  }
}

// ── Three.js setup ────────────────────────────────────────────────────────────

function initScene() {
  const wrap = canvasWrap.value!
  const W = wrap.clientWidth, H = wrap.clientHeight

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(W, H)
  renderer.setClearColor(0x020617)
  wrap.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(50, W / H, 0.01, 200)
  camera.position.set(3, 2.5, 4)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.07

  raycaster = new THREE.Raycaster()

  // Space environment
  scene.add(createStarfield(3000, 100))

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dir = new THREE.DirectionalLight(0xffffff, 1.0)
  dir.position.set(5, 8, 5)
  scene.add(dir)

  // Labeled Axes
  scene.add(createLabeledAxes(3, 0.5))

  // Groups
  scene.add(chargesGroup, vectorsGroup, particlesGroup, potentialGroup, pointPGroup)

  // Double-click → set solve point
  renderer.domElement.addEventListener('dblclick', onDblClick)

  window.addEventListener('resize', onResize)
  animate()
}

function onDblClick(e: MouseEvent) {
  if (state.charges.length === 0) return
  const rect = renderer.domElement.getBoundingClientRect()
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
  const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)

  const normal =
    state.plane === 'xy' ? new THREE.Vector3(0, 0, 1)
    : state.plane === 'xz' ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0)

  clickPlane = new THREE.Plane(normal, 0)
  const hit = new THREE.Vector3()
  raycaster.ray.intersectPlane(clickPlane, hit)
  if (hit) {
    const round = (n: number) => Math.round(n * 100) / 100
    state.solvePoint = { x: round(hit.x), y: round(hit.y), z: round(hit.z) }
  }
}

function onResize() {
  const wrap = canvasWrap.value!
  const W = wrap.clientWidth, H = wrap.clientHeight
  camera.aspect = W / H
  camera.updateProjectionMatrix()
  renderer.setSize(W, H)
}

function animate() {
  animId = requestAnimationFrame(animate)
  controls.update()

  // Flow animation
  flowTime += 0.005
  for (const p of flowParticles) {
    const t = (flowTime + p.offset) % 1
    const idx = Math.floor(t * (p.line.length - 1))
    const nextIdx = Math.min(idx + 1, p.line.length - 1)
    const frac = (t * (p.line.length - 1)) - idx
    
    const pos = p.line[idx].clone().lerp(p.line[nextIdx], frac)
    p.mesh.position.copy(pos)
    
    // Fade in/out
    if (p.mesh.material instanceof THREE.MeshBasicMaterial) {
      p.mesh.material.opacity = Math.sin(t * Math.PI) * 0.8
    }
  }

  renderer.render(scene, camera)
}

// ── watchers ──────────────────────────────────────────────────────────────────

watch(
  () => state.charges.map(c => `${c.id}:${c.q_nC}:${c.x}:${c.y}:${c.z}`).join('|'),
  () => { updateCharges(); updateFieldLines(); updatePotential(); updatePointP() }
)

watch(
  () => `${state.resolution}:${state.plane}:${state.showVectors}:${state.showPotential}`,
  () => { updateFieldLines(); updatePotential() }
)

watch(
  () => state.solvePoint,
  () => updatePointP()
)

// ── lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  initScene()
  // Default preset
  const { addCharge } = useStore()
  addCharge(+2, -0.5, 0, 0)
  addCharge(-2, +0.5, 0, 0)
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  renderer.dispose()
})
</script>

<template>
  <div ref="canvasWrap" class="scene-wrap">
    <div class="hud">
      Orbitar: arrastrar · Zoom: rueda · Seleccionar P: doble clic
    </div>
    <!-- Color legend -->
    <div class="legend" v-if="state.showVectors && state.charges.length > 0">
      <span class="legend-low">Bajo |E|</span>
      <div class="legend-bar"></div>
      <span class="legend-high">Alto |E|</span>
    </div>
    <!-- Potential legend -->
    <div class="legend pot-legend" v-if="state.showPotential && state.charges.length > 0">
      <span style="color:#60a5fa">V &lt; 0</span>
      <div class="pot-bar"></div>
      <span style="color:#ef4444">V &gt; 0</span>
    </div>
  </div>
</template>

<style scoped>
.scene-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #0a0f1e;
}

.scene-wrap :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.hud {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.55);
  color: var(--muted);
  font-size: 11px;
  padding: 5px 14px;
  border-radius: 20px;
  pointer-events: none;
  white-space: nowrap;
  border: 1px solid rgba(255,255,255,0.07);
}

.legend {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: var(--muted);
  pointer-events: none;
}

.legend-bar {
  width: 120px;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000);
}

.pot-legend {
  bottom: 72px;
}

.pot-bar {
  width: 120px;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #3b82f6, #000000, #ef4444);
}
</style>
