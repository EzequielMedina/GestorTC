import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Importar y registrar los componentes necesarios de Chart.js
import { Chart, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

bootstrapApplication(App, appConfig)
  .catch((err: unknown) => console.error(err));
