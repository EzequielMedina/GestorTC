// Service Worker para notificaciones push
// Este archivo maneja las notificaciones push cuando la aplicación está cerrada

const CACHE_NAME = 'gestor-tc-v2';
const STATIC_CACHE = 'gestor-tc-static-v2';
const DYNAMIC_CACHE = 'gestor-tc-dynamic-v2';
const DATA_CACHE = 'gestor-tc-data-v2';

// Recursos estáticos que siempre deben estar en cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icons/icon-72x72.png',
  '/assets/icons/icon-96x96.png',
  '/assets/icons/icon-128x128.png',
  '/assets/icons/icon-144x144.png',
  '/assets/icons/icon-152x152.png',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-384x384.png',
  '/assets/icons/icon-512x512.png',
  '/assets/icons/badge-72x72.png'
];

// Patrones de URLs para cache dinámico
const CACHE_PATTERNS = {
  api: /\/api\//,
  assets: /\.(js|css|png|jpg|jpeg|svg|woff|woff2|ttf|eot)$/,
  angular: /\.(js|css)$/
};

// URLs que nunca deben ser cacheadas
const NEVER_CACHE = [
  '/sw.js',
  '/ngsw.json',
  '/ngsw-worker.js'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando v2...');
  event.waitUntil(
    Promise.all([
      // Cache de recursos estáticos
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Cacheando recursos estáticos');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Inicializar otros caches
      caches.open(DYNAMIC_CACHE),
      caches.open(DATA_CACHE)
    ])
    .then(() => {
      console.log('Service Worker: Instalación completada');
      return self.skipWaiting(); // Activar inmediatamente
    })
    .catch((error) => {
      console.error('Service Worker: Error durante la instalación:', error);
    })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activando v2...');
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, DATA_CACHE];
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCaches.includes(cacheName)) {
              console.log('Service Worker: Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control de todos los clientes
      self.clients.claim()
    ])
    .then(() => {
      console.log('Service Worker: Activado y listo v2');
    })
    .catch((error) => {
      console.error('Service Worker: Error durante la activación:', error);
    })
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Filtrar esquemas no soportados (chrome-extension, moz-extension, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // No cachear URLs en la lista negra
  if (NEVER_CACHE.some(pattern => url.pathname.includes(pattern))) {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

/**
 * Maneja las peticiones fetch con diferentes estrategias según el tipo de recurso
 */
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Estrategia para recursos estáticos (Cache First)
    if (CACHE_PATTERNS.assets.test(url.pathname) || STATIC_ASSETS.includes(url.pathname)) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    // Estrategia para APIs (Network First con fallback a cache)
    if (CACHE_PATTERNS.api.test(url.pathname)) {
      return await networkFirst(request, DATA_CACHE);
    }
    
    // Estrategia para navegación (Network First con fallback a index.html)
    if (request.mode === 'navigate') {
      return await navigationHandler(request);
    }
    
    // Estrategia por defecto (Stale While Revalidate)
    return await staleWhileRevalidate(request, DYNAMIC_CACHE);
    
  } catch (error) {
    console.error('Error en handleFetch:', error);
    return await fallbackResponse(request);
  }
}

/**
 * Estrategia Cache First: Busca primero en cache, luego en red
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

/**
 * Estrategia Network First: Intenta red primero, fallback a cache
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Estrategia Stale While Revalidate: Devuelve cache y actualiza en background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      // Clonar la respuesta antes de usarla para evitar el error "Response body is already used"
      const responseClone = networkResponse.clone();
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, responseClone));
    }
    return networkResponse;
  }).catch(() => null);
  
  return cachedResponse || await fetchPromise;
}

/**
 * Maneja las peticiones de navegación
 */
async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match('/index.html');
    return cachedResponse || await fallbackResponse(request);
  }
}

/**
 * Respuesta de fallback cuando todo falla
 */
