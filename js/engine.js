/**
 * Bubble Gum Factory - Game Engine
 */
const GRAVITY = 0.62;
const FRICTION = 0.85;
const GEL_FRICTION = 0.55;
const BOUNCE_FORCE = -16;
const JUMP_FORCE = -13;
const HIGH_JUMP = -17;
const MOVE_SPEED = 4.5;
const SPEED_BOOST = 6.5;
const LOW_GRAVITY = 0.25;
const DIFFICULTY = 1.35;

class GameEngine {
  static assetBase() {
    const script = document.querySelector('script[src*="engine.js"]');
    if (script?.src) {
      return script.src.replace(/js\/engine\.js(\?.*)?$/, '');
    }
    const path = window.location.pathname.replace(/\\/g, '/');
    const idx = path.indexOf('/mario_simple');
    if (idx >= 0) return window.location.origin + path.slice(0, idx + '/mario_simple'.length + 1);
    if (/\.html$/i.test(path)) return window.location.origin + path.replace(/[^/]+$/, '');
    return window.location.origin + (path.endsWith('/') ? path : path + '/');
  }

  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 960;
    this.H = 600;
    this.camera = { x: 0 };
    this.images = {};
    this.particles = [];
    this.levelTime = 0;
    this.switches = {};
    this.revealedHidden = {};
    this.meltTimers = {};
    this.fakeTimers = {};
    this.movingPlatPos = {};
    this.remotePlayer = null;
    this.remoteMatch = null;
    this.trailTimer = 0;
  }

  async loadImages() {
    const base = GameEngine.assetBase();
    const resolve = (p) => base + p.replace(/^\//, '');

    const loadOne = (src, fb) => new Promise((resolveImg) => {
      const tryLoad = (url, next) => {
        const img = new Image();
        img.onload = () => resolveImg(img);
        img.onerror = () => (next ? tryLoad(next, null) : resolveImg(null));
        img.src = url;
      };
      tryLoad(resolve(src), fb ? resolve(fb) : null);
    });
    const files = {
      mario: ['images/mario.png', 'images/mario.jpg'],
      elements: ['images/element.jpg', 'images/element.png'],
      lumalee: ['images/element2.jpg', 'images/element2.png'],
    };
    for (let i = 1; i <= 20; i++) files[`bg${i}`] = [`images/background${i}.jpg`, null];
    await Promise.all(Object.entries(files).map(async ([key, [src, fb]]) => {
      this.images[key] = await loadOne(src, fb);
    }));
  }

  resize() {
    const wrapper = document.getElementById('game-wrapper');
    let maxW = wrapper?.clientWidth || 0;
    let maxH = wrapper ? wrapper.clientHeight - 20 : 0;
    if (maxW < 64 || maxH < 64) {
      maxW = window.innerWidth;
      maxH = window.innerHeight - 20;
    }
    const ratio = this.W / this.H;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    w = Math.max(w, 320);
    h = Math.max(h, 200);
    this.refreshCanvas();
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  /** Reset 2D context — required after canvas was inside display:none (iOS Safari) */
  refreshCanvas() {
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.ctx = this.canvas.getContext('2d');
  }

  initLevel(levelData, levelIndex) {
    this.level = JSON.parse(JSON.stringify(levelData));
    this.level.bg = `background${levelIndex + 1}`;
    this.levelTime = 0;
    this.camera.x = 0;
    this.switches = {};
    this.revealedHidden = {};
    this.meltTimers = {};
    this.fakeTimers = {};
    this.movingPlatPos = {};
    this.particles = [];

    this.platforms = this.level.platforms.map((p, i) => ({
      ...p, id: i, active: true, origX: p.x, origY: p.y,
      moveDir: 1, meltTimer: 0, fakeTimer: 0,
    }));

    this.collectibles = (this.level.collectibles || []).map(c => ({ ...c, active: true, bob: Math.random() * Math.PI * 2 }));
    this.powerups = (this.level.powerups || []).map(p => ({ ...p, active: true, bob: Math.random() * Math.PI * 2 }));
    this.enemies = (this.level.enemies || []).map((e, i) => ({
      ...e, id: i, dir: 1, alive: true,
      speed: (e.speed || 1.5) * DIFFICULTY,
    }));
    this.hazards = this.level.hazards || [];
    this.vents = this.level.vents || [];
    this.rollers = (this.level.rollers || []).map(r => ({ ...r, angle: 0 }));
    this.doors = (this.level.doors || []).map(d => ({ ...d, open: false }));
    this.switchesList = (this.level.switches || []).map(s => ({ ...s, activated: false }));

    this.meltTimers = {};
    this.fakeTimers = {};
    this.movingPlatPos = {};
  }

  createPlayer(spawn) {
    return {
      x: spawn.x, y: spawn.y, w: 32, h: 48,
      vx: 0, vy: 0, onGround: false, facing: 1,
      lives: 3, invincible: 0, powerType: -1, powerTimer: 0,
      animFrame: 0, animTimer: 0, canJump: true,
      inLowGrav: false, inGel: false, levelCoins: 0,
      big: false, speedBoost: false, highJump: false, canGlide: false,
      skin: 'skin_default', trail: 'none', splat: 'default', nickname: '',
    };
  }

  updatePlayer(player, input, dt) {
    if (player.invincible > 0) player.invincible -= dt;
    if (player.powerTimer > 0) {
      player.powerTimer -= dt;
      if (player.powerTimer <= 0) this.clearPower(player);
    }

    const speed = player.speedBoost ? SPEED_BOOST : MOVE_SPEED;
    const grav = player.inLowGrav ? LOW_GRAVITY : GRAVITY;
    const jumpF = player.highJump ? HIGH_JUMP : JUMP_FORCE;

    if (input.left) { player.vx = -speed; player.facing = -1; }
    else if (input.right) { player.vx = speed; player.facing = 1; }
    else { player.vx *= player.inGel ? GEL_FRICTION : FRICTION; }

    if (input.jump && player.canJump && player.onGround) {
      player.vy = jumpF;
      player.onGround = false;
      player.canJump = false;
      this.spawnParticles(player.x + player.w / 2, player.y + player.h, '#ffb6d9', 5);
      if (typeof gameAudio !== 'undefined') gameAudio.playJump();
    }
    if (!input.jump) player.canJump = true;

    if (player.canGlide && !player.onGround && player.vy > 0) {
      player.vy *= 0.92;
    }

    player.vy += grav;
    if (player.vy > 12) player.vy = 12;

    player.x += player.vx;
    this.resolveCollisionX(player);
    player.y += player.vy;
    player.onGround = false;
    player.inGel = false;
    player.inLowGrav = false;
    this.resolveCollisionY(player);

    if (player.x < 0) player.x = 0;
    if (player.y > this.H + 100) return 'dead';

    player.animTimer += dt;
    if (player.animTimer > 100) {
      player.animTimer = 0;
      player.animFrame = (player.animFrame + 1) % 4;
    }

    return 'alive';
  }

  resolveCollisionX(player) {
    for (const p of this.platforms) {
      if (!p.active) continue;
      const px = this.getPlatformX(p);
      const py = this.getPlatformY(p);
      if (this.aabb(player, { x: px, y: py, w: p.w, h: p.h })) {
        if (player.vx > 0) player.x = px - player.w;
        else if (player.vx < 0) player.x = px + p.w;
        player.vx = 0;
      }
    }
  }

  resolveCollisionY(player) {
    for (const p of this.platforms) {
      if (!p.active) continue;
      const px = this.getPlatformX(p);
      const py = this.getPlatformY(p);
      if (this.aabb(player, { x: px, y: py, w: p.w, h: p.h })) {
        if (player.vy > 0) {
          player.y = py - player.h;
          player.vy = 0;
          player.onGround = true;
          if (p.type === 'bouncy') {
            player.vy = BOUNCE_FORCE;
            player.onGround = false;
            this.spawnParticles(player.x + player.w / 2, player.y + player.h, '#ff69b4', 8);
            if (typeof gameAudio !== 'undefined') gameAudio.playBounce();
          }
          if (p.type === 'gel') player.inGel = true;
          if (p.type === 'lowgrav') player.inLowGrav = true;
          if (p.type === 'melting') this.startMelt(p);
          if (p.type === 'fake') this.startFake(p);
          if (p.type === 'hidden' && p.reveal) {
            if (Math.abs(player.x - p.reveal) < 80) this.revealedHidden[p.reveal] = true;
          }
        } else if (player.vy < 0) {
          player.y = py + p.h;
          player.vy = 0;
          if (p.type === 'question' || p.type === 'brick') {
            this.hitBlock(p, player);
          }
        }
      }
    }
  }

  getPlatformX(p) {
    if (p.type === 'moving' && p.moveX) {
      if (!this.movingPlatPos[p.id]) {
        this.movingPlatPos[p.id] = { x: p.origX, y: p.origY, dir: 1 };
      }
      return this.movingPlatPos[p.id].x;
    }
    return p.x;
  }

  getPlatformY(p) {
    if (p.type === 'moving' && p.moveY) {
      if (!this.movingPlatPos[p.id]) {
        this.movingPlatPos[p.id] = { x: p.origX, y: p.origY, dir: 1 };
      }
      return this.movingPlatPos[p.id].y;
    }
    if (p.type === 'melting' && p.meltTimer > 0) {
      return p.y + p.meltTimer * 30;
    }
    return p.y;
  }

  startMelt(p) {
    if (!this.meltTimers[p.id]) this.meltTimers[p.id] = 0;
  }

  startFake(p) {
    if (!this.fakeTimers[p.id]) this.fakeTimers[p.id] = 0;
  }

  hitBlock(p, player) {
    if (p.type === 'question' && p.active) {
      p.active = false;
      this.applyPower(player, Math.floor(Math.random() * 8));
      this.spawnParticles(p.x + p.w / 2, p.y, '#ffd700', 10);
    }
  }

  aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  updateWorld(player, dt) {
    this.levelTime += dt / 1000;

    if (this.level.timeLimit && this.levelTime > this.level.timeLimit) {
      return 'dead';
    }

    // Moving platforms
    for (const p of this.platforms) {
      if (p.type !== 'moving') continue;
      const mp = this.movingPlatPos[p.id] || { x: p.origX, y: p.origY, dir: 1 };
      if (p.moveX) {
        mp.x += p.speed * mp.dir;
        if (mp.x <= p.moveX[0] || mp.x >= p.moveX[1]) mp.dir *= -1;
      }
      if (p.moveY) {
        mp.y += p.speed * mp.dir;
        if (mp.y <= p.moveY[0] || mp.y >= p.moveY[1]) mp.dir *= -1;
      }
      this.movingPlatPos[p.id] = mp;
    }

    // Melting platforms
    for (const p of this.platforms) {
      if (p.type === 'melting' && this.meltTimers[p.id] !== undefined) {
        this.meltTimers[p.id] += dt / 1000;
        p.meltTimer = this.meltTimers[p.id];
        const delay = p.meltDelay || 2;
        if (this.meltTimers[p.id] > delay) {
          p.active = false;
          this.spawnParticles(p.x + p.w / 2, p.y, '#ff9ecf', 6);
        }
      }
    }

    // Fake platforms
    for (const p of this.platforms) {
      if (p.type === 'fake' && this.fakeTimers[p.id] !== undefined) {
        this.fakeTimers[p.id] += dt / 1000;
        const delay = p.vanishDelay || 0.5;
        if (this.fakeTimers[p.id] > delay) {
          p.active = false;
          this.spawnParticles(p.x + p.w / 2, p.y, '#ffb6d9', 4);
        }
      }
    }

    // Vents
    for (const v of this.vents) {
      if (this.aabb(player, { x: v.x, y: v.y, w: v.w, h: v.h })) {
        player.vx += v.dir * v.power * 0.15;
        player.vy -= 2;
        this.spawnParticles(v.x + v.w / 2, v.y + v.h, '#b0e0ff', 2);
      }
    }

    // Rollers
    for (const r of this.rollers) {
      r.angle += r.speed * 0.05 * r.dir;
      const rx = r.x + Math.cos(r.angle) * 60;
      const dist = Math.hypot(player.x + player.w / 2 - rx, player.y + player.h / 2 - r.y);
      if (dist < r.r + 20 && player.invincible <= 0) return 'dead';
    }

    // Enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.chase) {
        const dx = player.x - e.x;
        e.x += Math.sign(dx) * e.speed;
      } else if (e.patrol) {
        e.x += e.speed * (e.dir || 1);
        if (e.x <= e.patrol[0] || e.x >= e.patrol[1]) e.dir = -(e.dir || 1);
      }
      if (this.aabb(player, e) && player.invincible <= 0) return 'dead';
    }

    if (this.remotePlayer && this.remoteMatch) {
      const rp = this.remotePlayer;
      const box = { x: rp.x, y: rp.y, w: 32, h: 48 };
      if (this.aabb(player, box) && player.invincible <= 0) return 'dead';
    }

    // Hazards
    for (const h of this.hazards) {
      if (h.type === 'spike' && this.aabb(player, h) && player.invincible <= 0) return 'dead';
    }

    // Collectibles
    for (const c of this.collectibles) {
      if (!c.active) continue;
      const cy = c.y + Math.sin(c.bob + this.levelTime * 3) * 5;
      if (this.aabb(player, { x: c.x, y: cy, w: 28, h: 28 })) {
        c.active = false;
        if (c.type === 'coin') {
          player.levelCoins = (player.levelCoins || 0) + 1;
        } else if (c.type === 'lumalee') {
          this.applyPower(player, 1);
          player.invincible = 5000;
        } else if (c.type === 'question') {
          this.applyPower(player, Math.floor(Math.random() * 8));
        }
        this.spawnParticles(c.x + 14, cy + 14, '#ffd700', 8);
      }
      c.bob += dt * 0.003;
    }

    // Powerups
    for (const p of this.powerups) {
      if (!p.active) continue;
      const py = p.y + Math.sin(p.bob + this.levelTime * 2) * 4;
      if (this.aabb(player, { x: p.x, y: py, w: 36, h: 36 })) {
        p.active = false;
        this.applyPower(player, p.type);
        this.spawnParticles(p.x + 18, py + 18, '#ff69b4', 12);
      }
      p.bob += dt * 0.002;
    }

    // Switches
    for (const s of this.switchesList) {
      if (!s.activated && Math.hypot(player.x + player.w / 2 - s.x, player.y + player.h / 2 - s.y) < 40) {
        s.activated = true;
        this.switches[s.id] = true;
        this.spawnParticles(s.x, s.y, '#00ff88', 10);
      }
    }

    // Check door / exit
    const exit = this.level.exit;
    if (player.x + player.w > exit.x && player.y + player.h > exit.y - 40) {
      const doorNeeded = this.doors.length > 0;
      if (doorNeeded) {
        const allOpen = this.doors.every(d => this.isDoorOpen(d));
        if (allOpen) return 'complete';
      } else {
        return 'complete';
      }
    }

    // Particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= dt;
      return p.life > 0;
    });

    return 'alive';
  }

  isDoorOpen(d) {
    if (d.switchId && !this.switches[d.switchId]) return false;
    if (d.switchId2 && !this.switches[d.switchId2]) return false;
    if (d.switchId3 && !this.switches[d.switchId3]) return false;
    return true;
  }

  applyPower(player, type) {
    if (type === -1) {
      player.levelCoins = (player.levelCoins || 0) + 1;
      return;
    }
    player.powerType = type;
    player.powerTimer = POWERUP_DURATION;
    player.invincible = 2000;

    player.big = false;
    player.speedBoost = false;
    player.highJump = false;
    player.canGlide = false;

    switch (type) {
      case 0: player.invincible = POWERUP_DURATION; break;
      case 1: player.lives++; break;
      case 2: player.lives = Math.min(player.lives + 1, 5); break;
      case 3: player.big = true; break;
      case 4: player.big = true; break;
      case 5: player.speedBoost = true; break;
      case 6: player.highJump = true; break;
      case 7: player.canGlide = true; break;
    }
  }

  clearPower(player) {
    player.powerType = -1;
    player.big = false;
    player.speedBoost = false;
    player.highJump = false;
    player.canGlide = false;
  }

  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 - 2,
        life: 400 + Math.random() * 300, color, size: 3 + Math.random() * 4,
      });
    }
  }

  updateCamera(player) {
    const target = player.x - this.W * 0.35;
    const maxCam = (this.level.width || 2400) - this.W;
    this.camera.x += (Math.max(0, Math.min(target, maxCam)) - this.camera.x) * 0.1;
  }

  render(player) {
    if (!this.ctx || !this.level) return;
    const ctx = this.ctx;
    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#3d1f5c';
      ctx.fillRect(0, 0, this.W, this.H);

      const cam = this.camera.x;

    this.drawBackground(ctx, cam);
    this.drawDecorations(ctx, cam);

    // Platforms
    for (const p of this.platforms) {
      if (!p.active) continue;
      if (p.type === 'hidden' && p.reveal && !this.revealedHidden[p.reveal]) {
        ctx.globalAlpha = 0.15;
      }
      this.drawPlatform(ctx, p, cam);
      ctx.globalAlpha = 1;
    }

    // Hazards
    for (const h of this.hazards) {
      if (h.type === 'spike') this.drawSpike(ctx, h, cam);
    }

    // Vents
    for (const v of this.vents) this.drawVent(ctx, v, cam);

    // Rollers
    for (const r of this.rollers) this.drawRoller(ctx, r, cam);

    // Switches
    for (const s of this.switchesList) this.drawSwitch(ctx, s, cam);

    // Doors
    for (const d of this.doors) this.drawDoor(ctx, d, cam);

    // Collectibles
    for (const c of this.collectibles) {
      if (c.active) this.drawCollectible(ctx, c, cam);
    }

    // Powerups
    for (const p of this.powerups) {
      if (p.active) this.drawPowerup(ctx, p, cam);
    }

    // Enemies
    for (const e of this.enemies) {
      if (e.alive) this.drawEnemy(ctx, e, cam);
    }

    if (this.remotePlayer && this.remoteMatch) {
      this.drawRemotePlayer(ctx, this.remotePlayer, cam);
    }

    // Exit flag
    this.drawExit(ctx, this.level.exit, cam);

    // Player
    this.drawPlayer(ctx, player, cam);

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / 700;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - cam, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Timer bar
    if (this.level.timeLimit) {
      const remaining = Math.max(0, this.level.timeLimit - this.levelTime);
      const pct = remaining / this.level.timeLimit;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(20, 20, 200, 12);
      ctx.fillStyle = pct > 0.3 ? '#ff69b4' : '#ff3333';
      ctx.fillRect(20, 20, 200 * pct, 12);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(Math.ceil(remaining) + 's', 230, 30);
    }

    // Level name
    ctx.fillStyle = 'rgba(255,182,217,0.8)';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(this.level.name, 20, this.H - 20);
    } catch (err) {
      console.error('render error', err);
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.fillText('渲染错误: ' + err.message, 20, 40);
    }
  }

  getBackgroundImage(bgName) {
    const num = parseInt(String(bgName).replace('background', ''), 10);
    if (!num || Number.isNaN(num)) return this.images.bg1;
    if (this.images[`bg${num}`]) return this.images[`bg${num}`];
    for (let d = 1; d <= 5; d++) {
      if (this.images[`bg${num - d}`]) return this.images[`bg${num - d}`];
      if (this.images[`bg${num + d}`]) return this.images[`bg${num + d}`];
    }
    return this.images.bg1 || null;
  }

  drawBackground(ctx, cam) {
    const img = this.getBackgroundImage(this.level.bg);

    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, 'rgba(45,27,78,0.8)');
    grad.addColorStop(0.4, 'rgba(255,158,207,0.3)');
    grad.addColorStop(1, 'rgba(255,182,217,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);

    if (img) {
      const parallax = cam * 0.2;
      const iw = img.width, ih = img.height;
      const scale = Math.max(this.W / iw, this.H / ih);
      const sw = iw * scale, sh = ih * scale;

      const offset = -(parallax % sw);
      for (let x = offset; x < this.W + sw; x += sw) {
        ctx.drawImage(img, x, (this.H - sh) / 2, sw, sh);
      }
    }

    ctx.fillStyle = 'rgba(255,105,180,0.15)';
    for (let i = 0; i < 8; i++) {
      const px = ((i * 300 - cam * 0.5) % (this.W + 300)) - 100;
      ctx.fillRect(px, this.H - 180, 40, 180);
      ctx.beginPath();
      ctx.ellipse(px + 20, this.H - 180, 25, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawDecorations(ctx, cam) {
    // Floating bubbles
    for (let i = 0; i < 12; i++) {
      const bx = (i * 137 + this.levelTime * 20) % (this.level.width || 2400) - cam;
      const by = 80 + Math.sin(i * 2.3 + this.levelTime) * 30;
      if (bx > -30 && bx < this.W + 30) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ffb6d9';
        ctx.beginPath();
        ctx.arc(bx, by, 8 + i % 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  drawPlatform(ctx, p, cam) {
    const x = this.getPlatformX(p) - cam;
    const y = this.getPlatformY(p);
    const colors = {
      normal: ['#ffb6d9', '#ff9ecf'],
      bouncy: ['#ff69b4', '#ff1493'],
      gel: ['#e0a0ff', '#c080e0'],
      melting: ['#ffa0c0', '#ff6090'],
      fake: ['#ffb6d9', '#ff9ecf'],
      hidden: ['#ffd0e8', '#ffb0d0'],
      pipe: ['#50c878', '#30a858'],
      brick: ['#c87850', '#a85830'],
      question: ['#ffd700', '#ffb000'],
      moving: ['#b0e0ff', '#80c0ff'],
      lowgrav: ['#d0b0ff', '#b090e0'],
    };
    const c = colors[p.type] || colors.normal;

    if (p.type === 'pipe') {
      ctx.fillStyle = c[0];
      ctx.fillRect(x, y, p.w, p.h);
      ctx.fillStyle = c[1];
      ctx.fillRect(x - 5, y, p.w + 10, 15);
      // Gloss
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x + 5, y + 20, 8, p.h - 30);
      return;
    }

    // Bubble gum platform with gloss
    const grad = ctx.createLinearGradient(x, y, x, y + p.h);
    grad.addColorStop(0, c[0]);
    grad.addColorStop(1, c[1]);
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, p.w, p.h, 6);
    } else {
      ctx.rect(x, y, p.w, p.h);
    }
    ctx.fill();

    // Gloss highlight
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x + 4, y + 2, p.w - 8, p.h * 0.3, 4);
    } else {
      ctx.rect(x + 4, y + 2, p.w - 8, p.h * 0.3);
    }
    ctx.fill();

    ctx.strokeStyle = 'rgba(90,26,74,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (p.type === 'question') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('?', x + p.w / 2 - 6, y + p.h / 2 + 7);
    }

    if (p.type === 'bouncy') {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + p.w / 2, y - 5, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawSpike(ctx, h, cam) {
    ctx.fillStyle = '#ff3366';
    const x = h.x - cam;
    for (let i = 0; i < h.w; i += 15) {
      ctx.beginPath();
      ctx.moveTo(x + i, h.y + h.h);
      ctx.lineTo(x + i + 7, h.y);
      ctx.lineTo(x + i + 15, h.y + h.h);
      ctx.fill();
    }
  }

  drawVent(ctx, v, cam) {
    const x = v.x - cam;
    ctx.fillStyle = 'rgba(176,224,255,0.4)';
    ctx.fillRect(x, v.y, v.w, v.h);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 3; i++) {
      const oy = (this.levelTime * 80 + i * 30) % v.h;
      ctx.fillRect(x + 10, v.y + oy, v.w - 20, 8);
    }
    ctx.fillStyle = '#5ab0ff';
    ctx.font = '10px sans-serif';
    ctx.fillText(v.dir > 0 ? '>>>' : '<<<', x + 5, v.y + v.h / 2);
  }

  drawRoller(ctx, r, cam) {
    const x = r.x - cam;
    ctx.save();
    ctx.translate(x, r.y);
    ctx.rotate(r.angle);
    const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, r.r);
    grad.addColorStop(0, '#ffb6d9');
    grad.addColorStop(1, '#ff69b4');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff1493';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r.r, 0);
    ctx.lineTo(r.r, 0);
    ctx.moveTo(0, -r.r);
    ctx.lineTo(0, r.r);
    ctx.stroke();
    ctx.restore();
  }

  drawSwitch(ctx, s, cam) {
    const x = s.x - cam;
    ctx.fillStyle = s.activated ? '#00ff88' : '#888';
    ctx.beginPath();
    ctx.arc(x, s.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('O', x - 4, s.y + 4);
  }

  drawDoor(ctx, d, cam) {
    const open = this.isDoorOpen(d);
    const x = d.x - cam;
    ctx.fillStyle = open ? 'rgba(0,255,136,0.3)' : '#8b4513';
    ctx.fillRect(x, d.y, d.w, d.h);
    if (!open) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('LOCK', x + 5, d.y + d.h / 2);
    }
  }

  drawCollectible(ctx, c, cam) {
    const x = c.x - cam;
    const y = c.y + Math.sin(c.bob + this.levelTime * 3) * 5;

    if (c.type === 'lumalee') {
      const img = this.images.lumalee;
      if (img) {
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.drawImage(img, x - 8, y - 8, 44, 44);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(x + 14, y + 14, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    if (c.type === 'coin') {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.ellipse(x + 14, y + 14, 14, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('$', x + 9, y + 19);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(x + 10, y + 10, 4, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(x, y, 28, 28);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('?', x + 8, y + 22);
    }
  }

  drawPowerup(ctx, p, cam) {
    const x = p.x - cam;
    const y = p.y + Math.sin(p.bob + this.levelTime * 2) * 4;
    const img = this.images.elements;
    if (img && img.complete && img.naturalWidth > 0) {
      try {
        const col = p.type % 4;
        const row = Math.floor(p.type / 4);
        const sw = img.width / 4;
        const sh = img.height / 4;
        ctx.drawImage(img, col * sw, row * sh, sw, sh, x, y, 36, 36);
      } catch (e) {
        ctx.fillStyle = '#ff69b4';
        ctx.fillRect(x, y, 36, 36);
      }
    } else {
      ctx.fillStyle = '#ff69b4';
      ctx.beginPath();
      ctx.arc(x + 18, y + 18, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    // Glow
    ctx.shadowColor = '#ff69b4';
    ctx.shadowBlur = 10;
    ctx.shadowBlur = 0;
  }

  drawEnemy(ctx, e, cam) {
    const x = e.x - cam;
    const cx = x + e.w / 2;
    const cy = e.y + e.h / 2;
  const pulse = 1 + Math.sin(this.levelTime * 6 + e.id) * 0.08;

    ctx.save();
    ctx.shadowColor = '#8b0000';
    ctx.shadowBlur = 14;

    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, e.w * 0.55 * pulse);
    grad.addColorStop(0, '#ff1493');
    grad.addColorStop(0.45, '#cc0066');
    grad.addColorStop(1, '#4a0028');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, (e.w / 2) * pulse, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + this.levelTime * 2;
      ctx.fillStyle = '#990033';
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * e.w * 0.35, cy + Math.sin(a) * e.h * 0.35);
      ctx.lineTo(cx + Math.cos(a + 0.25) * e.w * 0.55, cy + Math.sin(a + 0.25) * e.h * 0.55);
      ctx.lineTo(cx + Math.cos(a - 0.25) * e.w * 0.55, cy + Math.sin(a - 0.25) * e.h * 0.55);
      ctx.fill();
    }

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx - e.w * 0.18, cy - e.h * 0.05, 7, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + e.w * 0.18, cy - e.h * 0.05, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx - e.w * 0.18, cy - e.h * 0.05, 3, 0, Math.PI * 2);
    ctx.arc(cx + e.w * 0.18, cy - e.h * 0.05, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx - e.w * 0.18, cy - e.h * 0.05, 1.2, 0, Math.PI * 2);
    ctx.arc(cx + e.w * 0.18, cy - e.h * 0.05, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy + e.h * 0.15, e.w * 0.22, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();
  }

  drawExit(ctx, exit, cam) {
    const x = exit.x - cam;
    ctx.fillStyle = '#50c878';
    ctx.fillRect(x, exit.y - 60, 8, 60);
    ctx.fillStyle = '#ff3366';
    ctx.beginPath();
    ctx.moveTo(x + 8, exit.y - 60);
    ctx.lineTo(x + 50, exit.y - 45);
    ctx.lineTo(x + 8, exit.y - 30);
    ctx.fill();
  }

  drawPlayer(ctx, player, cam) {
    const x = player.x - cam;
    const y = player.y;
    const img = this.images.mario;

    if (player.invincible > 0 && Math.floor(player.invincible / 100) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const scale = player.big ? 1.3 : 1;
    const pw = player.w * scale;
    const ph = player.h * scale;
    const px = x - (pw - player.w) / 2;
    const py = y - (ph - player.h);

    if (img) {
      ctx.save();
      if (player.facing < 0) {
        ctx.translate(px + pw, py);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, pw, ph);
      } else {
        ctx.drawImage(img, px, py, pw, ph);
      }
      ctx.restore();
      const tint = typeof SKIN_TINTS !== 'undefined' ? SKIN_TINTS[player.skin] : null;
      if (tint) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = tint;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(px, py, pw, ph);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#ff69b4';
      ctx.fillRect(px, py, pw, ph);
    }

    // Power-up indicator glow
    if (player.powerType >= 0) {
      ctx.strokeStyle = 'rgba(255,215,0,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px + pw / 2, py + ph / 2, pw * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  resetCollectibles() {
    this.collectibles.forEach((c) => { c.active = true; });
    this.powerups.forEach((p) => { p.active = true; });
  }

  setRemotePlayer(opp, match) {
    this.remotePlayer = opp;
    this.remoteMatch = match;
  }

  emitTrail(player) {
    if (!player || player.trail === 'none') return;
    this.trailTimer = (this.trailTimer || 0) + 1;
    if (this.trailTimer % 4 !== 0) return;
    const colors = {
      trail_glitter: ['#ffd700', '#ff69b4', '#fff'],
      trail_bubble: ['#ffb6d9', '#fff'],
      trail_wrappers: ['#ff3366', '#33cc33', '#ffd700'],
    };
    const pal = colors[player.trail] || ['#ffb6d9'];
    this.spawnParticles(player.x + player.w / 2, player.y + player.h, pal[this.trailTimer % pal.length], 2);
  }

  spawnDeathSplat(player, splat) {
    const colors = {
      default: '#ff69b4',
      splat_confetti: '#ffd700',
      splat_ooze: '#33ff66',
      splat_gold: '#ffcc00',
    };
    this.spawnParticles(player.x + player.w / 2, player.y + player.h / 2, colors[splat] || colors.default, 24);
  }

  drawRemotePlayer(ctx, rp, cam) {
    const x = rp.x - cam;
    const y = rp.y || 400;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#66ccff';
    ctx.fillRect(x, y, 32, 48);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rp.nickname || '?', x + 16, y - 8);
    ctx.restore();
  }
}
