<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useStore } from "../composables/useStore";
import {
  totalEField,
  totalEPotential,
  traceFieldLine,
} from "../composables/usePhysics";
import type { Plane } from "../composables/useStore";
import {
  createStarfield,
  createLabeledAxes,
  createGlowingCharge,
  createWideLabel,
} from "../composables/useThreeUtils";

const { state } = useStore();
const canvasWrap = ref<HTMLDivElement>();

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let animId: number;
let raycaster: THREE.Raycaster;
let clickPlane: THREE.Plane;

let targetFocusPos: THREE.Vector3 | null = null;
let targetCameraPos: THREE.Vector3 | null = null;

let currentExtent = 80;
let axesGroup = new THREE.Group();

function focusOn(target: { x: number; y: number; z: number; type: string }) {
  const tx = target.x * 1000;
  const ty = target.y * 1000;
  const tz = target.z * 1000;
  targetFocusPos = new THREE.Vector3(tx, ty, tz);

  const dir = new THREE.Vector3().subVectors(camera.position, targetFocusPos).normalize();
  if (dir.lengthSq() < 0.001) {
    dir.set(0.5, 0.5, 0.7).normalize();
  }
  
  const dist = target.type === 'origin' ? Math.max(180, currentExtent * 1.5) : Math.max(40, currentExtent * 0.3);
  targetCameraPos = targetFocusPos.clone().add(dir.multiplyScalar(dist));
}

let isDragging = false;
let dragObject: { type: "charge" | "pointP"; id?: number } | null = null;
const dragPlane = new THREE.Plane();
const dragIntersection = new THREE.Vector3();
const dragOffset = new THREE.Vector3();

const gridGroup = new THREE.Group();
const chargesGroup = new THREE.Group();
const vectorsGroup = new THREE.Group();
const particlesGroup = new THREE.Group();
const potentialGroup = new THREE.Group();
const pointPGroup = new THREE.Group();

let flowTime = 0;
const flowParticles: {
  mesh: THREE.Mesh;
  line: THREE.Vector3[];
  offset: number;
}[] = [];

function clearGroup(group: THREE.Group) {
  const items = [...group.children];
  for (const obj of items) {
    group.remove(obj);
    obj.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        if (Array.isArray(child.material))
          child.material.forEach((m: any) => m.dispose());
        else child.material.dispose();
      }
    });
  }
}

function getWorldPos(a: number, b: number, plane: Plane): THREE.Vector3 {
  const am = a * 1000;
  const bm = b * 1000;
  if (plane === "xy") return new THREE.Vector3(am, bm, 0);
  if (plane === "xz") return new THREE.Vector3(am, 0, bm);
  return new THREE.Vector3(0, am, bm);
}

function updateCharges() {
  clearGroup(chargesGroup);

  const scale = Math.max(1, currentExtent / 80);

  for (const c of state.charges) {
    const isPos = c.q_nC >= 0;
    const baseRadius = 0.5 + Math.abs(c.q_nC) * 0.1;
    const radius = Math.min(2 * scale, baseRadius * scale);

    const glowingCharge = createGlowingCharge(isPos, radius);
    glowingCharge.position.set(c.x * 1000, c.y * 1000, c.z * 1000);
    glowingCharge.userData = { type: "charge", id: c.id };
    chargesGroup.add(glowingCharge);
  }
}

