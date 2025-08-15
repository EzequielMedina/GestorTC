import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tarjeta } from '../../models/tarjeta.model';

@Component({
  selector: 'app-tarjeta-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">{{ esEdicion ? 'Editar' : 'Agregar' }} Tarjeta</h3>
          <button class="modal-close" (click)="cancelar()">×</button>
        </div>
        
        <div class="modal-body">
          <form (ngSubmit)="guardar()" #tarjetaForm="ngForm">
            <div class="form-group">
              <label for="nombre" class="form-label">Nombre de la Tarjeta *</label>
              <input 
                type="text" 
                id="nombre" 
                name="nombre"
                [(ngModel)]="tarjeta.nombre" 
                class="form-input"
                placeholder="Ej: Visa Oro, Mastercard Gold"
                required
                #nombre="ngModel"
              />
              <div class="form-error" *ngIf="nombre.invalid && nombre.touched">
                El nombre es requerido
              </div>
            </div>
            
            <div class="form-group">
              <label for="banco" class="form-label">Banco</label>
              <input 
                type="text" 
                id="banco" 
                name="banco"
                [(ngModel)]="tarjeta.banco" 
                class="form-input"
                placeholder="Ej: Banco Santander, BBVA"
              />
            </div>
            
            <div class="form-group">
              <label for="limite" class="form-label">Límite de Crédito *</label>
              <input 
                type="number" 
                id="limite" 
                name="limite"
                [(ngModel)]="tarjeta.limite" 
                class="form-input"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                #limite="ngModel"
              />
              <div class="form-error" *ngIf="limite.invalid && limite.touched">
                El límite es requerido y debe ser mayor a 0
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="ultimosDigitos" class="form-label">Últimos 4 Dígitos</label>
                <input 
                  type="text" 
                  id="ultimosDigitos" 
                  name="ultimosDigitos"
                  [(ngModel)]="tarjeta.ultimosDigitos" 
                  class="form-input"
                  placeholder="1234"
                  maxlength="4"
                  pattern="[0-9]{4}"
                />
                                 <div class="form-error" *ngIf="tarjeta.ultimosDigitos && tarjeta.ultimosDigitos.length !== 4">
                   Debe ser exactamente 4 dígitos
                 </div>
              </div>
              
              <div class="form-group">
                <label for="diaCierre" class="form-label">Día de Cierre</label>
                <input 
                  type="number" 
                  id="diaCierre" 
                  name="diaCierre"
                  [(ngModel)]="tarjeta.diaCierre" 
                  class="form-input"
                  placeholder="15"
                  min="1"
                  max="31"
                />
              </div>
              
              <div class="form-group">
                <label for="diaVencimiento" class="form-label">Día de Vencimiento</label>
                <input 
                  type="number" 
                  id="diaVencimiento" 
                  name="diaVencimiento"
                  [(ngModel)]="tarjeta.diaVencimiento" 
                  class="form-input"
                  placeholder="20"
                  min="1"
                  max="31"
                />
              </div>
            </div>
            
            
          </form>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" (click)="cancelar()">
            Cancelar
          </button>
          <button 
            type="button" 
            class="btn btn-primary" 
            (click)="guardar()"
            [disabled]="tarjetaForm.invalid"
          >
            {{ esEdicion ? 'Actualizar' : 'Agregar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    .modal-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideIn 0.3s ease;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #6b7280;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .modal-close:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .modal-body {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 16px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-input.ng-invalid.ng-touched {
      border-color: #ef4444;
    }

    .color-input {
      width: 60px;
      height: 40px;
      padding: 2px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      cursor: pointer;
    }

    .form-error {
      font-size: 12px;
      color: #ef4444;
      margin-top: 4px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid #e5e7eb;
    }

    .btn {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-outline {
      background: transparent;
      color: #6b7280;
      border: 1px solid #d1d5db;
    }

    .btn-outline:hover {
      background: #f9fafb;
      color: #374151;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    /* Responsive */
    @media (max-width: 640px) {
      .modal-container {
        width: 95%;
        margin: 20px;
      }

      .modal-header {
        padding: 16px 20px;
      }

      .modal-body {
        padding: 20px;
      }

      .modal-footer {
        padding: 16px 20px;
        flex-direction: column;
      }

      .form-row {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `
})
export class TarjetaDialogComponent {
     @Input() tarjeta: Tarjeta = {
     id: '',
     nombre: '',
     banco: '',
     limite: 0,
     ultimosDigitos: '',
     diaCierre: 0,
     diaVencimiento: 0
   };
  
  @Input() esEdicion = false;
  
  @Output() guardarTarjeta = new EventEmitter<Tarjeta>();
  @Output() cancelarDialog = new EventEmitter<void>();

  guardar(): void {
    if (this.tarjeta.nombre && this.tarjeta.limite > 0) {
      this.guardarTarjeta.emit(this.tarjeta);
    }
  }

  cancelar(): void {
    this.cancelarDialog.emit();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.cancelar();
    }
  }
}
