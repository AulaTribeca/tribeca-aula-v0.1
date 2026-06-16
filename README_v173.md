# Tribeca Aula v173

Incluye:

- Registro automático de dispositivos push cuando el alumnado ya ha concedido permiso de notificaciones.
- Botón claro de **Nuevo anuncio** en el apartado Anuncios.
- Anuncios rediseñados con estética cercana al modo foco.
- Publicaciones y anuncios programables mediante la opción **Programar esta publicación**.
- Nuevo apartado **Videoclases** para programar enlaces de Google Meet, fuera de las materias.
- Panel de próximas videoclases en la pantalla principal del alumnado y de la profesora.
- Notificación push al alumnado cuando la profesora programa una videoclase visible para ellos.
- Modo verano visual: logo de verano, paleta veraniega y detalle de coco, hibisco y ola junto al saludo.

## GitHub web

Sustituye:

```text
supabase-auth.js
styles.css
service-worker.js
```

## Supabase

Ejecuta una vez:

```text
supabase/sql/tribeca-aula-v173-anuncios-programables-videoclases.sql
```

No hay que tocar VAPID ni Edge Functions.

## Importante sobre publicaciones programadas

La publicación programada queda oculta al alumnado hasta la fecha y hora elegidas. Si la profesora tiene la app abierta cuando una publicación programada vence, Tribeca Aula intenta enviar la notificación de la app en ese momento. Sin una tarea programada de Supabase, el envío exacto en segundo plano no puede garantizarse si nadie abre el aula en ese instante.
