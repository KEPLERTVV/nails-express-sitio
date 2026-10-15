/* ============================================================
   mis-citas.js — Citas de la clienta: próximas e historial
   Cada cita guarda solo ids; los nombres se buscan en datos.js.
   Equivale a Cliente.consultarHistorial(), Cliente.cancelarCita()
   y Cita.reprogramar() del diagrama de clases.
   ============================================================ */

// Hasta cuántas horas antes se puede reprogramar, o cancelar sin
// perder el anticipo (texto del wireframe 12: "sin costo hasta 4 horas antes")
const HORAS_LIMITE = 4;
const ANTICIPO = 200;               // el mismo monto que ofrece agendar.html
const TELEFONO_SALON = "+52 81 4621 0094";

// Folio de la cita que está pidiendo confirmación para cancelarse
let folioPorCancelar = null;

const ETIQUETAS_ESTADO = {
  "confirmada":    "Confirmada",
  "por-confirmar": "Por confirmar",   // ya pasó, falta que el salón la marque
  "atendida":      "Atendida",
  "no-asistio":    "No asistió",
  "cancelada":     "Cancelada"
};

/* --- Estado de una cita -------------------------------------- */
function momentoDe(cita) {
  return new Date(cita.fecha + "T" + cita.hora);
}

// Lo que ve la clienta. "Atendida" y "No asistió" los marca la
// empleada en el salón; mientras no lo haga, una cita pasada
// aparece "Por confirmar".
function estadoDe(cita) {
  if (["cancelada", "atendida", "no-asistio"].includes(cita.estado)) return cita.estado;
  return momentoDe(cita) >= new Date() ? "confirmada" : "por-confirmar";
}

// ¿Todavía se está a tiempo de mover la cita (o cancelarla sin costo)?
function aTiempo(cita) {
  return momentoDe(cita) - new Date() >= HORAS_LIMITE * 60 * 60 * 1000;
}

function buscarCita(folio) {
  const sesion = Sesion.actual();
  return sesion ? Sesion.citasDe(sesion.id).find(c => c.folio === folio) : null;
}

/* --- Dibujo -------------------------------------------------- */
function pintarCitas(sesion) {
  const citas = Sesion.citasDe(sesion.id);

  // Próximas: de la más cercana a la más lejana
  const proximas = citas
    .filter(c => estadoDe(c) === "confirmada")
    .sort((a, b) => momentoDe(a) - momentoDe(b));

  // Historial: de la más reciente a la más antigua
  const historial = citas
    .filter(c => estadoDe(c) !== "confirmada")
    .sort((a, b) => momentoDe(b) - momentoDe(a));

  document.getElementById("citas-proximas").innerHTML = proximas.length
    ? proximas.map(tarjetaCita).join("")
    : `<div class="citas__vacio">
         <p>No tienes citas próximas.</p>
         <a class="boton boton--secundario" href="agendar.html">Agendar una cita</a>
       </div>`;

  document.getElementById("citas-historial").innerHTML = historial.length
    ? historial.map(tarjetaCita).join("")
    : `<div class="citas__vacio"><p>Aquí aparecerán tus citas pasadas y canceladas.</p></div>`;
}

function tarjetaCita(cita) {
  const servicio = SERVICIOS.find(s => s.id === cita.servicioId);
  const diseno   = DISENOS.find(d => d.id === cita.disenoId);
  const sucursal = SUCURSALES.find(s => s.id === cita.sucursalId);
  // incluye empleadas que ya no están activas: el historial no cambia
  const empleada = cita.empleadaId ? Sesion.buscarEmpleada(cita.empleadaId) : null;
  const color    = COLORES.find(c => c.id === cita.colorId);
  if (!servicio || !sucursal) return "";   // cita con datos que ya no existen

  const estado = estadoDe(cita);
  const fecha  = new Date(cita.fecha + "T00:00");
  const mes    = fecha.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");

  const titulo = servicio.nombre + (diseno && diseno.id ? " · " + diseno.nombre : "");
  const con    = empleada && empleada.id ? "con " + empleada.nombre : "con la primera que se desocupe";

  const tono = color
    ? `<span class="cita__tono" style="background:${color.hex}" aria-hidden="true"></span>Tono ${color.nombre}`
    : "Tono a elegir en el salón";

  // El pago solo importa mientras la cita está por venir
  const pago = estado === "confirmada"
    ? `<p class="cita__dato">${cita.pago === "anticipo" ? `Anticipo de ${pesos(ANTICIPO)} pagado` : "Pagas todo en sucursal"}</p>`
    : "";

  // Si se movió, se indica (cuántas veces no le importa a la clienta)
  const reprogramada = cita.reprogramaciones
    ? `<p class="cita__dato cita__nota">Reprogramada</p>` : "";

  return `
    <article class="cita cita--${estado}" data-folio="${escaparHTML(cita.folio)}">
      <div class="cita__fecha" aria-hidden="true">
        <span class="cita__dia">${fecha.getDate()}</span>
        <span class="cita__mes">${mes}</span>
      </div>

      <div class="cita__info">
        <h3>${escaparHTML(titulo)}</h3>
        <p class="cita__dato cita__cuando">${fechaLarga(cita.fecha)} · ${escaparHTML(cita.hora)}</p>
        <p class="cita__dato">${escaparHTML(sucursal.nombre)} · ${escaparHTML(con)}</p>
        <p class="cita__dato">${tono}</p>
        ${pago}
        ${reprogramada}
      </div>

      <div class="cita__lado">
        <span class="estado estado--${estado}">${ETIQUETAS_ESTADO[estado]}</span>
        <strong class="cita__total">${pesos(cita.total)}</strong>
        <span class="cita__folio">Folio ${escaparHTML(cita.folio)}</span>
      </div>

      <div class="cita__acciones">${accionesDe(cita, estado, servicio)}</div>
    </article>`;
}

