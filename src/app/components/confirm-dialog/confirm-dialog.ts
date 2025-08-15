import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

/**
 * Interfaz para los datos que recibe el diálogo de confirmación
 */
export interface ConfirmDialogData {
  titulo: string;
  mensaje: string;
  textoBotonConfirmar?: string;
  textoBotonCancelar?: string;
  colorBotonConfirmar?: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">{{ data.titulo }}</h2>
    
    <mat-dialog-content>
      <p class="dialog-message">{{ data.mensaje }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button 
        mat-button 
        (click)="onDismiss()"
        class="cancel-button"
      >
        {{ data.textoBotonCancelar || 'Cancelar' }}
      </button>
      
      <button 
        mat-raised-button 
        [color]="data.colorBotonConfirmar || 'warn'" 
        (click)="onConfirm()"
        class="confirm-button"
      >
        {{ data.textoBotonConfirmar || 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      margin: 0;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
      font-size: 20px;
      font-weight: 500;
    }
    
    .dialog-message {
      margin: 16px 0;
      font-size: 16px;
      line-height: 1.5;
      color: rgba(0, 0, 0, 0.87);
    }
    
    .mat-mdc-dialog-content {
      padding: 16px 24px;
      margin: 0;
    }
    
    .mat-mdc-dialog-actions {
      padding: 8px 16px 16px;
      margin: 0;
      min-height: auto;
      justify-content: flex-end;
    }
    
    .confirm-button {
      margin-left: 8px;
    }
    
    @media (max-width: 599px) {
      .mat-mdc-dialog-actions {
        flex-direction: column;
        gap: 8px;
      }
      
      .confirm-button, 
      .cancel-button {
        width: 100%;
        margin: 0;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  /**
   * Maneja el evento de confirmación
   */
  onConfirm(): void {
    this.dialogRef.close(true);
  }

  /**
   * Maneja el evento de cancelación
   */
  onDismiss(): void {
    this.dialogRef.close(false);
  }
}
