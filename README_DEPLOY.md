# 🚀 Deploy en Netlify - Guía Rápida

## Pasos Rápidos

### 1. Build Local (Opcional - para probar)
```bash
npm run build
```

### 2. Subir a Git
```bash
git add .
git commit -m "Preparar para deploy en Netlify"
git push
```

### 3. Conectar con Netlify

1. Ve a [https://app.netlify.com](https://app.netlify.com)
2. **"Add new site"** > **"Import an existing project"**
3. Conecta tu repositorio
4. Configuración automática (Netlify detecta Angular):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist/gestor-tc/browser`
5. **"Deploy site"**

### 4. ¡Listo!
Tu app estará en `https://tu-sitio.netlify.app`

---

## ✅ Verificación

1. Abre tu sitio
2. F12 > Application > Manifest (debe ser válido)
3. F12 > Application > Service Workers (debe estar activo)
4. Busca ícono de instalación en barra de direcciones

---

## 📝 Archivos Importantes

- ✅ `netlify.toml` - Configuración de Netlify (ya creado)
- ✅ `package.json` - Scripts de build
- ✅ `angular.json` - Configuración de Angular

---

## 🔧 Si algo falla

1. Revisa logs de build en Netlify
2. Verifica que `netlify.toml` existe
3. Verifica que el build local funciona: `npm run build`
4. Consulta `docs/GUIA_DEPLOY_NETLIFY.md` para más detalles

---

## 📚 Documentación Completa

Ver `docs/GUIA_DEPLOY_NETLIFY.md` para guía detallada.

