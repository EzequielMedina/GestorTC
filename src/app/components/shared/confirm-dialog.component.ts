import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { A11yModule } from '@angular/cdk/a11y';

export interface ConfirmDialogData {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
}

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        A11yModule
    ],
    template: `
    <div class="confirm-dialog">
      <div class="dialog-header">
        <div class="icon-container">
          <mat-icon>help_outline</mat-icon>
        </div>
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>
      
      <mat-dialog-content>
        <p class="dialog-message">{{ data.message }}</p>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()" class="cancel-button">
          {{ data.cancelText }}
        </button>
        <button mat-raised-button color="warn" (click)="onConfirm()" cdkFocusInitial class="confirm-button">
          {{ data.confirmText }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .confirm-dialog {
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
    
    .icon-container {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: rgba(255, 152, 0, 0.1);
      color: var(--warning-yellow);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
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
      color: #333;
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
      gap: 8px;
    }
    
    .cancel-button {
      color: #666;
    }
    
    .cancel-button:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
    
    .confirm-button {
      min-width: 100px;
    }
    
    @media (max-width: 480px) {
      .confirm-dialog {
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
      
      mat-dialog-actions {
        flex-direction: column-reverse;
      }
      
      .cancel-button,
      .confirm-button {
        width: 100%;
      }
    }
  `]
})
export class ConfirmDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
    ) { }

    onConfirm(): void {
        this.dialogRef.close(true);
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }
}
