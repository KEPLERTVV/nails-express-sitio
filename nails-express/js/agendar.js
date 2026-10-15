/* ============================================================
   agendar.js — Flujo de agendado en tres pasos
   El objeto "cita" equivale a una instancia de la clase Cita.
   ============================================================ */

const cita = {
  servicio:  SERVICIOS[0],
  diseno:    DISENOS[0],
  sucursal:  SUCURSALES[0],
  empleada:  SIN_PREFERENCIA,
  color:     null,
  fecha:     "",
  hora:      "",
  nombre:    "",
  telefono:  "",
  pago:      "anticipo"
};

let paso = 1;

// Los nombres de las empleadas vienen de sus cuentas (editables):
// se escapan antes de meterlos en una plantilla HTML
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto == null ? "" : String(texto);
  return div.innerHTML;
}

// Solo empleadas activas que realizan el servicio en la sucursal elegida.
function empleadasDe(idSucursal) {
  return Sesion.empleadasPara(cita.servicio.id, idSucursal);
}

/* --- Si llegamos con selecciones desde la portada ------------ */
function leerParametros() {
  const p = new URLSearchParams(location.search);
  const buscar = (lista, clave) => {
    const v = Number(p.get(clave));
    return p.has(clave) ? lista.find(x => x.id === v) : null;
  };
  cita.servicio = buscar(SERVICIOS, "servicio")   || cita.servicio;
  cita.diseno   = buscar(DISENOS,   "diseno")     || cita.diseno;
  cita.sucursal = buscar(SUCURSALES,"sucursal")   || cita.sucursal;
  cita.color    = buscar(COLORES,   "color")      || null;
}

/* --- Dibujo de las opciones ---------------------------------- */
function tarjetas(contenedor, items, estaElegido, plantilla, alElegir) {
  const cont = document.getElementById(contenedor);
  cont.innerHTML = items.map((it, i) => `
    <button class="opcion" type="button" data-i="${i}" aria-pressed="${estaElegido(it)}">
      ${plantilla(it)}
    </button>
  `).join("");
  cont.querySelectorAll(".opcion").forEach(boton => {
    boton.addEventListener("click", () => {
      alElegir(items[Number(boton.dataset.i)]);
      pintarPaso();
      pintarResumen();
    });
  });
}

function pintarPaso() {
  if (paso === 1) {
    tarjetas("op-servicios", SERVICIOS,
      s => s.id === cita.servicio.id,
      s => `<strong>${s.nombre}</strong><span>${pesos(s.precio)} · ${s.duracion} min</span>`,
      s => { cita.servicio = s; cita.hora = ""; avisarAgenda(""); });

    tarjetas("op-disenos", DISENOS,
      d => d.id === cita.diseno.id,
      d => `<strong>${d.nombre}</strong><span>${d.costoExtra ? "+" + pesos(d.costoExtra) + " · +" + d.duracionExtra + " min" : "Solo esmaltado"}</span>`,
      d => { cita.diseno = d; cita.hora = ""; avisarAgenda(""); });

    tarjetas("op-sucursales", SUCURSALES,
      s => s.id === cita.sucursal.id,
      s => `<strong>${s.nombre}</strong><span>${s.direccion}</span>`,
      s => { cita.sucursal = s; cita.hora = ""; avisarAgenda(""); });
  }

  if (paso === 2) {
    // Las especialidades se respetan también al volver desde otro paso.
    const disponibles = empleadasDe(cita.sucursal.id).concat(SIN_PREFERENCIA);
    if (!disponibles.some(e => e.id === cita.empleada.id)) {
      cita.empleada = SIN_PREFERENCIA;
      cita.hora = "";
    } else {
      cita.empleada = disponibles.find(e => e.id === cita.empleada.id);
    }

    tarjetas("op-empleadas", disponibles,
      e => e.id === cita.empleada.id,
      e => `<strong>${escapar(e.nombre)}</strong><span>${e.especialidades.length ? escapar(e.especialidades.join(" · ")) : "La asignamos al llegar al salón"}</span>`,
      e => { cita.empleada = e; cita.hora = ""; avisarAgenda(""); });

    pintarHoras();
  }

  if (paso === 3) {
    document.querySelectorAll("#op-pago .opcion").forEach(boton => {
      boton.setAttribute("aria-pressed", boton.dataset.pago === cita.pago);
    });
  }
}

/* --- Horarios: refleja la clase Disponibilidad --------------- */
// La regla vive en sesion.js (Sesion.horasNoDisponibles) porque
// también la usa la reprogramación en mis-citas.html
function datosDeHorario() {
  return {
    empleadaId: cita.empleada.id,
    sucursalId: cita.sucursal.id,
    servicioId: cita.servicio.id,
    disenoId:   cita.diseno.id,
    duracion:   calcularDuracion(cita.servicio, cita.diseno),
    fecha:      cita.fecha,
    hora:       cita.hora
  };
}

