# Solución de Error 404 en Netlify

## 🔍 Diagnóstico del Problema

El error 404 en Netlify puede tener varias causas. Sigue estos pasos para identificar y solucionar el problema.

---

## 📋 Checklist de Verificación

### 1. Verificar qué archivo está dando 404

Abre la consola del navegador (F12) y revisa qué archivo específico está fallando:
- ¿Es un archivo JS? (ej: `main-abc123.js`)
- ¿Es un archivo CSS? (ej: `styles-xyz789.css`)
- ¿Es el manifest? (`manifest.webmanifest`)
- ¿Es el service worker? (`ngsw-worker.js`)
- ¿Es una imagen? (`icons/icon-192x192.png`)
- ¿Es una ruta de Angular? (ej: `/dashboard`, `/gastos`)

---

## 🔧 Soluciones por Tipo de Error

### Error 404 en Archivos JS/CSS

**Causa:** Los archivos no se están generando o no están en la ruta correcta.

**Solución:**
1. Verifica que el build se completa correctamente:
   ```bash
   npm run build
   ```

2. Verifica que los archivos existen en `dist/gestor-tc/browser/`:
   - Debe haber archivos `.js` con hash (ej: `main-abc123.js`)
   - Debe haber archivos `.css` con hash

3. Verifica en Netlify:
   - Ve a **Deploys** > **Latest deploy** > **Deploy log**
   - Busca errores durante el build
   - Verifica que el build se completó exitosamente

4. Si los archivos no se generan:
   - Verifica `angular.json` - debe tener `outputHashing: "all"` en producción
   - Verifica que estás usando la configuración de producción

---

### Error 404 en manifest.webmanifest

**Causa:** El archivo no se está copiando al build o la ruta es incorrecta.

**Solución:**
1. Verifica que `public/manifest.webmanifest` existe
2. Verifica que `angular.json` incluye la carpeta `public` en assets:
   ```json
   "assets": [
     {
       "glob": "**/*",
       "input": "public"
     }
   ]
   ```
3. Verifica que después del build, el archivo está en `dist/gestor-tc/browser/manifest.webmanifest`
4. Verifica la ruta en `index.html`: debe ser `href="manifest.webmanifest"` (sin `/` al inicio)

---

### Error 404 en Service Worker (ngsw-worker.js)

**Causa:** El service worker no se está generando en producción.

**Solución:**
1. Verifica que `angular.json` tiene configurado el service worker:
   ```json
   "serviceWorker": "ngsw-config.json"
   ```
   (Debe estar en la configuración de producción)

2. Verifica que `ngsw-config.json` existe en la raíz del proyecto

3. Verifica que después del build, existe `dist/gestor-tc/browser/ngsw-worker.js`

4. Verifica que `app.config.ts` tiene:
   ```typescript
   provideServiceWorker('ngsw-worker.js', {
     enabled: !isDevMode(), // Solo en producción
     ...
   })
   ```

---

### Error 404 en Iconos

**Causa:** Los iconos no se están copiando o la ruta es incorrecta.

**Solución:**
1. Verifica que los iconos existen en `public/icons/`
2. Verifica que después del build están en `dist/gestor-tc/browser/icons/`
3. Verifica las rutas en `manifest.webmanifest`: deben ser relativas (ej: `icons/icon-192x192.png`)

---

### Error 404 en Rutas de Angular (ej: /dashboard, /gastos)

**Causa:** La redirección SPA no está funcionando correctamente.

**Solución:**
1. Verifica que `netlify.toml` tiene la redirección:
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **IMPORTANTE:** Esta redirección debe estar DESPUÉS de las otras configuraciones, o Netlify puede tener problemas

3. Verifica que el archivo `netlify.toml` está en la raíz del proyecto

