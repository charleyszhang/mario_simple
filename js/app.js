/**
 * App shell: login, title/lore, hub map, shop, settings
 */
const App = {
  profile: null,
  settings: { music: true, lang: 'zh' },
  screen: 'login',
  API: 'api/',

  t(key) {
    const table = {
      login_title: { zh: '登录 / 注册', en: 'Login / Register' },
      nickname: { zh: '昵称', en: 'Nickname' },
      password: { zh: '密码', en: 'Password' },
      login: { zh: '登录', en: 'Login' },
      register: { zh: '注册', en: 'Register' },
      hub: { zh: '泡泡糖山谷地图', en: 'Hubba-Dubba Map' },
      shop: { zh: '商店', en: 'Shop' },
      rank: { zh: '排行榜', en: 'Leaderboard' },
      settings: { zh: '设置', en: 'Settings' },
      profile: { zh: '个人中心', en: 'Profile' },
      rules: { zh: '规则', en: 'Rules' },
      back: { zh: '返回地图', en: 'Back to Map' },
      stars_need: { zh: '需要3颗星星才能进入商店', en: 'Need 3 stars to unlock shop' },
      press_continue: { zh: '按空格或点击继续', en: 'Press Space or tap to continue' },
      controls_hint: { zh: '方向键/WASD移动，空格/W跳跃，E互动', en: 'Arrows/WASD move, Space/W jump, E interact' },
      touch_hint: { zh: '触屏使用屏幕按键；失败时点击任意处重试', en: 'Use touch buttons; tap anywhere to retry on death' },
    };
    const lang = this.settings.lang;
    return table[key]?.[lang] || table[key]?.zh || key;
  },

  async api(path, data = {}) {
    try {
      const res = await fetch(this.API + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        return {
          ok: false,
          error: '服务器返回异常。请用 http://localhost/mario/mario_simple/ 打开，并确认 PHPStudy 已启动。',
        };
      }
    } catch (e) {
      return {
        ok: false,
        error: '无法连接服务器。请确认 PHPStudy 已启动，并通过 localhost 访问游戏。',
      };
    }
  },

  $(id) { return document.getElementById(id); },

  showScreen(name) {
    this.screen = name;
    document.querySelectorAll('[data-screen]').forEach((el) => {
      el.classList.toggle('hidden', el.dataset.screen !== name);
    });
    document.body.dataset.appScreen = name;
    if (name === 'hub') this.renderHub();
    if (name === 'shop') this.renderShop();
    if (name === 'leaderboard') this.loadLeaderboard();
    if (name === 'profile') this.renderProfile();
  },

  setLoginLoading(loading) {
    const btns = ['btnLogin', 'btnRegister', 'btnDemoLogin'];
    btns.forEach((id) => {
      const b = this.$(id);
      if (!b) return;
      b.disabled = loading;
      b.style.opacity = loading ? '0.65' : '';
    });
    const demo = this.$('btnDemoLogin');
    if (demo && loading) demo.textContent = '登录中…';
    else if (demo) demo.textContent = '一键登录 Demo';
  },

  enterHub() {
    try {
      Multiplayer.start(this.profile, () => ({
        level: GameController?.currentLevel ?? -1,
        x: GameController?.player?.x ?? 0,
        y: GameController?.player?.y ?? 0,
        playing: GameController?.gameState === 'playing',
      }));
    } catch (e) { /* offline */ }
    this.showScreen('hub');
    gameAudio?.unlock?.();
    this.showToast(`欢迎，${this.profile?.nickname || '玩家'}！`);
  },

  showToast(msg) {
    const el = this.$('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), 2800);
  },

  updateOnlineBadge(n) {
    const el = this.$('onlineBadge');
    if (el) el.textContent = n > 0 ? `${n} 在线` : '';
  },

  loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('bgf_settings') || '{}');
      this.settings = { music: s.music !== false, lang: s.lang || 'zh', ...s };
    } catch (e) { /* default */ }
    if (typeof gameAudio !== 'undefined') gameAudio.setEnabled(this.settings.music);
  },

  saveSettings() {
    localStorage.setItem('bgf_settings', JSON.stringify(this.settings));
    if (typeof gameAudio !== 'undefined') gameAudio.setEnabled(this.settings.music);
  },

  saveSession() {
    if (this.profile?.token) {
      localStorage.setItem('bgf_session', JSON.stringify({
        token: this.profile.token,
        nickname: this.profile.nickname,
      }));
    }
  },

  async saveProfile() {
    if (!this.profile?.token) return;
    const res = await this.api('leaderboard.php', {
      action: 'save',
      token: this.profile.token,
      stars: this.profile.stars,
      coins: this.profile.coins,
      levelStars: this.profile.levelStars,
      maxLevel: this.profile.maxLevel,
      skin: this.profile.skin,
      owned: this.profile.owned,
      muteDev: this.profile.muteDev,
      achievements: this.profile.achievements,
    });
    if (res.ok && res.profile) this.profile = { ...this.profile, ...res.profile };
  },

  countStars() {
    const ls = this.profile?.levelStars || [];
    return Array.isArray(ls) ? ls.filter(Boolean).length : (this.profile?.stars || 0);
  },

  async init() {
    this.bindAuth();
    this.bindHub();
    this.bindShop();
    this.bindSettings();
    this.bindLore();
    this.loadSettings();

    try {
      await MarioFont.load();
      const titleEl = this.$('titleLetters');
      if (titleEl) MarioFont.renderToElement(titleEl, "MARIO'S STICKY SITUATION", 0.42);
    } catch (e) {
      console.warn('Font load skipped', e);
    }

    const session = JSON.parse(localStorage.getItem('bgf_session') || 'null');
    if (session?.nickname && this.$('loginNick')) {
      this.$('loginNick').value = session.nickname;
    }

    if (window.__DEV_MODE__) {
      this.profile = {
        nickname: 'Dev',
        token: 'dev',
        coins: 999,
        stars: 5,
        levelStars: [true, true, true],
        maxLevel: 19,
        skin: 'skin_default',
        owned: ['skin_default'],
        muteDev: false,
      };
      this.showScreen('hub');
      GameController?.init?.();
      return;
    }

    this.showScreen('login');
    GameController?.init?.();
  },

  bindAuth() {
    this.$('btnLogin')?.addEventListener('click', () => this.doLogin());
    this.$('btnRegister')?.addEventListener('click', () => this.doRegister());
    this.$('btnDemoLogin')?.addEventListener('click', () => this.doDemoLogin());
  },

  async doDemoLogin() {
    if (this.$('loginNick')) this.$('loginNick').value = 'demo';
    if (this.$('loginPass')) this.$('loginPass').value = 'demo123';
    await this.doLogin({ skipIntro: true });
  },

  async doLogin(options = {}) {
    const nick = (this.$('loginNick')?.value || '').trim();
    const pass = this.$('loginPass')?.value || '';
    const err = this.$('loginError');
    if (err) err.textContent = '';
    if (!nick || !pass) {
      if (err) err.textContent = '请输入昵称和密码';
      return;
    }

    this.setLoginLoading(true);
    try {
      let res = await this.api('auth.php', { action: 'login', nickname: nick, password: pass });

      if ((!res || !res.ok) && nick === 'demo' && pass === 'demo123') {
        res = {
          ok: true,
          token: 'demo_local_offline',
          profile: {
            nickname: 'demo',
            token: 'demo_local_offline',
            stars: 3,
            coins: 500,
            levelStars: [true, true, true],
            maxLevel: 2,
            skin: 'skin_default',
            owned: ['skin_default'],
          },
        };
      }

      if (!res || !res.ok) {
        if (err) err.textContent = res?.error || '登录失败';
        return;
      }

      this.profile = res.profile || { nickname: nick, token: res.token };
      if (!this.profile.nickname) this.profile.nickname = nick;
      if (!this.profile.token) this.profile.token = res.token;
      this.saveSession();

      if (options.skipIntro || localStorage.getItem('bgf_seen_intro') === '1') {
        this.enterHub();
      } else {
        this.startIntro();
      }
    } catch (e) {
      if (err) err.textContent = '登录出错：' + (e.message || '未知错误');
    } finally {
      this.setLoginLoading(false);
    }
  },

  async doRegister() {
    const nick = (this.$('loginNick')?.value || '').trim();
    const pass = this.$('loginPass')?.value || '';
    const err = this.$('loginError');
    if (err) err.textContent = '';
    this.setLoginLoading(true);
    try {
      const chk = await this.api('auth.php', { action: 'check', nickname: nick });
      if (chk?.exists) { if (err) err.textContent = '昵称已被使用'; return; }
      const res = await this.api('auth.php', { action: 'register', nickname: nick, password: pass });
      if (!res?.ok) { if (err) err.textContent = res?.error || '注册失败'; return; }
      this.profile = res.profile || { nickname: nick, token: res.token, coins: 0, stars: 0, levelStars: [] };
      if (!this.profile.nickname) this.profile.nickname = nick;
      if (!this.profile.token) this.profile.token = res.token;
      this.saveSession();
      this.startIntro();
    } catch (e) {
      if (err) err.textContent = '注册出错：' + (e.message || '未知错误');
    } finally {
      this.setLoginLoading(false);
    }
  },

  startIntro() {
    this.showScreen('title');
    try {
      Multiplayer.start(this.profile, () => ({
        level: GameController?.currentLevel ?? -1,
        x: GameController?.player?.x ?? 0,
        y: GameController?.player?.y ?? 0,
        playing: GameController?.gameState === 'playing',
      }));
    } catch (e) { /* ignore */ }
    gameAudio?.unlock?.();
    gameAudio?.playSting?.('title');
  },

  bindLore() {
    const scenes = [
      { id: 'lore1', dur: 4500 },
      { id: 'lore2', dur: 4500 },
      { id: 'lore3', dur: 5000 },
      { id: 'lore4', dur: 4000 },
    ];
    let idx = 0;

    const advanceTitle = () => {
      if (this.screen === 'title') {
        this.showScreen('lore');
        showScene(0);
      }
    };

    this.$('titleScreen')?.addEventListener('click', advanceTitle);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.screen === 'title') {
        e.preventDefault();
        advanceTitle();
      }
      if (e.code === 'Space' && this.screen === 'controls') {
        e.preventDefault();
        localStorage.setItem('bgf_seen_intro', '1');
        this.showScreen('hub');
      }
    });

    const showScene = (i) => {
      idx = i;
      scenes.forEach((s, j) => {
        const el = this.$(s.id);
        if (el) el.classList.toggle('active', j === i);
      });
      gameAudio?.playSting('lore' + (i + 1));
      if (i >= scenes.length - 1) {
        setTimeout(() => this.showScreen('controls'), scenes[i].dur);
      } else {
        setTimeout(() => showScene(i + 1), scenes[i].dur);
      }
    };

    this.$('loreScreen')?.addEventListener('click', () => {
      if (idx < scenes.length - 1) showScene(idx + 1);
      else this.showScreen('controls');
    });
    this.$('btnToHub')?.addEventListener('click', () => {
      localStorage.setItem('bgf_seen_intro', '1');
      this.showScreen('hub');
    });
  },

  bindHub() {
    this.$('navShop')?.addEventListener('click', () => {
      if (this.countStars() < 3) {
        this.showToast(this.t('stars_need'));
        return;
      }
      this.showScreen('shop');
    });
    this.$('navRank')?.addEventListener('click', () => this.showScreen('leaderboard'));
    this.$('navSettings')?.addEventListener('click', () => this.showScreen('settings'));
    this.$('navProfile')?.addEventListener('click', () => this.showScreen('profile'));
    this.$('navRules')?.addEventListener('click', () => this.showScreen('rules'));
    document.querySelectorAll('[data-back-hub]').forEach((b) => {
      b.addEventListener('click', () => this.showScreen('hub'));
    });
  },

  renderHub() {
    const map = this.$('levelMap');
    if (!map) return;
    map.innerHTML = '';
    const stars = this.profile?.levelStars || [];
    const max = this.profile?.maxLevel ?? 0;
    for (let i = 0; i < 20; i++) {
      const node = document.createElement('button');
      node.className = 'map-node';
      node.style.left = `${8 + (i % 5) * 18}%`;
      node.style.top = `${12 + Math.floor(i / 5) * 20}%`;
      if (stars[i]) node.classList.add('starred');
      if (i > max + 1) node.classList.add('locked');
      node.innerHTML = `<span class="node-num">${i + 1}</span>${stars[i] ? '<span class="node-star">★</span>' : ''}`;
      node.addEventListener('click', () => {
        if (i > max + 1) { this.showToast('请先完成前面的关卡'); return; }
        this.startLevel(i);
      });
      map.appendChild(node);
    }
    const info = this.$('hubStats');
    if (info) {
      info.textContent = `${this.profile?.nickname} | ★ ${this.countStars()} | 🪙 ${this.profile?.coins || 0}`;
    }
  },

  startLevel(index) {
    document.querySelectorAll('[data-screen]').forEach((el) => el.classList.add('hidden'));
    this.$('game-wrapper')?.classList.remove('hidden');
    GameController.startLevelFromHub(index, this.profile);
  },

  returnToHub() {
    gameAudio?.stopBGM();
    this.$('game-wrapper')?.classList.add('hidden');
    this.showScreen('hub');
    this.renderHub();
    this.saveProfile();
  },

  onLevelComplete(levelIndex, levelCoins, newStar) {
    if (newStar) {
      if (!this.profile.levelStars) this.profile.levelStars = [];
      this.profile.levelStars[levelIndex] = true;
      this.profile.stars = this.countStars();
    }
    this.profile.coins = (this.profile.coins || 0) + levelCoins;
    if (levelIndex >= (this.profile.maxLevel || 0)) this.profile.maxLevel = levelIndex;
    this.saveProfile();
  },

  onLevelDeath() {
    /* level coins already cleared in GameController */
  },

  bindShop() {
    document.querySelectorAll('.shop-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.shop-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.dataset.cat;
        document.querySelectorAll('.shop-panel').forEach((p) => {
          p.classList.toggle('hidden', p.dataset.cat !== cat);
        });
      });
    });
  },

  renderShop() {
    const coinsEl = this.$('shopCoins');
    if (coinsEl) coinsEl.textContent = this.profile?.coins || 0;
    this.renderShopGrid('shopSkins', SHOP_CATALOG.skins, 'skins');
    this.renderShopGrid('shopSnacks', SHOP_CATALOG.snacks, 'snacks');
    this.renderShopGrid('shopTrails', SHOP_CATALOG.trails, 'trails');
    this.renderShopGrid('shopSplats', SHOP_CATALOG.splats, 'splats');
    this.renderShopGrid('shopTricks', SHOP_CATALOG.tricks, 'tricks');
  },

  renderShopGrid(containerId, items, type) {
    const box = this.$('shopSkins') && type === 'skins' ? this.$('shopSkins')
      : this.$('shopSnacks') && type === 'snacks' ? this.$('shopSnacks')
      : this.$('shopTrails') && type === 'trails' ? this.$('shopTrails')
      : this.$('shopSplats') && type === 'splats' ? this.$('shopSplats')
      : this.$('shopTricks');
    if (!box || box.dataset.cat !== type && box.id !== `shop${type.charAt(0).toUpperCase() + type.slice(1)}`) {
      /* find by data-cat */
    }
    const el = document.querySelector(`.shop-panel[data-cat="${type}"] .shop-grid`);
    if (!el) return;
    el.innerHTML = '';
    const lang = this.settings.lang;
    const owned = this.profile?.owned || [];

    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'shop-card';
      if (owned.includes(item.id)) card.classList.add('owned');

      if (type === 'skins' && item.grid) {
        const thumb = document.createElement('div');
        thumb.className = 'skin-thumb';
        thumb.style.backgroundImage = 'url(images/store/skins.png)';
        thumb.style.backgroundSize = '300% 300%';
        thumb.style.backgroundPosition = `${item.grid[0] * 50}% ${item.grid[1] * 50}%`;
        card.appendChild(thumb);
      } else {
        const thumb = document.createElement('div');
        thumb.className = 'goods-thumb';
        card.appendChild(thumb);
      }

      const name = item.name[lang] || item.name.zh;
      const info = document.createElement('div');
      info.innerHTML = `<h4>${name}</h4><p class="shop-price">${item.price} 🪙</p>`;
      card.appendChild(info);
      const btn = document.createElement('button');
      btn.className = 'btn-small';
      btn.textContent = owned.includes(item.id) ? (type === 'skins' ? '装备' : '已拥有') : '购买';
      btn.addEventListener('click', () => this.buyItem(item.id, type));
      card.appendChild(btn);
      el.appendChild(card);
    }
  },

  async buyItem(id, type) {
    const owned = this.profile?.owned || [];
    if (owned.includes(id) && id !== 'fake_star') {
      if (type === 'skins' || type === 'trails' || type === 'splats') {
        await this.api('shop.php', { action: 'equip', token: this.profile.token, item: id });
        this.profile.skin = id.startsWith('skin') ? id : this.profile.skin;
        this.showToast('已装备');
      }
      return;
    }
    const res = await this.api('shop.php', { action: 'buy', token: this.profile.token, item: id });
    if (!res.ok) { this.showToast(res.error || '购买失败'); return; }
    if (res.troll) {
      this.showToast('此物品已失去风味！变成了一块嚼过的灰色口香糖……');
    } else {
      this.showToast('购买成功！');
    }
    if (res.profile) this.profile = { ...this.profile, ...res.profile };
    this.renderShop();
    this.saveProfile();
  },

  async loadLeaderboard() {
    const list = this.$('leaderboardList');
    if (!list) return;
    list.innerHTML = '<p>加载中…</p>';
    const res = await this.api('leaderboard.php', { action: 'list' });
    if (!res.ok) { list.innerHTML = '<p>加载失败</p>'; return; }
    list.innerHTML = '';
    res.leaderboard.forEach((row, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="rank">#${i + 1}</span> <strong>${row.nickname}</strong> ★${row.stars} 🪙${row.coins} Lv${(row.maxLevel || 0) + 1}`;
      list.appendChild(li);
    });
  },

  renderProfile() {
    const el = this.$('profileBody');
    if (!el || !this.profile) return;
    const skinName = SHOP_CATALOG.skins.find((s) => s.id === this.profile.skin)?.name?.zh || '默认';
    el.innerHTML = `
      <div class="profile-avatar skin-${this.profile.skin || 'default'}"></div>
      <h3>${this.profile.nickname}</h3>
      <p>皮肤: ${skinName}</p>
      <p>★ ${this.countStars()} | 🪙 ${this.profile.coins || 0}</p>
      <p>最高关卡: ${(this.profile.maxLevel || 0) + 1}</p>
    `;
  },

  bindSettings() {
    this.$('settingMusic')?.addEventListener('change', (e) => {
      this.settings.music = e.target.checked;
      this.saveSettings();
    });
    this.$('settingLang')?.addEventListener('change', (e) => {
      this.settings.lang = e.target.value;
      this.saveSettings();
    });
    const musicEl = this.$('settingMusic');
    if (musicEl) musicEl.checked = this.settings.music;
    const langEl = this.$('settingLang');
    if (langEl) langEl.value = this.settings.lang;
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());

window.App = App;
