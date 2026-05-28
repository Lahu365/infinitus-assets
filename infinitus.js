import * as THREE from 'three';
import Lenis from 'lenis';

/* ============================================================
   PART 1 - ORB (extracted from the playground, brand matcaps)
   ============================================================ */
const BRAND = {
  indigo:   '#513FEF', lavender: '#C288F8', orchid:   '#F788F7',
  amethyst: '#3E3183', indigo300:'#A89BF7', indigo900:'#211A5F',
  orchid100:'#FEE3FD', orchid700:'#94528C', lilac:    '#DDDBF4',
  champagne:'#FFF0CD', black:    '#010007',
};
const hexToRGB = (h) => {
  const n = parseInt(h.replace('#',''), 16);
  return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255];
};

function makeMatcap(stops, highlightColor = BRAND.lavender) {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = BRAND.black;
  ctx.fillRect(0, 0, size, size);
  const body = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  stops.forEach(([pos, color]) => body.addColorStop(pos, color));
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2); ctx.fill();
  const glow = ctx.createRadialGradient(size*0.32, size*0.26, 0, size*0.32, size*0.26, size*0.42);
  glow.addColorStop(0, highlightColor + 'CC');
  glow.addColorStop(0.45, highlightColor + '33');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const SIGNATURE_MATCAP = () => makeMatcap([
  [0.00, BRAND.indigo300], [0.25, BRAND.indigo],
  [0.65, BRAND.amethyst],  [0.92, BRAND.indigo900], [1.00, BRAND.black],
], BRAND.lavender);
const ORCHID_MATCAP = () => makeMatcap([
  [0.00, BRAND.orchid100], [0.30, BRAND.orchid],
  [0.65, BRAND.orchid700], [0.92, BRAND.amethyst], [1.00, BRAND.black],
], BRAND.lavender);
// Galaxy: multi-stop ramp that walks the full brand palette from
// light center to deep black edge. With champagne highlight this
// reads like a literal galaxy with a warm bright star at its core.
const GALAXY_MATCAP = () => makeMatcap([
  [0.00, BRAND.lilac],
  [0.15, BRAND.lavender],
  [0.42, BRAND.indigo],
  [0.62, BRAND.amethyst],
  [0.82, BRAND.orchid700],
  [1.00, BRAND.black],
], BRAND.champagne);

// Amethyst Deep: heavier purple weight than the galaxy matcap.
// Sustains amethyst across a wide arc of the orb so the body reads
// as a single deep amethyst tone rather than a multi-step palette
// walk. Used as the crossfade slot against the galaxy base, so the
// orb has both the rich palette walk AND a deep amethyst undertone.
const AMETHYST_DEEP_MATCAP = () => makeMatcap([
  [0.00, BRAND.indigo300],
  [0.20, BRAND.amethyst],
  [0.55, BRAND.amethyst],
  [0.82, BRAND.indigo900],
  [1.00, BRAND.black],
], BRAND.champagne);

