/* ============================================================
   mi-perfil.js — Datos personales y cambio de contraseña
   Las reglas de validación son las mismas del registro
   (vienen de sesion.js), así no se repiten.
   ============================================================ */

const formDatos = document.getElementById("form-datos");
const formClave = document.getElementById("form-clave");

// Reglas de esta página: las del registro más las de contraseña
const REGLAS_PERFIL = {
  nombre:   Sesion.reglas.nombre,
  telefono: Sesion.reglas.telefono,
  correo:   Sesion.reglas.correo,
  actual:   v => v ? "" : "Escribe tu contraseña actual.",
  nueva:    v => {
    const error = Sesion.reglas.contrasena(v);
    if (error) return error;
    return v === document.getElementById("clave-actual").value
      ? "La contraseña nueva debe ser distinta a la actual." : "";
  }
};

/* --- Dibujo -------------------------------------------------- */
function pintarPerfil() {
  const cuenta = Sesion.cuentaActual();
  if (!cuenta) return;

  document.getElementById("perfil-nombre").value   = cuenta.nombre;
  document.getElementById("perfil-telefono").value = cuenta.telefono;
  document.getElementById("perfil-correo").value   = cuenta.correo;
  document.getElementById("clave-usuario").value   = cuenta.correo;
}

/* --- Validación (mismas clases que el resto del sitio) ------- */
function marcar(input, mensaje) {
  const campo = input.closest(".campo");
  campo.classList.toggle("campo--invalido", Boolean(mensaje));
  campo.querySelector(".campo__error").textContent = mensaje;
  if (mensaje) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

function validarCampo(input) {
  const mensaje = REGLAS_PERFIL[input.dataset.regla](input.value);
  marcar(input, mensaje);
  return !mensaje;
}

// Valida todo el formulario y lleva el foco al primer error
function validarFormulario(form) {
  let primerError = null;
  form.querySelectorAll("[data-regla]").forEach(input => {
    if (!validarCampo(input) && !primerError) primerError = input;
  });
  if (primerError) primerError.focus();
  return !primerError;
}

function avisar(form, mensaje, esExito) {
  const aviso = form.querySelector(".aviso");
  aviso.textContent = mensaje;
  aviso.classList.toggle("aviso--exito", Boolean(esExito));
}

// Un error marcado se revisa de nuevo mientras se corrige
[formDatos, formClave].forEach(form => {
  form.addEventListener("input", e => {
    if (e.target.closest(".campo--invalido")) validarCampo(e.target);
    avisar(form, "");
  });
});

/* --- Guardar datos personales -------------------------------- */
formDatos.addEventListener("submit", e => {
  e.preventDefault();
  avisar(formDatos, "");
  if (!validarFormulario(formDatos)) return;

  const cuenta = Sesion.cuentaActual();
  if (!cuenta) return;

  const campoTelefono = document.getElementById("perfil-telefono");
  const campoCorreo   = document.getElementById("perfil-correo");

  // El correo y el teléfono no pueden ser de otra cuenta
  if (Sesion.existeOtraCuenta("correo", campoCorreo.value, cuenta.id)) {
    marcar(campoCorreo, "Este correo ya está en otra cuenta.");
    campoCorreo.focus();
    return;
  }
  if (Sesion.existeOtraCuenta("telefono", campoTelefono.value, cuenta.id)) {
    marcar(campoTelefono, "Este teléfono ya está en otra cuenta.");
    campoTelefono.focus();
    return;
  }

  // Actualiza la cuenta, la sesión y el nombre en la barra
  Sesion.guardarCuenta({
    ...cuenta,
    nombre:   document.getElementById("perfil-nombre").value.trim(),
    telefono: Sesion.limpiarTelefono(campoTelefono.value),
    correo:   campoCorreo.value.trim().toLowerCase()
  });

  avisar(formDatos, "Guardamos tus cambios.", true);
});

/* --- Cambiar contraseña -------------------------------------- */
formClave.addEventListener("submit", e => {
  e.preventDefault();
  avisar(formClave, "");
  if (!validarFormulario(formClave)) return;

  const cuenta = Sesion.cuentaActual();
  if (!cuenta) return;

  const actual = document.getElementById("clave-actual");
  if (actual.value !== cuenta.contrasena) {
    marcar(actual, "La contraseña actual no es correcta.");
    actual.select();
    return;
  }

  Sesion.guardarCuenta({ ...cuenta, contrasena: document.getElementById("clave-nueva").value });

  formClave.reset();
  document.getElementById("clave-usuario").value = cuenta.correo;   // reset() también lo vacía
  formClave.querySelectorAll(".acceso__ver").forEach(boton => alternarContrasena(boton, false));
  avisar(formClave, "Tu contraseña se cambió. Úsala la próxima vez que inicies sesión.", true);
});

/* --- Mostrar u ocultar contraseña ---------------------------- */
function alternarContrasena(boton, mostrar) {
  const campo = document.getElementById(boton.getAttribute("aria-controls"));
  campo.type = mostrar ? "text" : "password";
  boton.textContent = mostrar ? "Ocultar" : "Mostrar";
}

formClave.querySelectorAll(".acceso__ver").forEach(boton => {
  boton.addEventListener("click", () => {
    const campo = document.getElementById(boton.getAttribute("aria-controls"));
    alternarContrasena(boton, campo.type === "password");
  });
});

/* --- Arranque ------------------------------------------------ */
iniciarPanel(pintarPerfil, "cliente");
