import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResumenService, ResumenPersona, ResumenTarjeta } from '../../services/resumen.service';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { TarjetaService } from '../../services/tarjeta';
import { GastoService } from '../../services/gasto';
import { ModoResumen } from '../../models/resumen/modo-resumen';
import { ComparacionMeses } from '../../models/resumen/modo-resumen';

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="header">
        <div class="header-content">
          <h2>Resumen</h2>
        </div>
        <div class="header-actions">
          <div class="mode-selector">
            <label class="mode-option"><input type="radio" name="modoResumen" value="mesNatural" [(ngModel)]="modoResumen" (change)="onModoChange()"> Mes natural</label>
            <label class="mode-option"><input type="radio" name="modoResumen" value="periodoCierre" [(ngModel)]="modoResumen" (change)="onModoChange()"> Por cierre</label>
          </div>
          <div class="month-nav">
            <button class="btn-nav" (click)="prevMonth()" aria-label="Mes anterior"><span class="nav-icon">◀</span></button>
            <div class="month-label">{{ monthLabel }}</div>
            <button class="btn-nav" (click)="nextMonth()" aria-label="Mes siguiente"><span class="nav-icon">▶</span></button>
          </div>
        </div>
      </div>

      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-label">Total</div>
            <div class="stat-value">{{ ((totalDelMes$ | async) ?? 0) | number:'1.2-2' }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💳</div>
          <div class="stat-content">
            <div class="stat-label">Límite</div>
            <div class="stat-value">{{ ((limiteTotal$ | async) ?? 0) | number:'1.0-0' }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-label">Uso</div>
            <div class="stat-value">{{ ((porcentajeUsoTotalMes$ | async) ?? 0) | number:'1.0-2' }}%</div>
          </div>
        </div>
      </section>

      <section class="content-card">
        <div class="card-header">
          <h3 class="card-title">Tarjetas</h3>
          <button class="section-toggle-btn" (click)="toggleSeccionCompleta('resumenTarjetas')" 
                  [attr.aria-label]="isSeccionExpandida('resumenTarjetas') ? 'Colapsar sección' : 'Expandir sección'">
            <span class="expand-icon" [class.expanded]="isSeccionExpandida('resumenTarjetas')">▼</span>
          </button>
        </div>
        <div class="mobile-table tarjetas-grid" *ngIf="isSeccionExpandida('resumenTarjetas') && (resumenTarjetasMes$ | async) as tarjetas; else resumenTarjetas">
          <div class="tarjeta-card" *ngFor="let t of tarjetas">
            <div class="tarjeta-card-header">
              <span class="card-name">{{ t.nombre }}</span>
              <span class="card-limit">Límite {{ t.limite | number:'1.0-0' }}</span>
            </div>
            <div class="tarjeta-metrics">
              <div class="metric-box metric-gastado">
                <span class="metric-label">Gastado</span>
                <span class="metric-value">{{ t.totalMes | number:'1.2-2' }}</span>
              </div>
              <div class="metric-box metric-uso">
                <span class="metric-label">Uso</span>
                <span class="metric-value">{{ t.porcentajeUso | number:'1.0-1' }}%</span>
                <div class="uso-bar"><div class="uso-bar-fill" [style.width.%]="(t.porcentajeUso > 100 ? 100 : t.porcentajeUso)"></div></div>
              </div>
              <div class="metric-box metric-disponible">
                <span class="metric-label">Disponible</span>
                <span class="metric-value">{{ t.saldoDisponible | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
          <div *ngIf="tarjetas.length === 0" class="empty-state">
            <div class="empty-icon">💳</div>
            <div class="empty-text">Sin datos de tarjetas</div>
          </div>
        </div>
      </section>

      <section class="content-card">
        <div class="card-header">
          <h3 class="card-title">Gastos</h3>
          <div class="card-controls">
            <div class="tarjeta-controls" *ngIf="isSeccionExpandida('detalleGastos')">
              <button class="control-btn" (click)="expandirTodasTarjetas()" title="Expandir todas">📂</button>
              <button class="control-btn" (click)="colapsarTodasTarjetas()" title="Colapsar todas">📁</button>
            </div>
            <button class="section-toggle-btn" (click)="toggleSeccionCompleta('detalleGastos')" aria-label="Expandir o colapsar">
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
            
            <!-- Gastos de la tarjeta: en grilla (varias por fila) para menos scroll -->
            <div class="tarjeta-gastos gastos-grid" *ngIf="isTarjetaExpandida(grupo.nombreTarjeta)">
              <div class="gasto-mini-card" *ngFor="let gasto of grupo.gastos">
                <div class="gasto-mini-desc">{{ gasto.descripcion }}</div>
                <div class="gasto-mini-cuota">
                  <span class="gasto-mini-label">Cuota</span>
                  <span class="gasto-mini-valor">{{ gasto.montoCuota | number:'1.2-2' }}</span>
                </div>
                <div class="gasto-mini-meta">
                  <span class="gasto-mini-progreso" *ngIf="gasto.cantidadCuotas > 1">{{ gasto.cuotaActual }}/{{ gasto.cantidadCuotas }}</span>
                  <span class="gasto-mini-compartido" *ngIf="gasto.compartidoCon">{{ gasto.compartidoCon }} {{ gasto.porcentajeCompartido }}%</span>
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

      <section class="content-card">
        <div class="card-header">
          <h3 class="card-title">Compartidos</h3>
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
                <div class="stat-item highlight"><span class="stat-value">{{ item.montoCuota | number:'1.2-2' }}</span></div>
                <div class="stat-item pos"><span class="stat-value">Te debe {{ item.montoCompartido | number:'1.2-2' }}</span></div>
              </div>
            </div>
          </div>
          <div *ngIf="detalle.length === 0" class="empty-state">
            <div class="empty-icon">🤝</div>
            <div class="empty-text">No hay gastos compartidos este mes</div>
          </div>
        </div>
        
        <div class="total-por-persona" *ngIf="isSeccionExpandida('gastosCompartidos') && (totalPorPersona$ | async) as totales">
          <h4 class="total-title">Te deben</h4>
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

      <section class="content-card" *ngIf="false">
        <div class="card-header">
          <h3 class="card-title">Resumen general</h3>
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
              <div class="stat-item"><span class="stat-label">Total:</span> <span class="stat-value">{{ t.totalGastos | number:'1.2-2' }}</span></div>
              <div class="stat-item"><span class="stat-label">Uso:</span> <span class="stat-value">{{ t.porcentajeUso | number:'1.0-2' }}%</span></div>
              <div class="stat-item"><span class="stat-label">Disponible:</span> <span class="stat-value">{{ t.saldoDisponible | number:'1.2-2' }}</span></div>
            </div>
          </div>
          <div *ngIf="tarjetas.length === 0" class="empty-state">
            <div class="empty-icon">💳</div>
            <div class="empty-text">Sin datos de tarjetas</div>
          </div>
        </div>
      </section>

      <section class="content-card">
        <div class="card-header">
          <h3 class="card-title">Comparar meses</h3>
          <button class="section-toggle-btn" (click)="toggleSeccionCompleta('compararMeses')" 
                  [attr.aria-label]="isSeccionExpandida('compararMeses') ? 'Colapsar sección' : 'Expandir sección'">
            <span class="expand-icon" [class.expanded]="isSeccionExpandida('compararMeses')">▼</span>
          </button>
        </div>
        <div *ngIf="isSeccionExpandida('compararMeses')">
          <div class="comparacion-nav">
            <div class="comparacion-selector">
              <span class="comparacion-label">Mes A:</span>
              <button class="btn-nav" (click)="prevComparacionA()" aria-label="Mes A anterior">◀</button>
              <span class="month-label">{{ formatMonthLabel(comparacionMonthKeyA) }}</span>
              <button class="btn-nav" (click)="nextComparacionA()" aria-label="Mes A siguiente">▶</button>
            </div>
            <div class="comparacion-selector">
              <span class="comparacion-label">Mes B:</span>
              <button class="btn-nav" (click)="prevComparacionB()" aria-label="Mes B anterior">◀</button>
              <span class="month-label">{{ formatMonthLabel(comparacionMonthKeyB) }}</span>
              <button class="btn-nav" (click)="nextComparacionB()" aria-label="Mes B siguiente">▶</button>
            </div>
          </div>
          <div class="comparacion-resultado" *ngIf="comparacionMeses$ | async as comp">
            <div class="comparacion-totales">
              <div class="comp-total"><span class="comp-label">Total Mes A:</span> {{ comp.totalA | number:'1.2-2' }}</div>
              <div class="comp-total"><span class="comp-label">Total Mes B:</span> {{ comp.totalB | number:'1.2-2' }}</div>
              <div class="comp-diferencia">
                Diferencia: {{ comp.diferenciaAbs | number:'1.2-2' }} ({{ comp.diferenciaPorc >= 0 ? '+' : '' }}{{ comp.diferenciaPorc | number:'1.1-2' }}%)
              </div>
            </div>
            <div class="comparacion-tarjetas" *ngIf="comp.porTarjeta.length">
              <div class="comp-tarjeta-row" *ngFor="let row of comp.porTarjeta">
                <span class="comp-tarjeta-nombre">{{ row.nombre }}</span>
                <span class="comp-tarjeta-val">A: {{ row.totalA | number:'1.2-2' }}</span>
                <span class="comp-tarjeta-val">B: {{ row.totalB | number:'1.2-2' }}</span>
                <span class="comp-tarjeta-diff">{{ row.diferenciaAbs >= 0 ? '+' : '' }}{{ row.diferenciaAbs | number:'1.2-2' }}</span>
              </div>
            </div>
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
      --pos: var(--success-dark);
      --neg: var(--danger-dark);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
      --shadow-md: 0 2px 6px rgba(0,0,0,0.08);
      --radius: var(--radius-sm);
      --radius-sm: 6px;
    }

    .page {
      min-height: 100vh;
      background: var(--bg);
      padding: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: var(--spacing-lg);
      padding: var(--spacing-lg);
      background: var(--primary);
      border-radius: var(--radius-sm);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-lg);
    }

    .header-content {
      flex: 1;
      text-align: left;
    }

    .header h2 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--text-inverse);
    }

    .subtitle {
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-medium);
    }

    .header-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-md);
    }
    .month-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
    }

    .btn-nav {
      width: 40px;
      height: 40px;
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.15);
      color: var(--text-inverse);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s ease;
    }

    .btn-nav:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .nav-icon {
      font-size: 16px;
      font-weight: bold;
    }

    .month-label {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--text-inverse);
      min-width: 120px;
      text-align: center;
      padding: var(--spacing-xs) var(--spacing-sm);
      background: rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-xs);
    }

    .mode-selector {
      display: flex;
      gap: var(--spacing-md);
      align-items: center;
    }
    .mode-option {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      cursor: pointer;
      color: rgba(255,255,255,0.95);
      font-size: var(--font-size-sm);
    }
    .mode-option input { margin-right: 4px; }
    .comparacion-nav {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xl);
      margin-bottom: var(--spacing-lg);
    }
    .comparacion-selector {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }
    .comparacion-label {
      font-weight: var(--font-weight-medium);
    }
    .comparacion-resultado {
      margin-top: var(--spacing-md);
    }
    .comparacion-totales {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }
    .comp-total, .comp-diferencia {
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--surface);
      border-radius: var(--radius-sm);
    }
    /* Estilos específicos para "Comparar meses" dentro de la tarjeta (fondo claro) */
    .content-card .comparacion-selector .month-label {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-primary);
      text-shadow: none;
      backdrop-filter: none;
      min-width: auto;
      padding: 4px 8px;
      font-weight: var(--font-weight-medium);
    }

    .content-card .comparacion-selector .btn-nav {
      width: 32px;
      height: 32px;
      border-radius: 4px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-primary);
      box-shadow: none;
      transform: none;
    }

    .content-card .comparacion-selector .btn-nav:hover {
      background: var(--primary-light);
      color: #fff;
      border-color: var(--primary);
    }
    .comp-tarjeta-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-md);
      padding: var(--spacing-xs) 0;
      border-bottom: 1px solid var(--border-color);
    }
    .comp-tarjeta-nombre { flex: 1; font-weight: var(--font-weight-medium); }
    .comp-tarjeta-val, .comp-tarjeta-diff { min-width: 80px; }

    @media (max-width: 768px) {
      .page {
        padding: 12px;
      }

      .header {
        padding: var(--spacing-md);
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-md);
      }

      .header h2 {
        font-size: var(--font-size-2xl);
      }

      .subtitle {
        font-size: var(--font-size-base);
      }

      .month-nav {
        width: 100%;
        justify-content: space-between;
      }

      .month-label {
        min-width: auto;
        flex: 1;
        font-size: var(--font-size-lg);
        padding: var(--spacing-xs) var(--spacing-sm);
      }

      .btn-nav {
        width: 40px;
        height: 40px;
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
      }

      .card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
      }

      .mobile-table {
        font-size: var(--font-size-sm);
      }

      .mobile-row {
        padding: var(--spacing-sm);
      }
    }

    @media (max-width: 480px) {
      .page {
        padding: 8px;
      }

      .header {
        padding: var(--spacing-sm);
      }

      .header h2 {
        font-size: var(--font-size-xl);
      }

      .month-label {
        font-size: var(--font-size-base);
      }

      .btn-nav {
        width: 36px;
        height: 36px;
      }

      .stat-card {
        padding: 12px;
        flex-direction: column;
        text-align: center;
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
      padding: var(--spacing-lg);
      box-shadow: var(--shadow-xs);
      border: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .stat-icon {
      font-size: 24px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary);
      color: var(--text-inverse);
      border-radius: var(--radius-sm);
    }

    .stat-content {
      flex: 1;
    }

    .stat-label {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .content-card {
       background: var(--surface);
       border-radius: var(--radius);
       padding: var(--spacing-lg);
       margin-bottom: var(--spacing-lg);
       box-shadow: var(--shadow-xs);
       border: 1px solid var(--border-light);
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
      margin: 0 0 var(--spacing-md) 0;
      font-size: var(--font-size-xl);
      font-weight: 600;
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-light);
      padding-bottom: var(--spacing-sm);
    }

    .mobile-table {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Grid de cards de tarjetas */
    .tarjetas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--spacing-md);
    }

    .tarjeta-card {
      background: var(--surface);
      border-radius: var(--radius-sm);
      padding: 0;
      border: 1px solid var(--border-light);
      overflow: hidden;
      position: relative;
      border-left: 4px solid var(--primary);
    }

    .tarjeta-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md) var(--spacing-lg);
      background: var(--surface-hover);
      border-bottom: 1px solid var(--border-light);
    }

    .tarjeta-card-header .card-name {
      font-size: var(--font-size-base);
      font-weight: 600;
      color: var(--text-primary);
    }

    .tarjeta-card-header .card-limit {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      padding: 4px 8px;
      border-radius: var(--radius-xs);
      background: var(--surface);
      border: 1px solid var(--border-light);
    }

    .tarjeta-metrics {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1px;
      background: var(--border-light);
    }

    .metric-box {
      background: var(--surface);
      padding: var(--spacing-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      text-align: center;
    }

    .metric-label {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .metric-value {
      font-size: var(--font-size-base);
      font-weight: 700;
      color: var(--text-primary);
    }

    .metric-gastado .metric-value {
      color: var(--primary);
    }

    .metric-uso {
      grid-column: span 1;
    }

    .metric-uso .metric-value {
      font-size: var(--font-size-sm);
    }

    .uso-bar {
      width: 100%;
      height: 4px;
      background: var(--surface-hover);
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-top: 4px;
    }

    .uso-bar-fill {
      height: 100%;
      background: var(--primary);
      border-radius: var(--radius-full);
      transition: width 0.3s ease;
    }

    .metric-disponible .metric-value {
      color: var(--success);
    }

    .mobile-row {
      background: var(--surface);
      border-radius: var(--radius-sm);
      padding: var(--spacing-md) var(--spacing-lg);
      border: 1px solid var(--border-light);
    }

    .compartido-row {
      border-left: 3px solid var(--primary);
    }

    .row-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-sm);
      flex-wrap: wrap;
      gap: var(--spacing-sm);
    }

    .card-name {
      font-weight: 600;
      font-size: var(--font-size-base);
      color: var(--text-primary);
    }

    .card-limit {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      padding: 2px 8px;
      border-radius: var(--radius-xs);
      background: var(--surface-hover);
    }

    .cuota-info {
      font-size: var(--font-size-sm);
      color: var(--primary);
      font-weight: 600;
      background: var(--surface-hover);
      padding: 2px 8px;
      border-radius: var(--radius-xs);
    }

    /* Grilla de gastos dentro del drill-down de tarjeta */
    .gastos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: var(--spacing-md);
    }

    .gasto-mini-card {
      background: var(--surface);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      padding: var(--spacing-md);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      transition: background-color 0.15s ease;
    }

    .gasto-mini-card:hover {
      background: var(--surface-hover);
    }

    .gasto-mini-desc {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--text-primary);
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .gasto-mini-cuota {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--spacing-xs) 0;
      border-top: 1px solid var(--border-light);
    }

    .gasto-mini-label {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .gasto-mini-valor {
      font-size: var(--font-size-lg);
      font-weight: 700;
      color: var(--primary);
    }

    .gasto-mini-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-sm);
      margin-top: auto;
    }

    .gasto-mini-progreso {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      padding: 2px 6px;
      background: var(--surface-hover);
      border-radius: var(--radius-xs);
    }

    .gasto-mini-compartido {
      font-size: var(--font-size-xs);
      color: var(--primary);
      font-weight: 500;
    }

    .compartido-badge {
      font-size: var(--font-size-xs);
      color: var(--text-inverse);
      background: var(--primary);
      padding: 2px 8px;
      border-radius: var(--radius-xs);
      font-weight: 500;
    }

    .row-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gasto-descripcion {
      font-weight: 500;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
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
      padding: var(--spacing-xs) 0;
      gap: var(--spacing-sm);
    }

    .stat-item .stat-label {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      font-weight: 500;
    }

    .stat-item .stat-value {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-primary);
    }

    .stat-item.highlight .stat-value {
      color: var(--primary);
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
        margin-bottom: var(--spacing-md);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-sm);
        overflow: hidden;
        background: var(--surface);
      }

     .tarjeta-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-md) var(--spacing-lg);
        background: var(--surface-hover);
        cursor: pointer;
        transition: background-color 0.15s ease;
        border-bottom: 1px solid var(--border-light);
        min-height: 52px;
      }

     .tarjeta-header:hover {
       background: var(--primary);
       color: var(--text-inverse);
     }

     .tarjeta-header:hover .card-name,
      .tarjeta-header:hover .tarjeta-total,
      .tarjeta-header:hover .tarjeta-contadores {
        color: var(--text-inverse);
      }

      .tarjeta-header:hover .contador-ultimas {
        color: rgba(255,255,255,0.9);
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
        font-size: var(--font-size-sm);
        font-weight: 600;
        color: var(--primary);
      }

      .tarjeta-contadores {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
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
       padding: var(--spacing-sm);
       background: var(--surface);
     }

     .gasto-mini-card {
        padding: var(--spacing-sm);
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

      .tarjeta-card-header {
        padding: var(--spacing-sm) var(--spacing-md);
      }

      .tarjeta-metrics {
        grid-template-columns: 1fr 1fr 1fr;
      }

      .metric-box {
        padding: var(--spacing-sm);
      }

      .metric-value {
        font-size: var(--font-size-sm);
      }

      .gastos-grid {
        grid-template-columns: 1fr;
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

        .gasto-mini-card {
          padding: var(--spacing-sm);
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

        .gasto-mini-card {
          padding: var(--spacing-xs) var(--spacing-sm);
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
export class ResumenComponent implements OnInit, OnDestroy {
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
    'resumenGeneral': false,
    'compararMeses': false
  };
  comparacionMonthKeyA: string = '';
  comparacionMonthKeyB: string = '';
  comparacionMeses$!: Observable<ComparacionMeses>;
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
  modoResumen: ModoResumen = 'mesNatural';
  private subscriptions = new Subscription();

  constructor(
    private resumenService: ResumenService,
    private tarjetaService: TarjetaService,
    private gastoService: GastoService,
    private cdr: ChangeDetectorRef
  ) {
    // Los observables se inicializarán en ngOnInit
  }

  ngOnInit(): void {
    this.comparacionMonthKeyA = this.addMonths(this.currentMonthKey, -1);
    this.comparacionMonthKeyB = this.currentMonthKey;
    this.refreshComparacion();
    // Refrescar todos los streams cuando el componente se inicializa
    // Esto asegura que los datos se actualicen cuando vuelves a la página
    this.refreshAllStreams();
    
    // Suscribirse directamente a los cambios en tarjetas y gastos para forzar actualización
    // Esto asegura que cuando se importan datos, el resumen se actualice inmediatamente
    this.subscriptions.add(
      combineLatest([
        this.tarjetaService.getTarjetas$(),
        this.gastoService.getGastos$()
      ]).subscribe(() => {
        // Cuando cambian los datos base, refrescar todos los streams
        this.refreshAllStreams();
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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

  formatMonthLabel(key: string): string {
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

  prevComparacionA(): void {
    this.comparacionMonthKeyA = this.addMonths(this.comparacionMonthKeyA, -1);
    this.refreshComparacion();
  }
  nextComparacionA(): void {
    this.comparacionMonthKeyA = this.addMonths(this.comparacionMonthKeyA, 1);
    this.refreshComparacion();
  }
  prevComparacionB(): void {
    this.comparacionMonthKeyB = this.addMonths(this.comparacionMonthKeyB, -1);
    this.refreshComparacion();
  }
  nextComparacionB(): void {
    this.comparacionMonthKeyB = this.addMonths(this.comparacionMonthKeyB, 1);
    this.refreshComparacion();
  }
  private refreshComparacion(): void {
    this.comparacionMeses$ = this.resumenService.getComparacionMeses$(this.comparacionMonthKeyA, this.comparacionMonthKeyB);
    this.cdr.markForCheck();
  }

  onModoChange(): void {
    this.refreshAllStreams();
  }

  private refreshAllStreams(): void {
    // Forzar la creación de nuevos observables para evitar problemas de caché
    // Esto asegura que los observables se actualicen correctamente cuando vuelves a la página
    const currentKey = this.currentMonthKey;
    
    // Recrear todos los observables para forzar la actualización
    // Esto es crítico: cada vez que se llama este método, se crean nuevos observables
    // que se suscribirán a los BehaviorSubjects actualizados
    this.resumenTarjetasMes$ = this.resumenService.getResumenPorTarjetaConModo$(currentKey, this.modoResumen);
    this.resumenTarjetasGeneral$ = this.resumenService.getResumenPorTarjeta$();
    this.resumenPersonas$ = this.resumenService.getResumenPorPersona$();
    this.resumenPersonasMes$ = this.resumenService.getResumenPorPersonaDelMes$(currentKey);
    this.detalleGastosMes$ = this.resumenService.getDetalleGastosDelMes$(currentKey);
    this.detalleGastosAgrupadosMes$ = this.resumenService.getDetalleGastosAgrupadosPorTarjetaConModo$(currentKey, this.modoResumen);
    this.detalleGastosCompartidosMes$ = this.resumenService.getDetalleGastosCompartidosDelMes$(currentKey);
    this.limiteTotal$ = this.resumenService.getLimiteTotal$();
    this.totalDelMes$ = this.resumenService.getTotalEnPeriodoConModo$(currentKey, this.modoResumen);
    this.porcentajeUsoTotalMes$ = this.resumenService.getPorcentajeUsoTotalConModo$(currentKey, this.modoResumen);
    this.totalPorPersona$ = this.resumenService.getTotalPorPersona$(currentKey);
    
    // Forzar detección de cambios después de actualizar los observables
    // Usar setTimeout para asegurar que Angular procese los cambios
    setTimeout(() => {
      this.cdr.markForCheck();
    }, 0);
  }
}
