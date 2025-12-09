import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Etiqueta } from '../../models/etiqueta.model';
import { EtiquetaService } from '../../services/etiqueta.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-etiquetas-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './etiquetas-selector.component.html',
  styleUrls: ['./etiquetas-selector.component.css']
})
export class EtiquetasSelectorComponent implements OnInit, OnDestroy {
  @Input() etiquetasIds: string[] = [];
  @Output() etiquetasChange = new EventEmitter<string[]>();

  etiquetas: Etiqueta[] = [];
  etiquetasDisponibles: Etiqueta[] = [];
  mostrarSelector = false;

  private subscriptions = new Subscription();

  constructor(
    private etiquetaService: EtiquetaService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.etiquetaService.getEtiquetas$().subscribe(etiquetas => {
        this.etiquetasDisponibles = etiquetas;
        this.etiquetas = etiquetas.filter(e => this.etiquetasIds.includes(e.id));
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleSelector(): void {
    this.mostrarSelector = !this.mostrarSelector;
  }

  seleccionarEtiqueta(etiquetaId: string): void {
    if (!this.etiquetasIds.includes(etiquetaId)) {
      const nuevasEtiquetas = [...this.etiquetasIds, etiquetaId];
      this.etiquetasIds = nuevasEtiquetas;
      this.etiquetasChange.emit(nuevasEtiquetas);
      this.actualizarEtiquetas();
    }
  }

  eliminarEtiqueta(etiquetaId: string): void {
    const nuevasEtiquetas = this.etiquetasIds.filter(id => id !== etiquetaId);
    this.etiquetasIds = nuevasEtiquetas;
    this.etiquetasChange.emit(nuevasEtiquetas);
    this.actualizarEtiquetas();
  }

  private actualizarEtiquetas(): void {
    this.etiquetas = this.etiquetasDisponibles.filter(e => this.etiquetasIds.includes(e.id));
  }

  getEtiquetaPorId(id: string): Etiqueta | undefined {
    return this.etiquetasDisponibles.find(e => e.id === id);
  }

  crearNuevaEtiqueta(): void {
    // Abrir diálogo para crear etiqueta (simplificado, se puede mejorar)
    const nombre = prompt('Nombre de la nueva etiqueta:');
    if (nombre && nombre.trim()) {
      const nuevaEtiqueta = this.etiquetaService.crearEtiqueta(nombre.trim());
      this.seleccionarEtiqueta(nuevaEtiqueta.id);
    }
  }

  getContrastColor(hexColor: string): string {
    // Convertir hex a RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calcular luminosidad
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Retornar blanco o negro según la luminosidad
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}

