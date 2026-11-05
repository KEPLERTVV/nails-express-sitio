# DER de Nails Express: 13 tablas

Actualización del 5 de noviembre de 2026. Modelo relacional propuesto a partir del código revisado. La conexión a la base de datos forma parte de esta entrega: debe quedar implementada y probada a más tardar en la semana 11. La semana 12 se dedica exclusivamente a la exposición del proyecto terminado y funcionando. Esta documentación no acredita por sí sola una conexión implementada.

## Referencias y entregables

- Base documental: `C:\Users\Medel\Downloads\Unidad2_RA_BD.pdf`, 11 tablas.
- Base de código revisada: rama `pendiente-semana-10`, commit `890067a61b8faaec575a9a28c06ab76f46607590`.
- Flujo y persistencia: `nails-express/js/sesion.js`, funciones `disponibilidadCompleta`, `solicitarCierreDisponibilidad` y `resolverSolicitudDisponibilidad`.
- PDF actualizado: [DER de 13 tablas](output/pdf/DER_Nails_Express_13_tablas.pdf).
- Fuente editable completa: [Mermaid](DER_Nails_Express_13_tablas.mmd).
- Fuente estructurada: [tablas, relaciones y unicidad](esquema_der_13_tablas.json).

El PDF contiene cuatro láminas del DER y una de reglas. Las entidades marcadas como `ref.` son referencias a tablas ya mostradas; no se cuentan otra vez. En total hay **13 tablas y 18 relaciones**. El documento original permanece intacto. Estas láminas pueden reemplazar su apartado 3; su introducción y el apartado 2 deben indicar 13 tablas, y su diccionario debe incorporar las dos entradas siguientes.

## 12. Solicitudes_disponibilidad

Representa la petición de una empleada para cerrar horarios de una fecha. Una selección que abarca varios días produce una solicitud por cada día, igual que el prototipo. Puede haber varias solicitudes para una misma empleada y fecha, siempre que sus bloques cumplan las reglas de no superposición.

| Campo | Tipo propuesto | Restricciones y función |
|---|---|---|
| Id_solicitud_disponibilidad | INT | PK, NOT NULL, AUTO_INCREMENT. Identidad de la solicitud. |
| Empleada_id_solicitud | INT | FK, NOT NULL → Empleadas.Id_empleada. Empleada que solicita. |
| Fecha_cierre_solicitud | DATE | NOT NULL. Día local que se solicita cerrar; no es la fecha de envío. |
| Estado_solicitud | VARCHAR(20) | NOT NULL, DEFAULT 'pendiente'. Solo pendiente, aceptada o rechazada. |
| Fecha_creacion_solicitud | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP. Instante de envío. |
| Usuario_resuelve_id_solicitud | INT | FK, NULL permitido → Usuarios.Id_usuario. Debe tener rol administradora al resolver. |
| Fecha_resolucion_solicitud | DATETIME | NULL permitido. Instante de la decisión. |

**Comentario del proceso:** primero se guarda la petición, sin cerrar la agenda. Al decidir la administradora, se cambia el estado y se registran su identidad y el momento de resolución. Los dos campos de resolución son NULL mientras el estado sea pendiente y obligatorios cuando sea aceptada o rechazada. La decisión abarca todos los horarios de esa solicitud. No hay aprobación parcial ni un estado independiente en cada detalle.

## 13. Detalle_solicitud_disponibilidad

Normaliza el arreglo `horas[]` del prototipo: cada horario solicitado ocupa una fila y referencia el catálogo Horarios.

| Campo | Tipo propuesto | Restricciones y función |
|---|---|---|
| Id_detalle_solicitud | INT | PK, NOT NULL, AUTO_INCREMENT. Identidad del detalle. |
| Solicitud_id_detalle | INT | FK, NOT NULL → Solicitudes_disponibilidad.Id_solicitud_disponibilidad. |
| Horario_id_detalle | INT | FK, NOT NULL → Horarios.Id_horario. |

Restricción compuesta: `UNIQUE (Solicitud_id_detalle, Horario_id_detalle)`.

**Comentario del proceso:** una solicitud debe tener al menos un detalle. La cabecera y sus detalles se guardarán juntos al integrar SQL, evitando cabeceras vacías. La fecha y la empleada se consultan en la cabecera; no se repiten en el detalle. La unicidad indicada evita duplicados dentro de una solicitud, pero las solicitudes pendientes superpuestas requieren además validación entre ambas tablas.

## Relaciones nuevas

| Relación | Cardinalidad y lectura |
|---|---|
| Empleadas → Solicitudes_disponibilidad | 1 a 0..N. Cada solicitud tiene exactamente una empleada. |
| Usuarios → Solicitudes_disponibilidad | 0..1 a 0..N. Cada solicitud puede no tener todavía una persona que la resolvió; un usuario administrador puede resolver muchas. |
| Solicitudes_disponibilidad → Detalle_solicitud_disponibilidad | 1 a 1..N. Cada detalle pertenece a una solicitud; una solicitud completa tiene uno o más detalles. |
| Horarios → Detalle_solicitud_disponibilidad | 1 a 0..N. Cada detalle señala un horario del catálogo. |

