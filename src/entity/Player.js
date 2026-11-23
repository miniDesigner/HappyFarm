/**
 * 玩家数据实体
 *
 * 职责：维护玩家的经济（金币/钻石）、经验等级、仓库库存与当前订单列表。
 * 提供序列化能力，供存档系统持久化。
 */

class Player {
  constructor() {
    this.gold = 0;              // 金币（软通货）
    this.diamonds = 0;          // 钻石（硬通货）
    this.totalExp = 0;          // 累计经验
    this.inventory = {};        // 仓库 { 商品ID: 数量 }
    this.activeOrders = [];     // 当前订单列表
    this.lastSaveAt = 0;        // 上次存档时间戳（秒），用于离线收益计算
  }

  /**
   * 增加商品到仓库
   * @param {string} goodId 商品ID
   * @param {number} amount 数量
   */
  addGood(goodId, amount) {
    this.inventory[goodId] = (this.inventory[goodId] || 0) + amount;
  }

  /**
   * 从仓库扣除商品
   * @param {string} goodId 商品ID
   * @param {number} amount 数量
   * @returns {boolean} 是否扣除成功（库存足够）
   */
  removeGood(goodId, amount) {
    const have = this.inventory[goodId] || 0;
    if (have < amount) return false;
    this.inventory[goodId] = have - amount;
    if (this.inventory[goodId] <= 0) delete this.inventory[goodId];
    return true;
  }

  /**
   * 查询仓库某商品数量
   * @param {string} goodId 商品ID
   * @returns {number} 数量
   */
  getGood(goodId) {
    return this.inventory[goodId] || 0;
  }

  /**
   * 检查是否拥有足够的商品（用于订单校验）
   * @param {Object} require 需求 { 商品ID: 数量 }
   * @returns {boolean}
   */
  hasGoods(require) {
    return Object.keys(require).every(id => this.getGood(id) >= require[id]);
  }

  /**
   * 序列化
   */
  toJSON() {
    return {
      gold: this.gold,
      diamonds: this.diamonds,
      totalExp: this.totalExp,
      inventory: this.inventory,
      activeOrders: this.activeOrders,
      lastSaveAt: this.lastSaveAt,
    };
  }

  /**
   * 从存档恢复
   */
  static fromJSON(data) {
    const p = new Player();
    if (!data) return p;
    p.gold = data.gold ?? 0;
    p.diamonds = data.diamonds ?? 0;
    p.totalExp = data.totalExp ?? 0;
    p.inventory = data.inventory || {};
    p.activeOrders = data.activeOrders || [];
    p.lastSaveAt = data.lastSaveAt || 0;
    return p;
  }
}

export default Player;