const PASS_VERT = `
  precision mediump float;
  attribute vec3 position; attribute vec2 uv; varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
`;
const INTERACTION_FRAG = `
  precision mediump float;
  const float PI = 3.141592653589793;
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);
    const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;
    vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0;
    vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
    return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  uniform sampler2D tHeight;
  uniform vec2 center; uniform vec2 center2;
  uniform float radius; uniform float strength; uniform float time;
  uniform float noiseSpeed; uniform float noiseAmplitude; uniform float noiseFrequency;
  uniform bool mouseDown;
  varying vec2 vUv;
  void main(){
    vec4 data = texture2D(tHeight, vUv);
    float dist = length(center - vUv);
    float drop = max(0.0, 1.0 - dist / radius);
    drop = 0.5 - cos(drop * PI) * 0.5;
    if (mouseDown) data.r -= drop * strength;
    else           data.r += drop * strength;
    float dist2 = length(center2 - vUv);
    float drop2 = max(0.0, 1.0 - dist2 / radius);
    drop2 = 0.5 - cos(drop2 * PI) * 0.5;
    data.r += drop2 * strength;
    data.r += snoise(vec3(vUv, time * noiseSpeed) * noiseFrequency) * noiseAmplitude;
    gl_FragColor = data;
  }
`;
const SIM_FRAG = `
  precision mediump float;
  uniform sampler2D tHeight; uniform vec2 size; varying vec2 vUv;
  void main(){
    vec4 data = texture2D(tHeight, vUv);
    vec2 dx = vec2(1.0/size.x, 0.0); vec2 dy = vec2(0.0, 1.0/size.y);
    float average = (
      texture2D(tHeight, vUv - dx).r + texture2D(tHeight, vUv - dy).r +
      texture2D(tHeight, vUv + dx).r + texture2D(tHeight, vUv + dy).r
    ) * 0.25;
    data.g += (average - data.r) * 2.0;
    data.g *= 0.995; data.r += data.g; data.r *= 0.995;
    gl_FragColor = data;
  }
`;
const RENDER_VERT = `
  precision mediump float;
  attribute vec3 position; attribute vec2 uv; attribute vec3 normal;
  uniform mat4 projectionMatrix; uniform mat4 modelViewMatrix;
  uniform sampler2D tHeight;
  varying vec2 vUv; varying vec3 vPosition;
  void main(){
    vUv = uv;
    vec4 data = texture2D(tHeight, uv);
    vec3 transformed = position + normal * data.r * 0.7;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    vPosition = gl_Position.xyz;
  }
`;
const RENDER_FRAG = `
  precision mediump float;
  uniform sampler2D tHeight;
  uniform sampler2D matcapTexture; uniform sampler2D matcapTexture2;
  uniform float textureMix; uniform vec2 size;
  uniform vec3 eye; uniform vec3 lightDirection;
  uniform vec3 specularColor; uniform float angle;
  varying vec2 vUv; varying vec3 vPosition;
  vec2 matcap(vec3 e, vec3 n){
    vec3 r = reflect(e, n);
    float m = 2.8284271247461903 * sqrt(r.z + 1.0);
    return r.xy / m + 0.5;
  }
  float lambert(vec3 N, vec3 L){ return max(dot(normalize(N), normalize(L)), 0.0); }
  float blendOverlay(float b, float l){
    return b < 0.5 ? (2.0 * b * l) : (1.0 - 2.0 * (1.0 - b) * (1.0 - l));
  }
  vec3 blendOverlay(vec3 b, vec3 l){
    return vec3(blendOverlay(b.r,l.r), blendOverlay(b.g,l.g), blendOverlay(b.b,l.b));
  }
  vec2 rotateUV(vec2 uv, float rot){
    float m = 0.5;
    return vec2(cos(rot)*(uv.x-m)+sin(rot)*(uv.y-m)+m,
                cos(rot)*(uv.y-m)-sin(rot)*(uv.x-m)+m);
  }
  void main(){
    vec4 data = texture2D(tHeight, vUv);
    vec3 tangent = vec3(1.0/size.x, texture2D(tHeight, vec2(vUv.x+1.0/size.x, vUv.y)).r - data.r, 0.0);
    vec3 bitan = vec3(0.0, texture2D(tHeight, vec2(vUv.x, vUv.y+1.0/size.y)).r - data.r, 1.0/size.y);
    vec3 normal = normalize(cross(tangent, bitan));
    normal = vec3(normal.x, sqrt(1.0 - dot(normal.xz, normal.xz)), normal.z);
    float light = lambert(normal, lightDirection);
    vec3 viewDir = normalize(eye - vPosition);
    vec3 reflectDir = reflect(lightDirection, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 8.0);
    vec3 specular = 0.035 * spec * specularColor;
    vec2 rotatedUv = rotateUV(vUv, angle);
    vec3 colA = texture2D(matcapTexture, rotatedUv).rgb;
    vec3 colB = texture2D(matcapTexture2, rotatedUv).rgb;
    vec3 color = mix(colA, colB, textureMix);
    gl_FragColor = vec4(blendOverlay(color, vec3(light)) + specular, 1.0);
  }
`;

class Orb {
  constructor(stage, segments = 100) {
    this.stage = stage;
    const { offsetWidth: w, offsetHeight: h } = stage;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // Pixel ratio cap of 2.5 (not the usual 2): the peak journey moment
    // CSS-scales the canvas up to 2x, which would normally chop effective
    // density to 1x on retina. 2.5x base density keeps the peak at 1.25x
    // effective so the orb stays crisp at its largest. Capped at 2.5
    // because the orb runs three render passes per frame and GPU cost
    // scales with the square of density.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    this.renderer.setSize(w, h);
    stage.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 10);
    this.camera.position.z = 2.4;
    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2(-2, -2);
    this.ndc = new THREE.Vector2(-2, -2);

    const gl = this.renderer.getContext();
    const ext = gl.getSupportedExtensions() || [];
    const type = ext.includes('EXT_color_buffer_float') ? THREE.FloatType : THREE.HalfFloatType;
    const rtOpts = { format: THREE.RGBAFormat, type,
                     wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping };
    this.fboA = new THREE.WebGLRenderTarget(256, 256, rtOpts);
    this.fboB = new THREE.WebGLRenderTarget(128, 128, rtOpts);
    this.fboScene = new THREE.Scene();
    this.fboPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.fboScene.add(this.fboPlane);

