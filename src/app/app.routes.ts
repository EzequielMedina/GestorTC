import { Routes } from '@angular/router';

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
    path: 'gestion-dolares',
    loadComponent: () => import('./pages/gestion-dolares/gestion-dolares.component').then(m => m.GestionDolaresComponent),
    title: 'Gestión Dólares - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'compra-dolares',
    redirectTo: 'gestion-dolares',
    pathMatch: 'full'
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
    path: '**',
    redirectTo: 'tarjetas'
  }
];
