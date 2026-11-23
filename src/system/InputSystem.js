/**
 * 输入系统
 *
 * 职责：处理触摸/点击事件，将屏幕坐标交给 RenderSystem 转换为设计坐标，
 * 根据当前 UI 面板分发到对应的交互处理，调用 GameState 的玩法方法。
 */

import RenderSystem from './RenderSystem.js';
import { pointInRect } from '../utils/draw.js';
import { TILE_STATE } from '../entity/FarmTile.js';
import { SLOT_STATE } from '../entity/Workshop.js';
import { getGameConfig, getCrop, getRecipe } from '../data/ConfigLoader.js';

class InputSystem {
  /**
   * @param {GameState} state 游戏状态
   * @param {RenderSystem} renderer 渲染系统
   * @param {Object} ui UI 状态（可变对象）
   */
  constructor(state, renderer, ui) {
    this.state = state;
    this.renderer = renderer;
    this.ui = ui;
  }

  /**
   * 处理点击（设计坐标）
   * @param {number} dx 设计坐标X
   * @param {number} dy 设计坐标Y
   */
  handleTap(dx, dy) {
    const ui = this.ui;
    const state = this.state;

    // 有 Toast 时点击不穿透
    // 1) 弹窗面板优先处理
    if (ui.panel === 'welcome') {
      if (ui._welcomeBtn && pointInRect(dx, dy, ui._welcomeBtn.x, ui._welcomeBtn.y, ui._welcomeBtn.w, ui._welcomeBtn.h)) {
        ui.panel = null;
        state.offlineReport = null;
      }
      return;
    }
    if (ui.panel === 'plant') {
      // 关闭按钮
      if (ui._modalClose && pointInRect(dx, dy, ui._modalClose.x, ui._modalClose.y, ui._modalClose.w, ui._modalClose.h)) {
        ui.panel = null; ui.selectedTile = null; return;
      }
      // 作物选择
      for (const [cropId, rect] of Object.entries(ui._plantRects || {})) {
        if (pointInRect(dx, dy, rect.x, rect.y, rect.w, rect.h)) {
          const result = state.plant(ui.selectedTile, cropId);
          ui.toast = { text: result.msg, remaining: 1.6 };
          if (result.ok) ui.panel = null;
          return;
        }
      }
      return; // 弹窗内点击不穿透
    }
    if (ui.panel === 'orders') {
      if (ui._modalClose && pointInRect(dx, dy, ui._modalClose.x, ui._modalClose.y, ui._modalClose.w, ui._modalClose.h)) {
        ui.panel = null; return;
      }
      for (const [orderId, rect] of Object.entries(ui._orderRects || {})) {
        if (pointInRect(dx, dy, rect.x, rect.y, rect.w, rect.h)) {
          const result = state.completeOrder(orderId);
          ui.toast = { text: result.msg, remaining: 2.0 };
          return;
        }
      }
      return;
    }
    if (ui.panel === 'inventory') {
      if (ui._modalClose && pointInRect(dx, dy, ui._modalClose.x, ui._modalClose.y, ui._modalClose.w, ui._modalClose.h)) {
        ui.panel = null; return;
      }
      for (const [goodId, rect] of Object.entries(ui._sellRects || {})) {
        if (pointInRect(dx, dy, rect.x, rect.y, rect.w, rect.h)) {
          const result = state.sell(goodId);
          ui.toast = { text: result.msg, remaining: 1.6 };
          return;
        }
      }
      return;
    }
    if (ui.panel === 'recipe') {
      if (ui._modalClose && pointInRect(dx, dy, ui._modalClose.x, ui._modalClose.y, ui._modalClose.w, ui._modalClose.h)) {
        ui.panel = null; return;
      }
      for (const [recipeId, rect] of Object.entries(ui._recipeRects || {})) {
        if (pointInRect(dx, dy, rect.x, rect.y, rect.w, rect.h)) {
          const result = state.startProcess(recipeId);
          ui.toast = { text: result.msg, remaining: 1.6 };
          if (result.ok) ui.panel = null;
          return;
        }
      }
      return;
    }

    // 2) 底部功能栏
    for (const [btnId, rect] of Object.entries(ui._bottomRects || {})) {
      if (pointInRect(dx, dy, rect.x, rect.y, rect.w, rect.h)) {
        // 点击当前已激活面板则关闭，否则打开
        ui.panel = (ui.panel === btnId) ? null : btnId;
        return;
      }
    }

    // 3) 工坊区（成品可取出 / 空闲打开配方）
    const ws = state.workshop;
    if (dy >= 350 && dy <= 446) {
      if (ws.state === SLOT_STATE.DONE) {
        const result = state.collectProcess();
        ui.toast = { text: result.msg, remaining: 1.6 };
      } else if (ws.state === SLOT_STATE.IDLE) {
        ui.panel = 'recipe';
      } else {
        ui.toast = { text: '工坊正在加工中', remaining: 1.2 };
      }
      return;
    }

    // 3.5) 订单速览卡：点击打开订单面板
    if (ui._orderPreviewRect && pointInRect(dx, dy, ui._orderPreviewRect.x, ui._orderPreviewRect.y, ui._orderPreviewRect.w, ui._orderPreviewRect.h)) {
      ui.panel = 'orders';
      return;
    }

    // 4) 农场地块
    const cfg = getGameConfig();
    const { cols, rows, tileSize, tileGap } = cfg.farm;
    const totalW = cols * tileSize + (cols - 1) * tileGap;
    const startX = (400 - totalW) / 2;   // 与设计分辨率保持一致
    const startY = 82;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (tileSize + tileGap);
        const y = startY + r * (tileSize + tileGap);
        if (pointInRect(dx, dy, x, y, tileSize, tileSize)) {
          const idx = r * cols + c;
          const tile = state.tiles[idx];
          if (!tile) return;
          if (tile.state === TILE_STATE.EMPTY) {
            ui.selectedTile = idx;
            ui.panel = 'plant';
          } else if (tile.state === TILE_STATE.READY) {
            const result = state.harvest(idx);
            ui.toast = { text: result.msg, remaining: result.crit ? 2.2 : 1.4 };
          } else {
            const crop = getCrop(tile.cropId);
            const pct = Math.floor(tile.progress(state.now()) * 100);
            ui.toast = { text: `${crop?.name || '作物'}生长中 ${pct}%`, remaining: 1.2 };
          }
          return;
        }
      }
    }
  }

  /**
   * 绑定 Canvas 事件（触摸 + 鼠标，鼠标便于浏览器预览调试）
   * @param {HTMLCanvasElement|Object} canvas 画布
   */
  bind(canvas) {
    const toDesign = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
      return this.renderer.screenToDesign(clientX - rect.left, clientY - rect.top);
    };

    // 鼠标点击（浏览器预览）
    if (typeof window !== 'undefined') {
      canvas.addEventListener('mousedown', (e) => {
        const p = toDesign(e.clientX, e.clientY);
        this.handleTap(p.x, p.y);
      });
    }

    // 微信触摸事件
    canvas.addEventListener('touchend', (e) => {
      const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
      if (!touch) return;
      const p = toDesign(touch.clientX, touch.clientY);
      this.handleTap(p.x, p.y);
    });
  }
}

export default InputSystem;
