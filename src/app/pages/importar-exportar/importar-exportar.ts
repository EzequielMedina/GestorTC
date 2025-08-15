import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportarExportarService } from '../../services/importar-exportar.service';
import { TarjetaService } from '../../services/tarjeta';
import { GastoService } from '../../services/gasto';
import { Tarjeta } from '../../models/tarjeta.model';
import { Gasto } from '../../models/gasto.model';
import { Subscription } from 'rxjs';

interface ExcelPreview {
  tarjetas: number;
  gastos: number;
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
            <p class="card-description">Descarga un archivo Excel completo con todas tus tarjetas y gastos</p>
          </div>
        </div>
        
        <div class="card-content">
          <div class="export-stats">
            <div class="stat-item">
              <div class="stat-icon">💳</div>
              <div class="stat-info">
                <div class="stat-value">{{ tarjetas.length }}</div>
                <div class="stat-label">Tarjetas</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">💰</div>
              <div class="stat-info">
                <div class="stat-value">{{ gastos.length }}</div>
                <div class="stat-label">Gastos</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">📊</div>
              <div class="stat-info">
                <div class="stat-value">{{ totalGastos | number:'1.0-0' }}</div>
                <div class="stat-label">Total Gastos</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">🤝</div>
              <div class="stat-info">
                <div class="stat-value">{{ gastosCompartidos }}</div>
                <div class="stat-label">Compartidos</div>
              </div>
            </div>
          </div>
          
          <div class="export-features">
            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">📋</span>
                <span class="feature-text">4 hojas de datos</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📅</span>
                <span class="feature-text">Resumen mensual</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">💳</span>
                <span class="feature-text">Detalle de cuotas</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span class="feature-text">Estadísticas completas</span>
              </div>
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
          <!-- File Upload Area -->
          <div class="file-upload-area" [class.has-file]="archivoSeleccionado" [class.dragover]="isDragOver">
            <div class="upload-icon">📁</div>
            <div class="upload-text">
              <span *ngIf="!archivoSeleccionado">Arrastra un archivo Excel aquí o haz clic para seleccionar</span>
              <span *ngIf="archivoSeleccionado" class="file-name">{{ archivoSeleccionado.name }}</span>
            </div>
            <input 
              type="file" 
              (change)="onFileSelected($event)" 
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              class="file-input"
              id="fileInput"
            />
            <label for="fileInput" class="upload-label">Elegir archivo</label>
          </div>
          
          <!-- File Preview -->
          <div class="file-preview" *ngIf="excelPreview">
            <div class="preview-header">
              <h4 class="preview-title">Vista previa del archivo</h4>
              <div class="file-info">
                                 <span class="file-size">{{ excelPreview.tamano }}</span>
                <span class="file-date">{{ excelPreview.fechaModificacion }}</span>
              </div>
            </div>
            
            <div class="preview-stats">
              <div class="preview-stat">
                <div class="preview-stat-icon">💳</div>
                <div class="preview-stat-content">
                  <div class="preview-stat-value">{{ excelPreview.tarjetas }}</div>
                  <div class="preview-stat-label">Tarjetas</div>
                </div>
              </div>
              <div class="preview-stat">
                <div class="preview-stat-icon">💰</div>
                <div class="preview-stat-content">
                  <div class="preview-stat-value">{{ excelPreview.gastos }}</div>
                  <div class="preview-stat-label">Gastos</div>
                </div>
              </div>
              <div class="preview-stat">
                <div class="preview-stat-icon">📊</div>
                <div class="preview-stat-content">
                  <div class="preview-stat-value">{{ excelPreview.totalGastos | number:'1.0-0' }}</div>
                  <div class="preview-stat-label">Total</div>
                </div>
              </div>
              <div class="preview-stat">
                <div class="preview-stat-icon">🤝</div>
                <div class="preview-stat-content">
                  <div class="preview-stat-value">{{ excelPreview.gastosCompartidos }}</div>
                  <div class="preview-stat-label">Compartidos</div>
                </div>
              </div>
            </div>
            
            <div class="preview-details" *ngIf="excelPreview.cuotasPendientes > 0 || excelPreview.mesesConGastos.length > 0">
              <div class="detail-section" *ngIf="excelPreview.cuotasPendientes > 0">
                <div class="detail-title">📅 Cuotas pendientes</div>
                <div class="detail-value">{{ excelPreview.cuotasPendientes }} cuotas en curso</div>
              </div>
              <div class="detail-section" *ngIf="excelPreview.mesesConGastos.length > 0">
                <div class="detail-title">📆 Período de datos</div>
                <div class="detail-value">{{ excelPreview.mesesConGastos[0] }} - {{ excelPreview.mesesConGastos[excelPreview.mesesConGastos.length - 1] }}</div>
              </div>
            </div>
          </div>
          
