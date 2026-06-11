'use client'

import { useEffect, useRef, useState, useCallback } from "react"
import type * as THREE from 'three'
import { LandingSite } from "@/data/lunar-sites"

interface MarsGlobeProps {
  sites:         LandingSite[]
  onSelectSite:  (site: LandingSite) => void
  paused?:       boolean
  activeSite?:   LandingSite | null
}

function latLonToVec3(lat: number, lon: number, radius: number) {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y:  radius * Math.cos(phi),
    z:  radius * Math.sin(phi) * Math.sin(theta),
  }
}

const STATUS_COLOR: Record<LandingSite["status"], number> = {
  active:   0x22c55e,
  inactive: 0xfbbf24,
  lost:     0xef4444,
}
const STATUS_CSS: Record<LandingSite["status"], string> = {
  active:   "#22c55e",
  inactive: "#fbbf24",
  lost:     "#ef4444",
}
const STATUS_LABEL: Record<LandingSite["status"], string> = {
  active:   "運用中",
  inactive: "運用終了",
  lost:     "消息不明",
}

type FlagDraw = (cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void

const drawStar5 = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
  const inner = r * 0.38
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI / 5) - Math.PI / 2
    const d = i % 2 === 0 ? r : inner
    if (i === 0) ctx.moveTo(cx + d * Math.cos(a), cy + d * Math.sin(a))
    else ctx.lineTo(cx + d * Math.cos(a), cy + d * Math.sin(a))
  }
  ctx.closePath(); ctx.fill()
}

const FLAG_DRAWERS: Record<string, FlagDraw> = {
  "ソビエト連邦": (cx, x, y, w, h) => {
    cx.fillStyle = '#CC0000'; cx.fillRect(x, y, w, h)
    cx.fillStyle = '#FFD700'
    drawStar5(cx, x + w * 0.22, y + h * 0.27, h * 0.20)
    cx.strokeStyle = '#FFD700'; cx.lineWidth = h * 0.08; cx.lineCap = 'round'
    cx.beginPath(); cx.arc(x + w * 0.30, y + h * 0.72, h * 0.16, Math.PI * 1.05, Math.PI * 1.85); cx.stroke()
    cx.lineWidth = h * 0.09
    cx.beginPath(); cx.moveTo(x + w * 0.13, y + h * 0.73); cx.lineTo(x + w * 0.26, y + h * 0.57); cx.stroke()
    cx.lineWidth = h * 0.07
    cx.beginPath(); cx.moveTo(x + w * 0.19, y + h * 0.67); cx.lineTo(x + w * 0.36, y + h * 0.90); cx.stroke()
  },
  "アメリカ": (cx, x, y, w, h) => {
    for (let i = 0; i < 13; i++) {
      cx.fillStyle = i % 2 === 0 ? '#B22234' : '#FFFFFF'
      cx.fillRect(x, y + i * h / 13, w, h / 13 + 1)
    }
    const cw = w * 0.40, ch = h * 7 / 13
    cx.fillStyle = '#3C3B6E'; cx.fillRect(x, y, cw, ch)
    cx.fillStyle = '#FFFFFF'
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 5; col++)
        drawStar5(cx, x + cw * (col * 2 + 1) / 10, y + ch * (row * 2 + 1) / 8, h * 0.052)
  },
  "中国": (cx, x, y, w, h) => {
    cx.fillStyle = '#DE2910'; cx.fillRect(x, y, w, h)
    cx.fillStyle = '#FFDE00'
    drawStar5(cx, x + w * 0.25, y + h * 0.35, h * 0.26)
    ;([[0.50, 0.10], [0.62, 0.22], [0.62, 0.48], [0.50, 0.60]] as [number, number][])
      .forEach(([px, py]) => drawStar5(cx, x + w * px, y + h * py, h * 0.09))
  },
  // ESA and sub-agencies — EU-style blue with 12 stars
  "ESA / イギリス": (cx, x, y, w, h) => {
    cx.fillStyle = '#003399'; cx.fillRect(x, y, w, h)
    cx.fillStyle = '#FFCC00'
    const r = h * 0.28
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12 - Math.PI / 2
      drawStar5(cx, x + w / 2 + r * Math.cos(a), y + h / 2 + r * Math.sin(a), h * 0.07)
    }
  },
  "ESA / ロシア": (cx, x, y, w, h) => {
    cx.fillStyle = '#003399'; cx.fillRect(x, y, w, h)
    cx.fillStyle = '#FFCC00'
    const r = h * 0.28
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12 - Math.PI / 2
      drawStar5(cx, x + w / 2 + r * Math.cos(a), y + h / 2 + r * Math.sin(a), h * 0.07)
    }
  },
}

