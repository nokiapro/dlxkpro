// Compatibility shim for browser extensions/testing harnesses that assign window.fetch
try {
  if (typeof window !== 'undefined') {
    let currentFetch = window.fetch ? window.fetch.bind(window) : window.fetch;
    const desc = {
      get: () => currentFetch,
      set: (fn: any) => {
        currentFetch = fn;
      },
      configurable: true,
      enumerable: true,
    };
    try {
      Object.defineProperty(window, 'fetch', desc);
    } catch {}
    if (typeof Window !== 'undefined' && Window.prototype) {
      try {
        Object.defineProperty(Window.prototype, 'fetch', desc);
      } catch {}
    }
  }
} catch {}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
