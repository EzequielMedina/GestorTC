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
      <div class="header">
        <h2>Importar / Exportar</h2>
        <p class="subtitle">Gestiona tus datos de tarjetas y gastos</p>
      </div>

      <!-- Exportar -->
      <section class="content-card">
        <div class="card-header">
          <div class="card-icon">📤</div>
          <div class="card-title-section">
            <h3 class="card-title">Exportar Datos</h3>
            <p class="card-description">Descarga un archivo Excel con tus tarjetas y gastos actuales</p>
          </div>
        </div>
        
        <div class="card-content">
          <div class="export-info">
            <div class="info-item">
              <span class="info-label">Tarjetas:</span>
              <span class="info-value">{{ tarjetas.length }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Gastos:</span>
              <span class="info-value">{{ gastos.length }}</span>
            </div>
          </div>
          
          <button class="btn btn-primary export-btn" (click)="exportar()" [disabled]="tarjetas.length === 0 && gastos.length === 0">
            <span class="btn-icon">📊</span>
            <span class="btn-text">Exportar a Excel</span>
          </button>
        </div>
      </section>

      <!-- Importar -->
      <section class="content-card">
        <div class="card-header">
          <div class="card-icon">📥</div>
          <div class="card-title-section">
            <h3 class="card-title">Importar Datos</h3>
            <p class="card-description">Selecciona un archivo Excel compatible para importar tarjetas y gastos</p>
          </div>
        </div>
        
        <div class="card-content">
          <div class="file-upload-area" [class.has-file]="archivoSeleccionado">
            <div class="upload-icon">📁</div>
            <div class="upload-text">
              <span *ngIf="!archivoSeleccionado">Selecciona un archivo Excel</span>
              <span *ngIf="archivoSeleccionado" class="file-name">{{ archivoSeleccionado.name }}</span>
            </div>
            <input 
              type="file" 
              (change)="onFileSelected($event)" 
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              class="file-input"
              id="fileInput"
            />
            <label for="fileInput" class="upload-label">Elegir archivo</label>
          </div>
          
          <div class="import-actions" *ngIf="archivoSeleccionado">
            <button class="btn btn-primary" (click)="importar()">
              <span class="btn-icon">✅</span>
              <span class="btn-text">Importar</span>
            </button>
            <button class="btn btn-outline" (click)="limpiarSeleccion()">
              <span class="btn-icon">❌</span>
              <span class="btn-text">Cancelar</span>
            </button>
          </div>
          
          <div class="warning-box" *ngIf="archivoSeleccionado">
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
              <strong>¡Atención!</strong> La importación reemplazará todos los datos actuales.
            </div>
          </div>
        </div>
      </section>

      <!-- Plantilla -->
      <section class="content-card">
        <div class="card-header">
          <div class="card-icon">📋</div>
          <div class="card-title-section">
            <h3 class="card-title">Descargar Plantilla</h3>
            <p class="card-description">Descarga una plantilla de Excel con las columnas esperadas</p>
          </div>
        </div>
        
        <div class="card-content">
          <div class="template-info">
            <div class="template-features">
              <div class="feature-item">
                <span class="feature-icon">📝</span>
                <span class="feature-text">Columnas predefinidas</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span class="feature-text">Formato correcto</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">💡</span>
                <span class="feature-text">Ejemplos incluidos</span>
              </div>
            </div>
            
            <button class="btn btn-secondary template-btn" (click)="descargarPlantilla()">
              <span class="btn-icon">📥</span>
              <span class="btn-text">Descargar Plantilla</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Mensaje de estado -->
      <div class="message-container" *ngIf="mensaje">
        <div class="message" [class.error]="esError" [class.success]="!esError">
          <div class="message-icon">{{ esError ? '❌' : '✅' }}</div>
          <div class="message-text">{{ mensaje }}</div>
          <button class="message-close" (click)="limpiarMensaje()">×</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      --bg: var(--color1);
      --surface: var(--color2);
      --primary: var(--color3);
      --danger: #dc2626;
      --success: #16a34a;
      --warning: #ca8a04;
      --secondary: #6b7280;
      --border: var(--color5);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.08);
      --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
      --radius: 12px;
      --radius-sm: 8px;
    }

    .page {
      min-height: 100vh;
      background: var(--bg);
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 24px;
      text-align: center;
    }

    .header h2 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
      color: #333;
    }

    .subtitle {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .content-card {
      background: var(--surface);
      border-radius: var(--radius);
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .card-icon {
      font-size: 32px;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary);
      color: white;
      border-radius: 50%;
    }

    .card-title-section {
      flex: 1;
    }

    .card-title {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .card-description {
      margin: 0;
      color: #666;
      font-size: 14px;
      line-height: 1.4;
    }

    .card-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Export section */
    .export-info {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .info-label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }

    .info-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--primary);
    }

    /* File upload */
    .file-upload-area {
      border: 2px dashed var(--border);
      border-radius: var(--radius-sm);
      padding: 32px 20px;
      text-align: center;
      position: relative;
      transition: all 0.2s ease;
      background: var(--bg);
    }

    .file-upload-area:hover {
      border-color: var(--primary);
      background: rgba(37,99,235,0.02);
    }

    .file-upload-area.has-file {
      border-color: var(--success);
      background: rgba(22,163,74,0.02);
    }

    .upload-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .upload-text {
      font-size: 16px;
      color: #666;
      margin-bottom: 16px;
    }

    .file-name {
      color: var(--success);
      font-weight: 600;
    }

    .file-input {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      cursor: pointer;
    }

    .upload-label {
      display: inline-block;
      padding: 8px 16px;
      background: var(--primary);
      color: white;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .upload-label:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }

    /* Import actions */
    .import-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* Warning box */
    .warning-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(202,138,4,0.1);
      border: 1px solid var(--warning);
      border-radius: var(--radius-sm);
    }

    .warning-icon {
      font-size: 20px;
    }

    .warning-text {
      font-size: 14px;
      color: #92400e;
      line-height: 1.4;
    }

    /* Template section */
    .template-info {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .template-features {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .feature-icon {
      font-size: 20px;
    }

    .feature-text {
      font-size: 14px;
      color: #333;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: var(--secondary);
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #4b5563;
    }

    .btn-outline {
      background: transparent;
      color: #666;
      border: 1px solid var(--border);
    }

    .btn-outline:hover:not(:disabled) {
      background: var(--bg);
    }

    .btn-icon {
      font-size: 16px;
    }

    .btn-text {
      font-size: 14px;
    }

    .export-btn, .template-btn {
      align-self: flex-start;
    }

    /* Message container */
    .message-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      max-width: 400px;
    }

    .message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-md);
      animation: slideIn 0.3s ease;
    }

    .message.success {
      background: rgba(22,163,74,0.1);
      border: 1px solid var(--success);
      color: #166534;
    }

    .message.error {
      background: rgba(220,38,38,0.1);
      border: 1px solid var(--danger);
      color: #991b1b;
    }

    .message-icon {
      font-size: 20px;
    }

    .message-text {
      flex: 1;
      font-size: 14px;
      line-height: 1.4;
    }

    .message-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: inherit;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }

    .message-close:hover {
      opacity: 1;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .page {
        padding: 12px;
      }

      .header h2 {
        font-size: 24px;
      }

      .subtitle {
        font-size: 14px;
      }

      .content-card {
        padding: 16px;
        margin-bottom: 16px;
      }

      .card-header {
        flex-direction: column;
        text-align: center;
        gap: 12px;
      }

      .card-icon {
        width: 50px;
        height: 50px;
        font-size: 24px;
      }

      .card-title {
        font-size: 18px;
      }

      .export-info {
        justify-content: center;
        gap: 32px;
      }

      .info-value {
        font-size: 20px;
      }

      .file-upload-area {
        padding: 24px 16px;
      }

      .upload-icon {
        font-size: 36px;
      }

      .upload-text {
        font-size: 14px;
      }

      .import-actions {
        flex-direction: column;
      }

      .btn {
        justify-content: center;
      }

      .template-features {
        gap: 8px;
      }

      .feature-item {
        gap: 8px;
      }

      .feature-icon {
        font-size: 16px;
      }

      .feature-text {
        font-size: 13px;
      }

      .message-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }
    }

    @media (max-width: 480px) {
      .page {
        padding: 8px;
      }

      .header h2 {
        font-size: 20px;
      }

      .content-card {
        padding: 12px;
      }

      .card-icon {
        width: 40px;
        height: 40px;
        font-size: 20px;
      }

      .card-title {
        font-size: 16px;
      }

      .card-description {
        font-size: 13px;
      }

      .export-info {
        gap: 24px;
      }

      .info-value {
        font-size: 18px;
      }

      .file-upload-area {
        padding: 20px 12px;
      }

      .upload-icon {
        font-size: 32px;
      }

      .upload-text {
        font-size: 13px;
      }

      .upload-label {
        padding: 6px 12px;
        font-size: 13px;
      }

      .btn {
        padding: 10px 16px;
        font-size: 13px;
      }

      .btn-icon {
        font-size: 14px;
      }

      .btn-text {
        font-size: 13px;
      }

      .warning-box {
        padding: 12px;
      }

      .warning-text {
        font-size: 13px;
      }

      .feature-text {
        font-size: 12px;
      }
    }
  `
})
export class ImportarExportarComponent implements OnInit, OnDestroy {
  archivoSeleccionado: File | null = null;
  mensaje = '';
  esError = false;

  private sub = new Subscription();
  tarjetas: Tarjeta[] = [];
  gastos: Gasto[] = [];

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
    this.limpiarMensaje();
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
    this.setMensaje('Plantilla descargada correctamente.');
  }

  limpiarSeleccion(): void {
    this.archivoSeleccionado = null;
    this.limpiarMensaje();
  }

  limpiarMensaje(): void {
    this.mensaje = '';
    this.esError = false;
  }

  private setMensaje(msg: string, error = false): void {
    this.mensaje = msg;
    this.esError = error;
    
    // Auto-hide success messages after 5 seconds
    if (!error) {
      setTimeout(() => {
        if (this.mensaje === msg) {
          this.limpiarMensaje();
        }
      }, 5000);
    }
  }
}