    this.interactionMat = new THREE.RawShaderMaterial({
      vertexShader: PASS_VERT, fragmentShader: INTERACTION_FRAG,
      uniforms: {
        tHeight:        { value: this.fboB.texture },
        center:         { value: new THREE.Vector2(-1,-1) },
        center2:        { value: new THREE.Vector2(-1,-1) },
        radius:         { value: 0.05 },
        strength:       { value: 0.060 },
        time:           { value: 0 },
        noiseSpeed:     { value: 0.1 },
        noiseAmplitude: { value: 0.005 },
        noiseFrequency: { value: 3.0 },
        mouseDown:      { value: false },
      },
    });
    this.simMat = new THREE.RawShaderMaterial({
      vertexShader: PASS_VERT, fragmentShader: SIM_FRAG,
      uniforms: {
        tHeight: { value: this.fboA.texture },
        size:    { value: new THREE.Vector2(this.fboA.width/2, this.fboA.height/2) },
      },
    });
    this.renderMat = new THREE.RawShaderMaterial({
      vertexShader: RENDER_VERT, fragmentShader: RENDER_FRAG,
      uniforms: {
        tHeight:        { value: this.fboB.texture },
        // Base: Galaxy matcap (full brand-palette walk).
        // Crossfade: Amethyst Deep (sustained amethyst body).
        // textureMix 0 -> all galaxy. 1 -> all amethyst deep.
        // 0.5 -> even blend: the orb shows the galaxy's color
        // variety while pulling toward a deep amethyst undertone.
        matcapTexture:  { value: GALAXY_MATCAP() },
        matcapTexture2: { value: AMETHYST_DEEP_MATCAP() },
        textureMix:     { value: 0.5 },
        size:           { value: new THREE.Vector2(this.fboB.width, this.fboB.height) },
        eye:            { value: this.camera.position.clone().normalize() },
        lightDirection: { value: new THREE.Vector3(0, 1, 1) },
        // Champagne specular: warm-white pin-prick highlight that reads
        // as a star-glint against the cool brand-purple body of the orb.
        specularColor:  { value: new THREE.Vector3(...hexToRGB(BRAND.champagne)) },
        angle:          { value: 0 },
      },
    });
    this.sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, segments, segments, 0, Math.PI),
      this.renderMat
    );
    this.scene.add(this.sphere);

    this._angle = Math.PI / 2;
    this._angleVel = 1;
    this._noiseSpeedBase = 0.1;

    this._bindEvents();
    this._loop = this._loop.bind(this);
    this.clock.start();
    // Auto-ripple drops removed. The orb still ripples on mouse hover
    // (driven by center uniform in _loop) and breathes via the time-based
    // noise term in the interaction shader. The center2 uniform is left
    // parked off-canvas (-1,-1) so its sample contributes nothing.
    this._frameId = requestAnimationFrame(this._loop);
  }

  /** Borrowed concept from offbrand: scroll velocity drives noise speed.
   *  Fast scroll = the orb agitates. Idle = it breathes calmly. */
  setVelocity(v) {
    const k = Math.min(1, Math.abs(v) * 0.05);
    this.interactionMat.uniforms.noiseSpeed.value = this._noiseSpeedBase + k * 0.8;
  }

  _bindEvents() {
    this._onResize = () => {
      const { offsetWidth: w, offsetHeight: h } = this.stage;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    this._onMove = (e) => this.mouse.set(e.clientX, e.clientY);
    this._onDown = () => this.interactionMat.uniforms.mouseDown.value = true;
    this._onUp   = () => this.interactionMat.uniforms.mouseDown.value = false;
    window.addEventListener('resize', this._onResize);
    window.addEventListener('mousemove', this._onMove);
    window.addEventListener('mousedown', this._onDown);
    window.addEventListener('mouseup', this._onUp);
  }

  _loop() {
    this._frameId = requestAnimationFrame(this._loop);
    const rect = this.stage.getBoundingClientRect();
    this.ndc.set(
      ((this.mouse.x - rect.left) / rect.width) * 2 - 1,
      -(((this.mouse.y - rect.top) / rect.height) * 2 - 1)
    );
    if (this.ndc.x > -1.5 && this.ndc.y > -1.5) {
      this.raycaster.setFromCamera(this.ndc, this.camera);
      const hit = this.raycaster.intersectObject(this.sphere)[0];
      if (hit && hit.uv) this.interactionMat.uniforms.center.value.copy(hit.uv);
      else this.interactionMat.uniforms.center.value.set(-1, -1);
    }
    this.interactionMat.uniforms.time.value = this.clock.getElapsedTime();
    this._angle += 0.01 * this._angleVel;
    const margin = 0.5;
    if (this._angle > Math.PI - margin) { this._angleVel *= -1; this._angle = Math.PI - margin; }
    else if (this._angle < margin)      { this._angleVel *= -1; this._angle = margin; }
    this.renderMat.uniforms.lightDirection.value.set(Math.cos(this._angle), Math.sin(this._angle), 1);
    this.renderMat.uniforms.angle.value = this._angle;

    this.fboPlane.material = this.interactionMat;
    this.renderer.setRenderTarget(this.fboA);
    this.renderer.render(this.fboScene, this.camera);
    this.fboPlane.material = this.simMat;
    this.renderer.setRenderTarget(this.fboB);
    this.renderer.render(this.fboScene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }
}

/* ============================================================
   PART 2 - MOTION SYSTEM
   The lean replacement for offbrand's src/animations.js +
   src/utils.js. Adds three text-split vocabularies, a hover-dim
   list group, and a scroll-velocity-modulated rotator.
   ============================================================ */

// ---- 2a. Smooth scroll (Lenis under the hood) ----


/* ============================================================
   2b. SPLIT TEXT - three vocabularies
   words : wrap each word in a masked span (sequential up-reveal)
   chars : wrap each character (drop-from-above, random stagger)
   lines : split text at the browser's actual line-wrap boundaries
           (random stagger up-reveal)

   All three wrap children in <span class="split-mask"><span
   class="split-{type}">...</span></span>, then the .is-in class
   on the parent fires the CSS transition.

   The random stagger is achieved with per-element transition-delay
   chosen from a shuffled order — no GSAP needed.
   ============================================================ */

function shuffleOrder(n) {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/* Word split: tokenises on whitespace, preserving inline tags.
   Stagger is sequential (0ms, 60ms, 120ms, ...) which reads as
   a clean left-to-right reveal. Use for short headlines you want
   to feel orderly. */
function splitWords(el) {
  const html = el.innerHTML;
  const tokens = html.split(/(<[^>]+>[^<]*<\/[^>]+>|\s+)/).filter(Boolean);
  el.innerHTML = '';
  const innerSpans = [];
  tokens.forEach(tok => {
    if (/^\s+$/.test(tok)) {
      el.insertAdjacentHTML('beforeend', ' ');
    } else {
      const mask = document.createElement('span');
      mask.className = 'split-mask';
      const inner = document.createElement('span');
      inner.className = 'split-word';
      inner.innerHTML = tok;
      mask.appendChild(inner);
      el.appendChild(mask);
      innerSpans.push(inner);
    }
  });
  innerSpans.forEach((sp, i) => {
    sp.style.transitionDelay = `${i * 60}ms`;
  });
}

/* Character split: each character gets its own masked span, but
   characters within a word are wrapped together in a non-breaking
   inline-block container so the line CANNOT break in the middle of
   a word. Without that wrapper, every character is its own
   inline-block and the browser will happily wrap "marketing" as
   "ma / rketing" wherever it runs out of horizontal space.

   We walk the DOM tree to preserve nested elements like
   <span class="gradient-text">; only text nodes get split. */
function splitChars(el) {
  const allInnerSpans = [];

  function wrapWord(wordText) {
    // Build a .split-char-word (inline-block, nowrap) holding one
    // masked .split-char per character. The wrapper keeps the word
    // atomic for line-breaking; the inner spans animate independently.
    const wordWrap = document.createElement('span');
    wordWrap.className = 'split-char-word';
    for (const ch of wordText) {
      const mask = document.createElement('span');
      mask.className = 'split-mask';
      const inner = document.createElement('span');
      inner.className = 'split-char';
      inner.textContent = ch;
      mask.appendChild(inner);
      wordWrap.appendChild(mask);
      allInnerSpans.push(inner);
    }
    return wordWrap;
  }

  function walk(node) {
    const children = Array.from(node.childNodes);
    children.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        const frag = document.createDocumentFragment();
        // Split on whitespace; each non-whitespace token is one "word"
        // (including any trailing punctuation, so "pillars." stays
        // glued together and the period doesn't drop to a new line).
        const parts = text.split(/(\s+)/);
        parts.forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
          } else {
            frag.appendChild(wrapWord(part));
          }
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  }
  walk(el);

  // Sequential left-to-right stagger. Each character starts 28ms
  // after the one to its left. Cap at 1.2s so a long headline
  // still finishes inside ~1.2s and doesn't feel sluggish.
  allInnerSpans.forEach((sp, i) => {
    const delay = Math.min(28 * i, 1200);
    sp.style.transitionDelay = `${delay}ms`;
  });
}

/* Line split: relies on the browser to wrap the text first, then
   uses Range geometry to find where the visual line breaks fall.
   Each rendered line is wrapped in a masked block span so it can
   slide up from below. Re-run on resize because line wrapping changes.

   This is more involved than chars/words but the payoff is that
   paragraphs reveal one line at a time — a much more "typeset"
   feel than a whole-block fade. */
function splitLines(el) {
  // Preserve original HTML so we can re-split on resize
  if (!el.dataset.originalHtml) {
    el.dataset.originalHtml = el.innerHTML;
  } else {
    el.innerHTML = el.dataset.originalHtml;
  }

  // First, split into words so we have measurable units
  const html = el.innerHTML;
  const tokens = html.split(/(<[^>]+>[^<]*<\/[^>]+>|\s+)/).filter(Boolean);
  el.innerHTML = '';
  const wordSpans = [];
  tokens.forEach(tok => {
    if (/^\s+$/.test(tok)) {
      el.appendChild(document.createTextNode(' '));
    } else {
      const w = document.createElement('span');
      w.style.display = 'inline-block';
      w.innerHTML = tok;
      el.appendChild(w);
      wordSpans.push(w);
    }
  });

  // Group words by Y position — same top = same visual line
  const lines = [];
  let currentLine = [];
  let currentTop = null;
  wordSpans.forEach(w => {
    const top = Math.round(w.getBoundingClientRect().top);
    if (currentTop === null || Math.abs(top - currentTop) < 4) {
      currentLine.push(w);
      currentTop = top;
    } else {
      lines.push(currentLine);
      currentLine = [w];
      currentTop = top;
    }
  });
  if (currentLine.length) lines.push(currentLine);

  // Rebuild: each line wrapped in a masked block span
  el.innerHTML = '';
  const innerLines = [];
  lines.forEach(lineWords => {
    const mask = document.createElement('span');
    mask.className = 'split-mask split-mask--line';
    mask.style.display = 'block';
    const inner = document.createElement('span');
    inner.className = 'split-line';
    lineWords.forEach((w, i) => {
      inner.appendChild(w);
      if (i < lineWords.length - 1) inner.appendChild(document.createTextNode(' '));
    });
    mask.appendChild(inner);
    el.appendChild(mask);
    innerLines.push(inner);
  });

  // Random stagger across the lines
  const order = shuffleOrder(innerLines.length);
  innerLines.forEach((ln, i) => {
    ln.style.transitionDelay = `${order[i] * 90}ms`;
  });
}

// Initial split pass
document.querySelectorAll('[data-split-words]').forEach(splitWords);
document.querySelectorAll('[data-split-chars]').forEach(splitChars);
document.querySelectorAll('[data-split-lines]').forEach(splitLines);

// Re-split lines on resize (debounced) because wrap points change
let _lineResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_lineResizeTimer);
  _lineResizeTimer = setTimeout(() => {
    document.querySelectorAll('[data-split-lines]').forEach(el => {
      // Only re-split if the element has not yet revealed; otherwise
      // we would jarringly reset visible text. The IntersectionObserver
      // adds .is-in once; absence of that class = still waiting.
      if (!el.classList.contains('is-in')) splitLines(el);
    });
  }, 180);
});

