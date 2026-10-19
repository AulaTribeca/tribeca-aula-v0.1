# Auditoría Playwright de Tribeca Aula

**Estado:** infraestructura de pruebas en la rama `audit/playwright-readonly-2026-10-19`.
**La web publicada y Supabase no se modifican al crear esta rama.**

## Seguridad primero

Este repositorio de GitHub es **PÚBLICO**. Por tanto:
- Nunca incluyas contraseñas, tokens, correos privados ni archivos de sesión en commits.
- No uses cuentas reales del alumnado como cuentas de prueba si puedes crear cuentas separadas.
- Las pruebas autenticadas no guardan capturas, vídeos, trazas, descargas ni estados de sesión.
- Los informes y logs de GitHub Actions pueden ser públicos. Los tests no imprimen datos personales.
- Las pruebas solo activan navegación/lectura; **iniciar sesión sí puede registrar un evento
  de acceso y actividad técnica en el servidor**, incluso si no se guarda información académica.
- Nunca concedas claves de servicio de Supabase ni permiso de administrador de GitHub a las
  cuentas de prueba.

## Cuentas de prueba

Crea, de la manera habitual y autorizada en Tribeca Aula, dos **cuentas de prueba**:

1. Alumno: rol estudiante, al menos una clase asignada, una materia visible y una
   publicación de prueba. No utilizar una cuenta real de un menor.
2. Profesora: rol docente de pruebas, **sin compartir la contraseña de tu cuenta personal**.
   Si la plataforma no permite una cuenta docente independiente, detente y avisa: no
   copies ni reutilices credenciales de producción para probar sin revisar el alcance.

Configura estos **cuatro secretos** en:
`GitHub > AulaTribeca/tribeca-aula-v0.1 > Settings > Secrets and variables > Actions > New repository secret`.

| Nombre exacto del secreto | Contenido |
|---|---|
| `TRIBECA_AUDIT_STUDENT_USER` | Usuario de la cuenta de prueba de alumno |
| `TRIBECA_AUDIT_STUDENT_PASSWORD` | Contraseña de esa cuenta |
| `TRIBECA_AUDIT_TEACHER_USER` | Usuario de la cuenta de prueba de profesora |
| `TRIBECA_AUDIT_TEACHER_PASSWORD` | Contraseña de esa cuenta |

**No compartas los valores por chat ni en un archivo del repositorio.**

## Ejecución

La rama de auditoría prueba automáticamente la carga pública con cada cambio en sus
archivos, sin usar secretos. Requiere que las Actions estén habilitadas.

El botón **Run workflow** de `workflow_dispatch` en GitHub normalmente solo estará
disponible una vez que el flujo se haya incorporado explícitamente a `main`.
Por tanto, **no fusiones la rama sin revisar los cambios**. Cuando se apruebe:
1. Abre la pestaña **Actions**.
2. Selecciona **Tribeca Aula - pruebas de solo lectura**.
3. Pulsa **Run workflow**, elige la rama **main**.
4. Elige `publico` para smoke tests o `completo` para las cuentas de prueba.
5. Revisa si han fallado las comprobaciones; los fallos no actualizan la web.

**Protección:** el trabajo de perfiles solo puede ejecutarse con el evento manual
`workflow_dispatch` en `main`. Nunca recibe secretos por una ejecución `push`
en una rama de auditoría.

## Cobertura inicial

- HTTP y estructura de portada; versión de interfaz.
- Hojas de estilo; formulario de acceso.
- Navegación por teclado y desbordamiento horizontal en escritorio y teléfono.
- Alumno: acceso, clase, materia, desplegable de publicación; sin marcar como realizado.
- Profesora: acceso, herramientas y clases; sin gestionar pagos ni perfiles.
- Emulación de Chrome escritorio, Chrome móvil y WebKit iPad para perfiles.
- Sin vídeo, capturas, trazas, HAR, informes HTML ni estados de autenticación.

No se debe interpretar un resultado «verde» como certificación de seguridad, de
integridad del sistema de pagos, ni de compatibilidad real en todos los dispositivos.
Las comprobaciones de permisos Supabase RLS y RPC deben realizarse por separado.

## Ejecución local (sin subir credenciales)

```sh
npm install --no-audit --no-fund --ignore-scripts
npx playwright install chromium webkit
npx playwright test tests/public-smoke.spec.mjs --project=desktop-chromium
```

Para pruebas autenticadas, define las cuatro variables de entorno de forma privada
fuera del repositorio y ejecuta `npm run test:audit:roles`.

## Limitaciones de esta versión

- Playwright puede comprobar pantallas en motores de navegador simulados, no sustituye
  pruebas físicas de PWA, iPhone, iPad, Android ni accesibilidad con tecnología asistiva.
- El `service worker` está desactivado únicamente para pruebas de diseño deterministas.
  Su instalación y modo sin conexión requieren una batería específica y aislada.
- No hay cuenta de prueba configurada todavía: los tests de perfiles no pueden ejecutarse
  de forma significativa hasta que existan los cuatro secretos.
- La ejecución CI instala la dependencia directa Playwright con versión fijada;
  el archivo de bloqueo del árbol de dependencias está pendiente de generarse
  y validarse desde un entorno con acceso al registro de npm.
