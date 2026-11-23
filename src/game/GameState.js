/**
 * 游戏状态与玩法逻辑核心
 *
 * 职责：统筹玩家数据、农场地块、工坊、订单，实现最小可玩闭环：
 *   播种 → 生长(离线累积) → 收获 → 售卖/加工 → 完成订单 → 经验升级 → 解锁
 *
 * 所有玩法操作在此收敛为方法，UI 层只负责调用与展示，保证逻辑与表现分离。
 */

import Player from '../entity/Player.js';
import FarmTile, { TILE_STATE } from '../entity/FarmTile.js';
import Workshop, { SLOT_STATE } from '../entity/Workshop.js';
import SaveSystem from '../system/SaveSystem.js';
import { getGameConfig, getCrop, getRecipe, getOrders, getLevels, calcLevel } from '../data/ConfigLoader.js';

class GameState {
  constructor() {
    this.player = new Player();
    this.tiles = [];
    this.workshop = new Workshop();
    this.offlineReport = null;     // 离线收益报告（供 UI 展示）
    this._listeners = [];          // 状态变更监听器
  }

  /**
   * 初始化游戏状态：优先读存档，否则新游戏
   */
  init() {
    const cfg = getGameConfig();
    const save = SaveSystem.load();
    if (save && save.player) {
      // 恢复存档
      this.player = Player.fromJSON(save.player);
      this.tiles = (save.tiles || []).map((t, i) => FarmTile.fromJSON(t, i));
      this.workshop = Workshop.fromJSON(save.workshop);
      // 补齐地块数量（防止配置变更后地块不足）
      const total = cfg.farm.cols * cfg.farm.rows;
      while (this.tiles.length < total) this.tiles.push(new FarmTile(this.tiles.length));
      this._applyOffline(save.savedAt || this.player.lastSaveAt);
    } else {
      // 新游戏
      this.player.gold = cfg.economy.initialGold;
      this.player.diamonds = cfg.economy.initialDiamonds;
      const total = cfg.farm.cols * cfg.farm.rows;
      for (let i = 0; i < total; i++) this.tiles.push(new FarmTile(i));
      this._refreshOrders();
    }
    this._refreshAll();
    return this;
  }

  /**
   * 应用离线收益：结算离线期间成熟的作物与加工
   *
   * 原理：地块/工坊的起始时间戳是真实时间，读档时只需用「当前真实时间」刷新，
   * 成熟判定自然成立，无需虚拟时间偏移。离线时长仅用于生成欢迎报告与上限提示。
   *
   * @param {number} savedAt 存档时间戳
   */
  _applyOffline(savedAt) {
    const cfg = getGameConfig();
    const { seconds, capped } = SaveSystem.offlineDuration(savedAt, cfg.economy.offlineCapHours);
    const now = this.now();
    let readyCrops = 0;
    let readyWorkshop = false;
    this.tiles.forEach(t => {
      const before = t.state;
      t.refresh(now);
      if (before === TILE_STATE.GROWING && t.state === TILE_STATE.READY) readyCrops++;
    });
    const beforeWs = this.workshop.state;
    this.workshop.refresh(now);
    if (beforeWs === SLOT_STATE.PROCESSING && this.workshop.state === SLOT_STATE.DONE) readyWorkshop = true;
    this.offlineReport = (readyCrops > 0 || readyWorkshop) ? { readyCrops, readyWorkshop, capped, seconds } : null;
  }

  /**
   * 当前逻辑时间（秒，真实时间）
   * 正式版改为服务器时间戳即可，逻辑不变。
   */
  now() {
    return Math.floor(Date.now() / 1000);
  }

  /** 刷新所有地块与工坊状态 */
  _refreshAll() {
    const now = this.now();
    this.tiles.forEach(t => t.refresh(now));
    this.workshop.refresh(now);
  }

  /**
   * 播种
   * @param {number} tileIndex 地块索引
   * @param {string} cropId 作物ID
   * @returns {{ok:boolean, msg:string}}
   */
  plant(tileIndex, cropId) {
    const tile = this.tiles[tileIndex];
    const crop = getCrop(cropId);
    if (!tile || tile.state !== TILE_STATE.EMPTY) return { ok: false, msg: '这块地不能播种' };
    if (!crop) return { ok: false, msg: '未知作物' };
    if (this.player.gold < crop.seedCost) return { ok: false, msg: '金币不足' };
    this.player.gold -= crop.seedCost;
    tile.plant(cropId, crop.growTime, this.now());
    this._notify();
    return { ok: true, msg: `种下了${crop.name}` };
  }

