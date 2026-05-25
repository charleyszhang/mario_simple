/**
 * Game audio - jump/bounce SFX and looping BGM (Web Audio API)
 */
class GameAudio {
  constructor() {
    this.ctx = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.unlocked = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
  }

  async unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.45;
      this.bgmGain.gain.value = 0.22;
      this.sfxGain.connect(this.ctx.destination);
      this.bgmGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.unlocked = true;
  }

  tone(freq, duration, options = {}) {
    if (!this.unlocked || !this.ctx) return;
    const {
      type = 'square',
      volume = 0.3,
      dest = this.sfxGain,
      freqEnd = null,
      delay = 0,
    } = options;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + duration);
    }
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  playJump() {
    this.tone(280, 0.1, { type: 'square', volume: 0.22, freqEnd: 520 });
    this.tone(520, 0.06, { type: 'square', volume: 0.12, delay: 0.04 });
  }

  playBounce() {
    this.tone(160, 0.14, { type: 'sine', volume: 0.38, freqEnd: 480 });
    this.tone(480, 0.1, { type: 'square', volume: 0.18, delay: 0.06, freqEnd: 640 });
    this.tone(320, 0.08, { type: 'triangle', volume: 0.12, delay: 0.12 });
  }

  startBGM() {
    if (!this.unlocked || this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.bgmStep = 0;
    this._playBGMStep();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  _playBGMStep() {
    if (!this.bgmPlaying) return;

    // Cheerful bubble-gum factory melody
    const melody = [
      { f: 523, d: 1 }, { f: 659, d: 1 }, { f: 784, d: 1 }, { f: 659, d: 1 },
      { f: 587, d: 1 }, { f: 659, d: 1 }, { f: 523, d: 2 },
      { f: 659, d: 1 }, { f: 784, d: 1 }, { f: 988, d: 1 }, { f: 784, d: 1 },
      { f: 880, d: 1 }, { f: 784, d: 1 }, { f: 659, d: 2 },
      { f: 698, d: 1 }, { f: 784, d: 1 }, { f: 880, d: 1 }, { f: 988, d: 1 },
      { f: 880, d: 1 }, { f: 784, d: 1 }, { f: 659, d: 2 },
      { f: 523, d: 1 }, { f: 659, d: 1 }, { f: 784, d: 1 }, { f: 1047, d: 2 },
    ];
    const bass = [
      131, 131, 165, 165, 147, 147, 131, 131,
      165, 165, 196, 196, 175, 175, 165, 165,
      175, 175, 196, 196, 220, 220, 196, 196,
      131, 131, 165, 165, 196, 196, 131, 131,
    ];

    const beat = 0.18;
    const idx = this.bgmStep % melody.length;
    const note = melody[idx];

    this.tone(note.f, beat * note.d * 0.9, {
      type: 'triangle',
      volume: 0.14,
      dest: this.bgmGain,
    });

    if (note.d >= 2 || idx % 2 === 0) {
      this.tone(bass[idx % bass.length], beat * note.d * 0.95, {
        type: 'sine',
        volume: 0.1,
        dest: this.bgmGain,
      });
    }

    // Soft harmony every other beat
    if (idx % 3 === 0) {
      this.tone(note.f * 1.5, beat * 0.8, {
        type: 'sine',
        volume: 0.04,
        dest: this.bgmGain,
      });
    }

    this.bgmStep++;
    this.bgmTimer = setTimeout(() => this._playBGMStep(), beat * note.d * 1000);
  }
}

const gameAudio = new GameAudio();
