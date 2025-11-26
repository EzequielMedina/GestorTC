import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { A11yModule } from '@angular/cdk/a11y';

export interface AlertDialogData {
    title?: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    buttonText?: string;
}

@Component({
    selector: 'app-alert-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        A11yModule
    ],
    template: `
    <div class="alert-dialog">
      <div class="dialog-header" [ngClass]="'header-' + (data.type || 'info')">
        <div class="icon-container" [ngClass]="'icon-' + (data.type || 'info')">
          <mat-icon>{{ getIcon() }}</mat-icon>
        </div>
        <h2 mat-dialog-title *ngIf="data.title">{{ data.title }}</h2>
      </div>
      
      <mat-dialog-content>
        <p class="dialog-message">{{ data.message }}</p>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-raised-button 
                [color]="getButtonColor()" 
                (click)="onClose()" 
                cdkFocusInitial>
          {{ data.buttonText || 'Aceptar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .alert-dialog {
      padding: 8px;
      min-width: 320px;
      max-width: 500px;
    }
    
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    
    .dialog-header.header-info {
      color: var(--primary);
    }
    
    .dialog-header.header-success {
      color: var(--success-green);
    }
    
    .dialog-header.header-warning {
      color: var(--warning-yellow);
    }
    
    .dialog-header.header-error {
      color: var(--danger-red);
    }
    
    .icon-container {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .icon-container.icon-info {
      background-color: rgba(0, 102, 102, 0.1);
      color: var(--primary);
    }
    
    .icon-container.icon-success {
      background-color: rgba(22, 163, 74, 0.1);
      color: var(--success-green);
    }
    
    .icon-container.icon-warning {
      background-color: rgba(202, 138, 4, 0.1);
      color: var(--warning-yellow);
    }
    
    .icon-container.icon-error {
      background-color: rgba(220, 38, 38, 0.1);
      color: var(--danger-red);
    }
    
    .icon-container mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
    
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      flex: 1;
    }
    
    .dialog-message {
      margin: 0;
      color: #666;
      line-height: 1.6;
      font-size: 15px;
    }
    
    mat-dialog-content {
      padding: 0 24px 8px 24px;
    }
    
    mat-dialog-actions {
      margin-top: 24px;
      padding: 8px 0 0 0;
      justify-content: flex-end;
    }
    
    button {
      min-width: 100px;
    }
    
    @media (max-width: 480px) {
      .alert-dialog {
        min-width: 280px;
      }
      
      .dialog-header {
        flex-direction: column;
        text-align: center;
        gap: 12px;
      }
      
      h2 {
        font-size: 18px;
      }
      
      .dialog-message {
        font-size: 14px;
      }
    }
  `]
})
export class AlertDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<AlertDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: AlertDialogData
    ) { }

    getIcon(): string {
        switch (this.data.type) {
            case 'success':
                return 'check_circle';
            case 'warning':
                return 'warning';
            case 'error':
                return 'error';
            default:
                return 'info';
        }
    }

    getButtonColor(): string {
        switch (this.data.type) {
            case 'success':
                return 'primary';
            case 'warning':
                return 'accent';
            case 'error':
                return 'warn';
            default:
                return 'primary';
        }
    }

    onClose(): void {
        this.dialogRef.close();
    }
}

