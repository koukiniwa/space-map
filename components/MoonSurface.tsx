'use client'

import { useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import { LandingSite } from '@/data/lunar-sites'
import { landingPOIs, LandingPOI } from '@/data/landing-poi'

interface MoonSurfaceProps {
  site: LandingSite
  onExit: () => void
}

// ── Per-site configuration ─────────────────────────────────────────────────────
// sunAz: degrees clockwise from north (0=N, 90=E, 180=S, 270=W)
// sunElev: degrees above horizon (low = long shadows, dramatic)
// terrainColor: hex, dark for mare basalt, light for highlands
// bumpScale: terrain roughness
interface SiteConfig {
  terrainColor: number
  sunAzDeg:     number
  sunElevDeg:   number
  bumpScale:    number
  description:  string
}

const SITE_CONFIGS: Record<string, SiteConfig> = {
  'apollo-11': {
    terrainColor: 0x8a8278, sunAzDeg: 110, sunElevDeg: 10, bumpScale: 0.20,
    description: '静かの海 – 暗色の玄武岩質平原。比較的平坦な地形。',
  },
  'apollo-12': {
    terrainColor: 0x858070, sunAzDeg: 125, sunElevDeg:  8, bumpScale: 0.25,
    description: '嵐の大洋 – 暗色の玄武岩質平原。サーベイヤー3号着陸地点に近い。',
  },
  'apollo-14': {
    terrainColor: 0x9c9485, sunAzDeg:  95, sunElevDeg: 12, bumpScale: 0.42,
    description: 'フラ・マウロ高地 – 明るい高地地形、起伏が多い。コーン・クレーターに向かって登る斜面。',
  },
  'apollo-15': {
    terrainColor: 0xa09080, sunAzDeg:  80, sunElevDeg:  7, bumpScale: 0.55,
    description: 'ハドリー・リル – アペニン山脈の麓、峡谷に隣接した最も険しい着陸地点。',
  },
  'apollo-16': {
    terrainColor: 0xb8b0a0, sunAzDeg:  90, sunElevDeg: 11, bumpScale: 0.48,
    description: 'デカルト高地 – 最も明るい着陸地点。白っぽい高地の角礫岩地帯。',
  },
  'apollo-17': {
    terrainColor: 0x807870, sunAzDeg: 105, sunElevDeg:  6, bumpScale: 0.38,
    description: 'タウルス・リットロウ谷 – 山に囲まれた谷底。最もドラマチックな地形。',
  },
  'luna-9': {
    terrainColor: 0x7e7870, sunAzDeg: 140, sunElevDeg:  5, bumpScale: 0.30,
    description: '嵐の大洋 – 月面初着陸地点。非常に低い太陽高度で長い影。',
  },
  'change-3': {
    terrainColor: 0x80786e, sunAzDeg:  90, sunElevDeg: 22, bumpScale: 0.22,
    description: '雨の海北部 – 比較的平坦な暗色の玄武岩質平原。',
  },
  'change-4': {
    terrainColor: 0x9a9285, sunAzDeg:  75, sunElevDeg: 18, bumpScale: 0.38,
    description: 'フォン・カルマン・クレーター（月の裏側） – 中程度の起伏を持つクレーター内部。',
  },
  'change-5': {
    terrainColor: 0x787270, sunAzDeg: 100, sunElevDeg: 26, bumpScale: 0.20,
    description: '呂姆克山近く – 高い太陽高度で明るい平坦な地形。',
  },
  'change-6': {
    terrainColor: 0x9c9488, sunAzDeg:  85, sunElevDeg: 16, bumpScale: 0.32,
    description: 'アポロ・クレーター内（月の裏側） – 南極エイトケン盆地の中。',
  },
  'chandrayaan-3': {
    terrainColor: 0xa09888, sunAzDeg: 125, sunElevDeg:  3, bumpScale: 0.58,
    description: '月の南極近く – 太陽高度が極端に低く、岩だらけで深い影が多い極地地形。',
  },
  'slim': {
    terrainColor: 0x8e8878, sunAzDeg: 115, sunElevDeg:  6, bumpScale: 0.36,
    description: 'シオリ・クレーター縁 – SLIM は斜面に逆さまで着陸。',
  },
  'nova-c-odysseus': {
    terrainColor: 0x9a9488, sunAzDeg: 130, sunElevDeg:  2, bumpScale: 0.60,
    description: '月の南極付近 – ほぼ地平線に沈む太陽。岩と影に覆われた極地地形。',
  },
}

const DEFAULT_CFG: SiteConfig = {
  terrainColor: 0x999080, sunAzDeg: 100, sunElevDeg: 10, bumpScale: 0.30,
  description: '',
}

export default function MoonSurface({ site, onExit }: MoonSurfaceProps) {
  const mountRef   = useRef<HTMLDivElement>(null)
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ label: string; desc: string; x: number; y: number } | null>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    let animationId: number
    let isDestroyed = false

    const init = async () => {
      const THREE = await import('three')
      if (isDestroyed) return

      const cfg = SITE_CONFIGS[site.id] ?? DEFAULT_CFG

      // ── Scene ──────────────────────────────────────────────────
      const scene = new THREE.Scene()

      const camera = new THREE.PerspectiveCamera(
        72,
        container.clientWidth / container.clientHeight,
        0.05,
        800000
      )
      const EYE_HEIGHT = 1.7
      // Start 14 m south of lander, facing north toward it
      camera.position.set(0, EYE_HEIGHT, 14)

      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      container.appendChild(renderer.domElement)

      // ── Sun direction from per-site config ──────────────────────
      // azimuth: 0=north(-Z), 90=east(+X), 180=south(+Z), 270=west(-X)
      const azR   = cfg.sunAzDeg   * Math.PI / 180
      const elevR = cfg.sunElevDeg * Math.PI / 180
      const SUN = new THREE.Vector3(
        Math.sin(azR) * Math.cos(elevR),
        Math.sin(elevR),
        -Math.cos(azR) * Math.cos(elevR)
      ).normalize()

      const sunLight = new THREE.DirectionalLight(0xfff8e8, 2.8)
      sunLight.position.copy(SUN).multiplyScalar(50000)
      sunLight.castShadow = true
      sunLight.shadow.mapSize.set(2048, 2048)
      sunLight.shadow.camera.near = 1
      sunLight.shadow.camera.far  = 200000
      sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -300
      sunLight.shadow.camera.right = sunLight.shadow.camera.top   =  300
      scene.add(sunLight)

      // Very faint fill (no atmosphere on moon)
      scene.add(new THREE.AmbientLight(0x0d1a2e, 0.4))

      // Sun sphere at correct position in sky
      const sunMesh = new THREE.Mesh(
        new THREE.SphereGeometry(900, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xfffce8 })
      )
      sunMesh.position.copy(SUN).multiplyScalar(380000)
      scene.add(sunMesh)
      const glowMesh = new THREE.Mesh(
        new THREE.SphereGeometry(2200, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.12, depthWrite: false })
      )
      glowMesh.position.copy(sunMesh.position)
      scene.add(glowMesh)

      // ── Stars + Milky Way ────────────────────────────────────────
      {
        const R = 600000
        const count = 6000
        const pos = new Float32Array(count * 3)
        const col = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
          const theta = Math.random() * Math.PI * 2
          const phi   = Math.acos(2 * Math.random() - 1)
          pos[i*3]   = R * Math.sin(phi) * Math.cos(theta)
          pos[i*3+1] = R * Math.sin(phi) * Math.sin(theta)
          pos[i*3+2] = R * Math.cos(phi)
          const t = Math.random()
          col[i*3]   = 0.85 + t * 0.15
          col[i*3+1] = 0.85 + (1-t) * 0.10
          col[i*3+2] = 0.90 + t * 0.10
        }
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
        geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))
        scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 120, sizeAttenuation: true, vertexColors: true })))

        // Milky Way band — denser dimmer stars along a tilted great circle
        const mwCount = 4000
        const mwPos = new Float32Array(mwCount * 3)
        const mwCol = new Float32Array(mwCount * 3)
        const bandAxis = new THREE.Vector3(0.8, 0.6, 0).normalize()
        for (let i = 0; i < mwCount; i++) {
          const angle  = Math.random() * Math.PI * 2
          const spread = (Math.random() + Math.random() - 1) * 0.22
          const v = new THREE.Vector3(Math.cos(angle), spread, Math.sin(angle)).normalize()
          v.applyAxisAngle(bandAxis, 0.9)
          const r = R * 0.96
          mwPos[i*3]   = v.x * r
          mwPos[i*3+1] = v.y * r
          mwPos[i*3+2] = v.z * r
          const b = 0.25 + Math.random() * 0.45
          mwCol[i*3]   = b
          mwCol[i*3+1] = b * 0.9
          mwCol[i*3+2] = b * 0.82
        }
        const mwGeo = new THREE.BufferGeometry()
        mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPos, 3))
        mwGeo.setAttribute('color',    new THREE.BufferAttribute(mwCol, 3))
        scene.add(new THREE.Points(mwGeo, new THREE.PointsMaterial({ size: 80, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.55 })))
      }

      // ── Earth (position from site lat/lon) ───────────────────────
      const latR = site.lat * Math.PI / 180
      const lonR = site.lon * Math.PI / 180
      const earthElev = Math.PI / 2 - Math.acos(Math.max(-1, Math.min(1, Math.cos(latR) * Math.cos(lonR))))
      const earthAz = Math.atan2(Math.sin(lonR), Math.sin(latR) * Math.cos(lonR))
      const ED = 380000
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(5100, 48, 48),
        new THREE.MeshPhongMaterial({ color: 0x1a3f7a })
      )
      earth.position.set(
        ED * Math.sin(earthAz)   * Math.cos(earthElev),
        ED * Math.sin(earthElev),
        -ED * Math.cos(earthAz) * Math.cos(earthElev)
      )
      const loader = new THREE.TextureLoader()
      loader.load('/textures/earth.jpg', tex => {
        ;(earth.material as THREE.MeshPhongMaterial).map = tex
        ;(earth.material as THREE.MeshPhongMaterial).needsUpdate = true
      })
      scene.add(earth)

      // ── Terrain ─────────────────────────────────────────────────
      const terrainSize = 600
      const terrainGeo  = new THREE.PlaneGeometry(terrainSize, terrainSize, 512, 512)
      terrainGeo.rotateX(-Math.PI / 2)
      const terrainMat = new THREE.MeshPhongMaterial({
        color: cfg.terrainColor,
        shininess: 1,
      })
      const maxAniso = renderer.capabilities.getMaxAnisotropy()

      loader.load('/textures/moon.jpg', tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(14, 14)
        tex.anisotropy = maxAniso
        terrainMat.map = tex
        terrainMat.needsUpdate = true
      })
      loader.load('/textures/moon-bump.jpg', tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(14, 14)
        tex.anisotropy = maxAniso
        terrainMat.bumpMap   = tex
        terrainMat.bumpScale = cfg.bumpScale
        terrainMat.needsUpdate = true
      })

      const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat)
      terrainMesh.receiveShadow = true
      scene.add(terrainMesh)

      // ── Rocks ────────────────────────────────────────────────────
      // Rock density and size vary with site roughness
      const rockCount = Math.floor(120 + cfg.bumpScale * 200)
      const rockMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(cfg.terrainColor).multiplyScalar(0.85), shininess: 1 })
      const rockShapes = [
        new THREE.DodecahedronGeometry(1, 0),
        new THREE.DodecahedronGeometry(1, 1),
        new THREE.IcosahedronGeometry(1, 0),
      ]
      for (let i = 0; i < rockCount; i++) {
        // More rocks = bigger rocks for rougher sites
        const maxSize = 0.15 + cfg.bumpScale * 3.0
        const size = 0.08 + Math.random() * maxSize
        const geo  = rockShapes[Math.floor(Math.random() * rockShapes.length)]
        const rock = new THREE.Mesh(geo, rockMat)
        const angle = Math.random() * Math.PI * 2
        const dist  = 3 + Math.random() * 220
        rock.position.set(Math.cos(angle) * dist, size * 0.4, Math.sin(angle) * dist)
        rock.scale.set(size * (0.8 + Math.random() * 0.4), size * (0.4 + Math.random() * 0.5), size * (0.8 + Math.random() * 0.4))
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
        rock.castShadow = true
        rock.receiveShadow = true
        scene.add(rock)
      }

      // ── Helper: cylinder strut ────────────────────────────────────
      const makeLeg = (
        from: THREE.Vector3, to: THREE.Vector3,
        radius: number, mat: THREE.Material
      ): THREE.Mesh => {
        const dir = new THREE.Vector3().subVectors(to, from)
        const len = dir.length()
        const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)
        const geo = new THREE.CylinderGeometry(radius, radius, len, 6)
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.copy(mid)
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
        mesh.castShadow = true
        return mesh
      }

      // ── Helper: canvas sprite label ───────────────────────────────
      const makeLabel = (text: string, color = '#ffffff'): THREE.Sprite => {
        const canvas = document.createElement('canvas')
        canvas.width = 512; canvas.height = 128
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, 512, 128)
        ctx.fillStyle = 'rgba(0,0,0,0.60)'
        ctx.beginPath()
        ctx.roundRect(4, 20, 504, 88, 12)
        ctx.fill()
        ctx.font = 'bold 46px monospace'
        ctx.fillStyle = color
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, 256, 64)
        const tex = new THREE.CanvasTexture(canvas)
        const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
        const sprite = new THREE.Sprite(mat)
        sprite.scale.set(9, 2.25, 1)
        return sprite
      }

      // ── Lander materials ──────────────────────────────────────────
      const metalMat  = new THREE.MeshPhongMaterial({ color: 0xd0cec0, shininess: 50 })
      const goldMat   = new THREE.MeshPhongMaterial({ color: 0xc8943a, shininess: 60 })
      const darkMat   = new THREE.MeshPhongMaterial({ color: 0x3a3830, shininess: 5 })
      const silverMat = new THREE.MeshPhongMaterial({ color: 0xaaa898, shininess: 90 })
      const solarMat  = new THREE.MeshPhongMaterial({ color: 0x1a2e6e, shininess: 60 })

      // ── Lander builders ───────────────────────────────────────────
      const createApolloLM = (): THREE.Group => {
        const g = new THREE.Group()
        // Descent stage
        const descent = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 1.2, 8), goldMat)
        descent.position.y = 1.15
        descent.castShadow = true; g.add(descent)
        // Ascent stage
        const ascent = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.55, 1.7, 8), metalMat)
        ascent.position.y = 2.7
        ascent.castShadow = true; g.add(ascent)
        // Dome
        const dome = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), metalMat)
        dome.position.y = 3.55
        dome.castShadow = true; g.add(dome)
        // Rendezvous window panel
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.05), new THREE.MeshPhongMaterial({ color: 0x334455, shininess: 120 }))
        win.position.set(0, 3.0, -1.38); g.add(win)
        // 4 landing legs
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4
          const fX = Math.cos(a) * 4.0, fZ = Math.sin(a) * 4.0
          const hip  = new THREE.Vector3(Math.cos(a) * 2.1, 1.0, Math.sin(a) * 2.1)
          const foot = new THREE.Vector3(fX, 0.05, fZ)
          g.add(makeLeg(hip, foot, 0.08, darkMat))
          // Cross struts
          g.add(makeLeg(new THREE.Vector3(Math.cos(a + 0.35) * 2.1, 1.3, Math.sin(a + 0.35) * 2.1), foot, 0.055, darkMat))
          g.add(makeLeg(new THREE.Vector3(Math.cos(a - 0.35) * 2.1, 1.3, Math.sin(a - 0.35) * 2.1), foot, 0.055, darkMat))
          // Foot pad
          const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.09, 10), darkMat)
          pad.position.set(fX, 0.045, fZ); g.add(pad)
        }
        // Engine nozzle
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.0, 0.9, 10), darkMat)
        nozzle.position.y = 0.5; g.add(nozzle)
        // Quad-antenna dish
        const antBase = new THREE.Vector3(0.0,  3.6, -1.0)
        const antTip  = new THREE.Vector3(0.0,  5.8, -1.0)
        g.add(makeLeg(antBase, antTip, 0.04, silverMat))
        const dish = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), silverMat)
        dish.position.copy(antTip); dish.rotation.x = Math.PI; g.add(dish)
        // VHF antenna (thin rod)
        g.add(makeLeg(new THREE.Vector3(1.2, 3.4, 0), new THREE.Vector3(1.2, 5.5, 0), 0.025, silverMat))
        return g
      }

      const createLuna9 = (): THREE.Group => {
        const g = new THREE.Group()
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 16), metalMat)
        body.position.y = 0.65; body.castShadow = true; g.add(body)
        // 4 petal antennas folded open
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2
          const petal = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.55), goldMat)
          petal.position.set(Math.cos(a) * 0.52, 0.65, Math.sin(a) * 0.52)
          petal.rotation.y = a; g.add(petal)
        }
        // Camera mast
        g.add(makeLeg(new THREE.Vector3(0, 0.65, 0), new THREE.Vector3(0, 1.5, 0), 0.035, silverMat))
        const cam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), darkMat)
        cam.position.set(0, 1.6, 0); g.add(cam)
        return g
      }

      const createChangE = (): THREE.Group => {
        const g = new THREE.Group()
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 1.9), goldMat)
        body.position.y = 1.55; body.castShadow = true; g.add(body)
        const top  = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 1.3), metalMat)
        top.position.y = 2.35; g.add(top)
        // 4 legs
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4
          const fX = Math.cos(a) * 2.8, fZ = Math.sin(a) * 2.8
          const hip  = new THREE.Vector3(Math.cos(a) * 0.95, 1.0, Math.sin(a) * 0.95)
          const foot = new THREE.Vector3(fX, 0.05, fZ)
          g.add(makeLeg(hip, foot, 0.08, darkMat))
          const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.07, 8), darkMat)
          pad.position.set(fX, 0.035, fZ); g.add(pad)
        }
        // Engine
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.65, 0.75, 10), darkMat)
        nozzle.position.y = 0.55; g.add(nozzle)
        // Solar panels
        for (const side of [-1, 1]) {
          const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 1.0), solarMat)
          panel.position.set(side * 2.25, 2.3, 0); g.add(panel)
        }
        // Dish antenna
        g.add(makeLeg(new THREE.Vector3(0, 2.6, 0), new THREE.Vector3(0, 3.8, 0), 0.04, silverMat))
        const dish = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), silverMat)
        dish.position.set(0, 3.9, 0); dish.rotation.x = -Math.PI / 3; g.add(dish)
        return g
      }

      const createSLIM = (): THREE.Group => {
        // SLIM landed nose-first sideways, so show it tilted
        const g = new THREE.Group()
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 1.4), metalMat)
        body.position.y = 0.6; body.castShadow = true; g.add(body)
        const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 0.55, 8), darkMat)
        engine.position.set(0, 0.3, 0); g.add(engine)
        // Solar panels (facing wrong direction - the real quirk of SLIM)
        for (const side of [-1, 1]) {
          const panel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, 0.9), solarMat)
          panel.position.set(side * 1.4, 0.9, 0); g.add(panel)
        }
        // Tilt to reflect awkward landing pose
        g.rotation.z = 0.3
        return g
      }

      const createGenericLander = (): THREE.Group => {
        const g = new THREE.Group()
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 1.4, 8), metalMat)
        body.position.y = 1.5; body.castShadow = true; g.add(body)
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 0.6, 8), darkMat)
        top.position.y = 2.4; g.add(top)
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2
          const fX = Math.cos(a) * 2.0, fZ = Math.sin(a) * 2.0
          g.add(makeLeg(new THREE.Vector3(Math.cos(a) * 0.9, 0.9, Math.sin(a) * 0.9), new THREE.Vector3(fX, 0.05, fZ), 0.06, darkMat))
          const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 8), darkMat)
          pad.position.set(fX, 0.03, fZ); g.add(pad)
        }
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 0.6, 8), darkMat)
        nozzle.position.y = 0.4; g.add(nozzle)
        for (const side of [-1, 1]) {
          const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.8), solarMat)
          panel.position.set(side * 1.6, 1.9, 0); g.add(panel)
        }
        return g
      }

      const createLander = (id: string): THREE.Group => {
        if (id.startsWith('apollo')) return createApolloLM()
        if (id === 'luna-9')        return createLuna9()
        if (id.startsWith('change')) return createChangE()
        if (id === 'slim')          return createSLIM()
        return createGenericLander()
      }

      const landerGroup = createLander(site.id)
      scene.add(landerGroup)

      // ── POI markers ──────────────────────────────────────────────
      const typeColor: Record<string, string> = {
        flag:       '#f4f4ff',
        rover:      '#ffcc44',
        instrument: '#44ccff',
        crater:     '#cc88ff',
        equipment:  '#88ff88',
        lander:     '#ffaa44',
      }

      const MAX_DISPLAY = 220
      const poiMeshes: Array<{ mesh: THREE.Mesh; poi: LandingPOI }> = []

      for (const poi of (landingPOIs[site.id] ?? [])) {
        const dist = Math.sqrt(poi.x * poi.x + poi.z * poi.z)
        const isFar = dist > MAX_DISPLAY
        const px = isFar ? poi.x * MAX_DISPLAY / dist : poi.x
        const pz = isFar ? poi.z * MAX_DISPLAY / dist : poi.z
        const label = isFar ? `${poi.label} →${(dist / 1000).toFixed(1)}km` : poi.label
        const color = typeColor[poi.type] ?? '#ffffff'

        // Pole
        scene.add(makeLeg(new THREE.Vector3(px, 0, pz), new THREE.Vector3(px, 2.5, pz), 0.04,
          new THREE.MeshBasicMaterial({ color })))
        // Ball
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.20, 8, 8), new THREE.MeshBasicMaterial({ color }))
        ball.position.set(px, 2.75, pz)
        ball.userData = { poi }
        scene.add(ball)
        poiMeshes.push({ mesh: ball, poi })
        // Label sprite
        const sprite = makeLabel(label, color)
        sprite.position.set(px, 4.8, pz)
        scene.add(sprite)
      }

      setLoading(false)

      // ── Camera initial orientation: look at lander ───────────────
      // Camera is at (0, 1.7, 14) – face north (yaw = π so we look in -Z direction)
      let yaw   = Math.PI   // face north (-Z) toward lander at origin
      let pitch = -0.08     // slightly downward to see lander base

      // ── Controls ─────────────────────────────────────────────────
      const keys: Record<string, boolean> = {}
      const SPEED = 4     // m/s
      const SENS  = 0.003
      let lastTime = performance.now()

      let pointerDown = false
      let lastPointer = { x: 0, y: 0 }

      const onPointerDown = (e: PointerEvent) => {
        if ((e.target as HTMLElement).tagName !== 'CANVAS') return
        pointerDown = true
        lastPointer = { x: e.clientX, y: e.clientY }
        renderer.domElement.setPointerCapture(e.pointerId)
      }
      const onPointerMove = (e: PointerEvent) => {
        if (!pointerDown) return
        yaw   -= (e.clientX - lastPointer.x) * SENS
        pitch -= (e.clientY - lastPointer.y) * SENS
        pitch  = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch))
        lastPointer = { x: e.clientX, y: e.clientY }
      }
      const onPointerUp = (e: PointerEvent) => {
        pointerDown = false
        // POI click
        const rect = container.getBoundingClientRect()
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width)  * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        )
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(ndc, camera)
        const hits = raycaster.intersectObjects(poiMeshes.map(p => p.mesh))
        if (hits.length > 0) {
          const hit = poiMeshes.find(p => p.mesh === hits[0].object)
          if (hit) setTooltip({ label: hit.poi.label, desc: hit.poi.description, x: e.clientX - rect.left, y: e.clientY - rect.top })
        } else {
          setTooltip(null)
        }
      }

      const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true }
      const onKeyUp   = (e: KeyboardEvent) => { keys[e.code] = false }

      renderer.domElement.addEventListener('pointerdown', onPointerDown)
      renderer.domElement.addEventListener('pointermove', onPointerMove)
      renderer.domElement.addEventListener('pointerup',   onPointerUp)
      document.addEventListener('keydown', onKeyDown)
      document.addEventListener('keyup',   onKeyUp)

      const onResize = () => {
        camera.aspect = container.clientWidth / container.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(container.clientWidth, container.clientHeight)
      }
      window.addEventListener('resize', onResize)

      // ── Animation loop ────────────────────────────────────────────
      const euler = new THREE.Euler(0, 0, 0, 'YXZ')
      const dir   = new THREE.Vector3()
      const right = new THREE.Vector3()
      const UP    = new THREE.Vector3(0, 1, 0)

      const animate = () => {
        animationId = requestAnimationFrame(animate)
        const now = performance.now()
        const dt  = Math.min((now - lastTime) / 1000, 0.05)
        lastTime  = now

        euler.set(pitch, yaw, 0, 'YXZ')
        camera.quaternion.setFromEuler(euler)

        camera.getWorldDirection(dir)
        dir.y = 0; dir.normalize()
        right.crossVectors(dir, UP).normalize()

        if (keys['KeyW'] || keys['ArrowUp'])    camera.position.addScaledVector(dir,    SPEED * dt)
        if (keys['KeyS'] || keys['ArrowDown'])  camera.position.addScaledVector(dir,   -SPEED * dt)
        if (keys['KeyA'] || keys['ArrowLeft'])  camera.position.addScaledVector(right, -SPEED * dt)
        if (keys['KeyD'] || keys['ArrowRight']) camera.position.addScaledVector(right,  SPEED * dt)
        camera.position.y = EYE_HEIGHT

        earth.rotation.y += 0.00008

        // ── Mini-map ───────────────────────────────────────────
        const mc = minimapRef.current
        if (mc) {
          const ctx2 = mc.getContext('2d')
          if (ctx2) {
            const W = mc.width, H = mc.height
            const SCALE = 0.55   // pixels per metre
            const cx = camera.position.x
            const cz = camera.position.z

            ctx2.clearRect(0, 0, W, H)
            ctx2.fillStyle = 'rgba(0,0,0,0.72)'
            ctx2.fillRect(0, 0, W, H)

            // Faint grid (every 50 m)
            ctx2.strokeStyle = 'rgba(255,255,255,0.06)'
            ctx2.lineWidth = 1
            const gridSpacing = 50 * SCALE
            const ox = ((W / 2) - cx * SCALE) % gridSpacing
            const oz = ((H / 2) + cz * SCALE) % gridSpacing  // +Z because canvas Y flipped
            for (let x = ox; x < W; x += gridSpacing) { ctx2.beginPath(); ctx2.moveTo(x, 0); ctx2.lineTo(x, H); ctx2.stroke() }
            for (let z = oz; z < H; z += gridSpacing) { ctx2.beginPath(); ctx2.moveTo(0, z); ctx2.lineTo(W, z); ctx2.stroke() }

            // Lander at world (0,0)
            const lx = W / 2 - cx * SCALE
            const lz = H / 2 + cz * SCALE
            ctx2.fillStyle = '#fbbf24'
            ctx2.beginPath(); ctx2.arc(lx, lz, 4, 0, Math.PI * 2); ctx2.fill()
            ctx2.strokeStyle = '#fbbf24'
            ctx2.lineWidth = 1
            ctx2.strokeRect(lx - 6, lz - 6, 12, 12)

            // POIs
            for (const { poi } of poiMeshes) {
              const px = W / 2 + (poi.x - cx) * SCALE
              const pz = H / 2 + (poi.z - cz) * SCALE
              if (px < 2 || px > W - 2 || pz < 2 || pz > H - 2) continue
              ctx2.fillStyle = typeColor[poi.type] ?? '#fff'
              ctx2.beginPath(); ctx2.arc(px, pz, 2.5, 0, Math.PI * 2); ctx2.fill()
            }

            // Camera (always centre, with direction arrow)
            ctx2.fillStyle = '#ffffff'
            ctx2.beginPath(); ctx2.arc(W / 2, H / 2, 3.5, 0, Math.PI * 2); ctx2.fill()
            // Direction cone
            const fwdX =  Math.sin(yaw)
            const fwdZ = -Math.cos(yaw)  // yaw=0 faces -Z
            ctx2.strokeStyle = '#ffffff'
            ctx2.lineWidth = 1.5
            ctx2.beginPath()
            ctx2.moveTo(W / 2, H / 2)
            ctx2.lineTo(W / 2 + fwdX * 14, H / 2 + fwdZ * 14)
            ctx2.stroke()

            // Scale bar (50 m)
            const barPx = 50 * SCALE
            ctx2.fillStyle = 'rgba(255,255,255,0.5)'
            ctx2.fillRect(6, H - 8, barPx, 2)
            ctx2.font = '8px monospace'
            ctx2.fillStyle = 'rgba(255,255,255,0.4)'
            ctx2.fillText('50m', 6, H - 11)

            // Border
            ctx2.strokeStyle = 'rgba(255,255,255,0.15)'
            ctx2.lineWidth = 1
            ctx2.strokeRect(0, 0, W, H)
          }
        }

        renderer.render(scene, camera)
      }
      animate()

      return () => {
        isDestroyed = true
        cancelAnimationFrame(animationId)
        renderer.domElement.removeEventListener('pointerdown', onPointerDown)
        renderer.domElement.removeEventListener('pointermove', onPointerMove)
        renderer.domElement.removeEventListener('pointerup',   onPointerUp)
        document.removeEventListener('keydown', onKeyDown)
        document.removeEventListener('keyup',   onKeyUp)
        window.removeEventListener('resize', onResize)
        renderer.dispose()
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      }
    }

    const cleanupPromise = init()
    return () => {
      isDestroyed = true
      cleanupPromise.then(c => c?.())
    }
  }, [site])

  return (
    <div className="relative w-full h-full bg-black font-mono select-none">

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
          <div className="flex flex-col items-center gap-4 text-zinc-400">
            <div className="w-10 h-10 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
            <span className="text-sm tracking-widest">{site.name} へ降下中...</span>
          </div>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={onExit}
        className="absolute top-4 left-4 z-30 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-400 px-3 py-1.5 rounded transition-colors bg-black/70"
      >
        ← 月面マップに戻る
      </button>

      {/* Site info */}
      <div className="absolute top-4 right-4 z-30 text-xs text-zinc-500 text-right leading-relaxed max-w-[240px]">
        <div className="text-zinc-300 font-bold text-sm">{site.name}</div>
        <div>
          {site.lat >= 0 ? `N${site.lat}°` : `S${Math.abs(site.lat)}°`},{' '}
          {site.lon >= 0 ? `E${site.lon}°` : `W${Math.abs(site.lon)}°`}
        </div>
        <div>{site.year}年 · {site.country}</div>
        {SITE_CONFIGS[site.id] && (
          <div className="text-zinc-600 mt-1 text-[10px] leading-snug">{SITE_CONFIGS[site.id].description}</div>
        )}
      </div>

      {/* POI Tooltip */}
      {tooltip && (
        <div
          className="absolute z-40 max-w-xs bg-black/90 border border-zinc-600 rounded p-3 text-xs pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div className="text-white font-bold mb-1">{tooltip.label}</div>
          <div className="text-zinc-400 leading-relaxed">{tooltip.desc}</div>
        </div>
      )}

      {/* Controls hint */}
      {!loading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 text-xs text-zinc-600 tracking-widest whitespace-nowrap">
          ドラッグで視点変更 &nbsp;·&nbsp; WASD で移動 &nbsp;·&nbsp; マーカークリックで情報
        </div>
      )}

      {/* Mini-map */}
      {!loading && (
        <div className="absolute bottom-12 right-4 z-30">
          <canvas
            ref={minimapRef}
            width={160}
            height={160}
            className="rounded opacity-80 hover:opacity-100 transition-opacity"
            title="ミニマップ（黄色=着陸船 / 白=カメラ方向）"
          />
        </div>
      )}

      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  )
}
