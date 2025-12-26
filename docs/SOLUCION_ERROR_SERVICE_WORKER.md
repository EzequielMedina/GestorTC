# Solución: Error "Unknown strategy: networkFirst" en Service Worker

## 🔍 Problema

El error indica que el Service Worker de Angular no reconoce la estrategia `networkFirst` en la configuración de `dataGroups`.

**Error:**
```
Uncaught (in promise) Error: Unknown strategy: networkFirst
```

## ✅ Solución

Angular Service Worker usa nombres de estrategias diferentes. Las estrategias válidas son:

- `freshness` - Equivalente a "network first" (intenta red primero, luego caché)
- `performance` - Equivalente a "cache first" (usa caché primero, luego red)

### Cambio Necesario

En `ngsw-config.json`, cambiar:

```json
"strategy": "networkFirst"  ❌ Incorrecto
```

Por:

```json
"strategy": "freshness"  ✅ Correcto
```

## 📝 Archivo Corregido

El archivo `ngsw-config.json` ya ha sido corregido con la estrategia `freshness`.

## 🔄 Próximos Pasos

1. **Hacer build de producción:**
   ```bash
   npm run build
   ```

2. **Verificar que se genera correctamente:**
   - Debe generar `dist/gestor-tc/browser/ngsw-worker.js`
   - Debe generar `dist/gestor-tc/browser/ngsw.json`

3. **Subir cambios a Git:**
   ```bash
   git add ngsw-config.json
   git commit -m "Fix: Corregir estrategia del service worker a 'freshness'"
   git push
   ```

4. **Redeploy en Netlify:**
   - Netlify detectará el cambio automáticamente
   - O ve a **Deploys** > **Trigger deploy** > **Clear cache and deploy site**

5. **Limpiar caché del navegador:**
   - F12 > **Application** > **Service Workers**
   - Haz clic en **"Unregister"** para eliminar el service worker antiguo
   - Recarga la página (Ctrl+Shift+R o Cmd+Shift+R)
   - El nuevo service worker se registrará automáticamente

## 🧪 Verificación

Después del redeploy:

1. Abre la aplicación en el navegador
2. F12 > **Console** - No debe haber errores del service worker
3. F12 > **Application** > **Service Workers** - Debe estar activo sin errores
4. Navega entre páginas - Debe funcionar correctamente

## 📚 Referencias

- [Angular Service Worker - Data Groups](https://angular.io/guide/service-worker-config#datagroups)
- Estrategias válidas: `freshness` y `performance`

