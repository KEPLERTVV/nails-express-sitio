/* ============================================================
   panel-admin.js — Agenda general de la administradora
   Las citas de un día o de todas las fechas, en ambas sucursales (o una),
   con la empleada que atiende cada una.
   Equivale a Sucursal.consultarAgendaDia() del diagrama.
   ============================================================ */

let sucursalFiltro = "todas";   // "todas" o el id de una sucursal
const campoDia = document.getElementById("agenda-dia");
const campoPeriodo = document.getElementById("agenda-periodo");
const campoEstado = document.getElementById("agenda-estado");
const botonesOrden = document.querySelectorAll("#agenda-orden [data-orden]");
let ordenAgenda = "asc";
const dialogoCompletar = document.getElementById("completar-cita");
const campoEmpleada = document.getElementById("completar-empleada");
const campoTono = document.getElementById("completar-tono");
let citaEnEdicion = null;
campoDia.value = fechaISO();

function enFiltro(idSucursal) {
  return sucursalFiltro === "todas" || idSucursal === sucursalFiltro;
}

function coincideEstado(cita) {
  const estado = campoEstado.value || "sin-canceladas";
  if (estado === "todos") return true;
  if (estado === "sin-canceladas") return cita.estado !== "cancelada";
  // Activa agrupa todas las pendientes de atención; el resto coincide con
  // la etiqueta visible (incluye pago pendiente y citas pasadas sin marcar).
  if (estado === "activa") return cita.estado === "activa";
  return etiquetaEstado(cita).clase === estado;
}

/* --- Dibujo -------------------------------------------------- */
function pintarAgendaGeneral() {
  if (Sesion.actual()?.rol !== "administradora") return;
  const fecha = campoDia.value || fechaISO();
  const todasLasFechas = campoPeriodo.value === "todas";
  // Conserva el día elegido para recuperarlo al volver a la vista diaria.
  campoDia.disabled = todasLasFechas;
  document.getElementById("agenda-fecha").textContent = todasLasFechas
    ? "Citas de todas las fechas" : capitalizar(fechaLarga(fecha));
  document.getElementById("metrica-citas-etiqueta").textContent = todasLasFechas
    ? "Citas mostradas" : "Citas del día";

  pintarFiltroSucursal("filtro-sucursal", sucursalFiltro, valor => {
    sucursalFiltro = valor;
    pintarAgendaGeneral();
  });

  // Fecha, sucursal y estado se combinan antes de ordenar y calcular métricas.
  const sentido = ordenAgenda === "desc" ? -1 : 1;
  const citas = Sesion.citas()
    .filter(c => (todasLasFechas || c.fecha === fecha) && coincideEstado(c) && enFiltro(c.sucursalId))
    .sort((a, b) => sentido * (a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora)) ||
      a.sucursalId - b.sucursalId || a.folio.localeCompare(b.folio));

  document.getElementById("metrica-citas").textContent   = citas.length;
  // Las canceladas y quienes no llegaron no aportan al ingreso estimado.
  document.getElementById("metrica-ingreso").textContent =
    pesos(citas.filter(c => !["no-asistio", "cancelada"].includes(c.estado)).reduce((suma, c) => suma + c.total, 0));
  document.getElementById("metrica-empleadas").textContent =
    Sesion.empleadas().filter(e => enFiltro(e.sucursal)).length;

  document.getElementById("agenda-lista").innerHTML = citas.length
    ? citas.map(c => filaCitaGeneral(c, todasLasFechas)).join("")
    : `<li class="citas__vacio"><p>No hay citas que coincidan con los filtros seleccionados.</p></li>`;
}

function filaCitaGeneral(cita, mostrarFecha) {
  // buscarEmpleada incluye inactivas: una cita vieja conserva su nombre
  const empleada = cita.empleadaId ? Sesion.buscarEmpleada(cita.empleadaId) : null;
  // lo que marcó la empleada (Atendida / No llegó) o, si aún no, cómo se paga
  const estado   = etiquetaEstado(cita);
  const tono = COLORES.find(c => c.id === cita.colorId);

  return `
    <li class="agenda__bloque agenda__bloque--general">
      <time class="agenda__hora" datetime="${escaparHTML(cita.fecha)}T${escaparHTML(cita.hora)}">${escaparHTML(cita.hora)}</time>
      <div class="agenda__quien">
        ${mostrarFecha ? `<span>${escaparHTML(capitalizar(fechaLarga(cita.fecha)))}</span>` : ""}
        <strong>${escaparHTML(cita.nombre || "Clienta")}</strong>
        <span>${escaparHTML(detalleServicio(cita))} · ${cita.duracion} min</span>
        <span>Tono: ${tono ? escaparHTML(tono.nombre) : "Por elegir"}</span>
        <span class="agenda__folio">${escaparHTML(cita.folio)}</span>
      </div>
      <div class="agenda__quien">
        <strong>${empleada ? escaparHTML(empleada.nombre) : "Sin asignar"}</strong>
        <span>${escaparHTML(nombreSucursal(cita.sucursalId))}</span>
      </div>
      <span class="estado estado--${estado.clase}">${estado.texto}</span>
      ${cita.estado === "activa" ? `
        <div class="agenda__acciones">
          <button class="boton boton--secundario" type="button"
                  data-completar="${escaparHTML(cita.folio)}" aria-haspopup="dialog"
                  aria-label="Asignar o completar datos de ${escaparHTML(cita.nombre || "Clienta")}, ${escaparHTML(cita.folio)}">Asignar / completar datos</button>
        </div>` : ""}
    </li>`;
}

