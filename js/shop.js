/**
 * Shop catalog — matches api/shop.php and store sprite sheets
 */
const SHOP_CATALOG = {
  skins: [
    { id: 'skin_fire', name: { en: 'Fire Power', zh: '烈火威力' }, price: 200, grid: [0, 0],
      desc: { en: 'An iconic red and white outfit that radiates intense heat.', zh: '经典的红白配色，散发着强烈的热量。' } },
    { id: 'skin_snow', name: { en: 'Snow Land', zh: '冰雪世界' }, price: 250, grid: [1, 0],
      desc: { en: 'A frosty, cool outfit built for sub-zero temperatures.', zh: '专为严寒打造的冰爽冬装。' } },
    { id: 'skin_green', name: { en: 'Classic Green', zh: '经典之绿' }, price: 300, grid: [2, 0],
      desc: { en: 'The ultimate Player 2 attire.', zh: '终极的2号玩家套装。' } },
    { id: 'skin_vintage', name: { en: 'Vintage B&W', zh: '复古黑白' }, price: 150, grid: [0, 1],
      desc: { en: 'Travel back in time with this classic look.', zh: '穿上这款复古怀旧的外观，瞬间穿越回过去。' } },
    { id: 'skin_default', name: { en: 'Original', zh: '泡泡糖粉' }, price: 0, grid: [1, 1],
      desc: { en: 'Default bubblegum factory look.', zh: '默认的泡泡糖工厂外观。' } },
    { id: 'skin_star', name: { en: 'Star-Power', zh: '无敌星光' }, price: 999, grid: [2, 1],
      desc: { en: 'A brilliant flashing skin. Invincibility is psychological only.', zh: '模拟无敌状态的耀眼闪光皮肤。' } },
    { id: 'skin_neon', name: { en: 'Neon Cyber', zh: '霓虹赛博' }, price: 450, grid: [0, 2],
      desc: { en: 'A futuristic glowing outfit.', zh: '专为数字天堂设计的未来感发光套装。' } },
    { id: 'skin_zombie', name: { en: 'Zombie', zh: '丧尸复生' }, price: 400, grid: [1, 2],
      desc: { en: 'A spooky undead look.', zh: '专为永不言弃的玩家打造的不死族外观。' } },
    { id: 'skin_cosmic', name: { en: 'Cosmic Space', zh: '浩瀚宇宙' }, price: 500, grid: [2, 2],
      desc: { en: 'Forged from stars and nebulas.', zh: '由繁星、星云和无尽虚空锻造而成。' } },
  ],
  trails: [
    { id: 'trail_glitter', name: { en: 'Sweet Glitter', zh: '甜心闪粉' }, price: 120 },
    { id: 'trail_bubble', name: { en: 'Bubble Trail', zh: '泡泡跟随' }, price: 100 },
    { id: 'trail_wrappers', name: { en: 'Candy Wrappers', zh: '糖果包装纸' }, price: 80 },
  ],
  splats: [
    { id: 'splat_confetti', name: { en: 'Confetti Splat', zh: '彩纸爆炸' }, price: 90 },
    { id: 'splat_ooze', name: { en: 'Toxic Ooze', zh: '毒液飞溅' }, price: 110 },
    { id: 'splat_gold', name: { en: 'Gold Glitter', zh: '金粉爆炸' }, price: 150 },
  ],
  snacks: [
    { id: 'snack_bullet', name: { en: 'Bullet Bill Bits', zh: '炮弹刺客碎碎糖' }, price: 25, goodsRow: 3, goodsCol: 1 },
    { id: 'snack_block', name: { en: 'Block Powder', zh: '砖块糖粉' }, price: 20, goodsRow: 4, goodsCol: 1 },
    { id: 'snack_waffle', name: { en: 'Warp Pipe Waffles', zh: '传送管道华夫饼' }, price: 30, goodsRow: 4, goodsCol: 2 },
    { id: 'snack_locket', name: { en: 'Power Locket', zh: '力量糖果吊坠' }, price: 35, goodsRow: 2, goodsCol: 1 },
    { id: 'snack_goomba', name: { en: 'Goomba Gummies', zh: '栗宝宝软糖' }, price: 28, goodsRow: 2, goodsCol: 2 },
    { id: 'snack_flower', name: { en: 'Fire Flower', zh: '火之花糖' }, price: 32, goodsRow: 2, goodsCol: 0 },
    { id: 'snack_soda', name: { en: 'Flower Soda', zh: '花卉苏打' }, price: 22, goodsRow: 1, goodsCol: 0 },
    { id: 'snack_yoshi', name: { en: "Yoshi's Drink", zh: '耀西特调' }, price: 26, goodsRow: 0, goodsCol: 2 },
    { id: 'snack_pasta', name: { en: "Bowser's Fire Pasta", zh: '库巴烈火面' }, price: 40, goodsRow: 1, goodsCol: 3 },
    { id: 'snack_mushroom', name: { en: 'Super Mushroom', zh: '超级蘑菇糖' }, price: 50, goodsRow: 0, goodsCol: 0 },
    { id: 'snack_star', name: { en: 'Star Candy', zh: '星星糖' }, price: 45, goodsRow: 1, goodsCol: 2 },
    { id: 'snack_shy', name: { en: 'Shy Guy Syrup', zh: '嘿呵糖浆' }, price: 24, goodsRow: 4, goodsCol: 3 },
  ],
  tricks: [
    { id: 'fake_star', name: { en: '??? Super Star', zh: '??? 超级星星' }, price: 500,
      desc: { en: 'Surely this legendary item will help...', zh: '这传说级道具肯定有用……吧？' } },
    { id: 'mute_dev', name: { en: 'Mute the Developer', zh: '静音开发者' }, price: 150,
      desc: { en: 'Silence mocking laugh on death.', zh: '死亡时不再听到嘲讽笑声。' } },
  ],
};

const SKIN_TINTS = {
  skin_default: null,
  skin_fire: '#ff3333',
  skin_snow: '#66ccff',
  skin_green: '#33cc33',
  skin_vintage: '#888888',
  skin_star: '#ffd700',
  skin_neon: '#00ffff',
  skin_zombie: '#6b8f5e',
  skin_cosmic: '#6633cc',
};

window.SHOP_CATALOG = SHOP_CATALOG;
window.SKIN_TINTS = SKIN_TINTS;
