import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { Prestamo } from '../../models/prestamo.model';
import { PrestamoService } from '../../services/prestamo.service';

@Component({
  selector: 'app-prestamo-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar' : 'Nuevo' }} Préstamo</h2>
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <mat-dialog-content>
        <div class="form-container">
          <mat-form-field appearance="outline">
            <mat-label>Prestamista</mat-label>
            <input matInput formControlName="prestamista" placeholder="Nombre del prestamista">
            <mat-error *ngIf="form.get('prestamista')?.hasError('required')">
              El prestamista es requerido
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Monto Prestado</mat-label>
            <input matInput type="number" formControlName="montoPrestado" placeholder="0.00">
            <mat-error *ngIf="form.get('montoPrestado')?.hasError('required')">
              El monto es requerido
            </mat-error>
            <mat-error *ngIf="form.get('montoPrestado')?.hasError('min')">
              El monto debe ser mayor a 0
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Moneda</mat-label>
            <mat-select formControlName="moneda">
              <mat-option value="ARS">💵 Pesos Argentinos (ARS)</mat-option>
              <mat-option value="USD">💲 Dólares (USD)</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('moneda')?.hasError('required')">
              La moneda es requerida
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fecha del Préstamo</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="fechaPrestamo">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error *ngIf="form.get('fechaPrestamo')?.hasError('required')">
              La fecha es requerida
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="estado">
              <mat-option value="ACTIVO">Activo</mat-option>
              <mat-option value="FINALIZADO">Finalizado</mat-option>
              <mat-option value="CANCELADO">Cancelado</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Notas</mat-label>
            <textarea matInput formControlName="notas" rows="3"></textarea>
          </mat-form-field>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="cancelar()">Cancelar</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
          Guardar
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
    }
    mat-form-field {
      width: 100%;
    }
  `]
})
export class PrestamoFormComponent implements OnInit {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private prestamoService: PrestamoService,
    private dialogRef: MatDialogRef<PrestamoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Prestamo | null
  ) {
    this.form = this.fb.group({
      prestamista: ['', Validators.required],
      montoPrestado: [0, [Validators.required, Validators.min(0.01)]],
      moneda: ['ARS', Validators.required],
      fechaPrestamo: [new Date(), Validators.required],
      estado: ['ACTIVO', Validators.required],
      notas: ['']
    });
  }

  ngOnInit(): void {
    if (this.data) {
      this.form.patchValue({
        ...this.data,
        fechaPrestamo: new Date(this.data.fechaPrestamo)
      });
    }
  }

  guardar(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      const prestamo: Prestamo = {
        id: this.data ? this.data.id : '', // El servicio generará el ID si está vacío
        ...formValue,
        fechaPrestamo: formValue.fechaPrestamo.toISOString().split('T')[0],
        entregas: this.data ? this.data.entregas : []
      };

      if (this.data) {
        this.prestamoService.actualizarPrestamo(this.data.id, prestamo);
      } else {
        this.prestamoService.agregarPrestamo(prestamo);
      }

      this.dialogRef.close(true);
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
