# Identificacion de arboles en seleccion compartida

## Problema

Hoy la vista publica calcula el numero visible del arbol segun la lista publica filtrada. Eso hace que la clienta vea una numeracion continua, por ejemplo `Arbol 03 de 23`, aunque internamente existan momentos vendidos u ocultos.

La URL compartida ya usa IDs estables de momento, por ejemplo:

```text
?selection=moment-03,moment-08
```

Ese comportamiento es correcto tecnicamente, pero puede crear confusion operativa si el mensaje de WhatsApp solo dice `#03, #08`:

- `#03` puede ser numero visible publico despues de filtrar vendidos.
- `treeNumber` puede ser otro numero interno/admin si se ocultaron piezas antes.
- `moment-03` es el identificador estable que realmente resuelve el enlace.
- Si mama compara el mensaje con el admin, puede no saber si debe buscar el numero visible, el numero interno o el ID.

## Regla propuesta

Separar claramente tres conceptos:

- **Numero publico**: numero corto que ve la clienta en el catalogo, recalculado despues de filtrar vendidos/ocultos. Sirve para lectura humana.
- **ID estable**: `TreeMoment.id`, por ejemplo `moment-08`. Sirve para enlaces, restauracion y soporte.
- **Numero admin**: `TreeMoment.treeNumber`. Sirve para ordenar/revisar internamente y puede cambiar.

## Propuesta de UX

Mantener el numero publico como texto principal para clientas:

```text
Arbol 03 de 23
```

Agregar un identificador discreto en vistas de seleccion y admin:

```text
ID: moment-08
```

En mensajes de WhatsApp de seleccion, listar ambos datos:

```text
Arboles seleccionados:
- Arbol publico #03 · ID moment-08
- Arbol publico #07 · ID moment-12

Ver seleccion:
https://...
```

En la vista `?selection=...`, mostrar cada tarjeta seleccionada con:

```text
Arbol publico #03
ID: moment-08
```

## Decision recomendada

No cambiar la URL: debe seguir usando `TreeMoment.id`.

No cambiar el numero grande del catalogo publico: debe seguir siendo continuo para clientas mayores.

Si hay que resolver confusion, agregar el ID estable como dato secundario en:

- mensaje de WhatsApp,
- panel `Seleccion del cliente/a`,
- detalle avanzado admin.

Esto evita romper enlaces existentes y mantiene la experiencia publica simple.
