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
      <h2>Resumen</h2>

      <!-- Totales del mes -->
      <section class="cards">
        <div class="stat">
          <div class="stat-label">Total del mes</div>
          <div class="stat-value">{{ ((totalDelMes$ | async) ?? 0) | number:'1.2-2' }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Límite Total</div>
          <div class="stat-value">{{ ((limiteTotal$ | async) ?? 0) | number:'1.0-0' }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Uso del mes</div>
          <div class="stat-value">{{ ((porcentajeUsoTotalMes$ | async) ?? 0) | number:'1.0-2' }}%</div>
        </div>
      </section>

      <!-- Navegación mensual -->
      <section class="card">
        <div class="month-nav">
          <button class="btn-icon" (click)="prevMonth()" aria-label="Mes anterior">◀</button>
          <div class="month-label">{{ monthLabel }}</div>
          <button class="btn-icon" (click)="nextMonth()" aria-label="Mes siguiente">▶</button>
        </div>
        <div class="month-totals">
          <div>Total del mes: <strong>{{ (totalDelMes$ | async) ?? 0 | number:'1.2-2' }}</strong></div>
        </div>
      </section>

      <!-- Resumen por tarjeta -->
      <section class="card">
        <h3>Por Tarjeta</h3>
        <div class="table-wrapper" *ngIf="(resumenTarjetasMes$ | async) as tarjetas; else cargando">
        <table class="table">
          <thead>
            <tr>
              <th>Tarjeta</th>
              <th>Límite</th>
              <th class="right">Gastos</th>
              <th class="right">Este mes</th>
              <th class="right">Uso</th>
              <th class="right">Disponible</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of tarjetas">
              <td>{{ t.nombre }}</td>
              <td>{{ t.limite | number:'1.0-0' }}</td>
              <td class="right">{{ t.totalGastos | number:'1.2-2' }}</td>
              <td class="right">{{ t.totalMes | number:'1.2-2' }}</td>
              <td class="right">{{ t.porcentajeUso | number:'1.0-2' }}%</td>
              <td class="right">{{ t.saldoDisponible | number:'1.2-2' }}</td>
            </tr>
            <tr *ngIf="tarjetas.length === 0">
              <td colspan="6" class="muted">Sin datos de tarjetas.</td>
            </tr>
          </tbody>
        </table>
        </div>
      </section>

      <!-- Resumen por persona -->
      <section class="card">
        <h3>Por Persona</h3>
        <div class="table-wrapper" *ngIf="(resumenPersonas$ | async) as personas; else cargando">
        <table class="table">
          <thead>
            <tr>
              <th>Persona</th>
              <th class="right">Total Gastos</th>
              <th class="right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of personas">
              <td>{{ p.nombre }}</td>
              <td class="right">{{ p.totalGastos | number:'1.2-2' }}</td>
              <td class="right" [class.pos]="p.saldo > 0" [class.neg]="p.saldo < 0">{{ p.saldo | number:'1.2-2' }}</td>
            </tr>
            <tr *ngIf="personas.length === 0">
              <td colspan="3" class="muted">Sin datos de personas.</td>
            </tr>
          </tbody>
        </table>
        </div>
      </section>

      <ng-template #cargando>
        <p class="muted">Cargando...</p>
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
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.08);
      --radius: 10px;
    }
    .page { display: grid; gap: 16px; background: var(--bg); padding: 8px; }
    .cards { display: grid; grid-template-columns: repeat(3, minmax(160px, 1fr)); gap: 12px; }
    .stat { background: var(--surface); padding: 16px; border-radius: var(--radius); box-shadow: var(--shadow-sm); border: 1px solid var(--border); }
    .stat-label { color: #666; font-size: 13px; }
    .stat-value { font-size: 22px; font-weight: 700; }
    .card { background: var(--surface); padding: 16px; border-radius: var(--radius); box-shadow: var(--shadow-sm); border: 1px solid var(--border); }
    .table-wrapper { width: 100%; overflow-x: auto; }
    .table { width: 100%; border-collapse: collapse; min-width: 760px; }
    .table thead th { position: sticky; top: 0; background: var(--surface); border-bottom: 1px solid var(--border); text-align: left; font-weight: 600; }
    .table th, .table td { padding: 10px 12px; border-bottom: 1px solid var(--border); }
    .table tbody tr:hover { background: var(--bg); }
    .right { text-align: right; }
    .muted { color: #666; }
    .pos { color: var(--pos); }
    .neg { color: var(--neg); }
    .month-nav { display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 8px; }
    .btn-icon { padding: 6px 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); cursor: pointer; }
    .btn-icon:hover { filter: brightness(0.98); }
    .month-label { font-weight: 700; }
    .month-totals { text-align: center; color: #333; }
    @media (max-width: 900px) { .cards { grid-template-columns: 1fr; } }
  `
})
export class ResumenComponent {
  resumenTarjetasMes$!: Observable<(ResumenTarjeta & { totalMes: number })[]>;
  resumenPersonas$!: Observable<ResumenPersona[]>;
  limiteTotal$!: Observable<number>;
  totalDelMes$!: Observable<number>;
  porcentajeUsoTotalMes$!: Observable<number>;

  currentMonthKey: string = this.monthKeyFromDate(new Date()); // YYYY-MM
  monthLabel: string = this.formatMonthLabel(this.currentMonthKey);

  constructor(private resumenService: ResumenService) {
    // Inicializar después de que Angular haya inyectado el servicio
    this.resumenTarjetasMes$ = this.resumenService.getResumenPorTarjetaDelMes$(this.currentMonthKey);
    this.resumenPersonas$ = this.resumenService.getResumenPorPersona$();
    this.limiteTotal$ = this.resumenService.getLimiteTotal$();
    this.totalDelMes$ = this.resumenService.getTotalDelMes$(this.currentMonthKey);
    this.porcentajeUsoTotalMes$ = this.resumenService.getPorcentajeUsoTotalDelMes$(this.currentMonthKey);
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
    this.refreshMonthlyStreams();
  }

  nextMonth(): void {
    this.currentMonthKey = this.addMonths(this.currentMonthKey, 1);
    this.monthLabel = this.formatMonthLabel(this.currentMonthKey);
    this.refreshMonthlyStreams();
  }

  private refreshMonthlyStreams(): void {
    this.resumenTarjetasMes$ = this.resumenService.getResumenPorTarjetaDelMes$(this.currentMonthKey);
    this.totalDelMes$ = this.resumenService.getTotalDelMes$(this.currentMonthKey);
    this.porcentajeUsoTotalMes$ = this.resumenService.getPorcentajeUsoTotalDelMes$(this.currentMonthKey);
  }
}