function updateFieldLines() {
  clearGroup(vectorsGroup);
  clearGroup(particlesGroup);
  flowParticles.length = 0;

  if (!state.showVectors || state.charges.length === 0) return;

  const getColorForE = (Emag: number) => {
    const t = Math.max(0, Math.min(1, (Math.log10(Emag + 1) - 1) / 8));
    const colors = [
      new THREE.Color(0x0000ff),
      new THREE.Color(0x00ffff),
      new THREE.Color(0x00ff00),
      new THREE.Color(0xffff00),
      new THREE.Color(0xff0000)
    ];
    const scaledT = t * (colors.length - 1);
    const i = Math.floor(scaledT);
    const f = scaledT - i;
    if (i >= colors.length - 1) return colors[colors.length - 1];
    return colors[i].clone().lerp(colors[i + 1], f);
  };

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
  });

  const scale = Math.max(1, currentExtent / 80);

  for (const c of state.charges) {
    const isPos = c.q_nC > 0;
    const absQ = Math.abs(c.q_nC);
    const nLines = Math.min(64, Math.max(8, Math.round(absQ * 8)));

    const baseRadius = 0.5 + Math.abs(c.q_nC) * 0.1;
    const radius = Math.min(2 * scale, baseRadius * scale);
    const startOffset = (radius + 0.1 * scale) / 1000;

    for (let i = 0; i < nLines; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / nLines);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      const startPos = {
        x: c.x + startOffset * Math.sin(phi) * Math.cos(theta),
        y: c.y + startOffset * Math.sin(phi) * Math.sin(theta),
        z: c.z + startOffset * Math.cos(phi),
      };

      const points = traceFieldLine(state.charges, startPos, 500, 0.0003, 0.0005, isPos);
      if (points.length < 2) continue;

      const threePoints = points.map((p) => new THREE.Vector3(p.x * 1000, p.y * 1000, p.z * 1000));
      const colorsAttr = [];
      for (const p of points) {
        const E = totalEField(state.charges, p);
        const Emag = Math.sqrt(E.x ** 2 + E.y ** 2 + E.z ** 2);
        const color = getColorForE(Emag);
        colorsAttr.push(color.r, color.g, color.b);
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(threePoints);
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsAttr, 3));
      
      const line = new THREE.Line(geometry, lineMat);
      vectorsGroup.add(line);

      if (i % 2 === 0) {
        const pGeo = new THREE.SphereGeometry(0.1 * scale, 6, 6);
        const pMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.6,
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        particlesGroup.add(pMesh);
        const particlePoints = isPos ? threePoints : [...threePoints].reverse();
        flowParticles.push({
          mesh: pMesh,
          line: particlePoints,
          offset: Math.random(),
        });
      }
    }
  }
}

function updatePotential() {
  clearGroup(potentialGroup);
  if (!state.showPotential || state.charges.length === 0) return;

  const N = 80;
  const extent = 0.05;
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext("2d")!;

  const imgData = ctx.createImageData(N, N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = -extent + (i / (N - 1)) * 2 * extent;
      const b = -extent + (j / (N - 1)) * 2 * extent;
      const rp = getWorldPos(a, b, state.plane);
      const V = totalEPotential(state.charges, { x: rp.x / 1000, y: rp.y / 1000, z: rp.z / 1000 });

      const idx = (j * N + i) * 4;
      const t = Math.max(-1, Math.min(1, V / 50));
      if (t > 0) {
        imgData.data[idx] = 239;
        imgData.data[idx + 1] = 68;
        imgData.data[idx + 2] = 68;
      } else {
        imgData.data[idx] = 59;
        imgData.data[idx + 1] = 130;
        imgData.data[idx + 2] = 246;
      }
      imgData.data[idx + 3] = Math.abs(t) * 180;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const geo = new THREE.PlaneGeometry(extent * 2000, extent * 2000);
  const mesh = new THREE.Mesh(geo, mat);

  if (state.plane === "xz") mesh.rotation.x = -Math.PI / 2;
  else if (state.plane === "yz") mesh.rotation.y = Math.PI / 2;

  potentialGroup.add(mesh);
}

function updatePointP() {
  clearGroup(pointPGroup);
  const pt = state.solvePoint;
  if (!pt) return;

  const scale = Math.max(1, currentExtent / 80);

  const px = pt.x * 1000;
  const py = pt.y * 1000;
  const pz = pt.z * 1000;

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.08 * scale, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x22c55e }),
  );
  sphere.position.set(px, py, pz);
  sphere.userData = { type: "pointP" };
  pointPGroup.add(sphere);

  let unitStr = 'mm';
  let scaleFactor = 1;
  if (currentExtent >= 1000) {
    unitStr = 'm';
    scaleFactor = 1000;
  } else if (currentExtent >= 100) {
    unitStr = 'cm';
    scaleFactor = 10;
  }
  const formatCoord = (val: number) => {
    const v = val / scaleFactor;
    return Number.isInteger(v) ? v.toString() : v.toFixed(2);
  };
  const text = `P (${formatCoord(px)}, ${formatCoord(py)} ${unitStr})`;

  const label = createWideLabel(
    text,
    new THREE.Vector3(px, py + 1.2 * scale, 0),
    "#86efac",
  );
  label.scale.set(label.scale.x * 0.4 * scale, label.scale.y * 0.4 * scale, 1);
  pointPGroup.add(label);

  const lineMat = new THREE.LineBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.1,
  });
  const mkLine = (a: THREE.Vector3, b: THREE.Vector3) =>
    new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), lineMat);

  const L = currentExtent * 1.5;
  pointPGroup.add(mkLine(new THREE.Vector3(-L, py, pz), new THREE.Vector3(L, py, pz)));
  pointPGroup.add(mkLine(new THREE.Vector3(px, -L, pz), new THREE.Vector3(px, L, pz)));
  pointPGroup.add(mkLine(new THREE.Vector3(px, py, -L), new THREE.Vector3(px, py, L)));

  const E3 = totalEField(state.charges, pt);
  const E = new THREE.Vector3(E3.x, E3.y, E3.z);
  const mag = E.length();
  if (mag > 1e-3) {
    const len = Math.min(3.2 * scale, Math.log10(mag + 1) * 0.7 * scale);
    const headLength = Math.min(0.6 * scale, len * 0.35);
    const headWidth = Math.min(0.45 * scale, len * 0.25);
    const arrow = new THREE.ArrowHelper(
      E.clone().normalize(),
      new THREE.Vector3(px, py, pz),
      len,
      0x22c55e,
      headLength,
      headWidth,
    );
    pointPGroup.add(arrow);
  }
}

