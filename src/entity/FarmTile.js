/**
 * 农场地块实体
 *
 * 职责：维护单块地的状态（空置/生长中/可收获）与生长计时。
 * 生长按真实时间戳计算，支持离线累积——下次进入时用当前时间重新判定成熟度。
 */

export const TILE_STATE = {
  EMPTY: 'empty',        // 空置，可播种
  GROWING: 'growing',    // 生长中
  READY: 'ready',        // 可收获
};

class FarmTile {
  /**
   * @param {number} index 地块索引
   */
  constructor(index) {
    this.index = index;          // 地块序号
    this.state = TILE_STATE.EMPTY; // 当前状态
    this.cropId = null;          // 种植的作物ID
    this.plantedAt = 0;          // 播种时间戳（秒）
    this.growTime = 0;           // 生长总时长（秒）
  }

  /**
   * 播种
   * @param {string} cropId 作物ID
   * @param {number} growTime 生长时长（秒）
   * @param {number} now 当前时间戳（秒）
   */
  plant(cropId, growTime, now) {
    this.state = TILE_STATE.GROWING;
    this.cropId = cropId;
    this.growTime = growTime;
    this.plantedAt = now;
  }

  /**
   * 根据当前时间刷新成熟度（支持离线）
   * @param {number} now 当前时间戳（秒）
   */
  refresh(now) {
    if (this.state !== TILE_STATE.GROWING) return;
    if (now - this.plantedAt >= this.growTime) {
      this.state = TILE_STATE.READY;
    }
  }

  /**
   * 获取生长进度 0~1
   * @param {number} now 当前时间戳（秒）
   * @returns {number} 进度
   */
  progress(now) {
    if (this.state === TILE_STATE.READY) return 1;
    if (this.state !== TILE_STATE.GROWING) return 0;
    const elapsed = Math.max(0, now - this.plantedAt);
    return Math.min(1, elapsed / this.growTime);
  }

  /**
   * 收获后清空地块
   */
  clear() {
    this.state = TILE_STATE.EMPTY;
    this.cropId = null;
    this.plantedAt = 0;
    this.growTime = 0;
  }

  /**
   * 序列化为存档数据
   */
  toJSON() {
    return {
      state: this.state,
      cropId: this.cropId,
      plantedAt: this.plantedAt,
      growTime: this.growTime,
    };
  }

  /**
   * 从存档数据恢复
   */
  static fromJSON(data, index) {
    const tile = new FarmTile(index);
    if (!data) return tile;
    tile.state = data.state || TILE_STATE.EMPTY;
    tile.cropId = data.cropId || null;
    tile.plantedAt = data.plantedAt || 0;
    tile.growTime = data.growTime || 0;
    return tile;
  }
}

export default FarmTile;
