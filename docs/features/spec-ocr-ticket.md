# Spec: Escanear ticket (OCR) para crear gasto

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 4.2 Escanear ticket (OCR) (SI)  
**Prioridad:** Baja (esfuerzo alto)  
**Módulo:** Gastos / Formulario  

---

## 1. Objetivo

Permitir al usuario **tomar una foto del ticket o recibo** (o subir una imagen) y, mediante OCR, **extraer monto, fecha y descripción** para sugerir un gasto y crearlo tras confirmación o corrección manual.

---

## 2. Requisitos funcionales

### 2.1 Captura o subida de imagen

- **Opciones:**
  - **Cámara:** botón “Escanear ticket” que abra la cámara del dispositivo (getUserMedia o input `capture="environment"`) para tomar una foto.
  - **Archivo:** subir una imagen desde el dispositivo (input file aceptando image/*).
- La imagen se muestra en vista previa antes de procesar. El usuario puede descartar y volver a capturar/subir.

### 2.2 Procesamiento OCR

- **Librería:** usar una librería de OCR que funcione en el navegador, por ejemplo **Tesseract.js** (wrapper de Tesseract). Configurar idioma español (`spa`) para mejorar reconocimiento de números y texto en tickets locales.
- **Flujo:**
  1. Enviar la imagen (canvas o blob) al worker de Tesseract.
  2. Obtener el texto reconocido (string).
  3. **Parsear** el texto para extraer:
     - **Monto total:** patrones como “Total $ 1.234,56”, “Total: 1234.56”, “TOTAL 1234”, números con decimales al final de línea, etc.
     - **Fecha:** patrones como “01/02/2025”, “01-02-2025”, “1 feb 2025”.
     - **Descripción o comercio:** primera línea, o línea que contenga nombre del comercio; o usar “Ticket” + fecha como descripción por defecto.
  4. Si no se encuentra monto, mostrar el texto completo y permitir que el usuario ingrese monto (y fecha/descripción) manualmente.

### 2.3 Integración con el formulario de gasto

- Tras el OCR, abrir el **formulario de gasto** (completo o rápido) con los campos **prellenados**: monto, fecha, descripción. Tarjeta: última usada o selector.
- El usuario **debe poder corregir** cualquier campo antes de guardar.
- Opcional: guardar la **imagen** asociada al gasto (en base64 en localStorage o en un almacenamiento local; tener en cuenta límites de tamaño). Si se guarda, mostrar miniatura en el detalle del gasto.

### 2.4 Manejo de errores y calidad

- Si el OCR falla (error de Tesseract o timeout), mostrar mensaje “No pudimos leer el ticket. Podés ingresar los datos manualmente” y abrir el formulario con campos vacíos (o solo con la imagen adjunta si se implementó).
- Si la calidad de la imagen es baja, se puede mostrar advertencia (“La imagen puede no leerse bien”) pero intentar el reconocimiento igual.
- Tiempo de procesamiento: mostrar un indicador de carga (“Leyendo ticket…”) mientras corre el OCR (puede tardar varios segundos).

---

## 3. Criterios de aceptación

- [ ] El usuario puede abrir “Escanear ticket” desde el formulario de gastos (o desde el FAB/diálogo rápido) y capturar una foto o subir una imagen.
- [ ] Se ejecuta OCR sobre la imagen y se extrae al menos el monto (y opcionalmente fecha y descripción).
- [ ] El formulario de gasto se abre con los campos prellenados; el usuario puede corregir y guardar.
- [ ] Si el OCR falla, se informa y se ofrece ingresar datos manualmente.
- [ ] (Opcional) La imagen se guarda asociada al gasto y se muestra en el detalle.

---

## 4. Notas técnicas

- **Tesseract.js:** `npm install tesseract.js`. Uso básico: `Tesseract.recognize(image, 'spa', { logger: m => ... })`. Ejecutar en worker para no bloquear la UI. La imagen puede ser URL, blob o base64.
- **Parsing del texto:** expresiones regulares para total/total final; para fecha, formatos dd/mm/yyyy y variantes. Primera línea o línea con mayúsculas para comercio/descripción.
- **Tamaño de imagen:** comprimir o redimensionar antes de enviar a Tesseract si la imagen es muy grande (mejora rendimiento). Límite razonable ej. 2–3 MB.
- **Almacenamiento de imagen:** si se guarda, campo opcional en modelo Gasto (ej. `imagenBase64?: string` o `imagenUrl` si se usa IndexedDB/blob). Backup debe incluir estas imágenes o decidir no incluirlas por tamaño.
- **Archivos a tocar:**  
  - `src/app/components/gasto-dialog/` o `gasto-rapido-dialog/` (botón “Escanear ticket”, preview, llamada a OCR)  
  - Nuevo `src/app/services/ocr-ticket.service.ts` (Tesseract + parsing)  
  - `src/app/models/gasto.model.ts` (campo opcional para imagen)  
  - Página de gastos o detalle para mostrar miniatura si se guarda imagen  

---

## 5. Dependencias

- **tesseract.js** (npm). Aumenta el tamaño del bundle; considerar lazy load del módulo OCR solo cuando el usuario abra “Escanear ticket”.
- Cámara: API estándar del navegador (getUserMedia); permisos de cámara.
