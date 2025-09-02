import { Routes } from '@angular/router';
import { TarjetasComponent } from './pages/tarjetas/tarjetas.component';
import { GastosComponent } from './pages/gastos/gastos.component';
import { ReportesComponent } from './pages/reportes/reportes.component';
import { ReportesWhatsappComponent } from './pages/reportes-whatsapp/reportes-whatsapp.component';

export const routes: Routes = [
  { path: '', redirectTo: '/tarjetas', pathMatch: 'full' },
  { path: 'tarjetas', component: TarjetasComponent },
  { path: 'gastos', component: GastosComponent },
  { path: 'reportes', component: ReportesComponent },
  { path: 'reportes-whatsapp', component: ReportesWhatsappComponent }
];
