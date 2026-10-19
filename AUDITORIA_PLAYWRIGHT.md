# Auditoría Playwright de Tribeca Aula

**Estado:** infraestructura de pruebas en la rama `audit/playwright-readonly-2026-10-19`.
**La rama no modifica la web publicada.** Se han creado dos cuentas QA en Supabase Auth y se ha asignado a una el rol docente autorizado; no se han alterado las cuentas de los alumnos.

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

## Cuentas de prueba: alta segura y separación de permisos

**Es obligatorio crear primero los usuarios en Supabase Auth.** No crear una
entrada anticipada con rol docente en `public.user_directory_seed`: Tribeca
tiene un trigger que puede confirmar automáticamente los correos presembrados,
lo que podría permitir un registro indebido si se habilitan los registros.

### Cuentas creadas y verificadas (19/10/2026)

Los dos usuarios QA están confirmados, vinculados a perfiles activos y marcados claramente como pruebas. El perfil de alumna/o mantiene `student`; el perfil `tribeca_qa_docente` ya tiene `teacher` tras verificar exactamente el ID y correo de Auth. No tienen horarios, pagos ni matrículas.

### Alta segura en Supabase Auth (ya realizada)

En `https://supabase.com/dashboard/project/fuhkvjyfwkggjaqxfsgv/auth/users`:

1. **Authentication > Users > Add user > Create new user**.
2. Alumno: correo `tribeca_qa_alumno@tribecaaula.test`.
3. Profesora: correo `tribeca_qa_docente@tribecaaula.test`.
4. Elige **dos contraseñas diferentes, largas y aleatorias**. Guárdalas
   en un gestor de contraseñas; nunca en chat, tickets ni commits.
5. Marca **Auto Confirm User** / **Confirmar usuario** si aparece,
   pues los dominios `.test` no reciben correo real.
6. Crea ambos usuarios y comprueba que aparecen en Authentication > Users.

Las cuentas nuevas reciben inicialmente rol `student` por el trigger
`handle_new_auth_user`, y los identificadores derivados del correo son
`tribeca_qa_alumno` y `tribeca_qa_docente`. **No convertir en profesora**
hasta verificar que la identidad de Auth corresponde exactamente al correo
establecido y que no existía previamente.

### Paso que realiza la auditoría después

- Consultar `auth.users` y `public.profiles` sin exponer hashes,
  correos privados, tokens ni contraseñas.
- Asignar `teacher` solo al perfil QA autorizado después de verificar el ID.
- Mantener el perfil QA de alumno como `student`.
- La clase, materia, unidad y recursos QA se inyectan **solo en la memoria del
  navegador** mediante `tests/fixtures/browser-classroom.mjs`. No existen en
  Supabase ni aparecen en el panel docente real. Para las pruebas públicas se
  simula el perfil del alumno sin iniciar sesión ni obtener ningún token.
- Comprobar inicio de sesión de ambas cuentas y que se muestran sus roles.
- No utilizar las credenciales de la profesora real ni del alumnado.

**Aviso:** un rol `teacher` en el proyecto de producción puede acceder
a información real y potencialmente modificarla. Las pruebas de
Playwright son de lectura, pero la cuenta requiere protección adicional.
Más adelante conviene ejecutar los tests en un entorno de staging
separado de la base de datos real.

### Guardar secretos para Playwright

En `GitHub > Settings > Secrets and variables > Actions > New repository secret`,
introduce cada valor **directamente desde tu gestor de contraseñas**.

| Nombre exacto | Contenido |
|---|---|
| `TRIBECA_AUDIT_STUDENT_USER` | `tribeca_qa_alumno` |
| `TRIBECA_AUDIT_STUDENT_PASSWORD` | Contraseña de alumno QA |
| `TRIBECA_AUDIT_TEACHER_USER` | `tribeca_qa_docente` |
| `TRIBECA_AUDIT_TEACHER_PASSWORD` | Contraseña de profesora QA |

No compartas los valores de las contraseñas por esta conversación.

## Ejecución

Las ramas de auditoría ejecutan las pruebas públicas y las clases ficticias
con cada cambio. En `main`, tras cada actualización, las pruebas públicas se
repiten **sin secretos** y la prueba sintética espera que GitHub Pages haya
propagado `resource-progress.js?v=256` antes de comprobar el visor. Requiere
que GitHub Actions esté habilitado.

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
- Alumno: acceso, navegación y verificación de que **no tiene rol docente**.
- Aula, materia, unidad, publicaciones y un HTML embebido: comprobación en un
  estado de navegador completamente ficticio. Las cuentas QA autenticadas se emplean **solo para comprobar acceso y rol**.
  Nunca se inyectan recursos en sus sesiones ni se prueba el guardado de progreso.
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

- La vista previa del arreglo de `resource-progress.js` solo se activa con
  `TRIBECA_AUDIT_PREVIEW_FIX=1` en la rama de pruebas. Una ejecución en `main`
  usará el archivo real publicado, sin interceptarlo. Consulta
  `AUDITORIA_AULA_AISLADA.md` para el origen y los resultados del defecto.
- Playwright puede comprobar pantallas en motores de navegador simulados, no sustituye
  pruebas físicas de PWA, iPhone, iPad, Android ni accesibilidad con tecnología asistiva.
- El `service worker` está desactivado únicamente para pruebas de diseño deterministas.
  Su instalación y modo sin conexión requieren una batería específica y aislada.
- Las cuentas QA de Supabase Auth **ya existen**, pero los tests autenticados
  no podrán ejecutarse en GitHub Actions hasta que se creen los cuatro secretos
  del repositorio y se apruebe la fusión del flujo a `main`.
- La ejecución CI instala la dependencia directa Playwright con versión fijada;
  el archivo de bloqueo del árbol de dependencias está pendiente de generarse
  y validarse desde un entorno con acceso al registro de npm.
