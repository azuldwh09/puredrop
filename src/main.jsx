import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Auto dark/light mode: follow OS preference when user hasn't set a manual override
const mq = window.matchMedia('(prefers-color-scheme: dark)');
mq.addEventListener('change', (e) => {
  const stored = localStorage.getItem('puredrop_dark_mode');
  if (stored !== null) return; // user has a manual preference — don't override
  if (e.matches) {
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
  }
});