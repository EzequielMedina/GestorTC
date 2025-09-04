import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { NotificacionService } from './services/notificacion.service';
import { VencimientoService } from './services/vencimiento.service';
import { CalculoVencimientoService } from './services/calculo-vencimiento.service';
import { PushNotificationService } from './services/push-notification.service';
import { ConfiguracionUsuarioService } from './services/configuracion-usuario.service';
import { EmailService } from './services/email.service';
import { ServiceWorkerService } from './services/service-worker.service';

// Registrar los datos de localización en español
registerLocaleData(localeEs);

// Formato de fecha personalizado para mostrar mes/año
export const MY_FORMATS = {
  parse: {
    dateInput: 'MM/YYYY',
  },
  display: {
    dateInput: 'MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideCharts(withDefaultRegisterables()),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    { provide: LOCALE_ID, useValue: 'es' },
    { provide: MAT_DATE_LOCALE, useValue: 'es' },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
    ServiceWorkerService,
    NotificacionService,
    VencimientoService,
    CalculoVencimientoService,
    PushNotificationService,
    ConfiguracionUsuarioService,
    EmailService
  ]
};
