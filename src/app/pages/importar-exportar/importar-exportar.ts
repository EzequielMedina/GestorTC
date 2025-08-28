import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tarjeta } from '../../models/tarjeta.model';
import { Gasto } from '../../models/gasto.model';
import { CompraDolar } from '../../models/compra-dolar.model';
import { VentaDolar } from '../../models/venta-dolar.model';
import { TarjetaService } from '../../services/tarjeta';
import { GastoService } from '../../services/gasto';
import { CompraDolarService } from '../../services/compra-dolar.service';
import { VentaDolarService } from '../../services/venta-dolar.service';
import { ImportarExportarService } from '../../services/importar-exportar.service';

interface ExcelPreview {
  tarjetas: number;
  gastos: number;
  compraDolares: number;
  totalGastos: number;
  gastosCompartidos: number;
  cuotasPendientes: number;
  mesesConGastos: string[];
  archivo: File;
  nombre: string;
  tamano: string;
  fechaModificacion: string;
}

@Component({
  selector: 'app-importar-exportar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './importar-exportar.component.html',
  styleUrls: ['./importar-exportar.component.css']
})
export class ImportarExportarComponent implements OnInit {
  public tarjetas: Tarjeta[] = [];
  public gastos: Gasto[] = [];
  public compraDolares: CompraDolar[] = [];
  public ventaDolares: VentaDolar[] = [];
  
  archivoSeleccionado: File | null = null;
  mensaje: string = '';
  esError: boolean = false;
  importando: boolean = false;
  isDragOver: boolean = false;
  excelPreview: ExcelPreview | null = null;
  mostrarInfoMontos: boolean = false;

  constructor(
    private tarjetaService: TarjetaService,
    private gastoService: GastoService,
    private compraDolarService: CompraDolarService,
    private ventaDolarService: VentaDolarService,
    private importarExportarService: ImportarExportarService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.tarjetaService.getTarjetas$().subscribe(tarjetas => {
      this.tarjetas = tarjetas;
    });

    this.gastoService.getGastos$().subscribe(gastos => {
      this.gastos = gastos;
    });

    this.compraDolarService.getCompras$().subscribe(compraDolares => {
      this.compraDolares = compraDolares;
    });

    this.ventaDolarService.getVentas$().subscribe(ventaDolares => {
      this.ventaDolares = ventaDolares;
    });
  }

  get totalGastos(): number {
    return this.gastos.reduce((total, gasto) => total + gasto.monto, 0);
  }

  get gastosCompartidos(): number {
    return this.gastos.filter(gasto => gasto.compartidoCon && gasto.compartidoCon.trim() !== '').length;
  }

  exportar(): void {
    const nombreArchivo = `gestor-tc-exportacion_${new Date().toISOString().split('T')[0]}`;
    this.importarExportarService.exportarAExcel(this.tarjetas, this.gastos, this.compraDolares, nombreArchivo, this.ventaDolares);
    this.setMensaje('Datos exportados correctamente', false);
  }

