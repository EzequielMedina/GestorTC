import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { TourStep, TourConfig } from '../models/tour-step.model';

const STORAGE_KEY_TOUR_COMPLETADO = 'gestor_tc_tour_completado';
const STORAGE_KEY_TOUR_CONFIG = 'gestor_tc_tour_config';

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private tourActivoSubject = new BehaviorSubject<boolean>(false);
  public tourActivo$ = this.tourActivoSubject.asObservable();

  private pasoActualSubject = new BehaviorSubject<TourStep | null>(null);
  public pasoActual$ = this.pasoActualSubject.asObservable();

  private configuracion: TourConfig;

  constructor(private router: Router) {
    this.configuracion = this.cargarConfiguracion();
  }

  /**
   * Verifica si el tour ya fue completado
   */
  esPrimeraVez(): boolean {
    const completado = localStorage.getItem(STORAGE_KEY_TOUR_COMPLETADO);
    return !completado || completado === 'false';
  }

  /**
   * Inicia el tour guiado
   */
  iniciarTour(): void {
    console.log('Iniciando tour, activo:', this.configuracion.activo);
    if (this.configuracion.activo) {
      // Primero activar el tour
      this.tourActivoSubject.next(true);
      // Luego mostrar el primer paso después de un pequeño delay para asegurar que el componente esté listo
      setTimeout(() => {
        console.log('Mostrando primer paso...');
        this.mostrarSiguientePaso(0);
      }, 300);
    } else {
      console.warn('Tour no está activo en la configuración');
    }
  }

  /**
   * Finaliza el tour
   */
  finalizarTour(): void {
    this.tourActivoSubject.next(false);
    this.pasoActualSubject.next(null);
    localStorage.setItem(STORAGE_KEY_TOUR_COMPLETADO, 'true');
  }

  /**
   * Obtiene el paso actual
   */
  getPasoActual$(): Observable<TourStep | null> {
    return this.pasoActual$;
  }

  /**
   * Verifica si el tour está activo
   */
  estaActivo$(): Observable<boolean> {
    return this.tourActivo$;
  }

  /**
   * Muestra el siguiente paso del tour
   */
  siguientePaso(): void {
    const pasoActual = this.pasoActualSubject.value;
    if (!pasoActual) {
      this.mostrarSiguientePaso(0);
      return;
    }

    const indiceActual = this.configuracion.pasos.findIndex(p => p.id === pasoActual.id);
    if (indiceActual < this.configuracion.pasos.length - 1) {
      this.mostrarSiguientePaso(indiceActual + 1);
    } else {
      this.finalizarTour();
    }
  }

  /**
   * Muestra el paso anterior
   */
  pasoAnterior(): void {
    const pasoActual = this.pasoActualSubject.value;
    if (!pasoActual) return;

    const indiceActual = this.configuracion.pasos.findIndex(p => p.id === pasoActual.id);
    if (indiceActual > 0) {
      this.mostrarSiguientePaso(indiceActual - 1);
    }
  }

  /**
   * Salta el tour
   */
  saltarTour(): void {
    this.finalizarTour();
  }

  /**
   * Reinicia el tour (marca como no completado)
   */
  reiniciarTour(): void {
    console.log('Reiniciando tour...');
    // Marcar como no completado primero
    localStorage.setItem(STORAGE_KEY_TOUR_COMPLETADO, 'false');
    
    // Limpiar estado actual
    this.tourActivoSubject.next(false);
    this.pasoActualSubject.next(null);
    
    // Esperar un momento para que el componente se limpie completamente
    setTimeout(() => {
      console.log('Iniciando tour después de reinicio...');
      // Verificar que la configuración esté activa
      if (!this.configuracion.activo) {
        console.warn('Tour no está activo en la configuración');
        return;
      }
      
      // Obtener el primer paso
      const primerPaso = this.configuracion.pasos[0];
      if (!primerPaso) {
        console.error('No hay pasos configurados en el tour');
        return;
      }
      
      // Activar el tour primero
      this.tourActivoSubject.next(true);
      
      // Si el primer paso tiene ruta, navegar primero
      if (primerPaso.ruta) {
        this.router.navigate([primerPaso.ruta]).then(() => {
          setTimeout(() => {
            this.ejecutarPaso(primerPaso);
          }, 300);
        });
      } else {
        // Si no tiene ruta, ejecutar directamente después de un pequeño delay
        setTimeout(() => {
          this.ejecutarPaso(primerPaso);
        }, 200);
      }
    }, 300);
  }

  /**
   * Muestra un paso específico
   */
  private mostrarSiguientePaso(indice: number): void {
    const paso = this.configuracion.pasos[indice];
    if (!paso) {
      this.finalizarTour();
      return;
    }

    // Navegar a la ruta si es necesario
    if (paso.ruta) {
      this.router.navigate([paso.ruta]).then(() => {
        // Esperar a que la navegación se complete y el DOM se actualice
        setTimeout(() => {
          this.ejecutarPaso(paso);
        }, 300);
      });
    } else {
      this.ejecutarPaso(paso);
    }
  }

  /**
   * Ejecuta un paso del tour
   */
  private ejecutarPaso(paso: TourStep): void {
    console.log('Tour Service - Ejecutando paso:', paso.id, paso.titulo);
    // Ejecutar acción si existe
    if (paso.accion) {
      paso.accion();
    }

    // Actualizar paso actual
    this.pasoActualSubject.next(paso);
    console.log('Tour Service - Paso actual actualizado');
  }

  /**
   * Obtiene la configuración del tour
   */
  getConfiguracion(): TourConfig {
    return this.configuracion;
  }

  /**
   * Carga la configuración del tour
   */
  private cargarConfiguracion(): TourConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TOUR_CONFIG);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar configuración del tour:', error);
    }

    // Configuración por defecto
    return {
      id: 'tour-inicial',
      nombre: 'Tour Inicial',
      descripcion: 'Recorrido guiado por la aplicación',
      activo: true,
      pasos: [
        {
          id: 'bienvenida',
          titulo: '¡Bienvenido a Gestor TC!',
          descripcion: 'Te guiaremos por las principales funcionalidades de la aplicación para que puedas aprovecharla al máximo.',
          posicion: 'center',
          orden: 1
        },
        {
          id: 'dashboard',
          titulo: 'Dashboard',
          descripcion: 'Aquí verás un resumen general de tus finanzas: total de gastos, tarjetas, próximos vencimientos y gráficos de tus gastos por tarjeta.',
          selector: 'app-dashboard',
          posicion: 'bottom',
          ruta: '/dashboard',
          orden: 2
        },
        {
          id: 'menu-lateral',
          titulo: 'Menú de Navegación',
          descripcion: 'Usa este botón para acceder al menú lateral con todas las secciones de la aplicación.',
          selector: 'button[aria-label="Toggle sidenav"], button.mat-icon-button:first-of-type',
          posicion: 'right',
          orden: 3
        },
        {
          id: 'tarjetas',
          titulo: 'Gestión de Tarjetas',
          descripcion: 'En esta sección puedes agregar, editar y gestionar tus tarjetas de crédito. Define el día de vencimiento y límite de cada una.',
          selector: 'app-tarjetas',
          posicion: 'bottom',
          ruta: '/tarjetas',
          orden: 4
        },
        {
          id: 'gastos',
          titulo: 'Registro de Gastos',
          descripcion: 'Registra todos tus gastos aquí. Puedes agregar categorías, etiquetas, notas y dividir gastos en cuotas. También puedes compartir gastos con otras personas.',
          selector: 'app-gastos',
          posicion: 'bottom',
          ruta: '/gastos',
          orden: 5
        },
        {
          id: 'gastos-servicios',
          titulo: 'Gastos de Servicios',
          descripcion: 'Gestiona tus gastos recurrentes (luz, gas, internet, etc.). Crea series que se repetirán automáticamente y aparecerán en el calendario.',
          selector: 'app-gastos-servicios',
          posicion: 'bottom',
          ruta: '/gastos-servicios',
          orden: 6
        },
        {
          id: 'calendario',
          titulo: 'Calendario Financiero',
          descripcion: 'Visualiza todos tus vencimientos en un calendario: tarjetas, cuotas, préstamos y servicios. Nunca más te olvides de un pago.',
          selector: 'app-calendario-financiero',
          posicion: 'bottom',
          ruta: '/calendario-financiero',
          orden: 7
        },
        {
          id: 'resumen',
          titulo: 'Resumen y Análisis',
          descripcion: 'Analiza tus gastos por mes, categoría y tarjeta. Ve tendencias, compara períodos y toma decisiones informadas.',
          selector: 'app-resumen',
          posicion: 'bottom',
          ruta: '/resumen',
          orden: 8
        },
        {
          id: 'backup',
          titulo: 'Backup y Restauración',
          descripcion: 'Protege tus datos. Configura backups automáticos y exporta tus datos cuando lo necesites. La aplicación también hace backups automáticos.',
          selector: 'app-backup-restauracion',
          posicion: 'bottom',
          ruta: '/backup-restauracion',
          orden: 9
        },
        {
          id: 'final',
          titulo: '¡Listo para comenzar!',
          descripcion: 'Ya conoces las funcionalidades principales. Puedes repetir este tour cuando quieras desde el menú de configuración. ¡Empieza agregando tus tarjetas y gastos!',
          posicion: 'center',
          orden: 10
        }
      ]
    };
  }

  /**
   * Guarda la configuración del tour
   */
  guardarConfiguracion(config: TourConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY_TOUR_CONFIG, JSON.stringify(config));
      this.configuracion = config;
    } catch (error) {
      console.error('Error al guardar configuración del tour:', error);
    }
  }
}

