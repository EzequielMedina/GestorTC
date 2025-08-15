import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Tarjeta } from '../../models/tarjeta.model';

export interface TarjetaDialogData {
  esEdicion: boolean;
  tarjeta?: Partial<Tarjeta>;
}

@Component({
  selector: 'app-tarjeta-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.esEdicion ? 'Editar' : 'Agregar' }} Tarjeta</h2>

    <form [formGroup]="tarjetaForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content>
        <div class="form-container">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nombre de la tarjeta</mat-label>
            <input
              matInput
              formControlName="nombre"
              placeholder="Ej: Visa Oro, Amex Platinum"
              required
            >
            <mat-error>{{ getErrorMessage('nombre') }}</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Banco</mat-label>
            <input
              matInput
              formControlName="banco"
              placeholder="Ej: Banco Nación, Galicia, Santander"
              required
            >
            <mat-error>{{ getErrorMessage('banco') }}</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Límite de crédito</mat-label>
            <input
              matInput
              type="number"
              formControlName="limite"
              placeholder="Ej: 50000"
              min="1"
              required
            >
            <span matTextPrefix>$&nbsp;</span>
            <mat-error>{{ getErrorMessage('limite') }}</mat-error>
          </mat-form-field>

          <div class="row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Día de cierre</mat-label>
              <input
                matInput
                type="number"
                formControlName="diaCierre"
                placeholder="1-31"
                min="1"
                max="31"
                required
              >
              <mat-error>{{ getErrorMessage('diaCierre') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Día de vencimiento</mat-label>
              <input
                matInput
                type="number"
                formControlName="diaVencimiento"
                placeholder="1-31"
                min="1"
                max="31"
                required
              >
              <mat-error>{{ getErrorMessage('diaVencimiento') }}</mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Últimos 4 dígitos</mat-label>
            <input
              matInput
              formControlName="ultimosDigitos"
              placeholder="Últimos 4 dígitos de la tarjeta"
              maxlength="4"
              minlength="4"
              pattern="\d{4}"
              required
            >
            <mat-error>{{ getErrorMessage('ultimosDigitos') }}</mat-error>
          </mat-form-field>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancelar</button>
        <button
          mat-raised-button
          color="primary"
          type="submit"
          [disabled]="!tarjetaForm.valid || loading"
        >
          <span *ngIf="loading" class="spinner-button">
            <mat-spinner diameter="20"></mat-spinner>
          </span>
          <span *ngIf="!loading">
            {{ data.esEdicion ? 'Actualizar' : 'Agregar' }}
          </span>
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form-container {
      padding: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
      max-width: 100%;
    }

    .full-width {
      width: 100%;
    }

    .half-width {
      width: 48%;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .spinner-button {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mat-mdc-form-field {
      margin-bottom: 8px;
    }

    .mat-mdc-form-field-error {
      font-size: 12px;
      line-height: 1.2;
      margin-top: 4px;
      display: block;
    }

    .mat-mdc-form-field-subscript-wrapper {
      position: static;
      margin-top: 4px;
    }

    .mat-mdc-dialog-actions {
      padding: 16px 24px 24px;
      justify-content: flex-end;
    }

    .mat-mdc-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    @media (max-width: 600px) {
      .form-container {
        min-width: 100%;
        padding: 8px 0;
      }

      .row {
        flex-direction: column;
        gap: 0;
      }

      .half-width {
        width: 100%;
      }
    }
  `]
})
export class TarjetaDialogComponent {
  tarjetaForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TarjetaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TarjetaDialogData
  ) {
    this.tarjetaForm = this.fb.group({
      nombre: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          Validators.pattern(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]+$/)
        ]
      ],
      banco: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          Validators.pattern(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]+$/)
        ]
      ],
      limite: [
        null,
        [
          Validators.required,
          Validators.min(100), // Mínimo $100
          Validators.max(10000000), // Máximo $10,000,000
          Validators.pattern(/^\d+(\.\d{1,2})?$/) // Acepta decimales opcionales con hasta 2 decimales
        ]
      ],
      diaCierre: [
        null,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(31),
          Validators.pattern(/^[1-9]|[12][0-9]|3[01]$/) // 1-31 sin ceros a la izquierda
        ]
      ],
      diaVencimiento: [
        null,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(31),
          Validators.pattern(/^[1-9]|[12][0-9]|3[01]$/) // 1-31 sin ceros a la izquierda
        ]
      ],
      ultimosDigitos: [
        '', 
        [
          Validators.required, 
          Validators.pattern(/^\d{4}$/),
          (control: AbstractControl): ValidationErrors | null => {
            // Validación personalizada para asegurar que no sean todos los dígitos iguales
            const value = control.value;
            if (!value) return null;
            return /^(\d)\1{3}$/.test(value) ? { allSameDigits: true } : null;
          }
        ]
      ]
    }, {
      validators: [
        this.validateDiasCiclo.bind(this)
      ]
    });

    if (this.data.esEdicion && this.data.tarjeta) {
      this.tarjetaForm.patchValue(this.data.tarjeta);
    }
  }

  // Validador personalizado para verificar la relación entre días de cierre y vencimiento
  private validateDiasCiclo(formGroup: FormGroup) {
    const diaCierre = formGroup.get('diaCierre')?.value;
    const diaVencimiento = formGroup.get('diaVencimiento')?.value;

    if (!diaCierre || !diaVencimiento) {
      return null;
    }

    // El día de vencimiento debe ser posterior al día de cierre (considerando el ciclo)
    if (diaVencimiento <= diaCierre) {
      formGroup.get('diaVencimiento')?.setErrors({ diaInvalido: true });
      return { diasInvalidos: true };
    }

    // Si hay un error previo pero ahora es válido, limpiamos el error
    if (formGroup.get('diaVencimiento')?.hasError('diaInvalido')) {
      formGroup.get('diaVencimiento')?.setErrors(null);
    }

    return null;
  }

  // Obtener mensaje de error para un campo
  getErrorMessage(controlName: string): string {
    const control = this.tarjetaForm.get(controlName);

    if (!control || !control.errors) return '';

    if (control.hasError('required')) {
      return 'Este campo es obligatorio';
    } else if (control.hasError('min')) {
      if (controlName === 'limite') return 'El monto mínimo es $100';
      return `El valor mínimo es ${control.getError('min').min}`;
    } else if (control.hasError('max')) {
      if (controlName === 'limite') return 'El monto máximo es $10,000,000';
      return `El valor máximo es ${control.getError('max').max}`;
    } else if (control.hasError('pattern')) {
      if (controlName === 'ultimosDigitos') return 'Debe contener exactamente 4 dígitos';
      if (controlName === 'nombre' || controlName === 'banco') return 'Solo se permiten letras, números, espacios y guiones';
      return 'Formato inválido';
    } else if (control.hasError('allSameDigits')) {
      return 'Los dígitos no pueden ser todos iguales';
    } else if (control.hasError('diaInvalido')) {
      return 'El día de vencimiento debe ser posterior al día de cierre';
    }

    return 'Valor inválido';
  }

  // Manejar envío del formulario
  onSubmit(): void {
    // Marcar todos los campos como tocados para mostrar errores
    this.markFormGroupTouched(this.tarjetaForm);

    if (this.tarjetaForm.valid) {
      this.loading = true;
      // Simular tiempo de carga
      setTimeout(() => {
        this.dialogRef.close(this.tarjetaForm.value);
        this.loading = false;
      }, 1000);
    } else {
      // Enfocar el primer campo con error
      const firstError = this.findFirstInvalidControl(this.tarjetaForm);
      if (firstError) {
        const element = document.querySelector(`[formControlName="${firstError}"]`);
        if (element) {
          (element as HTMLElement).focus();
        }
      }
    }
  }

  // Marcar todos los controles como tocados
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Encontrar el primer control inválido
  private findFirstInvalidControl(group: FormGroup): string | null {
    for (const controlName in group.controls) {
      const control = group.get(controlName);
      if (control?.invalid) {
        return controlName;
      }
    }
    return null;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
