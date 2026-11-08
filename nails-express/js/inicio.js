/* ============================================================
   inicio.js — Comportamiento de la página principal
   ============================================================ */


   // Diseños recibidos desde MySQL para la portada.
let disenosPortada = [];

// Correspondencia temporal: ID de MySQL → ID del agendado de ejemplo.
// Se retirará cuando el agendado también consulte los diseños de MySQL.
const ID_DISENO_AGENDADO = {
  1: 0, // Sin diseño
  2: 1, // Francés clásico
  3: 2, // Francés con glitter
  4: 3, // Ojo de gato
  5: 4, // Piedritas
  6: 5  // Efecto mármol
};

/* --- Catálogo de tonos --------------------------------------- */
let familiaActiva = "todos";

function pintarFiltros() {
  const cont = document.getElementById("filtros");
  cont.innerHTML = FAMILIAS.map(f => `
    <button class="filtro" type="button"
            data-familia="${f.id}"
            aria-pressed="${f.id === familiaActiva}">${f.nombre}</button>
  `).join("");

  cont.querySelectorAll(".filtro").forEach(boton => {
    boton.addEventListener("click", () => {
      familiaActiva = boton.dataset.familia;
      pintarFiltros();
      pintarTonos();
    });
  });
}

function pintarTonos() {
  const lista = familiaActiva === "todos"
    ? COLORES
    : COLORES.filter(c => c.familia === familiaActiva);

  document.getElementById("tonos").innerHTML = lista.map(c => `
    <button class="tono ${c.disponible ? "" : "tono--agotado"}"
            type="button" data-id="${c.id}" ${c.disponible ? "" : "disabled"}>
      <div class="tono__muestra" style="background:${c.hex}"></div>
      <div class="tono__nombre">${c.nombre}</div>
      <div class="tono__marca">${c.marca}</div>
      ${c.disponible ? "" : '<div class="tono__etiqueta">Agotado por ahora</div>'}
    </button>
  `).join("");

  document.querySelectorAll(".tono").forEach(boton => {
    boton.addEventListener("click", () => abrirDetalle(Number(boton.dataset.id)));
  });
}

/* --- Ventana de detalle de un tono --------------------------- */
const dialogo = document.getElementById("detalle");

function abrirDetalle(idColor) {
  const color = COLORES.find(c => c.id === idColor);
  if (!color) return;

  document.getElementById("detalle-muestra").style.background = color.hex;
  document.getElementById("detalle-nombre").textContent = color.nombre;
  document.getElementById("detalle-datos").textContent =
    `${color.marca} · ${color.hex}`;

  // Los diseños aplican a cualquier tono; se omite "Sin diseño"
  document.getElementById("detalle-disenos").innerHTML = disenosPortada
  .filter(d => !d.sinDiseno)
    .map(d => `
      <div class="diseno">
        <strong>${textoSeguro(d.nombre)}</strong>
        <span>+${pesos(d.costoExtra)} · +${d.duracionExtra} min</span>
      </div>
    `).join("");

  // El tono elegido viaja a la página de agendado
  document.getElementById("detalle-agendar").href = `agendar.html?color=${color.id}`;

  dialogo.showModal();
}

document.getElementById("detalle-cerrar")
  .addEventListener("click", () => dialogo.close());

// cerrar al hacer clic fuera de la ventana
dialogo.addEventListener("click", evento => {
  if (evento.target === dialogo) dialogo.close();
});

   // Evita interpretar el texto recibido como etiquetas HTML.
  function textoSeguro(valor) {
  const elemento = document.createElement("span");
  elemento.textContent = valor ?? ""; //textContent escapa caracteres especiales, para evitar inyección de HTML
  return elemento.innerHTML; //aqui se devuelve el contenido seguro como HTML
}

/* --- Tarjetas de servicio ------------------------------------ */
function pintarServicios() {
  document.getElementById("servicios").innerHTML = SERVICIOS.map(s => `
    <article class="servicio">
      <h3>${textoSeguro(s.nombre)}</h3>
      <p>${textoSeguro(s.descripcion)}</p>
      <div class="servicio__precio">desde ${pesos(s.precio)}</div>
      <div class="servicio__dato">${s.duracion} minutos</div>
      <a class="boton boton--secundario" style="margin-top:1.2rem"
         href="agendar.html?servicio=${s.id}">Elegir este servicio</a>
    </article>
  `).join("");
}

