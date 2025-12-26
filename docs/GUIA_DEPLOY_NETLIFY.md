# Guía de Deploy en Netlify para PWA

## 🚀 Objetivo
Desplegar la aplicación Angular PWA "GestorTC" en Netlify con todas las configuraciones necesarias para que funcione correctamente como PWA.

---

## 📋 Requisitos Previos

- ✅ Cuenta en Netlify (gratis): [https://www.netlify.com](https://www.netlify.com)
- ✅ Repositorio Git (GitHub, GitLab, o Bitbucket)
- ✅ Aplicación compilando correctamente (`npm run build`)

---

## 🎯 Opción 1: Deploy desde Git (Recomendado)

### Paso 1: Subir código a Git

Si aún no tienes tu código en Git:

```bash
# Inicializar repositorio (si no existe)
git init

# Agregar todos los archivos
git add .

# Commit inicial
git commit -m "Initial commit: GestorTC PWA"

# Agregar repositorio remoto (reemplaza con tu URL)
git remote add origin https://github.com/tu-usuario/gestor-tc.git

# Subir código
git push -u origin main
```

### Paso 2: Conectar con Netlify

1. Ve a [https://app.netlify.com](https://app.netlify.com)
2. Inicia sesión o crea una cuenta
3. Haz clic en **"Add new site"** > **"Import an existing project"**
4. Conecta tu repositorio (GitHub/GitLab/Bitbucket)
5. Selecciona tu repositorio `gestor-tc`

### Paso 3: Configurar Build Settings

Netlify detectará automáticamente Angular, pero verifica:

**Build command:**
```
npm run build
```

**Publish directory:**
```
dist/gestor-tc/browser
```

**Node version (si es necesario):**
- Ve a **Site settings** > **Build & deploy** > **Environment**
- Agrega variable: `NODE_VERSION` = `20` (o la versión que uses)

### Paso 4: Deploy

1. Haz clic en **"Deploy site"**
2. Espera a que termine el build (2-5 minutos)
3. ¡Listo! Tu sitio estará disponible en `https://tu-sitio.netlify.app`

---

## 🎯 Opción 2: Deploy Manual (Drag & Drop)

### Paso 1: Build Local

```bash
npm run build
```

### Paso 2: Subir a Netlify

1. Ve a [https://app.netlify.com](https://app.netlify.com)
2. Arrastra y suelta la carpeta `dist/gestor-tc/browser` en el área de deploy
3. Netlify subirá y desplegará automáticamente

**Nota:** Con este método, cada vez que hagas cambios necesitarás hacer build y subir manualmente.

---

## ⚙️ Configuración Adicional

### 1. Archivo netlify.toml

Ya está creado en la raíz del proyecto con:
- ✅ Redirecciones para SPA
- ✅ Headers para PWA
- ✅ Headers de seguridad
- ✅ Cacheo optimizado

### 2. Variables de Entorno (si las necesitas)

Si tu app usa variables de entorno:

1. Ve a **Site settings** > **Build & deploy** > **Environment**
2. Agrega variables como:
   - `NODE_VERSION` = `20`
   - `NPM_FLAGS` = `--legacy-peer-deps` (si es necesario)

### 3. Dominio Personalizado

1. Ve a **Site settings** > **Domain management**
2. Haz clic en **"Add custom domain"**
3. Ingresa tu dominio (ej: `gestortc.com`)
4. Sigue las instrucciones para configurar DNS

**Importante:** Netlify proporciona HTTPS automáticamente, necesario para PWA.

---

## ✅ Verificación Post-Deploy

### 1. Verificar que la App Funciona

1. Abre tu sitio en el navegador
2. Verifica que carga correctamente
3. Navega entre páginas (debe funcionar sin recargar)

### 2. Verificar PWA

1. Abre Chrome DevTools (F12)
2. Ve a **Application** > **Manifest**
   - ✅ Debe mostrar "Manifest: valid"
   - ✅ Sin errores

3. Ve a **Application** > **Service Workers**
   - ✅ Status: "activated and is running"
   - ✅ Sin errores

### 3. Probar Instalación

1. Busca el ícono de instalación en la barra de direcciones
2. Haz clic en "Instalar"
3. Verifica que se instala correctamente

### 4. Probar Offline

1. Chrome DevTools > **Application** > **Service Workers**
2. Marca "Offline"
3. Recarga la página
4. ✅ Debe funcionar sin conexión

### 5. Lighthouse Audit

1. Chrome DevTools > **Lighthouse**
2. Selecciona "Progressive Web App"
3. Genera reporte
4. ✅ Debe obtener puntuación alta (>90)

---

## 🔄 Deploy Automático

Con la Opción 1 (Git), cada vez que hagas `git push`:

1. Netlify detecta el cambio automáticamente
2. Ejecuta el build
3. Despliega la nueva versión
4. Notifica por email (opcional)

### Branch Deploys

Netlify puede desplegar diferentes branches:
- **Production:** `main` o `master`
- **Preview:** Cualquier otro branch (crea deploy preview)

Configura en **Site settings** > **Build & deploy** > **Branch deploys**

---

## 🐛 Solución de Problemas

### Error: "Build failed"

**Causa común:** Dependencias o versión de Node
**Solución:**
1. Verifica que `package.json` tiene todas las dependencias
2. Agrega `NODE_VERSION` en variables de entorno
3. Revisa los logs de build en Netlify

### Error: "404 en rutas"

**Causa:** Falta redirección SPA
**Solución:** Verifica que `netlify.toml` existe y tiene las redirecciones

### Service Worker no funciona

**Causa:** Headers incorrectos o HTTPS no configurado
**Solución:**
1. Verifica que Netlify está usando HTTPS (automático)
2. Verifica headers en `netlify.toml`
3. Revisa consola del navegador para errores

### Manifest no se carga

**Causa:** Ruta incorrecta o archivo faltante
**Solución:**
1. Verifica que `manifest.webmanifest` está en `dist/gestor-tc/browser/`
2. Verifica que la ruta en `index.html` es correcta
3. Revisa Network tab en DevTools

---

## 📱 Testing en Producción

### 1. Probar en Móvil

1. Abre tu sitio en Chrome Android
2. Verifica instalación
3. Prueba offline

### 2. Probar en Desktop

1. Abre en Chrome/Edge
2. Instala la app
3. Verifica modo standalone

### 3. Verificar HTTPS

- ✅ Netlify proporciona HTTPS automáticamente
- ✅ Verifica que la URL es `https://` (no `http://`)
- ✅ El certificado SSL es válido

---

## 🎉 ¡Listo!

Tu PWA está desplegada en Netlify y lista para usar.

**URL de ejemplo:**
- `https://gestor-tc.netlify.app`
- O tu dominio personalizado

**Próximos pasos:**
- Compartir la URL con usuarios
- Configurar dominio personalizado (opcional)
- Monitorear analytics (Netlify Analytics, opcional)

---

## 📚 Recursos Adicionales

- [Documentación de Netlify](https://docs.netlify.com/)
- [Netlify Build Settings](https://docs.netlify.com/configure-builds/overview/)
- [Netlify Headers](https://docs.netlify.com/routing/headers/)
- [PWA Checklist](https://web.dev/pwa-checklist/)

