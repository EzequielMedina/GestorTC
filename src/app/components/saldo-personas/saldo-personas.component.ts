import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Gasto } from '../../models/gasto.model';
import { GastosCompartidosService } from '../../services/gastos-compartidos.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-saldo-personas',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatChipsModule],
  templateUrl: './saldo-personas.component.html',
  styleUrls: ['./saldo-personas.component.css']
})
export class SaldoPersonasComponent implements OnInit, OnDestroy {
  @Input() gastos$?: Observable<Gasto[]>;

  resumenPorPersona: { [key: string]: number } = {};
  deudas: Array<{ de: string; a: string; monto: number }> = [];
  personas: string[] = [];

  private subscriptions = new Subscription();

  constructor(private gastosCompartidosService: GastosCompartidosService) {}

  ngOnInit(): void {
    if (this.gastos$) {
      this.subscriptions.add(
        this.gastos$.subscribe(gastos => {
          this.actualizarResumen(gastos);
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  actualizarResumen(gastos: Gasto[]): void {
    this.resumenPorPersona = this.gastosCompartidosService.obtenerResumenPorPersona(gastos);
    this.deudas = this.gastosCompartidosService.calcularDeudasEntrePersonas(gastos);
    this.personas = Object.keys(this.resumenPorPersona).filter(p => p !== 'Titular');
  }

  getSaldoPersona(persona: string): number {
    return this.resumenPorPersona[persona] || 0;
  }

  getTotalGastos(): number {
    return Object.values(this.resumenPorPersona).reduce((sum, val) => sum + val, 0);
  }
}

