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
import { PrestamoService } from '../../services/prestamo.service';
import { Entrega } from '../../models/prestamo.model';

@Component({
  selector: 'app-entrega-form',
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
    <h2 mat-dialog-title>{{ data.entrega ? 'Editar' : 'Nueva' }} Entrega</h2>
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <mat-dialog-content>
        <div class="form-container">
          <mat-form-field appearance="outline">
            <mat-label>Monto</mat-label>
            <input matInput type="number" formControlName="monto" placeholder="0.00">
            <mat-error *ngIf="form.get('monto')?.hasError('required')">
              El monto es requerido
            </mat-error>
            <mat-error *ngIf="form.get('monto')?.hasError('min')">
              El monto debe ser mayor a 0
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fecha</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="fecha">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error *ngIf="form.get('fecha')?.hasError('required')">
              La fecha es requerida
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="tipo">
              <mat-option value="PARCIAL">Parcial</mat-option>
              <mat-option value="MENSUAL">Mensual</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Nota</mat-label>
            <textarea matInput formControlName="nota" rows="2"></textarea>
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
      min-width: 350px;
    }
    mat-form-field {
      width: 100%;
    }
  `]
})
export class EntregaFormComponent implements OnInit {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private prestamoService: PrestamoService,
    private dialogRef: MatDialogRef<EntregaFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { prestamoId: string; entrega?: Entrega }
  ) {
    this.form = this.fb.group({
      monto: [0, [Validators.required, Validators.min(0.01)]],
      fecha: [new Date(), Validators.required],
      tipo: ['PARCIAL', Validators.required],
      nota: ['']
    });
  }

  ngOnInit(): void {
    if (this.data.entrega) {
      this.form.patchValue({
        ...this.data.entrega,
        fecha: new Date(this.data.entrega.fecha)
      });
    }
  }

  guardar(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      const entregaData = {
        ...formValue,
        fecha: formValue.fecha.toISOString().split('T')[0]
      };

      if (this.data.entrega) {
        // Editar entrega existente
        this.prestamoService.actualizarEntrega(
          this.data.prestamoId,
          this.data.entrega.id,
          entregaData
        ).subscribe(() => {
          this.dialogRef.close(true);
        });
      } else {
        // Agregar nueva entrega
        this.prestamoService.agregarEntrega(this.data.prestamoId, entregaData).subscribe(() => {
          this.dialogRef.close(true);
        });
      }
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
