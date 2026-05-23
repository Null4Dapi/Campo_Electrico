import * as THREE from 'three'

/**
 * Creates a starfield for the "space" look.
 */
export function createStarfield(count = 2000, radius = 500) { // Increased radius for mm scale
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = radius * (0.8 + 0.2 * Math.random())

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)

    const shade = 0.5 + Math.random() * 0.5
    colors[i * 3] = shade
    colors[i * 3 + 1] = shade
    colors[i * 3 + 2] = shade
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.5, // Larger stars for mm scale
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
  })

  return new THREE.Points(geometry, material)
}

/**
 * Creates a label using a Sprite and Canvas.
 */
export function createLabel(text: string, position: THREE.Vector3, color = '#9ca3af', size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  
  ctx.font = 'Bold 80px Arial'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, size / 2, size / 2)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.6 })
  const sprite = new THREE.Sprite(material)
  
  sprite.position.copy(position)
  sprite.scale.set(1.5, 1.5, 1) // Scaled up for mm units
  
  return sprite
}

/**
 * Creates a wide label that adjusts its width based on text length.
 */
export function createWideLabel(text: string, position: THREE.Vector3, color = '#9ca3af') {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  ctx.font = 'Bold 40px Arial'
  const metrics = ctx.measureText(text)
  const textWidth = Math.ceil(metrics.width) + 40
  const height = 64
  
  canvas.width = textWidth
  canvas.height = height
  
  ctx.font = 'Bold 40px Arial'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, textWidth / 2, height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.8 })
  const sprite = new THREE.Sprite(material)
  
  sprite.position.copy(position)
  sprite.scale.set(1.5 * (textWidth / height), 1.5, 1) 
  
  return sprite
}

/**
 * Creates labeled axes for the Cartesian plane.
 */
export function createLabeledAxes(extent = 50, step = 10, unitStr = 'mm', scaleFactor = 1) { // Extent in mm
  const group = new THREE.Group()
  
  const axesHelper = new THREE.AxesHelper(extent + (extent * 0.1))
  axesHelper.renderOrder = -1
  group.add(axesHelper)

  const tickLen = Math.max(0.8, extent * 0.015)
  const offset = Math.max(2.5, extent * 0.05)
  const lblScale = Math.max(1.0, extent * 0.02)
  const axisLabelScale = Math.max(1.5, extent * 0.03)

  const addTicks = (axis: 'x' | 'y' | 'z', color: string) => {
    for (let i = -extent; i <= extent; i += step) {
      if (Math.abs(i) < 0.1) continue
      
      const pos = new THREE.Vector3()
      pos[axis] = i
      
      const p1 = pos.clone()
      const p2 = pos.clone()
      if (axis === 'x') p2.y += tickLen
      if (axis === 'y') p2.x += tickLen
      if (axis === 'z') p2.x += tickLen
      
      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2])
      const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 })
      group.add(new THREE.Line(lineGeo, lineMat))
      
      const val = i / scaleFactor
      const labelText = Number.isInteger(val) ? val.toFixed(0) : val.toFixed(1)
      const labelPos = pos.clone()
      if (axis === 'x') labelPos.y -= offset
      if (axis === 'y') labelPos.x -= offset
      if (axis === 'z') { labelPos.x += offset; labelPos.y += offset }
      
      const lbl = createLabel(labelText, labelPos, color)
      lbl.scale.set(lblScale, lblScale, 1)
      group.add(lbl)
    }
  }

  addTicks('x', '#ef4444')
  addTicks('y', '#22c55e')
  addTicks('z', '#3b82f6')
  
  const makeAxisLabel = (text: string, pos: THREE.Vector3, color: string) => {
    const lbl = createLabel(text, pos, color)
    lbl.scale.set(axisLabelScale, axisLabelScale, 1)
    return lbl
  }

  group.add(makeAxisLabel(`X (${unitStr})`, new THREE.Vector3(extent + extent*0.15, 0, 0), '#ef4444'))
  group.add(makeAxisLabel(`Y (${unitStr})`, new THREE.Vector3(0, extent + extent*0.15, 0), '#22c55e'))
  group.add(makeAxisLabel(`Z (${unitStr})`, new THREE.Vector3(0, 0, extent + extent*0.15), '#3b82f6'))

  return group
}

/**
 * Creates a glowing charge with a sign label.
 */
export function createGlowingCharge(isPos: boolean, radius: number) {
  const group = new THREE.Group()
  const color = isPos ? 0xef4444 : 0x3b82f6
  
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 28, 28),
    new THREE.MeshPhongMaterial({ 
      color, 
      emissive: color, 
      emissiveIntensity: 0.5,
      shininess: 100,
      transparent: true,
      opacity: 0.7
    })
  )
  group.add(sphere)

  const signLabel = createLabel(isPos ? '+' : '-', new THREE.Vector3(0, 0, 0), '#ffffff', 128)
  signLabel.scale.set(radius * 1.5, radius * 1.5, 1)
  group.add(signLabel)

  const canvas = document.createElement('canvas')
  canvas.width = 64; canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  const r = (color >> 16) & 0xff, g = (color >> 8) & 0xff, b = color & 0xff
  grad.addColorStop(0, `rgba(${r},${g},${b},0.6)`)
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  
  const glowTex = new THREE.CanvasTexture(canvas)
  const glowMat = new THREE.SpriteMaterial({ 
    map: glowTex, 
    blending: THREE.AdditiveBlending, 
    transparent: true,
    opacity: 0.8
  })
  const glow = new THREE.Sprite(glowMat)
  glow.scale.set(radius * 5, radius * 5, 1)
  group.add(glow)

  return group
}
