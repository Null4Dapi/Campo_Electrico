<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useLorentzStore } from './store'
import { solveLorentz, crossVec } from '../../composables/useMagneticPhysics'
import { magVec, normVec, scaleVec } from '../../composables/usePhysics'
import { createStarfield, createLabeledAxes } from '../../composables/useThreeUtils'

const { state } = useLorentzStore()
const canvasWrap = ref<HTMLDivElement>()

// Three.js objects
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let clock: THREE.Clock
let animId: number

const bFieldGroup  = new THREE.Group()
const pathGroup    = new THREE.Group()
const particleGroup = new THREE.Group()

let glowSprite: THREE.Sprite
let particleLight: THREE.PointLight
let velocityArrow: THREE.ArrowHelper
let forceArrow: THREE.ArrowHelper
let particleT = 0   // animation time [0..1 over full trajectory]

// ── Glow sprite ──────────────────────────────────────────────────────────────

function makeGlowSprite(hex: number, size: number): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8)  & 0xff
  const b =  hex        & 0xff
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0,    `rgba(${r},${g},${b},1)`)
  grad.addColorStop(0.25, `rgba(${r},${g},${b},0.6)`)
  grad.addColorStop(0.7,  `rgba(${r},${g},${b},0.15)`)
  grad.addColorStop(1,    `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(size, size, 1)
  return sprite
}

// ── Clear group ───────────────────────────────────────────────────────────────

function clearGroup(g: THREE.Group) {
  const items = [...g.children]
  for (const obj of items) {
    g.remove(obj)
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

// ── B field visualization ─────────────────────────────────────────────────────

function buildBField() {
  clearGroup(bFieldGroup)

  const B = { x: state.Bx, y: state.By, z: state.Bz }
  const Bmag = magVec(B)
  if (Bmag < 1e-30) return

  const Bdir = normVec(B)
  const Bdir3 = new THREE.Vector3(Bdir.x, Bdir.y, Bdir.z)

  // Spherical/Organic distribution
  const nShells = 4
  const pointsPerShell = 60
  const maxRadius = 2.5

  for (let s = 1; s <= nShells; s++) {
    const radius = (s / nShells) * maxRadius
    for (let i = 0; i < pointsPerShell; i++) {
      // Fibonacci sphere or random spherical distribution
      const phi = Math.acos(1 - 2 * (i + 0.5) / pointsPerShell)
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5)
      
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)

      const arrowOrigin = new THREE.Vector3(x, y, z)
      const arrow = new THREE.ArrowHelper(
        Bdir3, arrowOrigin, 0.2, 0x3b82f6, 0.06, 0.04,
      )
      ;(arrow.line.material as THREE.LineBasicMaterial).transparent = true
      ;(arrow.line.material as THREE.LineBasicMaterial).opacity = 0.3
      ;(arrow.cone.material as THREE.MeshBasicMaterial).transparent = true
      ;(arrow.cone.material as THREE.MeshBasicMaterial).opacity = 0.4
      bFieldGroup.add(arrow)
    }
  }

  // B label at top/direction indicator
  const Bvec = Bdir3.clone().multiplyScalar(2.8)
  const badgeGeo = new THREE.SphereGeometry(0.04, 12, 12)
  const badgeMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
  const badge = new THREE.Mesh(badgeGeo, badgeMat)
  badge.position.copy(Bvec)
  bFieldGroup.add(badge)
}

// ── Trajectory tube ───────────────────────────────────────────────────────────

function buildTrajectory(sol: ReturnType<typeof solveLorentz>) {
  clearGroup(pathGroup)

  const pts = sol.trajectory.map(p => new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z))
  if (pts.length < 2) return

  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
  const tubeGeo = new THREE.TubeGeometry(curve, pts.length * 2, 0.018, 8, false)

  // Color tube by parameter t (blue→cyan→magenta→white)
  const count = tubeGeo.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const t = i / count
    colors[i * 3]     = 0.3 + 0.7 * Math.sin(t * Math.PI)        // R
    colors[i * 3 + 1] = 0.6 * (1 - t)                             // G
    colors[i * 3 + 2] = 0.8 + 0.2 * Math.cos(t * Math.PI * 2)    // B
  }
  tubeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const tubeMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.65 })
  pathGroup.add(new THREE.Mesh(tubeGeo, tubeMat))

  // Faint ghost outline (wider, darker)
  const outerGeo = new THREE.TubeGeometry(curve, pts.length, 0.036, 6, false)
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.06, side: THREE.BackSide,
  })
  pathGroup.add(new THREE.Mesh(outerGeo, outerMat))
}

// ── Particle and dynamic arrows ───────────────────────────────────────────────

function buildParticle(hexColor: number) {
  // Remove previous
  particleGroup.children.slice().forEach(c => particleGroup.remove(c))

  const color = new THREE.Color(hexColor)

  // Core sphere
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 24, 24),
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.8,
      roughness: 0.1, metalness: 0.0,
    }),
  )
  particleGroup.add(core)

  // Inner glow shell
  const innerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 20, 20),
    new THREE.MeshBasicMaterial({
      color: hexColor, transparent: true, opacity: 0.18, side: THREE.BackSide,
    }),
  )
  particleGroup.add(innerGlow)

  // Sprite glow
  glowSprite = makeGlowSprite(hexColor, 1.2)
  particleGroup.add(glowSprite)

  // Point light
  particleLight = new THREE.PointLight(hexColor, 4, 3)
  particleGroup.add(particleLight)

  // Velocity arrow (orange)
  velocityArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.6, 0xffa500, 0.18, 0.12,
  )
  scene.add(velocityArrow)

  // Lorentz force arrow (magenta)
  forceArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.6, 0xd946ef, 0.18, 0.12,
  )
  scene.add(forceArrow)
}

// ── Scene particle color from state ──────────────────────────────────────────

function particleHex(): number {
  if (state.particleType === 'proton')   return 0xef4444
  if (state.particleType === 'electron') return 0x60a5fa
  if (state.particleType === 'alpha')    return 0xf59e0b
  return 0xa78bfa
}

// ── Full scene rebuild ────────────────────────────────────────────────────────

function rebuildScene() {
  const sol = solveLorentz({
    q: state.q, m: state.m,
    v0: { x: state.vx, y: state.vy, z: state.vz },
    B:  { x: state.Bx, y: state.By, z: state.Bz },
    numPeriods: state.numPeriods,
  })
  state.solution = sol
  particleT = 0

  buildBField()
  buildTrajectory(sol)
  buildParticle(particleHex())

  // Place particle at start
  const first = sol.trajectory[0]
  particleGroup.position.set(first.pos.x, first.pos.y, first.pos.z)
}

// ── Animation loop ────────────────────────────────────────────────────────────

const ANIM_SPEED = 0.12  // fraction of trajectory per second

function animate() {
  animId = requestAnimationFrame(animate)
  const dt = clock.getDelta()
  controls.update()

  const sol = state.solution
  if (sol && sol.trajectory.length > 1) {
    if (state.isPlaying) {
      particleT = (particleT + dt * ANIM_SPEED) % 1
    }

    const traj = sol.trajectory
    const rawIdx = particleT * (traj.length - 1)
    const i0  = Math.floor(rawIdx)
    const i1  = Math.min(i0 + 1, traj.length - 1)
    const frac = rawIdx - i0

    // Interpolate position
    const p0 = traj[i0].pos, p1 = traj[i1].pos
    const pos = {
      x: p0.x + (p1.x - p0.x) * frac,
      y: p0.y + (p1.y - p0.y) * frac,
      z: p0.z + (p1.z - p0.z) * frac,
    }
    particleGroup.position.set(pos.x, pos.y, pos.z)
    if (particleLight) particleLight.position.set(0, 0, 0)

    // Velocity arrow
    const v0 = traj[i0].vel, v1 = traj[i1].vel
    const vel = {
      x: v0.x + (v1.x - v0.x) * frac,
      y: v0.y + (v1.y - v0.y) * frac,
      z: v0.z + (v1.z - v0.z) * frac,
    }
    const vmag = magVec(vel)
    if (vmag > 1e-3 && velocityArrow) {
      const vdir = normVec(vel)
      velocityArrow.setDirection(new THREE.Vector3(vdir.x, vdir.y, vdir.z))
      velocityArrow.position.set(pos.x, pos.y, pos.z)
      velocityArrow.setLength(0.55, 0.18, 0.12)
    }

    // Force arrow F = q(v × B)
    const B  = { x: state.Bx, y: state.By, z: state.Bz }
    const Fv = scaleVec(crossVec(vel, B), state.q)
    const Fmag = magVec(Fv)
    if (Fmag > 1e-30 && forceArrow) {
      const Fdir = normVec(Fv)
      forceArrow.setDirection(new THREE.Vector3(Fdir.x, Fdir.y, Fdir.z))
      forceArrow.position.set(pos.x, pos.y, pos.z)
      forceArrow.setLength(0.55, 0.18, 0.12)
      forceArrow.visible = true
    } else if (forceArrow) {
      forceArrow.visible = false
    }
  }

  renderer.render(scene, camera)
}

// ── Init ──────────────────────────────────────────────────────────────────────

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
  camera.position.set(4, 3, 5)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.07

  clock = new THREE.Clock()

  // Space environment
  scene.add(createStarfield(3000, 100))

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(5, 8, 5)
  scene.add(dirLight)

  // Labeled Axes (assume 2m extent for Lorentz trajectories)
  scene.add(createLabeledAxes(2.5, 0.5))

  scene.add(bFieldGroup, pathGroup, particleGroup)
}

// ── Watchers ──────────────────────────────────────────────────────────────────

const paramKey = () =>
  `${state.q}|${state.m}|${state.vx}|${state.vy}|${state.vz}|${state.Bx}|${state.By}|${state.Bz}|${state.numPeriods}`

watch(paramKey, rebuildScene)

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  initScene()
  rebuildScene()
  animate()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  renderer.dispose()
})

function onResize() {
  const wrap = canvasWrap.value!
  const W = wrap.clientWidth, H = wrap.clientHeight
  camera.aspect = W / H
  camera.updateProjectionMatrix()
  renderer.setSize(W, H)
}
</script>

<template>
  <div ref="canvasWrap" class="scene-wrap">
    <div class="hud">Orbitar: arrastrar · Zoom: rueda</div>

    <!-- Legends -->
    <div class="legend-wrap">
      <div class="legend-item">
        <div class="dot" style="background:#ffa500"></div>
        <span>Velocidad v</span>
      </div>
      <div class="legend-item">
        <div class="dot" style="background:#d946ef"></div>
        <span>Fuerza F = q(v × B)</span>
      </div>
      <div class="legend-item">
        <div class="dot" style="background:#3b82f6"></div>
        <span>Campo B</span>
      </div>
    </div>

    <!-- Motion type badge -->
    <div class="motion-badge" v-if="state.solution">
      {{ state.solution.motionType === 'circular' ? '⭕ Circular'
       : state.solution.motionType === 'helical'  ? '🌀 Helicoidal'
       : state.solution.motionType === 'linear'   ? '➡ Rectilíneo'
       : '' }}
    </div>
  </div>
</template>

<style scoped>
.scene-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #060c18;
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
  background: rgba(0,0,0,0.5);
  color: var(--muted);
  font-size: 11px;
  padding: 5px 14px;
  border-radius: 20px;
  pointer-events: none;
  border: 1px solid rgba(255,255,255,0.06);
}

.legend-wrap {
  position: absolute;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16px;
  pointer-events: none;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--muted);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.motion-badge {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 14px;
  border-radius: 20px;
  pointer-events: none;
}
</style>
