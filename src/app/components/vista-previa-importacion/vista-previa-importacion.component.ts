import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { GastoServicioImportado, ValidationError, ValidationWarning } from '../../models/gasto-servicio-importado.model';
import { Categoria } from '../../models/categoria.model';
import { Tarjeta } from '../../models/tarjeta.model';

@Component({
  selector: 'app-vista-previa-importacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatPaginatorModule
  ],
  templateUrl: './vista-previa-importacion.component.html',
  styleUrls: ['./vista-previa-importacion.component.css']
})
export class VistaPreviaImportacionComponent implements OnInit {
  @Input() datos: GastoServicioImportado[] = [];
  @Input() categorias: Categoria[] = [];
  @Input() tarjetas: Tarjeta[] = [];
  @Input() errores: ValidationError[] = [];
  @Input() advertencias: ValidationWarning[] = [];
  @Input() duplicados: any[] = [];

  @Output() editarDato = new EventEmitter<{ index: number; dato: GastoServicioImportado }>();
  @Output() excluirDato = new EventEmitter<number>();
  @Output() importar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  displayedColumns: string[] = ['fila', 'fecha', 'descripcion', 'monto', 'categoria', 'tarjeta', 'estado', 'acciones'];
  datosPaginados: GastoServicioImportado[] = [];
  pageSize = 10;
  pageIndex = 0;

  ngOnInit(): void {
    this.actualizarPaginacion();
  }

  actualizarPaginacion(): void {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.datosPaginados = this.datos.slice(start, end);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.actualizarPaginacion();
  }

  getResumen(): {
    total: number;
    montoTotal: number;
    exitosos: number;
    conErrores: number;
    conAdvertencias: number;
    excluidos: number;
  } {
    return {
      total: this.datos.length,
      montoTotal: this.datos
        .filter(d => !d.excluir && !d.errores?.length)
        .reduce((sum, d) => sum + d.monto, 0),
      exitosos: this.datos.filter(d => !d.excluir && !d.errores?.length).length,
      conErrores: this.datos.filter(d => d.errores?.length).length,
      conAdvertencias: this.datos.filter(d => d.advertencias?.length).length,
      excluidos: this.datos.filter(d => d.excluir).length
    };
  }

  tieneError(dato: GastoServicioImportado): boolean {
    return !!dato.errores && dato.errores.length > 0;
  }

  tieneAdvertencia(dato: GastoServicioImportado): boolean {
    return !!dato.advertencias && dato.advertencias.length > 0;
  }

  esDuplicado(dato: GastoServicioImportado): boolean {
    return this.duplicados.some(d => d.fila === dato.filaOriginal);
  }

  getEstado(dato: GastoServicioImportado): 'ok' | 'error' | 'advertencia' | 'duplicado' | 'excluido' {
    if (dato.excluir) return 'excluido';
    if (this.tieneError(dato)) return 'error';
    if (this.esDuplicado(dato)) return 'duplicado';
    if (this.tieneAdvertencia(dato)) return 'advertencia';
    return 'ok';
  }

  getNombreCategoria(categoriaId?: string): string {
    if (!categoriaId) return 'Sin categoría';
    const categoria = this.categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  }

  getNombreTarjeta(tarjetaId?: string): string {
    if (!tarjetaId) return 'Sin tarjeta';
    const tarjeta = this.tarjetas.find(t => t.id === tarjetaId);
    return tarjeta?.nombre || 'Sin tarjeta';
  }

  onEditar(index: number): void {
    const datoReal = this.datos.find(d => d.filaOriginal === this.datosPaginados[index].filaOriginal);
    if (datoReal) {
      this.editarDato.emit({ index: this.datos.indexOf(datoReal), dato: datoReal });
    }
  }

  onExcluir(index: number): void {
    const datoReal = this.datos.find(d => d.filaOriginal === this.datosPaginados[index].filaOriginal);
    if (datoReal) {
      datoReal.excluir = !datoReal.excluir;
      this.excluirDato.emit(this.datos.indexOf(datoReal));
    }
  }

  onImportar(): void {
    this.importar.emit();
  }

  onCancelar(): void {
    this.cancelar.emit();
  }

  getConfianzaColor(confianza?: number): string {
    if (!confianza) return '';
    if (confianza >= 90) return 'green';
    if (confianza >= 70) return 'orange';
    return 'red';
  }
}

