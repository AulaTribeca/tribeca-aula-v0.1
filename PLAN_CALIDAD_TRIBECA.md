# Plan de calidad · Tribeca Aula

Actualizado: 29/10/2026. Lista de trabajo recuperada de la auditoría y de los fallos comunicados. No es una certificación de conformidad ni declara completadas las tareas pendientes.

Estados: pendiente, en verificación, verificado, publicado. Cada cierre requiere evidencia de la versión correspondiente. Las pruebas usan datos ficticios; nunca se publican capturas ni registros de alumnado real.

| ID | Área / tarea | Criterio de cierre | Estado |
|---|---|---|---|
| A01 | Acceso y recuperación | Formularios alternan; foco en campo activo; fondo inerte; controles legibles | En verificación v263.1 |
| A08 | Aviso de instalación | No tapa acceso/recuperación en iOS; vuelve al entrar al final de la página | En verificación v263.1 |
| A02 | Cabecera móvil | No tapa título tras cambio de rol, tamaño o fuente | En verificación v263.1 |
| A03 | Detalle docente | Texto auxiliar ≥14px, inputs ≥16px, controles ≥44px; etiqueta de unidad; acciones uniformes; sin desbordamiento | En verificación v263.1 |
| A04 | Navegación por teclado | Orden lógico, foco visible, retorno tras cerrar modales y visores | Parcial; pendiente recorrido completo |
| A05 | Ampliación y reflujo | 200% y ancho 320px sin pérdida de controles o contenido | Pendiente |
| A06 | Contraste | Medir texto, iconos, foco y estados en pantallas principales | Pendiente |
| A07 | Movimiento y adaptación | Respetar reducción de movimiento; comprobar modo foco y preferencias | Pendiente |
| D01 | Jerarquía visual | Encabezados compactos, espaciado consistente, prioridades pedagógicas | Parcial; pendiente revisión integral |
| D02 | Idioma | Fechas y etiquetas coherentes con el idioma elegido; sin mezclas accidentales | Pendiente |
| D03 | Abrir/cerrar | Una acción clara por estado; sin etiquetas duplicadas | Corrección previa; revalidar |
| D04 | Pantalla completa | Visor útil sin panel lateral residual; retorno y foco correctos | Pendiente |
| D05 | Estados | Vacío, carga, error y textos largos legibles y accionables | Pendiente |
| F01 | Semana docente | Eventos del lunes al domingo anunciado, con cambios de mes/año/hora | En verificación v263.1 |
| F02 | Desconexión | Un recurso nunca recibe la portada; 503 válido y caché específica | En verificación v263.1 |
| F03 | Publicador HTML/ZIP | Un archivo subido abre como actividad, nunca como código; comprobar MIME/CSP antes de publicar | Pendiente prioritario: Storage devuelve HTML como texto |
| F04 | Recursos comunicados | Comprobar Europa feudal, Lengua, Galego y present simple en sus rutas reales | Parcial: tests de Lengua/Galego; faltan restantes |
| F05 | Radicales unidad 2 | Documento ejecutable, navegación, soluciones y corrección | Publicado 27/10, commit d6fa7e5; enlace del material corregido |
| F06 | Progreso didáctico | Guardar/restaurar y reintentar sin mezclar alumnos; prueba controlada | Pendiente |
| F07 | PWA instalada | Actualización desde caché antigua y uso offline en dispositivo real | Pendiente |
| S01 | Separación de roles | Alumno no ve controles/datos docentes; validar servidor y sesión real | Pendiente verificación actual |
| S02 | Mensualidades | Solo importe, estado y fecha propios; sin notas; presentación discreta | Implementado en main v263; pendiente verificación actual |
| S03 | Recursos ejecutables | Aislar sesión y DOM del aula; no ampliar permisos para resolver visualización | Pendiente revisión integral |
| Q01 | Pruebas multiplataforma | Chromium escritorio/móvil y WebKit móvil/tablet en candidato exacto | En verificación |
| Q02 | Cuentas reales | Acceso docente y alumno; recorrido de solo lectura | Pendiente sesión actual |

## Orden de ejecución

1. Cerrar el bloque ya preparado: acceso, cabecera, detalle docente, semana, desconexión y pruebas compatibles.
2. Corregir el publicador de HTML/ZIP de forma general. El arreglo de un recurso aislado no cierra F03.
3. Completar idioma, navegación, visores y estados; contrastar con capturas.
4. Reflujo, contraste, teclado, movimiento y modos de atención.
5. Roles, progreso y PWA real; registrar límites y evidencia por versión.
