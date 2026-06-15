# Tribeca Aula v172 · IUS completo para Carla Caamaño

Este paquete contiene todo lo necesario para poner en marcha la materia privada:

**⚖️ IUS: iniciación al Derecho y latinismos jurídicos**

No es solo un paquete de assets. Incluye:

- archivos web modificados para que Tribeca Aula reconozca y visualice el nuevo tipo de publicación **Presentación**;
- assets y presentaciones HTML embebibles;
- SQL final corregido para crear la clase privada, asignar únicamente a Carla Caamaño, crear materia, unidades y publicaciones iniciales;
- copia textual de materiales iniciales como respaldo.

## Estructura del paquete

```text
supabase-auth.js
styles.css
service-worker.js
assets/
└── ius/
    ├── README_IUS_ASSETS.md
    └── presentations/
        ├── ius-01-bienvenida.html
        ├── ius-02-de-facto-de-iure.html
        └── ius-03-fuentes-derecho.html
supabase/
└── sql/
    └── tribeca-aula-v172-ius-completo.sql
contenido-publicaciones/
README_v172_IUS_COMPLETO.md
```

## Paso 1 · GitHub web: subir archivos modificados

En el repositorio de Tribeca Aula, sustituye estos archivos por los del ZIP:

```text
supabase-auth.js
styles.css
service-worker.js
```

Después sube la carpeta:

```text
assets/ius/presentations/
```

Debe quedar exactamente así:

```text
assets/ius/presentations/ius-01-bienvenida.html
assets/ius/presentations/ius-02-de-facto-de-iure.html
assets/ius/presentations/ius-03-fuentes-derecho.html
```

No cambies `presentations` por `presentaciones`, porque el SQL apunta a la ruta inglesa `assets/ius/presentations/`.

## Paso 2 · Cómo crear manualmente assets/ius/presentations en GitHub web

GitHub no crea carpetas vacías, por eso hay que crear un archivo dentro.

### Crear `assets/ius`

1. Entra en el repositorio de Tribeca Aula.
2. Pulsa **Add file > Create new file**.
3. En el nombre del archivo escribe:

```text
assets/ius/README_IUS_ASSETS.md
```

4. Pega un texto breve, por ejemplo:

```text
Assets de IUS.
```

5. Pulsa **Commit changes**.

### Crear `assets/ius/presentations`

1. Entra en `assets/ius`.
2. Pulsa **Add file > Create new file**.
3. En el nombre del archivo escribe:

```text
presentations/ius-01-bienvenida.html
```

4. Abre el archivo del ZIP `assets/ius/presentations/ius-01-bienvenida.html`, copia todo su contenido y pégalo en GitHub.
5. Pulsa **Commit changes**.
6. Repite con:

```text
presentations/ius-02-de-facto-de-iure.html
presentations/ius-03-fuentes-derecho.html
```

## Paso 3 · Supabase: ejecutar SQL final

En Supabase:

```text
SQL Editor > New query
```

Pega y ejecuta:

```text
supabase/sql/tribeca-aula-v172-ius-completo.sql
```

Este es el SQL correcto y sustituye a los intentos anteriores v169 y v170. No ejecutes ya los SQL antiguos.

El SQL hace lo siguiente:

- crea o actualiza la clase privada IUS;
- localiza a Carla Caamaño en `profiles`;
- asigna la clase únicamente a Carla;
- crea la materia IUS;
- crea las unidades iniciales;
- crea publicaciones de tipo apuntes, presentación, simulacro, esquema y tarea;
- permite el nuevo tipo `presentacion` en `subject_materials.material_type`;
- respeta que `subject_materials.badge_codes` sea `text[]`.

## Paso 4 · Comprobación

Cuando GitHub Pages termine de publicar, abre una de estas rutas cambiando la parte inicial por tu web real:

```text
https://TU_WEB/assets/ius/presentations/ius-01-bienvenida.html
```

Si se ve la presentación, los assets están correctamente subidos.

Después entra en Tribeca Aula como docente y comprueba:

```text
Clases > ⚖️ IUS: iniciación al Derecho y latinismos jurídicos
```

Debe verse solo con Carla asignada.

## Paso 5 · Qué NO hay que tocar

No hay que tocar:

- Edge Functions;
- VAPID;
- notificaciones push;
- SQL de notificaciones;
- configuración de Supabase Functions.

## Errores posibles

Si Supabase dice que no encuentra a Carla Caamaño, revisa en `profiles` cómo está escrito su nombre o usuario. El SQL busca variantes con `Carla Caamaño`, `Carla Caamano` o aproximaciones similares.

Si la publicación tipo presentación se crea pero no se visualiza, revisa que los archivos HTML estén en:

```text
assets/ius/presentations/
```

Si aparece 404 al abrir una presentación, GitHub Pages aún no desplegó o la carpeta quedó mal creada.
