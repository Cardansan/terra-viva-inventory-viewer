# Roadmap

## Direccion general

La direccion del proyecto sigue siendo:

- operar sin backend pagado mientras sea razonable,
- mantener GitHub Pages + Google Drive + laptop como stack base,
- reducir friccion operativa para mama,
- mejorar la calidad del borrador antes de pensar en IA compleja,
- posponer app movil o backend real hasta que la operacion lo exija.

## Prioridades actuales

### 1. Cerrar Fase A correctamente

- validar el flujo completo de dia a dia con menos asistencia,
- revisar errores y feedback desde celular,
- confirmar que la laptop worker sea estable para uso rutinario.

### 2. Mejorar calidad del borrador

- medir cobertura con mas videos reales,
- ajustar parametros de muestreo/dedupe,
- reducir repeticiones y omisiones,
- decidir despues si conviene deteccion por estabilidad.

### 3. Endurecer la operacion local

- arranque y reinicio simples del worker,
- logs claros,
- runbook corto y confiable,
- menos dependencia de pasos tecnicos.

### 4. Mantener el admin simple

- lenguaje no tecnico para mama,
- soporte escondido y secundario,
- flujo principal centrado en subir, procesar, revisar y publicar.

## Fase A

Objetivo:

```text
Videos del dia
-> Inbox de Drive
-> borrador procesado por laptop
-> revision online
-> publicacion final
-> catalogo estatico en GitHub Pages
```

Ya resuelto:

- rutas separadas para borrador/publicado,
- worker local por ordenes,
- carga web al Inbox,
- OAuth just-in-time desde los botones principales,
- pipeline local con thumbnails reales,
- publicacion estatica.

Pendiente para declararla cerrada:

- QA completo de operacion cotidiana,
- mejor cobertura del borrador,
- flujo de laptop mas robusto.

## Fase B

Objetivo: hacer la laptop de mama mas facil de operar.

Posibles entregables:

- lanzador claro,
- instalacion minima,
- logs legibles,
- menos necesidad de Codex o terminal.

Todavia no implica cambiar de arquitectura base.

## Fase C

Objetivo: automatizacion mas profunda solo si de verdad duele operar la Fase A/B.

Esto podria incluir:

- mejor renovacion de credenciales del lado confiable,
- worker mas autonomo,
- mejor coordinacion de estados,
- eventual backend liviano o servicio dedicado.

No es prioridad actual.

## Fase futura opcional

Solo si el negocio crece y el modelo actual duele:

- backend pagado,
- multiusuario real,
- automatizacion de reservas,
- app movil dedicada.

Eso queda fuera del plan base por ahora.