function updateGridAndAxes() {
  clearGroup(gridGroup);
  clearGroup(axesGroup);
  
  let maxPos = 50;
  for (const c of state.charges) {
    maxPos = Math.max(maxPos, Math.abs(c.x * 1000), Math.abs(c.y * 1000), Math.abs(c.z * 1000));
  }
  if (state.solvePoint) {
    maxPos = Math.max(maxPos, Math.abs(state.solvePoint.x * 1000), Math.abs(state.solvePoint.y * 1000), Math.abs(state.solvePoint.z * 1000));
  }
  
  const extent = Math.ceil((maxPos * 1.2) / 10) * 10;
  currentExtent = extent;
  
  let unitStr = 'mm';
  let scaleFactor = 1;
  if (extent >= 1000) {
    unitStr = 'm';
    scaleFactor = 1000;
  } else if (extent >= 100) {
    unitStr = 'cm';
    scaleFactor = 10;
  }
  
  let step = extent / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(step)));
  const normalized = step / magnitude;
  if (normalized < 1.5) step = magnitude;
  else if (normalized < 3.5) step = 2 * magnitude;
  else if (normalized < 7.5) step = 5 * magnitude;
  else step = 10 * magnitude;
  
  const size = extent * 2;
  const divisions = Math.max(2, Math.round(size / step) * 2);
  const color = 0x3b82f6;
  const grid = new THREE.GridHelper(size, divisions, color, 0x1e293b);
  if (grid.material instanceof THREE.Material) {
    grid.material.transparent = true;
    grid.material.opacity = 0.12;
  }
  
  if (state.plane === "xy") {
    grid.rotation.x = Math.PI / 2;
  } else if (state.plane === "yz") {
    grid.rotation.z = Math.PI / 2;
  }
  gridGroup.add(grid);
  
  axesGroup.add(createLabeledAxes(extent, step, unitStr, scaleFactor));
}

function getMouseCoords(e: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  return new THREE.Vector2(x, y);
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;

  targetFocusPos = null;
  targetCameraPos = null;

  const coords = getMouseCoords(e);
  raycaster.setFromCamera(coords, camera);

  const targets: THREE.Object3D[] = [];
  chargesGroup.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
      targets.push(child);
    }
  });
  pointPGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      targets.push(child);
    }
  });

  const intersects = raycaster.intersectObjects(targets);
  if (intersects.length > 0) {
    const hitObj = intersects[0].object;
    let obj: THREE.Object3D | null = hitObj;
    let type: "charge" | "pointP" | null = null;
    let id: number | undefined = undefined;

    while (obj && obj !== scene) {
      if (obj.userData) {
        if (obj.userData.type === "charge") {
          type = "charge";
          id = obj.userData.id;
          break;
        } else if (obj.userData.type === "pointP") {
          type = "pointP";
          break;
        }
      }
      obj = obj.parent;
    }

    if (type && obj) {
      isDragging = true;
      dragObject = { type, id };
      controls.enabled = false;

      const normal = new THREE.Vector3(0, 0, 1);

      const objWorldPos = new THREE.Vector3();
      obj.getWorldPosition(objWorldPos);
      objWorldPos.z = 0;
      dragPlane.setFromNormalAndCoplanarPoint(normal, objWorldPos);

      raycaster.ray.intersectPlane(dragPlane, dragIntersection);
      dragOffset.copy(objWorldPos).sub(dragIntersection);
      dragOffset.z = 0;

      renderer.domElement.style.cursor = "grabbing";
      e.stopPropagation();
    }
  }
}

