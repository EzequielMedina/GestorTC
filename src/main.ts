import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Importar y registrar los componentes necesarios de Chart.js
import { Chart, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

// Función para registrar Service Worker y esperar a que esté listo
async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado exitosamente:', registration);
      
      // Esperar a que el Service Worker esté activo
      if (registration.installing) {
        await new Promise<void>((resolve) => {
          registration.installing!.addEventListener('statechange', function() {
            if (this.state === 'activated') {
              resolve();
            }
          });
        });
      } else if (registration.waiting) {
        // Si hay un SW esperando, activarlo
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            resolve();
          }, { once: true });
        });
      }
      
      console.log('Service Worker completamente listo');
      return registration;
    } catch (error) {
      console.error('Error registrando Service Worker:', error);
      return null;
    }
  }
  return null;
}

// Inicializar aplicación después de que el Service Worker esté listo
async function inicializarAplicacion() {
  try {
    // Registrar Service Worker primero
    await registrarServiceWorker();
    
    // Luego inicializar Angular
    await bootstrapApplication(App, appConfig);
    console.log('Aplicación Angular inicializada correctamente');
  } catch (err) {
    console.error('Error inicializando aplicación:', err);
  }
}

// Iniciar la aplicación
inicializarAplicacion();