/* --- Cotizador ------------------------------------------------ */
function iniciarCotizador() {
  const selServicio = document.getElementById("cot-servicio");
  const selDiseno   = document.getElementById("cot-diseno");

  selServicio.innerHTML = SERVICIOS
    .map(s => `<option value="${Number(s.id)}">${textoSeguro(s.nombre)} — ${pesos(s.precio)}</option>`).join("");
  selDiseno.innerHTML = disenosPortada
  .map(d => `<option value="${Number(d.id)}">${textoSeguro(d.nombre)}${d.costoExtra ? " — +" + pesos(d.costoExtra) : ""}</option>`).join("");

  function recalcular() {
    const servicio = SERVICIOS.find(s => s.id === Number(selServicio.value));
    const diseno = disenosPortada.find(d => d.id === Number(selDiseno.value)
);
    document.getElementById("cot-total").textContent = pesos(calcularTotal(servicio, diseno));
    document.getElementById("cot-precio-servicio").textContent = pesos(servicio.precio);
    document.getElementById("cot-precio-diseno").textContent =
      diseno.costoExtra ? "+" + pesos(diseno.costoExtra) : "—";
    document.getElementById("cot-duracion").textContent =
      calcularDuracion(servicio, diseno) + " min";

    // El agendado aún usa los IDs de ejemplo.
const idParaAgendar = ID_DISENO_AGENDADO[diseno.id];

document.getElementById("cot-agendar").href =
  `agendar.html?servicio=${servicio.id}&diseno=${idParaAgendar}`;
  }

  selServicio.addEventListener("change", recalcular);
  selDiseno.addEventListener("change", recalcular);
  recalcular();
}

/* --- Sucursales ----------------------------------------------- */
function pintarSucursales() {
  document.getElementById("sucursales-lista").innerHTML = SUCURSALES.map(s => `
    <article class="sucursal">
      <h3>${s.nombre}</h3>
      <p class="sucursal__dato">${s.direccion}</p>
      <p class="sucursal__dato">Todos los días de ${s.apertura} a ${s.cierre}</p>
      <a class="boton boton--secundario" style="margin-top:1.2rem"
         href="agendar.html?sucursal=${s.id}">Agendar aquí</a>
    </article>
  `).join("");
}

/* --- Arranque -------------------------------------------------- */
pintarFiltros();
pintarTonos();
pintarSucursales();

// Los servicios y el cotizador esperan la respuesta de PHP.
async function cargarServiciosDesdeBD() {
  const contenedor = document.getElementById("servicios");
  const cotizador = document.querySelector(".cotizador");

  contenedor.textContent = "Cargando servicios y diseños...";
  cotizador.style.display = "none";

  try {
    // La ruta sube una carpeta y entra al backend.
    const respuesta = await fetch(
      "../nails-express_backend/servicios.php"
    );

    if (!respuesta.ok) {
      throw new Error("No se pudieron consultar los servicios.");
    }

    const serviciosBD = await respuesta.json();

    if (!Array.isArray(serviciosBD) || serviciosBD.length === 0) {
      throw new Error("No hay servicios disponibles para mostrar.");
    }

    // Esperamos también los diseños antes de iniciar el cotizador.
const respuestaDisenos = await fetch(
  "../nails-express_backend/disenos.php"
);

if (!respuestaDisenos.ok) {
  throw new Error("No se pudieron consultar los diseños.");
}

const disenosBD = await respuestaDisenos.json();

if (
  !Array.isArray(disenosBD) ||
  disenosBD.length === 0 ||
  !disenosBD.some(diseno => diseno.sinDiseno)
) {
  throw new Error("El catálogo debe incluir la opción Sin diseño.");
}

disenosPortada = disenosBD;

    // Sustituye el contenido del arreglo que ya utiliza la página.
    SERVICIOS.splice(0, SERVICIOS.length, ...serviciosBD);



    // Primero llegan los datos; después dibujamos y calculamos.
    pintarServicios();
    iniciarCotizador();

    cotizador.style.display = "";

  } catch (error) {
    console.error(error);
    contenedor.textContent =
      "No se pudieron cargar los servicios y diseños. Intenta recargar la página.";
  }
}

cargarServiciosDesdeBD();
