/**
 * 欢乐农场 - 微信小游戏入口
 *
 * 职责（保持精简，游戏逻辑全部在 src/game/Game.js）：
 *  1. 创建 Canvas + 高分屏适配
 *  2. 启动 Game
 *  3. 注册被动分享
 *  4. Android 物理返回键处理
 */

import Game from './src/game/Game.js';

// ============ 1. Canvas + 屏幕信息 ============
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

function _displayInfo() {
  if (typeof wx.getWindowInfo === 'function') {
    try {
      const win = wx.getWindowInfo();
      if (win && win.screenWidth && win.screenHeight) {
        return {
          screenWidth: win.screenWidth,
          screenHeight: win.screenHeight,
          pixelRatio: win.pixelRatio || 1,
          safeArea: win.safeArea || null,
        };
      }
    } catch (e) { /* 降级 */ }
  }
  const info = wx.getSystemInfoSync();
  return {
    screenWidth: info.screenWidth,
    screenHeight: info.screenHeight,
    pixelRatio: info.pixelRatio || 1,
    safeArea: info.safeArea || null,
  };
}

const display = _displayInfo();
canvas.width = display.screenWidth * display.pixelRatio;
canvas.height = display.screenHeight * display.pixelRatio;
ctx.scale(display.pixelRatio, display.pixelRatio);

// ============ 2. 启动游戏 ============
const game = new Game(canvas, ctx, display.screenWidth, display.screenHeight);
game.start();

// ============ 3. 被动分享 ============
if (typeof wx.onShareAppMessage === 'function') {
  wx.onShareAppMessage(() => ({
    title: '欢乐农场 - 来我的农场串门吧！',
  }));
}

// ============ 4. 物理返回键：关闭弹窗 ============
if (typeof wx.onKeyDown === 'function') {
  wx.onKeyDown((e) => {
    if (e.key === 'Backspace' || e.keyCode === 8) {
      if (game.ui.panel) game.ui.panel = null;
    }
  });
}