function abrirCompletarCita(folio) {
  if (Sesion.actual()?.rol !== "administradora") return;
  const cita = Sesion.citas().find(c => c.folio === folio);
  if (!cita || cita.estado !== "activa") return;
  // Copia independiente: los cambios de la agenda no alteran el formulario abierto.
  citaEnEdicion = JSON.parse(JSON.stringify(cita));
  document.getElementById("agenda-aviso").textContent = "";
  document.getElementById("completar-error").textContent = "";
  document.getElementById("completar-resumen").textContent =
    `${cita.nombre || "Clienta"} · ${cita.folio} · ${fechaLarga(cita.fecha)}, ${cita.hora} · ${nombreSucursal(cita.sucursalId)} · ${detalleServicio(cita)}`;

  const aptas = Sesion.empleadasPara(cita.servicioId, cita.sucursalId);
  // Conserva una asignación antigua aunque la empleada ya no esté disponible.
  // Esto permite completar únicamente el tono sin reescribir el historial.
  const actual = Sesion.buscarEmpleada(cita.empleadaId);
  if (cita.empleadaId && !aptas.some(e => e.id === cita.empleadaId)) {
    aptas.unshift({ id: cita.empleadaId, nombre: `${actual?.nombre || "Empleada registrada"} (asignación actual)` });
  }
  campoEmpleada.innerHTML = '<option value="0">Sin asignar</option>' +
    aptas.map(e => `<option value="${e.id}">${escaparHTML(e.nombre)}</option>`).join("");
  campoEmpleada.value = String(cita.empleadaId || 0);
  document.getElementById("completar-ayuda-empleada").textContent =
    "Empleadas de la sucursal y especialidad. Al guardar revisamos disponibilidad durante todo el servicio.";

  campoTono.innerHTML = '<option value="">Por elegir</option>' + COLORES
    .filter(c => c.disponible || c.id === cita.colorId)
    .map(c => `<option value="${c.id}">${escaparHTML(c.nombre)}${c.disponible ? "" : " (tono registrado, no disponible)"}</option>`).join("");
  campoTono.value = cita.colorId == null ? "" : String(cita.colorId);
  document.getElementById("completar-nota").textContent =
    "Completa estos datos antes de marcar la cita como atendida. El servicio, diseño y total se conservan.";
  dialogoCompletar.showModal();
  campoEmpleada.focus();
}

/* --- Eventos ------------------------------------------------- */
// aria-pressed comunica el orden activo también a quienes usan lector de pantalla.
botonesOrden.forEach(boton => boton.addEventListener("click", () => {
  ordenAgenda = boton.dataset.orden;
  botonesOrden.forEach(opcion => opcion.setAttribute("aria-pressed", opcion.dataset.orden === ordenAgenda));
  document.getElementById("agenda-aviso").textContent = "";
  pintarAgendaGeneral();
}));
[campoPeriodo, campoEstado].forEach(campo => campo.addEventListener("change", () => {
  document.getElementById("agenda-aviso").textContent = "";
  pintarAgendaGeneral();
}));
campoDia.addEventListener("change", () => {
  document.getElementById("agenda-aviso").textContent = "";
  pintarAgendaGeneral();
});
document.getElementById("agenda-lista").addEventListener("click", e => {
  const boton = e.target.closest("[data-completar]");
  if (boton) abrirCompletarCita(boton.dataset.completar);
});
document.getElementById("completar-cerrar").addEventListener("click", () => dialogoCompletar.close());
dialogoCompletar.addEventListener("close", () => {
  const folio = citaEnEdicion?.folio;
  citaEnEdicion = null;
  // La lista puede haberse redibujado al guardar: recupera el botón por su folio.
  const boton = Array.from(document.querySelectorAll("[data-completar]"))
    .find(b => b.dataset.completar === folio);
  if (Sesion.actual()?.rol === "administradora") boton?.focus();
});
document.getElementById("form-completar-cita").addEventListener("submit", e => {
  e.preventDefault();
  if (!citaEnEdicion) return;
  const resultado = Sesion.completarCita(citaEnEdicion.folio, {
    empleadaId: Number(campoEmpleada.value),
    colorId: campoTono.value === "" ? null : Number(campoTono.value)
  }, citaEnEdicion);
  if (!resultado.guardada) {
    document.getElementById("completar-error").textContent = resultado.mensaje;
    return;
  }
  document.getElementById("agenda-aviso").textContent = resultado.mensaje;
  dialogoCompletar.close();
});
document.addEventListener("agenda:cambio", pintarAgendaGeneral);
document.addEventListener("sesion:cambio", () => {
  if (dialogoCompletar.open) dialogoCompletar.close();
  document.getElementById("agenda-aviso").textContent = "";
});

/* --- Arranque ------------------------------------------------ */
iniciarPanel(pintarAgendaGeneral, "administradora");
