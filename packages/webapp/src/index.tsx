import { render } from 'preact';
import { App } from './app.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { initWebApp } from './lib/telegram.js';

initWebApp();
render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
  document.getElementById('app')!,
);

