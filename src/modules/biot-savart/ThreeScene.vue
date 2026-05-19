<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useBiotStore } from './store'
import { wireSegs, loopSegs, solenoidSegs, bField } from './physics'
import { createStarfield, createLabeledAxes } from '../../composables/useThreeUtils'

const { state, getSceneScale } = useBiotStore()
const canvasWrap = ref<HTMLDivElement>()

let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let animId: number
let raycaster: THREE.Raycaster

const conductorGroup = new THREE.Group()
const fieldGroup     = new THREE.Group()
const particleGroup  = new THREE.Group()
const solveGroup     = new THREE.Group()

let particleT = 0
const N_PARTICLES = 10
const particleMeshes: THREE.Mesh[] = []

// ── helpers ───────────────────────────────────────────────────────────────────

function clearGroup(g: THREE.Group) {
  ;[...g.children].forEach(obj => {
    g.remove(obj)
    obj.traverse((c: any) => {
      c.geometry?.dispose()
      if (Array.isArray(c.material)) c.material.forEach((m: any) => m.dispose())
      else c.material?.dispose()
    })
  })
}

function bColor(B: THREE.Vector3, mag: number, maxMag: number): number {
  const h = (Math.atan2(B.y, B.x) / (2 * Math.PI)) + 0.5 
  const s = 0.8
  const l = Math.max(0.2, Math.min(0.8, 0.3 + 0.5 * (Math.log10(mag + 1) / Math.log10(maxMag + 1))))
  return new THREE.Color().setHSL(h, s, l).getHex()
}

// ── Build conductor ───────────────────────────────────────────────────────────

const wireMat = new THREE.MeshPhongMaterial({ color: 0xd97706, emissive: 0x7c3a00, shininess: 90 })

function buildConductor() {
  clearGroup(conductorGroup)
  const sc = getSceneScale()

  if (state.conductorType === 'wire') {
    const L_sc = state.wireLength * sc
    // Main cylinder
    const geo = new THREE.CylinderGeometry(0.042, 0.042, L_sc, 16)
    const mesh = new THREE.Mesh(geo, wireMat)
    mesh.rotation.x = Math.PI / 2
    conductorGroup.add(mesh)
    // Arrowhead cap indicating current direction (+Z)
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.22, 12),
      new THREE.MeshPhongMaterial({ color: 0xfbbf24, emissive: 0x7a5c00, shininess: 60 }),
    )
    cap.rotation.x = Math.PI / 2
    cap.position.z = L_sc / 2 + 0.11
    conductorGroup.add(cap)
  } else if (state.conductorType === 'loop') {
    const R_sc = state.loopRadius * sc
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 80; i++) {
      const phi = (i / 80) * 2 * Math.PI
      pts.push(new THREE.Vector3(R_sc * Math.cos(phi), R_sc * Math.sin(phi), 0))
    }
    const curve = new THREE.CatmullRomCurve3(pts, true)
    conductorGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.04, 8, true), wireMat))
    // Current direction arrow on the loop (at phi=0, tangent = +Y)
    conductorGroup.add(
      new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(R_sc, 0, 0),
        0.4, 0xfbbf24, 0.18, 0.12,
      )
    )
  } else {
    // Solenoid
    const R_sc  = state.solenoidRadius * sc
    const L_sc  = state.solenoidLength * sc
    const N     = state.solenoidTurns
    const steps = N * 60
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= steps; i++) {
      const t   = i / steps
      const phi = 2 * Math.PI * N * t
      pts.push(new THREE.Vector3(R_sc * Math.cos(phi), R_sc * Math.sin(phi), -L_sc / 2 + L_sc * t))
    }
    const curve = new THREE.CatmullRomCurve3(pts, false)
    conductorGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, steps, 0.025, 8, false), wireMat))
    // Transparent boundary cylinder
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(R_sc, R_sc, L_sc, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.15, side: THREE.DoubleSide }),
    )
    cyl.rotation.x = Math.PI / 2
    conductorGroup.add(cyl)
  }
}

// ── Build field vectors ───────────────────────────────────────────────────────

