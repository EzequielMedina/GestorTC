# Spec: Paginación, virtual scrolling y caché de cálculos

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 3.2 Rendimiento (SI)  
**Prioridad:** Media  
**Módulo:** Gastos / Resumen / Dashboard  

---

## 1. Objetivo

- **Paginación o virtual scrolling** en listados grandes (gastos, detalle del mes) para evitar lag con muchos ítems.
- **Caché de cálculos pesados** en dashboard y resumen por mes (por `monthKey`), invalidando cuando cambien gastos o tarjetas.
- **Lazy loading:** mantener carga diferida de rutas; revisar que gráficos y reportes no carguen todo el dataset de golpe.

---

## 2. Requisitos funcionales

### 2.1 Paginación o virtual scrolling

- **Página de Gastos** (`/gastos`): cuando la lista de gastos supere un umbral (ej. 50 o 100 ítems), usar:
  - **Opción A:** paginación (Material: `MatPaginator`): página de N ítems (ej. 20 o 50), controles anterior/siguiente y número de página.
  - **Opción B:** virtual scrolling (CDK `ScrollingModule`): renderizar solo los ítems visibles en viewport; lista de altura fija o estimada, scroll virtual.
- **Resumen — detalle de gastos del mes:** si la lista de gastos del mes es muy larga, aplicar la misma estrategia (paginación o virtual scroll) en la tabla o listado de detalle.
- Comportamiento: orden y filtros actuales deben seguir funcionando; la paginación o el scroll virtual se aplican sobre los datos ya filtrados.

### 2.2 Caché de cálculos (dashboard y resumen)

- **Problema:** recálculos costosos al cambiar de mes o al redibujar (totales por tarjeta, total del mes, gráficos).
- **Solución:** cachear por clave `monthKey` (y por “versión” de datos si es posible):
  - Ej. en un servicio o en el componente: si ya se calculó el resumen para `2025-02` y los gastos/tarjetas no han cambiado, devolver el valor en caché.
  - Invalidar caché cuando: se agregue/edite/elimine un gasto, se edite/elimine una tarjeta, o se cambie algo que afecte presupuestos/cuotas.
- Implementación puede ser en memoria (Map) con clave `monthKey`; no es obligatorio persistir la caché en localStorage. TTL opcional (ej. 1 minuto) si se prefiere simplicidad.
- **Dashboard:** el dashboard ya muestra “mes actual”; puede cachear los resultados de `getResumenPorTarjetaDelMes$`, `getTotalDelMes$`, etc. para ese mes hasta que haya cambios.

### 2.3 Lazy loading y gráficos/reportes

- Las rutas ya usan `loadComponent` (lazy). Revisar que:
  - **Gráficos (Dashboard, Gráficos, Reportes):** no se carguen todos los gastos en memoria de golpe si el dataset es enorme; si hace falta, filtrar por rango de fechas o limitar a últimos N meses para los gráficos.
  - **Reportes personalizados:** al generar el reporte, aplicar filtros y límites antes de construir la tabla; evitar iterar sobre decenas de miles de filas si no es necesario.

---

## 3. Criterios de aceptación

- [ ] En Gastos, con más de N ítems (ej. 50), se usa paginación o virtual scrolling y la lista se mantiene fluida.
- [ ] En el detalle del mes (Resumen), listas largas no bloquean la UI (paginación o virtual scroll).
- [ ] Existe caché para cálculos de resumen por mes (dashboard/resumen) que se invalida al cambiar gastos o tarjetas.
- [ ] No se introduce regresión en orden/filtros al añadir paginación o virtual scroll.
- [ ] Gráficos y reportes no cargan datasets completos sin límite cuando hay muchos datos (revisión y, si hace falta, límite por fechas o cantidad).

---

## 4. Notas técnicas

- **Virtual scroll:** `@angular/cdk/scrolling` — `*cdkVirtualFor` y `cdk-virtual-scroll-viewport`; altura del viewport y de ítem estimada.
- **Paginación:** `MatPaginator` con `MatTableDataSource` o con array slice según página actual.
- **Caché:** en `ResumenService` o `DashboardService`; Map<monthKey, resultado>; métodos que modifican datos (GastoService, TarjetaService) pueden emitir un “invalidar caché” o el consumidor puede invalidar al detectar cambios en gastos/tarjetas (por ejemplo suscribiéndose a los observables de datos y limpiando la caché).
- **Archivos a tocar:**  
  - `src/app/pages/gastos/gastos.component.ts` y `.html` (datasource + paginator o virtual scroll)  
  - `src/app/pages/resumen/` (tabla detalle del mes)  
  - `src/app/services/resumen.service.ts` o `dashboard.service.ts` (caché)  
  - `src/app/pages/dashboard/` (consumo de datos cacheados si se expone desde servicio)  

---

## 5. Dependencias

- Angular CDK ScrollingModule y/o Material PaginatorModule. No hay dependencias externas nuevas obligatorias.
