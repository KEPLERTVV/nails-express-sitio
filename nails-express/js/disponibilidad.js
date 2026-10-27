/* ============================================================
   disponibilidad.js — Solicitudes de cierre de disponibilidad
   La empleada selecciona horarios y la administradora decide.
   ============================================================ */

const SEMANAS_ADELANTE = 8;

let inicioSemana = lunesDe(new Date());
let seleccionCierres = {};
let seleccionDe = null;
let hayCambios = false;

function lunesDe(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return d;
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

function diaYMes(fecha) {
  return fecha.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
}

function diaCorto(fecha) {
  const nombre = fecha.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "");
  return nombre.charAt(0).toUpperCase() + nombre.slice(1) + " " + fecha.getDate();
}

function solicitudesDe(empleadaId) {
  return Sesion.solicitudesDisponibilidad(empleadaId);
}

function puedeSolicitar(fecha, hora, reservados, cerrados, pendientes, ahora) {
  return new Date(fecha + "T" + hora) > ahora &&
    !reservados.has(fecha + "|" + hora) &&
    !cerrados.includes(hora) &&
    !pendientes.some(s => s.fecha === fecha && s.horas.includes(hora));
}

function pintarDisponibilidad() {
  const empleada = empleadaActual();
  const enviar = document.getElementById("disponibilidad-enviar");

  if (!empleada) {
    document.getElementById("semana-rango").textContent =
      "No encontramos tus datos de empleada. Pide a la administradora que revise tu cuenta.";
    document.getElementById("rejilla-dias").innerHTML = "";
    document.getElementById("rejilla-bloques").innerHTML = "";
    document.getElementById("solicitudes-lista").innerHTML = "";
    enviar.disabled = true;
    document.getElementById("semana-anterior").disabled = true;
    document.getElementById("semana-siguiente").disabled = true;
    return;
  }

  if (seleccionDe !== empleada.id) {
    seleccionCierres = {};
    seleccionDe = empleada.id;
    marcarCambios(false);
  }

  const dias = [0, 1, 2, 3, 4, 5, 6].map(i => sumarDias(inicioSemana, i));
  document.getElementById("semana-rango").textContent =
    `Semana del ${diaYMes(dias[0])} al ${diaYMes(dias[6])}`;

  const semanaActual = lunesDe(new Date());
  document.getElementById("semana-anterior").disabled = inicioSemana <= semanaActual;
  document.getElementById("semana-siguiente").disabled =
    inicioSemana >= sumarDias(semanaActual, 7 * SEMANAS_ADELANTE);

  const reservados = Sesion.bloquesReservados(empleada.id);
  const solicitudes = solicitudesDe(empleada.id);
  const pendientes = solicitudes.filter(s => s.estado === "pendiente");
  const ahora = new Date();

  document.getElementById("rejilla-dias").innerHTML = `
    <tr>
      <th scope="col"><span class="solo-lector">Horario</span></th>
      ${dias.map(d => {
        const fecha = fechaISO(d);
        const diaPasado = d < semanaActual;
        return `<th scope="col">
          <span>${diaCorto(d)}</span>
          <button class="boton boton--secundario disponibilidad__dia" type="button"
                  data-dia="${fecha}" ${diaPasado ? "disabled" : ""}>Todo el día</button>
        </th>`;
      }).join("")}
    </tr>`;

  document.getElementById("rejilla-bloques").innerHTML = HORARIOS.map(hora => `
    <tr>
      <th scope="row">${hora}</th>
      ${dias.map(dia => {
        const fecha = fechaISO(dia);
        const cerrados = Sesion.cerradosDe(empleada.id, fecha);
        return `<td>${celda(fecha, hora, dia, reservados, cerrados, pendientes, ahora)}</td>`;
      }).join("")}
    </tr>`).join("");

  pintarSolicitudes(solicitudes);
  actualizarBotonEnviar();
}

function celda(fecha, hora, dia, reservados, cerrados, pendientes, ahora) {
  if (reservados.has(fecha + "|" + hora)) {
    return `<span class="bloque bloque--reservado">Reservado</span>`;
  }
  if (cerrados.includes(hora)) {
    return `<span class="bloque bloque--cerrado">Cierre aprobado</span>`;
  }
  if (pendientes.some(s => s.fecha === fecha && s.horas.includes(hora))) {
    return `<span class="bloque bloque--solicitud-pendiente">En revisión</span>`;
  }

  const seleccionado = (seleccionCierres[fecha] || []).includes(hora);
  if (new Date(fecha + "T" + hora) <= ahora) {
    return `<span class="bloque bloque--pasado">Pasado</span>`;
  }

  const contexto = dia.toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long"
  });
  return `
    <button class="bloque ${seleccionado ? "bloque--cerrado" : ""}" type="button"
            data-fecha="${fecha}" data-hora="${hora}" aria-pressed="${seleccionado}">
      <span class="solo-lector">${contexto} a las ${hora}: </span>
      <span class="bloque__texto">${seleccionado ? "Solicitar cierre" : "Disponible"}</span>
    </button>`;
}

