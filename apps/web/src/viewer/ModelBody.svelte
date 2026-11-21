<script lang="ts">
  // A 3D object in the viewer: the GLB file is read by glb.ts and drawn with plain WebGL (no 3D library), lit by a
  // light that can follow the camera or come from above. Drag turns the object all the way round, the wheel or two
  // fingers zoom, and the reset button returns to the first view. Nothing is drawn while nothing moves.
  import { onMount } from 'svelte'
  import { Minus, Plus, RotateCcw } from '@lucide/svelte'
  import { parseGlb, type Model } from './glb.ts'
  import { sizeLabel, type ViewerObject } from '../viewer-data.ts'

  let { object }: { object: ViewerObject } = $props()
  const spec = $derived(object.model!)

  let canvas = $state<HTMLCanvasElement>(),
    phase = $state<'loading' | 'ready' | 'failed' | 'nogl'>('loading'),
    progress = $state(0),
    light = $state<'kamera' | 'atas'>('kamera'),
    model = $state<Model | null>(null)
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null, prog: WebGLProgram | null = null
  let draws: { vbo: WebGLBuffer[]; ibo: WebGLBuffer | null; count: number; type: number; tex: WebGLTexture | null; color: number[]; hasUv: boolean; hasN: boolean; double: boolean }[] = []
  let yaw = 0.6, pitch = 0.25, dist = 2.6, raf = 0, drag: [number, number] | null = null
  let center = [0, 0, 0], radius = 1
  const pointers = new Map<number, [number, number]>()
  let pinch = 0

  const VS = `attribute vec3 p; attribute vec3 n; attribute vec2 t; uniform mat4 vp; varying vec3 vn; varying vec2 vt; varying vec3 vw;
    void main() { vn = n; vt = t; vw = p; gl_Position = vp * vec4(p, 1.0); }`
  const FS = `precision mediump float; varying vec3 vn; varying vec2 vt; varying vec3 vw; uniform sampler2D tex; uniform vec4 color; uniform float useTex; uniform float useN;
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

  async function load() {
    phase = 'loading'; progress = 0
    try {
      const res = await fetch(spec.src)
      if (!res.ok || !res.body) throw new Error(String(res.status))
      const total = Number(res.headers.get('content-length')) || spec.bytes, reader = res.body.getReader(), parts: Uint8Array[] = []
      let got = 0
      for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; progress = Math.min(1, got / total) }
      const buf = new Uint8Array(got); let o = 0
      for (const p of parts) { buf.set(p, o); o += p.length }
      model = parseGlb(buf.buffer)
      await upload(model)
      phase = 'ready'
      wake()
    } catch (e) {
      phase = e instanceof Error && e.message === 'nogl' ? 'nogl' : 'failed'
    }
  }

  async function upload(m: Model) {
    if (!canvas) throw new Error('nogl')
    gl = canvas.getContext('webgl2', { antialias: true, alpha: true }) ?? canvas.getContext('webgl', { antialias: true, alpha: true })
    if (!gl) throw new Error('nogl')
    const g = gl
    const sh = (type: number, src: string) => { const s = g.createShader(type)!; g.shaderSource(s, src); g.compileShader(s); return s }
    prog = g.createProgram()!
    g.attachShader(prog, sh(g.VERTEX_SHADER, VS)); g.attachShader(prog, sh(g.FRAGMENT_SHADER, FS)); g.linkProgram(prog)
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

  function wake() { if (!raf) raf = requestAnimationFrame(frame) }
  function frame() {
    raf = 0
    const g = gl
    if (!g || !prog || !canvas) return
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1)
    const w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr))
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    g.viewport(0, 0, w, h)
    g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT)
    g.enable(g.DEPTH_TEST)
    g.useProgram(prog)
    const eye = [center[0] + Math.cos(pitch) * Math.sin(yaw) * radius * dist, center[1] + Math.sin(pitch) * radius * dist, center[2] + Math.cos(pitch) * Math.cos(yaw) * radius * dist]
    const vp = mul(perspective(0.7, w / h, radius * dist * 0.05, radius * dist * 4), lookAt(eye, center, [0, 1, 0]))
    const L = light === 'kamera' ? [eye[0] - center[0] + radius * 0.6, eye[1] - center[1] + radius * 1.2, eye[2] - center[2]] : [0.25, 1, 0.35]
    g.uniformMatrix4fv(g.getUniformLocation(prog, 'vp'), false, vp)
    g.uniform3fv(g.getUniformLocation(prog, 'light'), L)
    g.uniform3fv(g.getUniformLocation(prog, 'eye'), eye)
    const ap = g.getAttribLocation(prog, 'p'), an = g.getAttribLocation(prog, 'n'), at = g.getAttribLocation(prog, 't')
    for (const d of draws) {
      if (d.double) g.disable(g.CULL_FACE); else g.enable(g.CULL_FACE)
      for (const [loc, b, size] of [[ap, d.vbo[0], 3], [an, d.vbo[1], 3], [at, d.vbo[2], 2]] as [number, WebGLBuffer, number][]) {
        if (loc < 0) continue
        g.bindBuffer(g.ARRAY_BUFFER, b); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, size, g.FLOAT, false, 0, 0)
      }
      g.uniform4fv(g.getUniformLocation(prog, 'color'), d.color)
      g.uniform1f(g.getUniformLocation(prog, 'useTex'), d.tex && d.hasUv ? 1 : 0)
      g.uniform1f(g.getUniformLocation(prog, 'useN'), d.hasN ? 1 : 0)
      g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, d.tex)
      g.uniform1i(g.getUniformLocation(prog, 'tex'), 0)
      if (d.ibo) { g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, d.ibo); g.drawElements(g.TRIANGLES, d.count, d.type, 0) }
      else g.drawArrays(g.TRIANGLES, 0, d.count)
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
    <div class="vw-tools">
      <button type="button" onclick={() => { dist = Math.max(0.8, dist / 1.25); wake() }} aria-label="Perbesar" title="Perbesar"><Plus size={16} /></button>
      <button type="button" onclick={() => { dist = Math.min(8, dist * 1.25); wake() }} aria-label="Perkecil" title="Perkecil"><Minus size={16} /></button>
      <button type="button" onclick={reset} aria-label="Atur ulang tampilan" title="Atur ulang tampilan"><RotateCcw size={15} /></button>
    </div>
    <div class="vw-floating mb-light" role="radiogroup" aria-label="Arah cahaya">
      <button type="button" role="radio" aria-checked={light === 'kamera'} onclick={() => (light = 'kamera')}>Cahaya dari depan</button>
      <button type="button" role="radio" aria-checked={light === 'atas'} onclick={() => (light = 'atas')}>Cahaya dari atas</button>
    </div>
    <p class="mb-scale">{spec.sizeCm ? spec.sizeCm.label + ' ' + spec.sizeCm.value.toLocaleString('id-ID') + ' cm' : 'Ukuran sebenarnya belum tercatat, sehingga skala tidak ditampilkan.'}{model ? ' · ' + model.triangles.toLocaleString('id-ID') + ' segitiga' : ''}</p>
  {/if}
</div>

<style>
  .mb { position: relative; width: 100%; height: 100%; min-height: 320px; background: radial-gradient(120% 90% at 50% 40%, color-mix(in oklab, var(--foreground) 7%, var(--background)), color-mix(in oklab, var(--foreground) 2%, var(--background))); }
  canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
  canvas:active { cursor: grabbing; }
  .mb:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: -2px; }
  .mb-wait { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 12px; padding: 24px; text-align: center; font-size: 14.5px; color: var(--muted-foreground); }
  .mb-wait button { min-height: 40px; padding: 0 16px; border: 1px solid var(--border); border-radius: 999px; background: var(--background); color: var(--foreground); font: inherit; font-weight: 600; cursor: pointer; }
  .mb-bar { width: 180px; height: 4px; border-radius: 4px; background: var(--border); overflow: hidden; }
  .mb-bar span { display: block; height: 100%; background: var(--foreground); transform-origin: left; transition: transform 0.2s ease-out; }
  .mb-light { left: 12px; top: 12px; }
  .mb-scale { position: absolute; left: 12px; bottom: 10px; right: 12px; margin: 0; font-size: 13px; color: var(--muted-foreground); pointer-events: none; }
</style>