function accionesDe(cita, estado, servicio) {
  const folio = escaparHTML(cita.folio);

  if (estado === "confirmada") {
    // Confirmación de cancelación en la misma tarjeta
    if (folioPorCancelar === cita.folio) {
      // Dentro de las últimas horas, el anticipo ya no se reembolsa
      const costo = !aTiempo(cita) && cita.pago === "anticipo"
        ? ` Como faltan menos de ${HORAS_LIMITE} horas, el anticipo de ${pesos(ANTICIPO)} ya no se reembolsa.`
        : "";
      return `
        <p class="cita__pregunta" id="pregunta-${folio}">¿Seguro que quieres cancelar esta cita?${costo}</p>
        <button class="boton boton--peligro" type="button" data-accion="confirmar" data-folio="${folio}"
                aria-describedby="pregunta-${folio}">Sí, cancelar</button>
        <button class="boton boton--secundario" type="button" data-accion="mantener" data-folio="${folio}">
          No, mantenerla</button>`;
    }

    // Reprogramar solo con tiempo; si no, se indica a quién llamar
    const mover = aTiempo(cita)
      ? `<button class="boton boton--principal" type="button" data-accion="reprogramar" data-folio="${folio}">
           Reprogramar</button>`
      : `<p class="cita__pregunta">Faltan menos de ${HORAS_LIMITE} horas: para moverla, llama al ${TELEFONO_SALON}.</p>`;

    return `${mover}
      <button class="boton boton--secundario" type="button" data-accion="cancelar" data-folio="${folio}">
        Cancelar cita</button>`;
  }

  // Pasada o cancelada: se puede volver a pedir lo mismo
  const parametros = new URLSearchParams({
    servicio: cita.servicioId,
    diseno:   cita.disenoId,
    sucursal: cita.sucursalId
  });
  if (cita.colorId) parametros.set("color", cita.colorId);
  return `<a class="boton boton--secundario" href="agendar.html?${parametros}">
            Volver a agendar<span class="solo-lector"> ${escaparHTML(servicio.nombre)}</span></a>`;
}

/* --- Acciones de las tarjetas -------------------------------- */
function repintar() {
  const sesion = Sesion.actual();
  if (sesion) pintarCitas(sesion);
}

const avisoCitas = document.getElementById("citas-aviso");

// Un solo listener para todos los botones de las tarjetas
document.querySelector(".cuenta__contenido").addEventListener("click", e => {
  const boton = e.target.closest("[data-accion]");
  if (!boton) return;
  const folio = boton.dataset.folio;
  // CSS.escape evita problemas si un folio trae caracteres raros
  const enTarjeta = selector => document.querySelector(`[data-folio="${CSS.escape(folio)}"] ${selector}`);

  switch (boton.dataset.accion) {
    case "reprogramar":
      abrirReprogramar(folio);
      break;

    case "cancelar":
      folioPorCancelar = folio;
      avisoCitas.textContent = "";
      repintar();
      enTarjeta('[data-accion="mantener"]').focus();   // la opción segura
      break;

    case "mantener":
      folioPorCancelar = null;
      repintar();
      enTarjeta('[data-accion="cancelar"]').focus();
      break;

    case "confirmar": {
      const cita = buscarCita(folio);
      if (!cita) return;

      Sesion.guardarCita({ ...cita, estado: "cancelada" });
      folioPorCancelar = null;
      repintar();

      avisoCitas.textContent =
        `Cancelaste tu cita del ${fechaLarga(cita.fecha)} a las ${cita.hora} (folio ${cita.folio}).`;
      // la tarjeta desapareció de "Próximas": el foco va al título de la sección
      document.getElementById("titulo-proximas").focus();
      break;
    }
  }
});

/* --- Reprogramar --------------------------------------------- */
// La ventana vive en reprogramar.js (la comparte con el panel de la empleada)
function abrirReprogramar(folio) {
  const cita = buscarCita(folio);
  if (!cita) return;

  // La página pudo quedarse abierta: se revisa otra vez el límite
  if (!aTiempo(cita)) {
    repintar();
    avisoCitas.textContent = `Ya faltan menos de ${HORAS_LIMITE} horas para esa cita; para moverla, llama al ${TELEFONO_SALON}.`;
    return;
  }

  Reprogramar.abrir(cita, {
    deClienta: true,
    alGuardar: nueva => {
      repintar();
      const empleada = nueva.empleadaId ? Sesion.buscarEmpleada(nueva.empleadaId) : null;
      avisoCitas.textContent = `Listo: tu cita quedó para el ${fechaLarga(nueva.fecha)} a las ${nueva.hora}` +
        (empleada ? ` con ${empleada.nombre}.` : ".");
      document.getElementById("titulo-proximas").focus();
    }
  });
}

/* --- Arranque ------------------------------------------------ */
iniciarPanel(pintarCitas, "cliente");
