import { Component, signal, ViewChild, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { BackgroundSyncService } from './services/background-sync.service';
import { VencimientoService } from './services/vencimiento.service';
import { ConfiguracionUsuarioService } from './services/configuracion-usuario.service';
import { NotificacionService } from './services/notificacion.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('Gestor de Cuentas');
  
  private backgroundSyncService = inject(BackgroundSyncService);
  private vencimientoService = inject(VencimientoService);
  private configuracionUsuarioService = inject(ConfiguracionUsuarioService);
  private notificacionService = inject(NotificacionService);

  ngOnInit() {
    this.configurarFuncionesDebug();
  }

  private configurarFuncionesDebug(): void {
    // Exponer servicios para diagnóstico
    (window as any).backgroundSyncService = this.backgroundSyncService;
    (window as any).vencimientoService = this.vencimientoService;
    (window as any).configuracionUsuarioService = this.configuracionUsuarioService;
    (window as any).notificacionService = this.notificacionService;
    
    // Función para forzar verificación desde Service Worker
    (window as any).forzarVerificacionVencimientos = () => {
      console.log('🔧 Forzando verificación de vencimientos desde Service Worker...');
      this.backgroundSyncService.forzarVerificacionVencimientos();
    };

    // Función para verificación manual desde la aplicación
    (window as any).verificarVencimientosManual = () => {
      console.log('🔧 Ejecutando verificación manual desde la aplicación...');
      this.vencimientoService.verificarVencimientosManual().subscribe({
        next: (resultado) => console.log('✅ Verificación completada:', resultado),
        error: (error) => console.error('❌ Error en verificación:', error)
      });
    };

    // Función para verificar configuración en Service Worker
    (window as any).verificarConfiguracionSW = async () => {
      console.log('🔍 Verificando configuración en Service Worker...');
      try {
        const channel = new MessageChannel();
        const response = await new Promise((resolve, reject) => {
          channel.port1.onmessage = (event) => {
            if (event.data.success) {
              resolve(event.data.config);
            } else {
              reject(new Error(event.data.error));
            }
          };
          
          navigator.serviceWorker.controller?.postMessage(
            { type: 'DEBUG_CONFIG' },
            [channel.port2]
          );
          
          setTimeout(() => reject(new Error('Timeout')), 5000);
        });
        
        console.log('📋 Configuración en Service Worker (IndexedDB):', response);
        return response;
      } catch (error) {
        console.error('❌ Error verificando configuración SW:', error);
        return null;
      }
    };

    // Función para verificar configuración en localStorage
    (window as any).verificarConfiguracionLocal = () => {
      console.log('🔍 Configuración en localStorage:');
      
      // Verificar gestor-tc-config-usuario
      const configUsuario = localStorage.getItem('gestor-tc-config-usuario');
      if (configUsuario) {
        const config = JSON.parse(configUsuario);
        console.log('📋 gestor-tc-config-usuario:', {
          horaNotificacion: config.horaNotificacion,
          diasAnticipacion: config.diasAnticipacion,
          canales: config.canales,
          emailDestino: config.emailDestino
        });
      } else {
        console.log('❌ No se encontró gestor-tc-config-usuario');
      }
      
      // NUEVO: Verificar gestor-tc-config-notificaciones
      const configNotificaciones = localStorage.getItem('gestor-tc-config-notificaciones');
      if (configNotificaciones) {
        const config = JSON.parse(configNotificaciones);
        console.log('📋 gestor-tc-config-notificaciones:', {
          horaNotificacion: config.horaNotificacion,
          diasAnticipacion: config.diasAnticipacion,
          emailHabilitado: config.emailHabilitado,
          pushHabilitado: config.pushHabilitado,
          emailDestino: config.emailDestino
        });
      } else {
        console.log('❌ No se encontró gestor-tc-config-notificaciones');
      }
      
      // Verificar otros stores relacionados
      const keys = Object.keys(localStorage).filter(key => key.includes('gestor-tc'));
      console.log('📦 Todos los stores de gestor-tc:', keys);
    };

    console.log('🔧 Funciones de debug disponibles:');
    console.log('- forzarVerificacionVencimientos(): Fuerza verificación desde Service Worker');
    console.log('- verificarVencimientosManual(): Ejecuta verificación manual desde la aplicación');
    console.log('- verificarConfiguracionSW(): Muestra configuración guardada en Service Worker');
    console.log('- verificarConfiguracionLocal(): Muestra configuración en localStorage');
  }
}