          <!-- Import Actions -->
          <div class="import-actions" *ngIf="archivoSeleccionado">
            <button class="btn btn-primary" (click)="importar()" [disabled]="importando">
              <span class="btn-icon">{{ importando ? '⏳' : '✅' }}</span>
              <span class="btn-text">{{ importando ? 'Importando...' : 'Importar Datos' }}</span>
            </button>
            <button class="btn btn-outline" (click)="limpiarSeleccion()" [disabled]="importando">
              <span class="btn-icon">❌</span>
              <span class="btn-text">Cancelar</span>
            </button>
          </div>
          
          <!-- Warning Box -->
          <div class="warning-box" *ngIf="archivoSeleccionado">
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
              <div class="warning-title">¡Atención!</div>
              <div class="warning-text">La importación reemplazará todos los datos actuales. Se recomienda hacer una copia de seguridad antes de continuar.</div>
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
            <p class="card-description">Descarga una plantilla de Excel con las columnas esperadas y ejemplos</p>
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
              <div class="feature-item">
                <span class="feature-icon">✅</span>
                <span class="feature-text">Validación automática</span>
              </div>
            </div>
            
            <div class="template-structure">
              <div class="structure-title">Estructura de la plantilla:</div>
              <div class="structure-sheets">
                <div class="sheet-item">
                  <span class="sheet-icon">📋</span>
                  <span class="sheet-name">Tarjetas</span>
                  <span class="sheet-desc">Datos de tarjetas de crédito</span>
                </div>
                <div class="sheet-item">
                  <span class="sheet-icon">💰</span>
                  <span class="sheet-name">Gastos</span>
                  <span class="sheet-desc">Registro de gastos y cuotas</span>
                </div>
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
      max-width: 1000px;
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
      gap: 20px;
    }

    /* Export section */
    .export-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 16px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--bg);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }

    .stat-icon {
      font-size: 24px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary);
      color: white;
      border-radius: 50%;
    }

    .stat-info {
      flex: 1;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #333;
      line-height: 1;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }

    .export-features {
      background: var(--bg);
      border-radius: var(--radius-sm);
      padding: 16px;
      border: 1px solid var(--border);
    }

    .feature-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .feature-icon {
      font-size: 16px;
    }

    .feature-text {
      font-size: 14px;
      color: #333;
    }

    /* File upload */
    .file-upload-area {
      border: 2px dashed var(--border);
      border-radius: var(--radius-sm);
      padding: 40px 20px;
      text-align: center;
      position: relative;
      transition: all 0.3s ease;
      background: var(--bg);
      cursor: pointer;
    }

    .file-upload-area:hover {
      border-color: var(--primary);
      background: rgba(37,99,235,0.02);
    }

    .file-upload-area.dragover {
      border-color: var(--success);
      background: rgba(22,163,74,0.05);
      transform: scale(1.02);
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

    /* File preview */
    .file-preview {
      background: var(--bg);
      border-radius: var(--radius-sm);
      padding: 20px;
      border: 1px solid var(--border);
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .preview-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .file-info {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: #666;
    }

    .preview-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .preview-stat {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: var(--surface);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }

    .preview-stat-icon {
      font-size: 16px;
    }

    .preview-stat-content {
      flex: 1;
    }

    .preview-stat-value {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      line-height: 1;
    }

    .preview-stat-label {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }

    .preview-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .detail-section:last-child {
      border-bottom: none;
    }

    .detail-title {
      font-size: 13px;
      color: #666;
    }

    .detail-value {
      font-size: 13px;
      font-weight: 500;
      color: #333;
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
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: rgba(202,138,4,0.1);
      border: 1px solid var(--warning);
      border-radius: var(--radius-sm);
    }

    .warning-icon {
      font-size: 20px;
      margin-top: 2px;
    }

    .warning-content {
      flex: 1;
    }

    .warning-title {
      font-size: 14px;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 4px;
    }

    .warning-text {
      font-size: 13px;
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
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .template-structure {
      background: var(--bg);
      border-radius: var(--radius-sm);
      padding: 16px;
      border: 1px solid var(--border);
    }

    .structure-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
    }

    .structure-sheets {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sheet-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }

    .sheet-icon {
      font-size: 16px;
    }

    .sheet-name {
      font-size: 14px;
      font-weight: 500;
      color: #333;
      min-width: 80px;
    }

    .sheet-desc {
      font-size: 13px;
      color: #666;
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

      .export-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .stat-item {
        padding: 12px;
      }

      .stat-icon {
        width: 32px;
        height: 32px;
        font-size: 18px;
      }

      .stat-value {
        font-size: 16px;
      }

      .feature-list {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .file-upload-area {
        padding: 32px 16px;
      }

      .upload-icon {
        font-size: 36px;
      }

      .upload-text {
        font-size: 14px;
      }

      .preview-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .preview-stat {
        padding: 8px;
      }

      .import-actions {
        flex-direction: column;
      }

      .btn {
        justify-content: center;
      }

      .template-features {
        grid-template-columns: 1fr;
        gap: 8px;
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

      .export-stats {
        grid-template-columns: 1fr;
      }

      .stat-item {
        padding: 10px;
      }

      .stat-icon {
        width: 28px;
        height: 28px;
        font-size: 16px;
      }

      .stat-value {
        font-size: 14px;
      }

      .file-upload-area {
        padding: 24px 12px;
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

      .preview-stats {
        grid-template-columns: 1fr;
      }

      .preview-stat {
        padding: 6px;
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

      .warning-title {
        font-size: 13px;
      }

      .warning-text {
        font-size: 12px;
      }

      .feature-text {
        font-size: 12px;
      }

      .sheet-name {
        min-width: 60px;
        font-size: 13px;
      }

      .sheet-desc {
        font-size: 12px;
      }
    }
  `
})
export class ImportarExportarComponent implements OnInit, OnDestroy {
  archivoSeleccionado: File | null = null;
  mensaje = '';
  esError = false;
  importando = false;
  isDragOver = false;
  excelPreview: ExcelPreview | null = null;

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

  get totalGastos(): number {
    return this.gastos.reduce((total, gasto) => total + gasto.monto, 0);
  }

  get gastosCompartidos(): number {
    return this.gastos.filter(g => g.compartidoCon).length;
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
    const file = input.files?.[0];
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

  private async procesarArchivo(file: File): Promise<void> {
    this.archivoSeleccionado = file;
    this.limpiarMensaje();
    
    try {
      // Generar preview del archivo
      const { tarjetas, gastos } = await this.importarExportarService.importarDesdeExcel(file);
      
             this.excelPreview = {
         tarjetas: tarjetas.length,
         gastos: gastos.length,
         totalGastos: gastos.reduce((total, g) => total + g.monto, 0),
         gastosCompartidos: gastos.filter(g => g.compartidoCon).length,
         cuotasPendientes: gastos.filter(g => (g.cantidadCuotas || 1) > 1).length,
         mesesConGastos: this.obtenerMesesConGastos(gastos),
         archivo: file,
         nombre: file.name,
         tamano: this.formatearTamaño(file.size),
         fechaModificacion: new Date(file.lastModified).toLocaleDateString()
       };
      
    } catch (error: any) {
      this.setMensaje(error?.message || 'No se pudo procesar el archivo.', true);
      this.archivoSeleccionado = null;
      this.excelPreview = null;
    }
  }

  private obtenerMesesConGastos(gastos: Gasto[]): string[] {
    const meses = new Set<string>();
    
    gastos.forEach(gasto => {
      // Mes del gasto original
      const mesGasto = gasto.fecha.slice(0, 7);
      meses.add(mesGasto);
      
      // Meses de las cuotas si aplica
      if (gasto.cantidadCuotas && gasto.cantidadCuotas > 1) {
        const primerMes = gasto.primerMesCuota?.slice(0, 7) || mesGasto;
        const [year, month] = primerMes.split('-').map(Number);
        
        for (let i = 0; i < gasto.cantidadCuotas; i++) {
          const fecha = new Date(year, month - 1 + i, 1);
          const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
          meses.add(mesKey);
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

  async importar(): Promise<void> {
    if (!this.archivoSeleccionado || !this.excelPreview) return;
    
    this.importando = true;
    try {
      const { tarjetas, gastos } = await this.importarExportarService.importarDesdeExcel(this.archivoSeleccionado);

      // Reemplazar datos actuales
      this.tarjetaService.reemplazarTarjetas(tarjetas).subscribe();
      this.gastoService.reemplazarGastos(gastos).subscribe();

      this.setMensaje(`Importación exitosa: ${tarjetas.length} tarjetas y ${gastos.length} gastos importados.`);
      this.limpiarSeleccion();
    } catch (error: any) {
      this.setMensaje(error?.message || 'No se pudo importar el archivo.', true);
    } finally {
      this.importando = false;
    }
  }

  descargarPlantilla(): void {
    this.importarExportarService.generarPlantillaExcel();
    this.setMensaje('Plantilla descargada correctamente.');
  }

  limpiarSeleccion(): void {
    this.archivoSeleccionado = null;
    this.excelPreview = null;
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
