import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { ConfiguracionReporte, ReporteGenerado, COLUMNAS_DISPONIBLES } from '../../models/reporte.model';
import { ReporteService } from '../../services/reporte.service';
import { FiltroAvanzadoService } from '../../services/filtro-avanzado.service';
import { NotificationService } from '../../services/notification.service';
import { FiltrosAvanzadosComponent } from '../../components/filtros-avanzados/filtros-avanzados.component';
import { FILTRO_POR_DEFECTO } from '../../models/filtro-avanzado.model';
import { TarjetaService } from '../../services/tarjeta';
import { CategoriaService } from '../../services/categoria.service';
import { Tarjeta } from '../../models/tarjeta.model';
import { Categoria } from '../../models/categoria.model';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-reportes-personalizados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDialogModule,
    MatTableModule,
    MatTabsModule,
    FiltrosAvanzadosComponent
  ],
  templateUrl: './reportes-personalizados.component.html',
  styleUrls: ['./reportes-personalizados.component.css']
})
export class ReportesPersonalizadosComponent implements OnInit, OnDestroy {
  configuraciones: ConfiguracionReporte[] = [];
  configuracionActual: ConfiguracionReporte | null = null;
  reporteGenerado: ReporteGenerado | null = null;
  mostrarFormulario = false;
  modoEdicion = false;
  
  // Formulario
  nombreReporte = '';
  descripcionReporte = '';
  filtros = { ...FILTRO_POR_DEFECTO };
  columnas = [...COLUMNAS_DISPONIBLES];
  agruparPor: 'tarjeta' | 'categoria' | 'mes' | 'etiqueta' | 'ninguna' = 'ninguna';
  ordenarPor: 'fecha' | 'monto' | 'descripcion' = 'fecha';
  ordenAscendente = true;
  incluirGraficos = false;
  incluirResumen = true;
  incluirNotas = false;

  displayedColumns: string[] = [];
  dataSource: any[] = [];
  tarjetas: Tarjeta[] = [];
  categorias: Categoria[] = [];

  private subscriptions = new Subscription();

  constructor(
    private reporteService: ReporteService,
    private filtroAvanzadoService: FiltroAvanzadoService,
    private notificationService: NotificationService,
    private tarjetaService: TarjetaService,
    private categoriaService: CategoriaService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.reporteService.getConfiguraciones$().subscribe(configs => {
        this.configuraciones = configs;
      })
    );

