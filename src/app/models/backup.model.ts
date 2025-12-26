/**
 * Modelo que representa un backup completo de la aplicación
 */
export interface Backup {
  id: string;
  fechaCreacion: string; // ISO string
  version: string; // Versión de la app al momento del backup
  tipo: 'AUTOMATICO' | 'MANUAL';
  datos: BackupDatos;
  metadata: BackupMetadata;
}

/**
 * Datos completos del backup
 */
export interface BackupDatos {
  tarjetas: any[];
  gastos: any[];
  prestamos: any[];
  compraDolares: any[];
  ventaDolares: any[];
  presupuestos: any[];
  categorias: any[];
  alertasVistas: string[]; // IDs de alertas vistas
  filtrosGuardados: any[]; // Filtros avanzados guardados
  etiquetas?: any[]; // Etiquetas (opcional para compatibilidad)
  notas?: any[]; // Notas (opcional para compatibilidad)
  gastosRecurrentes?: any[]; // Series de gastos recurrentes (opcional para compatibilidad)
  instanciasGastosRecurrentes?: any[]; // Instancias de gastos recurrentes (opcional para compatibilidad)
}

/**
 * Metadatos del backup
 */
export interface BackupMetadata {
  totalRegistros: number;
  tamano: number; // Tamaño aproximado en bytes
  resumen: {
    cantidadTarjetas: number;
    cantidadGastos: number;
    cantidadPrestamos: number;
    cantidadComprasDolares: number;
    cantidadVentasDolares: number;
    cantidadPresupuestos: number;
    cantidadCategorias: number;
    cantidadFiltrosGuardados: number;
    cantidadEtiquetas?: number;
    cantidadNotas?: number;
    cantidadGastosRecurrentes?: number;
    cantidadInstanciasGastosRecurrentes?: number;
  };
}

/**
 * Configuración de backup automático
 */
export interface BackupConfig {
  activo: boolean;
  frecuencia: 'DIARIO' | 'SEMANAL' | 'MENSUAL';
  hora?: string; // HH:mm para backups programados
  maxBackups: number; // Cantidad máxima de backups a mantener
  ultimoBackup?: string; // ISO string
}

