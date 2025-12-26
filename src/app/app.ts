import { Component, signal, ViewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertBannerComponent } from './components/alert-banner/alert-banner.component';
import { GlobalSearchComponent } from './components/global-search/global-search.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { TourGuiadoComponent } from './components/tour-guiado/tour-guiado.component';
import { GastoRapidoFabComponent } from './components/gasto-rapido-fab/gasto-rapido-fab.component';
import { ThemeService } from './services/theme.service';
import { TourService } from './services/tour.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    AlertBannerComponent,
    GlobalSearchComponent,
    ThemeToggleComponent,
    TourGuiadoComponent,
    GastoRapidoFabComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Gestor de Cuentas');
  
  constructor(
    private themeService: ThemeService,
    private tourService: TourService
  ) {
    // El servicio se inicializa automáticamente
  }

  iniciarTour(): void {
    console.log('Iniciando tour desde botón...');
    this.tourService.reiniciarTour();
  }
}