function horasNoDisponibles() {
  return Sesion.horasNoDisponibles(datosDeHorario());
}

function avisarAgenda(mensaje) {
  document.getElementById("agendar-aviso").textContent = mensaje;
}

function pintarHoras() {
  const ocupados = horasNoDisponibles();
  // si la hora elegida dejó de estar libre (cambió fecha o empleada), se suelta
  if (cita.hora && (!HORARIOS.includes(cita.hora) || ocupados.has(cita.hora))) cita.hora = "";

  document.getElementById("agendar-ayuda").textContent = !cita.fecha
    ? "Elige primero el día para consultar los horarios."
    : !empleadasDe(cita.sucursal.id).length
      ? "No hay empleadas que realicen este servicio en esta sucursal. Elige otra sucursal o servicio."
      : ocupados.size === HORARIOS.length
        ? "No hay horarios para el servicio completo con esta opción. Prueba otro día, empleada o sucursal."
        : "Los horarios disponibles consideran la duración completa, las reservas y los bloques cerrados.";

  document.getElementById("op-horas").innerHTML = HORARIOS.map(h => {
    const libre = !ocupados.has(h);
    return `<button class="hora" type="button" data-hora="${h}"
              aria-pressed="${cita.hora === h}" ${libre ? "" : "disabled"}>${h}</button>`;
  }).join("");

  document.querySelectorAll(".hora").forEach(boton => {
    boton.addEventListener("click", () => {
      cita.hora = boton.dataset.hora;
      pintarHoras();
      pintarResumen();
    });
  });
}

/* --- Resumen lateral ----------------------------------------- */
function pintarResumen() {
  const lineas = [
    ["Servicio",  cita.servicio.nombre],
    ["Diseño",    cita.diseno.id ? cita.diseno.nombre : "Sin diseño"],
    ["Tono",      cita.color ? cita.color.nombre : "Lo elijo en el salón"],
    ["Sucursal",  cita.sucursal.nombre],
    ["Duración",  calcularDuracion(cita.servicio, cita.diseno) + " min"]
  ];
  if (paso >= 2) {
    lineas.push(["Con", cita.empleada.nombre]);
    lineas.push(["Cuándo", (cita.fecha || "—") + (cita.hora ? " · " + cita.hora : "")]);
  }

  document.getElementById("resumen-lineas").innerHTML = lineas.map(
    l => `<div class="resumen__linea"><span>${l[0]}</span><span>${escapar(l[1])}</span></div>`
  ).join("");

  document.getElementById("resumen-total").textContent =
    pesos(calcularTotal(cita.servicio, cita.diseno));
}

/* --- Cambio de paso ------------------------------------------ */
function mostrarPaso() {
  [1, 2, 3].forEach(n => {
    document.getElementById("vista-" + n).classList.toggle("oculto", n !== paso);
    document.getElementById("paso-" + n).classList.toggle("paso--hecho", n <= paso);
  });

  const titulos = ["Servicio y sucursal", "Empleada y horario", "Tus datos y pago"];
  document.getElementById("pasos-texto").textContent = "Paso " + paso + " de 3";
  document.getElementById("pasos-titulo").textContent = titulos[paso - 1];

  document.getElementById("boton-siguiente").textContent =
    paso === 3 ? "Confirmar cita" : "Continuar";
  document.getElementById("boton-atras").classList.toggle("oculto", paso === 1);

  pintarPaso();
  pintarResumen();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* --- Validación por paso ------------------------------------- */
function marcar(idCampo, valido) {
  document.getElementById(idCampo).classList.toggle("campo--invalido", !valido);
  return valido;
}

function pasoValido() {
  if (paso === 2) {
    const resultado = Sesion.validarCita(datosDeHorario());
    if (!resultado.valida) {
      pintarHoras();
      pintarResumen();
      avisarAgenda(resultado.mensaje);
      document.getElementById("agendar-aviso").focus();
      return false;
    }
  }
  if (paso === 3) {
    const nombreOk   = marcar("campo-nombre",   cita.nombre.trim().length >= 3);
    const telefonoOk = marcar("campo-telefono", cita.telefono.replace(/\D/g, "").length === 10);
    return nombreOk && telefonoOk;
  }
  return true;
}

/* --- Confirmación final -------------------------------------- */
function confirmar() {
  // Folio único: con él la clienta se identifica en el salón
  const folio  = Sesion.nuevoFolio();
  const sesion = Sesion.actual();

  const resultado = Sesion.reservarCita({
    ...datosDeHorario(),
    folio,
    clienteId:  sesion ? sesion.id : null,
    colorId:    cita.color ? cita.color.id : null,
    total:      calcularTotal(cita.servicio, cita.diseno),
    pago:       cita.pago,
    estado:     "activa",
    nombre:     cita.nombre.trim(),
    telefono:   Sesion.limpiarTelefono(cita.telefono)
  });
  if (!resultado.valida) {
    if (resultado.codigo !== "almacenamiento") {
      paso = 2;
      mostrarPaso();
    }
    avisarAgenda(resultado.mensaje);
    document.getElementById("agendar-aviso").focus();
    return;
  }

  // La confirmación solo se muestra después de comprobar y guardar la reserva.
  avisarAgenda("");
  document.getElementById("cabecera-pasos").classList.add("oculto");
  document.getElementById("agendar").classList.add("oculto");
  document.getElementById("vista-lista").classList.remove("oculto");

  const dia = new Date(cita.fecha + "T00:00")
    .toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }).replace(",", "");
  document.getElementById("confirmacion-texto").textContent =
    `${cita.nombre.trim()}, te esperamos el ${dia} a las ${cita.hora} en ${cita.sucursal.nombre} ` +
    `para tu ${cita.servicio.nombre.toLowerCase()}` +
    (cita.diseno.id ? ` con ${cita.diseno.nombre.toLowerCase()}` : "") +
    (cita.empleada.id ? ` con ${cita.empleada.nombre}` : "") + ".";

  document.getElementById("confirmacion-folio").textContent = "Folio " + folio;

  // Con cuenta, la cita también queda en "Mis citas"; sin cuenta, los
  // cambios se piden por teléfono y la empleada los hace desde su panel
  document.getElementById("confirmacion-cambios").textContent = sesion
    ? "También la encuentras en Mis citas, donde puedes reprogramarla o cancelarla."
    : "Si necesitas cambiarla o cancelarla, llama al +52 81 4621 0094 y da tu folio.";

}

