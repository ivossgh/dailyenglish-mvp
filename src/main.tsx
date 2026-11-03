import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
// Self-hosted variable fonts (no requests to Google at runtime).
import '@fontsource-variable/dm-sans/wght.css';
import '@fontsource-variable/nunito/wght.css';
import '@fontsource-variable/source-serif-4/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);