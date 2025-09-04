// Script específico para verificar IndexedDB y sincronización
// Ejecutar en DevTools Console después de cargar la aplicación

const VerificarIndexedDB = {
  async ejecutarDiagnosticoCompleto() {
    console.log('🔍 DIAGNÓSTICO COMPLETO DE INDEXEDDB Y SINCRONIZACIÓN');
    console.log('=======================================================');
    
    // 1. Verificar si IndexedDB existe
    await this.verificarExistenciaIndexedDB();
    
    // 2. Intentar crear IndexedDB manualmente
    await this.crearIndexedDBManual();
    
    // 3. Verificar sincronización
    await this.verificarSincronizacion();
    
    // 4. Probar guardado manual
    await this.probarGuardadoManual();
    
    // 5. Verificar Service Worker
    await this.verificarServiceWorker();
    
    console.log('\n✅ Diagnóstico completo finalizado');
  },

  async verificarExistenciaIndexedDB() {
    console.log('\n📊 1. VERIFICANDO EXISTENCIA DE INDEXEDDB:');
    
    try {
      // Listar todas las bases de datos
      if ('databases' in indexedDB) {
        const databases = await indexedDB.databases();
        console.log('📋 Bases de datos existentes:', databases.map(db => db.name));
        
        const gestorDB = databases.find(db => db.name === 'GestorTCDB');
        if (gestorDB) {
          console.log('✅ GestorTCDB encontrada, versión:', gestorDB.version);
        } else {
          console.log('❌ GestorTCDB NO encontrada');
        }
      } else {
        console.log('⚠️ indexedDB.databases() no soportado');
      }
      
      // Intentar abrir la base de datos
      const db = await this.abrirDB();
      if (db) {
        console.log('✅ Conexión a GestorTCDB exitosa');
        console.log('📋 Object stores:', Array.from(db.objectStoreNames));
        db.close();
      }
    } catch (error) {
      console.log('❌ Error verificando IndexedDB:', error);
    }
  },

  async abrirDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GestorTCDB', 4);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.log('❌ Error abriendo DB:', request.error);
        resolve(null);
      };
      
      request.onupgradeneeded = (event) => {
        console.log('🔧 DB necesita actualización, versión:', event.oldVersion, '->', event.newVersion);
        const db = event.target.result;
        
        // Crear stores si no existen
        if (!db.objectStoreNames.contains('configuracion')) {
          db.createObjectStore('configuracion');
          console.log('📦 Store "configuracion" creado');
        }
        
        if (!db.objectStoreNames.contains('configuracion-notificaciones')) {
          db.createObjectStore('configuracion-notificaciones');
          console.log('📦 Store "configuracion-notificaciones" creado');
        }
        
        if (!db.objectStoreNames.contains('tarjetas')) {
          db.createObjectStore('tarjetas');
          console.log('📦 Store "tarjetas" creado');
        }
      };
    });
  },

  async crearIndexedDBManual() {
    console.log('\n🔧 2. CREANDO INDEXEDDB MANUALMENTE:');
    
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('GestorTCDB', 4);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Crear stores necesarios
          const stores = ['configuracion', 'configuracion-notificaciones', 'tarjetas'];
          
          stores.forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName);
              console.log(`📦 Store "${storeName}" creado`);
            }
          });
        };
      });
      
      console.log('✅ IndexedDB creada/verificada exitosamente');
      console.log('📋 Stores disponibles:', Array.from(db.objectStoreNames));
      db.close();
      
    } catch (error) {
      console.log('❌ Error creando IndexedDB:', error);
    }
  },

  async verificarSincronizacion() {
    console.log('\n🔄 3. VERIFICANDO SINCRONIZACIÓN:');
    
    // Verificar localStorage
    const configUsuario = localStorage.getItem('gestor-tc-config-usuario');
    const configNotificaciones = localStorage.getItem('gestor-tc-config-notificaciones');
    
    console.log('📱 localStorage:');
    console.log('  - gestor-tc-config-usuario:', configUsuario ? 'EXISTS' : 'MISSING');
    console.log('  - gestor-tc-config-notificaciones:', configNotificaciones ? 'EXISTS' : 'MISSING');
    
    if (configUsuario) {
      const config = JSON.parse(configUsuario);
      console.log('  - Hora configurada:', config.tiempos?.horaNotificacion || 'NO DEFINIDA');
    }
    
    // Verificar IndexedDB
    try {
      const db = await this.abrirDB();
      if (db) {
        const configDB = await this.leerStore(db, 'configuracion');
        const notifDB = await this.leerStore(db, 'configuracion-notificaciones');
        
        console.log('💾 IndexedDB:');
        console.log('  - configuracion:', configDB ? 'EXISTS' : 'MISSING');
        console.log('  - configuracion-notificaciones:', notifDB ? 'EXISTS' : 'MISSING');
        
        if (configDB && configDB.length > 0) {
          console.log('  - Datos en configuracion:', configDB[0]);
        }
        
        if (notifDB && notifDB.length > 0) {
          console.log('  - Datos en configuracion-notificaciones:', notifDB[0]);
        }
        
        db.close();
      }
    } catch (error) {
      console.log('❌ Error verificando IndexedDB:', error);
    }
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
        resolve(null);
      }
    });
  },

  async probarGuardadoManual() {
    console.log('\n💾 4. PROBANDO GUARDADO MANUAL:');
    
    try {
      const db = await this.abrirDB();
      if (db) {
        // Probar guardado en store configuracion
        const configTest = {
          horaNotificacion: '15:30',
          diasAnticipacion: 3,
          emailNotificaciones: true,
          pushNotificaciones: true,
          timestamp: new Date().toISOString()
        };
        
        await this.guardarEnStore(db, 'configuracion', 'test-config', configTest);
        console.log('✅ Guardado en store "configuracion" exitoso');
        
        // Verificar que se guardó
        const verificacion = await this.leerStore(db, 'configuracion');
        console.log('📋 Verificación de guardado:', verificacion);
        
        db.close();
      }
    } catch (error) {
      console.log('❌ Error en guardado manual:', error);
    }
  },

  async guardarEnStore(db, storeName, key, data) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data, key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async verificarServiceWorker() {
    console.log('\n🔧 5. VERIFICANDO SERVICE WORKER:');
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        console.log('✅ Service Worker registrado');
        console.log('📋 Estado:', registration.active?.state);
        console.log('📋 Scope:', registration.scope);
        
        // Probar comunicación con SW
        if (registration.active) {
          console.log('🔄 Probando comunicación con SW...');
          
          try {
            // Enviar mensaje de prueba
            const channel = new MessageChannel();
            const response = await new Promise((resolve, reject) => {
              channel.port1.onmessage = (event) => {
                resolve(event.data);
              };
              
              registration.active.postMessage({
                type: 'DEBUG_CONFIG'
              }, [channel.port2]);
              
              setTimeout(() => reject(new Error('Timeout')), 5000);
            });
            
            console.log('✅ Comunicación con SW exitosa:', response);
          } catch (error) {
            console.log('❌ Error comunicándose con SW:', error);
          }
        }
      } else {
        console.log('❌ Service Worker no registrado');
      }
    } else {
      console.log('❌ Service Worker no soportado');
    }
  },

  // Función para forzar sincronización completa
  async forzarSincronizacionCompleta() {
    console.log('\n🔄 FORZANDO SINCRONIZACIÓN COMPLETA:');
    
    try {
      // 1. Obtener configuración actual de localStorage
      const configUsuario = localStorage.getItem('gestor-tc-config-usuario');
      const configNotificaciones = localStorage.getItem('gestor-tc-config-notificaciones');
      
      if (configUsuario || configNotificaciones) {
        // 2. Enviar al Service Worker
        if (window.backgroundSyncService) {
          console.log('🔄 Usando BackgroundSyncService...');
          await window.backgroundSyncService.sincronizarManualmente();
        } else {
          console.log('🔄 Enviando directamente al SW...');
          const registration = await navigator.serviceWorker.getRegistration();
          
          if (registration?.active) {
            if (configUsuario) {
              registration.active.postMessage({
                type: 'SAVE_DATA',
                payload: {
                  key: 'configuracion',
                  data: JSON.parse(configUsuario)
                }
              });
            }
            
            if (configNotificaciones) {
              registration.active.postMessage({
                type: 'SAVE_DATA',
                payload: {
                  key: 'configuracion-notificaciones',
                  data: JSON.parse(configNotificaciones)
                }
              });
            }
          }
        }
        
        console.log('✅ Sincronización forzada enviada');
        
        // 3. Esperar un momento y verificar
        setTimeout(async () => {
          await this.verificarSincronizacion();
        }, 2000);
        
      } else {
        console.log('⚠️ No hay configuración en localStorage para sincronizar');
      }
    } catch (error) {
      console.log('❌ Error forzando sincronización:', error);
    }
  }
};

// Ejecutar diagnóstico automáticamente
console.log('🚀 Iniciando verificación de IndexedDB...');
VerificarIndexedDB.ejecutarDiagnosticoCompleto();

// Exponer funciones globalmente
window.VerificarIndexedDB = VerificarIndexedDB;
window.verificarIndexedDB = () => VerificarIndexedDB.ejecutarDiagnosticoCompleto();
window.forzarSincronizacionCompleta = () => VerificarIndexedDB.forzarSincronizacionCompleta();

console.log('\n📝 FUNCIONES ADICIONALES DISPONIBLES:');
console.log('- verificarIndexedDB() - Ejecutar verificación completa');
console.log('- forzarSincronizacionCompleta() - Forzar sincronización desde localStorage');
console.log('- VerificarIndexedDB.* - Acceso a todas las funciones específicas');