/* --- Si hay sesión, se rellenan los datos de contacto --------- */
function rellenarDesdeSesion() {
  const sesion = Sesion.actual();
  if (!sesion) return;
  const campos = { nombre: sesion.nombre, telefono: sesion.telefono };
  Object.keys(campos).forEach(id => {
    const input = document.getElementById(id);
    if (!input.value) {
      input.value = campos[id];
      cita[id] = campos[id];
    }
  });
}

/* --- El personal no agenda: se muestra un aviso -------------- */
// Solo oculta la vista; en la versión real, el servidor también
// rechazaría una cita creada desde una cuenta de personal.
function revisarRol() {
  const personal = Sesion.esPersonal();
  const enConfirmacion = !document.getElementById("vista-lista").classList.contains("oculto");

  document.getElementById("agendar-personal").classList.toggle("oculto", !personal);
  document.getElementById("cabecera-pasos").classList.toggle("oculto", personal || enConfirmacion);
  document.getElementById("agendar").classList.toggle("oculto", personal || enConfirmacion);
  if (personal) document.getElementById("agendar-ir-panel").href = Sesion.panelPropio();
}

// también si inicia o cierra sesión a mitad del agendado
document.addEventListener("sesion:cambio", () => {
  rellenarDesdeSesion();
  revisarRol();
});

/* --- Eventos -------------------------------------------------- */
document.getElementById("boton-siguiente").addEventListener("click", () => {
  if (!pasoValido()) return;
  if (paso === 3) { confirmar(); return; }
  paso++;
  mostrarPaso();
});

document.getElementById("boton-atras").addEventListener("click", () => {
  avisarAgenda("");
  paso--;
  mostrarPaso();
});

document.getElementById("fecha").addEventListener("change", e => {
  cita.fecha = e.target.value;
  avisarAgenda("");
  pintarHoras();     // cada día tiene sus propios bloques libres
  pintarResumen();
});

// Al volver a la pestaña o cambiar datos desde otra, la selección se revisa.
function actualizarAgenda() {
  if (paso < 2 || !document.getElementById("vista-lista").classList.contains("oculto")) return;
  const resultado = cita.hora ? Sesion.validarCita(datosDeHorario()) : null;
  if (resultado && !resultado.valida) paso = 2;
  pintarPaso();
  pintarResumen();
  if (resultado && !resultado.valida) {
    mostrarPaso();
    avisarAgenda(resultado.mensaje);
  }
}
document.addEventListener("agenda:cambio", actualizarAgenda);
window.addEventListener("focus", actualizarAgenda);

document.getElementById("nombre").addEventListener("input", e => {
  cita.nombre = e.target.value;
});

document.getElementById("telefono").addEventListener("input", e => {
  cita.telefono = e.target.value;
});

document.querySelectorAll("#op-pago .opcion").forEach(boton => {
  boton.addEventListener("click", () => {
    cita.pago = boton.dataset.pago;
    pintarPaso();
  });
});

/* --- Arranque -------------------------------------------------- */
leerParametros();
rellenarDesdeSesion();
revisarRol();
// la fecha no puede ser anterior a hoy (fecha local, no UTC)
document.getElementById("fecha").min = fechaISO();
mostrarPaso();