// ---- 2c. Reveal-on-enter ----
// Fires the CSS transitions by adding .is-in when the element is in view.
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

document.querySelectorAll(
  '[reveal], [reveal-stagger], [data-split-words], [data-split-chars], [data-split-lines], .hero-flank'
).forEach(el => revealObserver.observe(el));

// Hero flanks are siblings of the H1, so they share the hero's reveal
// timing. The hero container itself isn't a [reveal]; we observe each
// flank independently above.

// Stagger children of [reveal-stagger] by adding incremental delays
document.querySelectorAll('[reveal-stagger]').forEach(parent => {
  Array.from(parent.children).forEach((child, i) => {
    child.style.transitionDelay = `${i * 90}ms`;
  });
});

/* ============================================================
   2d. ROTATOR - scroll-velocity-modulated circular text
   Offbrand's initAboutRotator. Base spin is 28s per rotation.
   When the user scrolls fast, the rotator speeds up; when they
   stop, it eases back to the base speed. The CSS animation runs
   continuously; we only mutate the --rotator-duration custom
   property to change its speed, which is GPU-cheap.
   ============================================================ */
const rotators = document.querySelectorAll('[data-rotator]');
let rotatorTargetDuration = 28;  // seconds
let rotatorCurrentDuration = 28;

function updateRotatorSpeed(velocity) {
  // velocity from Lenis: small numbers (0-3 typical). Map to a duration
  // multiplier: high velocity = lower duration = faster spin.
  const absVel = Math.min(Math.abs(velocity), 8);
  rotatorTargetDuration = Math.max(4, 28 - absVel * 3);
}

