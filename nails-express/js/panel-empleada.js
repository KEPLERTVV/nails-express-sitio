/* ============================================================
   panel-empleada.js — Agenda del día y control de las citas
   La empleada tiene el control de las citas de su sucursal,
   tenga cuenta la clienta o no:
   - Muestra cada bloque de HORARIOS: con cita, libre o cerrado.
   - Busca citas por folio (lo que la clienta trae al llegar) o
     por teléfono (si lo perdió o llama para un cambio).
   - Marca cada cita como Atendida o No llegó, con opción de deshacer.
   - Reprograma o cancela cuando la clienta lo pide por teléfono.
   Equivale a Empleada.consultarAgenda() y
   Empleada.marcarServicioRealizado() del diagrama de clases.
   ============================================================ */

// ESTADO_POR_PAGO, etiquetaEstado(), yaEmpezo(), capitalizar() y
// detalleServicio() vienen de panel.js; Reprogramar, de reprogramar.js

const MAX_RESULTADOS = 10;
let porCancelar    = null;   // folio de la cita que pide confirmación para cancelarse
let ultimaBusqueda = "";     // se repite al actualizar, para que los resultados no se queden viejos

/* --- Dibujo de la agenda ------------------------------------- */
function pintarAgenda() {
  const empleada = empleadaActual();
  const lista    = document.getElementById("agenda-lista");
  const hoy      = fechaISO();

  document.getElementById("agenda-fecha").textContent = capitalizar(fechaLarga(hoy));

  // Por si la cuenta perdió sus datos de empleada (no debería pasar)
  if (!empleada) {
    document.getElementById("agenda-contexto").textContent = "";
    ["metrica-citas", "metrica-libres", "metrica-ingreso"]
      .forEach(id => { document.getElementById(id).textContent = "—"; });
    lista.innerHTML = `<li class="citas__vacio"><p>No encontramos tus datos de empleada.
      Pide a la administradora que revise tu cuenta.</p></li>`;
    return;
  }

  document.getElementById("agenda-contexto").textContent =
    empleada.nombre + " · " + nombreSucursal(empleada.sucursal);

  // Sus citas de hoy (las canceladas liberan el bloque)
  const citasHoy = Sesion.citas().filter(c =>
    c.empleadaId === empleada.id && c.fecha === hoy && c.estado !== "cancelada");
  const cerrados = Sesion.cerradosDe(empleada.id, hoy);

  lista.innerHTML = HORARIOS.map(hora => {
    const cita = citasHoy.find(c => c.hora === hora);
    if (cita) return filaCita(cita, empleada);
    if (cerrados.includes(hora)) return filaVacia(hora, hoy, "cerrado", "Bloque cerrado");
    return filaVacia(hora, hoy, "libre", "Espacio libre");
  }).join("");

  // "Sin preferencia" de hoy en su sucursal: cualquiera puede tomarlas
  const sinAsignar = Sesion.citas().filter(c =>
    c.empleadaId === 0 && c.sucursalId === empleada.sucursal && c.fecha === hoy && c.estado !== "cancelada")
    .sort((a, b) => a.hora.localeCompare(b.hora));
  document.getElementById("seccion-sin-asignar").classList.toggle("oculto", !sinAsignar.length);
  document.getElementById("agenda-sin-asignar").innerHTML =
    sinAsignar.map(c => filaCita(c, empleada)).join("");

  // Métricas: el ingreso no cuenta a quien no llegó
  const libres  = HORARIOS.filter(h => !citasHoy.some(c => c.hora === h) && !cerrados.includes(h));
  const ingreso = citasHoy.filter(c => c.estado !== "no-asistio").reduce((suma, c) => suma + c.total, 0);
  document.getElementById("metrica-citas").textContent   = citasHoy.length;
  document.getElementById("metrica-libres").textContent  = libres.length;
  document.getElementById("metrica-ingreso").textContent = pesos(ingreso);

  pintarBusqueda();
}

// Una cita en la agenda del día (como en el wireframe, más sus acciones)
function filaCita(cita, empleada) {
  const estado = etiquetaEstado(cita);
  return `
    <li class="agenda__bloque agenda__bloque--gestion" data-fila="${escaparHTML(cita.folio)}">
      <time class="agenda__hora" datetime="${cita.fecha}T${cita.hora}">${escaparHTML(cita.hora)}</time>
      <div class="agenda__quien">
        <strong>${escaparHTML(cita.nombre || "Clienta")}</strong>
        <span>${escaparHTML(detalleServicio(cita))}</span>
        <span class="agenda__folio">Folio ${escaparHTML(cita.folio)}</span>
      </div>
      <span class="agenda__duracion">${cita.duracion} min</span>
      <span class="estado estado--${estado.clase}">${estado.texto}</span>
      <div class="agenda__acciones">${accionesCita(cita, empleada)}</div>
    </li>`;
}

