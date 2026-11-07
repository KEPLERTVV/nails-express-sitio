# Nails Express — sitio de agendado

Prototipo funcional construido a partir de los wireframes y del modelado UML
de la Unidad I.

## Cómo abrirlo

1. Abre la carpeta completa en Visual Studio Code.
2. Instala la extensión **Live Server** (de Ritwick Dey).
3. Clic derecho sobre `index.html` → *Open with Live Server*.

También funciona abriendo `index.html` directo en el navegador, pero con
Live Server se recarga sola al guardar cambios.

## Estructura

```
index.html        Portada, catálogo, servicios, cotizador y sucursales
agendar.html      Flujo de agendado en tres pasos
mis-citas.html    Panel de la clienta: citas próximas e historial
mi-perfil.html    Panel de la clienta: datos personales y contraseña
panel-empleada.html  Panel de la empleada: agenda del día
disponibilidad.html  Panel de la empleada: solicitar cierres por día u horario
admin-disponibilidad.html Panel de la administradora: aprobar o rechazar cierres
panel-admin.html     Panel de la administradora: agenda de ambas sucursales
admin-ingresos.html  Panel de la administradora: ingresos y comisiones por mes
admin-catalogo.html  Panel de la administradora: precios, duraciones y tonos agotados
admin-empleadas.html Panel de la administradora: alta, edición y desactivación de empleadas
css/estilos.css   Todos los estilos, con las variables de marca arriba
js/datos.js       Datos del sistema: tonos, diseños, servicios, empleadas,
                  usuarios y citas de ejemplo
js/sesion.js      Modal de acceso, sesión y menú del usuario en la barra
js/agenda-citas.js  Validación compartida de duración, especialidades y capacidad
js/inicio.js      Comportamiento de la portada
js/agendar.js     Lógica del agendado
js/panel.js       Partes comunes de los paneles (sesión, permisos por rol)
js/reprogramar.js Ventana para mover una cita (la usan clienta y empleada)
js/panel-empleada.js  Agenda del día y métricas de la empleada
js/disponibilidad.js  Solicitudes de cierre de disponibilidad de la empleada
js/admin-disponibilidad.js Revisión de solicitudes de cierre por la administradora
js/panel-admin.js     Agenda general con filtro por sucursal y día
js/admin-ingresos.js  Reporte mensual por empleada y por sucursal
js/admin-catalogo.js  Edición del catálogo (se aplica en todo el sitio)
js/admin-empleadas.js Gestión de cuentas de empleada
js/mis-citas.js   Lista, cancelación y "volver a agendar" de citas
js/mi-perfil.js   Edición de datos y cambio de contraseña
img/logo.svg      Logotipo
```

## Relación con el modelado UML

Los arreglos de `datos.js` corresponden a las clases del diagrama:

| En el código  | Clase del diagrama |
|---------------|--------------------|
| `COLORES`     | `Color`            |
| `DISENOS`     | `Diseno`           |
| `SERVICIOS`   | `Servicio`         |
| `SUCURSALES`  | `Sucursal`         |
| cuentas de `USUARIOS` con rol `empleada` | `Empleada` (hereda de `Usuario`) |
| `HORARIOS` + cierres de disponibilidad aceptados | `Disponibilidad` |
| `USUARIOS` (campo `rol`) | `Usuario` y sus subclases |
| `CITAS` | `Cita` |
| objeto `cita` en `agendar.js` | `Cita`    |

Las funciones `calcularTotal()` y `calcularDuracion()` son los métodos del
mismo nombre que aparecen en el diagrama de clases.

## Qué ya funciona

- Catálogo con filtro por familia de color y ventana de detalle por tono.
- Cotizador que recalcula total y duración al cambiar la selección.
- Agendado en tres pasos, con validación de nombre y teléfono.
- Horarios calculados según duración del servicio y diseño, apertura, cierre,
  especialidad y bloques cerrados, tanto al agendar como al reprogramar.
- Sin preferencia comprueba capacidad para atender cada servicio completo;
  la cita sigue sin asignar hasta que se decide en el salón.
