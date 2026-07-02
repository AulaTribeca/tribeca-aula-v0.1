# Tribeca Aula v193 · Iker existente, horario de verano y mes desde día 1

Esta versión sustituye a la v192 si ya añadiste manualmente a Iker como usuario en Supabase.

## Qué corrige

- El SQL ya no intenta insertar valores en `auth.identities.email`, porque en tu Supabase esa columna es generada.
- No toca `auth.users` ni `auth.identities`.
- Busca el usuario existente de Iker en `profiles` o en `auth.users`.
- Crea/actualiza su perfil público de alumnado.
- Lo asigna a la misma clase de Susana Haymanot, Carla Caamaño y Carlota Trillo.
- Registra su horario de curso escolar:
  - miércoles 18:30-19:30
  - jueves 17:30-18:30
  - viernes 18:30-19:30
- Lo deja en pausa hasta el 31/08/2026.
- Mantiene la corrección de horario de verano en asistencia.
- Mantiene el cambio de criterio mensual: pagos y asistencia cambian el día 1.

## Archivos

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`
- `supabase/sql/tribeca-aula-v193-fix-iker-existente-horario-verano-mes-dia-1.sql`

## Instalación

1. No ejecutes de nuevo la v192.
2. En GitHub web, sustituye:
   - `supabase-auth.js`
   - `styles.css`
   - `service-worker.js`
3. En Supabase > SQL Editor, ejecuta:
   - `supabase/sql/tribeca-aula-v193-fix-iker-existente-horario-verano-mes-dia-1.sql`
4. Haz Ctrl + F5 en PC y cierra/reabre la PWA en móvil.

No hay que tocar VAPID, Edge Functions ni notificaciones.
