import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { Subject, takeUntil } from 'rxjs';

import { ConfiguracionUsuarioService, ConfiguracionNotificaciones } from '../../services/configuracion-usuario.service';
import { TarjetaService } from '../../services/tarjeta';
import { Tarjeta } from '../../models/tarjeta.model';

@Component({
  selector: 'app-preferencias-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTabsModule
  ],
  templateUrl: './preferencias-usuario.component.html',
  styleUrls: ['./preferencias-usuario.component.css']
})
export class PreferenciasUsuarioComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  configuracion!: ConfiguracionNotificaciones;
  tarjetas: Tarjeta[] = [];
  loading = true;
  guardando = false;
  
  // Opciones para los selectores
  opcionesHora: string[] = [];
  opcionesFrecuencia = [
    { valor: 1, etiqueta: 'Diario' },
    { valor: 2, etiqueta: 'Cada 2 días' },
    { valor: 3, etiqueta: 'Cada 3 días' },
    { valor: 7, etiqueta: 'Semanal' }
  ];
  
  opcionesAnticipacion = [
    { valor: 1, etiqueta: '1 día antes' },
    { valor: 2, etiqueta: '2 días antes' },
    { valor: 3, etiqueta: '3 días antes' },
    { valor: 5, etiqueta: '5 días antes' },
    { valor: 7, etiqueta: '1 semana antes' },
    { valor: 14, etiqueta: '2 semanas antes' }
  ];
  
  opcionesMoneda = [
    { valor: 'ARS', etiqueta: 'Peso Argentino (ARS)' },
    { valor: 'USD', etiqueta: 'Dólar Estadounidense (USD)' }
  ];
  
  opcionesIdioma = [
    { valor: 'es', etiqueta: 'Español' },
    { valor: 'en', etiqueta: 'English' }
  ];
  
  constructor(
    private configuracionUsuarioService: ConfiguracionUsuarioService,
    private tarjetaService: TarjetaService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.generarOpcionesHora();
  }
  
  ngOnInit(): void {
    this.cargarDatos();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private cargarDatos(): void {
    this.loading = true;
    
    // Cargar configuración
    this.configuracionUsuarioService.configuracion$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.configuracion = { ...config };
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error al cargar configuración:', error);
          this.snackBar.open('Error al cargar configuración', 'Cerrar', { duration: 3000 });
          this.loading = false;
        }
      });
    
    // Cargar tarjetas
    this.tarjetaService.getTarjetas$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tarjetas: any) => {
          this.tarjetas = tarjetas;
        },
        error: (error: any) => {
          console.error('Error al cargar tarjetas:', error);
        }
      });
  }
  
  private generarOpcionesHora(): void {
    for (let hora = 0; hora < 24; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 30) {
        const horaStr = hora.toString().padStart(2, '0');
        const minutoStr = minuto.toString().padStart(2, '0');
        this.opcionesHora.push(`${horaStr}:${minutoStr}`);
      }
    }
  }
  
  /**
   * Actualiza una sección específica de la configuración
   */
  actualizarSeccion<K extends keyof ConfiguracionNotificaciones>(
    seccion: K,
    campo: keyof ConfiguracionNotificaciones[K],
    valor: any
  ): void {
    try {
      this.configuracionUsuarioService.actualizarConfiguracion(seccion, {
        [campo]: valor
      } as Partial<ConfiguracionNotificaciones[K]>);
      
      this.snackBar.open('Configuración actualizada', 'Cerrar', { duration: 2000 });
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      this.snackBar.open('Error al actualizar configuración', 'Cerrar', { duration: 3000 });
    }
  }
  
  /**
   * Maneja el cambio en la selección de tarjetas
   */
  onTarjetaSeleccionChange(tarjetaId: string, seleccionada: boolean): void {
    const tarjetasSeleccionadas = [...this.configuracion.filtros.tarjetasSeleccionadas];
    
    if (seleccionada) {
      if (!tarjetasSeleccionadas.includes(tarjetaId)) {
        tarjetasSeleccionadas.push(tarjetaId);
      }
    } else {
      const index = tarjetasSeleccionadas.indexOf(tarjetaId);
      if (index > -1) {
        tarjetasSeleccionadas.splice(index, 1);
      }
    }
    
    this.actualizarSeccion('filtros', 'tarjetasSeleccionadas', tarjetasSeleccionadas);
  }
  
  /**
   * Verifica si una tarjeta está seleccionada
   */
  isTarjetaSeleccionada(tarjetaId: string): boolean {
    return this.configuracion.filtros.tarjetasSeleccionadas.includes(tarjetaId);
  }
  
  /**
   * Selecciona todas las tarjetas
   */
  seleccionarTodasLasTarjetas(): void {
    const todasLasTarjetas = this.tarjetas.map(t => t.id);
    this.actualizarSeccion('filtros', 'tarjetasSeleccionadas', todasLasTarjetas);
  }
  
  /**
   * Deselecciona todas las tarjetas
   */
  deseleccionarTodasLasTarjetas(): void {
    this.actualizarSeccion('filtros', 'tarjetasSeleccionadas', []);
  }
  
  /**
   * Exporta la configuración
   */
  exportarConfiguracion(): void {
    try {
      const configJson = this.configuracionUsuarioService.exportarConfiguracion();
      const blob = new Blob([configJson], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `gestor-tc-config-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      window.URL.revokeObjectURL(url);
      this.snackBar.open('Configuración exportada correctamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error al exportar configuración:', error);
      this.snackBar.open('Error al exportar configuración', 'Cerrar', { duration: 3000 });
    }
  }
  
  /**
   * Importa configuración desde archivo
   */
  importarConfiguracion(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        this.configuracionUsuarioService.importarConfiguracion(content);
        this.snackBar.open('Configuración importada correctamente', 'Cerrar', { duration: 3000 });
      } catch (error) {
        console.error('Error al importar configuración:', error);
        this.snackBar.open('Error al importar configuración', 'Cerrar', { duration: 3000 });
      }
    };
    
    reader.readAsText(file);
    
    // Limpiar el input
    input.value = '';
  }
  
  /**
   * Resetea la configuración a valores por defecto
   */
  resetearConfiguracion(): void {
    if (confirm('¿Está seguro de que desea resetear toda la configuración a los valores por defecto?')) {
      try {
        this.configuracionUsuarioService.resetearConfiguracion();
        this.snackBar.open('Configuración reseteada correctamente', 'Cerrar', { duration: 3000 });
      } catch (error) {
        console.error('Error al resetear configuración:', error);
        this.snackBar.open('Error al resetear configuración', 'Cerrar', { duration: 3000 });
      }
    }
  }
  
  /**
   * Obtiene estadísticas de la configuración
   */
  getEstadisticas(): any {
    return this.configuracionUsuarioService.getEstadisticasConfiguracion();
  }
  
  /**
   * Obtiene el nombre de una tarjeta por su ID
   */
  getNombreTarjeta(id: string): string {
    const tarjeta = this.tarjetas.find(t => t.id === id);
    return tarjeta ? tarjeta.nombre : 'Tarjeta no encontrada';
  }
}