- La disponibilidad se revisa otra vez antes de guardar y se actualiza al
  volver a la pestaña o cambiar las reservas desde otra pestaña.
- Las selecciones viajan entre páginas por la URL
  (por ejemplo `agendar.html?servicio=1&diseno=2`).
- Adaptado a celular y navegable con teclado.
- Inicio de sesión y registro (las cuentas nuevas siempre son clientas).
- Panel de la clienta: sus citas (reprogramar, cancelar, volver a agendar)
  y su perfil. Reprogramar y cancelar sin costo, hasta 4 horas antes.
- Panel de la empleada: agenda del día y solicitudes de cierre de disponibilidad
  por día completo o por horarios específicos. Los cierres solo se aplican si
  la administradora los acepta; los bloques con cita no se pueden cerrar.
- Panel de la administradora: acepta o rechaza solicitudes de disponibilidad;
  al aceptar, la solicitud vuelve a comprobar que no existan citas en esos bloques.
- Folio único por cita (por ejemplo `NE-K7P3QA`): la clienta lo guarda y lo
  muestra al llegar. La empleada busca la cita por folio o teléfono y, si está
  asignada a ella, la marca como Atendida o No llegó, o la reprograma o cancela
  si la clienta llama. Las citas ajenas son solo de consulta.
  Los ingresos y comisiones solo cuentan las citas atendidas.
- Panel de la administradora (una sola cuenta, para ambas sucursales):
  agenda general, ingresos y comisiones, catálogo y precios, y empleadas.
- El personal no agenda citas ni ve las opciones de la clienta.

## Pruebas automáticas

Con Node.js 20 o posterior, desde la carpeta `nails-express-sitio`, ejecuta:

```sh
node --test tests/agenda.test.cjs
```

Cubren empalmes, cierres aceptados y rechazados, conflictos con citas,
especialidades, capacidad sin asignación, reprogramación, limpieza de horarios
y fallos de almacenamiento. Usan datos en memoria y no modifican las reservas
del navegador. Las pruebas de interfaz usan un DOM simulado; la revisión visual
en navegador se realiza por separado.

## Cuentas de prueba

| Rol            | Correo                  | Contraseña    |
|----------------|-------------------------|---------------|
| Clienta        | `mariana@correo.com`    | `clienta123`  |
| Empleada       | `ana@nailsexpress.mx`   | `empleada123` |
| Empleada       | `karla@nailsexpress.mx` | `empleada123` |
| Empleada       | `sofia@nailsexpress.mx` | `empleada123` |
| Valeria (demo) | `valeria.demo@example.com` | `empleada123` |
| Daniela (demo) | `daniela.demo@example.com` | `empleada123` |
| Camila (demo) | `camila.demo@example.com` | `empleada123` |
| Renata (demo) | `renata.demo@example.com` | `empleada123` |
| Andrea (demo) | `andrea.demo@example.com` | `empleada123` |
| Administradora | `laura@nailsexpress.mx` | `admin12345`  |

Todo lo que se cambia en el sitio se guarda en el navegador (localStorage).
Para volver a los datos originales, ejecuta `localStorage.clear()` en la consola.

## Completar empleada y tono desde la agenda

Cada empleada gestiona únicamente las citas asignadas a su cuenta en su sucursal.
Puede reprogramar fecha y hora, pero desde los paneles del personal solo la
administradora cambia la empleada asignada. El buscador permite consultar otras
citas sin ofrecer botones para modificarlas. Las citas sin preferencia esperan
la asignación de la administradora antes de que una empleada registre su atención.
Deshacer la atención conserva la asignación. La agenda se actualiza cuando llegan
cambios de otra pestaña o al volver a la ventana; un formulario de reprogramación
abierto se cierra si su cita cambia o pasa a otra empleada.