function buildField() {
  clearGroup(fieldGroup)
  const sc = getSceneScale()

  let segs: ReturnType<typeof wireSegs>
  if (state.conductorType === 'wire')
    segs = wireSegs(state.wireLength, 150)
  else if (state.conductorType === 'loop')
    segs = loopSegs(state.loopRadius, 200)
  else
    segs = solenoidSegs(state.solenoidRadius, state.solenoidLength, state.solenoidTurns, 40)

  const pts: { pos: THREE.Vector3; B: THREE.Vector3; mag: number }[] = []

  // Organic/Cylindrical Sampling
  const nRings = 8
  const nPerRing = 16
  const nPlanes = 8
  const maxRadius = 2.2
  const heightExtent = 2.2

  const R_sc = state.conductorType === 'solenoid'
    ? state.solenoidRadius * sc : state.loopRadius * sc

  for (let p = 0; p < nPlanes; p++) {
    const sz = -heightExtent + (p / (nPlanes - 1)) * 2 * heightExtent
    
    for (let r = 0; r < nRings; r++) {
      const radius = 0.15 + (r / (nRings - 1)) * maxRadius
      
      for (let a = 0; a < nPerRing; a++) {
        const phi = (a / nPerRing) * 2 * Math.PI
        const sx = radius * Math.cos(phi)
        const sy = radius * Math.sin(phi)

        // Skip points inside or too close to the conductor
        const distSq = sx * sx + sy * sy
        if (state.conductorType === 'wire' && distSq < 0.05) continue
        if (state.conductorType === 'loop' && Math.sqrt(distSq + sz * sz) < R_sc * 0.4) continue
        
        const B3 = bField(segs, state.I, { x: sx / sc, y: sy / sc, z: sz / sc })
        const Bv = new THREE.Vector3(B3.x, B3.y, B3.z)
        const mag = Bv.length()
        
        if (mag > 1e-25) {
          pts.push({ pos: new THREE.Vector3(sx, sy, sz), B: Bv, mag })
        }
      }
    }
  }

  if (pts.length === 0) return
  const maxMag = Math.max(...pts.map(p => p.mag))
  const arrowScale = 0.28 // Slightly smaller arrows for higher density

  for (const { pos, B, mag } of pts) {
    const dir = B.clone().normalize()
    const logScale = Math.log10(mag + 1) / Math.log10(maxMag + 1)
    const len = arrowScale * (0.4 + 0.6 * logScale)
    const col = bColor(B, mag, maxMag)
    fieldGroup.add(new THREE.ArrowHelper(dir, pos, len, col, len * 0.35, len * 0.22))
  }
}

// ── Build current particles ───────────────────────────────────────────────────

function buildParticles() {
  clearGroup(particleGroup)
  particleMeshes.length = 0
  particleT = 0

  const geo = new THREE.SphereGeometry(0.055, 8, 8)
  const mat = new THREE.MeshBasicMaterial({ color: 0xfde68a })
  for (let i = 0; i < N_PARTICLES; i++) {
    const m = new THREE.Mesh(geo, mat)
    particleGroup.add(m)
    particleMeshes.push(m)
  }
}

function particlePos(t: number): THREE.Vector3 {
  const sc = getSceneScale()
  const tt = ((t % 1) + 1) % 1

  if (state.conductorType === 'wire') {
    const L_sc = state.wireLength * sc
    return new THREE.Vector3(0, 0, -L_sc / 2 + tt * L_sc)
  } else if (state.conductorType === 'loop') {
    const R_sc = state.loopRadius * sc
    const phi = tt * 2 * Math.PI
    return new THREE.Vector3(R_sc * Math.cos(phi), R_sc * Math.sin(phi), 0)
  } else {
    const R_sc = state.solenoidRadius * sc
    const L_sc = state.solenoidLength * sc
    const phi  = tt * 2 * Math.PI * state.solenoidTurns
    return new THREE.Vector3(R_sc * Math.cos(phi), R_sc * Math.sin(phi), -L_sc / 2 + tt * L_sc)
  }
}

// ── Build solve point ─────────────────────────────────────────────────────────

