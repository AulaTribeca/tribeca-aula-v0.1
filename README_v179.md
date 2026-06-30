# Tribeca Aula v179 · asistencia presunta en clases individuales

## Objetivo

Ajusta el cálculo de asistencia y pagos para que el alumnado con tarifa individual se considere asistente por defecto en sus clases programadas. Solo se descuenta una clase si la profesora registra expresamente una falta o una justificación.

## Cambios

- En tarifa individual, todas las clases activas del horario del mes cuentan como asistidas por defecto.
- Si se registra `Falta` o `Justificada`, esa clase deja de computar para el pago.
- En tarifa mixta, las clases individuales también se presuponen asistidas por defecto.
- Si un alumno tiene tarifa individual aunque alguna clase esté marcada como grupal en horario, se cobra igualmente por clase, como ocurre con Carla Caamaño Caamaño.
- La vista de asistencia muestra “Asistencia presunta” cuando no existe registro manual y la clase se está contando por defecto.
- El texto de ayuda de asistencia explica que solo hay que registrar incidencias cuando el alumno no asiste.

## Archivos modificados

- `supabase-auth.js`
- `service-worker.js`

## Instalación

Sustituir ambos archivos en GitHub Web y esperar el despliegue. Después hacer `Ctrl + F5` en PC y cerrar/reabrir la PWA en móvil.

No requiere SQL, Supabase, Edge Functions ni cambios en VAPID.
