/**
 * Developer level browser - PageUp / PageDown shortcuts
 */
(() => {
  function waitForGameApp(callback) {
    if (window.GameApp) {
      callback();
      return;
    }
    const timer = setInterval(() => {
      if (window.GameApp) {
        clearInterval(timer);
        callback();
      }
    }, 30);
  }

  function goNext() {
    if (!window.GameApp) return;
    const next = Math.min(GameApp.getCurrentLevel() + 1, LEVEL_DATA.length - 1);
    GameApp.goToLevel(next);
  }

  function goPrev() {
    if (!window.GameApp) return;
    const prev = Math.max(GameApp.getCurrentLevel() - 1, 0);
    GameApp.goToLevel(prev);
  }

  window.addEventListener('keydown', (e) => {
    if (!window.GameApp) return;

    if (e.code === 'PageDown' && !e.repeat) {
      e.preventDefault();
      goNext();
      return;
    }

    if (e.code === 'PageUp' && !e.repeat) {
      e.preventDefault();
      goPrev();
    }
  });

  waitForGameApp(() => {
    GameApp.startDev();
  });
})();