1. Entra con la cuenta de administradora y abre **Agenda general**.
   En **Ver citas** puedes elegir **De un día** o **Todas las fechas**; ambas
   opciones respetan los filtros de sucursal y **Estado**. Todas las fechas incluye
   citas pasadas y futuras. Los dos iconos de **Orden por fecha y hora** permiten
   ver primero las más antiguas o las más recientes; al pasar el cursor muestran
   su función y el botón seleccionado queda resaltado. También funcionan con teclado.
   Por defecto se excluyen canceladas; puedes consultar **Canceladas** o **Todos
   los estados**. **Pendientes de atención** agrupa todas las activas; también
   puedes filtrar por la etiqueta visible: Confirmadas, Pendientes de pago,
   Sin marcar, Atendidas o No llegó. Las métricas corresponden a las citas
   mostradas; canceladas y ausencias no aportan al ingreso estimado.
2. Selecciona el día y pulsa **Asignar / completar datos** en una cita activa pendiente de atención.
3. Elige la empleada y el tono; pulsa **Guardar cambios**. Cerrar o presionar Escape descarta la edición.

La empleada debe estar activa, pertenecer a la sucursal y realizar el servicio.
Al cambiarla en una cita activa se comprueban duración completa, cierres y capacidad
para las demás citas, incluidas las que no tienen preferencia. Se permite completar
la asignación cuando ya llegó la hora, mientras siga pendiente de atención.
Las citas atendidas, canceladas o marcadas **No llegó** no ofrecen esta edición.
Si la cita se marca como atendida mientras el formulario está abierto, el guardado
se rechaza para conservar la empleada y el tono registrados.

El tono puede permanecer **Por elegir**. Un tono agotado o una empleada inactiva ya
registrados se conservan si solo se modifica el otro campo. Guardar no marca la cita
como atendida ni modifica servicio, diseño, fecha, duración, pago o total.
Si la cita cambió mientras el formulario estaba abierto, hay que volver a abrirlo.

Esta demostración usa JavaScript y localStorage; al recargar conserva los cambios
en el mismo navegador y origen. Todavía no escribe en MySQL. La autorización y las
validaciones deberán repetirse en PHP al implementar el backend.

## Qué falta para la siguiente etapa

- Base de datos y servidor: hoy todo se guarda en el navegador, y la
  revisión de roles solo oculta pantallas (el servidor debe validar roles,
  solicitudes y decisiones).
  Por eso una cita agendada en un celular no aparece en la computadora del
  salón: para probar el flujo completo, usa el mismo navegador.
- Cobro real del anticipo mediante una pasarela de pago.
- Otras vistas internas para empleadas solo si el salón define un uso claro;
  el panel actual incluye agenda y solicitudes de cierre de disponibilidad.
- Reemplazar los precios y tonos de ejemplo por los reales del salón.

## Pendientes rápidos

- Las fotos del encabezado y de los diseños todavía no existen; cuando las
  tengamos, van en `img/` y se referencian desde el HTML.
- Verificar con el salón los precios, duraciones y la lista real de tonos
  en `js/datos.js`.



---Hashes.

clienta1: $2y$10$ZNc7YfTMli03SchLapG.vuWrJ16naqXt8/EEt.tPAdBXwgK6ZHb26
clienta2: $2y$10$egtcYU16jQRdykrRS0M8keC4pR2jV/z1OwPV0lD2Bpd3NHeke3GAC
clienta3: $2y$10$r/CRc49Xm/a9SfG5a9qq.uqPtoqqqTt6HJNG.1gT5oxR2sTvHsbga

---de empleadas.

Ana Torres
    $2y$10$wYNq.cJcnpe6LBzaPKTKeuZluwx65ZJc5nExFMTX19jlJhs5E6CbW

Karla Ruiz
    $2y$10$S37KX2uAHApGZjgI7Tkl2.dh62PxUaW6IDLoRgSmlPnNv.Z44/8Sy

Sofía Luna
    $2y$10$QaZVV7IZ.775kJ97o/JEVewwXTxxbcpr15p7kItoXv3o5P/fc4auy

---admin

Laura Treviño
    $2y$10$yNmi58Tg61K.VHyO.3LTQO1ITDxevto0cZd5oQ55WGfi6yNIyX5DS
