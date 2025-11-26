import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent } from '../components/shared/confirm-dialog.component';
import { AlertDialogComponent, AlertDialogData } from '../components/shared/alert-dialog.component';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    constructor(
        private snackBar: MatSnackBar,
        private dialog: MatDialog
    ) { }

    /**
     * Muestra una notificación tipo toast
     */
    show(message: string, type: NotificationType = 'info', duration: number = 3000): void {
        const config: MatSnackBarConfig = {
            duration,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: [`notification-${type}`]
        };

        this.snackBar.open(message, '✕', config);
    }

    /**
     * Muestra una notificación de éxito
     */
    success(message: string, duration: number = 3000): void {
        this.show(message, 'success', duration);
    }

    /**
     * Muestra una notificación de error
     */
    error(message: string, duration: number = 5000): void {
        this.show(message, 'error', duration);
    }

    /**
     * Muestra una notificación de advertencia
     */
    warning(message: string, duration: number = 4000): void {
        this.show(message, 'warning', duration);
    }

    /**
     * Muestra una notificación informativa
     */
    info(message: string, duration: number = 3000): void {
        this.show(message, 'info', duration);
    }

    /**
     * Muestra un diálogo de confirmación
     */
    confirm(
        title: string,
        message: string,
        confirmText: string = 'Confirmar',
        cancelText: string = 'Cancelar'
    ): Observable<boolean> {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
                title,
                message,
                confirmText,
                cancelText
            }
        });

        return dialogRef.afterClosed();
    }

    /**
     * Muestra un diálogo de confirmación para eliminar
     */
    confirmDelete(itemName: string): Observable<boolean> {
        return this.confirm(
            'Confirmar eliminación',
            `¿Está seguro de que desea eliminar "${itemName}"? Esta acción no se puede deshacer.`,
            'Eliminar',
            'Cancelar'
        );
    }

    /**
     * Muestra un diálogo de alerta (reemplazo de alert() nativo)
     */
    alert(
        message: string,
        title?: string,
        type: 'info' | 'success' | 'warning' | 'error' = 'info',
        buttonText: string = 'Aceptar'
    ): Observable<void> {
        const dialogRef = this.dialog.open(AlertDialogComponent, {
            width: '400px',
            data: {
                title,
                message,
                type,
                buttonText
            } as AlertDialogData
        });

        return dialogRef.afterClosed();
    }
}
