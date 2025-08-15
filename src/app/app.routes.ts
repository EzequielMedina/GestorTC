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
    path: 'importar-exportar',
    loadComponent: () => import('./pages/importar-exportar/importar-exportar').then(m => m.ImportarExportarComponent),
    title: 'Importar/Exportar - Gestor de Tarjetas de Crédito'
  },
  {
    path: '**',
    redirectTo: 'tarjetas'
  }
];
