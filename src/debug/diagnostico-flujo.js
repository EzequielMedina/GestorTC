// Script de diagnóstico para verificar el flujo actual vs deseado
// Ejecutar en DevTools Console

const DiagnosticoFlujo = {
  // Flujo deseado documentado
  flujoDeseado: {
    pasos: [
      '1. Usuario configura hora de notificación en UI',
      '2. ConfiguracionUsuarioService guarda en localStorage',
      '3. BackgroundSyncService detecta cambio y sincroniza con SW',
      '4. SW guarda configuración en IndexedDB (store: configuracion)',
      '5. NotificacionService también guarda en IndexedDB (store: configuracion-notificaciones)',
      '6. VencimientoService programa verificaciones cada hora',
      '7. SW ejecuta verificarVencimientosOffline() en la hora configurada ±5min',
      '8. SW envía notificaciones si hay tarjetas por vencer'
    ],
    stores: {
      localStorage: ['configuracion-usuario'],
      indexedDB: {
        'GestorTCDB': ['configuracion', 'configuracion-notificaciones', 'tarjetas']
      }
    }
  },

  // Verificar estado actual
  async verificarEstadoActual() {
    console.log('🔍 DIAGNÓSTICO DEL FLUJO ACTUAL');
    console.log('================================');
    
    // 1. Verificar localStorage
    await this.verificarLocalStorage();
    
    // 2. Verificar IndexedDB
    await this.verificarIndexedDB();
    
    // 3. Verificar Service Worker
    await this.verificarServiceWorker();
    
    // 4. Verificar Background Sync
    await this.verificarBackgroundSync();
    
    // 5. Verificar configuración actual
    await this.verificarConfiguracion();
    
    // 6. Mostrar comparación
    this.mostrarComparacion();
  },

  async verificarLocalStorage() {
    console.log('\n📱 VERIFICANDO LOCALSTORAGE:');
    const config = localStorage.getItem('configuracion-usuario');
    if (config) {
      const parsed = JSON.parse(config);
      console.log('✅ Configuración encontrada:', parsed);
      console.log('⏰ Hora configurada:', parsed.tiempos?.horaNotificacion || 'No definida');
    } else {
      console.log('❌ No se encontró configuración en localStorage');
    }
  },

  async verificarIndexedDB() {
    console.log('\n💾 VERIFICANDO INDEXEDDB:');
    
    try {
      const db = await this.abrirIndexedDB();
      
      // Verificar store 'configuracion'
      const configStore = await this.leerStore(db, 'configuracion');
      console.log('📊 Store "configuracion":', configStore);
      
      // Verificar store 'configuracion-notificaciones'
      const notifStore = await this.leerStore(db, 'configuracion-notificaciones');
      console.log('🔔 Store "configuracion-notificaciones":', notifStore);
      
      // Verificar store 'tarjetas'
      const tarjetasStore = await this.leerStore(db, 'tarjetas');
      console.log('💳 Store "tarjetas":', tarjetasStore?.length || 0, 'tarjetas');
      
      db.close();
    } catch (error) {
      console.log('❌ Error accediendo a IndexedDB:', error);
    }
  },

  async abrirIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GestorTCDB', 4);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async leerStore(db, storeName) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.log(`⚠️ Store "${storeName}" no existe`);
        resolve(null);
      }
    });
  },

  async verificarServiceWorker() {
    console.log('\n🔧 VERIFICANDO SERVICE WORKER:');
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('✅ Service Worker registrado:', registration.active?.state);
        
        // Verificar si hay funciones de debug disponibles
        if (window.verificarConfiguracionSW) {
          console.log('🔍 Ejecutando verificarConfiguracionSW()...');
          window.verificarConfiguracionSW();
        } else {
          console.log('⚠️ Función verificarConfiguracionSW() no disponible');
        }
      } else {
        console.log('❌ Service Worker no registrado');
      }
    } else {
      console.log('❌ Service Worker no soportado');
    }
  },

  async verificarBackgroundSync() {
    console.log('\n🔄 VERIFICANDO BACKGROUND SYNC:');
    
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      console.log('✅ Background Sync soportado');
      
      // Verificar última sincronización
      const ultimaSync = localStorage.getItem('ultima-sincronizacion');
      if (ultimaSync) {
        const fecha = new Date(ultimaSync);
        console.log('📅 Última sincronización:', fecha.toLocaleString());
        console.log('⏱️ Hace:', Math.round((Date.now() - fecha.getTime()) / 60000), 'minutos');
      } else {
        console.log('⚠️ No hay registro de sincronización');
      }
    } else {
      console.log('❌ Background Sync no soportado');
    }
  },

  async verificarConfiguracion() {
    console.log('\n⚙️ VERIFICANDO CONFIGURACIÓN ACTUAL:');
    
    // Verificar hora actual vs configurada
    const ahora = new Date();
    const horaActual = ahora.getHours().toString().padStart(2, '0') + ':' + 
                     ahora.getMinutes().toString().padStart(2, '0');
    
    console.log('🕐 Hora actual:', horaActual);
    
    // Obtener configuración desde localStorage
    const config = localStorage.getItem('configuracion-usuario');
    if (config) {
      const parsed = JSON.parse(config);
      const horaConfig = parsed.tiempos?.horaNotificacion;
      console.log('⏰ Hora configurada:', horaConfig);
      
      if (horaConfig) {
        const diferencia = this.calcularDiferenciaMinutos(horaActual, horaConfig);
        console.log('📊 Diferencia:', diferencia, 'minutos');
        console.log('✅ Dentro de ventana (±5min):', Math.abs(diferencia) <= 5 ? 'SÍ' : 'NO');
      }
    }
  },

  calcularDiferenciaMinutos(hora1, hora2) {
    const [h1, m1] = hora1.split(':').map(Number);
    const [h2, m2] = hora2.split(':').map(Number);
    
    const minutos1 = h1 * 60 + m1;
    const minutos2 = h2 * 60 + m2;
    
    return minutos1 - minutos2;
  },

  mostrarComparacion() {
    console.log('\n📋 COMPARACIÓN FLUJO DESEADO VS ACTUAL:');
    console.log('=====================================');
    
    console.log('\n🎯 FLUJO DESEADO:');
    this.flujoDeseado.pasos.forEach(paso => console.log(paso));
    
    console.log('\n🔍 PROBLEMAS IDENTIFICADOS:');
    console.log('1. Verificar si IndexedDB se está creando correctamente');
    console.log('2. Verificar si la sincronización entre stores funciona');
    console.log('3. Verificar si Background Sync se ejecuta cada hora');
    console.log('4. Verificar si esHoraCorrecta() valida correctamente');
    
    console.log('\n🛠️ ACCIONES RECOMENDADAS:');
    console.log('1. Ejecutar: forzarSincronizacion() para probar sync manual');
    console.log('2. Ejecutar: forzarVerificacionVencimientos() para probar verificación');
    console.log('3. Revisar DevTools > Application > Storage para ver IndexedDB');
    console.log('4. Revisar DevTools > Application > Service Workers para ver logs');
  },

  // Función para forzar sincronización manual
  async forzarSincronizacion() {
    console.log('🔄 Forzando sincronización manual...');
    
    if (window.backgroundSyncService) {
      await window.backgroundSyncService.sincronizarManualmente();
      console.log('✅ Sincronización manual ejecutada');
    } else {
      console.log('❌ BackgroundSyncService no disponible en window');
    }
  },

  // Función para forzar verificación de vencimientos
  async forzarVerificacionVencimientos() {
    console.log('🔍 Forzando verificación de vencimientos...');
    
    if (window.forzarVerificacionVencimientos) {
      await window.forzarVerificacionVencimientos();
      console.log('✅ Verificación de vencimientos ejecutada');
    } else {
      console.log('❌ Función forzarVerificacionVencimientos() no disponible');
    }
  }
};

// Ejecutar diagnóstico automáticamente
console.log('🚀 Iniciando diagnóstico del flujo...');
DiagnosticoFlujo.verificarEstadoActual();

// Exponer funciones globalmente para uso manual
window.DiagnosticoFlujo = DiagnosticoFlujo;
window.diagnosticarFlujo = () => DiagnosticoFlujo.verificarEstadoActual();
window.forzarSync = () => DiagnosticoFlujo.forzarSincronizacion();
window.forzarVerif = () => DiagnosticoFlujo.forzarVerificacionVencimientos();

console.log('\n📝 FUNCIONES DISPONIBLES:');
console.log('- diagnosticarFlujo() - Ejecutar diagnóstico completo');
console.log('- forzarSync() - Forzar sincronización manual');
console.log('- forzarVerif() - Forzar verificación de vencimientos');
console.log('- DiagnosticoFlujo.* - Acceso a todas las funciones del diagnóstico');