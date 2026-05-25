/**
 * Online presence, matchmaking, gifts/attacks
 */
const Multiplayer = {
  interval: null,
  opponent: null,
  match: null,
  onlineCount: 0,
  events: [],

  start(profile, getState) {
    this.stop();
    if (!profile?.nickname) return;
    this.profile = profile;
    this.getState = getState;
    this.tick();
    this.interval = setInterval(() => this.tick(), 2500);
    this.eventInterval = setInterval(() => this.pollEvents(), 3000);
  },

  stop() {
    if (this.interval) clearInterval(this.interval);
    if (this.eventInterval) clearInterval(this.eventInterval);
    this.interval = null;
    this.opponent = null;
    this.match = null;
  },

  async tick() {
    if (!this.profile) return;
    const st = this.getState ? this.getState() : { level: -1, x: 0, y: 0, playing: false };
    try {
      const res = await App.api('multiplayer.php', {
        action: 'heartbeat',
        nickname: this.profile.nickname,
        level: st.level,
        x: st.x,
        y: st.y,
        playing: st.playing,
      });
      if (!res.ok) return;
      this.onlineCount = res.onlineCount || 0;
      this.match = res.match;
      this.opponent = res.opponent;
      if (window.GameController) {
        GameController.setRemotePlayer(this.opponent, this.match);
      }
      App.updateOnlineBadge(this.onlineCount);
    } catch (e) { /* offline */ }
  },

  async pollEvents() {
    if (!this.profile) return;
    try {
      const res = await App.api('multiplayer.php', {
        action: 'poll_events',
        nickname: this.profile.nickname,
      });
      if (res.ok && res.events?.length) {
        for (const ev of res.events) {
          App.showToast(ev.type === 'attack'
            ? `${ev.from} 向你发起了攻击！`
            : `${ev.from} 送了你礼物！`);
          if (ev.type === 'attack' && window.GameController?.gameState === 'playing') {
            GameController.triggerRemoteHit();
          }
        }
      }
    } catch (e) { /* ignore */ }
  },

  async send(type, to) {
    if (!this.profile || !to) return;
    await App.api('multiplayer.php', { action: type, from: this.profile.nickname, to });
    App.showToast(type === 'attack' ? '攻击已发送！' : '礼物已送出！');
  },
};

window.Multiplayer = Multiplayer;
