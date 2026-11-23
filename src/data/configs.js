/**
 * 全局配置表（集中式）
 *
 * 所有数值配置在此维护，策划修改本文件的对象字面量即可生效，无需改动逻辑代码。
 * 采用 ES 模块导出，微信小游戏与浏览器预览环境均原生支持，无需 fetch/fs。
 *
 * 数值来源：《欢乐农场》GDD v0.2 第 5 章数值设计框架（Demo 基线，待调优）。
 */

/** 游戏全局配置（颜色、农场尺寸、经济初值、动画时长） */
export const GAME = {
  name: '欢乐农场',
  version: '0.1.0-demo',
  colors: {
    grass: '#8FD14F',
    grassDark: '#6BA838',
    soil: '#8B5A2B',
    soilWet: '#6E4420',
    sky: '#87CEEB',
    panel: '#FFF8E7',
    panelBorder: '#D9A441',
    gold: '#FFC93C',
    text: '#4A3B2A',
    textLight: '#8C7A65',
    ready: '#5BD06A',
  },
  farm: {
    cols: 3,
    rows: 3,
    tileSize: 92,
    tileGap: 10,
  },
  economy: {
    initialGold: 50,
    initialDiamonds: 10,
    offlineCapHours: 8,
  },
  animation: {
    harvestPopDuration: 350,
    growWobblePeriod: 1200,
  },
};

/**
 * 作物配置
 * growTime 单位：秒（Demo 为快速验证手感，远短于 GDD 正式数值）
 * stageColors: [幼苗, 成长, 成熟] 三阶段颜色
 */
export const CROPS = {
  wheat: {
    id: 'wheat', name: '小麦', unlockLevel: 1,
    seedCost: 0, growTime: 12, yield: 2, sellPrice: 3, exp: 1,
    stageColors: ['#A8D06A', '#C9D94F', '#F5C542'],
  },
  carrot: {
    id: 'carrot', name: '胡萝卜', unlockLevel: 1,
    seedCost: 5, growTime: 25, yield: 2, sellPrice: 8, exp: 2,
    stageColors: ['#A8D06A', '#8FC94A', '#F2862B'],
  },
  corn: {
    id: 'corn', name: '玉米', unlockLevel: 3,
    seedCost: 12, growTime: 50, yield: 2, sellPrice: 15, exp: 3,
    stageColors: ['#A8D06A', '#B7D43A', '#FFD84D'],
  },
};

/**
 * 工坊配方配置
 * inputs: 原料 { 商品ID: 数量 }；processTime 单位秒
 */
export const RECIPES = {
  bread: {
    id: 'bread', name: '面包', unlockLevel: 2,
    inputs: { wheat: 3 }, output: 'bread', outputAmount: 1,
    processTime: 15, sellPrice: 20, exp: 4, color: '#D9A05B',
  },
  carrotcake: {
    id: 'carrotcake', name: '胡萝卜蛋糕', unlockLevel: 4,
    inputs: { carrot: 2, wheat: 1 }, output: 'carrotcake', outputAmount: 1,
    processTime: 30, sellPrice: 45, exp: 7, color: '#E8923A',
  },
};

/** 商品元信息（名称 + 颜色），用于仓库/订单显示 */
export const GOODS = {
  wheat: { name: '小麦', color: '#F5C542' },
  carrot: { name: '胡萝卜', color: '#F2862B' },
  corn: { name: '玉米', color: '#FFD84D' },
  bread: { name: '面包', color: '#D9A05B' },
  carrotcake: { name: '胡萝卜蛋糕', color: '#E8923A' },
};

/**
 * 订单配置
 * require: 需求商品 { 商品ID: 数量 }；奖励金币与经验
 */
export const ORDERS = [
  { id: 'o1', name: '早餐订单', require: { wheat: 4 }, rewardGold: 30, rewardExp: 8, unlockLevel: 1 },
  { id: 'o2', name: '蔬菜篮', require: { carrot: 4 }, rewardGold: 55, rewardExp: 12, unlockLevel: 1 },
  { id: 'o3', name: '面包房补货', require: { bread: 2 }, rewardGold: 70, rewardExp: 15, unlockLevel: 2 },
  { id: 'o4', name: '丰收拼盘', require: { wheat: 3, corn: 2 }, rewardGold: 90, rewardExp: 20, unlockLevel: 3 },
  { id: 'o5', name: '甜点订单', require: { carrotcake: 2 }, rewardGold: 150, rewardExp: 30, unlockLevel: 4 },
];

/** 等级配置（累计经验门槛） */
export const LEVELS = [
  { level: 1, expNeeded: 0, title: '新农夫' },
  { level: 2, expNeeded: 30, title: '见习农场主' },
  { level: 3, expNeeded: 90, title: '熟练农场主' },
  { level: 4, expNeeded: 200, title: '农场达人' },
  { level: 5, expNeeded: 400, title: '田园大师' },
];
