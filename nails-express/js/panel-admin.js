/* ============================================================
   panel-admin.js — Agenda general de la administradora
   Las citas de un día en ambas sucursales (o en una sola),
   con la empleada que atiende cada una.
   Equivale a Sucursal.consultarAgendaDia() del diagrama.
   ============================================================ */

let sucursalFiltro = "todas";   // "todas" o el id de una sucursal
const campoDia = document.getElementById("agenda-dia");
campoDia.value = fechaISO();

function enFiltro(idSucursal) {
  return sucursalFiltro === "todas" || idSucursal === sucursalFiltro;
}

/* --- Dibujo -------------------------------------------------- */
function pintarAgendaGeneral() {
  const fecha = campoDia.value || fechaISO();
  document.getElementById("agenda-fecha").textContent = capitalizar(fechaLarga(fecha));

  pintarFiltroSucursal("filtro-sucursal", sucursalFiltro, valor => {
    sucursalFiltro = valor;
    pintarAgendaGeneral();
  });

  // Citas del día, ordenadas por hora y luego por sucursal
  const citas = Sesion.citas()
    .filter(c => c.fecha === fecha && c.estado !== "cancelada" && enFiltro(c.sucursalId))
    .sort((a, b) => a.hora.localeCompare(b.hora) || a.sucursalId - b.sucursalId);

  document.getElementById("metrica-citas").textContent   = citas.length;
  // quien no llegó no deja ingreso
  document.getElementById("metrica-ingreso").textContent =
    pesos(citas.filter(c => c.estado !== "no-asistio").reduce((suma, c) => suma + c.total, 0));
  document.getElementById("metrica-empleadas").textContent =
    Sesion.empleadas().filter(e => enFiltro(e.sucursal)).length;

  document.getElementById("agenda-lista").innerHTML = citas.length
    ? citas.map(c => filaCitaGeneral(c, fecha)).join("")
    : `<li class="citas__vacio"><p>No hay citas para este día${sucursalFiltro === "todas" ? "" : " en esta sucursal"}.</p></li>`;
}

function filaCitaGeneral(cita, fecha) {
  // buscarEmpleada incluye inactivas: una cita vieja conserva su nombre
  const empleada = cita.empleadaId ? Sesion.buscarEmpleada(cita.empleadaId) : null;
  // lo que marcó la empleada (Atendida / No llegó) o, si aún no, cómo se paga
  const estado   = etiquetaEstado(cita);

  return `
    <li class="agenda__bloque agenda__bloque--general">
      <time class="agenda__hora" datetime="${fecha}T${cita.hora}">${escaparHTML(cita.hora)}</time>
      <div class="agenda__quien">
        <strong>${escaparHTML(cita.nombre || "Clienta")}</strong>
        <span>${escaparHTML(detalleServicio(cita))} · ${cita.duracion} min</span>
      </div>
      <div class="agenda__quien">
        <strong>${empleada ? escaparHTML(empleada.nombre) : "Sin asignar"}</strong>
        <span>${escaparHTML(nombreSucursal(cita.sucursalId))}</span>
      </div>
      <span class="estado estado--${estado.clase}">${estado.texto}</span>
    </li>`;
}

/* --- Eventos ------------------------------------------------- */
campoDia.addEventListener("change", pintarAgendaGeneral);

/* --- Arranque ------------------------------------------------ */
iniciarPanel(pintarAgendaGeneral, "administradora");
