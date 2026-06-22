# Video Capture Guidelines

Estas recomendaciones salen del primer video real de Terra Viva y buscan mejorar el borrador que se genera antes de publicar.

## Objetivo

Lograr que el proceso automatico encuentre mas arboles utiles sin requerir IA compleja todavia.

## Recomendaciones de grabacion

1. Grabar mas despacio.
   - Si el paneo va muy rapido, varios arboles solo aparecen uno o dos cuadros y el borrador pierde oportunidades.

2. Hacer pausas cortas y claras.
   - Idealmente detenerse entre `1` y `2` segundos frente a cada arbol o grupito.
   - Esto ayuda tanto al muestreo por tiempo actual como a la futura deteccion por estabilidad.

3. Mantener el arbol centrado antes de seguir.
   - Si el arbol entra cortado por un borde, la miniatura suele salir menos util.

4. Evitar movimientos bruscos de mano.
   - Menos vibracion significa menos blur y mejores thumbnails.

5. Cuidar la luz.
   - Luz constante y suficiente mejora mucho las miniaturas.
   - Evitar cambios fuertes de exposicion mientras se recorre la repisa.

6. Separar visualmente cuando sea posible.
   - Si varios arboles quedan pegados en una sola toma rapida, luego es mas dificil elegir el correcto.

7. Si se puede, numerar fisicamente.
   - Una tarjetita pequena con numero cerca del arbol reduciria mucha confusion para clientas y tambien ayudaria a revisar el borrador.

## Ajustes sugeridos para la siguiente prueba

Si el video vuelve a ser un recorrido continuo, probar primero con:

```json
{
  "momentStartOffsetSeconds": 4,
  "momentIntervalSeconds": 6,
  "momentEndBufferSeconds": 8,
  "minMomentsPerVideo": 8,
  "maxMomentsPerVideo": 30
}
```

## Lo que todavia no hace el sistema

- No detecta automaticamente cada arbol individual.
- No entiende todavia si el arbol esta centrado o tapado.
- No encuentra pausas reales por vision computacional; por ahora solo propone candidatos por tiempo.

Por eso, hoy la mejor manera de mejorar resultados es combinar:

- mejor estilo de grabacion,
- mas cobertura temporal en el borrador,
- y revision manual en admin antes de publicar.
