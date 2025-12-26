# Guía: App Shortcuts para Gastos Rápidos en Móvil

## 🎯 ¿Qué son los App Shortcuts?

Los App Shortcuts son accesos rápidos que aparecen cuando mantienes presionado el icono de la app en la pantalla de inicio del móvil. Permiten acceder directamente a funciones específicas sin abrir la app completa.

## ✅ Implementación Completada

### Shortcuts Configurados:

1. **"Nuevo Gasto Rápido"** - Abre directamente el formulario rápido
2. **"Ver Dashboard"** - Va al dashboard
3. **"Ver Gastos"** - Va a la lista de gastos
4. **"Próximos Vencimientos"** - Va al calendario financiero

## 📱 Cómo Usar en el Teléfono

### iOS (iPhone/iPad):

1. **Instala la app** (si aún no lo has hecho):
   - Abre la app en Safari
   - Toca el botón "Compartir" (cuadrado con flecha)
   - Toca "Agregar a pantalla de inicio"

2. **Usar los shortcuts:**
   - Mantén presionado el icono de la app en la pantalla de inicio
   - Aparecerá un menú con los shortcuts disponibles
   - Toca "Nuevo Gasto Rápido" para abrir directamente el formulario

### Android:

1. **Instala la app** (si aún no lo has hecho):
   - Abre la app en Chrome
   - Toca el menú (3 puntos) > "Agregar a pantalla de inicio"

2. **Usar los shortcuts:**
   - Mantén presionado el icono de la app en la pantalla de inicio
   - Aparecerá un menú con los shortcuts disponibles
   - Toca "Nuevo Gasto Rápido" para abrir directamente el formulario

## 🔧 Cómo Funciona

### 1. Configuración en Manifest

Los shortcuts están definidos en `public/manifest.webmanifest`:

```json
"shortcuts": [
  {
    "name": "Nuevo Gasto Rápido",
    "url": "/?action=nuevo-gasto",
    ...
  }
]
```

### 2. Detección en la App

La app detecta cuando se abre desde un shortcut mediante parámetros en la URL:

```typescript
// En app.ts
private detectarAccionDesdeShortcut(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  
  if (action === 'nuevo-gasto') {
    // Abre el formulario rápido automáticamente
    this.abrirFormularioRapidoDesdeShortcut();
  }
}
```

### 3. Apertura Automática

Cuando detecta `action=nuevo-gasto`, abre automáticamente el formulario rápido de gastos.

## 🎨 Personalización

### Agregar Más Shortcuts

Para agregar más shortcuts, edita `public/manifest.webmanifest`:

```json
"shortcuts": [
  {
    "name": "Nombre del Shortcut",
    "short_name": "Nombre Corto",
    "description": "Descripción del shortcut",
    "url": "/ruta-destino",
    "icons": [
      {
        "src": "icons/icon-192x192.png",
        "sizes": "192x192"
      }
    ]
  }
]
```

### Cambiar la Acción

Para cambiar qué hace un shortcut:

1. Cambia la `url` en el manifest
2. Agrega la lógica en `app.ts` en `detectarAccionDesdeShortcut()`

## 📋 Checklist de Verificación

- [ ] App instalada en el móvil
- [ ] Mantener presionado el icono muestra los shortcuts
- [ ] "Nuevo Gasto Rápido" abre el formulario automáticamente
- [ ] Otros shortcuts navegan correctamente

## 🐛 Solución de Problemas

### Los shortcuts no aparecen:

**Causa:** La app no está instalada como PWA
**Solución:** 
1. Instala la app desde el navegador
2. Verifica que el manifest tiene los shortcuts configurados
3. Recarga la app después de instalar

### El formulario no se abre automáticamente:

**Causa:** La app no detecta el parámetro `action`
**Solución:**
1. Verifica que la URL tiene `?action=nuevo-gasto`
2. Verifica la consola del navegador para errores
3. Asegúrate de que `app.ts` tiene la lógica de detección

### Los shortcuts no funcionan en iOS:

**Causa:** iOS tiene soporte limitado
**Solución:**
- Los shortcuts funcionan desde iOS 14+
- Asegúrate de tener la última versión de iOS
- Los shortcuts pueden no aparecer en versiones antiguas

## 🎉 Beneficios

- ✅ Acceso rápido desde la pantalla de inicio
- ✅ No requiere abrir la app completa
- ✅ Registro de gastos en segundos
- ✅ Funciona offline (una vez instalada)

## 📚 Referencias

- [Web App Manifest - Shortcuts](https://developer.mozilla.org/en-US/docs/Web/Manifest/shortcuts)
- [PWA Shortcuts](https://web.dev/app-shortcuts/)

