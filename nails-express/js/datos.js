/* ============================================================
   datos.js — Datos del sistema
   Cada arreglo corresponde a una clase del diagrama UML.
   Cuando exista base de datos, estos arreglos se reemplazan
   por consultas al servidor; el resto del código no cambia.
   ============================================================ */

/* Clase Color ------------------------------------------------ */
const COLORES = [
  { id: 1,  nombre: "Rojo cereza",     familia: "rojos",  hex: "#B2182B", marca: "OPI",     disponible: true  },
  { id: 2,  nombre: "Vino profundo",   familia: "rojos",  hex: "#6E1230", marca: "OPI",     disponible: true  },
  { id: 3,  nombre: "Rojo clásico",    familia: "rojos",  hex: "#C9203A", marca: "Essie",   disponible: true  },
  { id: 4,  nombre: "Frambuesa",       familia: "rojos",  hex: "#A51B4F", marca: "Essie",   disponible: false },
  { id: 5,  nombre: "Nude arena",      familia: "nudes",  hex: "#D8B4A0", marca: "Essie",   disponible: true  },
  { id: 6,  nombre: "Rosa palo",       familia: "nudes",  hex: "#E8B9C4", marca: "OPI",     disponible: true  },
  { id: 7,  nombre: "Durazno suave",   familia: "nudes",  hex: "#F0C3AC", marca: "Essie",   disponible: true  },
  { id: 8,  nombre: "Rosa mexicano",   familia: "nudes",  hex: "#E8467C", marca: "OPI",     disponible: true  },
  { id: 9,  nombre: "Verde jade",      familia: "frios",  hex: "#2E7D6B", marca: "Essie",   disponible: true  },
  { id: 10, nombre: "Azul noche",      familia: "frios",  hex: "#20365E", marca: "OPI",     disponible: true  },
  { id: 11, nombre: "Lavanda",         familia: "frios",  hex: "#9B8ACB", marca: "Essie",   disponible: true  },
  { id: 12, nombre: "Turquesa",        familia: "frios",  hex: "#27A69A", marca: "OPI",     disponible: false },
  { id: 13, nombre: "Perla",           familia: "efectos", hex: "#E6E2DC", marca: "Essie",  disponible: true  },
  { id: 14, nombre: "Oro líquido",     familia: "efectos", hex: "#C9A227", marca: "OPI",    disponible: true  },
  { id: 15, nombre: "Humo",            familia: "efectos", hex: "#6F6A72", marca: "Essie",  disponible: true  },
  { id: 16, nombre: "Chocolate",       familia: "efectos", hex: "#5B3A2E", marca: "OPI",    disponible: true  }
];

const FAMILIAS = [
  { id: "todos",   nombre: "Todos los tonos" },
  { id: "rojos",   nombre: "Rojos y vinos" },
  { id: "nudes",   nombre: "Nudes y rosas" },
  { id: "frios",   nombre: "Azules y verdes" },
  { id: "efectos", nombre: "Piedritas y efectos" }
];

/* Clase Diseno ----------------------------------------------- */
const DISENOS = [
  { id: 0, nombre: "Sin diseño",         costoExtra: 0,   duracionExtra: 0  },
  { id: 1, nombre: "Francés clásico",    costoExtra: 60,  duracionExtra: 15 },
  { id: 2, nombre: "Francés con glitter", costoExtra: 70, duracionExtra: 15 },
  { id: 3, nombre: "Ojo de gato",        costoExtra: 80,  duracionExtra: 20 },
  { id: 4, nombre: "Piedritas",          costoExtra: 90,  duracionExtra: 25 },
  { id: 5, nombre: "Efecto mármol",      costoExtra: 120, duracionExtra: 30 }
];

/* Clase Servicio --------------------------------------------- */
const SERVICIOS = [
  { id: 1, nombre: "Gelish",   descripcion: "Esmaltado semipermanente de larga duración.", precio: 380, duracion: 60, requiereEspecialista: false },
  { id: 2, nombre: "Acrílico", descripcion: "Uñas esculpidas con extensión y forma a elegir.", precio: 500, duracion: 90, requiereEspecialista: true  },
  { id: 3, nombre: "Pedicura", descripcion: "Pedicura brasileña o en seco, incluye esmaltado.", precio: 220, duracion: 45, requiereEspecialista: false }
];

