# Gestor TC - Gestor de Tarjetas de Crédito

## 📋 Descripción

Gestor TC es una aplicación web desarrollada en Angular para la gestión y seguimiento de gastos de tarjetas de crédito. Permite importar datos desde archivos Excel, visualizar resúmenes detallados por tarjeta y mes, y gestionar gastos compartidos entre múltiples personas.

## ✨ Características Principales

### 📊 Gestión de Gastos
- **Importación de datos**: Carga masiva desde archivos Excel
- **Resumen por tarjeta**: Visualización detallada de gastos por tarjeta y mes
- **Categorización**: Organización automática de gastos por categorías
- **Gastos compartidos**: Gestión de gastos divididos entre múltiples personas

### 📱 Interfaz de Usuario
- **Diseño responsivo**: Optimizado para dispositivos móviles y desktop
- **Secciones colapsables**: Navegación intuitiva con resúmenes visuales
- **Navegación por meses**: Fácil acceso a datos históricos
- **Estadísticas en tiempo real**: Totales y promedios actualizados automáticamente

### 🔧 Funcionalidades Técnicas
- **Exportación de datos**: Descarga de resúmenes en formato Excel
- **Persistencia local**: Almacenamiento en IndexedDB
- **Validación de datos**: Verificación automática de integridad
- **Interfaz moderna**: Diseño limpio con Angular Material

## 🚀 Instalación

### Prerrequisitos
- Node.js (versión 18 o superior)
- npm (incluido con Node.js)
- Angular CLI

### Pasos de instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd gestor-tc
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Instalar Angular CLI** (si no está instalado)
   ```bash
   npm install -g @angular/cli
   ```

4. **Ejecutar la aplicación**
   ```bash
   ng serve
   ```

5. **Acceder a la aplicación**
   Abrir el navegador en `http://localhost:4200`

## 📖 Uso

### Importación de Datos
1. Navegar a la sección "Importar"
2. Seleccionar archivo Excel con el formato requerido
3. Verificar la vista previa de datos
4. Confirmar la importación

### Visualización de Resúmenes
1. Ir a la página "Resumen"
2. Seleccionar el mes deseado usando los controles de navegación
3. Expandir/colapsar secciones según necesidad:
   - **Por Tarjeta**: Resumen individual de cada tarjeta
   - **Detalle de Gastos**: Gastos agrupados por categoría
   - **Gastos Compartidos**: Gastos divididos entre personas
   - **Resumen General**: Estadísticas globales

### Exportación de Datos
1. Desde la página "Resumen", usar el botón "Exportar"
2. El archivo Excel se descargará automáticamente

## 🏗️ Estructura del Proyecto

```
src/
├── app/
│   ├── components/          # Componentes reutilizables
│   ├── models/             # Interfaces y tipos TypeScript
│   ├── pages/              # Páginas principales
│   │   ├── importar/       # Página de importación
│   │   └── resumen/        # Página de resúmenes
│   ├── services/           # Servicios de datos y lógica
│   ├── app.config.ts       # Configuración de la aplicación
│   ├── app.routes.ts       # Configuración de rutas
│   └── app.ts              # Componente principal
├── assets/                 # Recursos estáticos
├── custom-theme.scss       # Tema personalizado
└── styles.css              # Estilos globales
```

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Angular 18
- **UI Components**: Angular Material
- **Estilos**: SCSS, CSS Variables
- **Base de Datos**: IndexedDB (Dexie.js)
- **Procesamiento de Excel**: SheetJS
- **Iconos**: Material Icons
- **Build Tool**: Angular CLI

## 📋 Formato de Datos

La aplicación espera archivos Excel con las siguientes columnas:
- **Fecha**: Fecha de la transacción
- **Tarjeta**: Nombre o identificador de la tarjeta
- **Descripción**: Descripción del gasto
- **Categoría**: Categoría del gasto
- **Monto**: Valor de la transacción
- **Persona**: (Opcional) Para gastos compartidos

## 🔄 Scripts Disponibles

- `npm start` - Ejecutar servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run test` - Ejecutar pruebas unitarias
- `npm run lint` - Verificar código con ESLint

## 📱 Compatibilidad

- **Navegadores**: Chrome, Firefox, Safari, Edge (versiones modernas)
- **Dispositivos**: Desktop, tablet, móvil
- **Resoluciones**: Optimizado desde 360px hasta 4K

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama para nueva funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para reportar bugs o solicitar nuevas funcionalidades, crear un issue en el repositorio del proyecto.

---

**Desarrollado con ❤️ usando Angular**
