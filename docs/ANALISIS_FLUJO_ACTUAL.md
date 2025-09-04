# Análisis del Flujo Actual vs Deseado

## 🎯 Flujo Deseado

### 1. Configuración de Notificaciones
```
Usuario configura hora → ConfiguracionUsuarioService (localStorage) → 
BackgroundSyncService detecta cambio → Sincroniza con SW → 
SW guarda en IndexedDB → NotificacionService también guarda en IndexedDB
```

### 2. Ejecución de Verificaciones
```
VencimientoService programa verificaciones cada hora → 
SW ejecuta verificarVencimientosOffline() → 
SW valida hora con esHoraCorrecta() → 
SW envía notificaciones si hay tarjetas por vencer
```

### 3. Stores Esperados
- **localStorage**: `gestor-tc-config-usuario`, `gestor-tc-config-notificaciones`
- **IndexedDB**: `configuracion`, `configuracion-notificaciones`, `tarjetas`

## 🔍 Problemas Identificados

### 1. IndexedDB No Se Ve
**Problema**: No aparece la base de datos `gestor-tc-db` en DevTools

**Posibles Causas**:
- IndexedDB no se está creando correctamente
- Los datos no se están guardando
- Nombre de base de datos incorrecto

**Verificación**:
```javascript
// Ejecutar en DevTools Console
DiagnosticoFlujo.verificarIndexedDB();
```

### 2. Horas No Se Actualizan
**Problema**: Cambios en la configuración de hora no se reflejan en el SW

**Posibles Causas**:
- Sincronización entre localStorage e IndexedDB no funciona
- BackgroundSyncService no detecta cambios
- SW no recibe los datos actualizados

**Verificación**:
```javascript
// Verificar configuración actual
verificarConfiguracionLocal();
verificarConfiguracionSW();
```

### 3. No Se Ejecutan Verificaciones
**Problema**: Las verificaciones automáticas no se disparan

**Posibles Causas**:
- Background Sync no se registra correctamente
- VencimientoService no programa verificaciones
- SW no responde a eventos sync
- Validación de hora falla

## 🛠️ Diagnóstico Paso a Paso

### Paso 1: Verificar Estado Actual
```javascript
// Ejecutar en DevTools Console
diagnosticarFlujo();
```

### Paso 2: Verificar Stores
```javascript
// Verificar localStorage
verificarConfiguracionLocal();

// Verificar IndexedDB
DiagnosticoFlujo.verificarIndexedDB();
```

### Paso 3: Probar Sincronización Manual
```javascript
// Forzar sincronización
forzarSync();

// Verificar después de sincronización
verificarConfiguracionSW();
```

### Paso 4: Probar Verificación Manual
```javascript
// Forzar verificación
forzarVerif();

// O desde la aplicación
verificarVencimientosManual();
```

## 🔧 Flujo de Sincronización Actual

### ConfiguracionUsuarioService
- Guarda en `localStorage` con clave `gestor-tc-config-usuario`
- Estructura: `{ tiempos: { horaNotificacion }, canales: { email, push } }`

### NotificacionService
- Guarda en `localStorage` con clave `gestor-tc-config-notificaciones`
- Estructura: `{ horaNotificacion, emailHabilitado, pushHabilitado }`

### BackgroundSyncService
- Suscrito a cambios de ambos servicios
- Envía datos al SW via `postMessage`
- SW guarda en IndexedDB

### Service Worker
- Recibe datos via mensaje `SAVE_DATA`
- Guarda en stores `configuracion` y `configuracion-notificaciones`
- Función `obtenerConfiguracionDesdeCache()` lee con fallback

## 🚨 Puntos Críticos a Verificar

### 1. Registro del Service Worker
```javascript
// Verificar si SW está activo
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW State:', reg?.active?.state);
});
```

### 2. Background Sync Support
```javascript
// Verificar soporte
console.log('Background Sync:', 'sync' in window.ServiceWorkerRegistration.prototype);
```

### 3. IndexedDB Creation
```javascript
// Verificar creación manual
const request = indexedDB.open('gestor-tc-db');
request.onsuccess = () => console.log('IndexedDB OK');
request.onerror = (e) => console.error('IndexedDB Error:', e);
```

### 4. Validación de Hora
```javascript
// Probar función esHoraCorrecta
// En SW Console (si está disponible)
esHoraCorrecta('14:30'); // Cambiar por hora actual ±5min
```

## 📋 Checklist de Verificación

- [ ] Service Worker registrado y activo
- [ ] IndexedDB `gestor-tc-db` visible en DevTools
- [ ] Stores `configuracion` y `configuracion-notificaciones` con datos
- [ ] localStorage con ambas configuraciones
- [ ] Sincronización automática funcionando
- [ ] Background Sync registrándose cada hora
- [ ] Función `esHoraCorrecta()` validando correctamente
- [ ] Notificaciones de prueba funcionando

## 🎯 Próximos Pasos

1. **Ejecutar diagnóstico completo**
2. **Identificar punto de falla específico**
3. **Corregir problema de sincronización**
4. **Probar flujo completo**
5. **Documentar solución**

---

**Nota**: Usar las funciones de diagnóstico incluidas en `diagnostico-flujo.js` para una verificación sistemática.