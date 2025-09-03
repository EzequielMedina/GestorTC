// Service Worker para notificaciones push
// Este archivo maneja las notificaciones push cuando la aplicación está cerrada

const CACHE_NAME = 'gestor-tc-v1';
const urlsToCache = [
  '/',
  '/tarjetas',
  '/gastos',
  '/resumen',
  '/notificaciones',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/favicon.svg'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Error al cachear recursos:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar requests para servir desde cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Devolver desde cache si existe, sino hacer fetch
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch((error) => {
        console.error('Service Worker: Error en fetch:', error);
        // Devolver página offline si está disponible
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

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

// Exportar funciones para uso en otros contextos si es necesario
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generarNotificacionVencimiento
  };
}