/* Clase Sucursal --------------------------------------------- */
const SUCURSALES = [
  { id: 1, nombre: "Paseo la Fe",        direccion: "Av. Miguel Alemán 100, San Nicolás", apertura: "11:00", cierre: "21:00" },
  { id: 2, nombre: "Galerías Monterrey", direccion: "Av. Insurgentes 2500, Monterrey",    apertura: "11:00", cierre: "21:00" }
];

/* Clase Empleada --------------------------------------------- */
/* Las empleadas ya no tienen un arreglo propio: son las cuentas
   de USUARIOS con rol "empleada" (Empleada hereda de Usuario).
   La lista que ve la clienta al agendar sale de Sesion.empleadas().
   Esta opción no es una persona; es la elección "cualquiera".  */
const SIN_PREFERENCIA = { id: 0, nombre: "Sin preferencia", especialidades: [], sucursal: null };

/* Clase Disponibilidad --------------------------------------- */
/* Bloques base del día. Un bloque no se ofrece si ya tiene una
   cita (CITAS) o si la empleada lo cerró en disponibilidad.html. */
const HORARIOS = ["11:00", "12:15", "13:30", "14:45", "16:00", "17:15", "18:30", "19:45"];

/* Clase Usuario ---------------------------------------------- */
/* ATENCIÓN: cuentas SOLO para la demostración. Las contraseñas
   nunca deben estar en el código del navegador: cuando exista
   servidor, este arreglo se elimina y la autenticación real se
   valida en el servidor, con contraseñas cifradas.             */
/* Las empleadas llevan, además de los datos de Usuario, los de
   la subclase Empleada: especialidades, sucursal, activa y
   porcentajeComision (lo que gana de cada servicio que realiza).
   Hay UNA sola administradora: la jefa de ambas sucursales.
   activa: false la saca del agendado y le impide iniciar sesión,
   sin borrar su historial de citas.                            */
const USUARIOS = [
  { id: 1, nombre: "Mariana Garza",  correo: "mariana@correo.com",    telefono: "8112345678", contrasena: "clienta123",  rol: "cliente" },
  { id: 2, nombre: "Ana Torres",     correo: "ana@nailsexpress.mx",   telefono: "8187654321", contrasena: "empleada123", rol: "empleada",
    especialidades: ["Gelish", "Acrílico"],  sucursal: 2, activa: true, porcentajeComision: 40 },
  { id: 3, nombre: "Laura Treviño",  correo: "laura@nailsexpress.mx", telefono: "8100001111", contrasena: "admin12345",  rol: "administradora" },
  { id: 4, nombre: "Karla Ruiz",     correo: "karla@nailsexpress.mx", telefono: "8187650002", contrasena: "empleada123", rol: "empleada",
    especialidades: ["Pedicura", "Gelish"],  sucursal: 1, activa: true, porcentajeComision: 35 },
  { id: 5, nombre: "Sofía Luna",     correo: "sofia@nailsexpress.mx", telefono: "8187650003", contrasena: "empleada123", rol: "empleada",
    especialidades: ["Acrílico"],            sucursal: 2, activa: true, porcentajeComision: 40 },

  // Empleadas de demostración para probar capacidad y especialidades.
  { id: 6, nombre: "Valeria López Demo", correo: "valeria.demo@example.com", telefono: "8110001001", contrasena: "empleada123", rol: "empleada",
    especialidades: ["Gelish", "Acrílico"], sucursal: 1, activa: true, porcentajeComision: 40 },
  { id: 7, nombre: "Daniela Ríos Demo", correo: "daniela.demo@example.com", telefono: "8110001002", contrasena: "empleada123", rol: "empleada",
    especialidades: ["Gelish", "Pedicura"], sucursal: 2, activa: true, porcentajeComision: 35 },
  { id: 8, nombre: "Camila Torres Demo", correo: "camila.demo@example.com", telefono: "8110001003", contrasena: "empleada123", rol: "empleada",
    especialidades: ["Gelish"], sucursal: 1, activa: true, porcentajeComision: 35 },
  { id: 9, nombre: "Renata García Demo", correo: "renata.demo@example.com", telefono: "8110001004", contrasena: "empleada123", rol: "empleada",
    especialidades: ["Acrílico"], sucursal: 1, activa: true, porcentajeComision: 40 },
  { id: 10, nombre: "Andrea Martínez Demo", correo: "andrea.demo@example.com", telefono: "8110001005", contrasena: "empleada123", rol: "empleada",
    especialidades: ["Pedicura"], sucursal: 1, activa: true, porcentajeComision: 35 }
];

