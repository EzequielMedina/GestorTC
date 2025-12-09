import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-calculadoras-financieras',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSelectModule
  ],
  templateUrl: './calculadoras-financieras.component.html',
  styleUrls: ['./calculadoras-financieras.component.css']
})
export class CalculadorasFinancierasComponent {
  // Calculadora de Interés Compuesto
  capitalInicial: number = 0;
  tasaInteres: number = 0;
  periodoAnios: number = 0;
  frecuenciaCapitalizacion: 'mensual' | 'trimestral' | 'semestral' | 'anual' = 'mensual';
  resultadoInteresCompuesto: number = 0;

  // Calculadora de Préstamos
  montoPrestamo: number = 0;
  tasaInteresPrestamo: number = 0;
  plazoAnios: number = 0;
  cuotaMensual: number = 0;
  totalPagar: number = 0;
  totalIntereses: number = 0;

  // Calculadora de Ahorro
  montoInicialAhorro: number = 0;
  aporteMensual: number = 0;
  tasaInteresAhorro: number = 0;
  plazoAniosAhorro: number = 0;
  resultadoAhorro: number = 0;
  totalAportado: number = 0;
  interesesGanados: number = 0;

  // Calculadora de Conversión
  montoConvertir: number = 0;
  monedaOrigen: 'ARS' | 'USD' = 'ARS';
  monedaDestino: 'ARS' | 'USD' = 'USD';
  tasaCambio: number = 1000; // Por defecto 1000 ARS = 1 USD
  resultadoConversion: number = 0;

  calcularInteresCompuesto(): void {
    const r = this.tasaInteres / 100;
    let n: number;
    
    switch (this.frecuenciaCapitalizacion) {
      case 'mensual':
        n = 12;
        break;
      case 'trimestral':
        n = 4;
        break;
      case 'semestral':
        n = 2;
        break;
      case 'anual':
        n = 1;
        break;
    }
    
    const nt = n * this.periodoAnios;
    this.resultadoInteresCompuesto = this.capitalInicial * Math.pow(1 + (r / n), nt);
  }

  calcularPrestamo(): void {
    const r = (this.tasaInteresPrestamo / 100) / 12; // Tasa mensual
    const n = this.plazoAnios * 12; // Número de meses
    
    if (r === 0) {
      this.cuotaMensual = this.montoPrestamo / n;
    } else {
      this.cuotaMensual = this.montoPrestamo * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
    
    this.totalPagar = this.cuotaMensual * n;
    this.totalIntereses = this.totalPagar - this.montoPrestamo;
  }

  calcularAhorro(): void {
    const r = (this.tasaInteresAhorro / 100) / 12; // Tasa mensual
    const n = this.plazoAniosAhorro * 12; // Número de meses
    
    // Valor futuro del monto inicial
    const valorFuturoInicial = this.montoInicialAhorro * Math.pow(1 + r, n);
    
    // Valor futuro de los aportes mensuales (anualidad)
    let valorFuturoAportes: number;
    if (r === 0) {
      valorFuturoAportes = this.aporteMensual * n;
    } else {
      valorFuturoAportes = this.aporteMensual * ((Math.pow(1 + r, n) - 1) / r);
    }
    
    this.resultadoAhorro = valorFuturoInicial + valorFuturoAportes;
    this.totalAportado = this.montoInicialAhorro + (this.aporteMensual * n);
    this.interesesGanados = this.resultadoAhorro - this.totalAportado;
  }

  calcularConversion(): void {
    if (this.monedaOrigen === 'ARS' && this.monedaDestino === 'USD') {
      this.resultadoConversion = this.montoConvertir / this.tasaCambio;
    } else if (this.monedaOrigen === 'USD' && this.monedaDestino === 'ARS') {
      this.resultadoConversion = this.montoConvertir * this.tasaCambio;
    } else {
      this.resultadoConversion = this.montoConvertir;
    }
  }

  limpiarInteresCompuesto(): void {
    this.capitalInicial = 0;
    this.tasaInteres = 0;
    this.periodoAnios = 0;
    this.resultadoInteresCompuesto = 0;
  }

  limpiarPrestamo(): void {
    this.montoPrestamo = 0;
    this.tasaInteresPrestamo = 0;
    this.plazoAnios = 0;
    this.cuotaMensual = 0;
    this.totalPagar = 0;
    this.totalIntereses = 0;
  }

  limpiarAhorro(): void {
    this.montoInicialAhorro = 0;
    this.aporteMensual = 0;
    this.tasaInteresAhorro = 0;
    this.plazoAniosAhorro = 0;
    this.resultadoAhorro = 0;
    this.totalAportado = 0;
    this.interesesGanados = 0;
  }

  limpiarConversion(): void {
    this.montoConvertir = 0;
    this.tasaCambio = 1000;
    this.resultadoConversion = 0;
  }
}