function pintarSolicitudes(solicitudes) {
  const recientes = solicitudes.slice().sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
  document.getElementById("solicitudes-lista").innerHTML = recientes.length
    ? recientes.map(s => {
      const estado = s.estado === "pendiente" ? "Pendiente de revisión" :
        s.estado === "aceptada" ? "Aceptada" : "Rechazada";
      const clase = s.estado === "pendiente" ? "pendiente" :
        s.estado === "aceptada" ? "confirmada" : "cancelada";
      return `<li class="agenda__bloque solicitud-disponibilidad">
        <div class="agenda__quien">
          <strong>${fechaLarga(s.fecha)}</strong>
          <span>${s.horas.join(" · ")}</span>
        </div>
        <span class="estado estado--${clase}">${estado}</span>
      </li>`;
    }).join("")
    : `<li class="citas__vacio"><p>Aún no has enviado solicitudes de cierre.</p></li>`;
}

function marcarCambios(pendientes, mensaje) {
  hayCambios = pendientes;
  const estado = document.getElementById("disponibilidad-estado");
  estado.textContent = mensaje || (pendientes ? "Seleccionaste horarios para solicitar su cierre." : "");
  estado.classList.toggle("disponibilidad__estado--exito", !pendientes && Boolean(mensaje));
  actualizarBotonEnviar();
}

function actualizarBotonEnviar() {
  const boton = document.getElementById("disponibilidad-enviar");
  if (boton) {
    boton.disabled = !Object.values(seleccionCierres).some(horas => horas.length);
  }
}

function seleccionarTodoElDia(fecha) {
  const empleada = empleadaActual();
  if (!empleada) return;
  const reservados = Sesion.bloquesReservados(empleada.id);
  const cerrados = Sesion.cerradosDe(empleada.id, fecha);
  const pendientes = solicitudesDe(empleada.id).filter(s => s.estado === "pendiente");
  const ahora = new Date();
  const seleccionables = HORARIOS.filter(hora =>
    puedeSolicitar(fecha, hora, reservados, cerrados, pendientes, ahora));
  const seleccionActual = new Set(seleccionCierres[fecha] || []);
  seleccionables.forEach(hora => seleccionActual.add(hora));
  if (seleccionActual.size) seleccionCierres[fecha] = Array.from(seleccionActual);
  else delete seleccionCierres[fecha];
  marcarCambios(Object.values(seleccionCierres).some(horas => horas.length));
  pintarDisponibilidad();
}

document.getElementById("rejilla-bloques").addEventListener("click", e => {
  const boton = e.target.closest("button.bloque");
  if (!boton) return;
  const { fecha, hora } = boton.dataset;
  const seleccion = new Set(seleccionCierres[fecha] || []);
  if (seleccion.has(hora)) seleccion.delete(hora);
  else seleccion.add(hora);
  if (seleccion.size) seleccionCierres[fecha] = Array.from(seleccion);
  else delete seleccionCierres[fecha];
  marcarCambios(Object.values(seleccionCierres).some(horas => horas.length));
  pintarDisponibilidad();
});

document.getElementById("rejilla-dias").addEventListener("click", e => {
  const boton = e.target.closest("button[data-dia]");
  if (boton && !boton.disabled) seleccionarTodoElDia(boton.dataset.dia);
});

document.getElementById("disponibilidad-enviar").addEventListener("click", () => {
  const empleada = empleadaActual();
  if (!empleada) return;
  const cierres = Object.entries(seleccionCierres)
    .filter(([, horas]) => horas.length)
    .map(([fecha, horas]) => ({ fecha, horas }));
  const resultado = Sesion.solicitarCierreDisponibilidad(empleada.id, cierres);
  if (!resultado.guardada) {
    marcarCambios(true, resultado.mensaje);
    return;
  }
  seleccionCierres = {};
  marcarCambios(false, resultado.mensaje);
  pintarDisponibilidad();
});

document.getElementById("semana-anterior").addEventListener("click", () => {
  inicioSemana = sumarDias(inicioSemana, -7);
  pintarDisponibilidad();
});

document.getElementById("semana-siguiente").addEventListener("click", () => {
  inicioSemana = sumarDias(inicioSemana, 7);
  pintarDisponibilidad();
});

document.addEventListener("agenda:cambio", pintarDisponibilidad);
window.addEventListener("beforeunload", e => {
  if (hayCambios) e.preventDefault();
});

iniciarPanel(pintarDisponibilidad, "empleada");