function onPointerMove(e: PointerEvent) {
  const coords = getMouseCoords(e);
  raycaster.setFromCamera(coords, camera);

  if (isDragging && dragObject) {
    if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
      const newPos = dragIntersection.clone().add(dragOffset);

      const mx = newPos.x / 1000;
      const my = newPos.y / 1000;

      if (dragObject.type === "pointP") {
        state.solvePoint = { x: mx, y: my, z: 0 };
      } else if (dragObject.type === "charge" && dragObject.id !== undefined) {
        const c = state.charges.find((ch) => ch.id === dragObject!.id);
        if (c) {
          c.x = mx;
          c.y = my;
          c.z = 0;
        }
      }
    }
    e.stopPropagation();
    return;
  }

  const targets: THREE.Object3D[] = [];
  chargesGroup.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
      targets.push(child);
    }
  });
  pointPGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      targets.push(child);
    }
  });

  const intersects = raycaster.intersectObjects(targets);
  if (intersects.length > 0) {
    let hasInteractive = false;
    let obj: THREE.Object3D | null = intersects[0].object;
    while (obj && obj !== scene) {
      if (obj.userData && (obj.userData.type === "charge" || obj.userData.type === "pointP")) {
        hasInteractive = true;
        break;
      }
      obj = obj.parent;
    }
    renderer.domElement.style.cursor = hasInteractive ? "grab" : "auto";
  } else {
    renderer.domElement.style.cursor = "auto";
  }
}

function onPointerUp(e: PointerEvent) {
  if (isDragging) {
    isDragging = false;
    dragObject = null;
    controls.enabled = true;
    renderer.domElement.style.cursor = "auto";
    e.stopPropagation();
  }
}

function initScene() {
  const wrap = canvasWrap.value!;
  const W = wrap.clientWidth,
    H = wrap.clientHeight;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(W, H);
  renderer.setClearColor(0x020617);
  wrap.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 5000);
  camera.position.set(100, 100, 150);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.target.set(0, 0, 0);
  controls.update();

  raycaster = new THREE.Raycaster();

  scene.add(createStarfield(3000, 1500));

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(200, 300, 200);
  scene.add(dir);

  updateGridAndAxes();
  scene.add(gridGroup);
  scene.add(axesGroup);

  scene.add(
    chargesGroup,
    vectorsGroup,
    particlesGroup,
    potentialGroup,
    pointPGroup,
  );

  renderer.domElement.addEventListener("dblclick", onDblClick);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("resize", onResize);
  animate();
}

function onDblClick(e: MouseEvent) {
  const coords = getMouseCoords(e);
  raycaster.setFromCamera(coords, camera);

  const targets: THREE.Object3D[] = [];
  chargesGroup.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
      targets.push(child);
    }
  });
  pointPGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      targets.push(child);
    }
  });

  const intersects = raycaster.intersectObjects(targets);
  if (intersects.length > 0) {
    const hitObj = intersects[0].object;
    let obj: THREE.Object3D | null = hitObj;
    let type: "charge" | "pointP" | null = null;

    while (obj && obj !== scene) {
      if (obj.userData) {
        if (obj.userData.type === "charge") {
          type = "charge";
          break;
        } else if (obj.userData.type === "pointP") {
          type = "pointP";
          break;
        }
      }
      obj = obj.parent;
    }

    if (type && obj) {
      const objWorldPos = new THREE.Vector3();
      obj.getWorldPosition(objWorldPos);
      state.focusTarget = { x: objWorldPos.x / 1000, y: objWorldPos.y / 1000, z: objWorldPos.z / 1000, type };
      e.stopPropagation();
      return;
    }
  }

  const normal = new THREE.Vector3(0, 0, 1);

  clickPlane = new THREE.Plane(normal, 0);
  const hit = new THREE.Vector3();
  raycaster.ray.intersectPlane(clickPlane, hit);
  if (hit) {
    state.solvePoint = { x: hit.x / 1000, y: hit.y / 1000, z: 0 };
  }
}