async function fallbackResponse(request) {
  if (request.mode === 'navigate') {
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Gestor TC - Sin conexión</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline { color: #666; }
          </style>
        </head>
        <body>
          <div class="offline">
            <h1>Sin conexión</h1>
            <p>No se puede cargar la página. Verifica tu conexión a internet.</p>
            <button onclick="window.location.reload()">Reintentar</button>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
  
  return new Response('Sin conexión', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Manejar notificaciones push recibidas
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push recibido:', event);
  
  let notificationData = {
    title: '💳 Gestor TC',
    body: 'Tienes una nueva notificación',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    tag: 'default',
    data: {
      url: '/'
    }
  };

  // Procesar datos del push si existen
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData
      };
    } catch (error) {
      console.error('Service Worker: Error parseando datos push:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Mostrar la notificación
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction || false,
      actions: notificationData.actions || [
        {
          action: 'view',
          title: '👀 Ver detalles',
          icon: '/assets/icons/view-icon.png'
        },
        {
          action: 'dismiss',
          title: '❌ Descartar',
          icon: '/assets/icons/dismiss-icon.png'
        }
      ],
      vibrate: notificationData.vibrate || [200, 100, 200],
      silent: notificationData.silent || false
    })
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Click en notificación:', event);
  
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};
  
  if (action === 'dismiss') {
    // Solo cerrar la notificación
    return;
  }

  // Determinar URL de destino
  let targetUrl = '/';
  
  if (action === 'view' || !action) {
    targetUrl = notificationData.url || '/tarjetas';
  }

  // Abrir o enfocar la aplicación
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar si ya hay una ventana abierta
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            // Navegar a la URL objetivo y enfocar
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        
        // Si no hay ventana abierta, abrir una nueva
        return clients.openWindow(targetUrl);
      })
      .catch((error) => {
        console.error('Service Worker: Error manejando click:', error);
      })
  );
});

// Manejar cierre de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notificación cerrada:', event.notification.tag);
  
  // Aquí se podría enviar analytics o limpiar datos relacionados
  const notificationData = event.notification.data || {};
  
  if (notificationData.trackClose) {
    // Enviar evento de tracking si es necesario
    console.log('Tracking: Notificación cerrada sin interacción');
  }
});

// Manejar errores del Service Worker
self.addEventListener('error', (event) => {
  console.error('Service Worker: Error:', event.error);
});

// Manejar errores no capturados
self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Promise rechazada:', event.reason);
  event.preventDefault();
});

// Background Sync para verificación de vencimientos offline
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background Sync activado:', event.tag);
  
  if (event.tag === 'verificar-vencimientos') {
    event.waitUntil(verificarVencimientosOffline());
  }
  
  if (event.tag === 'enviar-notificaciones-pendientes') {
    event.waitUntil(enviarNotificacionesPendientes());
  }
});