interface GeoFeature { nameJa: string; lat: number; lon: number; type: 'mare' | 'crater' }
const GEO_FEATURES: GeoFeature[] = [
  // Major plains & basins
  { nameJa: "クリュセ平原",      lat:  22.0, lon:  -48.0, type: 'mare'   },
  { nameJa: "ウトピア平原",      lat:  46.0, lon: -110.0, type: 'mare'   },
  { nameJa: "ヘラス平原",        lat: -42.7, lon:   70.5, type: 'mare'   },
  { nameJa: "アルギュレ平原",    lat: -50.0, lon:  -43.0, type: 'mare'   },
  { nameJa: "アキダリア平原",    lat:  49.0, lon:  -28.0, type: 'mare'   },
  { nameJa: "エリュシウム平原",  lat:   3.0, lon:  154.0, type: 'mare'   },
  { nameJa: "メリディアニ平原",  lat:  -2.0, lon:   -6.0, type: 'mare'   },
  { nameJa: "イシディス平原",    lat:  12.9, lon:   87.0, type: 'mare'   },
  // Tharsis volcanoes
  { nameJa: "オリンポス山",      lat:  18.6, lon: -133.8, type: 'crater' },
  { nameJa: "アスクレウス山",    lat:  11.8, lon: -104.5, type: 'crater' },
  { nameJa: "タルシス高原",      lat:   1.0, lon: -101.0, type: 'mare'   },
  { nameJa: "エリュシウム山",    lat:  25.0, lon:  147.2, type: 'crater' },
  // Canyons & craters
  { nameJa: "マリネリス峡谷",    lat: -14.0, lon:  -59.2, type: 'crater' },
  { nameJa: "ゲールクレーター",  lat:  -5.4, lon:  137.8, type: 'crater' },
  { nameJa: "ジェゼロクレーター",lat:  18.4, lon:   77.5, type: 'crater' },
  { nameJa: "ガセフクレーター",  lat: -14.6, lon:  175.5, type: 'crater' },
  { nameJa: "アラビア大地",      lat:  21.0, lon:   30.0, type: 'mare'   },
]