function easeRotatorDuration() {
  // Ease toward the target each frame so speed changes feel smooth
  rotatorCurrentDuration += (rotatorTargetDuration - rotatorCurrentDuration) * 0.08;
  rotators.forEach(r => {
    r.style.setProperty('--rotator-duration', rotatorCurrentDuration.toFixed(2) + 's');
  });
  requestAnimationFrame(easeRotatorDuration);
}
if (rotators.length) easeRotatorDuration();

/* ============================================================
   2e. HOVER-DIM GROUPS
   Pure CSS already handles the hover dimming. JS only needs to
   set/clear the .is-current class to keep one item "active" by
   default. For now we mark the FIRST item in each group as current
   on load; future work could track scroll position the way
   offbrand's MutationObserver tracks .w--current.
   ============================================================ */
document.querySelectorAll('[data-hover-dim-group]').forEach(group => {
  const items = group.querySelectorAll('[data-hover-dim-item]');
  if (items.length) items[0].classList.add('is-current');
});

/* ============================================================
   PART 3 - ORB <> SCROLL JOURNEY
   The orb travels through the page on a scripted path tied to
   document scroll progress (0 -> 1). Each keyframe defines the
   orb's target transform; we interpolate between adjacent ones
   with smoothstep easing.

   Coordinate system:
     x  - viewport-width units, signed. -50 = far left edge,
          0 = horizontal center, +50 = far right edge.
     y  - viewport-height units, signed. Negative = up, positive = down.
     s  - scale multiplier on the orb's base size.
     o  - opacity (0..1).

   This is the equivalent of offbrand's tl2.to(orbObj, {x:'50vw'...})
   timeline, except they sequenced theirs in absolute time and we
   sequence ours along scroll position so it stays in sync with
   what the visitor is reading.
   ============================================================ */

const ORB_JOURNEY = [
  // p     x_vw   y_vh   scale  opacity   moment
  //
  // ARC PHILOSOPHY
  // The journey is one continuous sweep, not a sequence of pose-holds.
  // Three anchored "big" beats:
  //     1. RIGHT  (hero, where the visitor enters)
  //     2. CENTER (a balance moment, still substantial)
  //     3. LEFT   (peak, mirror of hero, off-screen-left center)
  // After the LEFT peak the orb settles into mid-then-small sizes and
  // wanders the rest of the page in a 2D path - x and y BOTH varying -
  // so it feels like a comet's trajectory rather than left-right
  // oscillation on a rail. No two consecutive keyframes anchor the
  // same horizontal side after the opening hero sequence.
  //
  // The Y-axis carries the downward narrative: positions trend gently
  // downward over time, so by the time the orb fades it has visibly
  // drifted toward the bottom of the page rather than just shrunk.
  { p: 0.00, x:  42, y:  -4, s: 1.55, o: 1.00 },   // 1. RIGHT BIG: hero anchor
  { p: 0.06, x:  34, y:  -2, s: 1.50, o: 0.98 },   // drifting in from hero
  { p: 0.12, x:  16, y:   0, s: 1.45, o: 0.95 },   // approaching center
  { p: 0.18, x:   0, y:  -3, s: 1.50, o: 0.92 },   // 2. CENTER BIG: hover beat
  { p: 0.22, x: -22, y:  -2, s: 1.65, o: 0.90 },   // drifting left, building
  { p: 0.27, x: -42, y:  -7, s: 1.95, o: 0.88 },   // 3. LEFT BIG: peak. Behind the pillar
                                                    //    carousel cards. The frosted cards
                                                    //    block most of the orb, but the
                                                    //    card-track gaps let the orb glow
                                                    //    through as bands of indigo/lavender.
  { p: 0.36, x: -20, y:   0, s: 1.40, o: 0.88 },   // returning toward center, still bright
  { p: 0.42, x: -16, y:   3, s: 1.18, o: 0.85 },   // exhale, mid-size, settling
  { p: 0.52, x:   8, y:   5, s: 0.92, o: 0.85 },   // wandering through center, sinking
  { p: 0.62, x:  24, y:  -2, s: 0.78, o: 0.88 },   // small, right + lifts
  { p: 0.72, x:  -2, y:   8, s: 0.75, o: 0.88 },   // small, near-center + sinks
  { p: 0.82, x:  10, y:  -1, s: 0.95, o: 0.92 },   // CTA: medium, near-center, slight lift
  { p: 0.88, x:   5, y:  14, s: 0.65, o: 0.82 },   // begins falling toward the footer mark, stays visible
  { p: 0.93, x:   2, y:  28, s: 0.42, o: 0.62 },   // continues falling, shrinking, still clearly visible
  { p: 0.97, x:   0, y:  37, s: 0.28, o: 0.32 },   // close to mark's screen position, fading into mark
  { p: 1.00, x:   0, y:  40, s: 0.20, o: 0.00 },   // arrived: orb invisible, mark visible at same position
];

