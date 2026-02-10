# Spec: Registro de gastos por voz

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 4.1 Registro por voz (SI)  
**Prioridad:** Baja (alcance alto, esfuerzo alto)  
**Módulo:** Gastos / Formulario rápido  

---

## 1. Objetivo

Permitir registrar un gasto mediante **comando de voz** del tipo “Gasté 5000 en supermercado con Visa”: el sistema interpreta el texto (monto, descripción, tarjeta) y abre el formulario rápido prellenado, o guarda directo con confirmación del usuario.

---

## 2. Requisitos funcionales

### 2.1 Entrada de voz

- **Activación:** botón de micrófono en el formulario rápido (o en la barra del FAB/diálogo) que active el reconocimiento de voz.
- **Tecnología:** usar **Web Speech API** (`SpeechRecognition`) cuando esté disponible en el navegador (Chrome, Edge; Safari y Firefox con soporte limitado). Detectar disponibilidad y, si no hay soporte, ocultar el botón o mostrar mensaje “Tu navegador no soporta reconocimiento de voz”.
- **Flujo:**
  1. Usuario pulsa el botón de micrófono (y autoriza uso del micrófono si el navegador lo pide).
  2. Usuario dice una frase tipo: “Gasté [monto] en [descripción]” o “Gasté [monto] pesos en [descripción] con [tarjeta]”.
  3. El sistema obtiene el texto reconocido y lo procesa (ver siguiente punto).
  4. Con el resultado, se prellenan monto, descripción y opcionalmente tarjeta en el formulario rápido; el usuario puede corregir y luego guardar. **Alternativa:** guardar directo y mostrar confirmación (“Se registró: $5000 en supermercado. ¿Correcto?”) con opción de deshacer o editar.

### 2.2 Interpretación del texto (parsing)

- **Objetivo:** extraer de la frase:
  - **Monto:** número (con o sin “pesos”, “mil”, “cientos”). Ej: “cinco mil”, “5000”, “mil doscientos”.
  - **Descripción:** resto del texto que describa el gasto (ej. “en supermercado”, “en café”).
  - **Tarjeta (opcional):** si se menciona un nombre de tarjeta (ej. “con Visa”, “con la Naranja”), intentar mapear al nombre de una tarjeta existente del usuario (búsqueda parcial por nombre).
- **Estrategia:** reglas con expresiones regulares o un parser simple (palabras clave “gasté”, “en”, “con”; número al inicio o después de “gasté”). Si el parsing falla o es ambiguo, mostrar el texto reconocido en el campo descripción y dejar monto/tarjeta para que el usuario complete manualmente.
- **Idioma:** configurar el reconocimiento de voz en español (Argentina o España según preferencia del usuario o locale de la app).

### 2.3 Experiencia de usuario

- Indicador visual mientras se está escuchando (ej. icono de micrófono animado o “Escuchando…”).
- Mostrar el texto transcrito antes de aplicar el parsing (opcional pero recomendado para que el usuario vea qué entendió el sistema).
- Si se prellena el formulario: el usuario puede editar y guardar. Si se guarda directo: confirmación con opción de deshacer (eliminar el último gasto recién creado) o editar.

### 2.4 Privacidad y permisos

- No enviar audio a servidores propios; usar solo la API del navegador (que puede usar servicios del fabricante del navegador). Documentar en ayuda o términos si hace falta.
- Pedir permiso de micrófono solo al pulsar el botón de voz, no al cargar la app.

---

## 3. Criterios de aceptación

- [ ] Existe un botón de micrófono en el formulario rápido (o en el diálogo de gasto rápido) que inicia el reconocimiento de voz.
- [ ] En navegadores compatibles (Chrome/Edge), el usuario puede decir una frase tipo “Gasté X en Y” y el sistema extrae monto y descripción (y opcionalmente tarjeta) para prellenar el formulario o guardar con confirmación.
- [ ] Si el navegador no soporta reconocimiento de voz, el botón no se muestra o se muestra un mensaje informativo.
- [ ] El usuario puede corregir los datos antes de guardar (o deshacer después de guardar).
- [ ] El idioma del reconocimiento es español.

---

## 4. Notas técnicas

- **Web Speech API:** `window.SpeechRecognition` o `window.webkitSpeechRecognition`; eventos `result`, `end`, `error`. Configurar `continuous: false`, `lang: 'es-AR'` (o `es-ES`).
- **Parsing:** función que reciba string y devuelva `{ monto?: number, descripcion: string, tarjetaId?: string }`. Manejar números en palabras (“mil”, “cinco mil”) con un diccionario simple o librería (ej. convertir “cinco mil” a 5000).
- **Archivos a tocar:**  
  - `src/app/components/gasto-rapido-dialog/` (botón micrófono, llamada a reconocimiento, prellenado)  
  - Nuevo `src/app/services/voice-parser.service.ts` (o utilidad) para interpretar el texto  
  - Opcional: `src/app/services/speech-recognition.service.ts` para encapsular la API  

---

## 5. Dependencias

- Ninguna librería externa obligatoria; Web Speech API es nativa del navegador. Para conversión de números en palabras a dígitos, se puede implementar un pequeño parser o usar una librería ligera si existe en npm (opcional).
