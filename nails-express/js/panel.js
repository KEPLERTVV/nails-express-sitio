/* ============================================================
   panel.js — Partes comunes de los paneles con sesión
   Lo usan el panel de la clienta (mis-citas, mi-perfil) y el de
   la empleada (panel-empleada, disponibilidad). Se enlaza
   después de sesion.js y antes del script propio de la página.
   ============================================================ */

/* Arranca el panel. pintarContenido(sesion) dibuja lo propio de
   cada página y se vuelve a llamar cuando cambia la sesión.
   rolPermitido (opcional) limita la página a un solo rol.

   OJO: esta revisión solo oculta la vista en el navegador. En la
   versión real, el servidor debe negar los datos a quien no
   tenga el rol, porque localStorage se puede editar a mano.     */
function iniciarPanel(pintarContenido, rolPermitido) {
  const panel      = document.getElementById("cuenta-panel");
  const sinSesion  = document.getElementById("cuenta-sin-sesion");
  const sinPermiso = document.getElementById("cuenta-sin-permiso");   // solo en páginas con rol

  function pintar() {
    const sesion    = Sesion.actual();
    const permitido = Boolean(sesion) && (!rolPermitido || sesion.rol === rolPermitido);

    // Sin sesión o sin permiso se muestra el aviso, nunca el panel
    panel.classList.toggle("oculto", !permitido);
    sinSesion.classList.toggle("oculto", Boolean(sesion));
    if (sinPermiso) {
      sinPermiso.classList.toggle("oculto", !sesion || permitido);
      // el botón del aviso lleva a la sección que sí le toca:
      // al personal, a su panel; a una clienta, al sitio
      sinPermiso.querySelectorAll("[data-panel-propio]").forEach(enlace => {
        enlace.href = Sesion.panelPropio();
        enlace.textContent = Sesion.esPersonal() ? "Ir a mi panel" : "Ir al sitio";
      });
    }
    if (!permitido) return;

    // Tarjeta del usuario en la columna lateral (panel de la clienta)
    const nombre = sesion.nombre.trim();
    const tarjeta = {
      "cuenta-inicial": nombre.charAt(0).toUpperCase(),
      "cuenta-nombre":  nombre,
      "cuenta-correo":  sesion.correo
    };
    Object.keys(tarjeta).forEach(id => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.textContent = tarjeta[id];
    });

    pintarContenido(sesion);
  }

  document.getElementById("cuenta-entrar")
    .addEventListener("click", () => Sesion.abrirAcceso());

  // Entrar o salir (aquí o en otra pestaña) vuelve a dibujar el panel
  document.addEventListener("sesion:cambio", pintar);

  pintar();
}

/* Datos de empleada (sucursal, especialidades) de la cuenta con
   sesión. La empleada ES su cuenta, así que se busca por su id. */
function empleadaActual() {
  const sesion = Sesion.actual();
  return sesion ? Sesion.buscarEmpleada(sesion.id) : null;
}

/* --- Ayudas de las agendas (empleada y administradora) ------- */

// Etiqueta de cada cita según cómo se pagará
const ESTADO_POR_PAGO = {
  anticipo: { texto: "Confirmada",        clase: "confirmada" },
  sucursal: { texto: "Pendiente de pago", clase: "pendiente"  }
};

// ¿Ya llegó la hora de la cita? (desde entonces se puede marcar)
function yaEmpezo(cita) {
  return new Date(cita.fecha + "T" + cita.hora) <= new Date();
}

// Etiqueta para el personal: lo que marcó la empleada, si ya lo hizo;
// si no, cómo se paga. Una cita pasada sin marcar dice "Sin marcar".
function etiquetaEstado(cita) {
  if (cita.estado === "atendida")   return { texto: "Atendida",  clase: "atendida" };
  if (cita.estado === "no-asistio") return { texto: "No llegó",  clase: "no-asistio" };
  if (cita.estado === "cancelada")  return { texto: "Cancelada", clase: "cancelada" };
  if (cita.fecha < fechaISO())      return { texto: "Sin marcar", clase: "por-confirmar" };
  return ESTADO_POR_PAGO[cita.pago] || ESTADO_POR_PAGO.anticipo;
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "Gelish · Francés con glitter": el servicio y, después, el diseño o el tono
function detalleServicio(cita) {
  const servicio = SERVICIOS.find(s => s.id === cita.servicioId);
  const diseno   = DISENOS.find(d => d.id === cita.disenoId);
  const color    = COLORES.find(c => c.id === cita.colorId);
  const extra    = diseno && diseno.id ? diseno.nombre : (color ? color.nombre : "");
  return (servicio ? servicio.nombre : "Servicio") + (extra ? " · " + extra : "");
}

/* Botones para filtrar por sucursal ("Ambas" o una de ellas).
   Reusa los estilos .filtro del catálogo. valor: "todas" o el id. */
function pintarFiltroSucursal(idContenedor, valorActual, alCambiar) {
  const contenedor = document.getElementById(idContenedor);
  const opciones = [{ valor: "todas", texto: "Ambas sucursales" }]
    .concat(SUCURSALES.map(s => ({ valor: s.id, texto: s.nombre })));

  contenedor.innerHTML = opciones.map(o => `
    <button class="filtro" type="button" data-valor="${o.valor}"
            aria-pressed="${o.valor === valorActual}">${o.texto}</button>`).join("");

  contenedor.querySelectorAll(".filtro").forEach(boton => {
    boton.addEventListener("click", () => {
      const valor = boton.dataset.valor === "todas" ? "todas" : Number(boton.dataset.valor);
      alCambiar(valor);
      // se vuelve a dibujar: el foco regresa al botón elegido
      const elegido = contenedor.querySelector(`[data-valor="${boton.dataset.valor}"]`);
      if (elegido) elegido.focus();
    });
  });
}

/* Nombre de una sucursal por id ("" si no existe) */
function nombreSucursal(id) {
  const sucursal = SUCURSALES.find(s => s.id === id);
  return sucursal ? sucursal.nombre : "";
}

/* Fecha larga en español: "martes 14 de octubre".
   Se agrega el año solo si no es el actual.                    */
function fechaLarga(fechaTexto) {
  const fecha = new Date(fechaTexto + "T00:00");
  const opciones = { weekday: "long", day: "numeric", month: "long" };
  if (fecha.getFullYear() !== new Date().getFullYear()) opciones.year = "numeric";
  // el navegador escribe "lunes, 5 de octubre"; los wireframes van sin coma
  return fecha.toLocaleDateString("es-MX", opciones).replace(",", "");
}

/* Escapa texto antes de meterlo en una plantilla HTML */
function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto == null ? "" : String(texto);
  return div.innerHTML;
}
