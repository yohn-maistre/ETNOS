<script lang="ts">
  // 3D object & Gaussian Splat viewer (Penampil): renders .glb meshes and .spz / .ply 3D Gaussian Splats
  // in plain WebGL (zero heavy 3D engine), plus clickable 3D spatial pins linked to Kamus words and notes.
  import { onMount } from 'svelte'
  import { MapPin, Minus, Plus, RotateCcw, X } from '@lucide/svelte'
  import { parseGlb, type Model } from './glb.ts'
  import { parsePly, parseSpz, type SplatCloud } from './splat.ts'
  import { sizeLabel, type ViewerObject } from '../viewer-data.ts'
  import { request } from '../api'

  type SpatialPin = {
    id: string
    targetId: string
    x: number
    y: number
    z: number
    label: string
    note: string
    kamusWord: string
    voiceClipId: string | null
    authorName: string
    created: number
    canDelete: boolean
  }

  let { object }: { object: ViewerObject } = $props()
  const spec = $derived(object.model!)

  let canvas = $state<HTMLCanvasElement>(),
    phase = $state<'loading' | 'ready' | 'failed' | 'nogl'>('loading'),
    progress = $state(0),
    light = $state<'kamera' | 'atas'>('kamera'),
    model = $state<Model | null>(null),
    splat = $state<SplatCloud | null>(null),
    pins = $state<SpatialPin[]>([]),
    projected = $state<(SpatialPin & { sx: number; sy: number; visible: boolean })[]>([]),
    activePin = $state<SpatialPin | null>(null),
    addingPin = $state(false),
    draftLabel = $state(''),
    draftWord = $state(''),
    draftNote = $state(''),
    pinBusy = $state(false),
    pinMsg = $state('')

  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
  let meshProg: WebGLProgram | null = null
  let splatProg: WebGLProgram | null = null
  let splatBuffers: { pos: WebGLBuffer; col: WebGLBuffer; rad: WebGLBuffer; count: number } | null = null
  let draws: { vbo: WebGLBuffer[]; ibo: WebGLBuffer | null; count: number; type: number; tex: WebGLTexture | null; color: number[]; hasUv: boolean; hasN: boolean; double: boolean }[] = []
  let yaw = 0.6, pitch = 0.25, dist = 2.6, raf = 0, drag: [number, number] | null = null
  let center = [0, 0, 0], radius = 1
  const pointers = new Map<number, [number, number]>()
  let pinch = 0

  const MESH_VS = `attribute vec3 p; attribute vec3 n; attribute vec2 t; uniform mat4 vp; varying vec3 vn; varying vec2 vt; varying vec3 vw;
    void main() { vn = n; vt = t; vw = p; gl_Position = vp * vec4(p, 1.0); }`
  const MESH_FS = `precision mediump float; varying vec3 vn; varying vec2 vt; varying vec3 vw; uniform sampler2D tex; uniform vec4 color; uniform float useTex; uniform float useN;
    uniform vec3 light; uniform vec3 eye;
    void main() {
      vec4 base = color * mix(vec4(1.0), texture2D(tex, vt), useTex);
      vec3 N = normalize(mix(vec3(0.0, 1.0, 0.0), vn, useN));
      vec3 V = normalize(eye - vw);
      if (dot(N, V) < 0.0) N = -N;
      float diff = max(dot(N, normalize(light)), 0.0);
      float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.12;
      vec3 c = base.rgb * (0.38 + 0.72 * diff) + rim;
      gl_FragColor = vec4(c, base.a);
    }`

  const SPLAT_VS = `attribute vec3 p; attribute vec4 c; attribute float r; uniform mat4 vp; uniform float focal; varying vec4 vc;
    void main() {
      vc = c;
      vec4 clip = vp * vec4(p, 1.0);
      gl_Position = clip;
      float depth = max(0.05, clip.w);
      gl_PointSize = clamp((r * focal) / depth, 2.0, 42.0);
    }`
  const SPLAT_FS = `precision mediump float; varying vec4 vc;
    void main() {
      vec2 d = gl_PointCoord * 2.0 - 1.0;
      float r2 = dot(d, d);
      if (r2 > 1.0) discard;
      float g = exp(-3.6 * r2) * vc.a;
      if (g < 0.02) discard;
      gl_FragColor = vec4(vc.rgb * g, g);
    }`

  async function loadPins() {
    try {
      const res = await request<{ pins: SpatialPin[] }>('/v1/viewer/' + encodeURIComponent(object.id) + '/pins', undefined, undefined, true)
      pins = res.pins ?? []
      wake()
    } catch {
      pins = []
    }
  }

  async function submitPin() {
    if (!draftLabel.trim() || pinBusy) return
    pinBusy = true; pinMsg = ''
    try {
      // Place pin along the current view ray at the object surface radius from center.
      const x = center[0] + Math.cos(pitch) * Math.sin(yaw) * radius * 0.65
      const y = center[1] + Math.sin(pitch) * radius * 0.65
      const z = center[2] + Math.cos(pitch) * Math.cos(yaw) * radius * 0.65
      const created = await request<SpatialPin>('/v1/viewer/' + encodeURIComponent(object.id) + '/pins', {
        x, y, z,
        label: draftLabel.trim(),
        kamusWord: draftWord.trim(),
        note: draftNote.trim(),
      })
      pins = [...pins, created]
      activePin = created
      addingPin = false
      draftLabel = ''; draftWord = ''; draftNote = ''
      wake()
    } catch (e) {
      pinMsg = e instanceof Error ? e.message : 'Masuk terlebih dahulu untuk menambahkan titik 3D.'
    } finally {
      pinBusy = false
    }
  }

  function detectFormat(bytes: Uint8Array, headerFmt: string | null): 'glb' | 'spz' | 'ply' {
    if (headerFmt === 'spz' || headerFmt === 'ply' || headerFmt === 'glb') return headerFmt
    if (bytes.length >= 4 && bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) return 'glb'
    if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) return 'spz'
    if (bytes.length >= 4 && bytes[0] === 0x70 && bytes[1] === 0x6c && bytes[2] === 0x79) return 'ply'
    if (spec.src.toLowerCase().endsWith('.spz')) return 'spz'
    if (spec.src.toLowerCase().endsWith('.ply')) return 'ply'
    return 'glb'
  }

  async function load() {
    phase = 'loading'; progress = 0; model = null; splat = null; splatBuffers = null; draws = []
    try {
      const res = await fetch(spec.src)
      if (!res.ok || !res.body) throw new Error(String(res.status))
      const total = Number(res.headers.get('content-length')) || spec.bytes || 1, reader = res.body.getReader(), parts: Uint8Array[] = []
      let got = 0
      for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; progress = Math.min(1, got / total) }
      const buf = new Uint8Array(got); let o = 0
      for (const p of parts) { buf.set(p, o); o += p.length }
      const fmt = detectFormat(buf, res.headers.get('x-etnos-3d-format'))
      if (fmt === 'glb') {
        model = parseGlb(buf.buffer)
        await uploadMesh(model)
      } else {
        splat = fmt === 'spz' ? await parseSpz(buf.buffer) : parsePly(buf.buffer)
        uploadSplat(splat)
      }
      phase = 'ready'
      wake()
    } catch (e) {
      phase = e instanceof Error && e.message === 'nogl' ? 'nogl' : 'failed'
    }
  }

  function ensureGl() {
    if (!canvas) throw new Error('nogl')
    if (!gl) gl = canvas.getContext('webgl2', { antialias: true, alpha: true }) ?? canvas.getContext('webgl', { antialias: true, alpha: true })
    if (!gl) throw new Error('nogl')
    return gl
  }

  function compileProgram(g: WebGLRenderingContext | WebGL2RenderingContext, vs: string, fs: string) {
    const sh = (type: number, src: string) => { const s = g.createShader(type)!; g.shaderSource(s, src); g.compileShader(s); return s }
    const prog = g.createProgram()!
    g.attachShader(prog, sh(g.VERTEX_SHADER, vs)); g.attachShader(prog, sh(g.FRAGMENT_SHADER, fs)); g.linkProgram(prog)
    return prog
  }

  function uploadSplat(cloud: SplatCloud) {
    const g = ensureGl()
    splatProg = compileProgram(g, SPLAT_VS, SPLAT_FS)
    const mkBuf = (data: Float32Array) => { const b = g.createBuffer()!; g.bindBuffer(g.ARRAY_BUFFER, b); g.bufferData(g.ARRAY_BUFFER, data, g.STATIC_DRAW); return b }
    splatBuffers = { pos: mkBuf(cloud.positions), col: mkBuf(cloud.colors), rad: mkBuf(cloud.radii), count: cloud.count }
    center = [0, 1, 2].map((c) => (cloud.min[c] + cloud.max[c]) / 2)
    radius = Math.max(1e-6, Math.hypot(cloud.max[0] - cloud.min[0], cloud.max[1] - cloud.min[1], cloud.max[2] - cloud.min[2]) / 2)
  }

  async function uploadMesh(m: Model) {
    const g = ensureGl()
    meshProg = compileProgram(g, MESH_VS, MESH_FS)
    const big = g instanceof WebGL2RenderingContext || !!g.getExtension('OES_element_index_uint')
    draws = []
    for (const mesh of m.meshes) {
      const buf = (data: ArrayBufferView, target: number = g.ARRAY_BUFFER) => { const b = g.createBuffer()!; g.bindBuffer(target, b); g.bufferData(target, data, g.STATIC_DRAW); return b }
      const vbo = [buf(mesh.positions), buf(mesh.normals ?? new Float32Array(mesh.positions.length)), buf(mesh.uvs ?? new Float32Array((mesh.positions.length / 3) * 2))]
      let ibo: WebGLBuffer | null = null, count = mesh.positions.length / 3, type: number = g.UNSIGNED_SHORT
      if (mesh.indices) {
        if (mesh.indices instanceof Uint32Array && !big) continue
        ibo = buf(mesh.indices, g.ELEMENT_ARRAY_BUFFER); count = mesh.indices.length; type = mesh.indices instanceof Uint32Array ? g.UNSIGNED_INT : g.UNSIGNED_SHORT
      }
      let tex: WebGLTexture | null = null
      if (mesh.texture) {
        const bitmap = await createImageBitmap(mesh.texture, { imageOrientation: 'none' } as ImageBitmapOptions)
        tex = g.createTexture()
        g.bindTexture(g.TEXTURE_2D, tex)
        g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false)
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, bitmap)
        const pow2 = (v: number) => (v & (v - 1)) === 0
        if (g instanceof WebGL2RenderingContext || (pow2(bitmap.width) && pow2(bitmap.height))) { g.generateMipmap(g.TEXTURE_2D); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR) }
        else { g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE) }
        bitmap.close()
      }
      draws.push({ vbo, ibo, count, type, tex, color: mesh.color, hasUv: !!mesh.uvs, hasN: !!mesh.normals, double: mesh.doubleSided })
    }
    center = [0, 1, 2].map((c) => (m.min[c] + m.max[c]) / 2)
    radius = Math.max(1e-6, Math.hypot(m.max[0] - m.min[0], m.max[1] - m.min[1], m.max[2] - m.min[2]) / 2)
  }

  function projectPin(vp: Float32Array, pin: SpatialPin, cssW: number, cssH: number) {
    const cx = vp[0] * pin.x + vp[4] * pin.y + vp[8] * pin.z + vp[12]
    const cy = vp[1] * pin.x + vp[5] * pin.y + vp[9] * pin.z + vp[13]
    const cz = vp[2] * pin.x + vp[6] * pin.y + vp[10] * pin.z + vp[14]
    const cw = vp[3] * pin.x + vp[7] * pin.y + vp[11] * pin.z + vp[15]
    if (cw <= 0.01) return { ...pin, sx: -999, sy: -999, visible: false }
    const nx = cx / cw, ny = cy / cw, nz = cz / cw
    const visible = nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1 && nz >= -1 && nz <= 1
    return { ...pin, sx: (nx * 0.5 + 0.5) * cssW, sy: (0.5 - ny * 0.5) * cssH, visible }
  }

  function wake() { if (!raf) raf = requestAnimationFrame(frame) }
  function frame() {
    raf = 0
    const g = gl
    if (!g || !canvas) return
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1)
    const w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr))
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    g.viewport(0, 0, w, h)
    g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT)
    const eye = [center[0] + Math.cos(pitch) * Math.sin(yaw) * radius * dist, center[1] + Math.sin(pitch) * radius * dist, center[2] + Math.cos(pitch) * Math.cos(yaw) * radius * dist]
    const vp = mul(perspective(0.7, w / h, radius * dist * 0.05, radius * dist * 4), lookAt(eye, center, [0, 1, 0]))

    if (splatBuffers && splatProg) {
      g.disable(g.DEPTH_TEST)
      g.enable(g.BLEND)
      g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA)
      g.useProgram(splatProg)
      g.uniformMatrix4fv(g.getUniformLocation(splatProg, 'vp'), false, vp)
      g.uniform1f(g.getUniformLocation(splatProg, 'focal'), h / Math.tan(0.35))
      const ap = g.getAttribLocation(splatProg, 'p'), ac = g.getAttribLocation(splatProg, 'c'), ar = g.getAttribLocation(splatProg, 'r')
      if (ap >= 0) { g.bindBuffer(g.ARRAY_BUFFER, splatBuffers.pos); g.enableVertexAttribArray(ap); g.vertexAttribPointer(ap, 3, g.FLOAT, false, 0, 0) }
      if (ac >= 0) { g.bindBuffer(g.ARRAY_BUFFER, splatBuffers.col); g.enableVertexAttribArray(ac); g.vertexAttribPointer(ac, 4, g.FLOAT, false, 0, 0) }
      if (ar >= 0) { g.bindBuffer(g.ARRAY_BUFFER, splatBuffers.rad); g.enableVertexAttribArray(ar); g.vertexAttribPointer(ar, 1, g.FLOAT, false, 0, 0) }
      g.drawArrays(g.POINTS, 0, splatBuffers.count)
      g.disable(g.BLEND)
    } else if (meshProg) {
      g.enable(g.DEPTH_TEST)
      g.useProgram(meshProg)
      const L = light === 'kamera' ? [eye[0] - center[0] + radius * 0.6, eye[1] - center[1] + radius * 1.2, eye[2] - center[2]] : [0.25, 1, 0.35]
      g.uniformMatrix4fv(g.getUniformLocation(meshProg, 'vp'), false, vp)
      g.uniform3fv(g.getUniformLocation(meshProg, 'light'), L)
      g.uniform3fv(g.getUniformLocation(meshProg, 'eye'), eye)
      const ap = g.getAttribLocation(meshProg, 'p'), an = g.getAttribLocation(meshProg, 'n'), at = g.getAttribLocation(meshProg, 't')
      for (const d of draws) {
        if (d.double) g.disable(g.CULL_FACE); else g.enable(g.CULL_FACE)
        for (const [loc, b, size] of [[ap, d.vbo[0], 3], [an, d.vbo[1], 3], [at, d.vbo[2], 2]] as [number, WebGLBuffer, number][]) {
          if (loc < 0) continue
          g.bindBuffer(g.ARRAY_BUFFER, b); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, size, g.FLOAT, false, 0, 0)
        }
        g.uniform4fv(g.getUniformLocation(meshProg, 'color'), d.color)
        g.uniform1f(g.getUniformLocation(meshProg, 'useTex'), d.tex && d.hasUv ? 1 : 0)
        g.uniform1f(g.getUniformLocation(meshProg, 'useN'), d.hasN ? 1 : 0)
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, d.tex)
        g.uniform1i(g.getUniformLocation(meshProg, 'tex'), 0)
        if (d.ibo) { g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, d.ibo); g.drawElements(g.TRIANGLES, d.count, d.type, 0) }
        else g.drawArrays(g.TRIANGLES, 0, d.count)
      }
    }

    if (pins.length) {
      projected = pins.map((pin) => projectPin(vp, pin, rect.width, rect.height))
    } else if (projected.length) {
      projected = []
    }
  }

  function perspective(fov: number, aspect: number, near: number, far: number) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far)
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
  }
  function lookAt(e: number[], c: number[], up: number[]) {
    const z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm(cross(up, z)), y = cross(z, x)
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1])
  }
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const norm = (a: number[]) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
  function mul(a: Float32Array, b: Float32Array) {
    const o = new Float32Array(16)
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
    return o
  }

  function down(e: PointerEvent) { canvas!.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]); drag = [e.clientX, e.clientY]; pinch = 0 }
  function move(e: PointerEvent) {
    if (!pointers.has(e.pointerId)) return
    pointers.set(e.pointerId, [e.clientX, e.clientY])
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1])
      if (pinch) dist = Math.max(0.8, Math.min(8, dist * (pinch / d)))
      pinch = d; wake(); return
    }
    if (!drag) return
    yaw -= (e.clientX - drag[0]) * 0.008
    pitch = Math.max(-1.5, Math.min(1.5, pitch + (e.clientY - drag[1]) * 0.006))
    drag = [e.clientX, e.clientY]; wake()
  }
  function up(e: PointerEvent) { pointers.delete(e.pointerId); if (!pointers.size) drag = null; pinch = 0 }
  function wheel(e: WheelEvent) { e.preventDefault(); dist = Math.max(0.8, Math.min(8, dist * Math.exp(e.deltaY * 0.0015))); wake() }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') yaw += 0.15
    else if (e.key === 'ArrowRight') yaw -= 0.15
    else if (e.key === 'ArrowUp') pitch = Math.max(-1.5, pitch - 0.12)
    else if (e.key === 'ArrowDown') pitch = Math.min(1.5, pitch + 0.12)
    else if (e.key === '+' || e.key === '=') dist = Math.max(0.8, dist / 1.2)
    else if (e.key === '-') dist = Math.min(8, dist * 1.2)
    else if (e.key === '0') return reset()
    else return
    e.preventDefault(); wake()
  }
  function reset() { yaw = 0.6; pitch = 0.25; dist = 2.6; wake() }
  $effect(() => { void light; wake() })
  onMount(() => {
    void load()
    void loadPins()
    const ro = new ResizeObserver(() => wake())
    if (canvas) ro.observe(canvas)
    return () => { ro.disconnect(); cancelAnimationFrame(raf); gl?.getExtension('WEBGL_lose_context')?.loseContext() }
  })
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div class="mb" role="application" tabindex="0" aria-roledescription="benda tiga dimensi" aria-label={'Model 3D ' + object.title + '. Panah memutar benda, tambah dan kurang memperbesar.'} onkeydown={key}>
  <canvas bind:this={canvas} aria-hidden="true" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onwheel={wheel}></canvas>
  {#if phase === 'loading'}<div class="mb-wait" role="status"><span>Memuat model {sizeLabel(spec.bytes)}</span><span class="mb-bar"><span style:transform={'scaleX(' + progress + ')'}></span></span></div>
  {:else if phase === 'failed'}<div class="mb-wait"><span>Model belum dapat dimuat.</span><button type="button" onclick={load}>Coba lagi</button></div>
  {:else if phase === 'nogl'}<div class="mb-wait"><span>Peramban ini belum bisa menampilkan model 3D. Fotonya tetap bisa dilihat di sumber aslinya.</span></div>{/if}
  {#if phase === 'ready'}
    {#each projected.filter((p) => p.visible) as pin (pin.id)}
      <button
        type="button"
        class="mb-pin"
        class:mb-pin-active={activePin?.id === pin.id}
        style={`left:${pin.sx}px;top:${pin.sy}px`}
        onclick={() => (activePin = activePin?.id === pin.id ? null : pin)}
      >
        <MapPin size={13} />
        <span>{pin.label}</span>
      </button>
    {/each}
    {#if activePin}
      <div class="mb-pin-card" role="dialog" aria-label={activePin.label}>
        <div class="mb-pin-head">
          <strong>{activePin.label}</strong>
          <button type="button" onclick={() => (activePin = null)} aria-label="Tutup catatan titik"><X size={14} /></button>
        </div>
        {#if activePin.kamusWord}<p class="mb-pin-word">Kata lokal: <strong>{activePin.kamusWord}</strong></p>{/if}
        {#if activePin.note}<p class="mb-pin-note">{activePin.note}</p>{/if}
        <small>Ditandai oleh {activePin.authorName}</small>
      </div>
    {/if}
    {#if addingPin}
      <form class="mb-pin-form" onsubmit={(e) => { e.preventDefault(); void submitPin() }}>
        <div class="mb-pin-head">
          <strong>Tandai bagian di sudut ini</strong>
          <button type="button" onclick={() => (addingPin = false)} aria-label="Batal"><X size={14} /></button>
        </div>
        <input type="text" maxlength="80" placeholder="Nama bagian (mis. Tali kulit kayu)" bind:value={draftLabel} required />
        <input type="text" maxlength="60" placeholder="Kata bahasa daerah (opsional)" bind:value={draftWord} />
        <textarea rows="2" maxlength="500" placeholder="Keterangan singkat (opsional)" bind:value={draftNote}></textarea>
        {#if pinMsg}<small class="mb-pin-err">{pinMsg}</small>{/if}
        <button type="submit" class="mb-pin-save" disabled={pinBusy || !draftLabel.trim()}>
          {pinBusy ? 'Menyimpan...' : 'Simpan titik 3D'}
        </button>
      </form>
    {/if}
    <div class="vw-tools">
      <button type="button" onclick={() => { addingPin = !addingPin; pinMsg = '' }} aria-label="Tandai bagian 3D" title="Tandai bagian 3D"><MapPin size={16} /></button>
      <button type="button" onclick={() => { dist = Math.max(0.8, dist / 1.25); wake() }} aria-label="Perbesar" title="Perbesar"><Plus size={16} /></button>
      <button type="button" onclick={() => { dist = Math.min(8, dist * 1.25); wake() }} aria-label="Perkecil" title="Perkecil"><Minus size={16} /></button>
      <button type="button" onclick={reset} aria-label="Atur ulang tampilan" title="Atur ulang tampilan"><RotateCcw size={15} /></button>
    </div>
    {#if model}
      <div class="vw-floating mb-light" role="radiogroup" aria-label="Arah cahaya">
        <button type="button" role="radio" aria-checked={light === 'kamera'} onclick={() => (light = 'kamera')}>Cahaya dari depan</button>
        <button type="button" role="radio" aria-checked={light === 'atas'} onclick={() => (light = 'atas')}>Cahaya dari atas</button>
      </div>
    {/if}
    <p class="mb-scale">
      {spec.sizeCm ? spec.sizeCm.label + ' ' + spec.sizeCm.value.toLocaleString('id-ID') + ' cm' : 'Ukuran sebenarnya belum tercatat.'}
      {#if model} · {model.triangles.toLocaleString('id-ID')} segitiga{/if}
      {#if splat} · {splat.count.toLocaleString('id-ID')} titik Gaussian Splat{/if}
      {#if pins.length} · {pins.length} penanda{/if}
    </p>
  {/if}
</div>

<style>
  .mb { position: relative; width: 100%; height: 100%; min-height: 320px; overflow: hidden; background: radial-gradient(120% 90% at 50% 40%, color-mix(in oklab, var(--foreground) 7%, var(--background)), color-mix(in oklab, var(--foreground) 2%, var(--background))); }
  canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
  canvas:active { cursor: grabbing; }
  .mb:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: -2px; }
  .mb-wait { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 12px; padding: 24px; text-align: center; font-size: 14.5px; color: var(--muted-foreground); }
  .mb-wait button { min-height: 40px; padding: 0 16px; border: 1px solid var(--border); border-radius: 999px; background: var(--background); color: var(--foreground); font: inherit; font-weight: 600; cursor: pointer; }
  .mb-bar { width: 180px; height: 4px; border-radius: 4px; background: var(--border); overflow: hidden; }
  .mb-bar span { display: block; height: 100%; background: var(--foreground); transform-origin: left; transition: transform 0.2s ease-out; }
  .mb-light { left: 12px; top: 12px; }
  .mb-scale { position: absolute; left: 12px; bottom: 10px; right: 12px; margin: 0; font-size: 13px; color: var(--muted-foreground); pointer-events: none; }
  .mb-pin { position: absolute; transform: translate(-50%, -100%); display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; border: 1px solid color-mix(in oklab, var(--foreground) 25%, transparent); background: color-mix(in oklab, var(--background) 88%, transparent); backdrop-filter: blur(6px); color: var(--foreground); font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgb(0 0 0 / 0.2); z-index: 4; }
  .mb-pin-active { background: var(--brand, #6430ab); color: #fff; border-color: transparent; }
  .mb-pin-card, .mb-pin-form { position: absolute; left: 12px; bottom: 38px; width: min(290px, calc(100% - 24px)); padding: 11px 12px; border-radius: 12px; border: 1px solid var(--border); background: color-mix(in oklab, var(--background) 95%, transparent); backdrop-filter: blur(10px); color: var(--foreground); display: grid; gap: 6px; font-size: 13px; z-index: 6; box-shadow: 0 10px 28px rgb(0 0 0 / 0.28); }
  .mb-pin-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .mb-pin-head button { border: 0; background: transparent; color: var(--muted-foreground); cursor: pointer; padding: 2px; }
  .mb-pin-word, .mb-pin-note { margin: 0; line-height: 1.4; }
  .mb-pin-form input, .mb-pin-form textarea { width: 100%; border: 1px solid var(--border); border-radius: 8px; padding: 6px 8px; font: inherit; font-size: 13px; background: var(--background); color: var(--foreground); }
  .mb-pin-save { border: 0; border-radius: 8px; padding: 7px 10px; background: var(--brand, #6430ab); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  .mb-pin-err { color: var(--destructive, #b42318); }
</style>
