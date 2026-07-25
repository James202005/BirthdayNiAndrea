/**
 * Cake2.js
 * =========================================================================
 * The emotional grand-finale of the birthday website. This single script
 * overrides the basic `startBirthdayCelebration()` stub in app.js with a
 * full cinematic, interactive experience:
 *
 *   Stage 1 — Entrance:   fade-from-black, ambient audio, floating particles
 *   Stage 2 — Cake:       premium SVG cake with animated flame
 *   Stage 3 — Instruction:"Make a wish… Blow / Tap"
 *   Stage 4 — Blow:       Web Audio API mic detection + tap fallback
 *   Stage 5 — Celebration: confetti, fireworks, sparkles, hearts, balloons, streamers, bloom
 *   Stage 6 — Typography: letter-by-letter "Happy Birthday" reveal
 *   Stage 7 — Music:      crossfade from ambient to orchestral celebration
 *
 * Everything is self-contained: no external modules, no external audio files.
 * Depends only on GSAP (already loaded) and the DOM structure in index.html.
 * =========================================================================
 */

(function () {
  'use strict';

  // ========================================================================
  //  SECTION 0 — DYNAMIC FONT & CSS INJECTION
  // ========================================================================

  // Load premium fonts if not already present
  if (!document.querySelector('link[href*="Great+Vibes"]')) {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Jost:wght@300;400;500&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap';
    document.head.appendChild(fontLink);
  }

  // Inject additional celebration-specific CSS that the existing style.css lacks
  const injectedCSS = document.createElement('style');
  injectedCSS.textContent = `
    /* -- Enhanced flame animation ----------------------------------------- */
    .cake-flame-outer {
      transform-box: fill-box;
      transform-origin: 50% 100%;
      filter: blur(0.5px);
    }
    .cake-flame-inner {
      transform-box: fill-box;
      transform-origin: 50% 100%;
    }
    .cake-smoke {
      transform-box: fill-box;
      transform-origin: 50% 100%;
      opacity: 0;
    }

    /* -- Cake glow layer -------------------------------------------------- */
    .cake-glow-layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      opacity: 0;
    }

    /* -- Celebration glow on cake ----------------------------------------- */
    .cake-celebration-glow {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 0;
      height: 0;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(244,199,124,0.35) 0%, rgba(244,199,124,0) 70%);
      pointer-events: none;
      z-index: 0;
    }

    /* -- Enhanced finale heading letters ---------------------------------- */
    .finale-heading .letter {
      display: inline-block;
      opacity: 0;
      transform: translateY(20px);
      --glow: 0;
      text-shadow:
        0 0 calc(22px * var(--glow)) rgba(244, 199, 124, calc(0.9 * var(--glow))),
        0 0 calc(6px * var(--glow)) rgba(255, 246, 232, var(--glow));
    }
    .finale-heading .word-space {
      display: inline-block;
      width: 0.3em;
    }

    /* -- Enhanced finale line animations ---------------------------------- */
    .finale-line {
      opacity: 0;
      visibility: hidden;
      transform: translateY(24px);
      --glow: 0;
      text-shadow: 0 0 calc(16px * var(--glow)) rgba(244, 199, 124, calc(0.6 * var(--glow)));
    }

    /* -- Cake idle float animation ---------------------------------------- */
    @keyframes cake-float {
      0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
      50% { transform: translate(-50%, -50%) translateY(-6px); }
    }
    #cake-stage.floating {
      animation: cake-float 4s ease-in-out infinite;
    }

    /* -- Enhanced cake scene with flame light variable -------------------- */
    .cake-scene {
      --flame-light: 1;
      filter: drop-shadow(0 0 calc(26px * var(--flame-light, 1)) rgba(244, 199, 124, calc(0.55 * var(--flame-light, 1))));
      transition: filter 0.3s ease;
    }

    /* -- Background celebration gradient ---------------------------------- */
    #celebration-root.celebrating-bg {
      background: radial-gradient(ellipse at 50% 40%, #3d2566 0%, #1a0e33 40%, #0b0a1a 70%, #05040c 100%);
      transition: background 2s ease;
    }
  `;
  document.head.appendChild(injectedCSS);

  // ========================================================================
  //  SECTION 1 — UTILITIES
  // ========================================================================

  /** Random float in [min, max) */
  function rand(min, max) { return min + Math.random() * (max - min); }

  /** Random integer in [min, max] */
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

  /** Pick a random element */
  function choice(arr) { return arr[arr.length * Math.random() | 0]; }

  /** Clamp value between min and max */
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /** Linear interpolation */
  function lerp(a, b, t) { return a + (b - a) * t; }

  /** Check reduced motion preference */
  function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  /** Device quality tier: low / medium / high */
  function qualityTier() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    if (w < 480 || dpr < 1.5) return 'low';
    if (w < 1024) return 'medium';
    return 'high';
  }

  const QUALITY_SCALE = { low: 0.5, medium: 0.75, high: 1 };

  // Color palettes
  const PALETTE_GOLD = ['#F4C77C', '#E8A94D', '#FFF6E8'];
  const PALETTE_ROSE = ['#F2A6A6', '#EEDFF5', '#FFF6E8'];
  const PALETTE_JEWEL = ['#6FCFC0', '#B98FDC', '#F4C77C'];
  const PALETTE_ALL = ['#F4C77C', '#E8A94D', '#F2A6A6', '#EEDFF5', '#B98FDC', '#6FCFC0', '#FFF6E8'];

  // ========================================================================
  //  SECTION 2 — PARTICLE POOL (Object Pooling)
  // ========================================================================

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = 0; this.y = 0;
      this.vx = 0; this.vy = 0;
      this.ax = 0; this.ay = 0;
      this.size = 4; this.alpha = 1;
      this.life = 0; this.maxLife = 3;
      this.rotation = 0; this.rotationSpeed = 0;
      this.color = '#FFF6E8';
      this.drag = 0;
      this.data = {};
      this._active = false;
    }
    get progress() { return clamp(this.life / this.maxLife, 0, 1); }
    get isDead() { return this.life >= this.maxLife; }
  }

  class ParticlePool {
    constructor(max) {
      this._pool = [];
      this._active = [];
      for (let i = 0; i < max; i++) this._pool.push(new Particle());
    }
    spawn() {
      const p = this._pool.pop() || new Particle();
      p.reset();
      p._active = true;
      this._active.push(p);
      return p;
    }
    release(p) {
      p._active = false;
      const idx = this._active.indexOf(p);
      if (idx !== -1) this._active.splice(idx, 1);
      this._pool.push(p);
    }
    forEachActive(fn) {
      // iterate backwards so removals don't skip
      for (let i = this._active.length - 1; i >= 0; i--) {
        fn(this._active[i]);
      }
    }
    get activeCount() { return this._active.length; }
  }

  // ========================================================================
  //  SECTION 3 — CANVAS MANAGER
  // ========================================================================

  function setupCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    return { ctx, resize };
  }

  // ========================================================================
  //  SECTION 4 — BACKGROUND SCENE
  // ========================================================================

  class BackgroundScene {
    constructor(canvas) {
      const { ctx, resize } = setupCanvas(canvas);
      this.canvas = canvas;
      this.ctx = ctx;
      this._resize = resize;
      this.q = QUALITY_SCALE[qualityTier()];
      this.particles = new ParticlePool(Math.floor(60 * this.q));
      this._celebrating = false;
      this._celebrateTime = 0;
      this._bokehParticles = new ParticlePool(Math.floor(30 * this.q));

      // Spawn initial ambient particles
      for (let i = 0; i < Math.floor(35 * this.q); i++) {
        this._spawnAmbientParticle();
      }
    }

    resize() { this._resize(); }

    _spawnAmbientParticle() {
      const p = this.particles.spawn();
      p.x = rand(0, window.innerWidth);
      p.y = rand(0, window.innerHeight);
      p.vx = rand(-6, 6);
      p.vy = rand(-12, -3);
      p.size = rand(1, 3);
      p.alpha = rand(0.15, 0.45);
      p.maxLife = rand(6, 14);
      p.color = choice(['#FFF6E8', '#F4C77C', '#EEDFF5']);
      p.data = { phase: rand(0, Math.PI * 2), speed: rand(0.3, 0.9) };
    }

    _spawnBokeh() {
      const p = this._bokehParticles.spawn();
      p.x = rand(0, window.innerWidth);
      p.y = rand(0, window.innerHeight);
      p.vx = rand(-4, 4);
      p.vy = rand(-8, -2);
      p.size = rand(8, 40);
      p.alpha = 0;
      p.maxLife = rand(5, 10);
      p.color = choice(PALETTE_ALL);
      p.data = { targetAlpha: rand(0.04, 0.14) };
    }

    celebrate() {
      this._celebrating = true;
      // Spawn bokeh particles for celebration background
      for (let i = 0; i < Math.floor(20 * this.q); i++) {
        this._spawnBokeh();
      }
    }

    update(dt) {
      const ctx = this.ctx;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Draw background gradient
      const grad = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, Math.max(w, h) * 0.8);
      if (this._celebrating) {
        this._celebrateTime += dt;
        const t = clamp(this._celebrateTime / 3, 0, 1);
        const r1 = lerp(45, 70, t);
        const g1 = lerp(27, 38, t);
        const b1 = lerp(78, 110, t);
        grad.addColorStop(0, `rgb(${r1|0},${g1|0},${b1|0})`);
        grad.addColorStop(0.5, `rgb(${lerp(11,26,t)|0},${lerp(10,14,t)|0},${lerp(26,51,t)|0})`);
        grad.addColorStop(1, '#05040c');
      } else {
        grad.addColorStop(0, '#2d1b4e');
        grad.addColorStop(0.6, '#0b0a1a');
        grad.addColorStop(1, '#05040c');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Ambient floating particles
      this.particles.forEachActive((p) => {
        p.life += dt;
        if (p.isDead) {
          this.particles.release(p);
          this._spawnAmbientParticle();
          return;
        }
        p.data.phase += p.data.speed * dt;
        p.x += (p.vx + Math.sin(p.data.phase) * 8) * dt;
        p.y += p.vy * dt;

        // Wrap around
        if (p.y < -10) { p.y = h + 10; p.x = rand(0, w); }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        const fadeIn = clamp(p.life / 1.5, 0, 1);
        const fadeOut = clamp((p.maxLife - p.life) / 1.5, 0, 1);
        const alpha = p.alpha * Math.min(fadeIn, fadeOut);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Celebration bokeh
      if (this._celebrating) {
        this._bokehParticles.forEachActive((p) => {
          p.life += dt;
          if (p.isDead) {
            this._bokehParticles.release(p);
            if (Math.random() < 0.3) this._spawnBokeh();
            return;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          const t = p.progress;
          p.alpha = t < 0.2 ? lerp(0, p.data.targetAlpha, t / 0.2)
            : t > 0.7 ? lerp(p.data.targetAlpha, 0, (t - 0.7) / 0.3)
            : p.data.targetAlpha;

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, p.color);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }
    }
  }

  // ========================================================================
  //  SECTION 5 — PREMIUM SVG CAKE BUILDER
  // ========================================================================

  function buildPremiumCake(container) {
    // Clear any existing cake
    container.innerHTML = '';

    const sceneEl = document.createElement('div');
    sceneEl.className = 'cake-scene';

    sceneEl.innerHTML = `
      <svg class="cake-svg" viewBox="0 0 440 440" aria-label="Birthday cake with a lit candle">
        <defs>
          <!-- Gradients for realistic layers -->
          <linearGradient id="ck-frost-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fce4c4"/>
            <stop offset="100%" stop-color="#e8a94d"/>
          </linearGradient>
          <linearGradient id="ck-frost-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#fff6e8"/>
            <stop offset="100%" stop-color="#f0e0cc"/>
          </linearGradient>
          <linearGradient id="ck-frost-bot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f7bfbf"/>
            <stop offset="100%" stop-color="#e89090"/>
          </linearGradient>
          <linearGradient id="ck-candle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fff6e8"/>
            <stop offset="100%" stop-color="#f2dcc4"/>
          </linearGradient>
          <linearGradient id="ck-candle-stripe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f2a6a6"/>
            <stop offset="50%" stop-color="#f2a6a6"/>
            <stop offset="50%" stop-color="#fff6e8"/>
            <stop offset="100%" stop-color="#fff6e8"/>
          </linearGradient>

          <!-- Flame gradients -->
          <radialGradient id="ck-flame-outer" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stop-color="#fff6e8"/>
            <stop offset="30%" stop-color="#f4c77c"/>
            <stop offset="70%" stop-color="#e8a94d"/>
            <stop offset="100%" stop-color="#e8a94d" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="ck-flame-inner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="40%" stop-color="#fff6e8"/>
            <stop offset="100%" stop-color="#f4c77c" stop-opacity="0"/>
          </radialGradient>

          <!-- Glow filter for flame -->
          <filter id="ck-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <!-- Soft shadow for cake -->
          <filter id="ck-shadow" x="-10%" y="-5%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="rgba(5,4,12,0.4)"/>
          </filter>

          <!-- Icing drip pattern -->
          <clipPath id="ck-drip-clip">
            <path d="M100,150 Q100,150 112,150 Q112,168 118,172 Q124,168 124,150 L148,150 Q148,165 154,170 Q160,165 160,150 L180,150 Q180,172 186,178 Q192,172 192,150 L212,150 Q212,160 218,165 Q224,160 224,150 L248,150 Q248,175 254,180 Q260,175 260,150 L280,150 Q280,162 286,168 Q292,162 292,150 L316,150 Q316,170 322,175 Q328,170 328,150 L340,150 L340,100 L100,100 Z"/>
          </clipPath>
        </defs>

        <!-- Cake shadow on surface -->
        <ellipse cx="220" cy="320" rx="130" ry="22" fill="rgba(5,4,12,0.35)"/>

        <!-- === Bottom layer (rose) === -->
        <rect x="104" y="230" width="232" height="82" rx="18" fill="url(#ck-frost-bot)" filter="url(#ck-shadow)"/>
        <!-- Bottom layer icing detail -->
        <path d="M110,250 Q140,245 180,248 Q220,252 260,247 Q300,243 330,248" fill="none" stroke="#fff6e8" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
        <path d="M114,268 Q150,273 190,270 Q230,267 270,272 Q310,276 330,270" fill="none" stroke="#fff6e8" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>
        <path d="M112,288 Q160,293 220,290 Q280,287 328,292" fill="none" stroke="rgba(255,246,232,0.3)" stroke-width="2" stroke-linecap="round"/>

        <!-- === Middle layer (cream/white) === -->
        <rect x="114" y="168" width="212" height="72" rx="16" fill="url(#ck-frost-mid)" filter="url(#ck-shadow)"/>
        <!-- Icing drips on middle layer -->
        <g opacity="0.85">
          <path d="M124,240 Q124,252 130,258 Q136,252 136,240" fill="#fff6e8"/>
          <path d="M160,240 Q160,256 166,264 Q172,256 172,240" fill="#fff6e8"/>
          <path d="M200,240 Q200,250 206,256 Q212,250 212,240" fill="#fff6e8"/>
          <path d="M244,240 Q244,258 250,265 Q256,258 256,240" fill="#fff6e8"/>
          <path d="M284,240 Q284,254 290,260 Q296,254 296,240" fill="#fff6e8"/>
          <path d="M316,240 Q316,250 322,254 Q328,250 328,240" fill="#fff6e8"/>
        </g>
        <!-- Middle layer decoration lines -->
        <path d="M124,190 Q170,185 220,188 Q270,192 316,186" fill="none" stroke="#f4c77c" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
        <path d="M120,208 Q170,213 220,210 Q270,207 322,212" fill="none" stroke="#f4c77c" stroke-width="2" stroke-linecap="round" opacity="0.4"/>

        <!-- === Top layer (gold) === -->
        <rect x="128" y="126" width="184" height="52" rx="14" fill="url(#ck-frost-top)"/>
        <!-- Top layer frosting swirl -->
        <path d="M140,140 C160,132 180,148 200,138 C220,128 240,146 260,136 C280,126 300,142 302,140" fill="none" stroke="#fff6e8" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
        <!-- Icing drips from top layer -->
        <g opacity="0.8">
          <path d="M142,178 Q142,188 147,193 Q152,188 152,178" fill="#f4c77c"/>
          <path d="M178,178 Q178,192 183,198 Q188,192 188,178" fill="#f4c77c"/>
          <path d="M218,178 Q218,186 223,190 Q228,186 228,178" fill="#f4c77c"/>
          <path d="M254,178 Q254,194 259,200 Q264,194 264,178" fill="#f4c77c"/>
          <path d="M290,178 Q290,188 295,192 Q300,188 300,178" fill="#f4c77c"/>
        </g>

        <!-- === Frosting top (elliptical cap) === -->
        <ellipse cx="220" cy="126" rx="92" ry="12" fill="#fce4c4"/>
        <ellipse cx="220" cy="126" rx="86" ry="9" fill="#f4c77c" opacity="0.6"/>

        <!-- Small decorative dots -->
        <circle cx="148" cy="136" r="4" fill="#f2a6a6" opacity="0.7"/>
        <circle cx="172" cy="132" r="3" fill="#6fcfc0" opacity="0.6"/>
        <circle cx="268" cy="132" r="3" fill="#b98fdc" opacity="0.6"/>
        <circle cx="292" cy="136" r="4" fill="#f2a6a6" opacity="0.7"/>
        <circle cx="196" cy="130" r="2.5" fill="#eedff5" opacity="0.5"/>
        <circle cx="244" cy="130" r="2.5" fill="#eedff5" opacity="0.5"/>

        <!-- Reflective highlights on icing -->
        <ellipse cx="180" cy="195" rx="22" ry="3" fill="rgba(255,255,255,0.15)" transform="rotate(-5 180 195)"/>
        <ellipse cx="260" cy="260" rx="18" ry="2.5" fill="rgba(255,255,255,0.12)" transform="rotate(3 260 260)"/>

        <!-- === Candle === -->
        <rect x="212" y="74" width="16" height="52" rx="4" fill="url(#ck-candle)"/>
        <!-- Candle stripes -->
        <rect x="212" y="80" width="16" height="6" rx="2" fill="#f2a6a6" opacity="0.6"/>
        <rect x="212" y="92" width="16" height="6" rx="2" fill="#f2a6a6" opacity="0.6"/>
        <rect x="212" y="104" width="16" height="6" rx="2" fill="#f2a6a6" opacity="0.6"/>
        <!-- Wick -->
        <line x1="220" y1="74" x2="220" y2="64" stroke="#3a2a1a" stroke-width="2" stroke-linecap="round"/>

        <!-- === Flame group (animated by GSAP) === -->
        <g class="cake-flame-group" filter="url(#ck-glow)">
          <!-- Outer flame -->
          <ellipse class="cake-flame-outer" cx="220" cy="52" rx="10" ry="16" fill="url(#ck-flame-outer)"/>
          <!-- Inner flame -->
          <ellipse class="cake-flame-inner" cx="220" cy="56" rx="5" ry="9" fill="url(#ck-flame-inner)"/>
        </g>

        <!-- === Smoke particles (hidden until blow) === -->
        <g class="cake-smoke-group">
          <circle class="cake-smoke" cx="218" cy="50" r="3" fill="rgba(200,200,210,0.5)"/>
          <circle class="cake-smoke" cx="222" cy="46" r="2.5" fill="rgba(200,200,210,0.4)"/>
          <circle class="cake-smoke" cx="216" cy="42" r="2" fill="rgba(200,200,210,0.3)"/>
          <circle class="cake-smoke" cx="224" cy="38" r="3.5" fill="rgba(200,200,210,0.25)"/>
          <circle class="cake-smoke" cx="219" cy="34" r="2" fill="rgba(200,200,210,0.2)"/>
        </g>

        <!-- Sparkle decorations on cake (animated) -->
        <circle class="cake-sparkle" cx="106" cy="252" r="4" fill="#fff6e8" opacity="0"/>
        <circle class="cake-sparkle" cx="334" cy="252" r="4" fill="#f2a6a6" opacity="0"/>
        <circle class="cake-sparkle" cx="128" cy="170" r="3.5" fill="#6fcfc0" opacity="0"/>
        <circle class="cake-sparkle" cx="312" cy="170" r="3.5" fill="#eedff5" opacity="0"/>
        <circle class="cake-sparkle" cx="144" cy="128" r="3" fill="#b98fdc" opacity="0"/>
        <circle class="cake-sparkle" cx="296" cy="128" r="3" fill="#f4c77c" opacity="0"/>
      </svg>

      <!-- Tap hotspot over the candle area -->
      <button class="candle-hotspot" aria-label="Tap to blow out the candle" tabindex="0"></button>
    `;

    container.appendChild(sceneEl);
    return sceneEl;
  }

  // ========================================================================
  //  SECTION 6 — FLAME ANIMATION CONTROLLER
  // ========================================================================

  class FlameController {
    constructor(cakeStage) {
      this.stage = cakeStage;
      this.scene = cakeStage.querySelector('.cake-scene');
      this.outerFlame = cakeStage.querySelector('.cake-flame-outer');
      this.innerFlame = cakeStage.querySelector('.cake-flame-inner');
      this.flameGroup = cakeStage.querySelector('.cake-flame-group');
      this.smokeEls = Array.from(cakeStage.querySelectorAll('.cake-smoke'));
      this._flickerTl = null;
      this._alive = true;
    }

    /** Start idle flame flickering */
    startFlicker() {
      if (!this.outerFlame || prefersReducedMotion()) return;

      this._flickerTl = gsap.timeline({ repeat: -1 });

      // Outer flame gentle wobble
      this._flickerTl.to(this.outerFlame, {
        scaleX: () => rand(0.85, 1.15),
        scaleY: () => rand(0.88, 1.12),
        x: () => rand(-1.5, 1.5),
        duration: () => rand(0.15, 0.35),
        ease: 'sine.inOut',
        repeat: 1,
        yoyo: true
      });

      // Inner flame moves slightly differently
      gsap.to(this.innerFlame, {
        scaleX: () => rand(0.8, 1.2),
        scaleY: () => rand(0.85, 1.15),
        x: () => rand(-1, 1),
        duration: () => rand(0.12, 0.3),
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });
    }

    /** Animate the flame being blown out. Returns a promise. */
    blowOut(direction) {
      return new Promise((resolve) => {
        if (this._flickerTl) this._flickerTl.kill();
        gsap.killTweensOf(this.innerFlame);

        const dir = direction || rand(-1, 1);
        const tl = gsap.timeline({ onComplete: resolve });

        // Phase 1: flame pushed sideways, flickering wildly
        tl.to(this.outerFlame, {
          x: dir * 12,
          scaleX: 0.5,
          scaleY: 1.4,
          duration: 0.2,
          ease: 'power2.out'
        })
        .to(this.innerFlame, {
          x: dir * 8,
          scaleX: 0.4,
          scaleY: 1.3,
          duration: 0.2,
          ease: 'power2.out'
        }, '<')

        // Phase 2: flame gets smaller
        .to(this.outerFlame, {
          scaleX: 0.2,
          scaleY: 0.4,
          opacity: 0.6,
          duration: 0.15,
          ease: 'power1.in'
        })
        .to(this.innerFlame, {
          scaleX: 0.15,
          scaleY: 0.3,
          opacity: 0.5,
          duration: 0.15,
          ease: 'power1.in'
        }, '<')

        // Phase 3: extinguish
        .to([this.outerFlame, this.innerFlame], {
          scaleX: 0,
          scaleY: 0,
          opacity: 0,
          duration: 0.1,
          ease: 'power2.in'
        })
        .call(() => {
          this._alive = false;
          // Remove flame glow from cake scene
          if (this.scene) {
            gsap.to(this.scene, { '--flame-light': 0, duration: 0.5 });
          }
        })

        // Phase 4: smoke rises
        .call(() => this._animateSmoke());
      });
    }

    _animateSmoke() {
      this.smokeEls.forEach((el, i) => {
        const delay = i * 0.08;
        gsap.fromTo(el,
          { opacity: 0, y: 0, scale: 0.6 },
          {
            opacity: 0.5 - i * 0.08,
            y: -(15 + i * 12),
            x: rand(-6, 6),
            scale: 1 + i * 0.3,
            duration: 1.2 + i * 0.2,
            delay,
            ease: 'power1.out',
            onComplete: () => gsap.to(el, { opacity: 0, duration: 0.5 })
          }
        );
      });
    }
  }

  // ========================================================================
  //  SECTION 7 — AUDIO MANAGER (Synthesized)
  // ========================================================================

  class AudioManager {
    constructor() {
      this._ctx = null;
      this._master = null;
      this._ambientNodes = [];
      this._celebrationNodes = [];
      this._isRunning = false;
    }

    get isRunning() { return this._isRunning; }

    async resume() {
      try {
        if (!this._ctx) {
          this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this._ctx.state === 'suspended') {
          await this._ctx.resume();
        }
        if (!this._master) {
          this._master = this._ctx.createGain();
          this._master.gain.value = 0.18;
          this._master.connect(this._ctx.destination);
        }
        this._isRunning = this._ctx.state === 'running';
      } catch {
        this._isRunning = false;
      }
    }

    /** Play soft ambient soundscape */
    playAmbient() {
      if (!this._ctx || !this._master) return;
      const ctx = this._ctx;

      // Warm filtered noise (ocean-like)
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 280;
      lpf.Q.value = 0.4;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.15;

      noise.connect(lpf);
      lpf.connect(noiseGain);
      noiseGain.connect(this._master);
      noise.start();

      this._ambientNodes.push({ source: noise, gain: noiseGain });

      // Warm pad — gentle chords
      const padNotes = [130.81, 196.00, 261.63, 329.63]; // C3, G3, C4, E4
      padNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const oscGain = ctx.createGain();
        oscGain.gain.value = 0;
        // Fade in gently
        oscGain.gain.setValueAtTime(0, ctx.currentTime);
        oscGain.gain.linearRampToValueAtTime(0.012, ctx.currentTime + 2 + i * 0.5);

        const vibrato = ctx.createOscillator();
        vibrato.frequency.value = 0.3 + i * 0.1;
        const vibGain = ctx.createGain();
        vibGain.gain.value = 0.8;
        vibrato.connect(vibGain);
        vibGain.connect(osc.frequency);
        vibrato.start();

        osc.connect(oscGain);
        oscGain.connect(this._master);
        osc.start();

        this._ambientNodes.push({ source: osc, gain: oscGain, vibrato });
      });
    }

    /** Crossfade from ambient to celebration music */
    crossfadeToCelebration() {
      if (!this._ctx || !this._master) return;
      const ctx = this._ctx;
      const now = ctx.currentTime;

      // Fade out ambient
      this._ambientNodes.forEach(n => {
        if (n.gain) {
          n.gain.gain.linearRampToValueAtTime(0, now + 1.5);
        }
      });

      // Celebration: brighter, more energetic
      const celebNotes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      celebNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i < 2 ? 'sine' : 'triangle';
        osc.frequency.value = freq;

        const oscGain = ctx.createGain();
        oscGain.gain.value = 0;
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(0.018, now + 1 + i * 0.3);

        const vibrato = ctx.createOscillator();
        vibrato.frequency.value = 0.5 + i * 0.15;
        const vibGain = ctx.createGain();
        vibGain.gain.value = 1.2;
        vibrato.connect(vibGain);
        vibGain.connect(osc.frequency);
        vibrato.start();

        osc.connect(oscGain);
        oscGain.connect(this._master);
        osc.start();

        this._celebrationNodes.push({ source: osc, gain: oscGain });
      });

      // Arpeggiated sparkle notes
      const sparkleNotes = [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25];
      let noteIndex = 0;
      const sparkleInterval = setInterval(() => {
        if (!this._isRunning || noteIndex > 60) { clearInterval(sparkleInterval); return; }
        this._playNote(sparkleNotes[noteIndex % sparkleNotes.length], 0.008, 2.5);
        noteIndex++;
      }, 800 + Math.random() * 600);
    }

    /** Play a short single-note tone */
    _playNote(freq, vol, dur) {
      if (!this._ctx || !this._master) return;
      const ctx = this._ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this._master);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
    }

    /** Short firework burst sound */
    sfxFireworkBurst() {
      if (!this._ctx || !this._master) return;
      const ctx = this._ctx;
      const bufLen = ctx.sampleRate * 0.3;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 0.06;
      const bpf = ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.value = 800 + Math.random() * 600;
      bpf.Q.value = 1;
      src.connect(bpf);
      bpf.connect(g);
      g.connect(this._master);
      src.start();
    }

    /** Short confetti pop sound */
    sfxConfettiPop() {
      if (!this._ctx || !this._master) return;
      this._playNote(1200 + Math.random() * 400, 0.015, 0.15);
    }

    /** Tiny sparkle chime */
    sfxSparkle() {
      if (!this._ctx || !this._master) return;
      this._playNote(2000 + Math.random() * 1500, 0.005, 0.8);
    }

    /** Soft cheering ambience */
    sfxCheerAmbience() {
      if (!this._ctx || !this._master) return;
      const ctx = this._ctx;
      const dur = 4;
      const bufLen = ctx.sampleRate * dur;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        const env = Math.sin((i / bufLen) * Math.PI);
        d[i] = (Math.random() * 2 - 1) * env * 0.3;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 1200;
      const g = ctx.createGain();
      g.gain.value = 0.04;
      src.connect(lpf);
      lpf.connect(g);
      g.connect(this._master);
      src.start();
    }
  }

  // ========================================================================
  //  SECTION 8 — BLOW DETECTION (Web Audio API)
  // ========================================================================

  class AudioDetection {
    constructor(opts) {
      this.threshold = opts.threshold || 0.14;
      this.sustainMs = opts.sustainMs || 480;
      this.onBlow = opts.onBlow || null;
      this.onUnavailable = opts.onUnavailable || null;
      this._stream = null;
      this._analyser = null;
      this._ctx = null;
      this._running = false;
      this._aboveStart = 0;
    }

    async start() {
      try {
        this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        const source = this._ctx.createMediaStreamSource(this._stream);
        this._analyser = this._ctx.createAnalyser();
        this._analyser.fftSize = 256;
        source.connect(this._analyser);
        this._running = true;
        this._monitor();
        return true;
      } catch {
        if (this.onUnavailable) this.onUnavailable();
        return false;
      }
    }

    _monitor() {
      if (!this._running) return;
      const data = new Uint8Array(this._analyser.frequencyBinCount);
      this._analyser.getByteFrequencyData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length / 255;

      if (avg > this.threshold) {
        if (this._aboveStart === 0) this._aboveStart = performance.now();
        else if (performance.now() - this._aboveStart >= this.sustainMs) {
          this.stop();
          if (this.onBlow) this.onBlow();
          return;
        }
      } else {
        this._aboveStart = 0;
      }

      requestAnimationFrame(() => this._monitor());
    }

    stop() {
      this._running = false;
      if (this._stream) {
        this._stream.getTracks().forEach(t => t.stop());
        this._stream = null;
      }
      if (this._ctx) {
        this._ctx.close().catch(() => {});
        this._ctx = null;
      }
    }
  }

  // ========================================================================
  //  SECTION 9 — CONFETTI SYSTEM
  // ========================================================================

  const CONFETTI_SHAPES = ['rect', 'circle', 'triangle', 'ribbon'];

  class ConfettiSystem {
    constructor(canvas) {
      const { ctx, resize } = setupCanvas(canvas);
      this.canvas = canvas;
      this.ctx = ctx;
      this._resize = resize;
      this.q = QUALITY_SCALE[qualityTier()];
      this.pool = new ParticlePool(Math.floor(500 * this.q));
      this._emitters = [];
      this._emitAccum = new Map();
      this.landingZone = null;
    }

    resize() { this._resize(); }

    /** Instant burst of confetti from (x, y) */
    burst(x, y, count, opts) {
      opts = opts || {};
      const n = Math.max(1, Math.round(count * this.q));
      for (let i = 0; i < n; i++) {
        const p = this.pool.spawn();
        const angle = (opts.angle ?? -Math.PI / 2) + rand(-1, 1) * ((opts.spread ?? Math.PI) / 2);
        const speed = rand(opts.minSpeed ?? 240, opts.maxSpeed ?? 680);
        p.x = x + rand(-8, 8);
        p.y = y + rand(-8, 8);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.ay = rand(380, 560); // gravity
        p.drag = rand(0.35, 0.85);
        p.size = rand(5, 14);
        p.rotation = rand(0, Math.PI * 2);
        p.rotationSpeed = rand(-10, 10);
        p.color = opts.palette ? choice(opts.palette) : choice(PALETTE_ALL);
        p.maxLife = rand(3, 5.5);
        p.data = {
          shape: choice(CONFETTI_SHAPES),
          wobble: rand(0, Math.PI * 2),
          wobbleSpeed: rand(2, 5),
          bounced: 0,
          landed: false
        };
      }
    }

    /** Emit `rate` pieces/sec from (x,y) for `duration` seconds */
    emitFor(x, y, duration, rate, opts) {
      const id = Symbol('emitter');
      this._emitters.push({ id, x, y, duration, elapsed: 0, rate, opts: opts || {} });
      this._emitAccum.set(id, 0);
    }

    update(dt) {
      // Process emitters
      for (let i = this._emitters.length - 1; i >= 0; i--) {
        const e = this._emitters[i];
        e.elapsed += dt;
        let acc = this._emitAccum.get(e.id) + e.rate * dt;
        while (acc >= 1) {
          this.burst(e.x + rand(-30, 30), e.y + rand(-10, 10), 1, e.opts);
          acc -= 1;
        }
        this._emitAccum.set(e.id, acc);
        if (e.elapsed >= e.duration) {
          this._emitAccum.delete(e.id);
          this._emitters.splice(i, 1);
        }
      }

      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const floor = window.innerHeight + 24;

      this.pool.forEachActive((p) => {
        p.life += dt;
        if (p.isDead) { this.pool.release(p); return; }

        p.vx *= 1 - p.drag * dt;
        p.vy += p.ay * dt;
        p.data.wobble += p.data.wobbleSpeed * dt;
        p.x += (p.vx + Math.sin(p.data.wobble) * 46) * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * dt;

        // Landing zone (cake top)
        if (!p.data.landed && this.landingZone) {
          const lz = this.landingZone();
          if (lz && p.vy > 0 && p.y > lz.y - 4 && p.y < lz.y + 26
              && p.x > lz.x - lz.width / 2 && p.x < lz.x + lz.width / 2) {
            p.y = lz.y;
            p.vy = 0;
            p.vx *= 0.25;
            p.ay = 0;
            p.data.landed = true;
          }
        }

        // Floor bounce
        if (!p.data.landed && p.y > floor - 6 && p.vy > 0 && p.data.bounced < 2) {
          p.vy *= -0.32;
          p.vx *= 0.55;
          p.data.bounced++;
        }

        // Fade out
        const fadeStart = p.maxLife * 0.72;
        p.alpha = p.life > fadeStart ? clamp(1 - (p.life - fadeStart) / (p.maxLife - fadeStart), 0, 1) : 1;

        this._drawPiece(p);
      });
    }

    _drawPiece(p) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      const s = p.size;
      switch (p.data.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(0, -s / 2);
          ctx.lineTo(s / 2, s / 2);
          ctx.lineTo(-s / 2, s / 2);
          ctx.closePath();
          ctx.fill();
          break;
        case 'ribbon':
          ctx.fillRect(-s / 6, -s * 0.9, s / 3, s * 1.8);
          break;
        default: // rect
          ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      }
      ctx.restore();
    }
  }

  // ========================================================================
  //  SECTION 10 — FIREWORKS SYSTEM
  // ========================================================================

  class FireworksSystem {
    constructor(canvas, opts) {
      const { ctx, resize } = setupCanvas(canvas);
      this.canvas = canvas;
      this.ctx = ctx;
      this._resize = resize;
      this.q = QUALITY_SCALE[qualityTier()];
      this.onExplode = opts?.onExplode || null;

      this._rockets = [];
      this._explosions = new ParticlePool(Math.floor(600 * this.q));
      this._trails = new ParticlePool(Math.floor(200 * this.q));
    }

    resize() { this._resize(); }

    /** Schedule a wave of `count` fireworks, spaced evenly */
    scheduleWave(count, intensity, opts) {
      opts = opts || {};
      for (let i = 0; i < count; i++) {
        const delay = i * rand(300, 600);
        setTimeout(() => this._launchRocket(intensity, opts), delay);
      }
    }

    _launchRocket(intensity, opts) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this._rockets.push({
        x: rand(w * 0.15, w * 0.85),
        y: h + 20,
        targetY: rand(h * 0.1, h * 0.35),
        targetX: rand(w * 0.2, w * 0.8),
        speed: rand(400, 700),
        size: opts.size || 'medium',
        palette: opts.palette || PALETTE_ALL,
        trailTimer: 0,
        alive: true
      });
    }

    update(dt) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Update rockets
      for (let i = this._rockets.length - 1; i >= 0; i--) {
        const r = this._rockets[i];
        if (!r.alive) { this._rockets.splice(i, 1); continue; }

        const dx = r.targetX - r.x;
        const dy = r.targetY - r.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 15) {
          r.alive = false;
          this._explode(r.x, r.y, r.size, r.palette);
          this._rockets.splice(i, 1);
          continue;
        }

        const vx = (dx / dist) * r.speed * dt;
        const vy = (dy / dist) * r.speed * dt;
        r.x += vx;
        r.y += vy;

        // Trail
        r.trailTimer += dt;
        if (r.trailTimer > 0.02) {
          r.trailTimer = 0;
          const tp = this._trails.spawn();
          tp.x = r.x + rand(-2, 2);
          tp.y = r.y;
          tp.size = rand(1.5, 3);
          tp.maxLife = rand(0.3, 0.6);
          tp.color = '#F4C77C';
          tp.alpha = 0.8;
        }

        // Draw rocket
        ctx.save();
        ctx.fillStyle = '#FFF6E8';
        ctx.shadowColor = '#F4C77C';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Update trails
      this._trails.forEachActive((p) => {
        p.life += dt;
        if (p.isDead) { this._trails.release(p); return; }
        p.alpha = 1 - p.progress;
        ctx.save();
        ctx.globalAlpha = p.alpha * 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - p.progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Update explosion particles
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this._explosions.forEachActive((p) => {
        p.life += dt;
        if (p.isDead) { this._explosions.release(p); return; }

        p.vx *= 1 - 0.6 * dt;
        p.vy += 80 * dt; // gravity
        p.vy *= 1 - 0.3 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const t = p.progress;
        p.alpha = t < 0.1 ? t / 0.1 : clamp(1 - (t - 0.3) / 0.7, 0, 1);

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.data.glow ? 8 : 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t * 0.4), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    _explode(x, y, size, palette) {
      const counts = { small: 30, medium: 55, large: 85 };
      const speeds = { small: 120, medium: 180, large: 260 };
      const count = Math.floor((counts[size] || 55) * this.q);
      const maxSpeed = speeds[size] || 180;

      for (let i = 0; i < count; i++) {
        const p = this._explosions.spawn();
        const angle = rand(0, Math.PI * 2);
        const speed = rand(maxSpeed * 0.3, maxSpeed);
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.size = rand(1.5, 4);
        p.color = choice(palette);
        p.maxLife = rand(1.2, 2.5);
        p.data = { glow: Math.random() < 0.3 };
      }

      if (this.onExplode) this.onExplode(size);
    }
  }

  // ========================================================================
  //  SECTION 11 — DECORATIONS
  //  (sparkles, hearts, balloons, streamers, golden bloom + light rays)
  // ========================================================================

  const HEART_COLORS = ['#F2A6A6', '#F4C77C', '#EEDFF5'];
  const BALLOON_COLORS = ['#E8A94D', '#F2A6A6', '#B98FDC', '#6FCFC0', '#F4C77C'];
  const STREAMER_COLORS = ['#F4C77C', '#F2A6A6', '#B98FDC', '#6FCFC0', '#EEDFF5'];

  class Decorations {
    constructor(canvas, cakeOriginFn) {
      const { ctx, resize } = setupCanvas(canvas);
      this.canvas = canvas;
      this.ctx = ctx;
      this._resize = resize;
      this.q = QUALITY_SCALE[qualityTier()];
      this.cakeOrigin = cakeOriginFn;

      this.sparkles = new ParticlePool(Math.floor(90 * this.q));
      this.hearts = new ParticlePool(Math.floor(40 * this.q));
      this.balloons = [];
      this.streamers = [];

      this.active = false;
      this.bloom = { r: 0, target: 0, alpha: 0 };
      this.rayRotation = 0;

      this._sparkleTimer = 0;
      this._heartTimer = 0;
      this._streamerTimer = 0;
    }

    resize() { this._resize(); }

    celebrate() {
      this.active = true;
      const origin = this.cakeOrigin();
      this.bloom.target = Math.max(window.innerWidth, window.innerHeight) * 0.6;
      this.bloom.alpha = 1;

      for (let i = 0; i < Math.floor(22 * this.q); i++) this._spawnSparkle(origin, true);
      for (let i = 0; i < Math.floor(9 * this.q); i++) this._spawnBalloon(i * 0.18);
    }

    update(dt, elapsed) {
      const ctx = this.ctx;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      if (!this.active) return;

      this._updateBloom(dt, ctx, w, h);
      this._updateSparkles(dt, ctx);
      this._updateHearts(dt, ctx);
      this._updateBalloons(dt, ctx);
      this._updateStreamers(dt, ctx);

      // Trickle spawning
      this._sparkleTimer -= dt;
      if (this._sparkleTimer <= 0) {
        this._spawnSparkle(this.cakeOrigin(), Math.random() < 0.5);
        this._sparkleTimer = rand(0.08, 0.22);
      }
      this._heartTimer -= dt;
      if (this._heartTimer <= 0) {
        this._spawnHeart();
        this._heartTimer = rand(0.4, 0.9);
      }
      this._streamerTimer -= dt;
      if (this._streamerTimer <= 0 && this.streamers.length < 26 * this.q) {
        this._spawnStreamer();
        this._streamerTimer = rand(0.12, 0.3);
      }
    }

    // -- Bloom + Light Rays --
    _updateBloom(dt, ctx, w, h) {
      this.bloom.r += (this.bloom.target - this.bloom.r) * Math.min(1, dt * 1.4);
      this.rayRotation += dt * 0.08;
      const origin = this.cakeOrigin();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, this.bloom.r);
      grad.addColorStop(0, `rgba(244,199,124,${0.22 * this.bloom.alpha})`);
      grad.addColorStop(0.5, `rgba(232,169,77,${0.09 * this.bloom.alpha})`);
      grad.addColorStop(1, 'rgba(232,169,77,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Light rays
      ctx.translate(origin.x, origin.y);
      ctx.rotate(this.rayRotation);
      const rays = 10;
      for (let i = 0; i < rays; i++) {
        ctx.save();
        ctx.rotate((i / rays) * Math.PI * 2);
        const rayGrad = ctx.createLinearGradient(0, 0, this.bloom.r, 0);
        rayGrad.addColorStop(0, `rgba(255,246,232,${0.1 * this.bloom.alpha})`);
        rayGrad.addColorStop(1, 'rgba(255,246,232,0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(this.bloom.r, -22);
        ctx.lineTo(this.bloom.r, 22);
        ctx.lineTo(0, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // -- Sparkles --
    _spawnSparkle(origin, orbiting) {
      const p = this.sparkles.spawn();
      if (orbiting) {
        const angle = rand(0, Math.PI * 2);
        const radius = rand(60, 170);
        p.data = { mode: 'orbit', angle, radius, speed: rand(0.4, 1.1) * (Math.random() < 0.5 ? 1 : -1), origin };
        p.x = origin.x + Math.cos(angle) * radius;
        p.y = origin.y + Math.sin(angle) * radius;
      } else {
        p.data = { mode: 'drift', twinklePhase: rand(0, Math.PI * 2) };
        p.x = rand(0, window.innerWidth);
        p.y = rand(0, window.innerHeight);
        p.vx = rand(-8, 8);
        p.vy = rand(-30, -8);
      }
      p.size = rand(2, 5);
      p.color = choice(PALETTE_GOLD);
      p.maxLife = rand(1.6, 3.4);
      p.rotation = rand(0, Math.PI * 2);
      p.rotationSpeed = rand(-3, 3);
    }

    _updateSparkles(dt, ctx) {
      this.sparkles.forEachActive((p) => {
        p.life += dt;
        if (p.isDead) { this.sparkles.release(p); return; }
        const t = p.progress;
        p.alpha = Math.sin(t * Math.PI);
        p.rotation += p.rotationSpeed * dt;

        if (p.data.mode === 'orbit') {
          p.data.angle += p.data.speed * dt;
          p.x = p.data.origin.x + Math.cos(p.data.angle) * p.data.radius;
          p.y = p.data.origin.y + Math.sin(p.data.angle) * p.data.radius * 0.6;
        } else {
          p.data.twinklePhase += dt * 6;
          p.alpha *= 0.6 + Math.sin(p.data.twinklePhase) * 0.4;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }

        // Draw sparkle (4-point star)
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = clamp(p.alpha, 0, 1);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.28, -s * 0.28);
        ctx.lineTo(s, 0);
        ctx.lineTo(s * 0.28, s * 0.28);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.28, s * 0.28);
        ctx.lineTo(-s, 0);
        ctx.lineTo(-s * 0.28, -s * 0.28);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    }

    // -- Hearts --
    _spawnHeart() {
      const p = this.hearts.spawn();
      p.x = rand(window.innerWidth * 0.15, window.innerWidth * 0.85);
      p.y = window.innerHeight + 20;
      p.vx = rand(-10, 10);
      p.vy = -rand(30, 70);
      p.size = rand(8, 20);
      p.color = choice(HEART_COLORS);
      p.maxLife = rand(4, 7);
      p.data = { sway: rand(0, Math.PI * 2), swaySpeed: rand(0.6, 1.4) };
    }

    _updateHearts(dt, ctx) {
      this.hearts.forEachActive((p) => {
        p.life += dt;
        if (p.isDead) { this.hearts.release(p); return; }
        p.data.sway += dt * p.data.swaySpeed;
        p.x += (p.vx + Math.sin(p.data.sway) * 14) * dt;
        p.y += p.vy * dt;
        const t = p.progress;
        p.alpha = t < 0.15 ? t / 0.15 : t > 0.75 ? clamp(1 - (t - 0.75) / 0.25, 0, 1) : 1;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = p.alpha * 0.85;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        const s = p.size / 16;
        ctx.beginPath();
        ctx.moveTo(0, 4 * s);
        ctx.bezierCurveTo(-8 * s, -4 * s, -16 * s, 6 * s, 0, 16 * s);
        ctx.bezierCurveTo(16 * s, 6 * s, 8 * s, -4 * s, 0, 4 * s);
        ctx.fill();
        ctx.restore();
      });
    }

    // -- Balloons --
    _spawnBalloon(delay) {
      this.balloons.push({
        delay: delay || 0,
        x: rand(window.innerWidth * 0.08, window.innerWidth * 0.92),
        y: window.innerHeight + 60,
        vy: -rand(24, 46),
        swayPhase: rand(0, Math.PI * 2),
        swaySpeed: rand(0.4, 1),
        swayAmp: rand(12, 34),
        rotation: rand(-0.08, 0.08),
        rotationSpeed: rand(-0.15, 0.15),
        w: rand(30, 46),
        color: choice(BALLOON_COLORS),
        life: 0,
        maxLife: rand(9, 14)
      });
    }

    _updateBalloons(dt, ctx) {
      for (let i = this.balloons.length - 1; i >= 0; i--) {
        const b = this.balloons[i];
        if (b.delay > 0) { b.delay -= dt; continue; }
        b.life += dt;
        if (b.life >= b.maxLife || b.y < -120) {
          this.balloons.splice(i, 1);
          if (this.active && this.balloons.length < 4 && Math.random() < 0.05) this._spawnBalloon();
          continue;
        }
        b.swayPhase += dt * b.swaySpeed;
        b.x += Math.sin(b.swayPhase) * b.swayAmp * dt;
        b.y += b.vy * dt;
        b.rotation += b.rotationSpeed * dt * Math.sin(b.swayPhase);

        const fadeIn = clamp(b.life / 0.6, 0, 1);
        const fadeOut = clamp((b.maxLife - b.life) / 1.2, 0, 1);
        const alpha = Math.min(fadeIn, fadeOut);

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rotation);
        ctx.globalAlpha = alpha;

        // String
        ctx.strokeStyle = 'rgba(255,246,232,0.35)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, b.w * 0.62);
        ctx.quadraticCurveTo(6, b.w * 0.9, 0, b.w * 1.2);
        ctx.stroke();

        // Body
        const grad = ctx.createRadialGradient(-b.w * 0.25, -b.w * 0.3, b.w * 0.1, 0, 0, b.w * 0.75);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.25, b.color);
        grad.addColorStop(1, shadeColor(b.color, -18));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, b.w * 0.62, b.w * 0.78, 0, 0, Math.PI * 2);
        ctx.fill();

        // Knot
        ctx.fillStyle = shadeColor(b.color, -18);
        ctx.beginPath();
        ctx.moveTo(-4, b.w * 0.6);
        ctx.lineTo(4, b.w * 0.6);
        ctx.lineTo(0, b.w * 0.72);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    // -- Streamers --
    _spawnStreamer() {
      this.streamers.push({
        x: rand(0, window.innerWidth),
        y: -30,
        vy: rand(70, 130),
        len: rand(30, 60),
        width: rand(4, 7),
        color: choice(STREAMER_COLORS),
        phase: rand(0, Math.PI * 2),
        freq: rand(1.2, 2.6),
        amp: rand(30, 80),
        rotSpeed: rand(1, 3) * (Math.random() < 0.5 ? 1 : -1),
        life: 0,
        maxLife: rand(3.5, 6)
      });
    }

    _updateStreamers(dt, ctx) {
      for (let i = this.streamers.length - 1; i >= 0; i--) {
        const s = this.streamers[i];
        s.life += dt;
        if (s.life >= s.maxLife || s.y - s.len > window.innerHeight + 40) {
          this.streamers.splice(i, 1);
          continue;
        }
        s.phase += dt * s.freq;
        s.y += s.vy * dt;
        const x = s.x + Math.sin(s.phase) * s.amp;
        const rot = s.phase * s.rotSpeed;
        const fadeOut = clamp((s.maxLife - s.life) / 0.8, 0, 1);

        ctx.save();
        ctx.translate(x, s.y);
        ctx.rotate(rot);
        ctx.globalAlpha = Math.min(1, fadeOut);
        ctx.fillStyle = s.color;
        ctx.fillRect(-s.width / 2, -s.len / 2, s.width, s.len);
        ctx.restore();
      }
    }
  }

  function shadeColor(hex, percent) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = clamp(Math.round(r + (percent / 100) * 255), 0, 255);
    g = clamp(Math.round(g + (percent / 100) * 255), 0, 255);
    b = clamp(Math.round(b + (percent / 100) * 255), 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  // ========================================================================
  //  SECTION 12 — TYPOGRAPHY REVEAL
  // ========================================================================

  class TypographyReveal {
    constructor(headingEl, lineEls) {
      this.headingEl = headingEl;
      this.lineEls = lineEls;
    }

    play() {
      // Split heading into letter spans
      this._splitHeading();

      const letters = Array.from(this.headingEl.querySelectorAll('.letter'));
      const heart = this.headingEl.querySelector('.heart');

      // Animate each letter
      letters.forEach((letter, i) => {
        gsap.to(letter, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: 0.04 * i,
          ease: 'back.out(1.7)',
          onComplete: () => {
            // Glow pulse
            gsap.to(letter, {
              '--glow': 1,
              duration: 0.4,
              ease: 'power1.in',
              yoyo: true,
              repeat: 1
            });
          }
        });
      });

      // Heart animation
      if (heart) {
        gsap.fromTo(heart,
          { opacity: 0, scale: 0 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.8,
            delay: letters.length * 0.04 + 0.3,
            ease: 'elastic.out(1, 0.5)'
          }
        );
      }

      // Animate each message line
      this.lineEls.forEach((line, i) => {
        const baseDelay = letters.length * 0.04 + 1 + i * 1.2;
        gsap.to(line, {
          visibility: 'visible',
          opacity: 1,
          y: 0,
          duration: 1.2,
          delay: baseDelay,
          ease: 'power2.out'
        });
        gsap.to(line, {
          '--glow': 0.8,
          duration: 0.8,
          delay: baseDelay + 0.3,
          ease: 'power1.inOut',
          yoyo: true,
          repeat: 1
        });
      });
    }

    _splitHeading() {
      const text = this.headingEl.childNodes;
      let html = '';

      text.forEach(node => {
        if (node.nodeType === 3) {
          // Text node — wrap each character
          const chars = node.textContent;
          for (const ch of chars) {
            if (ch === ' ') {
              html += '<span class="word-space"> </span>';
            } else {
              html += `<span class="letter">${ch}</span>`;
            }
          }
        } else if (node.nodeType === 1) {
          // Element (like the heart span) — keep as-is but hide initially
          const clone = node.cloneNode(true);
          clone.style.opacity = '0';
          html += clone.outerHTML;
        }
      });

      this.headingEl.innerHTML = html;
    }
  }

  // ========================================================================
  //  SECTION 13 — ANIMATION MANAGER (RAF Loop + Visibility API)
  // ========================================================================

  class AnimationManager {
    constructor() {
      this._systems = [];
      this._running = false;
      this._lastTime = 0;
      this._elapsed = 0;
      this._raf = null;
      this._visible = true;

      // Pause when tab is hidden
      document.addEventListener('visibilitychange', () => {
        this._visible = !document.hidden;
        if (this._visible && this._running) {
          this._lastTime = performance.now();
        }
      });
    }

    register(system) {
      this._systems.push(system);
    }

    start() {
      if (this._running) return;
      this._running = true;
      this._lastTime = performance.now();
      this._tick();
    }

    stop() {
      this._running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    _tick() {
      if (!this._running) return;
      this._raf = requestAnimationFrame(() => this._tick());

      if (!this._visible) return;

      const now = performance.now();
      const dt = Math.min((now - this._lastTime) / 1000, 0.1); // Cap at 100ms
      this._lastTime = now;
      this._elapsed += dt;

      for (const sys of this._systems) {
        if (sys.update) sys.update(dt, this._elapsed);
      }
    }

    /** Trigger resize on all systems */
    resize() {
      for (const sys of this._systems) {
        if (sys.resize) sys.resize();
      }
    }
  }

  // ========================================================================
  //  SECTION 14 — MAIN ORCHESTRATOR
  // ========================================================================

  const CAKE_VIEWBOX = 440;
  let celebrationInitialized = false;

  function initCelebration() {
    if (celebrationInitialized) return;
    celebrationInitialized = true;

    // -- DOM References --
    const root = document.getElementById('celebration-root');
    const cameraEl = document.getElementById('camera');
    const entranceFade = document.getElementById('entrance-fade');
    const cakeStage = document.getElementById('cake-stage');
    const instruction = document.getElementById('instruction');
    const instructionWish = document.getElementById('instruction-wish');
    const instructionAction = document.getElementById('instruction-action');
    const instructionAlt = document.getElementById('instruction-alt');
    const soundEnableBtn = document.getElementById('sound-enable');
    const finaleText = document.getElementById('finale-text');
    const flashEl = document.getElementById('firework-flash');

    const bgCanvas = document.getElementById('bg-canvas');
    const fireworksCanvas = document.getElementById('fireworks-canvas');
    const decorCanvas = document.getElementById('decor-canvas');
    const confettiCanvas = document.getElementById('confetti-canvas');

    if (!root || !cakeStage) {
      return;
    }

    const reducedMotion = prefersReducedMotion();

    // -- Build Premium Cake --
    cakeStage.innerHTML = ''; // Clear any basic cake from app.js
    const cakeScene = buildPremiumCake(cakeStage);

    // -- Helpers --
    function candleScreenPos() {
      const svg = cakeStage.querySelector('.cake-svg');
      if (!svg) return { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
      const rect = svg.getBoundingClientRect();
      const scale = rect.width / CAKE_VIEWBOX;
      return { x: rect.left + 220 * scale, y: rect.top + 52 * scale };
    }
    function cakeCenterScreenPos() {
      const svg = cakeStage.querySelector('.cake-svg');
      if (!svg) return { x: window.innerWidth / 2, y: window.innerHeight * 0.58 };
      const rect = svg.getBoundingClientRect();
      const scale = rect.width / CAKE_VIEWBOX;
      return { x: rect.left + 220 * scale, y: rect.top + 220 * scale };
    }
    function cakeTopLandingZone() {
      const svg = cakeStage.querySelector('.cake-svg');
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const scale = rect.width / CAKE_VIEWBOX;
      return { x: rect.left + 220 * scale, y: rect.top + 126 * scale, width: 130 * scale };
    }

    // -- Initialize Systems --
    const animMgr = new AnimationManager();
    const audioMgr = new AudioManager();
    const background = new BackgroundScene(bgCanvas);
    const flame = new FlameController(cakeStage);
    const fireworks = new FireworksSystem(fireworksCanvas, {
      onExplode: (size) => {
        audioMgr.sfxFireworkBurst();
        if (size === 'large') flashScreen();
      }
    });
    const decorations = new Decorations(decorCanvas, candleScreenPos);
    const confetti = new ConfettiSystem(confettiCanvas);
    confetti.landingZone = cakeTopLandingZone;

    animMgr.register(background);
    animMgr.register(fireworks);
    animMgr.register(decorations);
    animMgr.register(confetti);
    animMgr.start();

    // -- Resize handler --
    window.addEventListener('resize', () => animMgr.resize());

    // -- Flash overlay for fireworks --
    function flashScreen() {
      if (reducedMotion || !flashEl) return;
      gsap.fromTo(flashEl, { opacity: 0.16 }, { opacity: 0, duration: 0.5, ease: 'power1.out' });
    }

    // -- Audio bootstrap --
    (async function bootAudio() {
      await audioMgr.resume();
      audioMgr.playAmbient();
      if (!audioMgr.isRunning && soundEnableBtn) {
        soundEnableBtn.hidden = false;
        const unlock = async () => {
          await audioMgr.resume();
          audioMgr.playAmbient();
          soundEnableBtn.hidden = true;
          document.removeEventListener('pointerdown', unlock);
        };
        soundEnableBtn.addEventListener('click', unlock, { once: true });
        document.addEventListener('pointerdown', unlock, { once: true });
      }
    })();

    // -- Stage 1: Entrance --
    gsap.set(cakeStage, { opacity: 0, scale: 0.92 });
    gsap.set(cameraEl, { scale: 1.05 });

    // Sparkle decorations on cake — subtle entrance
    const sparkles = Array.from(cakeStage.querySelectorAll('.cake-sparkle'));
    sparkles.forEach(s => gsap.set(s, { opacity: 0, scale: 0.3 }));

    // Fade from black
    if (entranceFade) {
      gsap.to(entranceFade, {
        opacity: 0,
        duration: 2,
        ease: 'power1.out',
        onComplete: () => { entranceFade.style.pointerEvents = 'none'; }
      });
    }

    // Cake fade in
    gsap.to(cakeStage, {
      opacity: 1,
      scale: 1,
      duration: 2.4,
      ease: 'power2.out',
      delay: 0.4,
      onComplete: () => {
        // Add idle float
        if (!reducedMotion) cakeStage.classList.add('floating');
      }
    });

    // Camera subtle zoom
    gsap.to(cameraEl, { scale: 1, duration: 2.8, ease: 'power2.out', delay: 0.4 });

    // Sparkles appear
    sparkles.forEach((s, i) => {
      gsap.to(s, {
        opacity: rand(0.5, 0.9),
        scale: 1,
        duration: 0.8,
        delay: 1.5 + i * 0.12,
        ease: 'back.out(1.7)'
      });
    });

    // Start flame flickering
    setTimeout(() => flame.startFlicker(), 600);

    // -- Stage 3: Instructions --
    setTimeout(() => showInstructions(), 2800);

    // -- GSAP text fade utility --
    function fadeText(el, show, duration) {
      duration = duration || 1;
      return new Promise((resolve) => {
        gsap.to(el, {
          opacity: show ? 1 : 0,
          duration,
          ease: 'power1.inOut',
          onStart: () => { if (show) el.style.visibility = 'visible'; },
          onComplete: () => {
            if (!show) el.style.visibility = 'hidden';
            resolve();
          }
        });
      });
    }

    function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

    let activeDetection = null;
    let blown = false;

    async function showInstructions() {
      if (!instruction) return;
      instruction.hidden = false;

      // "Make a wish..."
      await fadeText(instructionWish, true, 1.2);
      await wait(2000);
      await fadeText(instructionWish, false, 0.9);

      // Try mic
      const detection = new AudioDetection({
        threshold: 0.14,
        sustainMs: 480,
        onBlow: () => triggerBlow(),
        onUnavailable: () => {
          fadeText(instructionAction, false, 0.5);
          fadeText(instructionAlt, true, 0.8);
          const hotspot = cakeStage.querySelector('.candle-hotspot');
          if (hotspot) hotspot.classList.add('pulse');
        }
      });

      await fadeText(instructionAction, true, 1);
      const micReady = await detection.start();

      // Always show "or tap the candle" after a beat
      if (micReady) {
        await wait(1500);
        await fadeText(instructionAlt, true, 0.8);
      }

      // Tap fallback
      const hotspot = cakeStage.querySelector('.candle-hotspot');
      if (hotspot) {
        hotspot.addEventListener('click', () => triggerBlow(), { once: true });
        hotspot.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerBlow();
          }
        }, { once: true });
      }

      activeDetection = detection;
    }

    async function triggerBlow() {
      if (blown) return;
      blown = true;
      if (activeDetection) activeDetection.stop();

      // Stop idle float
      cakeStage.classList.remove('floating');

      // Fade out instruction text
      await Promise.all([
        fadeText(instructionWish, false, 0.3),
        fadeText(instructionAction, false, 0.3),
        fadeText(instructionAlt, false, 0.3)
      ]);
      if (instruction) instruction.hidden = true;

      // Blow out the flame
      await flame.blowOut(rand(-1, 1));

      // Start celebration
      celebrate();
    }

    // -- Stage 5: Celebration --
    function celebrate() {
      document.body.classList.add('celebrating');
      if (root) root.classList.add('celebrating-bg');

      background.celebrate();
      decorations.celebrate();
      audioMgr.crossfadeToCelebration();
      audioMgr.sfxCheerAmbience();

      // Camera shake
      cameraShake();

      const origin = candleScreenPos();
      const center = cakeCenterScreenPos();
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Multi-directional confetti bursts
      const bursts = [
        { x: w * 0.5, y: -20, angle: Math.PI / 2, spread: Math.PI * 0.7, palette: PALETTE_GOLD, delay: 0 },
        { x: -20, y: h * 0.4, angle: 0, spread: Math.PI * 0.6, palette: PALETTE_ROSE, delay: 80 },
        { x: w + 20, y: h * 0.4, angle: Math.PI, spread: Math.PI * 0.6, palette: PALETTE_JEWEL, delay: 80 },
        { x: w * 0.5, y: h + 20, angle: -Math.PI / 2, spread: Math.PI * 0.8, palette: PALETTE_GOLD, delay: 160 },
        { x: center.x, y: center.y, angle: -Math.PI / 2, spread: Math.PI * 1.8, palette: PALETTE_ROSE, delay: 40 }
      ];

      bursts.forEach(b => {
        setTimeout(() => {
          confetti.burst(b.x, b.y, 90, b);
          audioMgr.sfxConfettiPop();
        }, b.delay);
      });

      // Ongoing gentle confetti showers
      confetti.emitFor(w * 0.5, -20, 8, 14, { angle: Math.PI / 2, spread: Math.PI * 0.8, palette: PALETTE_GOLD });
      confetti.emitFor(-20, h * 0.3, 6, 8, { angle: 0, spread: Math.PI * 0.5, palette: PALETTE_ROSE });
      confetti.emitFor(w + 20, h * 0.3, 6, 8, { angle: Math.PI, spread: Math.PI * 0.5, palette: PALETTE_JEWEL });

      // Multi-wave fireworks
      fireworks.scheduleWave(3, 0.55, { size: 'medium', palette: PALETTE_GOLD });
      setTimeout(() => fireworks.scheduleWave(2, 0.7, { size: 'large', palette: PALETTE_ROSE }), 900);
      setTimeout(() => fireworks.scheduleWave(4, 0.4, { size: 'small', palette: PALETTE_JEWEL }), 1700);
      setTimeout(() => fireworks.scheduleWave(2, 0.6, { size: 'large', palette: PALETTE_GOLD }), 2600);
      setTimeout(() => fireworks.scheduleWave(3, 0.5, { size: 'medium', palette: PALETTE_ALL }), 3500);

      // Show finale text
      setTimeout(() => showFinale(), 2000);
    }

    function cameraShake() {
      if (reducedMotion || !cameraEl) return;
      const tl = gsap.timeline();
      tl.to(cameraEl, { x: -6, y: 3, duration: 0.05 })
        .to(cameraEl, { x: 5, y: -4, duration: 0.05 })
        .to(cameraEl, { x: -3, y: 2, duration: 0.05 })
        .to(cameraEl, { x: 0, y: 0, duration: 0.08 })
        .to(cameraEl, { scale: 1.025, duration: 0.25, ease: 'power2.out' }, 0)
        .to(cameraEl, { scale: 1, duration: 0.6, ease: 'power2.inOut' });
    }

    // -- Stage 6: Happy Birthday --
    function showFinale() {
      if (!finaleText) return;
      finaleText.hidden = false;

      const headingEl = document.getElementById('finale-heading');
      const lineEls = Array.from(document.querySelectorAll('.finale-line'));

      if (headingEl) {
        const reveal = new TypographyReveal(headingEl, lineEls);
        reveal.play();
      }
    }
  }

  // ========================================================================
  //  SECTION 15 — OVERRIDE startBirthdayCelebration
  // ========================================================================

  /**
   * Override the basic version in app.js with this premium version.
   * When the Exit button is clicked, this function runs instead.
   */
  window.startBirthdayCelebration = function () {
    const cakeScreen = document.getElementById('cake-screen');
    const finalReveal = document.getElementById('final-reveal');

    // Hide the final reveal screen
    if (finalReveal) finalReveal.classList.remove('active');

    // Show the cake screen
    if (cakeScreen) {
      cakeScreen.classList.add('active');
      cakeScreen.setAttribute('aria-hidden', 'false');
    }

    document.body.classList.add('celebrating');

    // Initialize the full celebration
    initCelebration();
  };
})();
