// Ensure window.fetch is writable and has setter across iframe and extensions
try {
  let _currentFetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    get: () => _currentFetch,
    set: (newFetch) => { _currentFetch = newFetch; }
  });
} catch (_) {}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
