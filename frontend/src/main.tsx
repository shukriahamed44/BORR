/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Frontend Client Bootstrap Entry Point (`main.tsx`).
 * Mounts the top-level React application component (`App`) into the DOM root element (`#root`) wrapped in StrictMode.
 *
 * IN SIMPLE WORDS:
 * The starting file that loads our React application into the browser webpage.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