No se crea una tabla de administradoras: el responsable de resolver referencia Usuarios y se valida su rol. Una FK por sí sola no impone permisos ni asegura el rol.

## Cómo conviven con Disponibilidad_empleada

Se conserva la tabla original para las excepciones previas. Para mantener el comportamiento observado en `disponibilidadCompleta()`, los cierres efectivos se calculan con la **unión sin duplicados** de:

1. Excepciones de Disponibilidad_empleada cuyo estado sea cerrado.
2. Detalles de Solicitudes_disponibilidad cuyo estado sea aceptada.

La comparación se realiza por **empleada, fecha y horario**. No se copian las solicitudes aceptadas a Disponibilidad_empleada; por eso no se añade una FK directa entre esas tablas. Esta decisión evita dos registros editables que puedan contradecirse. Un registro antiguo con estado disponible no revierte una solicitud aceptada. Una solicitud pendiente impide volver a solicitar sus mismos bloques, pero no cierra la agenda para reservar; al aceptarla debe comprobarse de nuevo la situación de las citas.

**Comentario del proceso:** aceptar exige volver a validar fechas futuras, empleada activa, horario de sucursal, cierres, citas asignadas durante toda su duración y capacidad para citas sin preferencia. Al integrar SQL, esta comprobación y la decisión deben coordinarse con las reservas concurrentes. No se atribuye retrospectivamente una aprobación a los cierres antiguos: su procedencia debe conservarse.

## Retoques de las once tablas originales

1. Sucursales tiene una relación 1 a 0..N con Empleadas.
2. Se utiliza Id_empleada de forma uniforme.
3. Citas muestra Color_id_cita, opcional, y su relación con Colores.
4. Servicios incluye una sola vez Requiere_especialista_servicio.
5. Horarios conserva Activo_horario; añadirlo al diccionario: BOOLEAN, NOT NULL, DEFAULT 1.
6. Se conservan las restricciones y valores del diccionario original salvo las aclaraciones expresas sobre el nuevo flujo. El JSON y Mermaid describen atributos y relaciones; no sustituyen todo el diccionario ni son un script de migración.

Antes de migrar Citas se debe revisar por separado la representación de `reprogramaciones`, `canceladaPor` y `asignadaAlAtender`, que existen en el prototipo y no en sus 16 campos originales. Esta ampliación se concentra en las solicitudes, pero esa revisión es un pendiente de integración que debe resolverse a más tardar en la semana 11; no se pospone a Integradora 2. Igualmente, los identificadores textuales de solicitudes del navegador deberán mapearse a las PK propuestas; los identificadores de Usuarios y Empleadas no deben suponerse iguales. Las fechas de operación son locales y los instantes de creación/resolución requieren una convención temporal consistente al integrar SQL.

## Alcance acordado

- Semana 10 (trabajo actual): integrar la conexión a la base de datos, ajustar el modelo y continuar la corrección de pendientes del flujo.
- Semana 11: terminar la integración y las correcciones; probar el flujo completo con persistencia real; actualizar la documentación y cerrar la versión funcional.
- Semana 12: exclusivamente exposición del proyecto acabado y funcionando. No se programan integración, correcciones ni pruebas de cierre para esta semana.
- Fecha de exposición indicada: 26 de noviembre. La numeración de semanas corresponde a la planeación del proyecto; no se asignan aquí nuevos intervalos de fechas.

**Criterio de cierre de la semana 11:** la página utiliza la base de datos para el alcance acordado; los datos se conservan y se consultan de nuevo; los permisos y las validaciones se ejecutan en el servidor; y el flujo de citas y solicitudes de cierre funciona entre los perfiles de clienta, empleada y administradora. Las pruebas deben comprobar también la recuperación de los datos desde otra sesión o navegador, para distinguir la persistencia real del almacenamiento local. La interfaz se comunica con la base de datos mediante un backend/API; las credenciales de la base de datos no se incluyen en el JavaScript público.

Retirar solicitudes, reabrir horarios, motivos y respuestas, aprobación parcial y filtros quedan fuera de esta entrega y se consideran para Integradora 2. El campo opcional Motivo_disponibilidad proviene del modelo original y no añade una interfaz nueva.

## Regeneración

Con Python y `reportlab` instalado:

```powershell
python docs/modelado/generar_der.py
```

El generador comprueba que existan exactamente 13 tablas, 18 relaciones, una PK por tabla y una relación por cada FK, con tipos y nulabilidad coherentes. Después produce el PDF, Mermaid y JSON desde la misma definición. No cambia archivos de la aplicación, no ejecuta SQL y no realiza commits.
