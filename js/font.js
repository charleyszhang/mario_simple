/**
 * Mario-style sprite font from images/font.png
 */
const MarioFont = {
  src: 'images/font.png',
  img: null,
  cols: 9,
  rows: 3,
  ready: false,

  async load() {
    if (this.ready) return;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.img = img; this.ready = true; resolve(); };
      img.onerror = () => resolve();
      img.src = this.src;
    });
  },

  indexOf(ch) {
    const c = ch.toUpperCase();
    if (c >= 'A' && c <= 'I') return c.charCodeAt(0) - 65;
    if (c >= 'J' && c <= 'R') return 9 + c.charCodeAt(0) - 74;
    if (c >= 'S' && c <= 'Z') return 18 + c.charCodeAt(0) - 83;
    return -1;
  },

  measure(text, scale = 1) {
    if (!this.img) return text.length * 20 * scale;
    const cw = this.img.width / this.cols;
    let w = 0;
    for (const ch of text) {
      if (ch === ' ') { w += cw * 0.35 * scale; continue; }
      if (ch === "'" || ch === "'") { w += cw * 0.25 * scale; continue; }
      if (this.indexOf(ch) >= 0) w += cw * scale;
    }
    return w;
  },

  draw(ctx, text, x, y, scale = 1) {
    if (!this.img) {
      ctx.font = `bold ${Math.floor(28 * scale)}px sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
      return;
    }
    const cw = this.img.width / this.cols;
    const ch = this.img.height / this.rows;
    let cx = x;
    for (const raw of text) {
      if (raw === ' ') { cx += cw * 0.35 * scale; continue; }
      if (raw === "'" || raw === "'") {
        ctx.font = `bold ${Math.floor(ch * 0.45 * scale)}px sans-serif`;
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText("'", cx, y + ch * 0.55 * scale);
        ctx.fillText("'", cx, y + ch * 0.55 * scale);
        cx += cw * 0.25 * scale;
        continue;
      }
      const idx = this.indexOf(raw);
      if (idx < 0) continue;
      const col = idx % this.cols;
      const row = Math.floor(idx / this.cols);
      ctx.drawImage(
        this.img,
        col * cw, row * ch, cw, ch,
        cx, y, cw * scale, ch * scale
      );
      cx += cw * scale;
    }
  },

  renderToElement(el, text, scale = 0.55) {
    if (!el) return;
    const canvas = document.createElement('canvas');
    const w = Math.ceil(this.measure(text, scale) + 8);
    const h = Math.ceil((this.img ? this.img.height / this.rows : 40) * scale + 8);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    this.draw(ctx, text, 4, 4, scale);
    el.innerHTML = '';
    el.appendChild(canvas);
  },
};

window.MarioFont = MarioFont;
