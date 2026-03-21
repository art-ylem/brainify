import { render } from 'preact';
import { App } from './app.js';
import { initWebApp } from './lib/telegram.js';

initWebApp();
render(<App />, document.getElementById('app')!);

