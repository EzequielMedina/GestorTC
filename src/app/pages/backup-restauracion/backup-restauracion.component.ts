import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { BackupService } from '../../services/backup.service';
import { NotificationService } from '../../services/notification.service';
import { Backup, BackupConfig } from '../../models/backup.model';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-backup-restauracion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDialogModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './backup-restauracion.component.html',
  styleUrls: ['./backup-restauracion.component.css']
})
export class BackupRestauracionComponent implements OnInit, OnDestroy {
  backups$: Observable<Backup[]>;
  config$: Observable<BackupConfig>;
  config: BackupConfig = {
    activo: false,
    frecuencia: 'SEMANAL',
    maxBackups: 10
  };
  creandoBackup = false;
  restaurando = false;
  fileInput?: HTMLInputElement;

  private subscriptions = new Subscription();

  constructor(
    private backupService: BackupService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {
    this.backups$ = this.backupService.backups$;
    this.config$ = this.backupService.config$;
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.config$.subscribe(config => {
        this.config = { ...config };
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  crearBackupManual(): void {
    this.creandoBackup = true;
    this.backupService.crearBackupManual().pipe(take(1)).subscribe({
      next: (backup) => {
        this.creandoBackup = false;
        this.notificationService.success(`Backup creado exitosamente (${this.formatearFecha(backup.fechaCreacion)})`);
      },
      error: (error) => {
        this.creandoBackup = false;
        this.notificationService.error('Error al crear el backup: ' + (error.message || 'Error desconocido'));
      }
    });
  }

  restaurarBackup(backupId: string): void {
    this.notificationService.confirm(
      'Confirmar Restauración',
      '¿Está seguro de que desea restaurar este backup? Esto reemplazará TODOS los datos actuales. Esta acción no se puede deshacer.',
      'Restaurar',
      'Cancelar'
    ).pipe(take(1)).subscribe(confirm => {
      if (confirm) {
        this.restaurando = true;
        this.backupService.restaurarBackup(backupId).pipe(take(1)).subscribe({
          next: (exitoso) => {
            this.restaurando = false;
            if (exitoso) {
              this.notificationService.success('Backup restaurado exitosamente. Por favor, recarga la página para ver los cambios.');
              // Opcional: recargar la página automáticamente después de 2 segundos
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              this.notificationService.error('No se pudo restaurar el backup');
            }
          },
          error: (error) => {
            this.restaurando = false;
            this.notificationService.error('Error al restaurar el backup: ' + (error.message || 'Error desconocido'));
          }
        });
      }
    });
  }

  exportarBackup(backupId: string): void {
    this.backupService.exportarBackup(backupId).pipe(take(1)).subscribe({
      next: () => {
        this.notificationService.success('Backup exportado exitosamente');
      },
      error: (error) => {
        this.notificationService.error('Error al exportar el backup: ' + (error.message || 'Error desconocido'));
      }
    });
  }

  importarBackup(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.backupService.importarBackup(file).pipe(take(1)).subscribe({
        next: (backup) => {
          this.notificationService.success(`Backup importado exitosamente (${this.formatearFecha(backup.fechaCreacion)})`);
          input.value = ''; // Limpiar input
        },
        error: (error) => {
          this.notificationService.error('Error al importar el backup: ' + (error.message || 'El archivo no es válido'));
          input.value = ''; // Limpiar input
        }
      });
    }
  }

  eliminarBackup(backupId: string): void {
    this.notificationService.confirmDelete('este backup').pipe(take(1)).subscribe(confirm => {
      if (confirm) {
        this.backupService.eliminarBackup(backupId).pipe(take(1)).subscribe({
          next: () => {
            this.notificationService.success('Backup eliminado exitosamente');
          },
          error: (error) => {
            this.notificationService.error('Error al eliminar el backup');
          }
        });
      }
    });
  }

  guardarConfiguracion(): void {
    this.backupService.configurarBackupAutomatico(this.config);
    this.notificationService.success('Configuración de backup automático guardada');
  }

  formatearFecha(fechaISO: string): string {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearTamano(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  getTipoBackupClass(tipo: string): string {
    return tipo === 'AUTOMATICO' ? 'backup-automatico' : 'backup-manual';
  }
}

