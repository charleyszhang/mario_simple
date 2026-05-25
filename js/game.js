/**
 * Bubble Gum Factory - Main Game Controller
 */
(() => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const engine = new GameEngine(canvas);

  let currentLevel = 0;
  let player = null;
  let bankCoins = 0;
  let levelCoins = 0;
  let gameState = 'idle';
  let lastTime = 0;
  let animId = null;
  let profile = null;
  let remotePlayer = null;
  let remoteMatch = null;
  let animTimer = null;
  let earnedStar = false;

  const input = { left: false, right: false, jump: false, interact: false };
  const $ = (id) => document.getElementById(id);

  async function unlockAudio() {
    if (typeof gameAudio !== 'undefined') {
      await gameAudio.unlock();
    }
  }

  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }

  function totalDisplay() {
    return bankCoins + levelCoins;
  }

  function updateHUD() {
    if (player) levelCoins = player.levelCoins || 0;
    const ld = LEVEL_DATA[currentLevel];
    if ($('levelLabel')) $('levelLabel').textContent = `关卡 ${currentLevel + 1} / 20 - ${ld.name}`;
    if ($('coinLabel')) $('coinLabel').textContent = `金币: ${totalDisplay()} (本关 ${levelCoins})`;
    const pl = $('powerLabel');
    if (pl) {
      pl.textContent = player && player.powerType >= 0 ? POWERUP_NAMES[player.powerType] : '';
    }
    const mp = $('mpActions');
    if (mp && remotePlayer && remoteMatch?.level === currentLevel) {
      mp.classList.remove('hidden');
      $('mpOpponent').textContent = remoteMatch.opponent || remotePlayer.nickname;
    } else if (mp) {
      mp.classList.add('hidden');
    }
  }

  function applyProfile(p) {
    profile = p;
    bankCoins = p?.coins || 0;
    if (player) {
      player.skin = p?.skin || 'skin_default';
      player.trail = p?.trail || 'none';
      player.splat = p?.splat || 'default';
      if (p?.jumpBoots) player.highJump = true;
      player.nickname = p?.nickname || '';
    }
  }

  function startLevel(levelIndex, fresh = true) {
    currentLevel = levelIndex;
    if (fresh) levelCoins = 0;
    const ld = LEVEL_DATA[currentLevel];
    engine.initLevel(ld, levelIndex);
    player = engine.createPlayer(ld.spawn);
    player.levelCoins = 0;
    applyProfile(profile);
    player.displayCoins = totalDisplay;
    gameState = 'playing';
    earnedStar = false;
    clearTimeout(animTimer);
    hide($('levelComplete'));
    hide($('gameOver'));
    hide($('victory'));
    $('gameOver')?.classList.remove('anim-death');
    $('levelComplete')?.classList.remove('anim-win');
    if (typeof gameAudio !== 'undefined') {
      gameAudio.startLevelBGM(currentLevel);
    }
    updateHUD();
  }

  function startLevelFromHub(index, userProfile) {
    applyProfile(userProfile);
    $('game-wrapper')?.classList.remove('hidden');
    unlockAudio().then(() => gameAudio?.startLevelBGM(index));
    startLevel(index, true);
  }

  function restartCurrentLevel() {
    levelCoins = 0;
    engine.resetCollectibles();
    startLevel(currentLevel, false);
  }

  function nextLevel() {
    if (currentLevel >= LEVEL_DATA.length - 1) {
      gameState = 'victory';
      show($('victory'));
      if ($('victoryStats')) {
        $('victoryStats').textContent = `共获得 ${App?.countStars?.() || 0} 颗星星，银行金币 ${bankCoins}！`;
      }
      gameAudio?.playSting('victory');
      return;
    }
    startLevel(currentLevel + 1, true);
  }

  function finishAnimThen(fn, delay = 2200) {
    clearTimeout(animTimer);
    animTimer = setTimeout(fn, delay);
  }

  function onDeath(reason) {
    if (gameState !== 'playing') return;
    gameState = 'dead';
    input.left = input.right = input.jump = input.interact = false;
    levelCoins = 0;
    engine.spawnDeathSplat(player, profile?.splat);
    const mute = profile?.muteDev;
    gameAudio?.playSting('death', mute);
    App?.onLevelDeath?.();
    const go = $('gameOver');
    show(go);
    go?.classList.add('anim-death');
    if ($('gameOverMsg')) {
      $('gameOverMsg').textContent = reason === 'player'
        ? '碰到了其他玩家！'
        : '泡泡糖爆炸！点击任意处或按空格重试';
    }
    updateHUD();
  }

  function onComplete() {
    if (gameState !== 'playing') return;
    gameState = 'complete';
    const ls = profile?.levelStars || [];
    earnedStar = !ls[currentLevel];
    const lc = $('levelComplete');
    show(lc);
    lc?.classList.add('anim-win');
    gameAudio?.playSting('win');
    const ld = LEVEL_DATA[currentLevel];
    let msg = `${ld.name} 完成！`;
    if (earnedStar) msg += ' 获得 ★ 1 颗星星！';
    else msg += ' (本关星星已领取)';
    msg += ` 本关金币 +${levelCoins} 已存入银行。`;
    if ($('levelCompleteMsg')) $('levelCompleteMsg').textContent = msg;
    bankCoins += levelCoins;
    if (profile) profile.coins = bankCoins;
    App?.onLevelComplete?.(currentLevel, levelCoins, earnedStar);
    levelCoins = 0;
    finishAnimThen(() => {}, 2500);
  }

  function setRemotePlayer(opp, match) {
    remotePlayer = opp;
    remoteMatch = match;
    engine.setRemotePlayer(opp, match?.level === currentLevel ? match : null);
  }

  function triggerRemoteHit() {
    if (gameState === 'playing') onDeath('player');
  }

  function gameLoop(timestamp) {
    const dt = Math.min(timestamp - lastTime, 50);
    lastTime = timestamp;

    if (gameState === 'playing') {
      engine.emitTrail(player);
      const pStatus = engine.updatePlayer(player, input, dt);
      const wStatus = engine.updateWorld(player, dt);
      engine.updateCamera(player);
      updateHUD();

      if (pStatus === 'dead' || wStatus === 'dead') onDeath();
      else if (wStatus === 'complete') onComplete();
    }

    if (player) engine.render(player);
    animId = requestAnimationFrame(gameLoop);
  }

  const keyMap = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump', ArrowDown: 'interact',
    KeyA: 'left', KeyD: 'right', KeyW: 'jump', KeyS: 'interact',
    Space: 'jump', KeyE: 'interact',
  };

  window.addEventListener('keydown', (e) => {
    unlockAudio();
    if (e.code === 'Space' && !e.repeat) {
      if (gameState === 'complete') { e.preventDefault(); nextLevel(); return; }
      if (gameState === 'dead') { e.preventDefault(); restartCurrentLevel(); return; }
      if (gameState === 'victory') { e.preventDefault(); App?.returnToHub?.(); return; }
    }
    if (gameState !== 'playing') return;
    const action = keyMap[e.code];
    if (action) { input[action] = true; e.preventDefault(); }
  });

  window.addEventListener('keyup', (e) => {
    if (gameState !== 'playing') return;
    const action = keyMap[e.code];
    if (action) { input[action] = false; e.preventDefault(); }
  });

  function bindTouch(btnId, action) {
    const btn = $(btnId);
    if (!btn) return;
    const down = (e) => { e.preventDefault(); unlockAudio(); input[action] = true; };
    const up = () => { input[action] = false; };
    btn.addEventListener('touchstart', down, { passive: false });
    btn.addEventListener('touchend', up);
    btn.addEventListener('touchcancel', up);
    btn.addEventListener('mousedown', down);
    btn.addEventListener('mouseup', up);
    btn.addEventListener('mouseleave', up);
  }

  bindTouch('btnLeft', 'left');
  bindTouch('btnRight', 'right');
  bindTouch('btnJump', 'jump');
  bindTouch('btnInteract', 'interact');

  $('btnNext')?.addEventListener('click', () => nextLevel());
  $('btnRetry')?.addEventListener('click', () => restartCurrentLevel());
  $('btnHub')?.addEventListener('click', () => {
    gameState = 'idle';
    gameAudio?.stopBGM();
    App?.returnToHub?.();
  });
  $('btnVictoryHub')?.addEventListener('click', () => App?.returnToHub?.());

  $('gameOver')?.addEventListener('click', () => {
    if (gameState === 'dead') restartCurrentLevel();
  });
  $('levelComplete')?.addEventListener('click', () => {
    if (gameState === 'complete') nextLevel();
  });

  $('btnMpGift')?.addEventListener('click', () => {
    const to = remoteMatch?.opponent || remotePlayer?.nickname;
    if (to) Multiplayer.send('gift', to);
  });
  $('btnMpAttack')?.addEventListener('click', () => {
    const to = remoteMatch?.opponent || remotePlayer?.nickname;
    if (to) Multiplayer.send('attack', to);
  });

  window.addEventListener('resize', () => engine.resize());
  document.body.addEventListener('touchmove', (e) => {
    if (gameState === 'playing') e.preventDefault();
  }, { passive: false });

  async function init() {
    engine.resize();
    await engine.loadImages();
    player = engine.createPlayer({ x: 80, y: 460 });
    engine.initLevel(LEVEL_DATA[0], 0);
    gameState = 'idle';
    lastTime = performance.now();
    animId = requestAnimationFrame(gameLoop);
  }

  window.GameController = {
    init,
    startLevelFromHub,
    restartCurrentLevel,
    nextLevel,
    setRemotePlayer,
    triggerRemoteHit,
    get currentLevel() { return currentLevel; },
    get player() { return player; },
    get gameState() { return gameState; },
  };

  if (window.__DEV_MODE__) {
    window.GameApp = {
      getCurrentLevel: () => currentLevel,
      getGameState: () => gameState,
      goToLevel(index) {
        if (index < 0 || index >= LEVEL_DATA.length) return;
        input.left = input.right = input.jump = input.interact = false;
        startLevel(index, true);
        const devEl = document.getElementById('devLevel');
        if (devEl) devEl.textContent = String(currentLevel + 1);
      },
      startDev() {
        unlockAudio().then(() => startLevel(0, true));
        const devEl = document.getElementById('devLevel');
        if (devEl) devEl.textContent = '1';
      },
    };
  }
})();
