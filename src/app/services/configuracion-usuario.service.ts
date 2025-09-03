import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ConfiguracionNotificaciones {
  habilitado: boolean;
  canales: {
    push: boolean;
    email: boolean;
  };
  emailDestino: string;
  tiempos: {
    diasAnticipacion: number;
    horaNotificacion: string;
    recordatorios: boolean;
    frecuenciaRecordatorios: number; // días
  };
  filtros: {
    montoMinimo: number;
    tarjetasSeleccionadas: string[]; // IDs de tarjetas
    soloTarjetasActivas: boolean;
  };
  preferencias: {
    incluirDetallesGastos: boolean;
    incluirRecomendaciones: boolean;
    formatoMoneda: 'ARS' | 'USD';
    idioma: 'es' | 'en';
  };
}

export interface PerfilUsuario {
  id: string;
  nombre: string;
  email: string;
  configuracionNotificaciones: ConfiguracionNotificaciones;
  fechaCreacion: Date;
  fechaUltimaModificacion: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionUsuarioService {
  private readonly STORAGE_KEY = 'gestor-tc-config-usuario';
  private readonly STORAGE_KEY_BACKUP = 'gestor-tc-config-backup';
  
  private configuracionDefault: ConfiguracionNotificaciones = {
    habilitado: false,
    canales: {
      push: false,
      email: false
    },
    emailDestino: '',
    tiempos: {
      diasAnticipacion: 3,
      horaNotificacion: '09:00',
      recordatorios: true,
      frecuenciaRecordatorios: 1
    },
    filtros: {
      montoMinimo: 1000,
      tarjetasSeleccionadas: [],
      soloTarjetasActivas: true
    },
    preferencias: {
      incluirDetallesGastos: true,
      incluirRecomendaciones: true,
      formatoMoneda: 'ARS',
      idioma: 'es'
    }
  };
  
  private configuracionSubject = new BehaviorSubject<ConfiguracionNotificaciones>(
    this.cargarConfiguracion()
  );
  
  constructor() {
    // Cargar configuración al inicializar
    this.configuracionSubject.next(this.cargarConfiguracion());
    
    // Escuchar cambios en localStorage de otras pestañas
    window.addEventListener('storage', (event) => {
      if (event.key === this.STORAGE_KEY && event.newValue) {
        try {
          const nuevaConfig = JSON.parse(event.newValue);
          this.configuracionSubject.next(nuevaConfig);
        } catch (error) {
          console.error('Error al sincronizar configuración entre pestañas:', error);
        }
      }
    });
  }
  
  /**
   * Observable de la configuración actual
   */
  get configuracion$(): Observable<ConfiguracionNotificaciones> {
    return this.configuracionSubject.asObservable();
  }
  
  /**
   * Obtiene la configuración actual de forma síncrona
   */
  get configuracionActual(): ConfiguracionNotificaciones {
    return this.configuracionSubject.value;
  }
  
  /**
   * Carga la configuración desde localStorage
   */
  private cargarConfiguracion(): ConfiguracionNotificaciones {
    try {
      const configGuardada = localStorage.getItem(this.STORAGE_KEY);
      if (configGuardada) {
        const config = JSON.parse(configGuardada);
        // Merge con configuración default para asegurar que todas las propiedades existan
        return this.mergeConfiguracion(this.configuracionDefault, config);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      this.intentarRecuperarBackup();
    }
    
    return { ...this.configuracionDefault };
  }
  
  /**
   * Guarda la configuración en localStorage
   */
  guardarConfiguracion(configuracion: Partial<ConfiguracionNotificaciones>): void {
    try {
      // Crear backup de la configuración actual
      this.crearBackup();
      
      // Merge con configuración actual
      const nuevaConfiguracion = this.mergeConfiguracion(
        this.configuracionActual,
        configuracion
      );
      
      // Validar configuración antes de guardar
      if (this.validarConfiguracion(nuevaConfiguracion)) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nuevaConfiguracion));
        this.configuracionSubject.next(nuevaConfiguracion);
      } else {
        throw new Error('Configuración inválida');
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      throw error;
    }
  }
  
  /**
   * Actualiza una configuración específica
   */
  actualizarConfiguracion<K extends keyof ConfiguracionNotificaciones>(
    seccion: K,
    valores: Partial<ConfiguracionNotificaciones[K]>
  ): void {
    const configuracionActual = this.configuracionActual;
    const seccionActual = configuracionActual[seccion];
    const nuevaConfiguracion = {
      ...configuracionActual,
      [seccion]: {
        ...(typeof seccionActual === 'object' && seccionActual !== null ? seccionActual : {}),
        ...valores
      }
    };
    
    this.guardarConfiguracion(nuevaConfiguracion);
  }
  
