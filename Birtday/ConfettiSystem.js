/**
 * ConfettiSystem.js
 * ------------------
 * Canvas-rendered confetti with real(ish) physics: gravity, air drag,
 * horizontal wobble, rotation, a couple of soft floor bounces, and a
 * fade-out tail. Confetti can be fired from any point on screen so the
 * celebration can burst from the left, right, bottom, and behind the cake
 * rather than only raining from the top.
 */

import { ParticlePool, setupCanvas, rand, choice, clamp, quality, QUALITY_SCALE } from './ParticleEngine.js';

const PALETTE = ['#F4C77C', '#E8A94D', '#F2A6A6', '#EEDFF5', '#B98FDC', '#6FCFC0', '#FFF6E8'];
const SHAPES = ['rect', 'circle', 'triangle', 'ribbon'];

export class ConfettiSystem {
  constructor(canvas, opts = {}) {
    const { ctx, resize } = setupCanvas(canvas);
    this.canvas = canvas;
    this.ctx = ctx;
    this._resize = resize;
    this.q = QUALITY_SCALE[quality()];
    this.pool = new ParticlePool(Math.floor(480 * this.q));
    this._emitters = []; // continuous trickle emitters: {x,y,rate,duration,elapsed,opts}
    this._emitAccumulator = new Map();
    this.landingZone = opts.landingZone || null; // () => {x, y, width} — lets confetti rest on the cake
  }

  resize() {
    this._resize();
  }

  /** One instantaneous burst of `count` pieces from (x, y). */
  burst(x, y, count, opts = {}) {
    const n = Math.max(1, Math.round(count * this.q));
    for (let i = 0; i < n; i++) {
      const p = this.pool.spawn();
      const angle = (opts.angle ?? -Math.PI / 2) + rand(-1, 1) * ((opts.spread ?? Math.PI) / 2);
      const speed = rand(opts.minSpeed ?? 220, opts.maxSpeed ?? 640);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.ay = rand(360, 520);
      p.drag = rand(0.35, 0.85);
      p.size = rand(6, 14);
      p.rotation = rand(0, Math.PI * 2);
      p.rotationSpeed = rand(-9, 9);
      p.color = opts.palette ? choice(opts.palette) : choice(PALETTE);
      p.maxLife = rand(3, 5.2);
      p.data = { shape: choice(SHAPES), wobble: rand(0, Math.PI * 2), wobbleSpeed: rand(2, 5), bounced: 0 };
    }
  }

  /** Keeps gently emitting `rate` pieces/second from (x,y) for `duration` seconds. */
  emitFor(x, y, duration, rate, opts = {}) {
    const id = Symbol('emitter');
    this._emitters.push({ id, x, y, duration, elapsed: 0, rate, opts });
    this._emitAccumulator.set(id, 0);
  }

  update(dt) {
    // continuous emitters
    for (let i = this._emitters.length - 1; i >= 0; i--) {
      const e = this._emitters[i];
      e.elapsed += dt;
      let acc = this._emitAccumulator.get(e.id) + e.rate * dt;
      while (acc >= 1) {
        this.burst(e.x + rand(-30, 30), e.y + rand(-10, 10), 1, e.opts);
        acc -= 1;
      }
      this._emitAccumulator.set(e.id, acc);
      if (e.elapsed >= e.duration) {
        this._emitAccumulator.delete(e.id);
        this._emitters.splice(i, 1);
      }
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const floor = window.innerHeight + 24;

    this.pool.forEachActive((p) => {
      p.life += dt;
      if (p.isDead) {
        this.pool.release(p);
        return;
      }
      p.vx *= 1 - p.drag * dt;
      p.vy += p.ay * dt;
      p.data.wobble += p.data.wobbleSpeed * dt;
      p.x += (p.vx + Math.sin(p.data.wobble) * 46) * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;

      if (!p.data.landed && this.landingZone) {
        const lz = this.landingZone();
        if (
          lz &&
          p.vy > 0 &&
          p.y > lz.y - 4 &&
          p.y < lz.y + 26 &&
          p.x > lz.x - lz.width / 2 &&
          p.x < lz.x + lz.width / 2
        ) {
          p.y = lz.y;
          p.vy = 0;
          p.vx *= 0.25;
          p.ay = 0;
          p.data.landed = true;
        }
      }

      if (!p.data.landed && p.y > floor - 6 && p.vy > 0 && p.data.bounced < 2) {
        p.vy *= -0.32;
        p.vx *= 0.55;
        p.data.bounced++;
      }

      const fadeStart = p.maxLife * 0.72;
      p.alpha = p.life > fadeStart ? clamp(1 - (p.life - fadeStart) / (p.maxLife - fadeStart), 0, 1) : 1;

      this._draw(p);
    });
  }

  _draw(p) {
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
      default:
        ctx.fillRect(-s / 2, -s / 4, s, s / 2);
    }
    ctx.restore();
  }
}