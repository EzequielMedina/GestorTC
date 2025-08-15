import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tarjeta } from '../../models/tarjeta.model';
import { TarjetaService } from '../../services/tarjeta';

@Component({
  selector: 'app-tarjetas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="header">
        <h2>Tarjetas de Crédito</h2>
        <p class="subtitle">Gestiona tus tarjetas de crédito</p>
        <button class="btn btn-primary add-btn" (click)="agregarTarjeta()">
          <span class="btn-icon">➕</span>
          <span class="btn-text">Agregar Tarjeta</span>
        </button>
      </div>

      <!-- Listado de tarjetas -->
      <section class="content-card">
        <h3 class="card-title">Mis Tarjetas</h3>
        
        <!-- Loading state -->
        <div *ngIf="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">Cargando tarjetas...</div>
        </div>

        <!-- Empty state -->
        <div *ngIf="!loading && tarjetas.length === 0" class="empty-state">
          <div class="empty-icon">💳</div>
          <div class="empty-text">No hay tarjetas registradas</div>
          <div class="empty-subtext">¡Agrega tu primera tarjeta para comenzar!</div>
        </div>

        <!-- Lista de tarjetas -->
        <div *ngIf="!loading && tarjetas.length > 0" class="tarjetas-grid">
          <div class="tarjeta-card" *ngFor="let tarjeta of tarjetas">
            <div class="tarjeta-header">
              <div class="tarjeta-icon">💳</div>
              <div class="tarjeta-actions">
                <button class="btn-action btn-edit" (click)="editarTarjeta(tarjeta)" title="Editar">
                  <span class="action-icon">✏️</span>
                </button>
                <button class="btn-action btn-delete" (click)="eliminarTarjeta(tarjeta)" title="Eliminar">
                  <span class="action-icon">🗑️</span>
                </button>
              </div>
            </div>
            
            <div class="tarjeta-content">
              <div class="tarjeta-nombre">{{ tarjeta.nombre }}</div>
              <div class="tarjeta-banco">{{ tarjeta.banco }}</div>
              
              <div class="tarjeta-details">
                <div class="detail-item">
                  <span class="detail-label">Límite:</span>
                  <span class="detail-value">{{ tarjeta.limite | number:'1.0-0' }}</span>
                </div>
                
                <div class="detail-item" *ngIf="tarjeta.ultimosDigitos">
                  <span class="detail-label">Últimos dígitos:</span>
                  <span class="detail-value">****{{ tarjeta.ultimosDigitos }}</span>
                </div>
                
                <div class="detail-item">
                  <span class="detail-label">Día de cierre:</span>
                  <span class="detail-value">{{ tarjeta.diaCierre }}</span>
                </div>
                
                <div class="detail-item">
                  <span class="detail-label">Día de vencimiento:</span>
                  <span class="detail-value">{{ tarjeta.diaVencimiento }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: `
    :host {
      --bg: var(--color1);
      --surface: var(--color2);
      --primary: var(--color3);
      --danger: #dc2626;
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
      max-width: 1200px;
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
      margin: 0 0 20px 0;
      color: #666;
      font-size: 16px;
    }

    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: var(--shadow-sm);
    }

    .add-btn:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .btn-icon {
      font-size: 18px;
    }

    .btn-text {
      font-size: 16px;
    }

    .content-card {
      background: var(--surface);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border);
    }

    .card-title {
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 8px;
    }

    /* Loading state */
    .loading-state {
      text-align: center;
      padding: 40px 20px;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border);
      border-top: 4px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    .loading-text {
      color: #666;
      font-size: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .empty-text {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }

    .empty-subtext {
      font-size: 16px;
      color: #666;
    }

    /* Grid de tarjetas */
    .tarjetas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .tarjeta-card {
      background: var(--bg);
      border-radius: var(--radius-sm);
      padding: 20px;
      border: 1px solid var(--border);
      transition: all 0.2s ease;
      position: relative;
    }

    .tarjeta-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .tarjeta-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .tarjeta-icon {
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

    .tarjeta-actions {
      display: flex;
      gap: 8px;
    }

    .btn-action {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      background: var(--surface);
      border: 1px solid var(--border);
    }

    .btn-action:hover {
      transform: scale(1.1);
    }

    .btn-edit:hover {
      background: var(--primary);
      color: white;
    }

    .btn-delete:hover {
      background: var(--danger);
      color: white;
    }

    .action-icon {
      font-size: 16px;
    }

    .tarjeta-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .tarjeta-nombre {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .tarjeta-banco {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    .tarjeta-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-label {
      font-size: 13px;
      color: #666;
      font-weight: 500;
    }

    .detail-value {
      font-size: 14px;
      color: #333;
      font-weight: 600;
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

      .add-btn {
        padding: 10px 20px;
        font-size: 14px;
      }

      .content-card {
        padding: 16px;
      }

      .card-title {
        font-size: 18px;
        margin-bottom: 16px;
      }

      .tarjetas-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .tarjeta-card {
        padding: 16px;
      }

      .tarjeta-icon {
        width: 50px;
        height: 50px;
        font-size: 24px;
      }

      .tarjeta-nombre {
        font-size: 16px;
      }

      .tarjeta-banco {
        font-size: 13px;
      }

      .detail-item {
        padding: 6px 0;
      }

      .detail-label {
        font-size: 12px;
      }

      .detail-value {
        font-size: 13px;
      }
    }

    @media (max-width: 480px) {
      .page {
        padding: 8px;
      }

      .header h2 {
        font-size: 20px;
      }

      .add-btn {
        padding: 8px 16px;
        font-size: 13px;
      }

      .btn-icon {
        font-size: 16px;
      }

      .btn-text {
        font-size: 14px;
      }

      .content-card {
        padding: 12px;
      }

      .card-title {
        font-size: 16px;
      }

      .tarjeta-card {
        padding: 12px;
      }

      .tarjeta-header {
        margin-bottom: 12px;
      }

      .tarjeta-icon {
        width: 40px;
        height: 40px;
        font-size: 20px;
      }

      .btn-action {
        width: 32px;
        height: 32px;
      }

      .action-icon {
        font-size: 14px;
      }

      .tarjeta-content {
        gap: 8px;
      }

      .tarjeta-details {
        gap: 6px;
      }

      .detail-item {
        padding: 4px 0;
      }
    }
  `
})
export class TarjetasComponent implements OnInit {
  
  // Datos de la tabla
  tarjetas: Tarjeta[] = [];
  
  // Estado de carga
  loading = false;

  constructor(
    private tarjetaService: TarjetaService
  ) {}

  ngOnInit(): void {
    this.cargarTarjetas();
  }

  cargarTarjetas(): void {
    this.loading = true;
    this.tarjetaService.getTarjetas$().subscribe({
      next: (tarjetas: Tarjeta[]) => {
        this.tarjetas = tarjetas;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar tarjetas:', error);
        this.loading = false;
      }
    });
  }

  agregarTarjeta(): void {
    // Por ahora solo mostrar un mensaje, luego se puede implementar un modal
    alert('Función de agregar tarjeta - Se implementará con un modal');
  }

  editarTarjeta(tarjeta: Tarjeta): void {
    // Por ahora solo mostrar un mensaje, luego se puede implementar un modal
    alert(`Editar tarjeta: ${tarjeta.nombre}`);
  }

  eliminarTarjeta(tarjeta: Tarjeta): void {
    if (confirm(`¿Estás seguro de que deseas eliminar la tarjeta ${tarjeta.nombre}?`)) {
      this.tarjetaService.eliminarTarjeta(tarjeta.id).subscribe({
        next: () => {
          this.cargarTarjetas();
          alert('Tarjeta eliminada correctamente');
        },
        error: (error) => {
          console.error('Error al eliminar tarjeta:', error);
          alert('Error al eliminar la tarjeta');
        }
      });
    }
  }
}