function filaVacia(hora, fecha, tipo, texto) {
  return `
    <li class="agenda__bloque agenda__bloque--${tipo}">
      <time class="agenda__hora" datetime="${fecha}T${hora}">${hora}</time>
      <span>${texto}</span>
    </li>`;
}

/* --- Acciones posibles para una cita ------------------------- */
// Cada botón lleva texto oculto con el nombre de la clienta, para
// que el lector de pantalla no lea solo "Atendida, Atendida, …"
function boton(accion, texto, tipo, cita) {
  return `<button class="boton boton--${tipo}" type="button" data-accion="${accion}" data-folio="${escaparHTML(cita.folio)}">
            ${texto}<span class="solo-lector"> (${escaparHTML(cita.nombre || "clienta")}, ${escaparHTML(cita.hora)})</span></button>`;
}

function accionesCita(cita, empleada) {
  // Solo gestiona las de su sucursal; de otra, solo informa
  if (cita.sucursalId !== empleada.sucursal) {
    return `<p class="cita__pregunta">Es de ${escaparHTML(nombreSucursal(cita.sucursalId))}: la gestiona esa sucursal.</p>`;
  }
  if (cita.estado === "cancelada") return "";

  // Ya marcada: se puede deshacer por si fue un error
  if (cita.estado === "atendida" || cita.estado === "no-asistio") {
    return boton("deshacer", "Deshacer", "secundario", cita);
  }

  // Pidiendo confirmación para cancelar (la opción segura recibe el foco)
  if (porCancelar === cita.folio) {
    return `
      <p class="cita__pregunta">¿Cancelar la cita de ${escaparHTML(cita.nombre || "la clienta")}? El horario queda libre.</p>
      ${boton("confirmar-cancelar", "Sí, cancelar", "peligro", cita)}
      ${boton("mantener", "No", "secundario", cita)}`;
  }

  // Llegó la hora: se marca qué pasó
  if (yaEmpezo(cita)) {
    return boton("atendida", "Atendida", "principal", cita) + boton("no-asistio", "No llegó", "secundario", cita);
  }

  // Todavía no llega la hora: cambios que pide la clienta por teléfono
  return boton("reprogramar", "Reprogramar", "secundario", cita) + boton("cancelar", "Cancelar", "secundario", cita);
}

/* --- Buscador por folio o teléfono --------------------------- */
function formatoTelefono(digitos) {
  return digitos.length === 10 ? `${digitos.slice(0, 2)} ${digitos.slice(2, 6)} ${digitos.slice(6)}` : digitos;
}

function pintarBusqueda() {
  const contenedor = document.getElementById("buscar-resultados");
  const empleada   = empleadaActual();
  if (!ultimaBusqueda.trim() || !empleada) { contenedor.innerHTML = ""; return; }

  // Las más recientes primero
  const resultados = Sesion.buscarCitas(ultimaBusqueda)
    .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));

  if (!resultados.length) {
    contenedor.innerHTML = `<p class="citas__vacio">No encontramos citas con «${escaparHTML(ultimaBusqueda.trim())}».
      Revisa el folio o prueba con el teléfono.</p>`;
    return;
  }

  const mostrados = resultados.slice(0, MAX_RESULTADOS);
  contenedor.innerHTML = `
    <p class="buscador__conteo">${resultados.length === 1 ? "1 cita encontrada" : `${resultados.length} citas encontradas`}${
      resultados.length > MAX_RESULTADOS ? ` (se muestran las ${MAX_RESULTADOS} más recientes)` : ""}</p>
    <ol class="agenda">${mostrados.map(c => filaResultado(c, empleada)).join("")}</ol>`;
}

