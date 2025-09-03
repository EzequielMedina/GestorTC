import { Routes } from '@angular/router';
import { TarjetasComponent } from './pages/tarjetas/tarjetas.component';
import { GastosComponent } from './pages/gastos/gastos';
import { ReportesWhatsappComponent } from './pages/reportes-whatsapp/reportes-whatsapp.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tarjetas',
    pathMatch: 'full'
  },
  {
    path: 'tarjetas',
    loadComponent: () => import('./pages/tarjetas/tarjetas.component').then(m => m.TarjetasComponent),
    title: 'Tarjetas - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'gastos',
    loadComponent: () => import('./pages/gastos/gastos').then(m => m.GastosComponent),
    title: 'Gastos - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'resumen',
    loadComponent: () => import('./pages/resumen/resumen').then(m => m.ResumenComponent),
    title: 'Resumen - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'compra-dolares',
    loadComponent: () => import('./pages/compra-dolares/compra-dolares.component').then(m => m.CompraDolaresComponent),
    title: 'Compra Dólares - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'importar-exportar',
    loadComponent: () => import('./pages/importar-exportar/importar-exportar').then(m => m.ImportarExportarComponent),
    title: 'Importar/Exportar - Gestor de Tarjetas de Crédito'
  },
  // {
  //   path: 'analisis',
  //   loadComponent: () => import('./pages/analisis/analisis.component').then(m => m.AnalisisComponent),
  //   title: 'Análisis - Gestor de Tarjetas de Crédito'
  // },
  {
    path: 'graficos',
    loadComponent: () => import('./pages/graficos/graficos.component').then(m => m.GraficosComponent),
    title: 'Gráficos - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'simulacion-compra',
    loadComponent: () => import('./pages/simulacion-compra/simulacion-compra.component').then(m => m.SimulacionCompraComponent),
    title: 'Simulador de Compra - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'reportes-whatsapp',
    loadComponent: () => import('./pages/reportes-whatsapp/reportes-whatsapp.component').then(m => m.ReportesWhatsappComponent),
    title: 'Reportes WhatsApp - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'notificaciones',
    loadComponent: () => import('./components/notificaciones-config/notificaciones-config.component').then(m => m.NotificacionesConfigComponent),
    title: 'Configuración de Notificaciones - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'preferencias',
    loadComponent: () => import('./components/preferencias-usuario/preferencias-usuario.component').then(m => m.PreferenciasUsuarioComponent),
    title: 'Preferencias de Usuario - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'test-notificaciones',
    loadComponent: () => import('./components/test-notificaciones/test-notificaciones.component').then(m => m.TestNotificacionesComponent),
    title: 'Testing de Notificaciones - Gestor de Tarjetas de Crédito'
  },
  {
    path: '**',
    redirectTo: 'tarjetas'
  }
];