// Función para verificar vencimientos en modo offline
async function verificarVencimientosOffline() {
  try {
    const ahora = new Date();
    console.log(`🔄 Service Worker: Verificando vencimientos offline a las ${ahora.getHours()}:${ahora.getMinutes().toString().padStart(2, '0')}`);
    
    // Obtener datos desde IndexedDB o cache
    const tarjetas = await obtenerTarjetasDesdeCache();
    const configuracion = await obtenerConfiguracionDesdeCache();
    
    console.log('📊 Service Worker: Datos obtenidos:', {
      tarjetas: tarjetas ? tarjetas.length : 0,
      configuracion: configuracion ? 'Sí' : 'No'
    });
    
    if (!tarjetas || !configuracion) {
      console.log('❌ Service Worker: No hay datos suficientes para verificar offline');
      return;
    }
    
    console.log(`⚙️ Service Worker: Configuración - Hora: ${configuracion.horaNotificacion}, Días anticipación: ${configuracion.diasAnticipacion}`);
    
    const tarjetasVencidas = [];
    
    // Verificar cada tarjeta
    for (const tarjeta of tarjetas) {
      if (!tarjeta.fechaVencimiento) continue;
      
      const fechaVencimiento = new Date(tarjeta.fechaVencimiento);
      const diasHastaVencimiento = Math.ceil((fechaVencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`💳 Service Worker: Tarjeta ${tarjeta.nombre} - Días hasta vencimiento: ${diasHastaVencimiento}`);
      
      // Verificar si debe notificar según configuración
      if (diasHastaVencimiento <= configuracion.diasAnticipacion && diasHastaVencimiento >= 0) {
        console.log(`⏰ Service Worker: Verificando hora para ${tarjeta.nombre}`);
        
        // Verificar si es la hora correcta
        if (esHoraCorrecta(ahora, configuracion.horaNotificacion)) {
          console.log(`✅ Service Worker: Hora correcta para ${tarjeta.nombre}`);
          tarjetasVencidas.push({
            ...tarjeta,
            diasHastaVencimiento
          });
        } else {
          console.log(`❌ Service Worker: Hora incorrecta para ${tarjeta.nombre}`);
        }
      }
    }
    
    // Enviar notificaciones para tarjetas vencidas
    for (const tarjeta of tarjetasVencidas) {
      console.log(`🔔 Service Worker: Enviando notificación para ${tarjeta.nombre}`);
      await enviarNotificacionVencimientoOffline(tarjeta);
    }
    
    console.log(`✅ Service Worker: Verificación offline completada. ${tarjetasVencidas.length} notificaciones enviadas`);
    
  } catch (error) {
    console.error('❌ Service Worker: Error en verificación offline:', error);
  }
}

// Función para enviar notificaciones pendientes
async function enviarNotificacionesPendientes() {
  try {
    console.log('Service Worker: Enviando notificaciones pendientes...');
    
    const notificacionesPendientes = await obtenerNotificacionesPendientes();
    
    for (const notificacion of notificacionesPendientes) {
      await self.registration.showNotification(notificacion.title, notificacion.options);
      await marcarNotificacionComoEnviada(notificacion.id);
    }
    
    console.log(`Service Worker: ${notificacionesPendientes.length} notificaciones pendientes enviadas`);
    
  } catch (error) {
    console.error('Service Worker: Error enviando notificaciones pendientes:', error);
  }
}

// Función para verificar si es la hora correcta
function esHoraCorrecta(ahora, horaConfiguracion) {
  const [horaConfig, minutoConfig] = horaConfiguracion.split(':').map(Number);
  const horaActual = ahora.getHours();
  const minutoActual = ahora.getMinutes();
  
  // Ventana de 5 minutos
  const minutosConfig = horaConfig * 60 + minutoConfig;
  const minutosActuales = horaActual * 60 + minutoActual;
  const diferencia = Math.abs(minutosActuales - minutosConfig);
  const esHoraCorrecta = diferencia <= 5;
  
  console.log(`🕐 Service Worker: Verificación de hora - Actual: ${horaActual}:${minutoActual.toString().padStart(2, '0')}, Configurada: ${horaConfig}:${minutoConfig.toString().padStart(2, '0')}, Diferencia: ${diferencia} min, Es correcta: ${esHoraCorrecta}`);
  
  return esHoraCorrecta;
}

// Función para enviar notificación de vencimiento offline
async function enviarNotificacionVencimientoOffline(tarjeta) {
  const notificationData = generarNotificacionVencimiento({
    nombreTarjeta: tarjeta.nombre,
    diasHastaVencimiento: tarjeta.diasHastaVencimiento,
    montoAdeudado: tarjeta.montoAdeudado || 0,
    tarjetaId: tarjeta.id
  });
  
  await self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    requireInteraction: notificationData.requireInteraction,
    actions: notificationData.actions,
    vibrate: notificationData.vibrate,
    silent: notificationData.silent
  });
}

// Función helper para generar notificaciones de vencimiento
function generarNotificacionVencimiento(datosVencimiento) {
  const { nombreTarjeta, diasHastaVencimiento, montoAdeudado, tarjetaId } = datosVencimiento;
  
  const esUrgente = diasHastaVencimiento === 0;
  const esCercano = diasHastaVencimiento <= 1;
  
  return {
    title: `💳 ${nombreTarjeta} ${esUrgente ? 'vence HOY' : `vence en ${diasHastaVencimiento} días`}`,
    body: `Monto a pagar: $${montoAdeudado.toLocaleString('es-AR')}`,
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    tag: `vencimiento-${tarjetaId}`,
    requireInteraction: esUrgente,
    data: {
      tipo: 'vencimiento',
      tarjetaId: tarjetaId,
      url: '/tarjetas',
      trackClose: true
    },
    actions: [
      {
        action: 'view',
        title: '👀 Ver tarjeta',
        icon: '/assets/icons/view-icon.png'
      },
      {
        action: 'remind',
        title: '⏰ Recordar más tarde',
        icon: '/assets/icons/remind-icon.png'
      }
    ],
    vibrate: esUrgente ? [300, 100, 300, 100, 300] : [200, 100, 200],
    silent: false
  };
}

