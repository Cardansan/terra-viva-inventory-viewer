# Terra Viva Playbook

Reglas operativas para trabajar este proyecto sin repetir errores de proceso, QA o publicacion.

## Regla 1. Siempre timeboxear comandos largos

Ningun comando de build, procesamiento, QA automatizado o navegador debe quedarse corriendo "sin limite".

Siempre aplicar una de estas defensas:

- pasar `timeout_ms` explicito al ejecutar comandos desde Codex,
- usar scripts con timeout interno cuando el proceso pueda colgarse,
- dividir esperas largas en chequeos cortos y repetidos en lugar de una sola espera enorme.

## Regla 2. Si un comando tarda mas de lo esperado, detener y diagnosticar

No dejar procesos "a ver si terminan".

Si un comando excede su ventana esperada:

1. detenerlo,
2. revisar logs o artefactos parciales,
3. verificar si ya hizo trabajo util,
4. relanzar con pasos mas pequenos o con mejor instrumentacion.

## Regla 3. Preferir chequeos cortos sobre una sola espera larga

Para worker polling, browser QA o publish steps:

- mejor hacer varias verificaciones de `5s` a `15s`,
- que una sola espera de varios minutos dentro de una misma llamada.

Eso reduce el riesgo de que Codex se vea "trabado" aunque el sistema si este avanzando.

## Regla 4. Antes de volver a correr, limpiar procesos auxiliares

Antes de relanzar un build, QA runner o script de publicacion:

- revisar procesos `node` o `powershell` relacionados,
- detener solo los que pertenezcan a este flujo,
- y evitar dejar helpers duplicados compitiendo entre si.

## Regla 5. El timeout es parte del criterio de calidad

Un flujo no cuenta como sano si solo funciona dejando procesos abiertos indefinidamente.

Para Terra Viva, una automatizacion aceptable debe:

- terminar,
- fallar con mensaje claro,
- o dejar evidencia parcial util dentro de un tiempo acotado.
