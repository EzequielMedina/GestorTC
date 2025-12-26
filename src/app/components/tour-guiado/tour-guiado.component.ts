import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TourService } from '../../services/tour.service';
import { TourStep } from '../../models/tour-step.model';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-tour-guiado',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './tour-guiado.component.html',
  styleUrls: ['./tour-guiado.component.css']
})
export class TourGuiadoComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('overlay', { static: false }) overlayRef!: ElementRef;
  @ViewChild('tooltip', { static: false }) tooltipRef!: ElementRef;

  pasoActual: TourStep | null = null;
  tourActivo = false;
  progreso = 0;
  totalPasos = 0;
  pasoActualNumero = 0;

  private subscriptions = new Subscription();
  private elementoDestacado: HTMLElement | null = null;

  constructor(
    private tourService: TourService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Combinar ambos observables para asegurar sincronización
    this.subscriptions.add(
      combineLatest([
        this.tourService.estaActivo$(),
        this.tourService.getPasoActual$()
      ]).subscribe(([activo, paso]: [boolean, TourStep | null]) => {
        console.log('Tour Component - Estado:', activo, 'Paso:', paso?.id || 'null', 'Titulo:', paso?.titulo || 'N/A');
        
        // Actualizar estado inmediatamente
        this.tourActivo = activo;
        this.pasoActual = paso;
        
        console.log('Tour Component - Valores actualizados:', {
          tourActivo: this.tourActivo,
          pasoActual: this.pasoActual,
          tienePaso: !!this.pasoActual,
          condicionTemplate: this.tourActivo && this.pasoActual
        });
        
        // Forzar detección de cambios
        this.cdr.detectChanges();
        
        if (paso && activo) {
          // Hay un paso activo y el tour está activo
          const config = this.tourService.getConfiguracion();
          this.totalPasos = config.pasos.length;
          const indice = config.pasos.findIndex(p => p.id === paso.id);
          this.pasoActualNumero = indice >= 0 ? indice + 1 : 1;
          this.progreso = (this.pasoActualNumero / this.totalPasos) * 100;
          
          console.log('Tour Component - Mostrando paso:', this.pasoActualNumero, 'de', this.totalPasos, 'Titulo:', paso.titulo);
          
          // Usar requestAnimationFrame para asegurar que el DOM esté actualizado
          requestAnimationFrame(() => {
            setTimeout(() => {
              this.destacarElemento(paso);
            }, 100);
          });
        } else if (!activo) {
          // Tour desactivado, limpiar todo
          console.log('Tour Component - Tour desactivado, limpiando...');
          this.pasoActual = null;
          this.tourActivo = false;
          this.limpiarDestacado();
        } else if (activo && !paso) {
          // Tour activo pero sin paso aún (estado transitorio)
          console.log('Tour Component - Tour activo pero sin paso, esperando...');
          this.pasoActual = null;
        }
      })
    );
  }

  ngAfterViewInit(): void {
    // Verificar si es primera vez al cargar
    if (this.tourService.esPrimeraVez()) {
      setTimeout(() => {
        this.tourService.iniciarTour();
      }, 1000); // Esperar 1 segundo para que la app cargue
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.limpiarDestacado();
  }

  siguiente(): void {
    this.tourService.siguientePaso();
  }

  anterior(): void {
    this.tourService.pasoAnterior();
  }

  saltar(): void {
    this.tourService.saltarTour();
  }

  finalizar(): void {
    this.tourService.finalizarTour();
  }

  private destacarElemento(paso: TourStep): void {
    console.log('Tour Component - Destacando elemento para paso:', paso.id);
    this.limpiarDestacado();

    if (!paso.selector) {
      // Si no hay selector, mostrar tooltip centrado con overlay completo
      console.log('Tour Component - Paso sin selector, mostrando tooltip centrado');
      // Aplicar overlay completo (sin agujero)
      this.aplicarOverlayCompleto();
      // Esperar a que el ViewChild esté disponible
      setTimeout(() => {
        this.mostrarTooltipCentrado();
      }, 100);
      return;
    }

    const elemento = document.querySelector(paso.selector) as HTMLElement;
    if (!elemento) {
      console.warn(`Tour Component - Elemento no encontrado: ${paso.selector}, mostrando tooltip centrado`);
      setTimeout(() => {
        this.mostrarTooltipCentrado();
      }, 100);
      return;
    }

    this.elementoDestacado = elemento;
    
    // Scroll al elemento
    elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Esperar a que el scroll termine y el ViewChild esté disponible
    setTimeout(() => {
      this.aplicarEstilosDestacado(elemento, paso.posicion || 'bottom');
    }, 500);
  }

  private aplicarEstilosDestacado(elemento: HTMLElement, posicion: string): void {
    const rect = elemento.getBoundingClientRect();
    const tooltip = this.tooltipRef?.nativeElement;
    
    if (!tooltip) return;

    // Calcular posición del tooltip
    let top = 0;
    let left = 0;
    const bottom = rect.top + rect.height;
    const right = rect.left + rect.width;

    switch (posicion) {
      case 'top':
        top = rect.top - tooltip.offsetHeight - 20;
        left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
        break;
      case 'bottom':
        top = bottom + 20;
        left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2);
        left = rect.left - tooltip.offsetWidth - 20;
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2);
        left = right + 20;
        break;
      case 'center':
        top = window.innerHeight / 2 - tooltip.offsetHeight / 2;
        left = window.innerWidth / 2 - tooltip.offsetWidth / 2;
        break;
    }

    // Ajustar si se sale de la pantalla
    if (left < 20) left = 20;
    if (left + tooltip.offsetWidth > window.innerWidth - 20) {
      left = window.innerWidth - tooltip.offsetWidth - 20;
    }
    if (top < 20) top = 20;
    if (top + tooltip.offsetHeight > window.innerHeight - 20) {
      top = window.innerHeight - tooltip.offsetHeight - 20;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    // Aplicar overlay con agujero
    this.aplicarOverlay(rect);
  }

  private aplicarOverlay(rect: { top: number; left: number; width: number; height: number }): void {
    const overlay = this.overlayRef?.nativeElement;
    if (!overlay) return;

    // Crear agujero en el overlay usando clip-path
    const padding = 10;
    const bottom = rect.top + rect.height;
    const right = rect.left + rect.width;
    const clipPath = `polygon(
      0% 0%,
      0% 100%,
      ${rect.left - padding}px 100%,
      ${rect.left - padding}px ${rect.top - padding}px,
      ${right + padding}px ${rect.top - padding}px,
      ${right + padding}px ${bottom + padding}px,
      ${rect.left - padding}px ${bottom + padding}px,
      ${rect.left - padding}px 100%,
      100% 100%,
      100% 0%
    )`;

    overlay.style.clipPath = clipPath;
  }

  private aplicarOverlayCompleto(): void {
    const overlay = this.overlayRef?.nativeElement;
    if (!overlay) return;
    // Sin clip-path, el overlay cubre toda la pantalla
    overlay.style.clipPath = '';
  }

  private mostrarTooltipCentrado(): void {
    const tooltip = this.tooltipRef?.nativeElement;
    if (!tooltip) {
      console.warn('Tour Component - Tooltip ref no disponible');
      return;
    }

    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    tooltip.style.position = 'fixed';
    console.log('Tour Component - Tooltip centrado mostrado');
  }

  private limpiarDestacado(): void {
    if (this.elementoDestacado) {
      this.elementoDestacado = null;
    }
    const overlay = this.overlayRef?.nativeElement;
    if (overlay) {
      overlay.style.clipPath = '';
    }
  }
}

