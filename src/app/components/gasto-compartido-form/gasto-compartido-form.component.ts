import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { PersonaGasto, GastoCompartidoUtil } from '../../models/gasto-compartido.model';
import { GastosCompartidosService } from '../../services/gastos-compartidos.service';

@Component({
  selector: 'app-gasto-compartido-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule
  ],
  templateUrl: './gasto-compartido-form.component.html',
  styleUrls: ['./gasto-compartido-form.component.css']
})
export class GastoCompartidoFormComponent implements OnInit {
  @Input() personas: PersonaGasto[] = [];
  @Input() montoTotal: number = 0;
  @Input() modoEquitativo: boolean = false;

  @Output() personasChange = new EventEmitter<PersonaGasto[]>();
  @Output() validacionChange = new EventEmitter<{ valido: boolean; mensaje?: string }>();

  personasEditando: PersonaGasto[] = [];
  errorValidacion?: string;
  esValido = true;

  constructor(private gastosCompartidosService: GastosCompartidosService) {}

  ngOnInit(): void {
    this.personasEditando = this.personas.length > 0 
      ? [...this.personas] 
      : [];
    this.actualizarMontos();
  }

  agregarPersona(): void {
    if (this.personasEditando.length >= 5) {
      this.errorValidacion = 'No se pueden agregar más de 5 personas';
      return;
    }

    this.personasEditando.push({
      nombre: '',
      porcentaje: 0,
      monto: 0
    });
  }

  eliminarPersona(index: number): void {
    this.personasEditando.splice(index, 1);
    this.actualizarMontos();
    this.validar();
  }

  dividirEquitativamente(): void {
    const numeroPersonas = this.personasEditando.length;
    if (numeroPersonas === 0) {
      return;
    }

    const porcentajePorPersona = 100 / numeroPersonas;
    this.personasEditando.forEach(persona => {
      persona.porcentaje = porcentajePorPersona;
    });

    this.actualizarMontos();
    this.validar();
  }

  onPorcentajeChange(index: number): void {
    this.actualizarMontos();
    this.validar();
  }

  actualizarMontos(): void {
    if (this.montoTotal > 0) {
      this.personasEditando = GastoCompartidoUtil.calcularMontos(
        this.personasEditando,
        this.montoTotal
      );
    }
    this.emitirCambios();
  }

  validar(): void {
    const resultado = this.gastosCompartidosService.validarGastoCompartidoNuevo(this.personasEditando);
    this.esValido = resultado.valido;
    this.errorValidacion = resultado.mensaje;
    this.validacionChange.emit(resultado);
  }

  emitirCambios(): void {
    this.personasChange.emit([...this.personasEditando]);
  }

  get sumaPorcentajes(): number {
    return this.personasEditando.reduce((sum, p) => sum + p.porcentaje, 0);
  }

  get porcentajeTitular(): number {
    return 100 - this.sumaPorcentajes;
  }

  get montoTitular(): number {
    return (this.montoTotal * this.porcentajeTitular) / 100;
  }
}

