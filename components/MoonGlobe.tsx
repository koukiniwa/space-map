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

export default function MoonGlobe({ sites, onSelectSite, paused, activeSite }: MoonGlobeProps) {
  const mountRef      = useRef<HTMLDivElement>(null)
  const zoomRef       = useRef({ in: () => {}, out: () => {} })
  const pausedRef     = useRef(false)
  const sphericalRef  = useRef({ theta: 0, phi: 0 })
  const targetRef     = useRef<{ theta: number; phi: number } | null>(null)
  const activeSiteRef = useRef<LandingSite | null>(null)
  const [loading, setLoading]           = useState(true)
  const [webglOk, setWebglOk]           = useState(true)
  const [hovered, setHovered]           = useState<{ site: LandingSite; x: number; y: number } | null>(null)
  const hoveredRef = useRef<LandingSite | null>(null)

  // Sync paused state into ref (readable from animation loop without re-init)
  useEffect(() => { pausedRef.current = !!paused }, [paused])
  useEffect(() => { activeSiteRef.current = activeSite ?? null }, [activeSite])

  // Compute target rotation when activeSite changes
  useEffect(() => {
    if (!activeSite) { targetRef.current = null; return }
    const phiGeo   = (90 - activeSite.lat) * Math.PI / 180
    const thetaGeo = (activeSite.lon + 180) * Math.PI / 180
    const px = -Math.sin(phiGeo) * Math.cos(thetaGeo)
    const py =  Math.cos(phiGeo)
    const pz =  Math.sin(phiGeo) * Math.sin(thetaGeo)
    // Y-rotation that brings site to +Z face
    const targetTheta = Math.atan2(-px, pz)
    // X-rotation (tilt) to center latitude
    const targetPhi   = Math.atan2(py, Math.sqrt(px * px + pz * pz))
    // Find shortest path from current theta
    const cur = sphericalRef.current
    let dTheta = targetTheta - cur.theta
    while (dTheta >  Math.PI) dTheta -= 2 * Math.PI
    while (dTheta < -Math.PI) dTheta += 2 * Math.PI
    targetRef.current = { theta: cur.theta + dTheta, phi: targetPhi }
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
      scene.add(new THREE.AmbientLight(0xffffff, 0.08))
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.0)
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
      const moonMat = new THREE.MeshPhongMaterial({
        map:      loadTex("/textures/moon.jpg"),
        bumpMap:  loadTex("/textures/moon-bump.jpg"),
        bumpScale: 0.8,
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

      // ── Build markers ──────────────────────────────────────
      interface MarkerEntry {
        dot:     THREE.Mesh
        ring:    THREE.Mesh
        glow:    THREE.Sprite
        label:   THREE.Sprite
        hitArea: THREE.Mesh   // invisible large sphere — the real click target
        site:    LandingSite
      }
      const markerEntries: MarkerEntry[] = []

      // Shared invisible material for hit areas
      const hitMat = new THREE.MeshBasicMaterial({ visible: false })

      for (const site of sites) {
        const pos    = latLonToVec3(site.lat, site.lon, 1.013)
        const posVec = new THREE.Vector3(pos.x, pos.y, pos.z)
        const normal = posVec.clone().normalize()
        const color  = STATUS_COLOR[site.status]

        // Glow disc (additive, no depth write)
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({
          map:      glowTex,
          color,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
          depthTest:  false,
        }))
        glow.scale.set(0.12, 0.12, 1)
        glow.position.copy(posVec)

        // Ring torus (lies tangent to sphere surface)
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.025, 0.004, 6, 32),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
        )
        ring.position.copy(posVec)
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)

        // Center dot (visual only)
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.012, 8, 6),
          new THREE.MeshBasicMaterial({ color })
        )
        dot.position.copy(posVec)

        // Label sprite
        const label = makeLabel(site)
        label.position.copy(normal.clone().multiplyScalar(1.22))

        // Large invisible hit sphere — covers dot + ring + label area
        // radius 0.12 ≈ ~80px click target at default zoom
        const hitArea = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), hitMat)
        hitArea.position.copy(normal.clone().multiplyScalar(1.08))
        hitArea.userData = { site }

        moonGroup.add(glow, ring, dot, label, hitArea)
        markerEntries.push({ dot, ring, glow, label, hitArea, site })
      }


      setLoading(false)

      // ── Interaction state ──────────────────────────────────
      let isDragging   = false
      let autoRotate   = true
      let prevMouse    = { x: 0, y: 0 }
      let mouseDownPos = { x: 0, y: 0 }
      const rotV      = { x: 0, y: 0 }
      // Use component-level ref so activeSite useEffect can read current angles
      const spherical = sphericalRef.current
      // Start facing the nearside of the Moon, with a slight globe-like tilt
      spherical.theta = -Math.PI / 2
      spherical.phi   = -0.35   // ~20° tilt like a classic globe
      moonGroup.rotation.y = spherical.theta
      moonGroup.rotation.x = spherical.phi
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
          spherical.phi   += dy * 0.005
          spherical.theta += dx * 0.005
          moonGroup.rotation.x = spherical.phi
          moonGroup.rotation.y = spherical.theta
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
        // Only raycast against front-facing markers (dot.visible is the front-face flag)
        const frontHitAreas = markerEntries.filter(m => m.dot.visible).map(m => m.hitArea)
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
        const frontHitAreas = markerEntries.filter(m => m.dot.visible).map(m => m.hitArea)
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
        spherical.phi   += dy * 0.005
        spherical.theta += dx * 0.005
        spherical.phi = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, spherical.phi))
        moonGroup.rotation.x = spherical.phi
        moonGroup.rotation.y = spherical.theta
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
          // Smoothly rotate globe to center the selected site
          const tgt = targetRef.current
          const LERP = 0.07
          const dTheta = tgt.theta - spherical.theta
          const dPhi   = tgt.phi   - spherical.phi
          spherical.theta += dTheta * LERP
          spherical.phi   += dPhi   * LERP
          spherical.phi    = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, spherical.phi))
          moonGroup.rotation.x = spherical.phi
          moonGroup.rotation.y = spherical.theta
          // Stop when close enough
          if (Math.abs(dTheta) < 0.002 && Math.abs(dPhi) < 0.002) {
            targetRef.current = null
          }
        } else if (autoRotate && !pausedRef.current) {
          moonGroup.rotation.y += 0.001
          spherical.theta = moonGroup.rotation.y
        } else if (!isDragging) {
          // Inertia: coast after drag release
          if (Math.abs(rotV.x) > 0.00005 || Math.abs(rotV.y) > 0.00005) {
            spherical.phi   += rotV.x
            spherical.theta += rotV.y
              moonGroup.rotation.x = spherical.phi
            moonGroup.rotation.y = spherical.theta
            rotV.x *= 0.93
            rotV.y *= 0.93
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
          entry.dot.visible   = show
          entry.ring.visible  = show
          entry.glow.visible  = show
          // Labels only on hover or selected — keeps the globe uncluttered
          entry.label.visible = show && (isHovered || isActive)

          if (!show) continue

          const isRunning = entry.site.status === "active"

          if (isHovered) {
            entry.ring.scale.setScalar(1.6)
            entry.glow.scale.setScalar(0.20)
          } else if (isRunning) {
            const pulse = 1 + 0.25 * Math.sin(t * 3)
            entry.ring.scale.setScalar(pulse)
            entry.glow.scale.setScalar(0.10 + 0.03 * Math.sin(t * 3))
          } else {
            entry.ring.scale.setScalar(1)
            entry.glow.scale.setScalar(0.10)
          }
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
