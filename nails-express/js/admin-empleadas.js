/* ============================================================
   admin-empleadas.js — Alta, edición y activación de empleadas
   Solo la administradora crea cuentas de personal: el registro
   público del sitio siempre crea clientas.
   Una empleada desactivada deja de aparecer al agendar y no puede
   entrar, pero sus citas pasadas y su historial se conservan.
   ============================================================ */

const ventana = document.getElementById("ventana-empleada");
const formEmpleada = document.getElementById("form-empleada");
const avisoPagina = document.getElementById("empleadas-aviso");

let editandoId    = null;   // null = agregando una nueva
let porDesactivar = null;   // id de la fila que pide confirmación

/* --- Reglas de validación ------------------------------------ */
// Nombre, correo y teléfono usan las mismas reglas del registro
const REGLAS_EMPLEADA = {
  nombre:   Sesion.reglas.nombre,
  correo:   Sesion.reglas.correo,
  telefono: Sesion.reglas.telefono,
  sucursal: v => v ? "" : "Elige la sucursal donde trabaja.",
  comision: v => {
    const n = Number(v);
    return v !== "" && Number.isInteger(n) && n >= 0 && n <= 100
      ? "" : "Escribe un porcentaje entero entre 0 y 100.";
  },
  especialidades: () => especialidadesElegidas().length
    ? "" : "Marca al menos un servicio que sepa hacer."
};

function especialidadesElegidas() {
  return Array.from(formEmpleada.querySelectorAll('input[name="especialidad"]:checked'))
    .map(casilla => casilla.value);
}

/* --- Lista de empleadas -------------------------------------- */
// Citas que todavía no ocurren y siguen asignadas a ella
function citasProximasDe(id) {
  const ahora = new Date();
  return Sesion.citas().filter(c => c.empleadaId === id && c.estado !== "cancelada" &&
    new Date(c.fecha + "T" + c.hora) >= ahora).length;
}

function pintarEmpleadas() {
  // primero las activas, luego por nombre
  const lista = Sesion.cuentasDeEmpleadas()
    .sort((a, b) => (b.activa - a.activa) || a.nombre.localeCompare(b.nombre, "es"));

  document.getElementById("tabla-empleadas").innerHTML = lista.length
    ? lista.map(filaEmpleada).join("")
    : `<tr><td colspan="6" class="tabla__vacia">Todavía no hay empleadas registradas.</td></tr>`;
}

function filaEmpleada(e) {
  const nombre = escaparHTML(e.nombre);
  let acciones;

  if (porDesactivar === e.id) {
    // Confirmación en la misma fila, igual que al cancelar una cita
    const proximas = citasProximasDe(e.id);
    acciones = `
      <p class="cita__pregunta" id="pregunta-${e.id}">¿Desactivar a ${nombre}?
        ${proximas ? `Tiene ${proximas} cita${proximas > 1 ? "s" : ""} próxima${proximas > 1 ? "s" : ""}: seguirán a su nombre y habrá que reasignarlas o avisar a las clientas.` : ""}</p>
      <button class="boton boton--peligro" type="button" data-accion="confirmar-desactivar"
              aria-describedby="pregunta-${e.id}">Sí, desactivar</button>
      <button class="boton boton--secundario" type="button" data-accion="mantener">No</button>`;
  } else {
    acciones = `
      <button class="boton boton--secundario" type="button" data-accion="editar">
        Editar<span class="solo-lector"> a ${nombre}</span></button>
      <button class="boton boton--secundario" type="button" data-accion="${e.activa ? "desactivar" : "activar"}">
        ${e.activa ? "Desactivar" : "Activar"}<span class="solo-lector"> a ${nombre}</span></button>`;
  }

  return `
    <tr data-id="${e.id}" class="${e.activa ? "" : "tabla__fila--apagada"}">
      <th scope="row">
        ${nombre}
        <span class="tabla__secundario">${escaparHTML(e.correo)} · ${escaparHTML(e.telefono)}</span>
      </th>
      <td>${escaparHTML(nombreSucursal(e.sucursal))}</td>
      <td>${escaparHTML(e.especialidades.join(", "))}</td>
      <td class="tabla__numero">${e.porcentajeComision}%</td>
      <td><span class="estado estado--${e.activa ? "confirmada" : "cancelada"}">${e.activa ? "Activa" : "Inactiva"}</span></td>
      <td class="tabla__acciones">${acciones}</td>
    </tr>`;
}

