# Guía de Testing para PWA

## 🎯 Objetivo
Verificar que la Progressive Web App (PWA) funciona correctamente: instalación, offline, caché y actualizaciones.

---

## 📋 Checklist de Verificación

### 1. Build de Producción

Primero, asegúrate de que el build de producción funcione correctamente:

```bash
npm run build
```

**Verificar:**
- ✅ El build se completa sin errores
- ✅ Se genera el directorio `dist/gestor-tc/browser/`
- ✅ Existen los archivos PWA:
  - `ngsw-worker.js` (service worker)
  - `ngsw.json` (configuración del service worker)
  - `manifest.webmanifest`
  - `icons/icon-*.png` (iconos)

---

### 2. Servir la Aplicación Localmente

Para probar la PWA, necesitas servirla con HTTPS (o al menos con un servidor HTTP local). El service worker solo funciona en:
- **HTTPS** (producción)
- **localhost** (desarrollo)
- **127.0.0.1** (desarrollo)

#### Opción A: Usar http-server con HTTPS

```bash
# Instalar http-server globalmente (si no lo tienes)
npm install -g http-server

# Ir al directorio de build
cd dist/gestor-tc/browser

# Servir con HTTP (funciona para localhost)
http-server -p 8080 -c-1

# O con HTTPS (requiere certificado)
http-server -p 8080 -S -C cert.pem -K key.pem -c-1
```

#### Opción B: Usar Angular CLI serve (solo desarrollo)

```bash
# En modo desarrollo (service worker deshabilitado)
npm start

# Para probar PWA, necesitas build + servidor HTTP
```

#### Opción C: Usar Python SimpleHTTPServer

```bash
cd dist/gestor-tc/browser
python -m http.server 8080
```

**Abrir en navegador:**
- `http://localhost:8080` (Chrome/Edge/Firefox)
- El service worker funcionará en localhost

---

### 3. Verificar el Manifest

#### En Chrome DevTools:

1. Abre la aplicación en el navegador
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña **Application**
4. En el menú lateral, busca **Manifest**
5. Verifica:
   - ✅ Nombre: "Gestor de Tarjetas de Crédito"
   - ✅ Short name: "GestorTC"
   - ✅ Theme color: #14b8a6
   - ✅ Display: standalone
   - ✅ Iconos: 8 iconos visibles
   - ✅ Start URL: ./
   - ✅ Sin errores (debe mostrar "Manifest: valid")

#### Verificar en el código:

Abre `http://localhost:8080/manifest.webmanifest` en el navegador. Debe mostrar un JSON válido.

---

### 4. Verificar el Service Worker

#### En Chrome DevTools:

1. Ve a **Application** > **Service Workers**
2. Verifica:
   - ✅ Status: "activated and is running"
   - ✅ Source: `ngsw-worker.js`
   - ✅ Sin errores en la consola

#### Verificar en la consola:

Abre la consola del navegador (`F12` > Console) y busca:
- ✅ Mensajes del service worker
- ✅ "Service Worker registered" o similar
- ✅ Sin errores relacionados con el service worker

#### Verificar archivos cacheados:

1. Ve a **Application** > **Cache Storage**
2. Debe haber entradas como:
   - `ngsw:/db:control` (control)
   - `ngsw:/db:ngsw:app:...` (caché de la app)
   - `ngsw:/db:ngsw:assets:...` (caché de assets)

---

### 5. Probar Instalación

#### En Chrome/Edge Desktop:

1. Abre la aplicación en el navegador
2. Busca el ícono de **instalación** en la barra de direcciones (icono de "+" o "Instalar")
3. Haz clic en "Instalar" o "Add to Home Screen"
4. Verifica:
   - ✅ Se abre una ventana de instalación
   - ✅ Muestra el nombre "GestorTC"
   - ✅ Muestra el icono correcto
   - ✅ Al instalar, se crea un acceso directo en el escritorio/inicio
   - ✅ Al abrir desde el acceso directo, se abre en modo standalone (sin barra del navegador)

#### En Chrome Android:

1. Abre la aplicación en Chrome Android
2. Toca el menú (3 puntos) > "Agregar a pantalla de inicio"
3. Verifica:
   - ✅ Se agrega el icono a la pantalla de inicio
   - ✅ Al abrir, se muestra en modo standalone
   - ✅ El icono es el correcto

#### En Safari iOS (iOS 11.3+):

1. Abre la aplicación en Safari iOS
2. Toca el botón "Compartir" (cuadrado con flecha)
3. Toca "Agregar a pantalla de inicio"
4. Verifica:
   - ✅ Se agrega a la pantalla de inicio
   - ✅ Al abrir, se muestra en modo standalone

---

### 6. Probar Funcionalidad Offline

#### Simular Offline en Chrome DevTools:

1. Abre la aplicación
2. Ve a **Application** > **Service Workers**
3. Marca la casilla **"Offline"**
4. O ve a **Network** y selecciona **"Offline"** en el dropdown
5. Recarga la página (`F5` o `Ctrl+R`)
6. Verifica:
   - ✅ La aplicación carga correctamente
   - ✅ Los datos en localStorage están disponibles
   - ✅ Puedes navegar entre páginas
   - ✅ Los assets (CSS, JS, imágenes) se cargan desde caché
   - ✅ No aparecen errores de red en la consola

#### Probar con datos reales:

1. Abre la aplicación y crea algunos gastos/tarjetas
2. Desconecta tu conexión a internet (o activa modo avión)
3. Recarga la página
4. Verifica:
   - ✅ Los datos creados están visibles
   - ✅ Puedes crear nuevos gastos (se guardan en localStorage)
   - ✅ La navegación funciona
   - ✅ Los gráficos y visualizaciones funcionan

