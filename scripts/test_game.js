const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  const errors = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('http://localhost/mario/mario_simple/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.click('#btnDemoLogin');
  await page.waitForTimeout(2000);
  await page.click('.map-node');
  await page.waitForTimeout(2000);

  const info = await page.evaluate(() => {
    const c = document.getElementById('gameCanvas');
    const gc = window.GameController;
    return {
      gameState: gc?.gameState,
      hasPlayer: !!gc?.player,
      canvasW: c?.width,
      canvasH: c?.height,
      canvasStyleW: c?.style.width,
      canvasStyleH: c?.style.height,
      wrapperHidden: document.getElementById('game-wrapper')?.classList.contains('hidden'),
      pixelSample: (() => {
        if (!c) return null;
        const ctx = c.getContext('2d');
        const d = ctx.getImageData(480, 300, 1, 1).data;
        return [d[0], d[1], d[2], d[3]];
      })(),
    };
  });

  console.log(JSON.stringify({ info, errors, logs: logs.slice(-20) }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('TEST_FAIL', e.message);
  process.exit(1);
});
