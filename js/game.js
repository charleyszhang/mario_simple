/**
 * Bubble Gum Factory - Main Game Controller
 */
(() => {
  const canvas = document.getElementById('gameCanvas');
  const engine = new GameEngine(canvas);

  let currentLevel = 0;
  let player = null;
  let totalCoins = 0;
  let gameState = 'menu'; // menu | playing | paused | dead | complete | victory
  let lastTime = 0;
  let animId = null;

  const input = { left: false, right: false, jump: false, interact: false };

  const $ = (id) => document.getElementById(id);

  async function unlockAudio() {
    if (typeof gameAudio !== 'undefined') {
      await gameAudio.unlock();
      gameAudio.startBGM();
    }
  }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function updateHUD() {
    const ld = LEVEL_DATA[currentLevel];
    $('levelLabel').textContent = `关卡 ${currentLevel + 1} / 20 - ${ld.name}`;
    $('coinLabel').textContent = `金币: ${player ? player.coinCount : 0}`;
    const pl = $('powerLabel');
    if (player && player.powerType >= 0) {
      pl.textContent = POWERUP_NAMES[player.powerType];
    } else {
      pl.textContent = '';
    }
  }

  function startLevel(levelIndex) {
    currentLevel = levelIndex;
    const ld = LEVEL_DATA[currentLevel];
    engine.initLevel(ld, levelIndex);
    player = engine.createPlayer(ld.spawn);
    player.coinCount = totalCoins;
    gameState = 'playing';
    updateHUD();
    hide($('startScreen'));
    hide($('levelComplete'));
    hide($('gameOver'));
    hide($('victory'));
  }

  async function startGame() {
    await unlockAudio();
    totalCoins = 0;
    startLevel(0);
  }

  function restartCurrentLevel() {
    totalCoins = player ? player.coinCount : totalCoins;
    startLevel(currentLevel);
  }

  function nextLevel() {
    totalCoins = player.coinCount;
    if (currentLevel >= LEVEL_DATA.length - 1) {
      gameState = 'victory';
      show($('victory'));
      $('victoryStats').textContent = `共收集 ${totalCoins} 枚金币，完成了全部 20 层冒险！`;
      return;
    }
    startLevel(currentLevel + 1);
  }

  function onDeath() {
    gameState = 'dead';
    input.left = false;
    input.right = false;
    input.jump = false;
    input.interact = false;
    show($('gameOver'));
  }

  function onComplete() {
    gameState = 'complete';
    const ld = LEVEL_DATA[currentLevel];
    $('levelCompleteMsg').textContent = `${ld.name} 完成！${ld.desc}`;
    show($('levelComplete'));
  }

  function gameLoop(timestamp) {
    const dt = Math.min(timestamp - lastTime, 50);
    lastTime = timestamp;

    if (gameState === 'playing') {
      const pStatus = engine.updatePlayer(player, input, dt);
      const wStatus = engine.updateWorld(player, dt);
      engine.updateCamera(player);
      updateHUD();

      if (pStatus === 'dead' || wStatus === 'dead') {
        onDeath();
      } else if (wStatus === 'complete') {
        onComplete();
      }
    }

    if (player) engine.render(player);
    animId = requestAnimationFrame(gameLoop);
  }

  // Keyboard input
  const keyMap = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump', ArrowDown: 'interact',
    KeyA: 'left', KeyD: 'right', KeyW: 'jump', KeyS: 'interact',
    Space: 'jump', KeyE: 'interact',
  };

  window.addEventListener('keydown', (e) => {
    unlockAudio();

    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      if (gameState === 'menu') {
        startGame();
        return;
      }
      if (gameState === 'complete') {
        nextLevel();
        return;
      }
      if (gameState === 'dead') {
        restartCurrentLevel();
        return;
      }
      if (gameState === 'victory') {
        totalCoins = 0;
        startLevel(0);
        return;
      }
    }

    if (gameState !== 'playing') return;

    const action = keyMap[e.code];
    if (action) {
      input[action] = true;
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (gameState !== 'playing') return;
    const action = keyMap[e.code];
    if (action) {
      input[action] = false;
      e.preventDefault();
    }
  });

  // Touch controls
  function bindTouch(btnId, action) {
    const btn = $(btnId);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); unlockAudio(); input[action] = true; });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); input[action] = false; });
    btn.addEventListener('touchcancel', () => { input[action] = false; });
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); unlockAudio(); input[action] = true; });
    btn.addEventListener('mouseup', () => { input[action] = false; });
    btn.addEventListener('mouseleave', () => { input[action] = false; });
  }

  bindTouch('btnLeft', 'left');
  bindTouch('btnRight', 'right');
  bindTouch('btnJump', 'jump');
  bindTouch('btnInteract', 'interact');

  // UI buttons
  $('btnStart').addEventListener('click', () => startGame());

  $('btnNext').addEventListener('click', () => nextLevel());
  $('btnRetry').addEventListener('click', () => restartCurrentLevel());
  $('btnRestart').addEventListener('click', () => {
    totalCoins = 0;
    startLevel(0);
  });

  // Resize
  window.addEventListener('resize', () => engine.resize());

  // Prevent scroll on mobile
  document.body.addEventListener('touchmove', (e) => {
    if (gameState === 'playing') e.preventDefault();
  }, { passive: false });

  // Init
  async function init() {
    engine.resize();
    await engine.loadImages();
    player = engine.createPlayer({ x: 80, y: 460 });
    engine.initLevel(LEVEL_DATA[0], 0);
    gameState = 'menu';
    lastTime = performance.now();
    animId = requestAnimationFrame(gameLoop);
  }

  init();

  if (window.__DEV_MODE__) {
    window.GameApp = {
      getCurrentLevel() {
        return currentLevel;
      },
      getGameState() {
        return gameState;
      },
      goToLevel(index) {
        if (index < 0 || index >= LEVEL_DATA.length) return;
        input.left = false;
        input.right = false;
        input.jump = false;
        input.interact = false;
        startLevel(index);
        const devEl = document.getElementById('devLevel');
        if (devEl) devEl.textContent = String(currentLevel + 1);
      },
      startDev() {
        unlockAudio();
        totalCoins = 0;
        startLevel(0);
        const devEl = document.getElementById('devLevel');
        if (devEl) devEl.textContent = '1';
      },
    };
  }
})();