// Funciones auxiliares para manejo de datos offline
async function obtenerTarjetasDesdeCache() {
  try {
    // Intentar obtener desde IndexedDB primero
    const tarjetas = await obtenerDesdeIndexedDB('tarjetas');
    if (tarjetas) {
      return tarjetas;
    }
    
    // Fallback: obtener desde localStorage si está disponible
    if (typeof localStorage !== 'undefined') {
      const tarjetasStr = localStorage.getItem('gestor_tc_tarjetas');
      return tarjetasStr ? JSON.parse(tarjetasStr) : null;
    }
    
    return null;
  } catch (error) {
    console.error('Service Worker: Error obteniendo tarjetas desde cache:', error);
    return null;
  }
}

async function obtenerConfiguracionDesdeCache() {
  try {
    // Intentar obtener desde IndexedDB primero (configuración principal)
    let config = await obtenerDesdeIndexedDB('configuracion');
    if (config) {
      console.log('📋 SW: Configuración obtenida desde store principal:', config.horaNotificacion);
      return config;
    }
    
    // NUEVO: Fallback a configuración de notificaciones
    config = await obtenerDesdeIndexedDB('configuracion-notificaciones');
    if (config) {
      console.log('📋 SW: Configuración obtenida desde store de notificaciones:', config.horaNotificacion);
      // Convertir formato de NotificacionService a formato esperado
      return {
        diasAnticipacion: config.diasAnticipacion || 3,
        horaNotificacion: config.horaNotificacion || '09:00',
        emailNotificaciones: config.emailHabilitado || false,
        pushNotificaciones: config.pushHabilitado || true,
        emailDestino: config.emailDestino
      };
    }
    
    // Fallback final: configuración por defecto
    console.log('📋 SW: Usando configuración por defecto');
    return {
      diasAnticipacion: 3,
      horaNotificacion: '09:00',
      emailNotificaciones: true,
      pushNotificaciones: true
    };
  } catch (error) {
    console.error('Service Worker: Error obteniendo configuración desde cache:', error);
    return {
      diasAnticipacion: 3,
      horaNotificacion: '09:00',
      emailNotificaciones: true,
      pushNotificaciones: true
    };
  }
}

async function obtenerNotificacionesPendientes() {
  try {
    const pendientes = await obtenerDesdeIndexedDB('notificaciones_pendientes');
    return pendientes || [];
  } catch (error) {
    console.error('Service Worker: Error obteniendo notificaciones pendientes:', error);
    return [];
  }
}

async function marcarNotificacionComoEnviada(notificacionId) {
  try {
    const pendientes = await obtenerNotificacionesPendientes();
    const nuevasPendientes = pendientes.filter(n => n.id !== notificacionId);
    await guardarEnIndexedDB('notificaciones_pendientes', nuevasPendientes);
  } catch (error) {
    console.error('Service Worker: Error marcando notificación como enviada:', error);
  }
}

// Funciones para IndexedDB
async function obtenerDesdeIndexedDB(store) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GestorTCDB', 4);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains(store)) {
        db.close();
        resolve(null);
        return;
      }
      
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const getRequest = objectStore.get('data');
      
      getRequest.onsuccess = () => {
        db.close();
        resolve(getRequest.result ? getRequest.result.value : null);
      };
      
      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Crear todos los object stores necesarios
      const requiredStores = [
        'configuracion',
        'tarjetas',
        'notificaciones_pendientes',
        'gastos'
      ];
      
      requiredStores.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      });
      
      // También crear el store solicitado si no existe
      if (!db.objectStoreNames.contains(store)) {
        db.createObjectStore(store);
      }
    };
  });
}

