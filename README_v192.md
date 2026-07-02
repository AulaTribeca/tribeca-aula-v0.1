# Tribeca Aula v192 · mes desde día 1 y pagos retrasados

Esta versión sustituye a la v191. No instales la v191 por separado: instala directamente la v192.

## Incluye

- Corrección de horario de verano en asistencia.
- Fix de alta de Iker Eiroa Ribeira.
- Cambio de criterio mensual: pagos, asistencia y vistas mensuales cambian el día 1 de cada mes.
- Los pagos no registrados se consideran retrasados desde el día 1 del mes correspondiente.

## Archivos

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`
- `supabase/sql/tribeca-aula-v192-fix-iker-horario-verano-mes-dia-1.sql`

## Instalación

1. En GitHub web, sustituye:
   - `supabase-auth.js`
   - `styles.css`
   - `service-worker.js`

2. En Supabase > SQL Editor, ejecuta:
   - `supabase/sql/tribeca-aula-v192-fix-iker-horario-verano-mes-dia-1.sql`

3. Haz Ctrl + F5 en PC y cierra/reabre la PWA en móvil.

No hay que tocar VAPID, Edge Functions ni notificaciones.
