import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard - Gestor de Tarjetas de Crédito'
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
    path: 'prestamos',
    loadComponent: () => import('./components/prestamos/prestamo-list.component').then(m => m.PrestamoListComponent),
    title: 'Préstamos - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'prestamos/:id',
    loadComponent: () => import('./components/prestamos/prestamo-detail.component').then(m => m.PrestamoDetailComponent),
    title: 'Detalle de Préstamo - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'prestamos/:id/analisis',
    loadComponent: () => import('./components/prestamos/prestamo-analysis.component').then(m => m.PrestamoAnalysisComponent),
    title: 'Análisis de Préstamo - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'importar-exportar',
    loadComponent: () => import('./pages/importar-exportar/importar-exportar').then(m => m.ImportarExportarComponent),
    title: 'Importar/Exportar - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'presupuestos',
    loadComponent: () => import('./pages/presupuestos/presupuestos.component').then(m => m.PresupuestosComponent),
    title: 'Presupuestos - Gestor de Tarjetas de Crédito'
  },
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
    path: 'backup-restauracion',
    loadComponent: () => import('./pages/backup-restauracion/backup-restauracion.component').then(m => m.BackupRestauracionComponent),
    title: 'Backup y Restauración - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'cuotas',
    loadComponent: () => import('./pages/cuotas/cuotas.component').then(m => m.CuotasComponent),
    title: 'Cuotas - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'analisis-tendencias',
    loadComponent: () => import('./pages/analisis-tendencias/analisis-tendencias.component').then(m => m.AnalisisTendenciasComponent),
    title: 'Análisis de Tendencias - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'calendario-financiero',
    loadComponent: () => import('./pages/calendario-financiero/calendario-financiero.component').then(m => m.CalendarioFinancieroComponent),
    title: 'Calendario Financiero - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'calculadoras-financieras',
    loadComponent: () => import('./pages/calculadoras-financieras/calculadoras-financieras.component').then(m => m.CalculadorasFinancierasComponent),
    title: 'Calculadoras Financieras - Gestor de Tarjetas de Crédito'
  },
  {
    path: 'reportes-personalizados',
    loadComponent: () => import('./pages/reportes-personalizados/reportes-personalizados.component').then(m => m.ReportesPersonalizadosComponent),
    title: 'Reportes Personalizados - Gestor de Tarjetas de Crédito'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