  /**
   * 收获（含 5% 暴击双倍）
   * @param {number} tileIndex 地块索引
   * @returns {{ok:boolean, msg:string, crit?:boolean}}
   */
  harvest(tileIndex) {
    const tile = this.tiles[tileIndex];
    if (!tile || tile.state !== TILE_STATE.READY) return { ok: false, msg: '还没成熟' };
    const crop = getCrop(tile.cropId);
    let amount = crop.yield;
    const crit = Math.random() < 0.05;
    if (crit) amount *= 2;
    this.player.addGood(crop.id, amount);
    this.player.totalExp += crop.exp;
    tile.clear();
    this._notify();
    return { ok: true, msg: `收获${crop.name}×${amount}${crit ? ' 暴击双倍!' : ''}`, crit };
  }

  /**
   * 售卖仓库中的商品
   * @param {string} goodId 商品ID
   * @param {number} amount 数量（默认全部）
   * @returns {{ok:boolean, msg:string}}
   */
  sell(goodId, amount = null) {
    const have = this.player.getGood(goodId);
    if (have <= 0) return { ok: false, msg: '仓库里没有这个商品' };
    const qty = amount === null ? have : Math.min(amount, have);
    // 售价优先取配方配置，其次作物配置
    const recipe = getRecipe(goodId);
    const crop = getCrop(goodId);
    const price = recipe ? recipe.sellPrice : (crop ? crop.sellPrice : 0);
    this.player.removeGood(goodId, qty);
    this.player.gold += price * qty;
    this._notify();
    return { ok: true, msg: `售出获得 ${price * qty} 金币` };
  }

  /**
   * 工坊：开始加工
   * @param {string} recipeId 配方ID
   * @returns {{ok:boolean, msg:string}}
   */
  startProcess(recipeId) {
    if (this.workshop.state !== SLOT_STATE.IDLE) return { ok: false, msg: '工坊正在工作中' };
    const recipe = getRecipe(recipeId);
    if (!recipe) return { ok: false, msg: '未知配方' };
    const lv = calcLevel(this.player.totalExp).level;
    if (lv < recipe.unlockLevel) return { ok: false, msg: `需达到 ${recipe.unlockLevel} 级` };
    // 校验原料
    for (const [good, need] of Object.entries(recipe.inputs)) {
      if (this.player.getGood(good) < need) return { ok: false, msg: `${good} 原料不足` };
    }
    // 扣原料
    for (const [good, need] of Object.entries(recipe.inputs)) {
      this.player.removeGood(good, need);
    }
    this.workshop.start(recipe, this.now());
    this._notify();
    return { ok: true, msg: `开始制作${recipe.name}` };
  }

  /**
   * 工坊：取出成品
   * @returns {{ok:boolean, msg:string}}
   */
  collectProcess() {
    const result = this.workshop.collect();
    if (!result) return { ok: false, msg: '还没有成品' };
    this.player.addGood(result.good, result.amount);
    this.player.totalExp += getRecipe(result.good)?.exp || 0;
    this._notify();
    return { ok: true, msg: `取出成品 ×${result.amount}` };
  }

  /**
   * 刷新当前可用订单（按等级筛选，取前3个）
   */
  _refreshOrders() {
    const lv = calcLevel(this.player.totalExp).level;
    const available = getOrders().filter(o => o.unlockLevel <= lv);
    this.player.activeOrders = available.slice(0, 3).map(o => o.id);
  }

  /**
   * 完成订单
   * @param {string} orderId 订单ID
   * @returns {{ok:boolean, msg:string}}
   */
  completeOrder(orderId) {
    const order = getOrders().find(o => o.id === orderId);
    if (!order) return { ok: false, msg: '订单不存在' };
    if (!this.player.activeOrders.includes(orderId)) return { ok: false, msg: '订单未激活' };
    const lv = calcLevel(this.player.totalExp).level;
    const prevLevel = lv;
    if (!this.player.hasGoods(order.require)) return { ok: false, msg: '商品不足，无法交付' };
    for (const [good, need] of Object.entries(order.require)) {
      this.player.removeGood(good, need);
    }
    this.player.gold += order.rewardGold;
    this.player.totalExp += order.rewardExp;
    // 升级后刷新订单
    const newLevel = calcLevel(this.player.totalExp).level;
    if (newLevel > prevLevel) this._refreshOrders();
    this._notify();
    return { ok: true, msg: `完成订单！+${order.rewardGold}金币 +${order.rewardExp}经验`, levelUp: newLevel > prevLevel };
  }

  /**
   * 获取订单对象列表（含完成状态）
   */
  getOrderViews() {
    return this.player.activeOrders.map(id => {
      const order = getOrders().find(o => o.id === id);
      return { ...order, canComplete: this.player.hasGoods(order.require) };
    });
  }

  /** 获取当前等级信息 */
  getLevelInfo() {
    return calcLevel(this.player.totalExp);
  }

  /** 保存游戏 */
  save() {
    this.player.lastSaveAt = Math.floor(Date.now() / 1000);
    SaveSystem.save(this);
  }

  /** 注册状态变更监听器 */
  onChange(fn) { this._listeners.push(fn); }

  /** 通知状态变更 */
  _notify() {
    this._refreshAll();
    this._listeners.forEach(fn => fn(this));
  }
}

export default GameState;
