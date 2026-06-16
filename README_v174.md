# Tribeca Aula v174

Versión centrada en pulir interfaz y corregir comodidad docente.

## Archivos incluidos

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`
- `assets/logo-tribeca-verano.png`

## Cambios

- Videoclases rediseñadas con estética tipo modo foco.
- Tarjetas superiores de Perfiles del alumnado clicables: total, con horario, pausas, apoyos y modo concentración.
- Accesos rápidos desde Perfiles del alumnado a Asistencia y Pagos.
- Registro automático más insistente de push para alumnado cuando el permiso ya está concedido.
- Modo verano más pulido, con paleta veraniega menos plana y logo de verano con fondo transparente.
- Service worker v174 para forzar recarga de estilos y logo.

## Instalación

En GitHub web sustituye:

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`
- `assets/logo-tribeca-verano.png`

No hay SQL nuevo. No hay que tocar Supabase, Edge Functions, VAPID ni Verify JWT.

Después de subirlo, haz Ctrl+F5 en PC y cierra/reabre la PWA en móvil.
