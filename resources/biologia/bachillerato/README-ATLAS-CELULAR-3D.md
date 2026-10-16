# Atlas celular 3D — integración de desarrollo

## Estado
Prototipo integrado **solo en la rama de desarrollo**. No desplegar a la rama `main` ni asignar al alumnado sin revisión y autorización explícita.

## Entrada interna
`resources/biologia/bachillerato/atlas-celular-3d.html`

El modelo, sus mallas, los controles y la información se renderizan dentro de esta página de Tribeca Aula. **No hay iframe de Sketchfab, ni páginas externas incrustadas.** La biblioteca gráfica Three.js/OrbitControls sí se importa desde el CDN fijado a `0.160.1`; para prescindir de terceros también en la descarga de librerías deberá distribuirse Three.js localmente conforme a su licencia MIT.

## Registro de material (cuando se autorice)
- Materia: Biología
- Etapa: Bachillerato
- Unidad: La célula eucariota animal
- Tipo compatible: presentación
- `embed_url`: `https://aulatribeca.github.io/tribeca-aula-v0.1/resources/biologia/bachillerato/atlas-celular-3d.html`
- Registrar primero en el banco docente y revisar la asignación por clase en Tribeca Aula.

## Interacción
- Arrastrar: rotación orbital
- Pellizcar/rueda: zoom
- Tocar/clic en malla: seleccionar una estructura
- Aislar: acercamiento a la estructura
- Corte activo: clipping 3D y profundidad desplazable
- Membrana: mostrar/ocultar envoltura

## Integridad científica y limitaciones
Reconstrucción geométrica original **idealizada**, no microscopía, tomografía ni geometría de un espécimen humano real. Los colores y escalas son ilustrativos. Las secciones del núcleo y las mitocondrias incluyen geometría interna, pero no un mallado científico validado. La resolución, el rendimiento y la ejecución en iOS y Android requieren prueba manual antes del despliegue.

## Licencias
Contenido geométrico y programación del atlas: originales de Tribeca Academia. Referencia científica: OpenStax *Biology 2e*, 4.3. Dependencia Three.js: MIT, © three.js authors. No se incorporan GLB de Sketchfab sin obtener una descarga autorizada, ni se reutiliza el modelo de NIH 3D que indica licencia CC BY-NC-SA.