  exportarXML(): void {
    const nombreArchivo = `gestor-tc-exportacion_${new Date().toISOString().split('T')[0]}`;
    this.importarExportarService.exportarAXML(this.tarjetas, this.gastos, this.compraDolares, this.ventaDolares, nombreArchivo);
    this.setMensaje('XML exportado correctamente', false);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.procesarArchivo(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.name.endsWith('.xlsx')) {
        this.procesarArchivo(file);
      } else {
        this.setMensaje('Por favor selecciona un archivo Excel (.xlsx)', true);
      }
    }
  }

  async procesarArchivo(file: File): Promise<void> {
    this.archivoSeleccionado = file;
    this.limpiarMensaje();
    
    try {
      let tarjetas: Tarjeta[] = [];
      let gastos: Gasto[] = [];
      let compraDolares: CompraDolar[] = [];
      let ventaDolares: VentaDolar[] = [];

      if (file.name.endsWith('.xml')) {
        const xmlData = await this.importarExportarService.importarDesdeXML(file);
        tarjetas = xmlData.tarjetas;
        gastos = xmlData.gastos;
        compraDolares = xmlData.compraDolares;
        ventaDolares = xmlData.ventaDolares;
      } else {
        const excelData = await this.importarExportarService.importarDesdeExcel(file);
        tarjetas = excelData.tarjetas;
        gastos = excelData.gastos;
        compraDolares = excelData.compraDolares;
      }
      
      this.excelPreview = {
        tarjetas: tarjetas.length,
        gastos: gastos.length,
        compraDolares: compraDolares.length,
        totalGastos: gastos.reduce((total, gasto) => total + gasto.monto, 0),
        gastosCompartidos: gastos.filter(g => g.compartidoCon && g.compartidoCon.trim() !== '').length,
        cuotasPendientes: gastos.filter(g => (g.cantidadCuotas || 1) > 1 && this.esCuotaPendiente(g)).length,
        mesesConGastos: this.obtenerMesesConGastos(gastos),
        archivo: file,
        nombre: file.name,
        tamano: this.formatearTamaño(file.size),
        fechaModificacion: new Date(file.lastModified).toLocaleDateString('es-ES')
      };
    } catch (error) {
      console.error('Error al procesar archivo:', error);
      this.setMensaje('Error al procesar el archivo. Verifica que sea un Excel válido.', true);
      this.archivoSeleccionado = null;
      this.excelPreview = null;
    }
  }

  private esCuotaPendiente(gasto: Gasto): boolean {
    if (!gasto.primerMesCuota || (gasto.cantidadCuotas || 1) <= 1) return false;
    
    const primerMes = new Date(gasto.primerMesCuota + '-01');
    const mesFinal = new Date(primerMes);
    mesFinal.setMonth(mesFinal.getMonth() + (gasto.cantidadCuotas || 1) - 1);
    
    const ahora = new Date();
    return ahora <= mesFinal;
  }

  private obtenerMesesConGastos(gastos: Gasto[]): string[] {
    const meses = new Set<string>();
    
    gastos.forEach(gasto => {
      const fecha = new Date(gasto.fecha);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      meses.add(mesKey);
      
      // Agregar meses de cuotas si aplica
      if ((gasto.cantidadCuotas || 1) > 1 && gasto.primerMesCuota) {
        const primerMes = new Date(gasto.primerMesCuota + '-01');
        for (let i = 0; i < (gasto.cantidadCuotas || 1); i++) {
          const mesCuota = new Date(primerMes);
          mesCuota.setMonth(mesCuota.getMonth() + i);
          const mesKeyCuota = `${mesCuota.getFullYear()}-${String(mesCuota.getMonth() + 1).padStart(2, '0')}`;
          meses.add(mesKeyCuota);
        }
      }
    });
    
    return Array.from(meses).sort();
  }

  private formatearTamaño(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  importar(): void {
    if (!this.archivoSeleccionado) return;
    
    this.importando = true;
    this.limpiarMensaje();
    
    const importPromise = this.archivoSeleccionado.name.endsWith('.xml')
      ? this.importarExportarService.importarDesdeXML(this.archivoSeleccionado)
      : this.importarExportarService.importarDesdeExcel(this.archivoSeleccionado);

    (importPromise as Promise<{ tarjetas: Tarjeta[]; gastos: Gasto[]; compraDolares: CompraDolar[]; ventaDolares?: VentaDolar[] }>)
      .then(({ tarjetas, gastos, compraDolares, ventaDolares }: { tarjetas: Tarjeta[]; gastos: Gasto[]; compraDolares: CompraDolar[]; ventaDolares?: VentaDolar[] }) => {
        console.log('DEBUG - Datos importados:', { tarjetas, gastos, compraDolares });
        
        // Reemplazar completamente los datos existentes
        this.tarjetaService.reemplazarTarjetas(tarjetas).subscribe(() => {
          this.gastoService.reemplazarGastos(gastos).subscribe(() => {
            this.compraDolarService.reemplazarCompras(compraDolares).subscribe(() => {
              this.ventaDolarService.reemplazarVentas(ventaDolares || []).subscribe(() => {
                this.cargarDatos();
                this.limpiarSeleccion();
                this.setMensaje(`Importación exitosa: ${tarjetas.length} tarjetas, ${gastos.length} gastos, ${compraDolares.length} compras y ${(ventaDolares || []).length} ventas de dólares`, false);
              });
            });
          });
        });
      })
      .catch((error: unknown) => {
        console.error('Error en importación:', error);
        this.setMensaje('Error al importar los datos. Verifica el formato del archivo.', true);
      })
      .finally(() => {
        this.importando = false;
      });
  }

  descargarPlantilla(): void {
    this.importarExportarService.generarPlantillaExcel();
    this.setMensaje('Plantilla descargada correctamente', false);
  }

  limpiarSeleccion(): void {
    this.archivoSeleccionado = null;
    this.excelPreview = null;
    this.isDragOver = false;
    this.limpiarMensaje();
  }

  setMensaje(mensaje: string, esError: boolean = false): void {
    this.mensaje = mensaje;
    this.esError = esError;
    
    if (!esError) {
      setTimeout(() => {
        this.limpiarMensaje();
      }, 5000);
    }
  }

  limpiarMensaje(): void {
    this.mensaje = '';
    this.esError = false;
  }

  toggleInfoMontos(): void {
    this.mostrarInfoMontos = !this.mostrarInfoMontos;
  }
}
