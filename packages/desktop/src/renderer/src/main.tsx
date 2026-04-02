import React from 'react';
import ReactDOM from 'react-dom/client';
import { configureTextBuilder, preloadFont } from 'troika-three-text';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import labelFontUrl from './assets/fonts/NotoSans-Variable.ttf?url';
import './tailwind.css';

// CSP in the desktop shell blocks blob workers; force Troika text to run on the main thread.
configureTextBuilder({
  useWorker: false,
  defaultFontURL: labelFontUrl,
  sdfGlyphSize: 96
});

// Warm the text atlas before first workspace selection to avoid first-hit flicker.
preloadFont(
  {
    font: labelFontUrl,
    characters: '0123456789./"\'- xzyLWT()'
  },
  () => {}
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