    this.subscriptions.add(
      combineLatest([
        this.tarjetaService.getTarjetas$(),
        this.categoriaService.getCategorias$()
      ]).subscribe(([tarjetas, categorias]) => {
        this.tarjetas = tarjetas;
        this.categorias = categorias;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  nuevaConfiguracion(): void {
    this.modoEdicion = false;
    this.configuracionActual = null;
    this.nombreReporte = '';
    this.descripcionReporte = '';
    this.filtros = { ...FILTRO_POR_DEFECTO };
    this.columnas = [...COLUMNAS_DISPONIBLES];
    this.agruparPor = 'ninguna';
    this.ordenarPor = 'fecha';
    this.ordenAscendente = true;
    this.incluirGraficos = false;
    this.incluirResumen = true;
    this.incluirNotas = false;
    this.mostrarFormulario = true;
  }

  editarConfiguracion(config: ConfiguracionReporte): void {
    this.modoEdicion = true;
    this.configuracionActual = config;
    this.nombreReporte = config.nombre;
    this.descripcionReporte = config.descripcion || '';
    this.filtros = { ...config.filtros };
    this.columnas = [...config.columnas];
    this.agruparPor = config.agruparPor || 'ninguna';
    this.ordenarPor = config.ordenarPor || 'fecha';
    this.ordenAscendente = config.ordenAscendente !== false;
    this.incluirGraficos = config.incluirGraficos || false;
    this.incluirResumen = config.incluirResumen !== false;
    this.incluirNotas = config.incluirNotas || false;
    this.mostrarFormulario = true;
  }

  guardarConfiguracion(): void {
    if (!this.nombreReporte.trim()) {
      this.notificationService.info('El nombre del reporte es requerido');
      return;
    }

    const config: Omit<ConfiguracionReporte, 'id' | 'fechaCreacion' | 'fechaActualizacion'> = {
      nombre: this.nombreReporte.trim(),
      descripcion: this.descripcionReporte.trim() || undefined,
      filtros: this.filtros,
      columnas: this.columnas,
      agruparPor: this.agruparPor,
      ordenarPor: this.ordenarPor,
      ordenAscendente: this.ordenAscendente,
      incluirGraficos: this.incluirGraficos,
      incluirResumen: this.incluirResumen,
      incluirNotas: this.incluirNotas
    };

    if (this.modoEdicion && this.configuracionActual) {
      this.reporteService.actualizarConfiguracion(this.configuracionActual.id, config);
      this.notificationService.success('Configuración actualizada');
    } else {
      this.reporteService.crearConfiguracion(config);
      this.notificationService.success('Configuración creada');
    }

    this.mostrarFormulario = false;
  }

  eliminarConfiguracion(config: ConfiguracionReporte): void {
    this.notificationService.confirmDelete('esta configuración de reporte').subscribe(confirmed => {
      if (confirmed) {
        this.reporteService.eliminarConfiguracion(config.id);
        this.notificationService.success('Configuración eliminada');
      }
    });
  }

  generarReporte(config: ConfiguracionReporte): void {
    this.subscriptions.add(
      this.reporteService.generarReporte(config.id).subscribe({
        next: (reporte) => {
          this.reporteGenerado = reporte;
          this.configuracionActual = config;
          this.actualizarTabla();
          this.notificationService.success('Reporte generado exitosamente');
        },
        error: (error) => {
          console.error('Error al generar reporte:', error);
          this.notificationService.error('Error al generar el reporte');
        }
      })
    );
  }

  actualizarTabla(): void {
    if (!this.reporteGenerado) return;

    const columnasVisibles = this.configuracionActual?.columnas
      .filter(c => c.visible)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0)) || [];

    this.displayedColumns = columnasVisibles.map(c => c.id);
    this.dataSource = this.reporteGenerado.datos;
  }

  exportarAPDF(): void {
    if (!this.reporteGenerado) {
      this.notificationService.info('No hay reporte generado para exportar');
      return;
    }

    try {
      // Usar jsPDF si está disponible, sino usar método alternativo
      this.exportarAPDFAlternativo();
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      this.notificationService.error('Error al exportar el PDF. Usando método alternativo...');
      this.exportarAPDFAlternativo();
    }
  }

  private exportarAPDFAlternativo(): void {
    // Método alternativo: generar HTML y usar window.print()
    const ventana = window.open('', '_blank');
    if (!ventana) {
      this.notificationService.error('No se pudo abrir la ventana de impresión');
      return;
    }

    const html = this.generarHTMLReporte();
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    
    // Esperar un momento antes de imprimir
    setTimeout(() => {
      ventana.print();
    }, 250);
  }

  private generarHTMLReporte(): string {
    if (!this.reporteGenerado || !this.configuracionActual) return '';

    const resumen = this.reporteGenerado.resumen;
    const fecha = new Date(this.reporteGenerado.fechaGeneracion).toLocaleDateString('es-AR');

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${this.configuracionActual.nombre}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          h2 { color: #666; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .resumen { margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
          .resumen-item { margin: 5px 0; }
          @media print {
            body { margin: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <h1>${this.configuracionActual.nombre}</h1>
        <p><strong>Fecha de generación:</strong> ${fecha}</p>
        ${this.configuracionActual.descripcion ? `<p>${this.configuracionActual.descripcion}</p>` : ''}
    `;

    if (this.incluirResumen && resumen) {
      html += `
        <div class="resumen">
          <h2>Resumen</h2>
          <div class="resumen-item"><strong>Total de gastos:</strong> $${resumen.totalGastos.toFixed(2)}</div>
          <div class="resumen-item"><strong>Cantidad de gastos:</strong> ${resumen.cantidadGastos}</div>
          <div class="resumen-item"><strong>Promedio:</strong> $${resumen.promedioGasto.toFixed(2)}</div>
          <div class="resumen-item"><strong>Gasto máximo:</strong> $${resumen.gastoMaximo.toFixed(2)}</div>
          <div class="resumen-item"><strong>Gasto mínimo:</strong> $${resumen.gastoMinimo.toFixed(2)}</div>
        </div>
      `;
    }

    html += `
        <h2>Datos</h2>
        <table>
          <thead>
            <tr>
    `;

    const columnasVisibles = this.configuracionActual.columnas
      .filter(c => c.visible)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));

    columnasVisibles.forEach(col => {
      html += `<th>${col.nombre}</th>`;
    });

    html += `
            </tr>
          </thead>
          <tbody>
    `;

    this.reporteGenerado.datos.forEach(fila => {
      html += '<tr>';
      columnasVisibles.forEach(col => {
        const valor = fila[col.id] || '';
        html += `<td>${valor}</td>`;
      });
      html += '</tr>';
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    return html;
  }

  onFiltrosCambiados(filtros: any): void {
    this.filtros = filtros;
  }

  toggleColumna(columnaId: string): void {
    const columna = this.columnas.find(c => c.id === columnaId);
    if (columna) {
      columna.visible = !columna.visible;
    }
  }

  getColumnaNombre(columnaId: string): string {
    const columna = COLUMNAS_DISPONIBLES.find(c => c.id === columnaId);
    return columna ? columna.nombre : columnaId;
  }

  getCantidadColumnasVisibles(config: ConfiguracionReporte): number {
    return config.columnas.filter(c => c.visible).length;
  }
}

