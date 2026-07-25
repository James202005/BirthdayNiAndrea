/**
 * Decorations.js
 * ---------------
 * Everything that makes the celebration feel hand-decorated rather than
 * "confetti.js with defaults": gold sparkles that orbit and twinkle around
 * the cake, softly glowing hearts drifting upward, elegant rising balloons,
 * falling ribbon streamers, and the expanding golden bloom + light rays that
 * radiate from the cake the instant the candle goes out.
 *
 * All five behaviours share one canvas + one RAF tick for performance, but
 * are kept in clearly separated methods so each is easy to reason about
 * and tune independently.
 */

import { ParticlePool, setupCanvas, rand, choice, clamp, quality, QUALITY_SCALE } from './ParticleEngine.js';

const GOLD = ['#F4C77C', '#E8A94D', '#FFF6E8'];
const HEART_COLORS = ['#F2A6A6', '#F4C77C', '#EEDFF5'];
const BALLOON_COLORS = ['#E8A94D', '#F2A6A6', '#B98FDC', '#6FCFC0', '#F4C77C'];
const STREAMER_COLORS = ['#F4C77C', '#F2A6A6', '#B98FDC', '#6FCFC0', '#EEDFF5'];

export class Decorations {
  constructor(canvas, cakeOrigin, opts = {}) {
    const { ctx, resize } = setupCanvas(canvas);
    this.canvas = canvas;
    this.ctx = ctx;
    this._resize = resize;
    this.q = QUALITY_SCALE[quality()];
    this.cakeOrigin = cakeOrigin; // () => {x, y} in CSS pixels, the candle/cake focal point
    this.onSparkle = opts.onSparkle || null;

    this.sparkles = new ParticlePool(Math.floor(90 * this.q));
    this.hearts = new ParticlePool(Math.floor(40 * this.q));
    this.balloons = [];
    this.streamers = [];

    this.active = false; // becomes true once celebrate() is called
    this.bloom = { r: 0, target: 0, alpha: 0 };
    this.rayRotation = 0;

    this._sparkleTimer = 0;
    this._heartTimer = 0;
    this._streamerTimer = 0;
  }

  resize() {
    this._resize();
  }

  /** Kicks off the celebration decorations: bloom + light rays + a first wave of sparkles/hearts/balloons/streamers. */
  celebrate() {
    this.active = true;
    const origin = this.cakeOrigin();
    this.bloom.target = Math.max(window.innerWidth, window.innerHeight) * 0.6;
    this.bloom.alpha = 1;

    for (let i = 0; i < 22 * this.q; i++) this._spawnSparkle(origin, true);
    for (let i = 0; i < Math.round(9 * this.q); i++) this._spawnBalloon(i * 0.18);
  }

  update(dt, elapsed) {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    if (this.active) {
      this._updateBloom(dt, ctx, w, h);
      this._updateSparkles(dt, elapsed, ctx);
      this._updateHearts(dt, ctx);
      this._updateBalloons(dt, ctx);
      this._updateStreamers(dt, ctx);

      // steady trickle so the scene keeps breathing rather than firing once and going still
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
  }

  // -- bloom + light rays -----------------------------------------------------

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

  // -- sparkles: orbiting / drifting / twinkling gold specks -----------------

  _spawnSparkle(origin, orbiting) {
    if (orbiting && this.onSparkle && Math.random() < 0.35) this.onSparkle();
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
    p.color = choice(GOLD);
    p.maxLife = rand(1.6, 3.4);
    p.rotation = rand(0, Math.PI * 2);
    p.rotationSpeed = rand(-3, 3);
  }

  _updateSparkles(dt, elapsed, ctx) {
    this.sparkles.forEachActive((p) => {
      p.life += dt;
      if (p.isDead) {
        this.sparkles.release(p);
        return;
      }
      const t = p.progress;
      p.alpha = Math.sin(t * Math.PI); // fade in, twinkle, fade out
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

      this._drawSparkle(ctx, p);
    });
  }

  _drawSparkle(ctx, p) {
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
  }

  // -- hearts: small glowing hearts floating upward ----------------------------

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
      if (p.isDead) {
        this.hearts.release(p);
        return;
      }
      p.data.sway += dt * p.data.swaySpeed;
      p.x += (p.vx + Math.sin(p.data.sway) * 14) * dt;
      p.y += p.vy * dt;
      const t = p.progress;
      p.alpha = t < 0.15 ? t / 0.15 : t > 0.75 ? clamp(1 - (t - 0.75) / 0.25, 0, 1) : 1;
      this._drawHeart(ctx, p);
    });
  }

  _drawHeart(ctx, p) {
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
  }

  // -- balloons: elegant, slow, varied ---------------------------------------

  _spawnBalloon(delay = 0) {
    this.balloons.push({
      delay,
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
      maxLife: rand(9, 14),
    });
  }

  _updateBalloons(dt, ctx) {
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      if (b.delay > 0) {
        b.delay -= dt;
        continue;
      }
      b.life += dt;
      if (b.life >= b.maxLife || b.y < -120) {
        this.balloons.splice(i, 1);
        if (this.active && this.balloons.length < 4 && Math.random() < 0.02) this._spawnBalloon();
        continue;
      }
      b.swayPhase += dt * b.swaySpeed;
      b.x += Math.sin(b.swayPhase) * b.swayAmp * dt;
      b.y += b.vy * dt;
      b.rotation += b.rotationSpeed * dt * Math.sin(b.swayPhase);

      const fadeIn = clamp(b.life / 0.6, 0, 1);
      const fadeOut = clamp((b.maxLife - b.life) / 1.2, 0, 1);
      this._drawBalloon(ctx, b, Math.min(fadeIn, fadeOut));
    }
  }

  _drawBalloon(ctx, b, alpha) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);
    ctx.globalAlpha = alpha;

    // string
    ctx.strokeStyle = 'rgba(255,246,232,0.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, b.w * 0.62);
    ctx.quadraticCurveTo(6, b.w * 0.9, 0, b.w * 1.2);
    ctx.stroke();

    // body
    const grad = ctx.createRadialGradient(-b.w * 0.25, -b.w * 0.3, b.w * 0.1, 0, 0, b.w * 0.75);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.25, b.color);
    grad.addColorStop(1, shade(b.color, -18));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.w * 0.62, b.w * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    // knot
    ctx.fillStyle = shade(b.color, -18);
    ctx.beginPath();
    ctx.moveTo(-4, b.w * 0.6);
    ctx.lineTo(4, b.w * 0.6);
    ctx.lineTo(0, b.w * 0.72);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // -- streamers: falling ribbons, each with its own phase so none repeat ----

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
      maxLife: rand(3.5, 6),
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

function shade(hex, percent) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r + (percent / 100) * 255), 0, 255);
  g = clamp(Math.round(g + (percent / 100) * 255), 0, 255);
  b = clamp(Math.round(b + (percent / 100) * 255), 0, 255);
  return `rgb(${r},${g},${b})`;
}