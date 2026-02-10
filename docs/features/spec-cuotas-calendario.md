# Spec: Recordatorio el día del vencimiento y eventos personalizados en calendario

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 1.7 Cuotas y calendario (SI)  
**Prioridad:** Alta  
**Módulo:** Cuotas / Calendario financiero / Alertas  

---

## 1. Objetivo

- **Recordatorio el día del vencimiento:** notificación el mismo día (o configurable) para vencimientos de tarjetas y cuotas, además del aviso previo que ya existe en el banner.
- **Eventos personalizados editables:** en el calendario financiero, permitir crear, editar y borrar eventos propios (ej. “Pagar alquiler”, “Transferencia”) que no provengan de tarjetas, cuotas, préstamos ni servicios.

---

## 2. Requisitos funcionales

### 2.1 Recordatorio el día del vencimiento

- **Alcance:** vencimientos de **tarjetas** (fecha de vencimiento del pago) y **cuotas** (fecha de vencimiento de la cuota).
- **Comportamiento:**
  - El mismo día en que vence un pago de tarjeta o una cuota, mostrar una notificación (in-app y/o push si está implementado):
    - Ej. “Hoy vence el pago de [Tarjeta X]” / “Hoy vence la cuota de [Descripción]”.
  - Configuración opcional: “Recordar el día del vencimiento” activado por defecto; opción de “Recordar también 1 día antes” (puede solaparse con el banner existente, no hay problema).
- No duplicar lógica: reutilizar la que ya genera eventos en `CalendarioFinancieroService` y `AlertService`; añadir regla “es hoy” para disparar el recordatorio del día.

### 2.2 Eventos personalizados en el calendario

- **Modelo:** evento personalizado con: id, título, fecha (día), monto opcional, notas opcionales, color/icono opcional. Persistencia en localStorage (ej. clave `gestor_tc_eventos_personalizados`).
- **CRUD:**
  - **Crear:** desde el calendario (ej. clic en un día o botón “Nuevo evento”) abrir diálogo con: título, fecha, monto (opcional), notas.
  - **Editar:** desde el calendario, clic en el evento personalizado → editar título, fecha, monto, notas.
  - **Borrar:** opción en el mismo diálogo o menú contextual.
- **Visualización:** en la vista mensual del calendario, mostrar los eventos personalizados junto con los automáticos (tarjetas, cuotas, préstamos, servicios), con estilo diferenciado (color o icono).
- **Integración:** el servicio `CalendarioFinancieroService` debe incluir estos eventos al generar la lista de eventos del mes/día. Los eventos personalizados no generan alertas de “próximo vencimiento” salvo que se defina una regla (opcional: “recordar 1 día antes” para eventos personalizados).

---

## 3. Criterios de aceptación

- [ ] El día del vencimiento de una tarjeta o cuota se muestra una notificación in-app (y opcionalmente push) con mensaje claro.
- [ ] Existe configuración para activar/desactivar “Recordar el día del vencimiento”.
- [ ] En el calendario financiero se pueden crear, editar y eliminar eventos personalizados.
- [ ] Los eventos personalizados se ven en la vista mensual del calendario diferenciados del resto.
- [ ] Los eventos personalizados persisten tras recargar y se incluyen en backup/restauración.

---

## 4. Notas técnicas

- **Recordatorio día vencimiento:** extender `AlertService` o el flujo que alimenta el banner; añadir condición “fecha === hoy” y disparar notificación (NotificationService o similar). Si hay PWA con Push, reutilizar el mismo canal.
- **Eventos personalizados:** nuevo modelo `EventoPersonalizado` (o extender `EventoFinanciero` con tipo `EVENTO_PERSONALIZADO` y origen “usuario”). Nuevo servicio `EventosPersonalizadosService` (CRUD, localStorage). `CalendarioFinancieroService.getEventosDelMes()` (o equivalente) debe fusionar eventos automáticos + eventos personalizados.
- **Backup:** incluir lista de eventos personalizados en `BackupService` y restaurarlos en restauración.
- **Archivos a tocar:**  
  - `src/app/services/alert.service.ts` (o donde se generen notificaciones del día)  
  - `src/app/models/evento-financiero.model.ts` o nuevo `evento-personalizado.model.ts`  
  - `src/app/services/calendario-financiero.service.ts`  
  - Nuevo `eventos-personalizados.service.ts`  
  - `src/app/pages/calendario-financiero/` (vista + diálogo crear/editar evento)  
  - `src/app/services/backup.service.ts`  

---

## 5. Dependencias

- Ninguna externa. Backup/restauración ya implementados; solo añadir la entidad “eventos personalizados”.