---

### 7. Probar Actualizaciones

#### Simular actualización:

1. Abre la aplicación en el navegador
2. Ve a **Application** > **Service Workers**
3. Haz clic en **"Update"** o **"Unregister"** y luego recarga
4. Modifica algún archivo (ej: cambia el título en `index.html`)
5. Ejecuta `npm run build` nuevamente
6. Recarga la página
7. Verifica:
   - ✅ El service worker detecta la nueva versión
   - ✅ Aparece una notificación (si implementaste el servicio de actualizaciones)
   - ✅ Al aceptar, la página se recarga con la nueva versión

#### Verificar en la consola:

Busca mensajes como:
- "Verificando actualizaciones..."
- "Nueva versión disponible"
- "Service Worker activado"

---

### 8. Verificar Rendimiento

#### En Chrome DevTools:

1. Ve a **Lighthouse**
2. Selecciona:
   - ✅ Progressive Web App
   - ✅ Performance
   - ✅ Best Practices
3. Haz clic en **"Generate report"**
4. Verifica la puntuación PWA:
   - ✅ Debe ser 100/100 o muy cercano
   - ✅ Debe pasar todas las pruebas:
     - ✅ Registers a service worker
     - ✅ Responds with a 200 when offline
     - ✅ Contains some content when JavaScript is not available
     - ✅ Uses HTTPS
     - ✅ Redirects HTTP traffic to HTTPS
     - ✅ Has a web app manifest
     - ✅ Manifest has valid icons
     - ✅ Manifest has valid name
     - ✅ Manifest has valid short_name
     - ✅ Manifest has valid start_url
     - ✅ Manifest has valid display
     - ✅ Manifest has valid theme_color
     - ✅ Manifest has valid background_color

---

### 9. Verificar Iconos

#### En Chrome DevTools:

1. Ve a **Application** > **Manifest**
2. En la sección "Icons", verifica:
   - ✅ Todos los iconos se cargan correctamente
   - ✅ Los tamaños son correctos (72x72, 96x96, etc.)
   - ✅ No hay errores 404

#### Verificar manualmente:

Abre en el navegador:
- `http://localhost:8080/icons/icon-192x192.png`
- `http://localhost:8080/icons/icon-512x512.png`

Deben mostrarse correctamente.

---

### 10. Verificar Meta Tags

#### Inspeccionar el HTML:

1. Abre la aplicación
2. Haz clic derecho > "Ver código fuente" o `Ctrl+U`
3. Verifica que existan:
   - ✅ `<link rel="manifest" href="manifest.webmanifest">`
   - ✅ `<meta name="theme-color" content="#14b8a6">`
   - ✅ `<meta name="apple-mobile-web-app-capable" content="yes">`
   - ✅ `<link rel="apple-touch-icon" href="icons/icon-192x192.png">`

---

## 🐛 Solución de Problemas Comunes

### El service worker no se registra:

**Causa:** Estás en modo desarrollo
**Solución:** El service worker solo funciona en producción. Usa `npm run build` y sirve los archivos de `dist/`.

### No puedo instalar la app:

**Causa:** Falta el manifest o hay errores
**Solución:** 
- Verifica que `manifest.webmanifest` existe
- Verifica que tiene `display: "standalone"`
- Verifica que tiene iconos válidos
- Verifica en DevTools > Application > Manifest que no hay errores

### La app no funciona offline:

**Causa:** El service worker no está activo o hay errores
**Solución:**
- Verifica en DevTools > Application > Service Workers que está activo
- Verifica en Console que no hay errores
- Verifica que el build de producción se ejecutó correctamente

### Los iconos no aparecen:

**Causa:** Rutas incorrectas o archivos faltantes
**Solución:**
- Verifica que los iconos existen en `public/icons/`
- Verifica que las rutas en `manifest.webmanifest` son correctas
- Verifica en Network que los iconos se cargan (no 404)

---

## ✅ Checklist Final

Antes de considerar la PWA como lista para producción:

- [ ] Build de producción funciona sin errores
- [ ] Manifest válido y sin errores
- [ ] Service worker se registra correctamente
- [ ] App se puede instalar en desktop
- [ ] App se puede instalar en móvil
- [ ] App funciona completamente offline
- [ ] Los datos se guardan y cargan correctamente offline
- [ ] Los assets se cachean correctamente
- [ ] Las actualizaciones se detectan
- [ ] Lighthouse PWA score > 90
- [ ] Iconos se muestran correctamente
- [ ] Meta tags están presentes
- [ ] Modo standalone funciona (sin barra del navegador)

---

## 📱 Pruebas en Dispositivos Reales

### Android:
1. Comparte la URL de la app (debe estar en HTTPS)
2. Abre en Chrome Android
3. Instala desde el menú
4. Prueba offline desconectando WiFi/datos

### iOS:
1. Abre en Safari iOS (no en Chrome)
2. Agrega a pantalla de inicio
3. Prueba offline activando modo avión

### Desktop:
1. Abre en Chrome/Edge
2. Instala desde el ícono en la barra de direcciones
3. Abre desde el acceso directo
4. Verifica modo standalone

---

## 🎉 ¡Listo!

Si todas las verificaciones pasan, tu PWA está funcionando correctamente y lista para producción.

**Recuerda:** Para producción, necesitas:
- ✅ HTTPS (certificado SSL)
- ✅ Dominio configurado
- ✅ Build de producción desplegado
- ✅ Service worker activo