function smoothstep(t) { return t * t * (3 - 2 * t); }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }

/** Find the segment progress sits inside and lerp between the two keyframes. */
function sampleJourney(progress) {
  const kf = ORB_JOURNEY;
  if (progress <= kf[0].p) return kf[0];
  if (progress >= kf[kf.length - 1].p) return kf[kf.length - 1];
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (progress >= a.p && progress <= b.p) {
      const segT = (progress - a.p) / (b.p - a.p);
      const t = smoothstep(segT);
      return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        s: lerp(a.s, b.s, t),
        o: lerp(a.o, b.o, t),
      };
    }
  }
  return kf[kf.length - 1];
}

const orbStage = document.getElementById('orb-stage');
const orb = new Orb(orbStage, 100);

// Footer mark - now lives in the footer's document flow at the absolute
// bottom of the page. We read its actual screen position each scroll
// frame and steer the orb's final y-target toward it, so the orb
// visibly falls INTO the mark's real location regardless of viewport
// height or how tall the footer turns out to be.
const footerMarkStage = document.getElementById('footer-mark-stage');

/** Where is the mark's center, in vh-from-viewport-center?
 *  Returns +60 (well below viewport) when the user hasn't scrolled
 *  there yet; the orb's blend logic only consults this in the last
 *  15% of journey so the value is meaningful when used. */
function getMarkYTarget() {
  if (!footerMarkStage) return 40;
  const rect = footerMarkStage.getBoundingClientRect();
  const markCenterY = rect.top + rect.height / 2;
  return ((markCenterY / window.innerHeight) * 100) - 50;
}

const hud = {
  scroll: document.getElementById('hudScroll'),
  vel:    document.getElementById('hudVel'),
};

window.__lenis.on('scroll', ({ scroll, velocity }) => {
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const progress = clamp01(scroll / docH);

  const k = sampleJourney(progress);
  let finalY = k.y;

  // Last 15% of scroll: blend the keyframe-defined y toward the mark's
  // ACTUAL screen position. The orb chases the mark down as it scrolls
  // into view. At progress=1.0 the orb is exactly where the mark is.
  if (progress > 0.85) {
    const targetY = getMarkYTarget();
    const blend = smoothstep(clamp01((progress - 0.85) / 0.15));
    finalY = lerp(k.y, targetY, blend);
  }

  orbStage.style.transform =
    `translate(${k.x}vw, ${finalY}vh) scale(${k.s})`;
  orbStage.style.opacity = k.o;

  // Mark reveal. Window p=0.88 -> p=1.00 (12% of scroll). Starts after
  // the orb has begun visibly falling, completes exactly at scroll end.
  // Inverse of the orb's final fade, so they crossfade at the same
  // screen position as the orb arrives at the mark.
  const markRaw = clamp01((progress - 0.88) / 0.12);
  const markEase = smoothstep(markRaw);
  footerMarkStage.style.opacity = markEase;
  footerMarkStage.style.transform =
    `scale(${0.55 + 0.45 * markEase}) rotate(${-8 + 8 * markEase}deg)`;

  // Feed scroll velocity into orb's noise speed.
  // The orb's surface agitates when you scroll fast.
  orb.setVelocity(velocity);

  // Feed scroll velocity into the rotator's spin speed.
  // Offbrand's initAboutRotator pattern - the circular text accelerates
  // when the user scrolls and eases back to base speed when they stop.
  updateRotatorSpeed(velocity);

  // Drive the pinned pillars carousel: as the user scrolls through
  // the 300vh runway, translate the horizontal card track so each
  // pillar comes into central viewport position in sequence.
  updatePillarsTrack();

  if (hud.scroll) hud.scroll.textContent = Math.round(progress * 100) + '%';
  if (hud.vel)    hud.vel.textContent = velocity.toFixed(2);
});

// Run the binding once on load so the orb starts at p=0, not at center.
window.__lenis.emit('scroll', { scroll: 0, velocity: 0 });