function onResize() {
  const wrap = canvasWrap.value!;
  const W = wrap.clientWidth,
    H = wrap.clientHeight;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
}

function animate() {
  animId = requestAnimationFrame(animate);

  if (targetFocusPos) {
    controls.target.lerp(targetFocusPos, 0.1);
    if (controls.target.distanceTo(targetFocusPos) < 0.1) {
      controls.target.copy(targetFocusPos);
      targetFocusPos = null;
    }
  }
  if (targetCameraPos) {
    camera.position.lerp(targetCameraPos, 0.1);
    if (camera.position.distanceTo(targetCameraPos) < 0.1) {
      camera.position.copy(targetCameraPos);
      targetCameraPos = null;
    }
  }

  controls.update();

  flowTime += 0.005;
  for (const p of flowParticles) {
    const t = (flowTime + p.offset) % 1;
    const idx = Math.floor(t * (p.line.length - 1));
    const nextIdx = Math.min(idx + 1, p.line.length - 1);
    const frac = t * (p.line.length - 1) - idx;

    const pos = p.line[idx].clone().lerp(p.line[nextIdx], frac);
    p.mesh.position.copy(pos);

    if (p.mesh.material instanceof THREE.MeshBasicMaterial) {
      p.mesh.material.opacity = Math.sin(t * Math.PI) * 0.8;
    }
  }

  renderer.render(scene, camera);
}

watch(
  () =>
    state.charges
      .map((c) => `${c.id}:${c.q_nC}:${c.x}:${c.y}:${c.z}`)
      .join("|"),
  () => {
    updateGridAndAxes();
    updateCharges();
    updateFieldLines();
    updatePotential();
    updatePointP();
  },
);

watch(
  () =>
    `${state.resolution}:${state.plane}:${state.showVectors}:${state.showPotential}`,
  () => {
    updateGridAndAxes();
    updateFieldLines();
    updatePotential();
  },
);

watch(
  () => state.solvePoint,
  () => {
    updateGridAndAxes();
    updatePointP();
  }
);

watch(
  () => state.focusTarget,
  (target) => {
    if (target) {
      focusOn(target);
      state.focusTarget = null;
    }
  }
);

onMounted(() => {
  initScene();
  const { addCharge } = useStore();
  addCharge(+2, -0.5, 0, 0);
  addCharge(-2, +0.5, 0, 0);
});

onUnmounted(() => {
  cancelAnimationFrame(animId);
  window.removeEventListener("resize", onResize);
  if (renderer && renderer.domElement) {
    renderer.domElement.removeEventListener("dblclick", onDblClick);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.domElement.removeEventListener("pointercancel", onPointerUp);
    renderer.dispose();
  }
});
</script>

<template>
  <div ref="canvasWrap" class="scene-wrap">
    <div class="hud">
      Arrastra cargas o el punto P para moverlos · Orbitar: fondo · Zoom: rueda · Seleccionar P: doble clic
      <button class="btn-reset-view" title="Restablecer vista de cámara" @click="state.focusTarget = { x: 0, y: 0, z: 0, type: 'origin' }">🏠 Centrar</button>
    </div>
    <div class="legend" v-if="state.showVectors && state.charges.length > 0">
      <span class="legend-low">Bajo |E|</span>
      <div class="legend-bar"></div>
      <span class="legend-high">Alto |E|</span>
    </div>
    <div
      class="legend pot-legend"
      v-if="state.showPotential && state.charges.length > 0"
    >
      <span style="color: #60a5fa">V &lt; 0</span>
      <div class="pot-bar"></div>
      <span style="color: #ef4444">V &gt; 0</span>
    </div>
  </div>
</template>

<style scoped>
.scene-wrap {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0a0f1e;
  z-index: 1;
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
  border: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-reset-view {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #93c5fd;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.15s ease;
  pointer-events: auto;
}

.btn-reset-view:hover {
  background: rgba(59, 130, 246, 0.35);
  border-color: #3b82f6;
  color: #fff;
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
  background: linear-gradient(
    to right,
    #0000ff,
    #00ffff,
    #00ff00,
    #ffff00,
    #ff0000
  );
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
