/**
 * 工坊实体
 *
 * 职责：管理加工槽位——投入原料、按真实时间加工、产出成品。
 * 单槽位 Demo（阶段二），完整版支持多工坊多槽位。
 */

export const SLOT_STATE = {
  IDLE: 'idle',          // 空闲
  PROCESSING: 'processing', // 加工中
  DONE: 'done',          // 成品可取
};

class Workshop {
  constructor() {
    this.state = SLOT_STATE.IDLE;  // 槽位状态
    this.recipeId = null;          // 当前配方ID
    this.startedAt = 0;            // 开始加工时间戳（秒）
    this.processTime = 0;          // 加工时长（秒）
    this.outputGood = null;        // 产出商品ID
    this.outputAmount = 0;         // 产出数量
  }

  /**
   * 开始加工
   */
  start(recipe, now) {
    this.state = SLOT_STATE.PROCESSING;
    this.recipeId = recipe.id;
    this.startedAt = now;
    this.processTime = recipe.processTime;
    this.outputGood = recipe.output;
    this.outputAmount = recipe.outputAmount;
  }

  /**
   * 刷新加工状态（支持离线）
   * @param {number} now 当前时间戳（秒）
   */
  refresh(now) {
    if (this.state !== SLOT_STATE.PROCESSING) return;
    if (now - this.startedAt >= this.processTime) {
      this.state = SLOT_STATE.DONE;
    }
  }

  /**
   * 加工进度 0~1
   */
  progress(now) {
    if (this.state === SLOT_STATE.DONE) return 1;
    if (this.state !== SLOT_STATE.PROCESSING) return 0;
    const elapsed = Math.max(0, now - this.startedAt);
    return Math.min(1, elapsed / this.processTime);
  }

  /**
   * 取出成品并清空槽位
   * @returns {{good:string, amount:number}|null}
   */
  collect() {
    if (this.state !== SLOT_STATE.DONE) return null;
    const result = { good: this.outputGood, amount: this.outputAmount };
    this.reset();
    return result;
  }

  /** 清空槽位 */
  reset() {
    this.state = SLOT_STATE.IDLE;
    this.recipeId = null;
    this.startedAt = 0;
    this.processTime = 0;
    this.outputGood = null;
    this.outputAmount = 0;
  }

  toJSON() {
    return {
      state: this.state, recipeId: this.recipeId,
      startedAt: this.startedAt, processTime: this.processTime,
      outputGood: this.outputGood, outputAmount: this.outputAmount,
    };
  }

  static fromJSON(data) {
    const w = new Workshop();
    if (!data) return w;
    Object.assign(w, {
      state: data.state || SLOT_STATE.IDLE,
      recipeId: data.recipeId || null,
      startedAt: data.startedAt || 0,
      processTime: data.processTime || 0,
      outputGood: data.outputGood || null,
      outputAmount: data.outputAmount || 0,
    });
    return w;
  }
}

export default Workshop;
