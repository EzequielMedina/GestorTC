import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { Alerta, PrioridadAlerta } from '../../models/alert.model';
import { AlertService } from '../../services/alert.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-alert-banner',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatCardModule],
  templateUrl: './alert-banner.component.html',
  styleUrls: ['./alert-banner.component.css']
})
export class AlertBannerComponent implements OnInit, OnDestroy {
  alertas: Alerta[] = [];
  alertasNoVistas: Alerta[] = [];
  mostrarTodas = false;
  colapsado = true; // Por defecto colapsado
  private subscription = new Subscription();

  constructor(
    private alertService: AlertService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.alertService.obtenerAlertasNoVistas$().subscribe(alertas => {
        this.alertasNoVistas = alertas;
        if (this.mostrarTodas) {
          this.alertService.obtenerAlertas$().subscribe(todas => {
            this.alertas = todas;
          });
        } else {
          this.alertas = alertas;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleColapsar(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.colapsado = !this.colapsado;
  }

  toggleMostrarTodas(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.mostrarTodas = !this.mostrarTodas;
    if (this.mostrarTodas) {
      this.alertService.obtenerAlertas$().subscribe(alertas => {
        this.alertas = alertas;
      });
    } else {
      this.alertas = this.alertasNoVistas;
    }
  }

  marcarComoVista(alerta: Alerta, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.alertService.marcarComoVista(alerta.id);
  }

  cerrarAlerta(alerta: Alerta, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.alertService.eliminarAlerta(alerta.id);
  }

  navegarDesdeAlerta(alerta: Alerta): void {
    if (alerta.datosAdicionales?.tarjetaId) {
      this.router.navigate(['/tarjetas']);
    } else if (alerta.datosAdicionales?.prestamoId) {
      this.router.navigate(['/prestamos', alerta.datosAdicionales.prestamoId]);
    }
  }

  getIconoPorTipo(tipo: string): string {
    switch (tipo) {
      case 'TARJETA_VENCIMIENTO_PROXIMO':
        return 'event';
      case 'TARJETA_LIMITE_ALCANZADO':
        return 'warning';
      case 'PRESTAMO_PAGO_PENDIENTE':
        return 'account_balance';
      case 'DOLAR_CAMBIO_SIGNIFICATIVO':
        return 'trending_up';
      default:
        return 'info';
    }
  }

  getColorPorPrioridad(prioridad: PrioridadAlerta): string {
    switch (prioridad) {
      case 'alta':
        return '#dc2626';
      case 'media':
        return '#ca8a04';
      case 'baja':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  }

  getClasePorPrioridad(prioridad: PrioridadAlerta): string {
    return `alerta-${prioridad}`;
  }
}

