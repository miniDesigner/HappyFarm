/**
 * 存档系统
 *
 * 职责：玩家进度持久化（localStorage / wx.setStorageSync），支持离线收益结算。
 * 离线收益：关闭游戏期间作物按真实时间继续生长，回来后一次性结算成熟。
 */

const SAVE_KEY = 'happfarm_save_v1';

class SaveSystem {
  /**
   * 保存游戏状态
   * @param {Object} state 需保存的状态：{ player, tiles, workshop }
   */
  static save(state) {
    const payload = {
      version: 1,
      savedAt: Math.floor(Date.now() / 1000),
      player: state.player.toJSON(),
      tiles: state.tiles.map(t => t.toJSON()),
      workshop: state.workshop ? state.workshop.toJSON() : null,
    };
    const data = JSON.stringify(payload);
    if (typeof wx !== 'undefined' && wx.setStorageSync) {
      wx.setStorageSync(SAVE_KEY, data);
    } else {
      localStorage.setItem(SAVE_KEY, data);
    }
  }

  /**
   * 读取游戏状态
   * @returns {Object|null} 存档数据，无存档返回 null
   */
  static load() {
    let data = null;
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      data = wx.getStorageSync(SAVE_KEY);
    } else {
      data = localStorage.getItem(SAVE_KEY);
    }
    if (!data) return null;
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
      console.warn('[SaveSystem] 存档解析失败', e);
      return null;
    }
  }

  /**
   * 清除存档（用于测试/重开）
   */
  static clear() {
    if (typeof wx !== 'undefined' && wx.removeStorageSync) {
      wx.removeStorageSync(SAVE_KEY);
    } else {
      localStorage.removeItem(SAVE_KEY);
    }
  }

  /**
   * 计算离线收益摘要（供 UI 展示"欢迎回来"）
   * @param {number} savedAt 存档时间戳（秒）
   * @param {number} capHours 离线收益上限（小时）
   * @returns {{seconds:number, capped:boolean}} 离线秒数与被截断标记
   */
  static offlineDuration(savedAt, capHours) {
    const now = Math.floor(Date.now() / 1000);
    const raw = Math.max(0, now - savedAt);
    const cap = capHours * 3600;
    return { seconds: Math.min(raw, cap), capped: raw > cap };
  }
}

export default SaveSystem;
