import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { GastoServicioImportado, ValidationResult, Duplicado } from '../../models/gasto-servicio-importado.model';
import { ConfiguracionMapeo } from '../../models/configuracion-mapeo.model';
import { ResultadoImportacion } from '../../models/resultado-importacion.model';
import { CargaServiciosService } from '../../services/carga-servicios.service';
import { CategorizacionServiciosService } from '../../services/categorizacion-servicios.service';
import { TarjetaService } from '../../services/tarjeta';
import { CategoriaService } from '../../services/categoria.service';
import { NotificationService } from '../../services/notification.service';
import { VistaPreviaImportacionComponent } from '../../components/vista-previa-importacion/vista-previa-importacion.component';
import { combineLatest, Subscription, firstValueFrom } from 'rxjs';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-cargar-servicios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDialogModule,
    MatTabsModule,
    VistaPreviaImportacionComponent
  ],
  templateUrl: './cargar-servicios.component.html',
  styleUrls: ['./cargar-servicios.component.css']
})
export class CargarServiciosComponent implements OnInit, OnDestroy {
  archivoSeleccionado: File | null = null;
  isDragOver = false;
  procesando = false;
  progreso = 0;

  datosImportados: GastoServicioImportado[] = [];
  resultadoValidacion: ValidationResult | null = null;
  duplicados: Duplicado[] = [];
  mostrarVistaPrevia = false;

  tarjetas: any[] = [];
  categorias: any[] = [];
  configuraciones: ConfiguracionMapeo[] = [];
  configuracionSeleccionada: ConfiguracionMapeo | null = null;

  resultadoImportacion: ResultadoImportacion | null = null;

  private subscriptions = new Subscription();

  constructor(
    private cargaServiciosService: CargaServiciosService,
    private categorizacionService: CategorizacionServiciosService,
    private tarjetaService: TarjetaService,
    private categoriaService: CategoriaService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      combineLatest([
        this.tarjetaService.getTarjetas$(),
        this.categoriaService.getCategorias$(),
        this.cargaServiciosService.configuraciones$
      ]).subscribe(([tarjetas, categorias, configuraciones]) => {
        this.tarjetas = tarjetas;
        this.categorias = categorias;
        this.configuraciones = configuraciones;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.procesarArchivo(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.procesarArchivo(input.files[0]);
    }
  }

  async procesarArchivo(file: File): Promise<void> {
    // Validar tamaño
    const maxSize = file.type === 'application/pdf' ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.notificationService.error(`El archivo es demasiado grande. Tamaño máximo: ${maxSize / 1024 / 1024}MB`);
      return;
    }

    this.archivoSeleccionado = file;
    this.procesando = true;
    this.progreso = 0;

    try {
      this.progreso = 25;
      const formato = this.cargaServiciosService.detectarFormato(file);
      
      if (formato === 'UNKNOWN') {
        throw new Error('Formato de archivo no soportado');
      }

      this.progreso = 50;
      const datos = await firstValueFrom(
        this.cargaServiciosService.parsearArchivo(file, this.configuracionSeleccionada || undefined)
      );
      
      if (!datos || datos.length === 0) {
        throw new Error('No se pudieron extraer datos del archivo');
      }

      this.progreso = 75;
      
      // Validar datos
      const validacion = await firstValueFrom(
        this.cargaServiciosService.validarDatos(datos)
      );
      if (!validacion) {
        throw new Error('Error al validar datos');
      }

      // Aplicar errores y advertencias a los datos
      datos.forEach(dato => {
        dato.errores = validacion.errores
          .filter(e => e.fila === dato.filaOriginal)
          .map(e => e.mensaje);
        dato.advertencias = validacion.advertencias
          .filter(w => w.fila === dato.filaOriginal)
          .map(w => w.mensaje);
      });

      // Detectar duplicados
      this.duplicados = await firstValueFrom(
        this.cargaServiciosService.detectarDuplicados(datos)
      ) || [];

      this.datosImportados = datos;
      this.resultadoValidacion = validacion;
      this.mostrarVistaPrevia = true;
      this.progreso = 100;

      this.notificationService.success(`Archivo procesado: ${datos.length} filas encontradas`);
    } catch (error: any) {
      console.error('Error al procesar archivo:', error);
      this.notificationService.error(error.message || 'Error al procesar el archivo');
      this.procesando = false;
      this.progreso = 0;
    } finally {
      this.procesando = false;
    }
  }

  onEditarDato(event: { index: number; dato: GastoServicioImportado }): void {
    // TODO: Abrir diálogo de edición
    this.notificationService.info('Funcionalidad de edición próximamente');
  }

  onExcluirDato(index: number): void {
    this.datosImportados[index].excluir = !this.datosImportados[index].excluir;
  }

  async onImportar(): Promise<void> {
    if (!this.archivoSeleccionado) return;

    this.procesando = true;
    const formato = this.cargaServiciosService.detectarFormato(this.archivoSeleccionado);

    try {
      const resultado = await firstValueFrom(
        this.cargaServiciosService.importarGastos(
          this.datosImportados,
          this.archivoSeleccionado.name,
          formato
        )
      );

      if (resultado) {
        this.resultadoImportacion = resultado;
        this.notificationService.success(
          `Importación completada: ${resultado.exitosos} gastos creados, ${resultado.errores} errores`
        );
        
        // Limpiar y volver al inicio
        setTimeout(() => {
          this.resetear();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error al importar:', error);
      this.notificationService.error(error.message || 'Error al importar gastos');
    } finally {
      this.procesando = false;
    }
  }

  onCancelar(): void {
    this.resetear();
  }

  resetear(): void {
    this.archivoSeleccionado = null;
    this.datosImportados = [];
    this.resultadoValidacion = null;
    this.duplicados = [];
    this.mostrarVistaPrevia = false;
    this.resultadoImportacion = null;
    this.progreso = 0;
  }

  descargarPlantillaCSV(): void {
    const csv = `Fecha,Descripción,Monto,Categoría,Tarjeta,Notas
2025-01-15,Luz EDENOR,5230,Servicios,,
2025-01-20,Gas Metrogas,4500,Servicios,,
2025-01-25,Netflix,1200,Entretenimiento,,`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'plantilla_gastos_servicios.csv');
    this.notificationService.success('Plantilla CSV descargada');
  }

  descargarPlantillaExcel(): void {
    // TODO: Implementar descarga de plantilla Excel
    this.notificationService.info('Plantilla Excel próximamente');
  }
}