/* ============================================================
   PART 3b - PILLARS HORIZONTAL CAROUSEL
   The pinned card track. Outer .pillars-pin-runway is 300vh tall.
   Inner .pillars-pin-stage is position:sticky height:100vh, so it
   pins for 200vh of vertical scroll. During that pin, this function
   maps scroll progress (0->1) into a horizontal translateX on the
   card track. Card 1 -> Card 2 -> Card 3 enter viewport center
   sequentially as the user scrolls vertically.

   Also flips the .is-active class onto whichever card is currently
   centered so it brightens to opacity:1 while the others dim. */
var pillarsRunway = document.querySelector('[data-pillars-runway]');
var pillarsTrack = document.querySelector('[data-pillars-track]');
var pillarCards = document.querySelectorAll('[data-pillar-card]');

function updatePillarsTrack() {
  if (!pillarsRunway || !pillarsTrack) return;

  // Pin is disabled on mobile (see CSS @media query). Bail without
  // applying any transform; the CSS !important on .pillars-track
  // transform also enforces this.
  if (window.innerWidth < 900) {
    pillarsTrack.style.transform = '';
    pillarCards.forEach(c => c.classList.remove('is-active'));
    return;
  }

  var rect = pillarsRunway.getBoundingClientRect();
  var sectionTop = rect.top;          // negative once scrolled past the top
  var sectionHeight = rect.height;     // 300vh in pixels
  var viewportHeight = window.innerHeight;

  // The "pin runway" is the scroll distance over which the sticky
  // inner stage stays pinned. That's the outer height minus one
  // viewport (the stage is 100vh tall and sticks until the runway
  // bottom passes the viewport bottom).
  var pinRunway = sectionHeight - viewportHeight;

  // How much have we scrolled INTO the pin runway?
  var scrolled = -sectionTop;
  var progress = pinRunway > 0
    ? Math.max(0, Math.min(1, scrolled / pinRunway))
    : 0;

  // Translate the track horizontally. The math:
  //   Track has padding-left 16vw, then 3 cards of 60vw separated
  //   by 4vw gaps. Card centers sit at track positions 46vw, 110vw,
  //   and 174vw. For Card N's center to land at viewport center
  //   (50vw), we need translateX = 50vw - cardCenter, so:
  //     Card 1 active: translateX = +4vw   (close to 0)
  //     Card 2 active: translateX = -60vw
  //     Card 3 active: translateX = -124vw
  //   Total range: 0 (Card 1) -> -128vw (Card 3). 128vw of motion
  //   spread across the 200vh pin runway = roughly 0.64 vw of
  //   horizontal motion per vh of vertical scroll.
  var totalTranslateVW = 128;
  var translateVW = -totalTranslateVW * progress;
  pillarsTrack.style.transform =
    'translate3d(' + translateVW + 'vw, 0, 0)';

  // Active card: whichever index is closest to the current progress.
  // With 3 cards, progress 0 -> 0.5 -> 1 maps to cards 0, 1, 2 with
  // transitions at 0.25 and 0.75. Math.round on (progress * 2) gives
  // the active index directly.
  var activeIdx = Math.round(progress * (pillarCards.length - 1));
  pillarCards.forEach(function (card, i) {
    if (i === activeIdx) card.classList.add('is-active');
    else card.classList.remove('is-active');
  });
}

// Run once on load so Card 1 is marked active before any scrolling.
updatePillarsTrack();
window.addEventListener('resize', updatePillarsTrack);

/* ============================================================
   PART 4 - Magnetic buttons (replaces the offbrand
   stagger-text letter-dance for buttons / links).
   Subtle pull toward cursor on hover.
   ============================================================ */
