/* ============================================================
   admin-catalogo.js — Precios, duraciones y tonos disponibles
   Equivale a Administrador.gestionarServicio() y
   gestionarCatalogo(), y a Servicio.actualizarPrecio().
   Los cambios se guardan con Sesion.guardarCatalogo() y se
   aplican en todo el sitio al cargar cualquier página.
   ============================================================ */

// Límites razonables para no guardar valores absurdos por error
const LIMITES = {
  precio:        { min: 50, max: 5000 },
  duracion:      { min: 15, max: 300 },
  costoExtra:    { min: 0,  max: 2000 },
  duracionExtra: { min: 0,  max: 120 }
};

/* --- Dibujo -------------------------------------------------- */
// Campo numérico con su etiqueta (oculta a la vista, no al lector de pantalla)
function campoNumero(id, etiqueta, valor, campo) {
  const limite = LIMITES[campo];
  return `
    <label class="solo-lector" for="${id}">${escaparHTML(etiqueta)}</label>
    <input type="number" id="${id}" inputmode="numeric" step="1"
           min="${limite.min}" max="${limite.max}" value="${valor}"
           data-campo="${campo}" data-etiqueta="${escaparHTML(etiqueta)}">`;
}

function pintarCatalogo() {
  document.getElementById("tabla-servicios").innerHTML = SERVICIOS.map(s => `
    <tr data-id="${s.id}">
      <th scope="row">${escaparHTML(s.nombre)}</th>
      <td>${campoNumero(`servicio-${s.id}-precio`,   `Precio de ${s.nombre}`,   s.precio,   "precio")}</td>
      <td>${campoNumero(`servicio-${s.id}-duracion`, `Duración de ${s.nombre}`, s.duracion, "duracion")}</td>
    </tr>`).join("");

  // "Sin diseño" (id 0) no tiene costo ni tiempo que editar
  document.getElementById("tabla-disenos").innerHTML = DISENOS.filter(d => d.id !== 0).map(d => `
    <tr data-id="${d.id}">
      <th scope="row">${escaparHTML(d.nombre)}</th>
      <td>${campoNumero(`diseno-${d.id}-costo`,  `Costo extra de ${d.nombre}`,  d.costoExtra,    "costoExtra")}</td>
      <td>${campoNumero(`diseno-${d.id}-tiempo`, `Tiempo extra de ${d.nombre}`, d.duracionExtra, "duracionExtra")}</td>
    </tr>`).join("");

  pintarTonos();
}

function pintarTonos() {
  document.getElementById("tonos-admin").innerHTML = COLORES.map(c => `
    <button class="tono-admin ${c.disponible ? "" : "tono-admin--agotado"}" type="button" data-id="${c.id}">
      <span class="tono-admin__muestra" style="background:${c.hex}" aria-hidden="true"></span>
      <span class="tono-admin__nombre">${escaparHTML(c.nombre)}</span>
      <span class="tono-admin__estado">${c.disponible ? "Disponible" : "Agotado"}</span>
    </button>`).join("");
}

/* --- Guardar tablas de precios ------------------------------- */
// Valida cada número de la tabla; si todo está bien, guarda fila por fila
function guardarTabla(form, seccion) {
  const aviso = form.querySelector(".aviso");
  let primerError = null;
  const cambios = [];

  form.querySelectorAll("tr[data-id]").forEach(fila => {
    const campos = {};
    fila.querySelectorAll("input").forEach(input => {
      const limite = LIMITES[input.dataset.campo];
      const valor  = Number(input.value);
      const valido = input.value !== "" && Number.isInteger(valor) &&
                     valor >= limite.min && valor <= limite.max;

      // mismas clases de error que el resto del sitio
      input.closest("td").classList.toggle("campo--invalido", !valido);
      if (valido) input.removeAttribute("aria-invalid");
      else input.setAttribute("aria-invalid", "true");

      if (!valido && !primerError) primerError = { input, limite };
      campos[input.dataset.campo] = valor;
    });
    cambios.push({ id: Number(fila.dataset.id), campos });
  });

  aviso.classList.remove("aviso--exito");
  if (primerError) {
    const { input, limite } = primerError;
    aviso.textContent = `Revisa los campos marcados: ${input.dataset.etiqueta} debe ser un número entero ` +
                        `entre ${limite.min} y ${limite.max}.`;
    input.focus();
    return;
  }

  cambios.forEach(c => Sesion.guardarCatalogo(seccion, c.id, c.campos));
  aviso.classList.add("aviso--exito");
  aviso.textContent = "Guardamos los cambios. Ya se ven en el sitio.";
}

document.getElementById("form-servicios").addEventListener("submit", e => {
  e.preventDefault();
  guardarTabla(e.target, "servicios");
});

document.getElementById("form-disenos").addEventListener("submit", e => {
  e.preventDefault();
  guardarTabla(e.target, "disenos");
});

/* --- Tonos: agotado / disponible ----------------------------- */
// Se guarda al momento; el foco se queda en el mismo tono
document.getElementById("tonos-admin").addEventListener("click", e => {
  const boton = e.target.closest(".tono-admin");
  if (!boton) return;

  const color = COLORES.find(c => c.id === Number(boton.dataset.id));
  Sesion.guardarCatalogo("colores", color.id, { disponible: !color.disponible });

  pintarTonos();
  document.querySelector(`.tono-admin[data-id="${color.id}"]`).focus();
  document.getElementById("tonos-aviso").textContent =
    `${color.nombre} quedó como ${color.disponible ? "disponible" : "agotado"}.`;
});

/* --- Arranque ------------------------------------------------ */
iniciarPanel(pintarCatalogo, "administradora");