function avisar(mensaje) {
  avisoPagina.textContent = mensaje;
  avisoPagina.focus();
}

/* --- Acciones de cada fila ----------------------------------- */
document.getElementById("tabla-empleadas").addEventListener("click", e => {
  const boton = e.target.closest("[data-accion]");
  if (!boton) return;
  const id = Number(boton.closest("tr").dataset.id);
  const enFila = selector => document.querySelector(`tr[data-id="${id}"] ${selector}`);
  const cuenta = Sesion.cuenta(id);

  switch (boton.dataset.accion) {
    case "editar":
      abrirVentana(id);
      break;

    case "desactivar":
      porDesactivar = id;
      pintarEmpleadas();
      enFila('[data-accion="mantener"]').focus();   // la opción segura
      break;

    case "mantener":
      porDesactivar = null;
      pintarEmpleadas();
      enFila('[data-accion="desactivar"]').focus();
      break;

    case "confirmar-desactivar":
      porDesactivar = null;
      Sesion.guardarCuenta({ ...cuenta, activa: false });   // vuelve a dibujar la tabla
      avisar(`${cuenta.nombre} quedó desactivada: ya no aparece al agendar ni puede entrar a su panel.`);
      break;

    case "activar":
      Sesion.guardarCuenta({ ...cuenta, activa: true });
      avisar(`${cuenta.nombre} está activa otra vez.`);
      break;
  }
});

/* --- Ventana de alta y edición ------------------------------- */
function llenarOpciones() {
  document.getElementById("empleada-sucursal").innerHTML =
    `<option value="">Elige una sucursal</option>` +
    SUCURSALES.map(s => `<option value="${s.id}">${escaparHTML(s.nombre)}</option>`).join("");

  document.getElementById("empleada-especialidades-lista").innerHTML = SERVICIOS.map(s => `
    <label class="casilla">
      <input type="checkbox" name="especialidad" value="${escaparHTML(s.nombre)}">
      ${escaparHTML(s.nombre)}
    </label>`).join("");
}

// Marca o limpia el error de un campo (input, select o el grupo de casillas)
function marcar(elemento, mensaje) {
  const campo = elemento.closest(".campo");
  campo.classList.toggle("campo--invalido", Boolean(mensaje));
  campo.querySelector(".campo__error").textContent = mensaje;
  if (mensaje) elemento.setAttribute("aria-invalid", "true");
  else elemento.removeAttribute("aria-invalid");
}

function validarCampo(elemento) {
  const mensaje = REGLAS_EMPLEADA[elemento.dataset.regla](elemento.value || "");
  marcar(elemento, mensaje);
  return !mensaje;
}

function abrirVentana(id) {
  editandoId = id;
  formEmpleada.reset();
  formEmpleada.querySelectorAll("[data-regla]").forEach(el => marcar(el, ""));
  formEmpleada.querySelector(".aviso").textContent = "";

  const cuenta = id ? Sesion.cuenta(id) : null;
  document.getElementById("ventana-titulo").textContent = cuenta ? `Editar a ${cuenta.nombre}` : "Agregar empleada";
  document.getElementById("empleada-guardar").textContent = cuenta ? "Guardar cambios" : "Crear cuenta";

  if (cuenta) {
    document.getElementById("empleada-nombre").value   = cuenta.nombre;
    document.getElementById("empleada-correo").value   = cuenta.correo;
    document.getElementById("empleada-telefono").value = cuenta.telefono;
    document.getElementById("empleada-sucursal").value = cuenta.sucursal || "";
    document.getElementById("empleada-comision").value = cuenta.porcentajeComision || 0;
    formEmpleada.querySelectorAll('input[name="especialidad"]').forEach(casilla => {
      casilla.checked = (cuenta.especialidades || []).includes(casilla.value);
    });
  } else {
    document.getElementById("empleada-comision").value = 40;   // comisión habitual del salón
  }

  ventana.showModal();
  document.getElementById("empleada-nombre").focus();
}

