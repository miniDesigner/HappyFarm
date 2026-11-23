/**
 * 配置访问层
 *
 * 职责：集中暴露各配置表的读取接口，业务逻辑通过本模块访问配置，
 * 避免直接依赖配置对象，便于未来切换到远程热更新配置。
 * 当前配置源为 configs.js（ES 模块，微信与浏览器均原生支持）。
 */

import { GAME, CROPS, RECIPES, GOODS, ORDERS, LEVELS } from './configs.js';

/** 全局游戏配置 */
export function getGameConfig() { return GAME; }

/** 全部作物配置 */
export function getCrops() { return CROPS; }

/** 指定作物配置 */
export function getCrop(cropId) { return CROPS[cropId] || null; }

/** 全部工坊配方 */
export function getRecipes() { return RECIPES; }

/** 指定配方 */
export function getRecipe(recipeId) { return RECIPES[recipeId] || null; }

/** 商品元信息 */
export function getGoods() { return GOODS; }

/** 指定商品 */
export function getGood(goodId) { return GOODS[goodId] || null; }

/** 全部订单 */
export function getOrders() { return ORDERS; }

/** 等级配置表 */
export function getLevels() { return LEVELS; }

/**
 * 根据累计经验计算当前等级
 * @param {number} totalExp 累计经验
 * @returns {{level:number, title:string, current:number, next:number|null, progress:number}}
 */
export function calcLevel(totalExp) {
  let result = { level: 1, title: LEVELS[0].title, current: LEVELS[0].expNeeded, next: null, progress: 1 };
  for (let i = 0; i < LEVELS.length; i++) {
    const cur = LEVELS[i];
    if (totalExp >= cur.expNeeded) {
      const nextLv = LEVELS[i + 1];
      result = {
        level: cur.level,
        title: cur.title,
        current: cur.expNeeded,
        next: nextLv ? nextLv.expNeeded : null,
        progress: nextLv ? (totalExp - cur.expNeeded) / (nextLv.expNeeded - cur.expNeeded) : 1,
      };
    } else {
      break;
    }
  }
  return result;
}

export default {
  getGameConfig, getCrops, getCrop, getRecipes, getRecipe,
  getGoods, getGood, getOrders, getLevels, calcLevel,
};
