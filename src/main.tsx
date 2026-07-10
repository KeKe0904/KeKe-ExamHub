/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// === 禁用移动端缩放手势 ===
// iOS 10+ 会忽略 viewport 中的 user-scalable=no，需要 JS 拦截
// 防止双指缩放、双击放大等误操作
if (typeof window !== 'undefined') {
  // 阻止 iOS gesturestart 事件（双指缩放）
  const preventGesture = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', preventGesture, { passive: false });
  document.addEventListener('gesturechange', preventGesture, { passive: false });
  document.addEventListener('gestureend', preventGesture, { passive: false });

  // 阻止双击放大（iOS Safari 特有）
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e: TouchEvent) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // 阻止双指触摸（ pinch 缩放手势）
  document.addEventListener('touchmove', (e: TouchEvent) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

