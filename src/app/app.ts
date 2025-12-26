import { Component, signal, ViewChild, OnInit, AfterViewInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { AlertBannerComponent } from './components/alert-banner/alert-banner.component';
import { GlobalSearchComponent } from './components/global-search/global-search.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { TourGuiadoComponent } from './components/tour-guiado/tour-guiado.component';
import { GastoRapidoFabComponent } from './components/gasto-rapido-fab/gasto-rapido-fab.component';
import { GastoRapidoDialogComponent } from './components/gasto-rapido-dialog/gasto-rapido-dialog.component';
import { ThemeService } from './services/theme.service';
import { TourService } from './services/tour.service';
import { PwaUpdateService } from './services/pwa-update.service';
import { filter } from 'rxjs/operators';

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
export class App implements OnInit, AfterViewInit {
  protected readonly title = signal('Gestor de Cuentas');
  
  @ViewChild(GastoRapidoFabComponent) gastoRapidoFab?: GastoRapidoFabComponent;
  
  constructor(
    private themeService: ThemeService,
    private tourService: TourService,
    private pwaUpdateService: PwaUpdateService,
    private router: Router,
    private dialog: MatDialog
  ) {
    // Los servicios se inicializan automáticamente
  }

  ngOnInit(): void {
    // Detectar acciones desde App Shortcuts
    this.detectarAccionDesdeShortcut();
    
    // Escuchar cambios de ruta para limpiar parámetros después de navegar
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Limpiar parámetros de URL después de navegar
        if (window.location.search.includes('action=')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('action');
          window.history.replaceState({}, '', url.pathname);
        }
      });
  }

  ngAfterViewInit(): void {
    // Esperar a que el componente esté completamente inicializado
    setTimeout(() => {
      this.detectarAccionDesdeShortcut();
    }, 500);
  }

  /**
   * Detecta si la app se abrió desde un App Shortcut
   * y ejecuta la acción correspondiente
   */
  private detectarAccionDesdeShortcut(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'nuevo-gasto') {
      // Abrir formulario rápido después de un breve delay
      // para asegurar que la app esté completamente cargada
      setTimeout(() => {
        this.abrirFormularioRapidoDesdeShortcut();
      }, 1000);
    }
  }

  /**
   * Abre el formulario rápido desde un App Shortcut
   */
  private abrirFormularioRapidoDesdeShortcut(): void {
    // Usar el componente FAB si está disponible, o abrir directamente el diálogo
    if (this.gastoRapidoFab) {
      this.gastoRapidoFab.abrirFormularioRapido();
    } else {
      // Abrir directamente el diálogo
      const dialogRef = this.dialog.open(GastoRapidoDialogComponent, {
        width: '90%',
        maxWidth: '500px',
        disableClose: false,
        panelClass: 'gasto-rapido-dialog'
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result === 'abrir-completo') {
          this.router.navigate(['/gastos']);
        }
      });
    }
  }

  iniciarTour(): void {
    console.log('Iniciando tour desde botón...');
    this.tourService.reiniciarTour();
  }
}