document.querySelectorAll('.btn').forEach(btn => {
  btn.style.transition = btn.style.transition +
    (btn.style.transition ? ', ' : '') +
    'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.15;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.15;
    btn.style.transform = `translate(${x}px, ${y}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

/* ============================================================
   PART 5 - STARFIELD
   Paints the #starfield canvas with a layered cosmos:
     - a subtle diagonal milky-way band in brand purples,
     - 400 distant pin-prick stars (1px, dim),
     - 150 mid-distance stars (small disks),
     - 30 bright stars with soft halos,
     - 6 brand-accent stars in lavender / orchid.
   Star palette stays cool (white-blue) so it contrasts with the
   orb's warm-purple body and champagne highlight. Densities are
   tuned to feel atmospheric, not loud — the orb is still the
   focal point.

   Painted once on load and once per debounced resize. No scroll
   parallax: the orb already does the scroll-driven motion and a
   second moving layer would compete for the eye.
   ============================================================ */
function renderStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // ---- Milky-way band ----
  // A wide diagonal swath of soft brand color suggesting a galactic arm.
  // Drawn first so stars paint on top. The band is intentionally subtle —
  // 4-8% alpha — so it reads as atmosphere, not as a stripe.
  ctx.save();
  ctx.translate(w * 0.5, h * 0.55);
  ctx.rotate(-Math.PI * 0.09);
  const band = ctx.createLinearGradient(0, -h * 0.45, 0, h * 0.45);
  band.addColorStop(0.00, 'rgba(81, 63, 239, 0)');
  band.addColorStop(0.30, 'rgba(81, 63, 239, 0.04)');
  band.addColorStop(0.45, 'rgba(148, 82, 140, 0.07)');
  band.addColorStop(0.55, 'rgba(194, 136, 248, 0.06)');
  band.addColorStop(0.70, 'rgba(81, 63, 239, 0.04)');
  band.addColorStop(1.00, 'rgba(81, 63, 239, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(-w, -h * 0.45, w * 2, h * 0.9);
  ctx.restore();

  // ---- Deep-field: distant spiral galaxies ----
  // 4 tiny ellipsoidal galaxies with warm-champagne cores and lavender disks.
  // Aspect ratio 0.25-0.6 (flattened ellipses) so they read as disks viewed
  // at an angle, the way most galaxies appear from arbitrary viewpoints.
  // Painted before the foreground stars so the stars naturally overlay them.
  for (let i = 0; i < 4; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    const radius = 28 + Math.random() * 32;     // 28-60px across
    const rotation = Math.random() * Math.PI * 2;
    const tilt = 0.28 + Math.random() * 0.32;   // ellipse flattening

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.scale(1, tilt);

    // Outer disk - soft lavender glow that fades to nothing
    const disk = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    disk.addColorStop(0.00, 'rgba(194, 136, 248, 0.11)');
    disk.addColorStop(0.45, 'rgba(148, 82, 140, 0.06)');
    disk.addColorStop(1.00, 'rgba(81, 63, 239, 0)');
    ctx.fillStyle = disk;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Bright core - small champagne hot-spot. Matches the orb's specular
    // highlight so the deep-field galaxies feel related to the foreground orb.
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.28);
    core.addColorStop(0.00, 'rgba(255, 240, 205, 0.7)');
    core.addColorStop(0.45, 'rgba(255, 220, 180, 0.25)');
    core.addColorStop(1.00, 'rgba(255, 220, 180, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ---- Deep-field: nebulae ----
  // 3 diffuse cloud puffs built from 5 overlapping radial blobs each, so each
  // nebula has an irregular organic shape rather than a perfect circle.
  // Alpha kept very low (2-6%) so they read as faint colored fog.
  const nebulaColors = ['194, 136, 248', '247, 136, 247', '168, 155, 247'];
  for (let i = 0; i < 3; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    const baseR = 45 + Math.random() * 35;
    const color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];

    for (let j = 0; j < 5; j++) {
      const ox = (Math.random() - 0.5) * baseR * 0.9;
      const oy = (Math.random() - 0.5) * baseR * 0.9;
      const r = baseR * (0.35 + Math.random() * 0.45);
      const puff = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r);
      puff.addColorStop(0.00, `rgba(${color}, 0.06)`);
      puff.addColorStop(0.50, `rgba(${color}, 0.02)`);
      puff.addColorStop(1.00, `rgba(${color}, 0)`);
      ctx.fillStyle = puff;
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- Deep-field: distant star clusters ----
  // 4 tight knots of 8-18 tiny stars each, with a subtle halo behind them
  // suggesting unresolved background light. Distribution uses summed-uniforms
  // (Math.random()+Math.random()-1) to get a soft gaussian-like falloff from
  // the cluster center rather than a hard uniform circle.
  for (let i = 0; i < 4; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    const spread = 14 + Math.random() * 16;
    const count = 8 + Math.floor(Math.random() * 11);

    // Cluster halo
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread * 1.6);
    halo.addColorStop(0.00, 'rgba(220, 230, 255, 0.05)');
    halo.addColorStop(1.00, 'rgba(220, 230, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, spread * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // The cluster stars themselves
    for (let j = 0; j < count; j++) {
      const dx = (Math.random() + Math.random() - 1) * spread;
      const dy = (Math.random() + Math.random() - 1) * spread;
      const r = 0.4 + Math.random() * 0.6;
      const a = 0.45 + Math.random() * 0.4;
      ctx.fillStyle = `rgba(230, 240, 255, ${a})`;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- Layer 1: far stars (1px pin-pricks, dim) ----
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = 0.15 + Math.random() * 0.35;
    ctx.fillStyle = `rgba(220, 230, 255, ${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // ---- Layer 2: mid stars (sub-pixel disks) ----
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 0.5 + Math.random() * 0.7;
    const a = 0.4 + Math.random() * 0.4;
    ctx.fillStyle = `rgba(210, 220, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Layer 3: bright stars with halo glow ----
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 0.8 + Math.random() * 1.2;
    const a = 0.7 + Math.random() * 0.3;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    halo.addColorStop(0,   `rgba(180, 210, 255, ${a * 0.45})`);
    halo.addColorStop(0.3, `rgba(180, 210, 255, ${a * 0.15})`);
    halo.addColorStop(1,   'rgba(180, 210, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(240, 245, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Layer 4: brand-accent stars (rare, lavender / orchid) ----
  // Just a few so they feel like spotted easter-eggs rather than competition
  // with the orb's color palette.
  const accents = ['194, 136, 248', '247, 136, 247'];
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 1.2 + Math.random() * 0.8;
    const c = accents[Math.floor(Math.random() * accents.length)];
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 8);
    halo.addColorStop(0,    `rgba(${c}, 0.5)`);
    halo.addColorStop(0.25, `rgba(${c}, 0.18)`);
    halo.addColorStop(1,    `rgba(${c}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${c}, 0.95)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

renderStarfield();
let _starResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_starResizeTimer);
  _starResizeTimer = setTimeout(renderStarfield, 220);
});
