'use client'

import { useEffect, useRef, useState, useCallback } from "react"
import type * as THREE from 'three'
import { LandingSite } from "@/data/lunar-sites"

interface MoonGlobeProps {
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
const FLAG_DRAWERS: Record<string, FlagDraw> = {
  "ソビエト連邦": (cx, x, y, w, h) => {
    cx.fillStyle = '#CC0000'; cx.fillRect(x, y, w, h)
    cx.fillStyle = '#FFD700'; cx.font = `bold ${h * .7}px sans-serif`
    cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('★', x + w / 2, y + h / 2)
  },
  "ロシア": (cx, x, y, w, h) => {
    ['#FFFFFF', '#0039A6', '#D52B1E'].forEach((c, i) => { cx.fillStyle = c; cx.fillRect(x, y + i * h / 3, w, h / 3 + 1) })
  },
  "アメリカ": (cx, x, y, w, h) => {
    for (let i = 0; i < 6; i++) { cx.fillStyle = i % 2 === 0 ? '#B22234' : '#FFFFFF'; cx.fillRect(x, y + i * h / 6, w, h / 6 + 1) }
    cx.fillStyle = '#3C3B6E'; cx.fillRect(x, y, w * .45, h * .5)
    cx.fillStyle = '#FFFFFF'; cx.font = `${h * .35}px sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'
    cx.fillText('★', x + w * .22, y + h * .24)
  },
  "アメリカ（民間）": (cx, x, y, w, h) => {
    for (let i = 0; i < 6; i++) { cx.fillStyle = i % 2 === 0 ? '#B22234' : '#FFFFFF'; cx.fillRect(x, y + i * h / 6, w, h / 6 + 1) }
    cx.fillStyle = '#3C3B6E'; cx.fillRect(x, y, w * .45, h * .5)
    cx.fillStyle = '#FFFFFF'; cx.font = `${h * .35}px sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'
    cx.fillText('★', x + w * .22, y + h * .24)
  },
  "中国": (cx, x, y, w, h) => {
    cx.fillStyle = '#DE2910'; cx.fillRect(x, y, w, h)
    cx.fillStyle = '#FFDE00'; cx.font = `bold ${h * .6}px sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'
    cx.fillText('★', x + w * .28, y + h * .42)
    cx.font = `${h * .28}px sans-serif`
    ;([[.62, .22], [.75, .32], [.75, .55], [.62, .65]] as [number, number][]).forEach(([px, py]) => cx.fillText('★', x + w * px, y + h * py))
  },
  "インド": (cx, x, y, w, h) => {
    ['#FF9933', '#FFFFFF', '#138808'].forEach((c, i) => { cx.fillStyle = c; cx.fillRect(x, y + i * h / 3, w, h / 3 + 1) })
    cx.strokeStyle = '#000080'; cx.lineWidth = 1.5
    cx.beginPath(); cx.arc(x + w / 2, y + h / 2, h * .18, 0, Math.PI * 2); cx.stroke()
  },
  "日本": (cx, x, y, w, h) => {
    cx.fillStyle = '#FFFFFF'; cx.fillRect(x, y, w, h)
    cx.fillStyle = '#BC002D'; cx.beginPath(); cx.arc(x + w / 2, y + h / 2, h * .32, 0, Math.PI * 2); cx.fill()
  },
  "イスラエル": (cx, x, y, w, h) => {
    cx.fillStyle = '#FFFFFF'; cx.fillRect(x, y, w, h)
    cx.fillStyle = '#0038B8'
    cx.fillRect(x, y + h * .18, w, h * .12); cx.fillRect(x, y + h * .70, w, h * .12)
    cx.font = `${h * .45}px sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'
    cx.fillText('✡', x + w / 2, y + h / 2)
  },
}

interface GeoFeature { nameJa: string; lat: number; lon: number; type: 'mare' | 'crater' }
const GEO_FEATURES: GeoFeature[] = [
  { nameJa: "静かの海",     lat:   8.5, lon:  31.4, type: 'mare'   },
  { nameJa: "雨の海",       lat:  32.8, lon: -15.6, type: 'mare'   },
  { nameJa: "晴れの海",     lat:  28.0, lon:  17.5, type: 'mare'   },
  { nameJa: "危機の海",     lat:  17.0, lon:  59.1, type: 'mare'   },
  { nameJa: "嵐の大洋",     lat:  18.4, lon: -57.4, type: 'mare'   },
  { nameJa: "冷たい海",     lat:  56.0, lon:   1.4, type: 'mare'   },
  { nameJa: "湿りの海",     lat: -24.4, lon: -38.6, type: 'mare'   },
  { nameJa: "豊かの海",     lat:  -7.8, lon:  51.3, type: 'mare'   },
  { nameJa: "蒸気の海",     lat:  13.3, lon:   3.6, type: 'mare'   },
  { nameJa: "ネクタルの海", lat: -14.5, lon:  33.6, type: 'mare'   },
  { nameJa: "東の海",       lat: -19.4, lon: -92.8, type: 'mare'   },
  { nameJa: "モスクワの海", lat:  27.3, lon: 147.9, type: 'mare'   },
  { nameJa: "知の海",       lat: -33.7, lon: 163.5, type: 'mare'   },
  // Craters — nearside
  { nameJa: "ティコ",       lat: -43.3, lon: -11.1, type: 'crater' },
  { nameJa: "コペルニクス", lat:   9.7, lon: -20.1, type: 'crater' },
  { nameJa: "プラトン",     lat:  51.6, lon:  -9.4, type: 'crater' },
  { nameJa: "アリスタルコス", lat: 23.7, lon: -47.4, type: 'crater' },
  { nameJa: "クラビウス",   lat: -58.4, lon: -14.1, type: 'crater' },
  { nameJa: "ケプラー",     lat:   8.1, lon: -38.0, type: 'crater' },
  { nameJa: "マギヌス",     lat: -50.5, lon:  -6.0, type: 'crater' },
  { nameJa: "モレトゥス",   lat: -70.6, lon:  -5.8, type: 'crater' },
  // South pole
  { nameJa: "南極エイトケン盆地", lat: -56.0, lon: 180.0, type: 'mare' },
  { nameJa: "シャクルトン",  lat: -89.5, lon:   0.0, type: 'crater' },
  { nameJa: "シュレーディンガー", lat: -74.9, lon: 133.5, type: 'crater' },
  // Far side
  { nameJa: "チオルコフスキー", lat: -20.4, lon: 128.9, type: 'crater' },
  { nameJa: "アポロ",       lat: -36.1, lon:-151.8, type: 'crater' },
  { nameJa: "ヘルツシュプルング", lat: 2.6, lon:-128.3, type: 'crater' },
]

export default function MoonGlobe({ sites, onSelectSite, paused, activeSite }: MoonGlobeProps) {
  const mountRef      = useRef<HTMLDivElement>(null)
  const zoomRef       = useRef({ in: () => {}, out: () => {} })
  const pausedRef     = useRef(false)
  const targetRef     = useRef<{ x: number; y: number; z: number } | null>(null)
  const activeSiteRef = useRef<LandingSite | null>(null)
  const [loading, setLoading]           = useState(true)
  const [webglOk, setWebglOk]           = useState(true)
  const [hovered, setHovered]           = useState<{ site: LandingSite; x: number; y: number } | null>(null)
  const hoveredRef = useRef<LandingSite | null>(null)

  // Sync paused state into ref (readable from animation loop without re-init)
  useEffect(() => { pausedRef.current = !!paused }, [paused])
  useEffect(() => { activeSiteRef.current = activeSite ?? null }, [activeSite])

  // Store target site normal (unit vector in moon-local space) when activeSite changes
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

  // keep ref in sync
  const setHoveredBoth = useCallback((v: { site: LandingSite; x: number; y: number } | null) => {
    setHovered(v)
    hoveredRef.current = v?.site ?? null
  }, [])

  useEffect(() => {
    // WebGL check
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
      scene.add(new THREE.AmbientLight(0xffffff, 0.15))
      const dirLight = new THREE.DirectionalLight(0xffffff, 3.5)
      dirLight.position.set(6, 0.5, 1)
      scene.add(dirLight)

      // ── Stars + Milky Way ─────────────────────────────────
      {
        // Background star field
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
          // Slight warm/cool color variation
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

        // Milky Way band — denser stars along a great circle
        const mwCount = 3000
        const mwPos = new Float32Array(mwCount * 3)
        const mwCol = new Float32Array(mwCount * 3)
        // Tilt ~60° to match actual Milky Way orientation
        const bandAxis = new THREE.Vector3(Math.cos(1.0), Math.sin(1.0), 0).normalize()
        for (let i = 0; i < mwCount; i++) {
          const angle = Math.random() * Math.PI * 2
          // Gaussian distribution around the band plane
          const spread = (Math.random() + Math.random() - 1) * 0.18
          const onBand  = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
          // Rotate around bandAxis
          onBand.applyAxisAngle(new THREE.Vector3(0, 0, 1), spread)
          onBand.applyAxisAngle(bandAxis, angle * 0 + 1.0)
          const r = 88
          mwPos[i*3]   = onBand.x * r + (Math.random() - 0.5) * 6
          mwPos[i*3+1] = onBand.y * r + (Math.random() - 0.5) * 6
          mwPos[i*3+2] = onBand.z * r + (Math.random() - 0.5) * 6
          // Warm nebula tint
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

      // ── Moon ───────────────────────────────────────────────
      const loader      = new THREE.TextureLoader()
      const maxAniso    = renderer.capabilities.getMaxAnisotropy()
      const loadTex = (path: string) => {
        const t = loader.load(path)
        t.anisotropy = maxAniso
        return t
      }
      // Load 2K preview immediately, then swap to 8K when ready
      const moonMat = new THREE.MeshStandardMaterial({
        map:       loadTex("/textures/moon-preview.jpg"),
        bumpMap:   loadTex("/textures/moon-bump.jpg"),
        bumpScale: 0.06,
        roughness: 0.9,
        metalness: 0.0,
      })
      loader.load("/textures/moon.jpg", (tex) => {
        tex.anisotropy = maxAniso
        moonMat.map = tex
        moonMat.needsUpdate = true
      })
      const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 256), moonMat)

      const moonGroup = new THREE.Group()
      moonGroup.add(moon)
      scene.add(moonGroup)

      // ── Glow texture (shared) ──────────────────────────────
      const glowCanvas = document.createElement("canvas")
      glowCanvas.width = glowCanvas.height = 64
      const gc = glowCanvas.getContext("2d")!
      const grad = gc.createRadialGradient(32, 32, 0, 32, 32, 32)
      grad.addColorStop(0,   "rgba(255,255,255,1)")
      grad.addColorStop(0.25,"rgba(255,255,255,0.6)")
      grad.addColorStop(1,   "rgba(255,255,255,0)")
      gc.fillStyle = grad
      gc.fillRect(0, 0, 64, 64)
      const glowTex = new THREE.CanvasTexture(glowCanvas)

      // ── Label texture builder ──────────────────────────────
      const makeLabel = (site: LandingSite): THREE.Sprite => {
        const W = 320, H = 72
        const cv = document.createElement("canvas")
        cv.width = W; cv.height = H
        const cx = cv.getContext("2d")!
        // Background pill
        cx.fillStyle = "rgba(0,0,0,0.72)"
        cx.beginPath()
        cx.roundRect(2, 2, W - 4, H - 4, 10)
        cx.fill()
        // Left accent bar
        cx.fillStyle = STATUS_CSS[site.status]
        cx.beginPath()
        cx.roundRect(2, 2, 5, H - 4, [10, 0, 0, 10])
        cx.fill()
        // Mission name
        cx.font = "bold 26px monospace"
        cx.fillStyle = "#ffffff"
        cx.textBaseline = "middle"
        cx.fillText(site.name, 18, 26)
        // Year · country
        cx.font = "18px monospace"
        cx.fillStyle = "#888888"
        cx.fillText(`${site.year} · ${site.country}`, 18, 52)

        const mat = new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(cv),
          transparent: true,
          depthTest: true,
          sizeAttenuation: true,
        })
        const sprite = new THREE.Sprite(mat)
        sprite.scale.set(0.26, 0.058, 1)
        return sprite
      }

      // ── Geo feature labels (mare / crater) ────────────────
      interface FeatureLabelEntry { sprite: THREE.Sprite; type: 'mare' | 'crater'; normal: THREE.Vector3 }
      const featureLabelEntries: FeatureLabelEntry[] = []
      for (const feat of GEO_FEATURES) {
        const W = feat.type === 'mare' ? 280 : 200
        const H = feat.type === 'mare' ? 48  : 40
        const cv = document.createElement("canvas")
        cv.width = W; cv.height = H
        const cx = cv.getContext("2d")!
        cx.fillStyle = feat.type === 'mare' ? "rgba(120,180,255,0.12)" : "rgba(255,255,255,0.08)"
        cx.beginPath(); cx.roundRect(0, 0, W, H, 6); cx.fill()
        cx.font = feat.type === 'mare' ? "italic 22px sans-serif" : "16px sans-serif"
        cx.fillStyle = feat.type === 'mare' ? "rgba(180,210,255,0.85)" : "rgba(220,220,220,0.75)"
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
        moonGroup.add(sprite)
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
        const W = 80, H = 120
        const fw = 52, fh = 34       // flag rectangle dimensions
        const fx = W / 2, fy = 8     // flag top-left (pole is at W/2)
        const cv = document.createElement("canvas")
        cv.width = W; cv.height = H
        const cx = cv.getContext("2d")!

        // Pole
        const lost = site.status === 'lost'
        cx.strokeStyle = lost ? 'rgba(180,100,100,0.75)' : 'rgba(210,210,210,0.9)'
        cx.lineWidth = 2.5
        cx.beginPath(); cx.moveTo(W / 2, H - 4); cx.lineTo(W / 2, fy); cx.stroke()

        // Flag background
        cx.globalAlpha = lost ? 0.55 : 1.0
        const draw = FLAG_DRAWERS[site.country]
        if (draw) {
          draw(cx, fx, fy, fw, fh)
        } else {
          cx.fillStyle = '#666'; cx.fillRect(fx, fy, fw, fh)
        }
        // Flag border
        cx.globalAlpha = lost ? 0.4 : 0.7
        cx.strokeStyle = 'rgba(255,255,255,0.5)'; cx.lineWidth = 1
        cx.strokeRect(fx, fy, fw, fh)
        cx.globalAlpha = 1.0

        const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: true, sizeAttenuation: true })
        const sprite = new THREE.Sprite(mat)
        sprite.scale.set(0.09, 0.135, 1)
        return sprite
      }

      for (const site of sites) {
        const pos    = latLonToVec3(site.lat, site.lon, 1.013)
        const posVec = new THREE.Vector3(pos.x, pos.y, pos.z)
        const normal = posVec.clone().normalize()
        const color  = STATUS_COLOR[site.status]

        // Glow at surface base
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTex, color,
          blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false,
        }))
        glow.scale.set(0.10, 0.10, 1)
        glow.position.copy(posVec)

        // Flag — lower center so pole base is ~0.02 below surface,
        // moon geometry's depth buffer clips the buried portion naturally
        const flag = makeFlag(site)
        flag.position.copy(normal.clone().multiplyScalar(1.04))

        // Label (shown on hover / selected)
        const label = makeLabel(site)
        label.position.copy(normal.clone().multiplyScalar(1.22))

        // Invisible hit sphere
        const hitArea = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), hitMat)
        hitArea.position.copy(normal.clone().multiplyScalar(1.08))
        hitArea.userData = { site }

        moonGroup.add(glow, flag, label, hitArea)
        markerEntries.push({ flag, glow, label, hitArea, site, frontFacing: false })
      }

      // ── Polar axis ─────────────────────────────────────────
      {
        const axisMat = new THREE.MeshBasicMaterial({ color: 0x6666aa, transparent: true, opacity: 0.55 })
        const axisRod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 2.6, 8), axisMat)
        moonGroup.add(axisRod)

        const makePoleLabel = (text: string, color: string): THREE.Sprite => {
          const cv = document.createElement("canvas")
          cv.width = 64; cv.height = 64
          const cx = cv.getContext("2d")!
          cx.beginPath()
          cx.arc(32, 32, 28, 0, Math.PI * 2)
          cx.fillStyle = color
          cx.fill()
          cx.font = "bold 30px monospace"
          cx.fillStyle = "#ffffff"
          cx.textAlign = "center"
          cx.textBaseline = "middle"
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
        moonGroup.add(nLabel, sLabel)
      }

      setLoading(false)

      // ── Interaction state ──────────────────────────────────
      let isDragging   = false
      let autoRotate   = true
      let prevMouse    = { x: 0, y: 0 }
      let mouseDownPos = { x: 0, y: 0 }
      const rotV      = { x: 0, y: 0 }
      // World-space rotation axes (constant — camera is always at +Z)
      const _yAxis = new THREE.Vector3(0, 1, 0)
      const _xAxis = new THREE.Vector3(1, 0, 0)
      const _tmpQ  = new THREE.Quaternion()
      // Start facing the nearside of the Moon, with a slight globe-like tilt
      moonGroup.quaternion.setFromEuler(new THREE.Euler(-0.35, -Math.PI / 2, 0, 'XYZ'))
      let lastHoverMs  = 0

      const raycaster = new THREE.Raycaster()
      raycaster.params.Mesh = { threshold: 0 }
      const pointer   = new THREE.Vector2()

      const onMouseDown = (e: MouseEvent) => {
        isDragging          = true
        autoRotate          = false
        targetRef.current   = null   // cancel any in-progress centering animation
        prevMouse           = { x: e.clientX, y: e.clientY }
        mouseDownPos        = { x: e.clientX, y: e.clientY }
        rotV.x = rotV.y     = 0
      }

      const onMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          const dx = e.clientX - prevMouse.x
          const dy = e.clientY - prevMouse.y
          rotV.x = dy * 0.005
          rotV.y = dx * 0.005
          _tmpQ.setFromAxisAngle(_yAxis, dx * 0.005)
          moonGroup.quaternion.premultiply(_tmpQ)
          _tmpQ.setFromAxisAngle(_xAxis, dy * 0.005)
          moonGroup.quaternion.premultiply(_tmpQ)
          prevMouse = { x: e.clientX, y: e.clientY }
          return
        }
        // Hover detection (throttled to 40 ms)
        const now = Date.now()
        if (now - lastHoverMs < 40) return
        lastHoverMs = now

        const rect = container.getBoundingClientRect()
        pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
        pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
        raycaster.setFromCamera(pointer, camera)
        // Only raycast against front-facing markers
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

        // Only fire click if mouse barely moved
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

      // Expose zoom to React buttons
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
        moonGroup.quaternion.premultiply(_tmpQ)
        _tmpQ.setFromAxisAngle(_xAxis, dy * 0.005)
        moonGroup.quaternion.premultiply(_tmpQ)
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
          // Slerp to target quaternion that brings the site to face the camera (+Z)
          const n = targetRef.current
          const siteVec = new THREE.Vector3(n.x, n.y, n.z)
          const targetQuat = new THREE.Quaternion().setFromUnitVectors(siteVec, new THREE.Vector3(0, 0, 1))
          moonGroup.quaternion.slerp(targetQuat, 0.07)
          if (moonGroup.quaternion.angleTo(targetQuat) < 0.005) {
            moonGroup.quaternion.copy(targetQuat)
            targetRef.current = null
          }
        } else if (autoRotate && !pausedRef.current) {
          _tmpQ.setFromAxisAngle(_yAxis, 0.001)
          moonGroup.quaternion.multiply(_tmpQ)
        } else if (!isDragging) {
          // Inertia: coast after drag release, then resume auto-rotation
          if (Math.abs(rotV.x) > 0.00005 || Math.abs(rotV.y) > 0.00005) {
            _tmpQ.setFromAxisAngle(_yAxis, rotV.y)
            moonGroup.quaternion.premultiply(_tmpQ)
            _tmpQ.setFromAxisAngle(_xAxis, rotV.x)
            moonGroup.quaternion.premultiply(_tmpQ)
            rotV.x *= 0.93
            rotV.y *= 0.93
          } else {
            autoRotate = true
          }
        }

        // Update moonGroup world matrix so we can read child world positions
        moonGroup.updateMatrixWorld()

        // Camera direction from origin (used for back-face culling of markers)
        const camDir = camera.position.clone().normalize()

        // Per-marker effects
        for (const entry of markerEntries) {
          // Compute this marker's world-space surface normal
          _worldPos.copy(entry.hitArea.position).applyMatrix4(moonGroup.matrixWorld)
          const surfaceNormal = _worldPos.clone().normalize()
          const facing = surfaceNormal.dot(camDir)

          // Hide visuals on the back hemisphere
          const show = facing > 0.08
          const isActive = activeSiteRef.current?.id === entry.site.id
          const isHovered = hoveredRef.current === entry.site
          entry.frontFacing   = show
          entry.flag.visible  = show
          entry.glow.visible  = show
          // Labels only on hover or selected — keeps the globe uncluttered
          entry.label.visible = show && (isHovered || isActive)

          if (!show) continue

          const isRunning = entry.site.status === "active"

          if (isHovered) {
            entry.glow.scale.setScalar(0.20)
          } else if (isRunning) {
            entry.glow.scale.setScalar(0.10 + 0.03 * Math.sin(t * 3))
          } else {
            entry.glow.scale.setScalar(0.10)
          }
        }

        // Geo feature label visibility (zoom-based + front-face)
        const camDist = camera.position.z
        for (const fl of featureLabelEntries) {
          const threshold = fl.type === 'mare' ? 2.7 : 2.2
          if (camDist > threshold) { fl.sprite.visible = false; continue }
          const wn = fl.normal.clone().applyMatrix4(moonGroup.matrixWorld).normalize()
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
            <span className="text-sm">月面マップを読み込み中...</span>
          </div>
        </div>
      )}

      {/* Hover tooltip */}
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

      {/* Zoom buttons */}
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
