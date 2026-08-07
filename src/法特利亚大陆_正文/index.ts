import { createApp } from 'vue';
import app from './app.vue';

function runWhenReady(callback: () => void) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

runWhenReady(() => {
  createApp(app).mount('#app');
});