  /**
   * Resetea la configuración a los valores por defecto
   */
  resetearConfiguracion(): void {
    this.crearBackup();
    localStorage.removeItem(this.STORAGE_KEY);
    this.configuracionSubject.next({ ...this.configuracionDefault });
  }
  
  /**
   * Exporta la configuración actual
   */
  exportarConfiguracion(): string {
    const configuracion = this.configuracionActual;
    const exportData = {
      version: '1.0',
      fecha: new Date().toISOString(),
      configuracion
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * Importa una configuración desde JSON
   */
  importarConfiguracion(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.configuracion && this.validarConfiguracion(data.configuracion)) {
        this.guardarConfiguracion(data.configuracion);
      } else {
        throw new Error('Formato de configuración inválido');
      }
    } catch (error) {
      console.error('Error al importar configuración:', error);
      throw new Error('No se pudo importar la configuración. Verifique el formato del archivo.');
    }
  }
  
  /**
   * Valida que la configuración tenga la estructura correcta
   */
  private validarConfiguracion(config: any): config is ConfiguracionNotificaciones {
    return (
      typeof config === 'object' &&
      typeof config.habilitado === 'boolean' &&
      typeof config.canales === 'object' &&
      typeof config.canales.push === 'boolean' &&
      typeof config.canales.email === 'boolean' &&
      typeof config.emailDestino === 'string' &&
      typeof config.tiempos === 'object' &&
      typeof config.filtros === 'object' &&
      typeof config.preferencias === 'object'
    );
  }
  
  /**
   * Merge recursivo de configuraciones
   */
  private mergeConfiguracion(
    base: ConfiguracionNotificaciones,
    override: Partial<ConfiguracionNotificaciones>
  ): ConfiguracionNotificaciones {
    const resultado: any = { ...base };
    
    for (const key in override) {
      const valor = override[key as keyof ConfiguracionNotificaciones];
      if (valor !== undefined) {
        if (typeof valor === 'object' && !Array.isArray(valor)) {
          resultado[key] = {
            ...resultado[key],
            ...valor
          };
        } else {
          resultado[key] = valor;
        }
      }
    }
    
    return resultado as ConfiguracionNotificaciones;
  }
  
  /**
   * Crea un backup de la configuración actual
   */
  private crearBackup(): void {
    try {
      const configActual = localStorage.getItem(this.STORAGE_KEY);
      if (configActual) {
        const backup = {
          fecha: new Date().toISOString(),
          configuracion: configActual
        };
        localStorage.setItem(this.STORAGE_KEY_BACKUP, JSON.stringify(backup));
      }
    } catch (error) {
      console.error('Error al crear backup:', error);
    }
  }
  
  /**
   * Intenta recuperar la configuración desde el backup
   */
  private intentarRecuperarBackup(): void {
    try {
      const backup = localStorage.getItem(this.STORAGE_KEY_BACKUP);
      if (backup) {
        const backupData = JSON.parse(backup);
        const config = JSON.parse(backupData.configuracion);
        
        if (this.validarConfiguracion(config)) {
          localStorage.setItem(this.STORAGE_KEY, backupData.configuracion);
          console.log('Configuración recuperada desde backup');
        }
      }
    } catch (error) {
      console.error('Error al recuperar backup:', error);
    }
  }
  
  /**
   * Obtiene estadísticas de uso de la configuración
   */
  getEstadisticasConfiguracion(): {
    canalesHabilitados: number;
    tarjetasMonitoreadas: number;
    ultimaModificacion: Date | null;
  } {
    const config = this.configuracionActual;
    
    return {
      canalesHabilitados: Object.values(config.canales).filter(Boolean).length,
      tarjetasMonitoreadas: config.filtros.tarjetasSeleccionadas.length,
      ultimaModificacion: this.getUltimaModificacion()
    };
  }
  
  /**
   * Obtiene la fecha de última modificación
   */
  private getUltimaModificacion(): Date | null {
    try {
      const backup = localStorage.getItem(this.STORAGE_KEY_BACKUP);
      if (backup) {
        const backupData = JSON.parse(backup);
        return new Date(backupData.fecha);
      }
    } catch (error) {
      console.error('Error al obtener fecha de modificación:', error);
    }
    
    return null;
  }
}