export default function MarsGlobe({ sites, onSelectSite, paused, activeSite }: MarsGlobeProps) {
  const mountRef      = useRef<HTMLDivElement>(null)
  const zoomRef       = useRef({ in: () => {}, out: () => {} })
  const pausedRef     = useRef(false)
  const targetRef     = useRef<{ x: number; y: number; z: number } | null>(null)
  const activeSiteRef = useRef<LandingSite | null>(null)
  const [loading, setLoading]   = useState(true)
  const [webglOk, setWebglOk]   = useState(true)
  const [hovered, setHovered]   = useState<{ site: LandingSite; x: number; y: number } | null>(null)
  const hoveredRef = useRef<LandingSite | null>(null)

  useEffect(() => { pausedRef.current = !!paused }, [paused])
  useEffect(() => { activeSiteRef.current = activeSite ?? null }, [activeSite])

  useEffect(() => {
    if (!activeSite) { targetRef.current = null; return }
    const phi   = (90 - activeSite.lat) * Math.PI / 180
    const theta = (activeSite.lon + 180) * Math.PI / 180
    const x = -Math.sin(phi) * Math.cos(theta)
    const y =  Math.cos(phi)
    const z =  Math.sin(phi) * Math.sin(theta)
    const len = Math.sqrt(x * x + y * y + z * z)
    targetRef.current = { x: x / len, y: y / len, z: z / len }
  }, [activeSite])

  const setHoveredBoth = useCallback((v: { site: LandingSite; x: number; y: number } | null) => {
    setHovered(v)
    hoveredRef.current = v?.site ?? null
  }, [])

  useEffect(() => {
    try {
      const c = document.createElement("canvas")
      if (!c.getContext("webgl") && !c.getContext("experimental-webgl")) {
        setWebglOk(false); setLoading(false); return
      }
    } catch { setWebglOk(false); setLoading(false); return }

    const container = mountRef.current
    if (!container) return

    let animationId: number
    let isDestroyed = false

    const init = async () => {
      const THREE = await import("three")
      if (isDestroyed) return

      // ── Scene ──────────────────────────────────────────────
      const scene  = new THREE.Scene()
      const width  = container.clientWidth
      const height = container.clientHeight
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
      camera.position.z = 3.4

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio)
      container.appendChild(renderer.domElement)

      // ── Lights ─────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0xffffff, 0.12))
      const dirLight = new THREE.DirectionalLight(0xffffff, 3.2)
      dirLight.position.set(6, 0.5, 1)
      scene.add(dirLight)

      // ── Stars + Milky Way ──────────────────────────────────
      {
        const starCount = 4000
        const pos = new Float32Array(starCount * 3)
        const col = new Float32Array(starCount * 3)
        for (let i = 0; i < starCount; i++) {
          const theta = Math.random() * Math.PI * 2
          const phi   = Math.acos(2 * Math.random() - 1)
          const r     = 90
          pos[i*3]   = r * Math.sin(phi) * Math.cos(theta)
          pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
          pos[i*3+2] = r * Math.cos(phi)
          const t = Math.random()
          col[i*3]   = 0.85 + t * 0.15
          col[i*3+1] = 0.85 + (1 - t) * 0.10
          col[i*3+2] = 0.90 + t * 0.10
        }
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
        geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))
        scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
          size: 0.18, sizeAttenuation: true, vertexColors: true,
        })))

        const mwCount = 3000
        const mwPos = new Float32Array(mwCount * 3)
        const mwCol = new Float32Array(mwCount * 3)
        const bandAxis = new THREE.Vector3(Math.cos(1.0), Math.sin(1.0), 0).normalize()
        for (let i = 0; i < mwCount; i++) {
          const angle = Math.random() * Math.PI * 2
          const spread = (Math.random() + Math.random() - 1) * 0.18
          const onBand = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
          onBand.applyAxisAngle(new THREE.Vector3(0, 0, 1), spread)
          onBand.applyAxisAngle(bandAxis, angle * 0 + 1.0)
          const r = 88
          mwPos[i*3]   = onBand.x * r + (Math.random() - 0.5) * 6
          mwPos[i*3+1] = onBand.y * r + (Math.random() - 0.5) * 6
          mwPos[i*3+2] = onBand.z * r + (Math.random() - 0.5) * 6
          const brightness = 0.3 + Math.random() * 0.4
          mwCol[i*3]   = brightness * 1.0
          mwCol[i*3+1] = brightness * 0.92
          mwCol[i*3+2] = brightness * 0.85
        }
        const mwGeo = new THREE.BufferGeometry()
        mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPos, 3))
        mwGeo.setAttribute('color',    new THREE.BufferAttribute(mwCol, 3))
        scene.add(new THREE.Points(mwGeo, new THREE.PointsMaterial({
          size: 0.12, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.6,
        })))
      }

      // ── Mars ───────────────────────────────────────────────
      const loader   = new THREE.TextureLoader()
      const maxAniso = renderer.capabilities.getMaxAnisotropy()
      const marsMat  = new THREE.MeshStandardMaterial({
        map:       loader.load("/textures/mars.jpg", tex => { tex.anisotropy = maxAniso }),
        roughness: 0.95,
        metalness: 0.0,
      })
      const mars = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 256), marsMat)

      const marsGroup = new THREE.Group()
      marsGroup.add(mars)
      scene.add(marsGroup)

      // ── Glow texture (shared) ──────────────────────────────
      const glowCanvas = document.createElement("canvas")
      glowCanvas.width = glowCanvas.height = 64
      const gc = glowCanvas.getContext("2d")!
      const grad = gc.createRadialGradient(32, 32, 0, 32, 32, 32)
      grad.addColorStop(0,    "rgba(255,255,255,1)")
      grad.addColorStop(0.25, "rgba(255,255,255,0.6)")
      grad.addColorStop(1,    "rgba(255,255,255,0)")
      gc.fillStyle = grad
      gc.fillRect(0, 0, 64, 64)
      const glowTex = new THREE.CanvasTexture(glowCanvas)
      void glowTex  // suppress unused warning

      // ── Label texture builder ──────────────────────────────
      const makeLabel = (site: LandingSite): THREE.Sprite => {
        const W = 320, H = 72
        const cv = document.createElement("canvas")
        cv.width = W; cv.height = H
        const cx = cv.getContext("2d")!
        cx.fillStyle = "rgba(0,0,0,0.72)"
        cx.beginPath(); cx.roundRect(2, 2, W - 4, H - 4, 10); cx.fill()
        cx.fillStyle = STATUS_CSS[site.status]
        cx.beginPath(); cx.roundRect(2, 2, 5, H - 4, [10, 0, 0, 10]); cx.fill()
        cx.font = "bold 26px monospace"; cx.fillStyle = "#ffffff"
        cx.textBaseline = "middle"; cx.fillText(site.name, 18, 26)
        cx.font = "18px monospace"; cx.fillStyle = "#888888"
        cx.fillText(`${site.year} · ${site.country}`, 18, 52)
        const mat = new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(cv), transparent: true, depthTest: true, sizeAttenuation: true,
        })
        const sprite = new THREE.Sprite(mat)
        sprite.scale.set(0.26, 0.058, 1)
        return sprite
      }

      // ── Geo feature labels ─────────────────────────────────
      interface FeatureLabelEntry { sprite: THREE.Sprite; type: 'mare' | 'crater'; normal: THREE.Vector3 }
      const featureLabelEntries: FeatureLabelEntry[] = []
      for (const feat of GEO_FEATURES) {
        const W = feat.type === 'mare' ? 280 : 200
        const H = feat.type === 'mare' ? 48  : 40
        const cv = document.createElement("canvas")
        cv.width = W; cv.height = H
        const cx = cv.getContext("2d")!
        cx.fillStyle = feat.type === 'mare' ? "rgba(255,160,80,0.10)" : "rgba(255,255,255,0.08)"
        cx.beginPath(); cx.roundRect(0, 0, W, H, 6); cx.fill()
        cx.font = feat.type === 'mare' ? "italic 22px sans-serif" : "16px sans-serif"
        cx.fillStyle = feat.type === 'mare' ? "rgba(255,180,100,0.85)" : "rgba(220,200,180,0.75)"
        cx.textAlign = "center"; cx.textBaseline = "middle"
        cx.fillText(feat.nameJa, W / 2, H / 2)
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(cv), transparent: true, depthTest: true, sizeAttenuation: true,
        }))
        const scale = feat.type === 'mare' ? 0.30 : 0.20
        sprite.scale.set(scale, scale * (H / W), 1)
        const p = latLonToVec3(feat.lat, feat.lon, 1.015)
        sprite.position.set(p.x, p.y, p.z)
        sprite.visible = false
        marsGroup.add(sprite)
        const normal = new THREE.Vector3(p.x, p.y, p.z).normalize()
        featureLabelEntries.push({ sprite, type: feat.type, normal })
      }

      // ── Build markers ──────────────────────────────────────
      interface MarkerEntry {
        flag:        THREE.Sprite
        glow:        THREE.Sprite
        label:       THREE.Sprite
        hitArea:     THREE.Mesh
        site:        LandingSite
        frontFacing: boolean
      }
      const markerEntries: MarkerEntry[] = []
      const hitMat = new THREE.MeshBasicMaterial({ visible: false })

      const makeFlag = (site: LandingSite): THREE.Sprite => {
        const FW = 64, FH = 42
        const W = FW, H = FH * 2
        const cv = document.createElement("canvas")
        cv.width = W; cv.height = H
        const cx = cv.getContext("2d")!
        cx.globalAlpha = site.status === 'lost' ? 0.55 : 1.0
        const draw = FLAG_DRAWERS[site.country]
        if (draw) draw(cx, 0, 0, FW, FH)
        else { cx.fillStyle = '#666'; cx.fillRect(0, 0, FW, FH) }
        cx.globalAlpha = site.status === 'lost' ? 0.4 : 0.8
        cx.strokeStyle = 'rgba(255,255,255,0.65)'; cx.lineWidth = 1.5
        cx.strokeRect(0.75, 0.75, FW - 1.5, FH - 1.5)
        cx.globalAlpha = 1.0
        const mat = new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(cv), transparent: true, depthTest: true, sizeAttenuation: true,
        })
        const sprite = new THREE.Sprite(mat)
        sprite.scale.set(0.09, 0.118, 1)
        return sprite
      }

      for (const site of sites) {
        const pos    = latLonToVec3(site.lat, site.lon, 1.013)
        const posVec = new THREE.Vector3(pos.x, pos.y, pos.z)
        const normal = posVec.clone().normalize()

        // Status pin dot
        const pinCv = document.createElement("canvas")
        pinCv.width = pinCv.height = 24
        const pc = pinCv.getContext("2d")!
        pc.beginPath(); pc.arc(12, 12, 9, 0, Math.PI * 2)
        pc.fillStyle = STATUS_CSS[site.status]; pc.fill()
        pc.strokeStyle = 'rgba(255,255,255,0.9)'; pc.lineWidth = 2.5; pc.stroke()
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(pinCv), transparent: true, depthTest: true, sizeAttenuation: true,
        }))
        glow.scale.set(0.038, 0.038, 1)
        glow.position.copy(posVec)

        // Flag (no pole) — floats above pin
        const flag = makeFlag(site)
        flag.position.copy(normal.clone().multiplyScalar(1.04))

        // Label
        const label = makeLabel(site)
        label.position.copy(normal.clone().multiplyScalar(1.22))

        // Hit area
        const hitArea = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), hitMat)
        hitArea.position.copy(normal.clone().multiplyScalar(1.08))
        hitArea.userData = { site }

        marsGroup.add(glow, flag, label, hitArea)
        markerEntries.push({ flag, glow, label, hitArea, site, frontFacing: false })
      }

      // ── Polar axis ─────────────────────────────────────────
      {
        const axisMat = new THREE.MeshBasicMaterial({ color: 0x6666aa, transparent: true, opacity: 0.55 })
        const axisRod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 2.6, 8), axisMat)
        marsGroup.add(axisRod)

        const makePoleLabel = (text: string, color: string): THREE.Sprite => {
          const cv = document.createElement("canvas")
          cv.width = 64; cv.height = 64
          const cx = cv.getContext("2d")!
          cx.beginPath(); cx.arc(32, 32, 28, 0, Math.PI * 2)
          cx.fillStyle = color; cx.fill()
          cx.font = "bold 30px monospace"; cx.fillStyle = "#ffffff"
          cx.textAlign = "center"; cx.textBaseline = "middle"
          cx.fillText(text, 32, 33)
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(cv), transparent: true, depthTest: true,
          }))
          sprite.scale.set(0.10, 0.10, 1)
          return sprite
        }
        const nLabel = makePoleLabel("N", "#3b82f6")
        nLabel.position.set(0, 1.38, 0)
        const sLabel = makePoleLabel("S", "#ef4444")
        sLabel.position.set(0, -1.38, 0)
        marsGroup.add(nLabel, sLabel)
      }

      setLoading(false)

      // ── Interaction state ──────────────────────────────────
      let isDragging   = false
      let autoRotate   = true
      let prevMouse    = { x: 0, y: 0 }
      let mouseDownPos = { x: 0, y: 0 }
      const rotV       = { x: 0, y: 0 }
      const _yAxis = new THREE.Vector3(0, 1, 0)
      const _xAxis = new THREE.Vector3(1, 0, 0)
      const _tmpQ  = new THREE.Quaternion()
      // Show Valles Marineris / Chryse Planitia side (lon ≈ -45°)
      marsGroup.quaternion.setFromEuler(new THREE.Euler(-0.2, -Math.PI / 4, 0, 'XYZ'))
      let lastHoverMs = 0

      const raycaster = new THREE.Raycaster()
      raycaster.params.Mesh = { threshold: 0 }
      const pointer = new THREE.Vector2()

      const onMouseDown = (e: MouseEvent) => {
        isDragging        = true
        autoRotate        = false
        targetRef.current = null
        prevMouse         = { x: e.clientX, y: e.clientY }
        mouseDownPos      = { x: e.clientX, y: e.clientY }
        rotV.x = rotV.y   = 0
      }

      const onMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          const dx = e.clientX - prevMouse.x
          const dy = e.clientY - prevMouse.y
          rotV.x = dy * 0.005
          rotV.y = dx * 0.005
          _tmpQ.setFromAxisAngle(_yAxis, dx * 0.005)
          marsGroup.quaternion.premultiply(_tmpQ)
          _tmpQ.setFromAxisAngle(_xAxis, dy * 0.005)
          marsGroup.quaternion.premultiply(_tmpQ)
          prevMouse = { x: e.clientX, y: e.clientY }
          return
        }
        const now = Date.now()
        if (now - lastHoverMs < 40) return
        lastHoverMs = now
        const rect = container.getBoundingClientRect()
        pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
        pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
        raycaster.setFromCamera(pointer, camera)
        const frontHitAreas = markerEntries.filter(m => m.frontFacing).map(m => m.hitArea)
        const hits = raycaster.intersectObjects(frontHitAreas)
        if (hits.length > 0) {
          const entry = markerEntries.find(m => m.hitArea === hits[0].object)
          if (entry) {
            setHoveredBoth({ site: entry.site, x: e.clientX - rect.left, y: e.clientY - rect.top })
            container.style.cursor = "pointer"
            return
          }
        }
        setHoveredBoth(null)
        container.style.cursor = "grab"
      }

      const onMouseUp = (e: MouseEvent) => {
        if (!isDragging) return
        isDragging = false
        const dx = e.clientX - mouseDownPos.x
        const dy = e.clientY - mouseDownPos.y
        if (Math.sqrt(dx * dx + dy * dy) > 6) return
        const rect = container.getBoundingClientRect()
        pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
        pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
        raycaster.setFromCamera(pointer, camera)
        const frontHitAreas = markerEntries.filter(m => m.frontFacing).map(m => m.hitArea)
        const hits = raycaster.intersectObjects(frontHitAreas)
        if (hits.length > 0) {
          const entry = markerEntries.find(m => m.hitArea === hits[0].object)
          if (entry) onSelectSite(entry.site)
        }
      }

      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        camera.position.z = Math.max(1.5, Math.min(6, camera.position.z + e.deltaY * 0.005))
      }

      zoomRef.current.in  = () => { camera.position.z = Math.max(1.5, camera.position.z - 0.35) }
      zoomRef.current.out = () => { camera.position.z = Math.min(6,   camera.position.z + 0.35) }

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          isDragging = true; autoRotate = false
          prevMouse = mouseDownPos = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
      }
      const onTouchMove = (e: TouchEvent) => {
        if (!isDragging || e.touches.length !== 1) return
        const dx = e.touches[0].clientX - prevMouse.x
        const dy = e.touches[0].clientY - prevMouse.y
        _tmpQ.setFromAxisAngle(_yAxis, dx * 0.005)
        marsGroup.quaternion.premultiply(_tmpQ)
        _tmpQ.setFromAxisAngle(_xAxis, dy * 0.005)
        marsGroup.quaternion.premultiply(_tmpQ)
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
      const onTouchEnd = () => { isDragging = false }

      container.addEventListener("mousedown",  onMouseDown)
      window.addEventListener("mousemove",     onMouseMove)
      window.addEventListener("mouseup",       onMouseUp)
      container.addEventListener("wheel",      onWheel, { passive: false })
      container.addEventListener("touchstart", onTouchStart, { passive: true })
      container.addEventListener("touchmove",  onTouchMove,  { passive: true })
      container.addEventListener("touchend",   onTouchEnd)

      const onResize = () => {
        camera.aspect = container.clientWidth / container.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(container.clientWidth, container.clientHeight)
      }
      window.addEventListener("resize", onResize)

      // ── Animation loop ─────────────────────────────────────
      let t = 0
      const _worldPos = new THREE.Vector3()
      const animate = () => {
        animationId = requestAnimationFrame(animate)
        t += 0.016

        if (targetRef.current && !isDragging) {
          const n = targetRef.current
          const siteVec    = new THREE.Vector3(n.x, n.y, n.z)
          const targetQuat = new THREE.Quaternion().setFromUnitVectors(siteVec, new THREE.Vector3(0, 0, 1))
          marsGroup.quaternion.slerp(targetQuat, 0.07)
          if (marsGroup.quaternion.angleTo(targetQuat) < 0.005) {
            marsGroup.quaternion.copy(targetQuat)
            targetRef.current = null
          }
        } else if (autoRotate && !pausedRef.current) {
          _tmpQ.setFromAxisAngle(_yAxis, 0.001)
          marsGroup.quaternion.multiply(_tmpQ)
        } else if (!isDragging) {
          if (Math.abs(rotV.x) > 0.00005 || Math.abs(rotV.y) > 0.00005) {
            _tmpQ.setFromAxisAngle(_yAxis, rotV.y)
            marsGroup.quaternion.premultiply(_tmpQ)
            _tmpQ.setFromAxisAngle(_xAxis, rotV.x)
            marsGroup.quaternion.premultiply(_tmpQ)
            rotV.x *= 0.93
            rotV.y *= 0.93
          } else {
            autoRotate = true
          }
        }

        marsGroup.updateMatrixWorld()
        const camDir = camera.position.clone().normalize()

        for (const entry of markerEntries) {
          _worldPos.copy(entry.hitArea.position).applyMatrix4(marsGroup.matrixWorld)
          const surfaceNormal = _worldPos.clone().normalize()
          const facing = surfaceNormal.dot(camDir)

          const show      = facing > 0.08
          const isActive  = activeSiteRef.current?.id === entry.site.id
          const isHovered = hoveredRef.current === entry.site
          entry.frontFacing   = show
          entry.flag.visible  = show
          entry.glow.visible  = show
          entry.label.visible = show && (isHovered || isActive)

          if (!show) continue

          const isRunning = entry.site.status === "active"
          if (isHovered) {
            entry.glow.scale.setScalar(0.055)
          } else if (isRunning) {
            entry.glow.scale.setScalar(0.038 + 0.008 * Math.sin(t * 3))
          } else {
            entry.glow.scale.setScalar(0.038)
          }
        }

        const camDist = camera.position.z
        for (const fl of featureLabelEntries) {
          const threshold = fl.type === 'mare' ? 2.7 : 2.2
          if (camDist > threshold) { fl.sprite.visible = false; continue }
          const wn = fl.normal.clone().applyMatrix4(marsGroup.matrixWorld).normalize()
          fl.sprite.visible = wn.dot(camDir) > 0.15
        }

        renderer.render(scene, camera)
      }
      animate()

      return () => {
        isDestroyed = true
        cancelAnimationFrame(animationId)
        container.removeEventListener("mousedown",  onMouseDown)
        window.removeEventListener("mousemove",     onMouseMove)
        window.removeEventListener("mouseup",       onMouseUp)
        container.removeEventListener("wheel",      onWheel)
        container.removeEventListener("touchstart", onTouchStart)
        container.removeEventListener("touchmove",  onTouchMove)
        container.removeEventListener("touchend",   onTouchEnd)
        window.removeEventListener("resize",        onResize)
        renderer.dispose()
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      }
    }

    const cleanupPromise = init()
    return () => {
      isDestroyed = true
      cleanupPromise.then(c => c?.())
    }
  }, [sites, onSelectSite, setHoveredBoth])

  if (!webglOk) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black text-zinc-400 font-mono text-center p-8">
        <div>
          <p className="text-2xl mb-2">WebGL非対応</p>
          <p className="text-sm">このブラウザはWebGLに対応していません。<br />Chrome・Firefox・Safariの最新版をご利用ください。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-4 font-mono text-zinc-400">
            <div className="w-10 h-10 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
            <span className="text-sm">火星マップを読み込み中...</span>
          </div>
        </div>
      )}

      {hovered && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{ left: hovered.x + 16, top: hovered.y - 8 }}
        >
          <div className="bg-black/90 border rounded px-3 py-2 font-mono text-xs leading-relaxed whitespace-nowrap"
            style={{ borderColor: STATUS_CSS[hovered.site.status] }}>
            <div className="text-white font-bold text-sm mb-0.5">{hovered.site.name}</div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_CSS[hovered.site.status] }} />
              <span style={{ color: STATUS_CSS[hovered.site.status] }}>{STATUS_LABEL[hovered.site.status]}</span>
            </div>
            <div className="text-zinc-400 mt-0.5">{hovered.site.year}年 · {hovered.site.country}</div>
            <div className="text-zinc-600 mt-1 text-[10px]">クリックで詳細</div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="absolute bottom-10 right-4 z-20 flex flex-col gap-1">
          <button
            onClick={() => zoomRef.current.in()}
            className="w-8 h-8 rounded bg-black/70 border border-zinc-700 hover:border-zinc-400 text-zinc-400 hover:text-white text-lg leading-none flex items-center justify-center transition-colors"
            title="ズームイン"
          >+</button>
          <button
            onClick={() => zoomRef.current.out()}
            className="w-8 h-8 rounded bg-black/70 border border-zinc-700 hover:border-zinc-400 text-zinc-400 hover:text-white text-lg leading-none flex items-center justify-center transition-colors"
            title="ズームアウト"
          >−</button>
        </div>
      )}

      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  )
}
