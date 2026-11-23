/**
 * WeChat API 适配层 - 让微信小游戏代码在浏览器中运行
 * 欢乐农场 Demo 预览用
 */

const wx = {
  _canvas: null,

  createCanvas() {
    if (!this._canvas) {
      this._canvas = document.getElementById('gameCanvas');
    }
    return this._canvas;
  },

  createImage() {
    return new Image();
  },

  getSystemInfoSync() {
    return {
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      platform: 'browser',
    };
  },

  getWindowInfo() {
    return {
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      safeArea: {
        top: 0, left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  },

  setStorageSync(key, data) {
    localStorage.setItem(key, data);
  },

  getStorageSync(key) {
    return localStorage.getItem(key) || '';
  },

  removeStorageSync(key) {
    localStorage.removeItem(key);
  },

  vibrateShort() {},
  vibrateLong() {},

  showToast({ title }) {
    console.log('[Toast]', title);
  },

  onShareAppMessage(callback) {
    this._shareCallback = callback;
  },

  onKeyDown() {},
};

window.wx = wx;
window.__hfBrowser = true;
wx.__hfBrowser = true;
