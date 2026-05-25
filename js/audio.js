/**
 * Game audio - SFX, per-level BGM, win/lose stings
 */
class GameAudio {
  constructor() {
    this.ctx = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.unlocked = false;
    this.enabled = true;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.currentLevel = 0;
    this.levelThemes = this._buildThemes();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stopBGM();
  }

  _buildThemes() {
    const themes = [];
    for (let i = 0; i < 20; i++) {
      const base = 220 + (i % 5) * 40;
      themes.push([
        base, base * 1.25, base * 1.5, base * 1.25,
        base * 1.12, base * 1.25, base,
        base * 1.25, base * 1.5, base * 2, base * 1.5, base * 1.25,
      ]);
    }
    return themes;
  }

  async unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.45;
      this.bgmGain.gain.value = 0.2;
      this.sfxGain.connect(this.ctx.destination);
      this.bgmGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.unlocked = true;
  }

  tone(freq, duration, options = {}) {
    if (!this.unlocked || !this.ctx || !this.enabled) return;
    const { type = 'square', volume = 0.3, dest = this.sfxGain, freqEnd = null, delay = 0 } = options;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + duration);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  playJump() { this.tone(280, 0.1, { volume: 0.22, freqEnd: 520 }); }
  playBounce() {
    this.tone(160, 0.14, { type: 'sine', volume: 0.38, freqEnd: 480 });
    this.tone(480, 0.1, { volume: 0.18, delay: 0.06, freqEnd: 640 });
  }

  startLevelBGM(level) {
    this.currentLevel = level;
    this.stopBGM();
    if (!this.enabled) return;
    this.bgmPlaying = true;
    this.bgmStep = 0;
    this._playBGMStep();
  }

  startBGM() { this.startLevelBGM(0); }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) { clearTimeout(this.bgmTimer); this.bgmTimer = null; }
  }

  _playBGMStep() {
    if (!this.bgmPlaying) return;
    const melody = this.levelThemes[this.currentLevel % this.levelThemes.length];
    const beat = 0.16 + (this.currentLevel % 3) * 0.02;
    const idx = this.bgmStep % melody.length;
    this.tone(melody[idx], beat, { type: 'triangle', volume: 0.12, dest: this.bgmGain });
    if (idx % 2 === 0) {
      this.tone(melody[idx] * 0.5, beat * 1.1, { type: 'sine', volume: 0.08, dest: this.bgmGain });
    }
    this.bgmStep++;
    this.bgmTimer = setTimeout(() => this._playBGMStep(), beat * 1000);
  }

  playSting(kind, muteMock = false) {
    if (!this.enabled) return;
    if (kind === 'death' && !muteMock) {
      this.tone(120, 0.2, { type: 'sawtooth', volume: 0.35 });
      this.tone(90, 0.35, { type: 'sine', volume: 0.3, delay: 0.15 });
      this.tone(200, 0.08, { volume: 0.2, delay: 0.05 });
    } else if (kind === 'death') {
      this.tone(100, 0.15, { type: 'sine', volume: 0.15 });
    } else if (kind === 'win') {
      [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.15, { volume: 0.25, delay: i * 0.12 }));
    } else if (kind === 'victory') {
      [392, 523, 659, 784, 988].forEach((f, i) => this.tone(f, 0.2, { volume: 0.22, delay: i * 0.15 }));
    } else if (kind === 'title') {
      [659, 784, 988].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', volume: 0.18, delay: i * 0.2 }));
    } else if (kind.startsWith('lore')) {
      this.tone(330 + (parseInt(kind.replace('lore', ''), 10) || 0) * 40, 0.3, { type: 'sine', volume: 0.12 });
    }
  }
}

const gameAudio = new GameAudio();