/* Fecha local en formato AAAA-MM-DD (toISOString usa UTC y en
   la noche de Monterrey daría el día siguiente).               */
function fechaISO(fecha) {
  const d = fecha || new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function fechaRelativa(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return fechaISO(d);
}

/* Clase Cita ------------------------------------------------- */
/* Las fechas se calculan desde hoy para que la demostración
   siempre tenga citas próximas, de hoy y pasadas.
   estado:
     "activa"     — agendada; si ya pasó la hora, falta que la empleada la marque
     "atendida"   — la empleada confirmó que se hizo el servicio (cuenta en ingresos)
     "no-asistio" — la clienta no llegó (lo marca la empleada)
     "cancelada"  — la canceló la clienta o la empleada
   clienteId es null cuando se agendó sin cuenta: por eso cada cita
   guarda nombre y teléfono, y la clienta se identifica con su folio.
   empleadaId es el id de USUARIOS de la empleada (0 = sin
   preferencia): 2 Ana Torres, 4 Karla Ruiz, 5 Sofía Luna.      */
const CITAS = [
  // Clienta de prueba (usuario 1): una próxima y su historial
  { folio: "NE-4821", clienteId: 1, nombre: "Mariana Garza", servicioId: 1, disenoId: 1, colorId: 1,  sucursalId: 2, empleadaId: 2,
    fecha: fechaRelativa(3),   hora: "16:00", total: 440, duracion: 75, pago: "anticipo", estado: "activa" },
  { folio: "NE-3307", clienteId: 1, nombre: "Mariana Garza", servicioId: 2, disenoId: 4, colorId: 8,  sucursalId: 2, empleadaId: 5,
    fecha: fechaRelativa(-18), hora: "13:30", total: 590, duracion: 115, pago: "sucursal", estado: "atendida" },
  { folio: "NE-2950", clienteId: 1, nombre: "Mariana Garza", servicioId: 3, disenoId: 0, colorId: 6,  sucursalId: 1, empleadaId: 4,
    fecha: fechaRelativa(-32), hora: "11:00", total: 220, duracion: 45, pago: "sucursal", estado: "cancelada" },
  { folio: "NE-2114", clienteId: 1, nombre: "Mariana Garza", servicioId: 1, disenoId: 5, colorId: 10, sucursalId: 1, empleadaId: 0,
    fecha: fechaRelativa(-47), hora: "17:15", total: 500, duracion: 90, pago: "anticipo", estado: "atendida" },

  // Agenda de hoy de Ana Torres (usuario 2), como en el wireframe.
  // Agendadas sin cuenta: llevan el teléfono que dejaron al agendar.
  { folio: "NE-5102", clienteId: null, nombre: "Mariana Treviño", telefono: "8111110001", servicioId: 1, disenoId: 2, colorId: null, sucursalId: 2, empleadaId: 2,
    fecha: fechaRelativa(0), hora: "11:00", total: 450, duracion: 75, pago: "anticipo", estado: "activa" },
  { folio: "NE-5103", clienteId: null, nombre: "Paola Garza",     telefono: "8111110002", servicioId: 1, disenoId: 0, colorId: 6,    sucursalId: 2, empleadaId: 2,
    fecha: fechaRelativa(0), hora: "13:30", total: 380, duracion: 60, pago: "anticipo", estado: "activa" },
  { folio: "NE-5104", clienteId: null, nombre: "Sofía Lozano",    telefono: "8111110003", servicioId: 2, disenoId: 0, colorId: 2,    sucursalId: 2, empleadaId: 2,
    fecha: fechaRelativa(0), hora: "14:45", total: 500, duracion: 90, pago: "sucursal", estado: "activa" },
  { folio: "NE-5105", clienteId: null, nombre: "Daniela Ríos",    telefono: "8111110004", servicioId: 1, disenoId: 0, colorId: 1,    sucursalId: 2, empleadaId: 2,
    fecha: fechaRelativa(0), hora: "16:00", total: 380, duracion: 60, pago: "anticipo", estado: "activa" },

  // Una cita de hoy para Karla (usuario 4) y otra para Sofía (usuario 5),
  // para que sus paneles no salgan vacíos en la demostración
  { folio: "NE-5106", clienteId: null, nombre: "Lucía Benavides", telefono: "8111110005", servicioId: 3, disenoId: 0, colorId: 7,    sucursalId: 1, empleadaId: 4,
    fecha: fechaRelativa(0), hora: "12:15", total: 220, duracion: 45, pago: "sucursal", estado: "activa" },
  { folio: "NE-5107", clienteId: null, nombre: "Regina Salinas",  telefono: "8111110006", servicioId: 2, disenoId: 1, colorId: 13,   sucursalId: 2, empleadaId: 5,
    fecha: fechaRelativa(0), hora: "13:30", total: 560, duracion: 105, pago: "anticipo", estado: "activa" },

  // Mañana, "sin preferencia" en Galerías: la atiende quien esté libre,
  // y al marcarla como atendida queda a nombre de esa empleada
  { folio: "NE-5108", clienteId: null, nombre: "Ximena Cavazos",  telefono: "8111110007", servicioId: 1, disenoId: 3, colorId: 11,   sucursalId: 2, empleadaId: 0,
    fecha: fechaRelativa(1), hora: "12:15", total: 460, duracion: 80, pago: "anticipo", estado: "activa" }
];

/* Historial para los reportes de la administradora: de 1 a 3
   citas por empleada cada día de los últimos 60 días. No usa
   azar real: se calcula a partir del número de día, así que los
   reportes no cambian al recargar la página.                   */
(function generarHistorial() {
  const clientas = ["Andrea López", "Valeria Cantú", "Fernanda Garza", "Ximena Rodríguez", "Camila Treviño",
                    "Renata Villarreal", "Paulina Sáenz", "Natalia Elizondo", "Daniela Leal", "Mónica Garza"];
  // qué servicios hace cada empleada (por id de servicio) y dónde trabaja
  const plantilla = [
    { empleadaId: 2, sucursalId: 2, servicios: [1, 2] },   // Ana: Gelish y Acrílico
    { empleadaId: 4, sucursalId: 1, servicios: [3, 1] },   // Karla: Pedicura y Gelish
    { empleadaId: 5, sucursalId: 2, servicios: [2] }       // Sofía: Acrílico
  ];

  for (let dia = 1; dia <= 60; dia++) {
    plantilla.forEach((e, i) => {
      const cuantas = (dia + i) % 3 + 1;
      for (let n = 0; n < cuantas; n++) {
        const semilla  = dia * 7 + i * 3 + n;
        const servicio = SERVICIOS.find(s => s.id === e.servicios[semilla % e.servicios.length]);
        const diseno   = DISENOS[semilla % DISENOS.length];
        CITAS.push({
          folio:      `NE-H${dia}-${e.empleadaId}${n}`,
          clienteId:  null,
          nombre:     clientas[semilla % clientas.length],
          servicioId: servicio.id,
          disenoId:   diseno.id,
          colorId:    COLORES[semilla % COLORES.length].id,
          sucursalId: e.sucursalId,
          empleadaId: e.empleadaId,
          fecha:      fechaRelativa(-dia),
          hora:       HORARIOS[(n * 2 + i) % HORARIOS.length],   // horas distintas en el mismo día
          total:      calcularTotal(servicio, diseno),
          duracion:   calcularDuracion(servicio, diseno),
          pago:       semilla % 2 ? "anticipo" : "sucursal",
          // ya pasaron: casi todas atendidas, de vez en cuando una cancelada o una que no llegó
          estado:     semilla % 11 === 0 ? "cancelada" : semilla % 13 === 0 ? "no-asistio" : "atendida"
        });
      }
    });
  }
})();

/* Utilidad: el precio final de una cita.
   Equivale al método calcularTotal() de la clase Cita.        */
function calcularTotal(servicio, diseno) {
  if (!servicio) return 0;
  return servicio.precio + (diseno ? diseno.costoExtra : 0);
}

/* Equivale a Servicio.calcularDuracion() más el extra del diseño */
function calcularDuracion(servicio, diseno) {
  if (!servicio) return 0;
  return servicio.duracion + (diseno ? diseno.duracionExtra : 0);
}

function pesos(n) {
  return "$" + n.toLocaleString("es-MX");
}