async function guardarEnIndexedDB(store, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GestorTCDB', 4);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      
      // Verificar si el object store existe antes de crear la transacción
      if (!db.objectStoreNames.contains(store)) {
        // Si el store no existe, cerrar la conexión y forzar upgrade
        db.close();
        const upgradeRequest = indexedDB.open('GestorTCDB', db.version + 1);
        
        upgradeRequest.onupgradeneeded = (event) => {
          const upgradeDb = event.target.result;
          if (!upgradeDb.objectStoreNames.contains(store)) {
            upgradeDb.createObjectStore(store);
          }
        };
        
        upgradeRequest.onsuccess = () => {
          const upgradeDb = upgradeRequest.result;
          const transaction = upgradeDb.transaction([store], 'readwrite');
          const objectStore = transaction.objectStore(store);
          const putRequest = objectStore.put({ value: data }, 'data');
          
          putRequest.onsuccess = () => {
            upgradeDb.close();
            resolve();
          };
          putRequest.onerror = () => {
            upgradeDb.close();
            reject(putRequest.error);
          };
        };
        
        upgradeRequest.onerror = () => reject(upgradeRequest.error);
      } else {
        const transaction = db.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        const putRequest = objectStore.put({ value: data }, 'data');
        
        putRequest.onsuccess = () => {
          db.close();
          resolve();
        };
        putRequest.onerror = () => {
          db.close();
          reject(putRequest.error);
        };
      }
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Crear todos los object stores necesarios
      const requiredStores = [
        'configuracion',
        'tarjetas',
        'notificaciones_pendientes',
        'gastos'
      ];
      
      requiredStores.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      });
      
      // También crear el store dinámico si no existe
      if (!db.objectStoreNames.contains(store)) {
        db.createObjectStore(store);
      }
    };
  });
}

// Escuchar mensajes desde la aplicación principal
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SCHEDULE_SYNC':
      // Programar una sincronización
      if (payload.tag) {
        self.registration.sync.register(payload.tag)
          .then(() => console.log(`🔄 Sync programado: ${payload.tag}`))
          .catch(err => console.error('❌ Error programando sync:', err));
      }
      break;
      
    case 'SAVE_DATA':
      // Guardar datos en IndexedDB
      if (payload.key && payload.data) {
        console.log(`📝 Service Worker: Guardando ${payload.key}:`, payload.data);
        guardarEnIndexedDB(payload.key, payload.data)
          .then(() => {
            console.log(`💾 Datos guardados exitosamente: ${payload.key}`);
            if (payload.key === 'configuracion') {
              console.log(`⚙️ Configuración guardada - Hora: ${payload.data.horaNotificacion}`);
            }
          })
          .catch(err => console.error('❌ Error guardando datos:', err));
      }
      break;
      
    case 'SCHEDULE_NOTIFICATION':
      // Programar una notificación
      programarNotificacion(payload)
        .then(() => console.log(`🔔 Notificación programada: ${payload.id}`))
        .catch(err => console.error('❌ Error programando notificación:', err));
      break;
      
    case 'CANCEL_NOTIFICATION':
      // Cancelar notificación programada
      cancelarNotificacionProgramada(payload.tag)
        .then(() => console.log(`🚫 Notificación cancelada: ${payload.tag}`))
        .catch(err => console.error('❌ Error cancelando notificación:', err));
      break;
      
    case 'FORCE_CHECK_VENCIMIENTOS':
      // Forzar verificación manual de vencimientos
      console.log('🔧 Service Worker: Forzando verificación de vencimientos...');
      verificarVencimientosOffline()
        .then(() => console.log('✅ Service Worker: Verificación forzada completada'))
        .catch(err => console.error('❌ Error en verificación forzada:', err));
      break;
      
    case 'SKIP_WAITING':
      // Activar inmediatamente el Service Worker
      console.log('🚀 Service Worker: Activando inmediatamente...');
      self.skipWaiting();
      break;
      
    case 'DEBUG_CONFIG':
      // Debug: mostrar configuración actual en IndexedDB
      console.log('🔍 Service Worker: Verificando configuración en IndexedDB...');
      Promise.all([
        obtenerDesdeIndexedDB('configuracion'),
        obtenerDesdeIndexedDB('configuracion-notificaciones')
      ])
        .then(([configPrincipal, configNotificaciones]) => {
          console.log('🔍 SW: Configuraciones en IndexedDB:');
          console.log('📋 Store "configuracion":', configPrincipal);
          console.log('📋 Store "configuracion-notificaciones":', configNotificaciones);
          
          const configFinal = configPrincipal || configNotificaciones || {
            diasAnticipacion: 3,
            horaNotificacion: '09:00',
            emailNotificaciones: true,
            pushNotificaciones: true
          };
          
          console.log('⚙️ SW: Configuración final utilizada:', configFinal);
          
          // Enviar respuesta de vuelta
          event.ports[0]?.postMessage({
            type: 'DEBUG_CONFIG_RESPONSE',
            config: {
              principal: configPrincipal,
              notificaciones: configNotificaciones,
              final: configFinal
            }
          });
        })
        .catch(err => {
          console.error('❌ Error obteniendo configuración para debug:', err);
          event.ports[0]?.postMessage({ success: false, error: err.message });
        });
      break;
  }
});

