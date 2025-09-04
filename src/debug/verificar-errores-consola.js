// Script para verificar errores comunes en la consola
// Ejecutar en DevTools Console después de recargar la página

console.log('🔍 === VERIFICACIÓN DE ERRORES EN CONSOLA ===');

// 1. Verificar si hay errores de Service Worker
function verificarServiceWorker() {
  console.log('\n📱 Verificando Service Worker...');
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length > 0) {
        console.log('✅ Service Worker registrado:', registrations[0]);
        console.log('   - Scope:', registrations[0].scope);
        console.log('   - State:', registrations[0].active?.state);
      } else {
        console.log('❌ No hay Service Workers registrados');
      }
    }).catch(error => {
      console.error('❌ Error verificando Service Worker:', error);
    });
  } else {
    console.log('❌ Service Worker no soportado en este navegador');
  }
}

// 2. Verificar errores de IndexedDB
function verificarIndexedDB() {
  console.log('\n💾 Verificando IndexedDB...');
  
  if ('indexedDB' in window) {
    try {
      const request = indexedDB.open('GestorTCDB', 4);
      
      request.onsuccess = function(event) {
        const db = event.target.result;
        console.log('✅ IndexedDB disponible:', db.name, 'v' + db.version);
        console.log('   - Object Stores:', Array.from(db.objectStoreNames));
        db.close();
      };
      
      request.onerror = function(event) {
        console.error('❌ Error abriendo IndexedDB:', event.target.error);
      };
      
      request.onblocked = function(event) {
        console.warn('⚠️ IndexedDB bloqueado:', event);
      };
      
    } catch (error) {
      console.error('❌ Error accediendo a IndexedDB:', error);
    }
  } else {
    console.log('❌ IndexedDB no soportado en este navegador');
  }
}

// 3. Verificar localStorage
function verificarLocalStorage() {
  console.log('\n📦 Verificando localStorage...');
  
  try {
    const keys = Object.keys(localStorage).filter(key => key.includes('gestor-tc'));
    console.log('✅ Claves de gestor-tc en localStorage:', keys);
    
    keys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        const parsed = JSON.parse(value);
        console.log(`   - ${key}:`, Object.keys(parsed));
      } catch (e) {
        console.log(`   - ${key}: (no JSON)`, value?.substring(0, 50) + '...');
      }
    });
    
  } catch (error) {
    console.error('❌ Error accediendo a localStorage:', error);
  }
}

// 4. Verificar servicios Angular
function verificarServiciosAngular() {
  console.log('\n🅰️ Verificando servicios Angular...');
  
  const servicios = [
    'backgroundSyncService',
    'vencimientoService', 
    'configuracionUsuarioService',
    'notificacionService'
  ];
  
  servicios.forEach(servicio => {
    if (window[servicio]) {
      console.log(`✅ ${servicio} disponible`);
    } else {
      console.log(`❌ ${servicio} NO disponible`);
    }
  });
}

// 5. Verificar funciones de debug
function verificarFuncionesDebug() {
  console.log('\n🔧 Verificando funciones de debug...');
  
  const funciones = [
    'forzarVerificacionVencimientos',
    'verificarVencimientosManual',
    'verificarConfiguracionSW',
    'verificarConfiguracionLocal'
  ];
  
  funciones.forEach(funcion => {
    if (typeof window[funcion] === 'function') {
      console.log(`✅ ${funcion}() disponible`);
    } else {
      console.log(`❌ ${funcion}() NO disponible`);
    }
  });
}

// 6. Capturar errores no manejados
function configurarCapturaErrores() {
  console.log('\n🚨 Configurando captura de errores...');
  
  // Errores JavaScript
  window.addEventListener('error', function(event) {
    console.error('🚨 ERROR JAVASCRIPT:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });
  
  // Promesas rechazadas
  window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 PROMESA RECHAZADA:', {
      reason: event.reason,
      promise: event.promise
    });
  });
  
  console.log('✅ Captura de errores configurada');
}

// 7. Función principal de diagnóstico
function diagnosticarErroresConsola() {
  console.clear();
  console.log('🔍 === INICIANDO DIAGNÓSTICO DE ERRORES ===');
  
  configurarCapturaErrores();
  verificarServiceWorker();
  verificarIndexedDB();
  verificarLocalStorage();
  verificarServiciosAngular();
  verificarFuncionesDebug();
  
  console.log('\n✅ Diagnóstico completado. Revisa los mensajes anteriores.');
  console.log('\n📋 FUNCIONES DISPONIBLES:');
  console.log('- diagnosticarErroresConsola(): Ejecutar diagnóstico completo');
  console.log('- verificarServiceWorker(): Solo Service Worker');
  console.log('- verificarIndexedDB(): Solo IndexedDB');
  console.log('- verificarLocalStorage(): Solo localStorage');
  console.log('- verificarServiciosAngular(): Solo servicios Angular');
  console.log('- verificarFuncionesDebug(): Solo funciones de debug');
}

// Exponer funciones globalmente
window.diagnosticarErroresConsola = diagnosticarErroresConsola;
window.verificarServiceWorker = verificarServiceWorker;
window.verificarIndexedDB = verificarIndexedDB;
window.verificarLocalStorage = verificarLocalStorage;
window.verificarServiciosAngular = verificarServiciosAngular;
window.verificarFuncionesDebug = verificarFuncionesDebug;

// Ejecutar diagnóstico automáticamente
setTimeout(() => {
  diagnosticarErroresConsola();
}, 1000);

console.log('🔧 Script de verificación de errores cargado. Ejecutando diagnóstico en 1 segundo...');