4. Si sigue fallando, prueba con esta configuración alternativa:
   ```toml
   # Redirecciones más específicas
   [[redirects]]
     from = "/dashboard"
     to = "/index.html"
     status = 200
   
   [[redirects]]
     from = "/gastos"
     to = "/index.html"
     status = 200
   
   # ... más rutas
   
   # Catch-all al final
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

---

## 🛠️ Solución General: Revisar Configuración Completa

### 1. Verificar netlify.toml

Asegúrate de que el archivo tiene esta estructura:

```toml
[build]
  command = "npm run build"
  publish = "dist/gestor-tc/browser"

# Redirecciones AL FINAL
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2. Verificar Build Local

```bash
# Limpiar build anterior
rm -rf dist

# Build de producción
npm run build

# Verificar que los archivos existen
ls -la dist/gestor-tc/browser/
```

Debe mostrar:
- `index.html`
- `manifest.webmanifest`
- `ngsw-worker.js`
- `ngsw.json`
- Archivos `.js` y `.css` con hash
- Carpeta `icons/` con los iconos

### 3. Verificar en Netlify

1. Ve a **Site settings** > **Build & deploy**
2. Verifica:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist/gestor-tc/browser`
3. Ve a **Deploys** y revisa los logs del último deploy
4. Busca errores o advertencias

---

## 🔍 Debugging Avanzado

### Verificar Headers en Netlify

1. Abre tu sitio en el navegador
2. F12 > **Network**
3. Recarga la página
4. Haz clic en el archivo que da 404
5. Revisa:
   - **Status:** ¿Es realmente 404?
   - **Request URL:** ¿La ruta es correcta?
   - **Response Headers:** ¿Hay algún header que indique el problema?

### Verificar Archivos en Netlify

1. Ve a **Deploys** > **Latest deploy**
2. Haz clic en **"Browse published files"** o **"Deploy details"**
3. Verifica que los archivos existen en el deploy

### Verificar Logs de Build

1. Ve a **Deploys** > **Latest deploy** > **Deploy log**
2. Busca:
   - Errores de compilación
   - Advertencias sobre archivos faltantes
   - Errores de TypeScript
   - Errores de dependencias

---

## ✅ Solución Rápida: Redeploy

Si nada funciona, intenta:

1. **Limpiar caché de Netlify:**
   - Ve a **Deploys**
   - Haz clic en **"Trigger deploy"** > **"Clear cache and deploy site"**

2. **Verificar que netlify.toml está en Git:**
   ```bash
   git add netlify.toml
   git commit -m "Fix netlify.toml"
   git push
   ```

3. **Forzar nuevo deploy:**
   - Netlify debería detectar el cambio automáticamente
   - O ve a **Deploys** > **"Trigger deploy"** > **"Deploy site"**

---

## 📝 Checklist Final

Antes de reportar el problema, verifica:

- [ ] Build local funciona: `npm run build`
- [ ] Archivos existen en `dist/gestor-tc/browser/`
- [ ] `netlify.toml` está en la raíz del proyecto
- [ ] `netlify.toml` está en Git (si usas Git deploy)
- [ ] Build command en Netlify es correcto
- [ ] Publish directory en Netlify es correcto
- [ ] Revisaste los logs de deploy en Netlify
- [ ] Limpiaste caché y redeployaste

---

## 🆘 Si Nada Funciona

1. **Comparte información:**
   - ¿Qué archivo específico da 404? (consola del navegador)
   - ¿El build local funciona?
   - ¿Qué muestra el log de deploy en Netlify?

2. **Prueba deploy manual:**
   - Build local: `npm run build`
   - Comprime `dist/gestor-tc/browser/` en un ZIP
   - Sube el ZIP manualmente en Netlify (drag & drop)
   - Si funciona, el problema es la configuración de build

3. **Verifica versión de Node:**
   - En Netlify: **Site settings** > **Build & deploy** > **Environment**
   - Agrega variable: `NODE_VERSION` = `20` (o la versión que uses)

---

## 📚 Recursos

- [Netlify Redirects](https://docs.netlify.com/routing/redirects/)
- [Netlify Headers](https://docs.netlify.com/routing/headers/)
- [Angular Deployment](https://angular.io/guide/deployment)