/**
 * Programa una notificación para envío posterior
 */
async function programarNotificacion(payload) {
  try {
    const { datos, fechaEnvio, id } = payload;
    const ahora = Date.now();
    const tiempoEspera = fechaEnvio - ahora;
    
    if (tiempoEspera <= 0) {
      // Enviar inmediatamente si ya es hora
      await mostrarNotificacionVencimiento(datos);
      return;
    }
    
    // Guardar la notificación programada
    const notificacionProgramada = {
      id,
      datos,
      fechaEnvio,
      programadaEn: ahora
    };
    
    await guardarEnIndexedDB(`notificacion_${id}`, notificacionProgramada);
    
    // Programar un timeout (limitado a 24 horas por las limitaciones del navegador)
    const tiempoMaximo = Math.min(tiempoEspera, 24 * 60 * 60 * 1000); // 24 horas máximo
    
    setTimeout(async () => {
      try {
        const notificacion = await obtenerDesdeIndexedDB(`notificacion_${id}`);
        if (notificacion && Date.now() >= notificacion.fechaEnvio) {
          await mostrarNotificacionVencimiento(notificacion.datos);
          await eliminarDeIndexedDB(`notificacion_${id}`);
        }
      } catch (error) {
        console.error('Error ejecutando notificación programada:', error);
      }
    }, tiempoMaximo);
    
  } catch (error) {
    console.error('Error programando notificación:', error);
    throw error;
  }
}

/**
 * Cancela una notificación programada
 */
async function cancelarNotificacionProgramada(tag) {
  try {
    // Buscar y eliminar notificaciones con el tag especificado
    const keys = await obtenerClavesIndexedDB();
    const notificacionesACancelar = keys.filter(key => 
      key.startsWith('notificacion_') && key.includes(tag)
    );
    
    for (const key of notificacionesACancelar) {
      await eliminarDeIndexedDB(key);
    }
    
    console.log(`Canceladas ${notificacionesACancelar.length} notificaciones con tag: ${tag}`);
  } catch (error) {
    console.error('Error cancelando notificaciones:', error);
    throw error;
  }
}

/**
 * Muestra una notificación de vencimiento
 */
async function mostrarNotificacionVencimiento(datos) {
  try {
    const notificacion = generarNotificacionVencimiento(datos);
    
    await self.registration.showNotification(notificacion.title, {
      body: notificacion.body,
      icon: notificacion.icon,
      badge: notificacion.badge,
      tag: notificacion.tag,
      data: notificacion.data,
      actions: notificacion.actions,
      vibrate: notificacion.vibrate,
      requireInteraction: true,
      silent: false
    });
    
    console.log('Notificación de vencimiento mostrada:', datos.nombreTarjeta);
  } catch (error) {
    console.error('Error mostrando notificación de vencimiento:', error);
    throw error;
  }
}

/**
 * Elimina un elemento de IndexedDB
 */
async function eliminarDeIndexedDB(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GestorTCDB', 4);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['notificaciones'], 'readwrite');
      const store = transaction.objectStore('notificaciones');
      
      const deleteRequest = store.delete(key);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Obtiene todas las claves de IndexedDB
 */
async function obtenerClavesIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GestorTCDB', 4);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['notificaciones'], 'readonly');
      const store = transaction.objectStore('notificaciones');
      
      const getAllKeysRequest = store.getAllKeys();
      
      getAllKeysRequest.onsuccess = () => resolve(getAllKeysRequest.result);
      getAllKeysRequest.onerror = () => reject(getAllKeysRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Exportar funciones para uso en otros contextos si es necesario
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generarNotificacionVencimiento,
    obtenerTarjetasDesdeCache,
    obtenerConfiguracionDesdeCache
  };
}