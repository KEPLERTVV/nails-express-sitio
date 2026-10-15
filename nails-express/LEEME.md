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
disponibilidad.html  Panel de la empleada: abrir o cerrar bloques por semana
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
js/disponibilidad.js  Rejilla semanal de disponibilidad
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
| `HORARIOS` + bloques cerrados por empleada | `Disponibilidad` |
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
- Panel de la empleada: agenda del día y disponibilidad semanal; lo que
  cierra deja de ofrecerse al agendar.
- Folio único por cita (por ejemplo `NE-K7P3QA`): la clienta lo guarda y lo
  muestra al llegar. La empleada busca la cita por folio o teléfono, la marca
  como Atendida o No llegó, y la reprograma o cancela si la clienta llama.
  Los ingresos y comisiones solo cuentan las citas atendidas.
- Panel de la administradora (una sola cuenta, para ambas sucursales):
  agenda general, ingresos y comisiones, catálogo y precios, y empleadas.
- El personal no agenda citas ni ve las opciones de la clienta.

## Pruebas automáticas

Con Node.js 20 o posterior, desde la carpeta `nails-express-sitio`, ejecuta:

```sh
node --test tests/agenda.test.cjs
```

Cubren empalmes, cierre, especialidades, capacidad sin asignación, reprogramación,
limpieza de horarios y fallos de almacenamiento. Usan datos en memoria y no
modifican las reservas del navegador. Las pruebas de interfaz usan un DOM
simulado; la revisión visual en navegador se realiza por separado.

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

## Qué falta para la siguiente etapa

- Base de datos y servidor: hoy todo se guarda en el navegador, y la
  revisión de roles solo oculta pantallas (el servidor debe validarla).
  Por eso una cita agendada en un celular no aparece en la computadora del
  salón: para probar el flujo completo, usa el mismo navegador.
- Cobro real del anticipo mediante una pasarela de pago.
- Vistas internas adicionales para empleadas solo si el salón define un uso claro;
  por ahora la administradora controla los datos del personal.
- Reemplazar los precios y tonos de ejemplo por los reales del salón.

## Pendientes rápidos

- Las fotos del encabezado y de los diseños todavía no existen; cuando las
  tengan, van en `img/` y se referencian desde el HTML.
- Verificar con el salón los precios, duraciones y la lista real de tonos
  en `js/datos.js`.
