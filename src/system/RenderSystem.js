/**
 * 渲染系统
 *
 * 职责：用 Canvas 2D 绘制整个游戏画面——顶部资源栏、农场场景（3×3地块）、
 * 工坊区、订单面板、底部功能栏，以及播种/商品选择弹窗。
 *
 * 布局基于设计分辨率 400×720，运行时等比缩放居中（适配不同屏幕）。
 * 美术风格：明亮卡通风（晴空乐园主调），全部用 Canvas 绘制，无需美术资源即可预览。
 */

import { TILE_STATE } from '../entity/FarmTile.js';
import { SLOT_STATE } from '../entity/Workshop.js';
import { getGameConfig, getCrop, getCrops, getGood, getRecipes, getLevels } from '../data/ConfigLoader.js';
import {
  fillRoundRect, strokeRoundRect, fillCircle, drawText,
  drawProgressBar, pointInRect,
} from '../utils/draw.js';

// 设计分辨率
const DESIGN_W = 400;
const DESIGN_H = 720;

class RenderSystem {
  /**
   * @param {CanvasRenderingContext2D} ctx 画布上下文
   * @param {number} screenW 屏幕宽
   * @param {number} screenH 屏幕高
   */
  constructor(ctx, screenW, screenH) {
    this.ctx = ctx;
    this.screenW = screenW;
    this.screenH = screenH;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this._computeViewport();
  }

  /** 计算等比缩放与居中偏移 */
  _computeViewport() {
    this.scale = Math.min(this.screenW / DESIGN_W, this.screenH / DESIGN_H);
    this.offsetX = (this.screenW - DESIGN_W * this.scale) / 2;
    this.offsetY = (this.screenH - DESIGN_H * this.scale) / 2;
  }

  /** 更新屏幕尺寸 */
  resize(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this._computeViewport();
  }