// Contraseña temporal sin letras que se confundan (0/O, 1/l/I)
function contrasenaTemporal() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const azar = new Uint32Array(10);
  crypto.getRandomValues(azar);
  return Array.from(azar, n => letras[n % letras.length]).join("");
}

formEmpleada.addEventListener("submit", e => {
  e.preventDefault();

  // Valida todo y lleva el foco al primer error
  let primerError = null;
  formEmpleada.querySelectorAll("[data-regla]").forEach(el => {
    if (!validarCampo(el) && !primerError) primerError = el;
  });
  if (primerError) {
    (primerError.tagName === "FIELDSET" ? primerError.querySelector("input") : primerError).focus();
    return;
  }

  // Correo y teléfono no pueden repetirse con ninguna otra cuenta (de nadie)
  const campoCorreo   = document.getElementById("empleada-correo");
  const campoTelefono = document.getElementById("empleada-telefono");
  if (Sesion.existeOtraCuenta("correo", campoCorreo.value, editandoId)) {
    marcar(campoCorreo, "Este correo ya pertenece a otra cuenta.");
    campoCorreo.focus();
    return;
  }
  if (Sesion.existeOtraCuenta("telefono", campoTelefono.value, editandoId)) {
    marcar(campoTelefono, "Este teléfono ya pertenece a otra cuenta.");
    campoTelefono.focus();
    return;
  }

  const datos = {
    nombre:             document.getElementById("empleada-nombre").value.trim(),
    correo:             campoCorreo.value.trim().toLowerCase(),
    telefono:           Sesion.limpiarTelefono(campoTelefono.value),
    sucursal:           Number(document.getElementById("empleada-sucursal").value),
    porcentajeComision: Number(document.getElementById("empleada-comision").value),
    especialidades:     especialidadesElegidas()
  };

  ventana.close();

  if (editandoId) {
    Sesion.guardarCuenta({ ...Sesion.cuenta(editandoId), ...datos });
    avisar(`Guardamos los cambios de ${datos.nombre}.`);
  } else {
    // Cuenta nueva: siempre empleada y activa, con contraseña temporal
    const contrasena = contrasenaTemporal();
    Sesion.guardarCuenta({ id: Date.now(), ...datos, contrasena, rol: "empleada", activa: true });
    avisar(`Creamos la cuenta de ${datos.nombre}. Su contraseña temporal es ${contrasena}. ` +
           `Compártela en persona; no se volverá a mostrar.`);
  }
});

// Un error marcado se revisa de nuevo mientras se corrige
formEmpleada.addEventListener("input", e => {
  const elemento = e.target.closest("[data-regla]");
  if (elemento && elemento.closest(".campo--invalido")) validarCampo(elemento);
});
formEmpleada.addEventListener("change", e => {
  const grupo = e.target.closest("fieldset[data-regla]");
  if (grupo && grupo.classList.contains("campo--invalido")) validarCampo(grupo);
});

/* --- Abrir y cerrar la ventana ------------------------------- */
document.getElementById("empleada-nueva").addEventListener("click", () => abrirVentana(null));
document.getElementById("ventana-cerrar").addEventListener("click", () => ventana.close());

// Clic en el fondo cierra (solo si el clic empezó en el fondo). Escape lo resuelve <dialog>.
let clicEmpezoEnFondo = false;
ventana.addEventListener("mousedown", e => { clicEmpezoEnFondo = e.target === ventana; });
ventana.addEventListener("click", e => {
  if (clicEmpezoEnFondo && e.target === ventana) ventana.close();
});

/* --- Arranque ------------------------------------------------ */
llenarOpciones();
iniciarPanel(pintarEmpleadas, "administradora");
