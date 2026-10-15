/* ============================================================
   disponibilidad.js — La empleada abre o cierra sus bloques
   Equivale a Empleada.registrarDisponibilidad() del diagrama.
   Los cambios se acumulan en un borrador y solo se guardan con
   "Guardar cambios"; así se puede revisar varias semanas antes.
   ============================================================ */

const SEMANAS_ADELANTE = 8;   // hasta cuántas semanas se puede planear

let inicioSemana = lunesDe(new Date());
let borrador     = null;      // { "AAAA-MM-DD": ["horas cerradas"] }
let borradorDe   = null;      // id de la empleada dueña del borrador
let hayCambios   = false;

/* --- Fechas -------------------------------------------------- */
function lunesDe(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);   // domingo = 0 → retrocede 6
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

// "Lun 29" para el encabezado de la tabla
function diaCorto(fecha) {
  const nombre = fecha.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "");
  return nombre.charAt(0).toUpperCase() + nombre.slice(1) + " " + fecha.getDate();
}

/* --- Dibujo -------------------------------------------------- */
function pintarDisponibilidad() {
  const empleada = empleadaActual();
  const guardar  = document.getElementById("disponibilidad-guardar");

  if (!empleada) {
    document.getElementById("semana-rango").textContent =
      "No encontramos tus datos de empleada. Pide a la administradora que revise tu cuenta.";
    document.getElementById("rejilla-dias").innerHTML = "";
    document.getElementById("rejilla-bloques").innerHTML = "";
    guardar.disabled = true;
    document.getElementById("semana-anterior").disabled  = true;
    document.getElementById("semana-siguiente").disabled = true;
    return;
  }
  guardar.disabled = false;

  // Si cambió la persona con sesión, se empieza de nuevo desde lo guardado
  if (borradorDe !== empleada.id) {
    borrador   = JSON.parse(JSON.stringify(Sesion.disponibilidadDe(empleada.id)));
    borradorDe = empleada.id;
    marcarCambios(false);
  }

  const dias = [0, 1, 2, 3, 4, 5, 6].map(i => sumarDias(inicioSemana, i));
  document.getElementById("semana-rango").textContent =
    `Semana del ${diaYMes(dias[0])} al ${diaYMes(dias[6])}`;

  // No se planean semanas pasadas ni demasiado lejanas
  const semanaActual = lunesDe(new Date());
  document.getElementById("semana-anterior").disabled  = inicioSemana <= semanaActual;
  document.getElementById("semana-siguiente").disabled =
    inicioSemana >= sumarDias(semanaActual, 7 * SEMANAS_ADELANTE);

  // Bloques ya reservados por clientas: "fecha|hora"
  const reservados = new Set(Sesion.citas()
    .filter(c => c.empleadaId === empleada.id && c.estado !== "cancelada")
    .map(c => c.fecha + "|" + c.hora));

  document.getElementById("rejilla-dias").innerHTML = `
    <tr>
      <th scope="col"><span class="solo-lector">Horario</span></th>
      ${dias.map(d => `<th scope="col">${diaCorto(d)}</th>`).join("")}
    </tr>`;

  const ahora = new Date();
  document.getElementById("rejilla-bloques").innerHTML = HORARIOS.map(hora => `
    <tr>
      <th scope="row">${hora}</th>
      ${dias.map(dia => {
        const fecha = fechaISO(dia);
        return `<td>${celda(fecha, hora, dia, reservados, ahora)}</td>`;
      }).join("")}
    </tr>`).join("");
}

function celda(fecha, hora, dia, reservados, ahora) {
  if (reservados.has(fecha + "|" + hora)) {
    return `<span class="bloque bloque--reservado">Reservado</span>`;
  }

  const abierto = !(borrador[fecha] || []).includes(hora);
  const texto   = abierto ? "Disponible" : "Cerrado";

  // Lo que ya pasó se muestra, pero no se puede cambiar
  if (new Date(fecha + "T" + hora) <= ahora) {
    return `<span class="bloque bloque--pasado">${texto}</span>`;
  }

  // El texto oculto da contexto al lector de pantalla: "lunes 29 de septiembre a las 11:00"
  const contexto = dia.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  return `
    <button class="bloque ${abierto ? "" : "bloque--cerrado"}" type="button"
            data-fecha="${fecha}" data-hora="${hora}" aria-pressed="${abierto}">
      <span class="solo-lector">${contexto} a las ${hora}: </span><span class="bloque__texto">${texto}</span>
    </button>`;
}

/* --- Cambios ------------------------------------------------- */
function marcarCambios(pendientes, mensaje) {
  hayCambios = pendientes;
  const estado = document.getElementById("disponibilidad-estado");
  estado.textContent = mensaje || (pendientes ? "Tienes cambios sin guardar." : "");
  estado.classList.toggle("disponibilidad__estado--exito", !pendientes && Boolean(mensaje));
}

// Abrir o cerrar un bloque. Solo se actualiza ese botón para no
// perder el foco del teclado.
document.getElementById("rejilla-bloques").addEventListener("click", e => {
  const boton = e.target.closest("button.bloque");
  if (!boton) return;

  const { fecha, hora } = boton.dataset;
  const cerrados = new Set(borrador[fecha] || []);
  const abrir = cerrados.has(hora);
  if (abrir) cerrados.delete(hora); else cerrados.add(hora);

  if (cerrados.size) borrador[fecha] = Array.from(cerrados);
  else delete borrador[fecha];

  boton.setAttribute("aria-pressed", abrir);
  boton.classList.toggle("bloque--cerrado", !abrir);
  boton.querySelector(".bloque__texto").textContent = abrir ? "Disponible" : "Cerrado";
  marcarCambios(true);
});

document.getElementById("disponibilidad-guardar").addEventListener("click", () => {
  const empleada = empleadaActual();
  if (!empleada) return;
  Sesion.guardarDisponibilidad(empleada.id, borrador);
  marcarCambios(false, "Guardamos tu disponibilidad.");
});

document.getElementById("semana-anterior").addEventListener("click", () => {
  inicioSemana = sumarDias(inicioSemana, -7);
  pintarDisponibilidad();
});

document.getElementById("semana-siguiente").addEventListener("click", () => {
  inicioSemana = sumarDias(inicioSemana, 7);
  pintarDisponibilidad();
});

// Aviso del navegador si se intenta salir con cambios sin guardar
window.addEventListener("beforeunload", e => {
  if (hayCambios) e.preventDefault();
});

/* --- Arranque ------------------------------------------------ */
iniciarPanel(pintarDisponibilidad, "empleada");