  /**
   * 屏幕坐标 → 设计坐标
   */
  screenToDesign(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    };
  }

  /**
   * 主渲染入口
   * @param {GameState} state 游戏状态
   * @param {Object} ui UI 状态（当前面板、选中地块等）
   */
  render(state, ui) {
    const ctx = this.ctx;
    ctx.save();
    // 清屏（全屏背景色）
    ctx.fillStyle = '#5BA8D4';
    ctx.fillRect(0, 0, this.screenW, this.screenH);
    // 平移+缩放到设计坐标系
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    const colors = getGameConfig().colors;
    // 天空渐变背景
    this._drawBackground(ctx, colors);
    // 顶部资源栏
    this._drawTopBar(ctx, state);
    // 农场场景
    this._drawFarm(ctx, state, ui);
    // 工坊区
    this._drawWorkshop(ctx, state, ui);
    // 今日订单速览卡
    this._drawOrderPreview(ctx, state, ui);
    // 底部功能栏
    this._drawBottomBar(ctx, ui);
    // 当前面板（订单/仓库等）
    if (ui.panel === 'orders') this._drawOrdersPanel(ctx, state, ui);
    if (ui.panel === 'inventory') this._drawInventoryPanel(ctx, state, ui);
    // 播种弹窗
    if (ui.panel === 'plant') this._drawPlantPanel(ctx, state, ui);
    // 工坊配方弹窗
    if (ui.panel === 'recipe') this._drawRecipePanel(ctx, state, ui);
    // 提示 Toast
    if (ui.toast) this._drawToast(ctx, ui.toast);
    // 离线欢迎回来
    if (ui.panel === 'welcome') this._drawWelcomePanel(ctx, state, ui);

    ctx.restore();
  }

  /** 绘制渐变天空背景 */
  _drawBackground(ctx, colors) {
    const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_H);
    grad.addColorStop(0, '#8FD8F5');
    grad.addColorStop(0.45, '#C8EFA8');
    grad.addColorStop(1, '#7CC24A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
    // 太阳
    fillCircle(ctx, DESIGN_W - 48, 92, 30, 'rgba(255,240,170,0.9)');
    // 云朵
    this._drawCloud(ctx, 70, 90, 1.0);
    this._drawCloud(ctx, 250, 140, 0.7);
  }

  /** 绘制云朵 */
  _drawCloud(ctx, x, y, s) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    fillCircle(ctx, x, y, 18 * s, '#FFFFFF');
    fillCircle(ctx, x + 20 * s, y - 8 * s, 22 * s, '#FFFFFF');
    fillCircle(ctx, x + 42 * s, y, 16 * s, '#FFFFFF');
    ctx.restore();
  }

  /** 顶部资源栏 */
  _drawTopBar(ctx, state) {
    // 参考占地面积：顶部留 safe 区域，这里用固定坐标
    fillRoundRect(ctx, 8, 10, DESIGN_W - 16, 52, 14, 'rgba(255,255,255,0.92)');
    // 头像 + 等级
    fillCircle(ctx, 40, 36, 20, '#FFD86B');
    drawText(ctx, '农', 40, 36, { size: 20, color: '#8B5A2B', weight: 'bold' });
    const lvInfo = state.getLevelInfo();
    drawText(ctx, `Lv.${lvInfo.level}`, 40, 60, { size: 10, color: '#FFF', weight: 'bold' });
    fillRoundRect(ctx, 26, 52, 28, 12, 6, '#5BA8D4');
    // 昵称
    drawText(ctx, lvInfo.title, 72, 28, { size: 12, color: '#8C7A65', align: 'left' });
    // 经验条
    drawProgressBar(ctx, 72, 38, 90, 8, lvInfo.progress, '#E8E0CF', '#7ED957');
    // 金币
    this._drawCurrency(ctx, DESIGN_W - 92, 36, '🪙', state.player.gold, '#FFC93C');
    // 钻石
    this._drawCurrency(ctx, DESIGN_W - 20, 36, '💎', state.player.diamonds, '#5BD0E8');
  }

  /** 单个货币显示 */
  _drawCurrency(ctx, x, y, icon, value, color) {
    fillRoundRect(ctx, x - 34, y - 14, 68, 28, 14, '#FFF8E7');
    strokeRoundRect(ctx, x - 34, y - 14, 68, 28, 14, color, 2);
    drawText(ctx, icon, x - 20, y, { size: 15 });
    drawText(ctx, String(value), x + 8, y, { size: 15, color: '#4A3B2A', weight: 'bold' });
  }

  /** 绘制农场 3×3 地块 */
  _drawFarm(ctx, state, ui) {
    const cfg = getGameConfig();
    const { cols, rows, tileSize, tileGap } = cfg.farm;
    const totalW = cols * tileSize + (cols - 1) * tileGap;
    const startX = (DESIGN_W - totalW) / 2;
    const startY = 82;
    const now = state.now();

    // 农场底板（草地圆角面板）
    fillRoundRect(ctx, startX - 16, startY - 12, totalW + 32, rows * tileSize + (rows - 1) * tileGap + 28, 20, '#6BA838');
    fillRoundRect(ctx, startX - 10, startY - 6, totalW + 20, rows * tileSize + (rows - 1) * tileGap + 16, 16, '#79BB46');

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const tile = state.tiles[idx];
        if (!tile) continue;
        const x = startX + c * (tileSize + tileGap);
        const y = startY + r * (tileSize + tileGap);
        this._drawTile(ctx, tile, x, y, tileSize, now, ui);
      }
    }
  }

  /** 绘制单块地 */
  _drawTile(ctx, tile, x, y, size, now, ui) {
    const colors = getGameConfig().colors;
    // 土壤底
    fillRoundRect(ctx, x, y, size, size, 10, colors.soil);
    // 耕地纹理
    ctx.strokeStyle = colors.soilWet;
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 8, y + (size / 4) * i);
      ctx.lineTo(x + size - 8, y + (size / 4) * i);
      ctx.stroke();
    }

    if (tile.state === TILE_STATE.EMPTY) {
      // 空地：显示"+"号
      fillCircle(ctx, x + size / 2, y + size / 2, 18, 'rgba(255,255,255,0.35)');
      drawText(ctx, '+', x + size / 2, y + size / 2, { size: 26, color: '#FFF', weight: 'bold' });
    } else {
      const crop = getCrop(tile.cropId);
      const progress = tile.progress(now);
      this._drawCrop(ctx, crop, x + size / 2, y + size, size, progress, tile.state);
      // 生长进度条（生长中）
      if (tile.state === TILE_STATE.GROWING) {
        drawProgressBar(ctx, x + 8, y + size - 12, size - 16, 7, progress, 'rgba(0,0,0,0.25)', '#7ED957');
      }
      // 成熟光效 + 对角标
      if (tile.state === TILE_STATE.READY) {
        strokeRoundRect(ctx, x + 2, y + 2, size - 4, size - 4, 9, '#FFE066', 3);
        fillCircle(ctx, x + size - 14, y + 14, 12, '#5BD06A');
        drawText(ctx, '✓', x + size - 14, y + 14, { size: 14, color: '#FFF', weight: 'bold' });
      }
    }
  }

  /** 绘制作物（按生长阶段） */
  _drawCrop(ctx, crop, baseX, baseY, size, progress, state) {
    if (!crop) return;
    let stage = 0;
    if (progress >= 1 || state === TILE_STATE.READY) stage = 2;
    else if (progress >= 0.5) stage = 1;
    const color = crop.stageColors[stage];
    const h = (size * 0.5) * (0.35 + 0.65 * progress); // 高度随生长增长

    // 茎
    ctx.strokeStyle = '#4E9E3A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY - 8);
    ctx.lineTo(baseX, baseY - 8 - h);
    ctx.stroke();
    // 叶子
    fillCircle(ctx, baseX - 10, baseY - 8 - h * 0.55, 8, '#5CB346');
    fillCircle(ctx, baseX + 10, baseY - 8 - h * 0.6, 8, '#5CB346');
    // 果实/主体
    const r = stage === 2 ? 14 : (stage === 1 ? 10 : 6);
    fillCircle(ctx, baseX, baseY - 8 - h, r, color);
    // 成熟高光
    if (stage === 2) {
      fillCircle(ctx, baseX - 4, baseY - 12 - h, 4, 'rgba(255,255,255,0.5)');
    }
  }

  /** 绘制工坊区 */
  _drawWorkshop(ctx, state, ui) {
    const now = state.now();
    const y = 350;
    const colors = getGameConfig().colors;
    fillRoundRect(ctx, 16, y, DESIGN_W - 32, 96, 16, 'rgba(255,248,231,0.95)');
    strokeRoundRect(ctx, 16, y, DESIGN_W - 32, 96, 16, colors.panelBorder, 2);
    drawText(ctx, '🏭 加工工坊', 32, y + 20, { size: 15, color: colors.text, align: 'left', weight: 'bold' });

    const ws = state.workshop;
    const cx = DESIGN_W / 2;
    const boxX = 32, boxY = y + 32, boxW = DESIGN_W - 64, boxH = 52;
    fillRoundRect(ctx, boxX, boxY, boxW, boxH, 12, '#F0E4C8');

    if (ws.state === SLOT_STATE.IDLE) {
      drawText(ctx, '空闲 · 点击选择配方开始加工', cx, boxY + boxH / 2, { size: 13, color: '#8C7A65' });
    } else {
      const recipe = getRecipes()[ws.recipeId];
      const progress = ws.progress(now);
      const label = ws.state === SLOT_STATE.DONE ? `✅ ${recipe.name} 已完成 · 点击取出` : `🔨 制作${recipe.name}中...`;
      drawText(ctx, label, cx, boxY + 18, { size: 13, color: '#4A3B2A', weight: 'bold' });
      drawProgressBar(ctx, boxX + 16, boxY + 34, boxW - 32, 12, progress, '#D9C9A8', ws.state === SLOT_STATE.DONE ? '#5BD06A' : '#F0A93B');
    }
  }

  /** 今日订单速览卡（填充中部空间，展示最易完成的一个订单） */
  _drawOrderPreview(ctx, state, ui) {
    const y = 462;
    const colors = getGameConfig().colors;
    const orders = state.getOrderViews();
    const best = orders.find(o => o.canComplete) || orders[0];

    fillRoundRect(ctx, 16, y, DESIGN_W - 32, 170, 18, 'rgba(255,248,231,0.95)');
    strokeRoundRect(ctx, 16, y, DESIGN_W - 32, 170, 18, colors.panelBorder, 2);
    drawText(ctx, '📋 今日订单', 32, y + 24, { size: 16, color: colors.text, align: 'left', weight: 'bold' });
    drawText(ctx, '点击查看全部 →', DESIGN_W - 32, y + 24, { size: 11, color: colors.textLight, align: 'right' });

    if (!best) {
      drawText(ctx, '暂无订单', DESIGN_W / 2, y + 90, { size: 14, color: colors.textLight });
      return;
    }
    // 订单名 + 奖励
    fillRoundRect(ctx, 30, y + 40, DESIGN_W - 60, 112, 14, '#F8EFD8');
    drawText(ctx, best.name, 44, y + 60, { size: 15, color: colors.text, align: 'left', weight: 'bold' });
    drawText(ctx, `奖励 ${best.rewardGold}金币 / ${best.rewardExp}经验`, DESIGN_W - 44, y + 60, { size: 12, color: '#B8860B', align: 'right' });

    // 需求商品行
    const reqs = Object.entries(best.require);
    reqs.forEach(([good, need], i) => {
      const ry = y + 86 + i * 26;
      const have = state.player.getGood(good);
      const enough = have >= need;
      const info = getGood(good);
      drawText(ctx, `${info?.name || good}  ${have}/${need}`, 48, ry, {
        size: 13, color: enough ? '#3A9E4A' : colors.text, align: 'left',
      });
      drawProgressBar(ctx, DESIGN_W - 160, ry - 5, 100, 10, Math.min(1, have / need), '#E8DCC0', enough ? '#5BD06A' : '#F0A93B');
    });

    // 整卡可点，打开订单面板
    ui._orderPreviewRect = { x: 16, y, w: DESIGN_W - 32, h: 170 };
  }

  /** 底部功能栏 */
  _drawBottomBar(ctx, ui) {
    const y = DESIGN_H - 70;
    fillRoundRect(ctx, 8, y, DESIGN_W - 16, 60, 16, 'rgba(255,255,255,0.95)');
    const buttons = [
      { id: 'inventory', icon: '📦', label: '仓库' },
      { id: 'orders', icon: '📋', label: '订单' },
      { id: 'recipe', icon: '🔨', label: '加工' },
    ];
    const btnW = (DESIGN_W - 40) / buttons.length;
    buttons.forEach((b, i) => {
      const bx = 20 + i * (btnW + 0);
      const active = ui.panel === b.id;
      if (active) fillRoundRect(ctx, bx + 4, y + 6, btnW - 8, 48, 12, '#FFE9A8');
      drawText(ctx, b.icon, bx + btnW / 2, y + 22, { size: 22 });
      drawText(ctx, b.label, bx + btnW / 2, y + 46, { size: 12, color: active ? '#B8860B' : '#8C7A65', weight: active ? 'bold' : 'normal' });
      b._rect = { x: bx + 4, y: y + 6, w: btnW - 8, h: 48 };
      ui._bottomRects = ui._bottomRects || {};
      ui._bottomRects[b.id] = b._rect;
    });
  }

  // ===== 弹窗面板 =====

  /** 通用弹窗背景 */
  _drawModalBg(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
  }

  /** 播种选择面板 */
  _drawPlantPanel(ctx, state, ui) {
    this._drawModalBg(ctx);
    const pw = DESIGN_W - 48, ph = 300, px = 24, py = (DESIGN_H - ph) / 2;
    fillRoundRect(ctx, px, py, pw, ph, 20, '#FFF8E7');
    strokeRoundRect(ctx, px, py, pw, ph, 20, '#D9A441', 3);
    drawText(ctx, '选择要种的作物', DESIGN_W / 2, py + 30, { size: 18, color: '#4A3B2A', weight: 'bold' });
    const lv = state.getLevelInfo().level;
    const crops = Object.values(getCrops());
    ui._plantRects = {};
    crops.forEach((crop, i) => {
      const cx = px + 20, cy = py + 55 + i * 62, cw = pw - 40, ch = 54;
      const locked = lv < crop.unlockLevel;
      fillRoundRect(ctx, cx, cy, cw, ch, 12, locked ? '#E8E2D5' : '#F5E6C0');
      drawText(ctx, crop.stageColors[2] === '#F5C542' ? '🌾' : (crop.id === 'carrot' ? '🥕' : '🌽'), cx + 30, cy + 27, { size: 26 });
      drawText(ctx, crop.name, cx + 62, cy + 20, { size: 15, color: '#4A3B2A', align: 'left', weight: 'bold' });
      const sub = locked ? `🔒 ${crop.unlockLevel}级解锁` : `种子${crop.seedCost}金 · ${crop.growTime}秒 · 售${crop.sellPrice}`;
      drawText(ctx, sub, cx + 62, cy + 40, { size: 11, color: '#8C7A65', align: 'left' });
      if (!locked) ui._plantRects[crop.id] = { x: cx, y: cy, w: cw, h: ch };
    });
    // 关闭按钮
    drawText(ctx, '✕ 关闭', DESIGN_W / 2, py + ph - 20, { size: 13, color: '#8C7A65' });
    ui._modalClose = { x: DESIGN_W / 2 - 50, y: py + ph - 34, w: 100, h: 30 };
  }

  /** 订单面板 */
  _drawOrdersPanel(ctx, state, ui) {
    this._drawModalBg(ctx);
    const pw = DESIGN_W - 32, ph = 420, px = 16, py = (DESIGN_H - ph) / 2;
    fillRoundRect(ctx, px, py, pw, ph, 20, '#FFF8E7');
    strokeRoundRect(ctx, px, py, pw, ph, 20, '#D9A441', 3);
    drawText(ctx, '📋 农场订单', DESIGN_W / 2, py + 28, { size: 18, color: '#4A3B2A', weight: 'bold' });
    const orders = state.getOrderViews();
    ui._orderRects = {};
    orders.forEach((o, i) => {
      const cx = px + 14, cy = py + 48 + i * 100, cw = pw - 28, ch = 90;
      fillRoundRect(ctx, cx, cy, cw, ch, 12, '#F8EFD8');
      drawText(ctx, o.name, cx + 14, cy + 18, { size: 14, color: '#4A3B2A', align: 'left', weight: 'bold' });
      // 需求
      const reqStr = Object.entries(o.require).map(([g, n]) => `${getGood(g)?.name || g}×${n}`).join('  ');
      drawText(ctx, `需求: ${reqStr}`, cx + 14, cy + 40, { size: 12, color: '#8C7A65', align: 'left' });
      drawText(ctx, `奖励: ${o.rewardGold}金币 + ${o.rewardExp}经验`, cx + 14, cy + 58, { size: 12, color: '#B8860B', align: 'left' });
      // 交付按钮
      const btnX = cx + cw - 90, btnY = cy + 20, btnW = 76, btnH = 50;
      fillRoundRect(ctx, btnX, btnY, btnW, btnH, 10, o.canComplete ? '#5BD06A' : '#D9C9A8');
      drawText(ctx, o.canComplete ? '交付' : '缺货', btnX + btnW / 2, btnY + btnH / 2, { size: 14, color: '#FFF', weight: 'bold' });
      if (o.canComplete) ui._orderRects[o.id] = { x: btnX, y: btnY, w: btnW, h: btnH };
    });
    drawText(ctx, '✕ 关闭', DESIGN_W / 2, py + ph - 18, { size: 13, color: '#8C7A65' });
    ui._modalClose = { x: DESIGN_W / 2 - 50, y: py + ph - 32, w: 100, h: 30 };
  }

  /** 仓库面板 */
  _drawInventoryPanel(ctx, state, ui) {
    this._drawModalBg(ctx);
    const pw = DESIGN_W - 32, ph = 400, px = 16, py = (DESIGN_H - ph) / 2;
    fillRoundRect(ctx, px, py, pw, ph, 20, '#FFF8E7');
    strokeRoundRect(ctx, px, py, pw, ph, 20, '#D9A441', 3);
    drawText(ctx, '📦 我的仓库', DESIGN_W / 2, py + 28, { size: 18, color: '#4A3B2A', weight: 'bold' });
    drawText(ctx, `金币 ${state.player.gold}`, px + 20, py + 52, { size: 12, color: '#B8860B', align: 'left' });
    const entries = Object.entries(state.player.inventory).filter(([, n]) => n > 0);
    ui._sellRects = {};
    if (entries.length === 0) {
      drawText(ctx, '仓库空空的，快去收获吧！', DESIGN_W / 2, py + 160, { size: 14, color: '#8C7A65' });
    } else {
      entries.forEach(([good, qty], i) => {
        const cx = px + 16, cy = py + 66 + i * 52, cw = pw - 32, ch = 46;
        fillRoundRect(ctx, cx, cy, cw, ch, 10, '#F8EFD8');
        drawText(ctx, getGood(good)?.name || good, cx + 14, cy + 23, { size: 14, color: '#4A3B2A', align: 'left', weight: 'bold' });
        drawText(ctx, `×${qty}`, cx + 120, cy + 23, { size: 14, color: '#8C7A65', align: 'left' });
        const btnX = cx + cw - 76, btnY = cy + 8, btnW = 64, btnH = 30;
        fillRoundRect(ctx, btnX, btnY, btnW, btnH, 8, '#F0A93B');
        drawText(ctx, '出售', btnX + btnW / 2, btnY + btnH / 2, { size: 12, color: '#FFF', weight: 'bold' });
        ui._sellRects[good] = { x: btnX, y: btnY, w: btnW, h: btnH };
      });
    }
    drawText(ctx, '✕ 关闭', DESIGN_W / 2, py + ph - 18, { size: 13, color: '#8C7A65' });
    ui._modalClose = { x: DESIGN_W / 2 - 50, y: py + ph - 32, w: 100, h: 30 };
  }

  /** 配方选择面板 */
  _drawRecipePanel(ctx, state, ui) {
    this._drawModalBg(ctx);
    const pw = DESIGN_W - 32, ph = 340, px = 16, py = (DESIGN_H - ph) / 2;
    fillRoundRect(ctx, px, py, pw, ph, 20, '#FFF8E7');
    strokeRoundRect(ctx, px, py, pw, ph, 20, '#D9A441', 3);
    drawText(ctx, '🔨 选择加工配方', DESIGN_W / 2, py + 28, { size: 18, color: '#4A3B2A', weight: 'bold' });
    const recipes = Object.values(getRecipes());
    const lv = state.getLevelInfo().level;
    ui._recipeRects = {};
    recipes.forEach((r, i) => {
      const cx = px + 16, cy = py + 48 + i * 92, cw = pw - 32, ch = 82;
      const locked = lv < r.unlockLevel;
      fillRoundRect(ctx, cx, cy, cw, ch, 12, locked ? '#E8E2D5' : '#F5E6C0');
      drawText(ctx, r.name, cx + 14, cy + 18, { size: 15, color: '#4A3B2A', align: 'left', weight: 'bold' });
      const inputStr = Object.entries(r.inputs).map(([g, n]) => `${getGood(g)?.name || g}×${n}`).join(' + ');
      drawText(ctx, locked ? `🔒 ${r.unlockLevel}级解锁` : `${inputStr} → 售${r.sellPrice}`, cx + 14, cy + 40, { size: 11, color: '#8C7A65', align: 'left' });
      const btnX = cx + cw - 84, btnY = cy + 24, btnW = 70, btnH = 36;
      fillRoundRect(ctx, btnX, btnY, btnW, btnH, 9, locked ? '#C9BEAA' : '#5BA8D4');
      drawText(ctx, locked ? '锁定' : '制作', btnX + btnW / 2, btnY + btnH / 2, { size: 13, color: '#FFF', weight: 'bold' });
      if (!locked) ui._recipeRects[r.id] = { x: btnX, y: btnY, w: btnW, h: btnH };
    });
    drawText(ctx, '✕ 关闭', DESIGN_W / 2, py + ph - 18, { size: 13, color: '#8C7A65' });
    ui._modalClose = { x: DESIGN_W / 2 - 50, y: py + ph - 32, w: 100, h: 30 };
  }

  /** 离线欢迎回来面板 */
  _drawWelcomePanel(ctx, state, ui) {
    this._drawModalBg(ctx);
    const pw = DESIGN_W - 56, ph = 220, px = 28, py = (DESIGN_H - ph) / 2;
    fillRoundRect(ctx, px, py, pw, ph, 20, '#FFF8E7');
    strokeRoundRect(ctx, px, py, pw, ph, 20, '#D9A441', 3);
    drawText(ctx, '🌤 欢迎回来！', DESIGN_W / 2, py + 40, { size: 20, color: '#4A3B2A', weight: 'bold' });
    const r = state.offlineReport;
    if (r) {
      drawText(ctx, '离线期间农场也在成长：', DESIGN_W / 2, py + 80, { size: 13, color: '#8C7A65' });
      if (r.readyCrops > 0) drawText(ctx, `🌾 ${r.readyCrops} 块作物成熟了`, DESIGN_W / 2, py + 110, { size: 15, color: '#5BA838' });
      if (r.readyWorkshop) drawText(ctx, '🔨 工坊成品已做好', DESIGN_W / 2, py + 135, { size: 15, color: '#5BA838' });
      if (r.capped) drawText(ctx, '（离线收益已按8小时上限结算）', DESIGN_W / 2, py + 160, { size: 11, color: '#8C7A65' });
    } else {
      drawText(ctx, '农场一切安好，快来看看吧！', DESIGN_W / 2, py + 110, { size: 14, color: '#8C7A65' });
    }
    fillRoundRect(ctx, DESIGN_W / 2 - 60, py + ph - 52, 120, 40, 12, '#5BD06A');
    drawText(ctx, '继续经营', DESIGN_W / 2, py + ph - 32, { size: 15, color: '#FFF', weight: 'bold' });
    ui._welcomeBtn = { x: DESIGN_W / 2 - 60, y: py + ph - 52, w: 120, h: 40 };
  }

  /** Toast 提示 */
  _drawToast(ctx, toast) {
    const alpha = Math.min(1, toast.remaining / 0.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    const w = 240, h = 44, x = (DESIGN_W - w) / 2, y = DESIGN_H - 150;
    fillRoundRect(ctx, x, y, w, h, 22, 'rgba(40,30,20,0.88)');
    drawText(ctx, toast.text, DESIGN_W / 2, y + h / 2, { size: 14, color: '#FFF', weight: 'bold' });
    ctx.restore();
  }
}

export default RenderSystem;