// Un resultado: además de lo de la agenda, dice el día, la empleada y el teléfono
function filaResultado(cita, empleada) {
  const estado    = etiquetaEstado(cita);
  const asignada  = cita.empleadaId ? Sesion.buscarEmpleada(cita.empleadaId) : null;
  const telefono  = Sesion.telefonoDeCita(cita);
  return `
    <li class="agenda__bloque agenda__bloque--resultado" data-fila="${escaparHTML(cita.folio)}">
      <div class="agenda__quien">
        <strong>${capitalizar(fechaLarga(cita.fecha))}</strong>
        <span>${escaparHTML(cita.hora)} · ${cita.duracion} min</span>
      </div>
      <div class="agenda__quien">
        <strong>${escaparHTML(cita.nombre || "Clienta")}</strong>
        <span>${escaparHTML(detalleServicio(cita))}</span>
        <span class="agenda__folio">Folio ${escaparHTML(cita.folio)}${telefono ? " · Tel. " + formatoTelefono(telefono) : ""}</span>
      </div>
      <div class="agenda__quien">
        <strong>${asignada ? escaparHTML(asignada.nombre) : "Sin preferencia"}</strong>
        <span>${escaparHTML(nombreSucursal(cita.sucursalId))}</span>
      </div>
      <span class="estado estado--${estado.clase}">${estado.texto}</span>
      <div class="agenda__acciones">${accionesCita(cita, empleada)}</div>
    </li>`;
}

document.getElementById("form-buscar").addEventListener("submit", e => {
  e.preventDefault();
  ultimaBusqueda = document.getElementById("buscar-texto").value;
  porCancelar = null;
  pintarBusqueda();
});

/* --- Respuesta a cada acción --------------------------------- */
const aviso = document.getElementById("agenda-aviso");

// Lleva el foco a un botón de la misma fila; si la fila ya no está
// en esa zona (p. ej. una "sin preferencia" que pasó a su agenda),
// el foco va al aviso para que no se pierda.
function enfocar(zona, folio, accion) {
  const destino = document.querySelector(
    `[data-zona="${zona}"] [data-fila="${CSS.escape(folio)}"] [data-accion="${accion}"]`);
  (destino || aviso).focus();
}

function guardarYRepintar(cita, mensaje) {
  Sesion.guardarCita(cita);
  aviso.textContent = mensaje;
  pintarAgenda();
}

// Un solo listener para la agenda, las "sin preferencia" y la búsqueda
document.getElementById("cuenta-panel").addEventListener("click", e => {
  const botonAccion = e.target.closest("[data-accion]");
  if (!botonAccion) return;

  const zona  = botonAccion.closest("[data-zona]").dataset.zona;
  const folio = botonAccion.dataset.folio;
  const cita  = Sesion.citas().find(c => c.folio === folio);
  const yo    = empleadaActual();
  if (!cita || !yo) return;
  const quien = cita.nombre || "la clienta";

  switch (botonAccion.dataset.accion) {
    case "atendida":
      // Una "sin preferencia" queda a nombre de quien la atendió (para su comisión).
      // Se recuerda para poder deshacerlo.
      guardarYRepintar({
        ...cita,
        estado: "atendida",
        empleadaId: cita.empleadaId || yo.id,
        asignadaAlAtender: !cita.empleadaId
      }, `Marcaste a ${quien} como atendida.`);
      enfocar(zona, folio, "deshacer");
      break;

    case "no-asistio":
      guardarYRepintar({ ...cita, estado: "no-asistio" }, `Marcaste que ${quien} no llegó.`);
      enfocar(zona, folio, "deshacer");
      break;

    case "deshacer": {
      // Vuelve a "activa" y, si se había asignado al atender, vuelve a "sin preferencia"
      const { asignadaAlAtender, ...resto } = cita;
      guardarYRepintar({ ...resto, estado: "activa", empleadaId: asignadaAlAtender ? 0 : cita.empleadaId },
        `Se quitó la marca de la cita de ${quien}.`);
      enfocar(zona, folio, "atendida");
      break;
    }

    case "reprogramar":
      Reprogramar.abrir(cita, {
        deClienta: false,
        alGuardar: nueva => {
          aviso.textContent = `La cita de ${quien} quedó para el ${fechaLarga(nueva.fecha)} a las ${nueva.hora}. ` +
                              `Su folio sigue siendo ${nueva.folio}.`;
          pintarAgenda();
          aviso.focus();
        }
      });
      break;

    case "cancelar":
      porCancelar = folio;
      pintarAgenda();
      enfocar(zona, folio, "mantener");
      break;

    case "mantener":
      porCancelar = null;
      pintarAgenda();
      enfocar(zona, folio, "cancelar");
      break;

    case "confirmar-cancelar":
      porCancelar = null;
      guardarYRepintar({ ...cita, estado: "cancelada", canceladaPor: "salon" },
        `Cancelaste la cita de ${quien} del ${fechaLarga(cita.fecha)} a las ${cita.hora}.`);
      aviso.focus();
      break;
  }
});

/* --- Arranque ------------------------------------------------ */
iniciarPanel(pintarAgenda, "empleada");
