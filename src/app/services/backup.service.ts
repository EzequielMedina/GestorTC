import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { map, tap, take } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Backup, BackupDatos, BackupConfig, BackupMetadata } from '../models/backup.model';
import { TarjetaService } from './tarjeta';
import { GastoService } from './gasto';
import { PrestamoService } from './prestamo.service';
import { CompraDolarService } from './compra-dolar.service';
import { VentaDolarService } from './venta-dolar.service';
import { PresupuestoService } from './presupuesto.service';
import { CategoriaService } from './categoria.service';
import { AlertService } from './alert.service';
import { FiltroAvanzadoService } from './filtro-avanzado.service';
import { EtiquetaService } from './etiqueta.service';
import { NotaService } from './nota.service';
import { saveAs } from 'file-saver';

const STORAGE_KEY_BACKUPS = 'gestor_tc_backups';
const STORAGE_KEY_CONFIG = 'gestor_tc_backup_config';
const APP_VERSION = '2.0.0'; // Versión actual de la app

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private backupsSubject = new BehaviorSubject<Backup[]>(this.loadBackupsFromStorage());
  public backups$ = this.backupsSubject.asObservable();

  private configSubject = new BehaviorSubject<BackupConfig>(this.loadConfigFromStorage());
  public config$ = this.configSubject.asObservable();

  constructor(
    private tarjetaService: TarjetaService,
    private gastoService: GastoService,
    private prestamoService: PrestamoService,
    private compraDolarService: CompraDolarService,
    private ventaDolarService: VentaDolarService,
    private presupuestoService: PresupuestoService,
    private categoriaService: CategoriaService,
    private alertService: AlertService,
    private filtroAvanzadoService: FiltroAvanzadoService,
    private etiquetaService: EtiquetaService,
    private notaService: NotaService
  ) {
    this.inicializarBackupAutomatico();
  }

  /**
   * Crea un backup manual de todos los datos
   */
  crearBackupManual(): Observable<Backup> {
    return this.crearBackup('MANUAL');
  }

  /**
   * Crea un backup automático
   */
  crearBackupAutomatico(): Observable<Backup> {
    return this.crearBackup('AUTOMATICO');
  }

  /**
   * Crea un backup (interno)
   */
  private crearBackup(tipo: 'AUTOMATICO' | 'MANUAL'): Observable<Backup> {
    return this.recopilarDatos().pipe(
      map(datos => {
        const metadata = this.calcularMetadata(datos);
        const backup: Backup = {
          id: uuidv4(),
          fechaCreacion: new Date().toISOString(),
          version: APP_VERSION,
          tipo,
          datos,
          metadata
        };

        // Guardar backup
        const backups = [...this.backupsSubject.value, backup];
        this.guardarBackups(backups);
        this.backupsSubject.next(backups);

        // Actualizar configuración si es automático
        if (tipo === 'AUTOMATICO') {
          const config = { ...this.configSubject.value, ultimoBackup: backup.fechaCreacion };
          this.guardarConfig(config);
          this.configSubject.next(config);
        }

        return backup;
      })
    );
  }

  /**
   * Recopila todos los datos de los servicios
   */
  private recopilarDatos(): Observable<BackupDatos> {
    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$(),
      this.prestamoService.getPrestamos$(),
      this.compraDolarService.obtenerCompras(),
      this.ventaDolarService.obtenerVentas(),
      this.presupuestoService.presupuestos$,
      this.categoriaService.getCategorias$(),
      this.filtroAvanzadoService.getFiltrosGuardados$(),
      this.etiquetaService.getEtiquetas$(),
      this.notaService.getNotas$()
    ]).pipe(
      map(([tarjetas, gastos, prestamos, compraDolares, ventaDolares, presupuestos, categorias, filtrosGuardados, etiquetas, notas]) => {
        // Obtener alertas vistas desde localStorage directamente
        let alertasVistas: string[] = [];
        try {
          const stored = localStorage.getItem('gestor_tc_alertas_vistas');
          if (stored) {
            alertasVistas = JSON.parse(stored);
          }
        } catch (error) {
          console.error('Error al obtener alertas vistas:', error);
        }

        return {
          tarjetas: tarjetas || [],
          gastos: gastos || [],
          prestamos: prestamos || [],
          compraDolares: compraDolares || [],
          ventaDolares: ventaDolares || [],
          presupuestos: presupuestos || [],
          categorias: categorias || [],
          alertasVistas: alertasVistas || [],
          filtrosGuardados: filtrosGuardados || [],
          etiquetas: etiquetas || [],
          notas: notas || []
        };
      })
    );
  }

  /**
   * Calcula los metadatos del backup
   */
  private calcularMetadata(datos: BackupDatos): BackupMetadata {
    const resumen = {
      cantidadTarjetas: datos.tarjetas.length,
      cantidadGastos: datos.gastos.length,
      cantidadPrestamos: datos.prestamos.length,
      cantidadComprasDolares: datos.compraDolares.length,
      cantidadVentasDolares: datos.ventaDolares.length,
      cantidadPresupuestos: datos.presupuestos.length,
      cantidadCategorias: datos.categorias.length,
      cantidadFiltrosGuardados: datos.filtrosGuardados?.length || 0,
      cantidadEtiquetas: datos.etiquetas?.length || 0,
      cantidadNotas: datos.notas?.length || 0
    };

    const totalRegistros = Object.values(resumen).reduce((sum, val) => sum + val, 0);
    const tamaño = JSON.stringify(datos).length;

    return {
      totalRegistros,
      tamano: tamaño,
      resumen
    };
  }

  /**
   * Restaura un backup
   */
  restaurarBackup(backupId: string): Observable<boolean> {
    const backup = this.backupsSubject.value.find(b => b.id === backupId);
    if (!backup) {
      return of(false);
    }

    return this.validarBackup(backup).pipe(
      map(esValido => {
        if (!esValido) {
          throw new Error('El backup no es válido o está corrupto');
        }

        // Restaurar datos en cada servicio
        this.restaurarDatos(backup.datos);
        return true;
      })
    );
  }

  /**
   * Valida la integridad de un backup
   */
  validarBackup(backup: Backup): Observable<boolean> {
    return of(
      backup !== null &&
      backup !== undefined &&
      backup.id !== undefined &&
      backup.fechaCreacion !== undefined &&
      backup.datos !== undefined &&
      backup.metadata !== undefined &&
      Array.isArray(backup.datos.tarjetas) &&
      Array.isArray(backup.datos.gastos) &&
      Array.isArray(backup.datos.prestamos) &&
      Array.isArray(backup.datos.compraDolares) &&
      Array.isArray(backup.datos.ventaDolares) &&
      Array.isArray(backup.datos.presupuestos) &&
      Array.isArray(backup.datos.categorias) &&
      Array.isArray(backup.datos.alertasVistas) &&
      (backup.datos.filtrosGuardados === undefined || Array.isArray(backup.datos.filtrosGuardados)) &&
      (backup.datos.etiquetas === undefined || Array.isArray(backup.datos.etiquetas)) &&
      (backup.datos.notas === undefined || Array.isArray(backup.datos.notas))
    );
  }

  /**
   * Restaura los datos en los servicios
   */
  private restaurarDatos(datos: BackupDatos): void {
    try {
      // Guardar todos los datos en localStorage
      if (datos.tarjetas.length >= 0) {
        localStorage.setItem('gestor_tc_tarjetas', JSON.stringify(datos.tarjetas));
      }

      if (datos.gastos.length >= 0) {
        localStorage.setItem('gestor_tc_gastos', JSON.stringify(datos.gastos));
      }

      if (datos.prestamos.length >= 0) {
        localStorage.setItem('gestor_tc_prestamos', JSON.stringify(datos.prestamos));
      }

      if (datos.compraDolares.length >= 0) {
        localStorage.setItem('compras_dolar', JSON.stringify(datos.compraDolares));
      }

      if (datos.ventaDolares.length >= 0) {
        localStorage.setItem('ventas_dolar', JSON.stringify(datos.ventaDolares));
      }

      if (datos.presupuestos.length >= 0) {
        localStorage.setItem('gestor_tc_presupuestos', JSON.stringify(datos.presupuestos));
      }

      if (datos.categorias.length >= 0) {
        localStorage.setItem('gestor_tc_categorias', JSON.stringify(datos.categorias));
      }

      if (datos.alertasVistas.length >= 0) {
        localStorage.setItem('gestor_tc_alertas_vistas', JSON.stringify(datos.alertasVistas));
      }

      if (datos.filtrosGuardados && datos.filtrosGuardados.length >= 0) {
        localStorage.setItem('gestor_tc_filtros_guardados', JSON.stringify(datos.filtrosGuardados));
      }

      if (datos.etiquetas && datos.etiquetas.length >= 0) {
        localStorage.setItem('gestor_tc_etiquetas', JSON.stringify(datos.etiquetas));
      }

      if (datos.notas && datos.notas.length >= 0) {
        localStorage.setItem('gestor_tc_notas', JSON.stringify(datos.notas));
      }

      // Forzar recarga de los servicios accediendo a sus métodos privados de carga
      // Nota: Esto requiere acceso a métodos privados, pero es necesario para la restauración
      // Los servicios recargarán desde localStorage en su próximo acceso
      this.recargarServicios();
    } catch (error) {
      console.error('Error al restaurar datos:', error);
      throw error;
    }
  }

  /**
   * Fuerza la recarga de los servicios desde localStorage
   */
  private recargarServicios(): void {
    // Recargar tarjetas
    try {
      const tarjetas = JSON.parse(localStorage.getItem('gestor_tc_tarjetas') || '[]');
      if (this.tarjetaService['tarjetasSubject']) {
        this.tarjetaService['tarjetasSubject'].next(tarjetas);
      }
    } catch (e) {}

    // Recargar gastos
    try {
      const gastos = JSON.parse(localStorage.getItem('gestor_tc_gastos') || '[]');
      if (this.gastoService['gastosSubject']) {
        this.gastoService['gastosSubject'].next(gastos);
      }
    } catch (e) {}

    // Recargar préstamos
    try {
      const prestamos = JSON.parse(localStorage.getItem('gestor_tc_prestamos') || '[]');
      if (this.prestamoService['prestamosSubject']) {
        this.prestamoService['prestamosSubject'].next(prestamos);
      }
    } catch (e) {}

    // Recargar compras de dólares
    try {
      const compras = JSON.parse(localStorage.getItem('compras_dolar') || '[]');
      if (this.compraDolarService['comprasSubject']) {
        this.compraDolarService['comprasSubject'].next(compras);
      }
    } catch (e) {}

    // Recargar ventas de dólares
    try {
      const ventas = JSON.parse(localStorage.getItem('ventas_dolar') || '[]');
      if (this.ventaDolarService['ventasSubject']) {
        this.ventaDolarService['ventasSubject'].next(ventas);
      }
    } catch (e) {}

    // Recargar presupuestos
    try {
      const presupuestos = JSON.parse(localStorage.getItem('gestor_tc_presupuestos') || '[]');
      if (this.presupuestoService['presupuestosSubject']) {
        this.presupuestoService['presupuestosSubject'].next(presupuestos);
      }
    } catch (e) {}

    // Recargar categorías
    try {
      const categorias = JSON.parse(localStorage.getItem('gestor_tc_categorias') || '[]');
      if (this.categoriaService['categoriasSubject']) {
        this.categoriaService['categoriasSubject'].next(categorias);
      }
    } catch (e) {}
  }

  /**
   * Exporta un backup a archivo JSON
   */
  exportarBackup(backupId: string): Observable<void> {
    const backup = this.backupsSubject.value.find(b => b.id === backupId);
    if (!backup) {
      return of(undefined);
    }

    return of(undefined).pipe(
      tap(() => {
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const fecha = new Date(backup.fechaCreacion).toISOString().split('T')[0];
        saveAs(blob, `backup-gestor-tc-${fecha}-${backup.id.substring(0, 8)}.json`);
      })
    );
  }

  /**
   * Importa un backup desde archivo JSON
   */
  importarBackup(archivo: File): Observable<Backup> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const backup: Backup = JSON.parse(e.target.result);
          this.validarBackup(backup).subscribe(esValido => {
            if (esValido) {
              // Agregar backup a la lista
              const backups = [...this.backupsSubject.value, backup];
              this.guardarBackups(backups);
              this.backupsSubject.next(backups);
              observer.next(backup);
              observer.complete();
            } else {
              observer.error(new Error('El archivo de backup no es válido'));
            }
          });
        } catch (error) {
          observer.error(new Error('Error al leer el archivo de backup'));
        }
      };
      reader.onerror = () => {
        observer.error(new Error('Error al leer el archivo'));
      };
      reader.readAsText(archivo);
    });
  }

  /**
   * Elimina un backup
   */
  eliminarBackup(backupId: string): Observable<boolean> {
    const backups = this.backupsSubject.value.filter(b => b.id !== backupId);
    this.guardarBackups(backups);
    this.backupsSubject.next(backups);
    return of(true);
  }

  /**
   * Obtiene un backup por ID
   */
  getBackupById(id: string): Observable<Backup | undefined> {
    return this.backups$.pipe(
      map(backups => backups.find(b => b.id === id))
    );
  }

  /**
   * Compara dos backups y devuelve las diferencias
   */
  compararBackups(backup1Id: string, backup2Id: string): Observable<any> {
    const backup1 = this.backupsSubject.value.find(b => b.id === backup1Id);
    const backup2 = this.backupsSubject.value.find(b => b.id === backup2Id);

    if (!backup1 || !backup2) {
      return of(null);
    }

    const diferencias: any = {
      tarjetas: {
        agregadas: backup2.datos.tarjetas.filter(t2 => !backup1.datos.tarjetas.find(t1 => t1.id === t2.id)),
        eliminadas: backup1.datos.tarjetas.filter(t1 => !backup2.datos.tarjetas.find(t2 => t2.id === t1.id)),
        modificadas: []
      },
      gastos: {
        agregados: backup2.datos.gastos.filter(g2 => !backup1.datos.gastos.find(g1 => g1.id === g2.id)),
        eliminados: backup1.datos.gastos.filter(g1 => !backup2.datos.gastos.find(g2 => g2.id === g1.id)),
        modificados: []
      }
    };

    return of(diferencias);
  }

  /**
   * Configura el backup automático
   */
  configurarBackupAutomatico(config: BackupConfig): void {
    this.guardarConfig(config);
    this.configSubject.next(config);
    this.inicializarBackupAutomatico();
  }

  /**
   * Inicializa el sistema de backup automático
   */
  private inicializarBackupAutomatico(): void {
    const config = this.configSubject.value;
    if (!config.activo) {
      return;
    }

    // Verificar si es necesario crear backup automático
    this.verificarBackupAutomatico(config);
  }

  /**
   * Verifica si es necesario crear un backup automático
   */
  private verificarBackupAutomatico(config: BackupConfig): void {
    const ahora = new Date();
    const ultimoBackup = config.ultimoBackup ? new Date(config.ultimoBackup) : null;

    let necesitaBackup = false;

    if (!ultimoBackup) {
      necesitaBackup = true;
    } else {
      const diffDias = Math.floor((ahora.getTime() - ultimoBackup.getTime()) / (1000 * 60 * 60 * 24));

      switch (config.frecuencia) {
        case 'DIARIO':
          necesitaBackup = diffDias >= 1;
          break;
        case 'SEMANAL':
          necesitaBackup = diffDias >= 7;
          break;
        case 'MENSUAL':
          necesitaBackup = diffDias >= 30;
          break;
      }
    }

    if (necesitaBackup) {
      this.crearBackupAutomatico().subscribe();
    }

    // Limpiar backups antiguos
    this.limpiarBackupsAntiguos(config.maxBackups);
  }

  /**
   * Limpia backups antiguos manteniendo solo los N más recientes
   */
  private limpiarBackupsAntiguos(maxBackups: number): void {
    const backups = [...this.backupsSubject.value]
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
      .slice(0, maxBackups);

    this.guardarBackups(backups);
    this.backupsSubject.next(backups);
  }

  /**
   * Carga los backups desde localStorage
   */
  private loadBackupsFromStorage(): Backup[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BACKUPS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar backups:', error);
    }
    return [];
  }

  /**
   * Guarda los backups en localStorage
   */
  private guardarBackups(backups: Backup[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(backups));
    } catch (error) {
      console.error('Error al guardar backups:', error);
    }
  }

  /**
   * Carga la configuración desde localStorage
   */
  private loadConfigFromStorage(): BackupConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar configuración de backup:', error);
    }
    return {
      activo: false,
      frecuencia: 'SEMANAL',
      maxBackups: 10
    };
  }

  /**
   * Guarda la configuración en localStorage
   */
  private guardarConfig(config: BackupConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Error al guardar configuración de backup:', error);
    }
  }
}

