import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResumenService, ResumenPersona, ResumenTarjeta } from '../../services/resumen.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="header">
        <div class="header-content">
          <h2>📊 Resumen</h2>
          <p class="subtitle">Vista general de tus gastos y tarjetas</p>
        </div>
        <!-- Navegación mensual -->
        <div class="month-nav">
          <button class="btn-nav" (click)="prevMonth()" aria-label="Mes anterior">
            <span class="nav-icon">◀</span>
          </button>
          <div class="month-label">{{ monthLabel }}</div>
          <button class="btn-nav" (click)="nextMonth()" aria-label="Mes siguiente">
            <span class="nav-icon">▶</span>
          </button>
        </div>
      </div>

      <!-- Totales del mes seleccionado -->
      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
          <div class="stat-label">Total del mes</div>
          <div class="stat-value">{{ ((totalDelMes$ | async) ?? 0) | number:'1.2-2' }}</div>
        </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💳</div>
          <div class="stat-content">
          <div class="stat-label">Límite Total</div>
          <div class="stat-value">{{ ((limiteTotal$ | async) ?? 0) | number:'1.0-0' }}</div>
        </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
          <div class="stat-label">Uso del mes</div>
          <div class="stat-value">{{ ((porcentajeUsoTotalMes$ | async) ?? 0) | number:'1.0-2' }}%</div>
          </div>
        </div>
      </section>

      <!-- Resumen por tarjeta del mes -->
      <section class="content-card">
        <div class="card-header">
          <h3 class="card-title">Por Tarjeta - {{ monthLabel }}</h3>
          <button class="section-toggle-btn" (click)="toggleSeccionCompleta('resumenTarjetas')" 
                  [attr.aria-label]="isSeccionExpandida('resumenTarjetas') ? 'Colapsar sección' : 'Expandir sección'">
            <span class="expand-icon" [class.expanded]="isSeccionExpandida('resumenTarjetas')">▼</span>
          </button>
        </div>
        <div class="mobile-table" *ngIf="isSeccionExpandida('resumenTarjetas') && (resumenTarjetasMes$ | async) as tarjetas; else resumenTarjetas">
          <div class="mobile-row" *ngFor="let t of tarjetas">
            <div class="row-header">
              <div class="card-name">{{ t.nombre }}</div>
              <div class="card-limit">Límite: {{ t.limite | number:'1.0-0' }}</div>
            </div>
            <div class="row-stats">
              <div class="stat-item">
                <span class="stat-label">Total General:</span>
                <span class="stat-value">{{ t.totalGastos | number:'1.2-2' }}</span>
              </div>
              <div class="stat-item highlight">
                <span class="stat-label">Este Mes:</span>
                <span class="stat-value">{{ t.totalMes | number:'1.2-2' }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Uso del Mes:</span>
                <span class="stat-value">{{ t.porcentajeUso | number:'1.0-2' }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Disponible:</span>
                <span class="stat-value">{{ t.saldoDisponible | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
          <div *ngIf="tarjetas.length === 0" class="empty-state">
            <div class="empty-icon">💳</div>
            <div class="empty-text">Sin datos de tarjetas</div>
          </div>
        </div>
      </section>

      <!-- Detalle de gastos agrupados por tarjeta del mes -->
      <section class="content-card">
        <div class="card-header">
          <h3 class="card-title">Detalle de Gastos - {{ monthLabel }}</h3>
          <div class="card-controls">
            <div class="tarjeta-controls" *ngIf="isSeccionExpandida('detalleGastos')">
              <button class="control-btn" (click)="expandirTodasTarjetas()" title="Expandir todas las tarjetas">
                <span class="control-icon">📂</span>
              </button>
              <button class="control-btn" (click)="colapsarTodasTarjetas()" title="Colapsar todas las tarjetas">
                <span class="control-icon">📁</span>
              </button>
            </div>
            <button class="section-toggle-btn" (click)="toggleSeccionCompleta('detalleGastos')" 
                    [attr.aria-label]="isSeccionExpandida('detalleGastos') ? 'Colapsar sección' : 'Expandir sección'">
              <span class="expand-icon" [class.expanded]="isSeccionExpandida('detalleGastos')">▼</span>
            </button>
          </div>
        </div>
        <div class="mobile-table" *ngIf="isSeccionExpandida('detalleGastos') && (detalleGastosAgrupadosMes$ | async) as detalleAgrupado; else resumenDetalleGastos">
          <div class="tarjeta-group" *ngFor="let grupo of detalleAgrupado">
            <!-- Header de la tarjeta -->
             <div class="tarjeta-header" (click)="toggleTarjetaExpansion(grupo.nombreTarjeta)">
               <div class="tarjeta-info">
                 <div class="card-name">{{ grupo.nombreTarjeta }}</div>
                 <div class="tarjeta-stats">
                   <div class="tarjeta-total">Total: {{ grupo.totalTarjeta | number:'1.2-2' }}</div>
                   <div class="tarjeta-contadores">
                     <span class="contador-gastos">{{ grupo.cantidadGastos }} gastos</span>
                     <span class="contador-ultimas" *ngIf="grupo.gastosUltimaCuota > 0">
                       • {{ grupo.gastosUltimaCuota }} última{{ grupo.gastosUltimaCuota > 1 ? 's' : '' }} cuota{{ grupo.gastosUltimaCuota > 1 ? 's' : '' }}
                     </span>
                   </div>
                 </div>
               </div>
               <div class="expand-icon" [class.expanded]="isTarjetaExpandida(grupo.nombreTarjeta)">
                 ▼
               </div>
             </div>
            
            <!-- Gastos de la tarjeta (colapsables) -->
            <div class="tarjeta-gastos" *ngIf="isTarjetaExpandida(grupo.nombreTarjeta)">
              <div class="mobile-row gasto-item" *ngFor="let gasto of grupo.gastos">
                <div class="row-header">
                  <div class="gasto-descripcion">{{ gasto.descripcion }}</div>
                  <div class="cuota-info">{{ gasto.cuotaActual }}/{{ gasto.cantidadCuotas }}</div>
                </div>
                <div class="row-content">
                  <div class="gasto-stats">
                    <div class="stat-item">
                      <span class="stat-label">Monto Original:</span>
                      <span class="stat-value">{{ gasto.montoOriginal | number:'1.2-2' }}</span>
                    </div>
                    <div class="stat-item highlight">
                      <span class="stat-label">Monto Cuota:</span>
                      <span class="stat-value">{{ gasto.montoCuota | number:'1.2-2' }}</span>
                    </div>
                    <div class="stat-item" *ngIf="gasto.compartidoCon">
                      <span class="stat-label">Compartido:</span>
                      <span class="stat-value compartido">{{ gasto.compartidoCon }} ({{ gasto.porcentajeCompartido }}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="detalleAgrupado.length === 0" class="empty-state">
            <div class="empty-icon">📝</div>
            <div class="empty-text">No hay gastos para este mes</div>
          </div>
        </div>
      </section>

      <!-- Detalle de gastos compartidos del mes -->
      <section class="content-card">
        <div class="card-header">
          <h3 class="card-title">Gastos Compartidos - {{ monthLabel }}</h3>
          <button class="section-toggle-btn" (click)="toggleSeccionCompleta('gastosCompartidos')" 
                  [attr.aria-label]="isSeccionExpandida('gastosCompartidos') ? 'Colapsar sección' : 'Expandir sección'">
            <span class="expand-icon" [class.expanded]="isSeccionExpandida('gastosCompartidos')">▼</span>
          </button>
        </div>
        <div class="mobile-table" *ngIf="isSeccionExpandida('gastosCompartidos') && (detalleGastosCompartidosMes$ | async) as detalle; else resumenGastosCompartidos">
          <div class="mobile-row compartido-row" *ngFor="let item of detalle">
            <div class="row-header">
              <div class="gasto-descripcion">{{ item.descripcion }}</div>
              <div class="compartido-badge">{{ item.compartidoCon }}</div>
            </div>
            <div class="row-content">
              <div class="compartido-stats">
                <div class="stat-item">
                  <span class="stat-label">Cuota del Mes:</span>
                  <span class="stat-value highlight">{{ item.montoCuota | number:'1.2-2' }}</span>
                </div>
                <div class="stat-item pos">
                  <span class="stat-label">Te Debe:</span>
                  <span class="stat-value">{{ item.montoCompartido | number:'1.2-2' }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Porcentaje:</span>
                  <span class="stat-value">{{ item.porcentajeCompartido }}%</span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="detalle.length === 0" class="empty-state">
            <div class="empty-icon">🤝</div>
            <div class="empty-text">No hay gastos compartidos este mes</div>
          </div>
        </div>
        
        <!-- Resumen simple -->
        <div class="resumen-simple" *ngIf="isSeccionExpandida('gastosCompartidos') && (detalleGastosCompartidosMes$ | async) as detalle">
          <h4 class="resumen-title">Resumen por gasto:</h4>
          <div class="resumen-item" *ngFor="let item of detalle">
            <div class="resumen-texto">
              <strong>{{ item.descripcion }}</strong>: La cuota es de <strong>{{ item.montoCuota | number:'1.2-2' }}</strong> 
              y <strong>{{ item.compartidoCon }}</strong> te debe <strong>{{ item.montoCompartido | number:'1.2-2' }}</strong>
            </div>
          </div>
        </div>

        <!-- Total por persona -->
        <div class="total-por-persona" *ngIf="isSeccionExpandida('gastosCompartidos') && (totalPorPersona$ | async) as totales">
          <h4 class="total-title">Total que te debe cada persona:</h4>
          <div class="total-item" *ngFor="let total of totales">
            <span class="total-nombre">{{ total.persona }}</span>
            <span class="total-monto pos">{{ total.total | number:'1.2-2' }}</span>
          </div>
          <div *ngIf="totales.length === 0" class="empty-state">
            <div class="empty-icon">✅</div>
            <div class="empty-text">No hay deudas pendientes este mes</div>
          </div>
        </div>
      </section>

      <!-- Resumen general (totales históricos) -->
      <section class="content-card">
        <div class="card-header">
          <h3 class="card-title">Resumen General (Todos los Gastos)</h3>
          <button class="section-toggle-btn" (click)="toggleSeccionCompleta('resumenGeneral')" 
                  [attr.aria-label]="isSeccionExpandida('resumenGeneral') ? 'Colapsar sección' : 'Expandir sección'">
            <span class="expand-icon" [class.expanded]="isSeccionExpandida('resumenGeneral')">▼</span>
          </button>
        </div>
        <div class="mobile-table" *ngIf="isSeccionExpandida('resumenGeneral') && (resumenTarjetasGeneral$ | async) as tarjetas; else resumenGeneral">
          <div class="mobile-row" *ngFor="let t of tarjetas">
            <div class="row-header">
              <div class="card-name">{{ t.nombre }}</div>
              <div class="card-limit">Límite: {{ t.limite | number:'1.0-0' }}</div>
            </div>
            <div class="row-stats">
              <div class="stat-item">
                <span class="stat-label">Total Gastos:</span>
                <span class="stat-value">{{ t.totalGastos | number:'1.2-2' }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Uso Total:</span>
                <span class="stat-value">{{ t.porcentajeUso | number:'1.0-2' }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Disponible:</span>
                <span class="stat-value">{{ t.saldoDisponible | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
          <div *ngIf="tarjetas.length === 0" class="empty-state">
            <div class="empty-icon">💳</div>
            <div class="empty-text">Sin datos de tarjetas</div>
          </div>
        </div>
      </section>

      <ng-template #cargando>
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">Cargando...</div>
        </div>
      </ng-template>

      <ng-template #resumenTarjetas>
        <div class="summary-preview">
          <div class="summary-icon">💳</div>
          <div class="summary-text">
            <div class="summary-title">Vista rápida de tarjetas</div>
            <div class="summary-stats">
              <span class="summary-stat">Total del mes: {{ ((totalDelMes$ | async) ?? 0) | number:'1.2-2' }}</span>
              <span class="summary-stat">Uso: {{ ((porcentajeUsoTotalMes$ | async) ?? 0) | number:'1.0-2' }}%</span>
            </div>
          </div>
        </div>
      </ng-template>

      <ng-template #resumenDetalleGastos>
        <div class="summary-preview">
          <div class="summary-icon">📝</div>
          <div class="summary-text">
            <div class="summary-title">Gastos detallados del mes</div>
            <div class="summary-stats" *ngIf="(detalleGastosAgrupadosMes$ | async) as detalle">
              <span class="summary-stat">{{ detalle.length }} tarjetas con gastos</span>
              <span class="summary-stat">Total: {{ ((totalDelMes$ | async) ?? 0) | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>
      </ng-template>

      <ng-template #resumenGastosCompartidos>
        <div class="summary-preview">
          <div class="summary-icon">🤝</div>
          <div class="summary-text">
            <div class="summary-title">Gastos compartidos</div>
            <div class="summary-stats" *ngIf="(detalleGastosCompartidosMes$ | async) as detalle">
              <span class="summary-stat">{{ detalle.length }} gastos compartidos</span>
              <span class="summary-stat" *ngIf="(totalPorPersona$ | async) as totales">{{ totales.length }} personas te deben</span>
            </div>
          </div>
        </div>
      </ng-template>

      <ng-template #resumenGeneral>
        <div class="summary-preview">
          <div class="summary-icon">📊</div>
          <div class="summary-text">
            <div class="summary-title">Resumen histórico</div>
            <div class="summary-stats" *ngIf="(resumenTarjetasGeneral$ | async) as tarjetas">
              <span class="summary-stat">{{ tarjetas.length }} tarjetas registradas</span>
              <span class="summary-stat">Límite total: {{ ((limiteTotal$ | async) ?? 0) | number:'1.0-0' }}</span>
            </div>
          </div>
        </div>
      </ng-template>
    </div>
  `,
  styles: `
    :host {
      --bg: var(--color1);
      --surface: var(--color2);
      --primary: var(--color3);
      --border: var(--color5);
      --pos: #1b5e20;
      --neg: #b71c1c;
      --highlight: #1976d2;
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
      margin-bottom: var(--spacing-xl);
      padding: var(--spacing-xl);
      background: var(--primary-gradient);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      position: relative;
      overflow: hidden;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-lg);
    }

    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
      pointer-events: none;
    }

    .header-content {
      flex: 1;
      text-align: left;
      position: relative;
      z-index: 1;
    }

    .header h2 {
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-4xl);
      font-weight: var(--font-weight-bold);
      color: var(--text-inverse);
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .subtitle {
      margin: 0;
      color: rgba(255, 255, 255, 0.95);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-medium);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .month-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-md);
      position: relative;
      z-index: 1;
    }

    .btn-nav {
      width: 48px;
      height: 48px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      color: var(--text-inverse);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-base);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .btn-nav:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }

    .btn-nav:active {
      transform: scale(0.95);
    }

    .nav-icon {
      font-size: 18px;
      font-weight: bold;
    }

    .month-label {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      color: var(--text-inverse);
      min-width: 200px;
      text-align: center;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: var(--spacing-sm) var(--spacing-md);
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: var(--surface);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 16px;
      transition: transform 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .stat-icon {
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

    .stat-content {
      flex: 1;
    }

    .stat-label {
      color: #666;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #333;
    }

    .content-card {
       background: var(--surface);
       border-radius: var(--radius);
       padding: 20px;
       margin-bottom: 20px;
       box-shadow: var(--shadow-sm);
       border: 1px solid var(--border);
     }

     .card-header {
       display: flex;
       justify-content: space-between;
       align-items: center;
       margin-bottom: 16px;
     }

     .card-controls {
       display: flex;
       align-items: center;
       gap: 8px;
     }

     .tarjeta-controls {
       display: flex;
       gap: 4px;
       margin-right: 8px;
     }

     .control-btn {
       width: 32px;
       height: 32px;
       border: 1px solid var(--border);
       border-radius: 6px;
       background: var(--surface);
       cursor: pointer;
       display: flex;
       align-items: center;
       justify-content: center;
       transition: all 0.2s ease;
       font-size: 14px;
     }

     .control-btn:hover {
       background: var(--primary);
       color: white;
       transform: scale(1.05);
     }

     .section-toggle-btn {
       width: 36px;
       height: 36px;
       border: 2px solid var(--border);
       border-radius: 50%;
       background: var(--surface);
       cursor: pointer;
       display: flex;
       align-items: center;
       justify-content: center;
       transition: all 0.2s ease;
       box-shadow: var(--shadow-sm);
     }

     .section-toggle-btn:hover {
       background: var(--primary);
       color: white;
       transform: scale(1.05);
     }

     .section-toggle-btn .expand-icon {
       font-size: 14px;
       font-weight: bold;
       transition: transform 0.3s ease;
       color: var(--primary);
     }

     .section-toggle-btn:hover .expand-icon {
       color: white;
     }

     .section-toggle-btn .expand-icon.expanded {
       transform: rotate(180deg);
     }

    .card-title {
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 8px;
    }

    .mobile-table {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .mobile-row {
      background: var(--bg);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      border: 1px solid var(--border);
      transition: transform 0.2s ease;
    }

    .mobile-row:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }

    .compartido-row {
      border-left: 4px solid var(--primary);
    }

    .row-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .card-name {
      font-weight: 600;
      font-size: 16px;
      color: #333;
    }

    .card-limit {
      font-size: 14px;
      color: #666;
      background: var(--surface);
      padding: 4px 8px;
      border-radius: 4px;
    }

    .cuota-info {
      font-size: 14px;
      color: var(--primary);
      font-weight: 600;
      background: rgba(25, 118, 210, 0.1);
      padding: 4px 8px;
      border-radius: 4px;
    }

    .compartido-badge {
      font-size: 12px;
      color: white;
      background: var(--primary);
      padding: 4px 8px;
      border-radius: 12px;
      font-weight: 500;
    }

    .row-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gasto-descripcion {
      font-weight: 500;
      color: #333;
      font-size: 15px;
    }

    .gasto-stats, .compartido-stats, .row-stats {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .stat-item:last-child {
      border-bottom: none;
    }

    .stat-item .stat-label {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    .stat-item .stat-value {
      font-size: 15px;
      font-weight: 600;
      color: #333;
    }

    .stat-item.highlight .stat-value {
      color: var(--highlight);
      font-weight: 700;
    }

    .stat-item.pos .stat-value {
      color: var(--pos);
      font-weight: 700;
    }

    .compartido {
       color: var(--primary);
       font-size: 13px;
     }

     .tarjeta-group {
        margin-bottom: 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        overflow: hidden;
        background: var(--bg);
        box-shadow: var(--shadow-sm);
      }

     .tarjeta-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--surface);
        cursor: pointer;
        transition: background-color 0.2s ease;
        border-bottom: 1px solid var(--border);
        min-height: 60px;
      }

     .tarjeta-header:hover {
       background: var(--primary);
       color: white;
     }

     .tarjeta-header:hover .card-name,
      .tarjeta-header:hover .tarjeta-total,
      .tarjeta-header:hover .tarjeta-contadores {
        color: white;
      }

      .tarjeta-header:hover .contador-ultimas {
        color: #c8e6c9;
      }

     .tarjeta-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }

      .tarjeta-stats {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .tarjeta-total {
        font-size: 14px;
        font-weight: 600;
        color: var(--highlight);
      }

      .tarjeta-contadores {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #666;
      }

      .contador-gastos {
        font-weight: 500;
      }

      .contador-ultimas {
        color: var(--pos);
        font-weight: 500;
      }

     .expand-icon {
       font-size: 16px;
       font-weight: bold;
       transition: transform 0.3s ease;
       color: var(--primary);
     }

     .expand-icon.expanded {
       transform: rotate(180deg);
     }

     .tarjeta-header:hover .expand-icon {
       color: white;
     }

     .tarjeta-gastos {
       padding: 0;
       background: var(--bg);
     }

     .gasto-item {
        margin: 0;
        border-radius: 0;
        border: none;
        border-bottom: 1px solid var(--border);
        background: var(--surface);
        padding: 10px 16px;
      }

      .gasto-item:last-child {
        border-bottom: none;
      }

      .gasto-item:hover {
        transform: none;
        box-shadow: none;
        background: var(--bg);
      }

      .gasto-item .row-header {
        margin-bottom: 8px;
      }

      .gasto-item .gasto-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 8px;
      }

      .gasto-item .stat-item {
        margin-bottom: 0;
      }

     .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-text {
      font-size: 16px;
      font-weight: 500;
    }

    .resumen-simple {
      margin-top: 20px;
      padding: 16px;
      background: var(--bg);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }

    .resumen-title {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .resumen-item {
      margin-bottom: 12px;
      padding: 12px;
      background: var(--surface);
      border-radius: var(--radius-sm);
      border-left: 3px solid var(--primary);
    }

    .resumen-texto {
      line-height: 1.5;
      font-size: 14px;
    }

    .total-por-persona {
      margin-top: 20px;
      padding: 16px;
      background: var(--bg);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }

    .total-title {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .total-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 12px;
      background: var(--surface);
      border-radius: var(--radius-sm);
      border-left: 3px solid var(--pos);
    }

    .total-nombre {
      font-weight: 600;
      font-size: 16px;
      color: #333;
    }

    .total-monto {
      font-size: 18px;
      font-weight: 700;
    }

    .summary-preview {
      display: flex;
      align-items: center;
      padding: 20px;
      background: var(--surface);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      margin: 12px 0;
      transition: all 0.2s ease;
    }

    .summary-preview:hover {
      background: var(--bg);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }

    .summary-icon {
      font-size: 32px;
      margin-right: 16px;
      opacity: 0.8;
    }

    .summary-text {
      flex: 1;
    }

    .summary-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--primary);
      margin-bottom: 8px;
    }

    .summary-stats {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .summary-stat {
      font-size: 14px;
      color: #666;
      display: flex;
      align-items: center;
    }

    .summary-stat:before {
      content: '•';
      margin-right: 8px;
      color: var(--primary);
      font-weight: bold;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .page {
        padding: 12px;
      }

      .header h2 {
        font-size: 24px;
      }

      .month-label {
        font-size: 18px;
        min-width: 100px;
      }

      .btn-nav {
        width: 44px;
        height: 44px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .stat-card {
        padding: 16px;
      }

      .stat-icon {
        width: 50px;
        height: 50px;
        font-size: 24px;
      }

      .stat-value {
        font-size: 20px;
      }

      .content-card {
         padding: 16px;
         margin-bottom: 16px;
       }

       .card-header {
         margin-bottom: 12px;
       }

       .card-title {
         font-size: 18px;
         margin: 0;
       }

       .card-controls {
         gap: 6px;
       }

       .control-btn {
         width: 28px;
         height: 28px;
         font-size: 12px;
       }

       .section-toggle-btn {
         width: 32px;
         height: 32px;
       }

       .section-toggle-btn .expand-icon {
         font-size: 12px;
       }

      .mobile-row {
         padding: 10px 12px;
         margin-bottom: 8px;
       }

      .row-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .stat-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .stat-item .stat-value {
        font-size: 16px;
      }

      .resumen-simple, .total-por-persona {
        padding: 12px;
      }

      .total-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .total-monto {
         font-size: 16px;
       }

       .tarjeta-header {
          padding: 10px 12px;
          min-height: 50px;
        }

        .tarjeta-info {
          gap: 2px;
        }

        .gasto-item {
          padding: 8px 12px;
        }

        .gasto-item .gasto-stats {
          grid-template-columns: 1fr;
          gap: 6px;
        }

       .tarjeta-total {
          font-size: 13px;
        }

        .tarjeta-contadores {
          font-size: 11px;
          gap: 6px;
        }

        .expand-icon {
         font-size: 14px;
       }

       .summary-preview {
         padding: 16px;
         margin: 10px 0;
       }

       .summary-icon {
         font-size: 28px;
         margin-right: 12px;
       }

       .summary-title {
         font-size: 15px;
       }

       .summary-stat {
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

      .month-nav {
        gap: 12px;
      }

      .btn-nav {
        width: 40px;
        height: 40px;
      }

      .nav-icon {
        font-size: 16px;
      }

      .month-label {
        font-size: 16px;
        min-width: 80px;
      }

      .stat-card {
        padding: 12px;
      }

      .stat-icon {
        width: 40px;
        height: 40px;
        font-size: 20px;
      }

      .stat-value {
        font-size: 18px;
      }

      .content-card {
         padding: 12px;
       }

       .card-header {
         margin-bottom: 10px;
         flex-direction: column;
         align-items: flex-start;
         gap: 8px;
       }

       .card-title {
         font-size: 16px;
         margin: 0;
       }

       .card-controls {
         align-self: flex-end;
         gap: 4px;
       }

       .control-btn {
         width: 24px;
         height: 24px;
         font-size: 10px;
       }

       .section-toggle-btn {
         width: 28px;
         height: 28px;
       }

       .section-toggle-btn .expand-icon {
         font-size: 10px;
       }

      .mobile-row {
        padding: 10px;
      }

      .card-name {
        font-size: 14px;
      }

      .gasto-descripcion {
        font-size: 14px;
      }

      .stat-item .stat-label {
        font-size: 13px;
      }

      .stat-item .stat-value {
         font-size: 14px;
       }

       .tarjeta-header {
         padding: 10px;
       }

       .tarjeta-total {
          font-size: 12px;
        }

        .tarjeta-contadores {
          font-size: 10px;
          gap: 4px;
          flex-direction: column;
          align-items: flex-start;
        }

        .expand-icon {
           font-size: 12px;
         }

         .summary-preview {
           padding: 14px;
           margin: 8px 0;
         }

         .summary-icon {
           font-size: 24px;
           margin-right: 10px;
         }

         .summary-title {
           font-size: 14px;
         }

         .summary-stat {
           font-size: 12px;
         }
      }

     @media (max-width: 360px) {
        .page {
          padding: 6px;
        }

        .header {
          margin-bottom: 16px;
        }

        .header h2 {
          font-size: 18px;
          margin-bottom: 12px;
        }

        .month-nav {
          gap: 8px;
        }

        .btn-nav {
          width: 36px;
          height: 36px;
        }

        .nav-icon {
          font-size: 14px;
        }

        .month-label {
          font-size: 14px;
          min-width: 70px;
        }

        .stats-grid {
          gap: 8px;
          margin-bottom: 16px;
        }

        .stat-card {
          padding: 10px;
        }

        .stat-icon {
          width: 36px;
          height: 36px;
          font-size: 18px;
        }

        .stat-value {
          font-size: 16px;
        }

        .content-card {
          padding: 10px;
          margin-bottom: 12px;
        }

        .card-header {
          margin-bottom: 8px;
          gap: 6px;
        }

        .card-title {
          font-size: 14px;
          padding-bottom: 6px;
        }

        .card-controls {
          gap: 3px;
        }

        .control-btn {
          width: 22px;
          height: 22px;
          font-size: 9px;
        }

        .section-toggle-btn {
          width: 26px;
          height: 26px;
        }

        .section-toggle-btn .expand-icon {
          font-size: 9px;
        }

        .mobile-row {
          padding: 8px;
          margin-bottom: 6px;
        }

        .tarjeta-group {
          margin-bottom: 8px;
        }

        .tarjeta-header {
          padding: 8px;
          min-height: 40px;
        }

        .gasto-item {
          padding: 6px 8px;
        }

        .stat-item {
          padding: 6px 0;
        }

        .stat-item .stat-label {
          font-size: 12px;
        }

        .stat-item .stat-value {
          font-size: 13px;
        }

        .resumen-simple, .total-por-persona {
          padding: 10px;
          margin-top: 12px;
        }

        .resumen-title, .total-title {
          font-size: 14px;
          margin-bottom: 10px;
        }

        .resumen-item, .total-item {
          padding: 8px;
          margin-bottom: 8px;
        }

        .empty-state {
          padding: 24px 12px;
        }

        .empty-icon {
          font-size: 36px;
          margin-bottom: 12px;
        }

        .empty-text {
          font-size: 14px;
        }
     }
  `
})
export class ResumenComponent {
  resumenTarjetasMes$!: Observable<(ResumenTarjeta & { totalMes: number })[]>;
  resumenTarjetasGeneral$!: Observable<ResumenTarjeta[]>;
  resumenPersonas$!: Observable<ResumenPersona[]>;
  resumenPersonasMes$!: Observable<(ResumenPersona & { totalMes: number })[]>;
  detalleGastosMes$!: Observable<Array<{
    nombreTarjeta: string;
    descripcion: string;
    montoOriginal: number;
    cuotaActual: number;
    cantidadCuotas: number;
    montoCuota: number;
    compartidoCon?: string;
    porcentajeCompartido?: number;
  }>>;
  detalleGastosAgrupadosMes$!: Observable<Array<{
    nombreTarjeta: string;
    totalTarjeta: number;
    cantidadGastos: number;
    gastosUltimaCuota: number;
    gastos: Array<{
      descripcion: string;
      montoOriginal: number;
      cuotaActual: number;
      cantidadCuotas: number;
      montoCuota: number;
      compartidoCon?: string;
      porcentajeCompartido?: number;
    }>;
  }>>;
  tarjetasExpandidas: Set<string> = new Set();
  mostrarSeccionCompleta: { [key: string]: boolean } = {
    'resumenTarjetas': true,
    'detalleGastos': false,
    'gastosCompartidos': false,
    'resumenGeneral': false
  };
  detalleGastosCompartidosMes$!: Observable<Array<{
    descripcion: string;
    montoCuota: number;
    compartidoCon: string;
    porcentajeCompartido: number;
    montoCompartido: number;
  }>>;
  limiteTotal$!: Observable<number>;
  totalDelMes$!: Observable<number>;
  porcentajeUsoTotalMes$!: Observable<number>;
  totalPorPersona$!: Observable<Array<{ persona: string; total: number }>>;

  currentMonthKey: string = this.monthKeyFromDate(new Date()); // YYYY-MM
  monthLabel: string = this.formatMonthLabel(this.currentMonthKey);

  constructor(private resumenService: ResumenService) {
    // Inicializar después de que Angular haya inyectado el servicio
    this.refreshAllStreams();
  }

  toggleTarjetaExpansion(nombreTarjeta: string): void {
    if (this.tarjetasExpandidas.has(nombreTarjeta)) {
      this.tarjetasExpandidas.delete(nombreTarjeta);
    } else {
      this.tarjetasExpandidas.add(nombreTarjeta);
    }
  }

  isTarjetaExpandida(nombreTarjeta: string): boolean {
    return this.tarjetasExpandidas.has(nombreTarjeta);
  }

  toggleSeccionCompleta(seccion: string): void {
    this.mostrarSeccionCompleta[seccion] = !this.mostrarSeccionCompleta[seccion];
  }

  isSeccionExpandida(seccion: string): boolean {
    return this.mostrarSeccionCompleta[seccion];
  }

  expandirTodasTarjetas(): void {
    // Obtener todas las tarjetas del mes actual
    this.detalleGastosAgrupadosMes$.subscribe(detalleAgrupado => {
      detalleAgrupado.forEach(grupo => {
        this.tarjetasExpandidas.add(grupo.nombreTarjeta);
      });
    }).unsubscribe();
  }

  colapsarTodasTarjetas(): void {
    this.tarjetasExpandidas.clear();
  }

  private monthKeyFromDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private addMonths(key: string, delta: number): string {
    const [y, m] = key.split('-').map(Number);
    const date = new Date(y, (m - 1) + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatMonthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  prevMonth(): void {
    this.currentMonthKey = this.addMonths(this.currentMonthKey, -1);
    this.monthLabel = this.formatMonthLabel(this.currentMonthKey);
    this.refreshAllStreams();
  }

  nextMonth(): void {
    this.currentMonthKey = this.addMonths(this.currentMonthKey, 1);
    this.monthLabel = this.formatMonthLabel(this.currentMonthKey);
    this.refreshAllStreams();
  }

  private refreshAllStreams(): void {
    this.resumenTarjetasMes$ = this.resumenService.getResumenPorTarjetaDelMes$(this.currentMonthKey);
    this.resumenTarjetasGeneral$ = this.resumenService.getResumenPorTarjeta$();
    this.resumenPersonas$ = this.resumenService.getResumenPorPersona$();
    this.resumenPersonasMes$ = this.resumenService.getResumenPorPersonaDelMes$(this.currentMonthKey);
    this.detalleGastosMes$ = this.resumenService.getDetalleGastosDelMes$(this.currentMonthKey);
    this.detalleGastosAgrupadosMes$ = this.resumenService.getDetalleGastosAgrupadosPorTarjeta$(this.currentMonthKey);
    this.detalleGastosCompartidosMes$ = this.resumenService.getDetalleGastosCompartidosDelMes$(this.currentMonthKey);
    this.limiteTotal$ = this.resumenService.getLimiteTotal$();
    this.totalDelMes$ = this.resumenService.getTotalDelMes$(this.currentMonthKey);
    this.porcentajeUsoTotalMes$ = this.resumenService.getPorcentajeUsoTotalDelMes$(this.currentMonthKey);
    this.totalPorPersona$ = this.resumenService.getTotalPorPersona$(this.currentMonthKey);
  }
}
