# Libro de estilo de Viralia

Este documento es el contrato de producción de cada episodio. Se carga antes de escribir el guion y se valida antes de sintetizar o publicar audio.

## Propósito

Viralia es un boletín de mañana en audio: un repaso claro, ágil y natural de cuatro noticias, conversaciones o temas virales que ayudan a empezar el día. Puede recoger asuntos de ayer por la tarde o de la noche si siguen vivos al amanecer.

## Estructura obligatoria

1. **Cabecera breve.** Máximo cinco segundos de sintonía. Después, la primera locución identifica el programa: «Esto es Viralia». No puede haber una cama musical larga antes de oír una voz.
2. **Cuatro bloques.** Una noticia por bloque, tres intervenciones informativas por noticia. El primer bloque es la historia principal y recibe algo más de contexto.
3. **Música.** Cada bloque utiliza una base de distinta energía. La cama está por debajo de las voces; acompaña, no compite. Las transiciones son cortas.
4. **Salida.** Una despedida breve ya grabada. No se añade una coletilla publicitaria ni se repite la marca durante el guion.

## Guion y tono

- Entre 500 y 650 palabras de locución: objetivo de 3:30 a 4:30 minutos.
- Español de España, frases cortas y naturales, dos locutores que aportan datos y transiciones útiles.
- Es un boletín, no una conversación sobre el propio boletín: nunca hablar de fuentes, confianza, conclusiones, reglas editoriales, añadir o excluir temas.
- Cada bloque explica el hecho, el contexto disponible y por qué está en la conversación. Sin relleno como «ha abierto un debate» o «la noticia ha generado interés» si no aporta un dato concreto.
- No se incluyen apuestas, cuotas ni pronósticos; tampoco titulares cortados o especulación presentada como hecho.
- Las noticias se separan claramente: «Cambiamos de asunto» u otra transición breve y natural.

## Regla de continuidad

El proceso manual y el cron llaman al mismo generador, leen este documento y pasan las mismas validaciones. Si falla una fuente o el modelo de guion, se usa la plantilla editorial de contingencia y se continúa; nunca se publica un archivo compuesto solo por música.

## Controles antes de publicar

- Cuatro bloques, tres intervenciones por bloque y cuatro camas musicales diferentes.
- Locución detectada al comienzo y durante el episodio; no se permite una apertura musical prolongada.
- Duración dentro del rango y sin silencios largos.
- Portada individual y transcripción guardada junto al audio.
