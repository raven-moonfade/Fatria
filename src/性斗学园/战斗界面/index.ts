import { createApp } from 'vue';
import './index.scss';
import App from './app.vue';

function runWhenReady(callback: () => void) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

runWhenReady(() => {
  // 创建并挂载Vue应用
  const app = createApp(App);
  app.mount('#app');

  console.info('[性斗学园] 战斗界面已加载');
});

// 卸载时清理
window.addEventListener('pagehide', () => {
  console.info('[性斗学园] 战斗界面已卸载');
});