function buildSolvePoint() {
  clearGroup(solveGroup)
  const pt = state.solvePoint
  if (!pt) return

  solveGroup.add(
    Object.assign(
      new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })),
      { position: new THREE.Vector3(pt.x, pt.y, pt.z) }
    )
  )
  const lMat = new THREE.LineBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.3 })
  const mkLine = (a: THREE.Vector3, b: THREE.Vector3) =>
    new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), lMat)

  solveGroup.add(mkLine(new THREE.Vector3(-3, pt.y, pt.z), new THREE.Vector3(3, pt.y, pt.z)))
  solveGroup.add(mkLine(new THREE.Vector3(pt.x, -3, pt.z), new THREE.Vector3(pt.x, 3, pt.z)))
  solveGroup.add(mkLine(new THREE.Vector3(pt.x, pt.y, -3), new THREE.Vector3(pt.x, pt.y, 3)))

  const sol = state.solution
  if (sol?.Bat_P) {
    const Bv = new THREE.Vector3(sol.Bat_P.x, sol.Bat_P.y, sol.Bat_P.z)
    const mag = Bv.length()
    if (mag > 1e-18) {
      const len = 0.65
      solveGroup.add(
        new THREE.ArrowHelper(Bv.normalize(), new THREE.Vector3(pt.x, pt.y, pt.z),
          len, 0x22c55e, len * 0.32, len * 0.22)
      )
    }
  }
}

// ── THREE.js init ─────────────────────────────────────────────────────────────

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
  camera.position.set(0, 2.5, 5)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.07

  raycaster = new THREE.Raycaster()

  // Space environment
  scene.add(createStarfield(3000, 100))

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dir = new THREE.DirectionalLight(0xffffff, 1.0)
  dir.position.set(5, 8, 5)
  scene.add(dir)

  // Labeled Axes
  scene.add(createLabeledAxes(3, 0.5))

  scene.add(conductorGroup, fieldGroup, particleGroup, solveGroup)

  renderer.domElement.addEventListener('dblclick', onDblClick)
  window.addEventListener('resize', onResize)
  animate()
}

function onDblClick(e: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect()
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
  const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)

  // Wire: pick in XY plane; loop/solenoid: pick in XZ plane
  const normal = state.conductorType === 'wire'
    ? new THREE.Vector3(0, 0, 1)
    : new THREE.Vector3(0, 1, 0)
  const hit = new THREE.Vector3()
  raycaster.ray.intersectPlane(new THREE.Plane(normal, 0), hit)
  if (hit) {
    const rnd = (n: number) => Math.round(n * 100) / 100
    state.solvePoint = { x: rnd(hit.x), y: rnd(hit.y), z: rnd(hit.z) }
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

  particleT = (particleT + 0.004) % 1
  particleMeshes.forEach((m, i) => {
    const pos = particlePos(particleT + i / N_PARTICLES)
    m.position.copy(pos)
  })

  renderer.render(scene, camera)
}

// ── Watchers ──────────────────────────────────────────────────────────────────

function rebuildScene() {
  buildConductor()
  buildField()
  buildParticles()
}

watch(
  () =>
    `${state.conductorType}|${state.I}|${state.wireLength}|${state.loopRadius}` +
    `|${state.solenoidLength}|${state.solenoidRadius}|${state.solenoidTurns}`,
  rebuildScene,
)

watch(() => state.solvePoint, buildSolvePoint)
watch(() => state.solution,   buildSolvePoint)

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  initScene()
  rebuildScene()
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
      Orbitar: arrastrar · Zoom: rueda · Punto P: doble clic
    </div>
    <div class="legend">
      <span class="leg-l">Bajo |B|</span>
      <div class="leg-bar"></div>
      <span class="leg-h">Alto |B|</span>
    </div>
    <div class="type-badge">
      <span v-if="state.conductorType === 'wire'">📏 Cable recto — campo circular</span>
      <span v-else-if="state.conductorType === 'loop'">⭕ Espira — campo axial</span>
      <span v-else>🌀 Solenoide — campo uniforme interior</span>
    </div>
    <div class="current-legend">
      <span class="curr-dot"></span> Corriente I = {{ state.I }} A
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
  background: rgba(0,0,0,0.55);
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
.leg-bar {
  width: 110px;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000);
}
.type-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(0,0,0,0.6);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 11px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 8px;
  pointer-events: none;
}
.current-legend {
  position: absolute;
  top: 50px;
  right: 14px;
  background: rgba(0,0,0,0.5);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 6px;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 6px;
}
.curr-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fde68a;
  display: inline-block;
}
</style>
