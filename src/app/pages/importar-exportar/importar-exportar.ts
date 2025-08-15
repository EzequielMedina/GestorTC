import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportarExportarService } from '../../services/importar-exportar.service';
import { TarjetaService } from '../../services/tarjeta';
import { GastoService } from '../../services/gasto';
import { Tarjeta } from '../../models/tarjeta.model';
import { Gasto } from '../../models/gasto.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-importar-exportar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h2>Importar / Exportar</h2>

      <section class="card">
        <h3>Exportar</h3>
        <p class="muted">Descarga un archivo Excel con tus tarjetas y gastos actuales.</p>
        <button type="button" (click)="exportar()">Exportar datos</button>
      </section>

      <section class="card">
        <h3>Importar</h3>
        <p class="muted">Selecciona un archivo Excel compatible para importar tarjetas y gastos. Esto reemplazará los datos actuales.</p>
        <input type="file" (change)="onFileSelected($event)" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
        <div class="actions">
          <button type="button" [disabled]="!archivoSeleccionado" (click)="importar()">Importar</button>
          <button type="button" class="secondary" (click)="limpiarSeleccion()" [disabled]="!archivoSeleccionado">Limpiar selección</button>
        </div>
        <p *ngIf="mensaje" [class.error]="esError" [class.ok]="!esError">{{ mensaje }}</p>
      </section>

      <section class="card">
        <h3>Plantilla</h3>
        <p class="muted">Descarga una plantilla de Excel con las columnas esperadas para facilitar la carga de datos.</p>
        <button type="button" (click)="descargarPlantilla()">Descargar plantilla</button>
      </section>
    </div>
  `,
  styles: `
    :host { --surface: #ffffff; --shadow-sm: 0 1px 2px rgba(0,0,0,0.08); }
    .page { display: grid; gap: 16px; }
    .card { background:  #ffffff; padding: 16px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
    .muted { color: #666; }
    .actions { display: flex; gap: 8px; margin-top: 8px; }
    button { padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; }
    .secondary { background: #eee; }
    .ok { color: #1b5e20; }
    .error { color: #b71c1c; }
  `
})
export class ImportarExportarComponent implements OnInit, OnDestroy {
  archivoSeleccionado: File | null = null;
  mensaje = '';
  esError = false;

  private sub = new Subscription();
  private tarjetas: Tarjeta[] = [];
  private gastos: Gasto[] = [];

  constructor(
    private importarExportarService: ImportarExportarService,
    private tarjetaService: TarjetaService,
    private gastoService: GastoService
  ) {}

  ngOnInit(): void {
    this.sub.add(this.tarjetaService.getTarjetas$().subscribe(t => this.tarjetas = t));
    this.sub.add(this.gastoService.getGastos$().subscribe(g => this.gastos = g));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  exportar(): void {
    try {
      this.importarExportarService.exportarAExcel(this.tarjetas, this.gastos);
      this.setMensaje('Exportación iniciada correctamente.');
    } catch (e) {
      this.setMensaje('Hubo un problema al exportar.', true);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSeleccionado = (input.files && input.files.length) ? input.files[0] : null;
    this.mensaje = '';
  }

  async importar(): Promise<void> {
    if (!this.archivoSeleccionado) return;
    try {
      const { tarjetas, gastos } = await this.importarExportarService.importarDesdeExcel(this.archivoSeleccionado);

      // Reemplazar datos actuales
      this.tarjetaService.reemplazarTarjetas(tarjetas).subscribe();
      this.gastoService.reemplazarGastos(gastos).subscribe();

      this.setMensaje('Datos importados correctamente.');
      this.limpiarSeleccion();
    } catch (error: any) {
      this.setMensaje(error?.message || 'No se pudo importar el archivo.', true);
    }
  }

  descargarPlantilla(): void {
    this.importarExportarService.generarPlantillaExcel();
  }

  limpiarSeleccion(): void {
    this.archivoSeleccionado = null;
    this.mensaje = '';
    this.esError = false;
  }

  private setMensaje(msg: string, error = false): void {
    this.mensaje = msg;
    this.esError = error;
  }
}
