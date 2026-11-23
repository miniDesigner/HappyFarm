/**
 * 游戏主类
 *
 * 职责：游戏循环（requestAnimationFrame）、状态/渲染/输入系统调度、
 * Toast 计时、自动存档、UI 状态管理。
 *
 * 架构与《占地之王》一致：原生 ES6 模块 + Canvas 2D，无第三方引擎依赖。
 */

import GameState from './GameState.js';
import RenderSystem from '../system/RenderSystem.js';
import InputSystem from '../system/InputSystem.js';

class Game {
  /**
   * @param {HTMLCanvasElement|Object} canvas 画布
   * @param {CanvasRenderingContext2D} ctx 2D上下文
   * @param {number} screenWidth 屏幕宽
   * @param {number} screenHeight 屏幕高
   */
  constructor(canvas, ctx, screenWidth, screenHeight) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    this.state = new GameState();
    this.renderer = new RenderSystem(ctx, screenWidth, screenHeight);

    /** UI 可变状态：当前面板、选中地块、Toast、交互热区（渲染时写入） */
    this.ui = {
      panel: null,
      selectedTile: null,
      toast: null,
      _bottomRects: {},
      _plantRects: {},
      _orderRects: {},
      _sellRects: {},
      _recipeRects: {},
      _modalClose: null,
      _welcomeBtn: null,
    };

    this.input = new InputSystem(this.state, this.renderer, this.ui);
    this._lastFrame = 0;
    this._autoSaveTimer = null;
    this._running = false;
  }

  /**
   * 启动游戏
   * @returns {Promise<void>}
   */
  async start() {
    // 初始化状态（读存档/新游戏 + 离线收益结算）
    this.state.init();
    this.state.onChange(() => { /* 状态变更由循环持续渲染，无需额外处理 */ });

    // 绑定输入
    this.input.bind(this.canvas);

    // 监听窗口尺寸变化（浏览器预览）
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
        this.renderer.resize(this.screenWidth, this.screenHeight);
      });
    }

    // 若有离线收益，弹出欢迎面板
    if (this.state.offlineReport) {
      this.ui.panel = 'welcome';
    }

    // 启动渲染循环
    this._running = true;
    this._lastFrame = performance.now();
    this._loop(this._lastFrame);

    // 自动存档（每 15 秒）
    this._autoSaveTimer = setInterval(() => {
      this.state.save();
    }, 15000);

    // 退出前存档
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.state.save());
    }

    // 调试钩子：暴露给自动化测试
    if (typeof window !== 'undefined') {
      window.__hfGame = this;
    }
  }

  /**
   * 游戏主循环
   * @param {number} timestamp 帧时间戳（毫秒）
   */
  _loop(timestamp) {
    if (!this._running) return;
    const dt = (timestamp - this._lastFrame) / 1000;
    this._lastFrame = timestamp;

    // 更新 Toast 计时
    if (this.ui.toast) {
      this.ui.toast.remaining -= dt;
      if (this.ui.toast.remaining <= 0) this.ui.toast = null;
    }

    // 渲染
    this.renderer.render(this.state, this.ui);

    requestAnimationFrame((t) => this._loop(t));
  }

  /** 停止游戏循环（测试用） */
  stop() {
    this._running = false;
    if (this._autoSaveTimer) clearInterval(this._autoSaveTimer);
  }
}

export default Game;
