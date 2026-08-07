import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.scss';

function runWhenReady(callback: () => void) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

function appendHeadLink(attributes: Record<string, string>) {
  const link = document.createElement('link');
  Object.entries(attributes).forEach(([key, value]) => link.setAttribute(key, value));
  document.head.append(link);
}

runWhenReady(() => {
  if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
    appendHeadLink({ rel: 'preconnect', href: 'https://fonts.googleapis.com' });
    appendHeadLink({ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' });
    appendHeadLink({
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Noto+Serif+SC:wght@300;400;700&display=swap',
    });
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Could not find root element to mount to');
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
