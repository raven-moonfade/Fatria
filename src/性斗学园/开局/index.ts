import { createApp } from 'vue';
import app from './app.vue';
import './index.scss';

function mountApp() {
  createApp(app).mount('#app');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp, { once: true });
} else {
  mountApp();
}
