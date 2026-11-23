/**
 * Canvas 绘图工具函数
 *
 * 职责：封装常用的绘图原语（圆角矩形、圆形、文字、进度条），
 * 供 RenderSystem 复用，保持渲染代码整洁。
 */

/**
 * 绘制圆角矩形路径
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {number} x 左上角X
 * @param {number} y 左上角Y
 * @param {number} w 宽
 * @param {number} h 高
 * @param {number} r 圆角半径
 */
export function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * 填充圆角矩形
 */
export function fillRoundRect(ctx, x, y, w, h, r, color) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * 描边圆角矩形
 */
export function strokeRoundRect(ctx, x, y, w, h, r, color, lineWidth = 2) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

/**
 * 绘制圆形
 */
export function fillCircle(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * 绘制文字（带对齐与字体）
 */
export function drawText(ctx, text, x, y, options = {}) {
  const {
    size = 14,
    color = '#4A3B2A',
    align = 'center',
    baseline = 'middle',
    weight = 'normal',
    family = 'sans-serif',
  } = options;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
}

/**
 * 绘制进度条
 * @param {number} progress 0~1
 */
export function drawProgressBar(ctx, x, y, w, h, progress, bgColor, fgColor) {
  fillRoundRect(ctx, x, y, w, h, h / 2, bgColor);
  if (progress > 0) {
    fillRoundRect(ctx, x, y, Math.max(h, w * progress), h, h / 2, fgColor);
  }
}

/**
 * 判断点是否在矩形内
 */
export function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}
