# Problema: Nombre de usuario incorrecto en GitHub Classroom

## Descripción del problema

Cuando los estudiantes aceptan una asignación en GitHub Classroom, el nombre del repositorio no aparece en el formato esperado `curso-legajo-apellido-nombre`. En su lugar, aparece solo el nombre de usuario de GitHub del estudiante.

## Causa del problema

Este problema ocurre cuando el nombre de usuario (username) de GitHub del estudiante no sigue la convención requerida para el curso.

## Solución

Para resolver este problema, el estudiante debe cambiar su nombre de usuario en GitHub siguiendo estos pasos:

### Pasos para cambiar el username en GitHub

1. **Iniciar sesión en GitHub**
   - Ir a [github.com](https://github.com)
   - Iniciar sesión con sus credenciales

2. **Acceder a la configuración de la cuenta**
   - Hacer clic en el avatar/foto de perfil en la esquina superior derecha
   - Seleccionar "Settings" del menú desplegable

3. **Cambiar el nombre de usuario**
   - En la página de Settings, buscar la sección "Account"
   - Localizar el campo "Username"
   - Hacer clic en "Change username"

4. **Establecer el nuevo nombre de usuario**
   - Ingresar el nuevo username en el formato: `curso-legajo-apellido-nombre`
   - Ejemplo: `pii-01-12345-garcia-juan`
   - Verificar que el nombre esté disponible
   - Confirmar el cambio

### Formato requerido del username

```
curso-legajo-apellido-nombre
```

**Donde:**
- `curso`: Código del curso (ej: pii-01, prog-02, etc.)
- `legajo`: Número de legajo del estudiante
- `apellido`: Apellido del estudiante (sin espacios, en minúsculas)
- `nombre`: Nombre del estudiante (sin espacios, en minúsculas)

### Ejemplo completo

Si un estudiante se llama "Juan García" y tiene el legajo "12345" en el curso "PII-01", su username debería ser:

```
pii-01-12345-garcia-juan
```

## Consideraciones importantes

- **Timing**: Es recomendable cambiar el username ANTES de aceptar la asignación en GitHub Classroom
- **Disponibilidad**: El username debe estar disponible en GitHub
- **Caracteres especiales**: Evitar acentos, espacios y caracteres especiales
- **Minúsculas**: Usar solo letras minúsculas para mantener consistencia

## Qué hacer si ya se aceptó la asignación

Si el estudiante ya aceptó la asignación con un username incorrecto:

1. Cambiar el username siguiendo los pasos anteriores
2. Contactar al profesor para que pueda actualizar la asociación en GitHub Classroom
3. En algunos casos, puede ser necesario volver a aceptar la asignación

## Verificación

Para verificar que el cambio fue exitoso:

1. Ir al perfil de GitHub del estudiante
2. Verificar que la URL sea: `github.com/curso-legajo-apellido-nombre`
3. Al aceptar una nueva asignación, el repositorio debería crearse con el nombre correcto

---

# Problema: Configuración global de Git no establecida

## Descripción del problema

Cuando los estudiantes intentan hacer commits o push a sus repositorios de GitHub Classroom, pueden encontrar errores relacionados con la privacidad o autenticación. Esto ocurre porque no tienen configurada globalmente su cuenta de Git en la computadora.

## Causa del problema

Este problema surge cuando Git no tiene configuradas las credenciales del usuario a nivel global en el sistema, lo que impide que Git identifique correctamente al autor de los commits.

## Solución

Para resolver este problema, el estudiante debe configurar globalmente su cuenta de Git usando el email institucional de la UTN:

### Pasos para configurar Git globalmente

1. **Abrir la terminal o línea de comandos**
   - En Windows: Abrir "Git Bash", "Command Prompt" o "PowerShell"
   - En macOS/Linux: Abrir "Terminal"

2. **Configurar el nombre de usuario**
   ```bash
   git config --global user.name "Tu Nombre Completo"
   ```
   - Ejemplo: `git config --global user.name "Juan García"`

3. **Configurar el email institucional**
   ```bash
   git config --global user.email "tu-email@frba.utn.edu.ar"
   ```
   - Ejemplo: `git config --global user.email "juan.garcia@frba.utn.edu.ar"`
   - **Importante**: Usar el email institucional de la UTN

4. **Verificar la configuración**
   ```bash
   git config --global --list
   ```
   - Esto mostrará todas las configuraciones globales de Git
   - Verificar que aparezcan `user.name` y `user.email` correctamente

### Configuración adicional recomendada

**Configurar el editor por defecto (opcional):**
```bash
git config --global core.editor "code --wait"
```
*Para usar Visual Studio Code como editor por defecto*

**Configurar el comportamiento de push:**
```bash
git config --global push.default simple
```

### Verificación de la configuración

Para verificar que la configuración fue exitosa:

1. **Ver configuración específica:**
   ```bash
   git config user.name
   git config user.email
   ```

2. **Ver toda la configuración:**
   ```bash
   git config --list
   ```

3. **Probar con un commit:**
   - Hacer un pequeño cambio en un archivo
   - Ejecutar `git add .` y `git commit -m "Test commit"`
   - Verificar que no aparezcan errores de autenticación

## Consideraciones importantes

- **Email institucional**: Siempre usar el email de la UTN para mantener consistencia académica
- **Configuración global**: La configuración `--global` aplica a todos los repositorios en la computadora
- **Privacidad**: Esta configuración es necesaria para que GitHub pueda asociar correctamente los commits con la cuenta del estudiante
- **Una sola vez**: Esta configuración solo necesita hacerse una vez por computadora

## Problemas relacionados que esto resuelve

- Errores de "Please tell me who you are" al hacer commits
- Commits que aparecen como "unknown author"
- Problemas de autenticación al hacer push
- Commits que no se asocian correctamente con la cuenta de GitHub

---

# Problema: Conectividad de red insuficiente

## Descripción del problema

Los estudiantes pueden experimentar dificultades al crear, aceptar o trabajar con asignaciones de GitHub Classroom debido a problemas de conectividad de red. Esto es especialmente común cuando se utiliza la red WiFi de la facultad durante horarios de alta demanda.

## Causa del problema

Este problema surge por:
- **Sobrecarga de la red institucional**: El internet de la facultad es compartido por muchos usuarios simultáneamente
- **Ancho de banda limitado**: Durante clases o exámenes, la demanda de internet aumenta significativamente
- **Restricciones de red**: Algunas redes institucionales pueden tener limitaciones para ciertos servicios web
- **Latencia alta**: La conexión lenta puede causar timeouts al interactuar con GitHub

## Solución

Para resolver este problema, se recomienda utilizar una conexión de internet alternativa más estable:

### Opción recomendada: Datos móviles

1. **Activar hotspot en el celular**
   - Ir a Configuraciones del teléfono
   - Buscar "Hotspot" o "Punto de acceso"
   - Activar el hotspot WiFi
   - Configurar nombre y contraseña de la red

2. **Conectar la computadora al hotspot**
   - En la computadora, buscar redes WiFi disponibles
   - Seleccionar el hotspot del celular
   - Ingresar la contraseña configurada

3. **Verificar la conexión**
   - Abrir un navegador web
   - Navegar a [github.com](https://github.com) para verificar conectividad
   - Probar la velocidad de carga de páginas

### Alternativas adicionales

**Cambiar de ubicación en la facultad:**
- Buscar áreas con menor densidad de usuarios conectados
- Probar en diferentes pisos o aulas
- Utilizar laboratorios con conexión cableada si están disponibles

**Horarios alternativos:**
- Trabajar en horarios de menor demanda (temprano en la mañana o tarde)
- Evitar horarios pico de clases

**Conexión cableada:**
- Si está disponible, usar cable Ethernet en lugar de WiFi
- Consultar con el personal técnico sobre puertos disponibles

## Cuándo aplicar esta solución

- **Al aceptar asignaciones**: Cuando GitHub Classroom no responde o carga lentamente
- **Durante commits y push**: Si los comandos de Git fallan por timeout
- **Al clonar repositorios**: Cuando la descarga se interrumpe o es muy lenta
- **En horarios pico**: Durante clases, exámenes o recreos

## Consideraciones importantes

- **Consumo de datos**: Monitorear el uso de datos móviles para evitar exceder el plan
- **Batería del celular**: Asegurarse de que el teléfono tenga suficiente carga
- **Calidad de señal**: Verificar que haya buena cobertura móvil en el aula
- **Compartir conexión**: Coordinar con compañeros para compartir el hotspot si es necesario

## Síntomas de problemas de conectividad

- Páginas de GitHub que cargan muy lentamente
- Errores de timeout al hacer `git push` o `git pull`
- Imposibilidad de acceder a GitHub Classroom
- Interrupciones frecuentes durante la navegación
- Mensajes de "No se puede conectar al servidor"

## Beneficios de usar datos móviles

- **Conexión dedicada**: No compartida con otros usuarios
- **Mayor estabilidad**: Menos interrupciones durante el trabajo
- **Velocidad consistente**: Rendimiento más predecible
- **Acceso completo**: Sin restricciones de red institucional

---

*Documento creado para ayudar a profesores y estudiantes a resolver problemas comunes con GitHub Classroom.*