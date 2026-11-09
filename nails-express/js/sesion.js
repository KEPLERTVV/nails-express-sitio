/* ============================================================
   sesion.js — Modal de acceso y estado de sesión en la barra
   Se enlaza en todas las páginas, después de datos.js.
   Mientras no haya servidor, la sesión vive en localStorage.
   Todo va dentro de una función para no chocar con los nombres
   de inicio.js y agendar.js (dialogo, marcar, etc.).
   ============================================================ */

(function () {

  const CLAVE_SESION  = "nailsExpress.sesion";
  const CLAVE_CUENTAS = "nailsExpress.cuentas";   // cuentas creadas o editadas desde el sitio
  const CLAVE_CITAS   = "nailsExpress.citas";     // citas agendadas o modificadas desde el sitio
  const CLAVE_DISPONIBILIDAD = "nailsExpress.disponibilidad";  // bloques cerrados por empleada
  const CLAVE_SOLICITUDES_DISPONIBILIDAD = "nailsExpress.solicitudesDisponibilidad";
  const CLAVE_CATALOGO = "nailsExpress.catalogo";  // precios, duraciones y tonos editados por la administradora
  const CLAVE_VERSION = "nailsExpress.version";   // versión del formato de lo guardado
  const VERSION_DATOS = 2;

  // Cómo se nombra cada rol bajo el nombre del usuario en la barra
  const ETIQUETAS_ROL = {
    cliente:        "Clienta",
    empleada:       "Empleada",
    administradora: "Administradora"
  };

  // Opciones del menú del usuario según su rol
  const MENUS = {
    cliente: [
      { texto: "Mis citas", href: "mis-citas.html" },
      { texto: "Mi perfil", href: "mi-perfil.html" }
    ],
    empleada: [
      { texto: "Mi agenda",      href: "panel-empleada.html" },
      { texto: "Disponibilidad", href: "disponibilidad.html" }
    ],
    administradora: [
      { texto: "Agenda general", href: "panel-admin.html" },
      { texto: "Solicitudes de disponibilidad", href: "admin-disponibilidad.html" },
      { texto: "Ingresos",       href: "admin-ingresos.html" },
      { texto: "Catálogo",       href: "admin-catalogo.html" },
      { texto: "Empleadas",      href: "admin-empleadas.html" }
    ]
  };

  // A dónde va cada rol al entrar. Los paneles todavía no existen:
  // cuando se creen, basta con que tengan estos nombres de archivo.
  // La clienta no aparece aquí porque se queda en la página actual.
  const DESTINOS = {
    empleada:       "panel-empleada.html",
    administradora: "panel-admin.html"
  };

  const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* --- Almacenamiento ------------------------------------------ */
  // localStorage puede fallar (modo privado, datos bloqueados);
  // cada acceso va protegido para que el sitio siga funcionando.
  function leer(clave, porDefecto) {
    try {
      const valor = localStorage.getItem(clave);
      return valor ? JSON.parse(valor) : porDefecto;
    } catch (e) {
      return porDefecto;
    }
  }

  function guardar(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (e) { return false; }
  }

  function borrar(clave) {
    try { localStorage.removeItem(clave); } catch (e) { /* sin almacenamiento */ }
  }

  // Une los datos de ejemplo con lo guardado en este navegador.
  // Lo guardado gana campo por campo: así una cuenta o cita de
  // ejemplo puede editarse (perfil, cancelación) sin tocar datos.js,
  // y si después datos.js agrega un campo nuevo (como especialidades),
  // también le llega a las copias guardadas antes de ese cambio.
  function unir(ejemplo, guardados, clave) {
    const unidos = ejemplo.map(original => {
      const guardado = guardados.find(g => g[clave] === original[clave]);
      return guardado ? { ...original, ...guardado } : original;
    });
    const nuevos = guardados.filter(g => !ejemplo.some(o => o[clave] === g[clave]));
    return unidos.concat(nuevos);
  }

  // Inserta o reemplaza un registro dentro de lo guardado
  function guardarRegistro(claveAlmacen, registro, clave) {
    const guardados = leer(claveAlmacen, []).filter(x => x[clave] !== registro[clave]);
    return guardar(claveAlmacen, guardados.concat(registro));
  }

  function todasLasCuentas() {
    return unir(USUARIOS, leer(CLAVE_CUENTAS, []), "id");
  }

  function todasLasCitas() {
    return unir(CITAS, leer(CLAVE_CITAS, []), "folio");
  }

  // Empleada o administradora (cualquier rol con menú propio que no sea cliente)
  function esRolPersonal(sesion) {
    return Boolean(sesion) && sesion.rol !== "cliente" && Boolean(MENUS[sesion.rol]);
  }

  // Copia en memoria de la cuenta confirmada por PHP.
  // La sesión real permanece en el servidor.
  let usuarioAutenticado = null;

  function sesionActual() {
    return usuarioAutenticado;
  }

  // Datos públicos de la cuenta que se guardan en la sesión
  function datosDeSesion(cuenta) {
    return {
      id:       cuenta.id,
      nombre:   cuenta.nombre,
      correo:   cuenta.correo,
      telefono: cuenta.telefono,
      rol:      cuenta.rol
    };
  }

  // Datos públicos de una empleada para el agendado y los paneles.
  // Se arman desde su cuenta, sin contraseña ni datos de contacto.
  function datosDeEmpleada(cuenta) {
    return {
      id:             cuenta.id,
      nombre:         cuenta.nombre,
      especialidades: cuenta.especialidades || [],
      sucursal:       cuenta.sucursal,
      activa:         cuenta.activa !== false,
      porcentajeComision: cuenta.porcentajeComision || 0
    };
  }

  function empleadasActivas() {
    return todasLasCuentas()
      .filter(c => c.rol === "empleada" && c.activa !== false)
      .map(datosDeEmpleada);
  }

  function contextoAgenda() {
    return {
      citas: todasLasCitas(), empleadas: empleadasActivas(),
      servicios: SERVICIOS, disenos: DISENOS, sucursales: SUCURSALES,
      horarios: HORARIOS, cerrados: disponibilidadCompleta()
    };
  }

  function disponibilidadCompleta() {
    const guardada = leer(CLAVE_DISPONIBILIDAD, {}) || {};
    const completa = {};
    Object.keys(guardada).forEach(id => {
      completa[id] = Object.fromEntries(Object.entries(guardada[id] || {})
        .map(([fecha, horas]) => [fecha, Array.isArray(horas) ? horas.slice() : []]));
    });
    solicitudesDisponibilidad()
      .filter(s => s.estado === "aceptada")
      .forEach(s => {
        if (!Array.isArray(s.horas)) return;
        completa[s.empleadaId] = completa[s.empleadaId] || {};
        completa[s.empleadaId][s.fecha] = Array.from(new Set([
          ...(completa[s.empleadaId][s.fecha] || []), ...s.horas
        ]));
      });
    return completa;
  }

  function solicitudesDisponibilidad() {
    const solicitudes = leer(CLAVE_SOLICITUDES_DISPONIBILIDAD, []);
    return Array.isArray(solicitudes) ? solicitudes : [];
  }

  function notificarCambioAgenda() {
    document.dispatchEvent(new CustomEvent("agenda:cambio"));
  }

  /* --- Catálogo editado por la administradora ------------------ */
  // Los cambios se guardan aparte, por id: { servicios: { 1: { precio: 400 } } }.
  // Al cargar cualquier página se aplican sobre SERVICIOS, DISENOS y
  // COLORES de datos.js, así la portada, el cotizador y el agendado
  // muestran siempre los precios y tonos vigentes.
  const LISTAS_CATALOGO = { servicios: SERVICIOS, disenos: DISENOS, colores: COLORES };

  function aplicarCatalogo() {
    const cambios = leer(CLAVE_CATALOGO, {});
    Object.keys(LISTAS_CATALOGO).forEach(seccion => {
      const porId = cambios[seccion] || {};
      LISTAS_CATALOGO[seccion].forEach(item => {
        if (porId[item.id]) Object.assign(item, porId[item.id]);
      });
    });
  }

  /* --- Reglas de validación ------------------------------------ */
  // El teléfono se compara sin espacios ni guiones
  function limpiarTelefono(texto) {
    return texto.replace(/[\s-]/g, "");
  }

  // Cada regla devuelve el mensaje de error, o "" si el valor es válido
  const REGLAS = {
    nombre: v => v.trim().length >= 3
      ? "" : "Escribe tu nombre completo (mínimo 3 caracteres).",
    telefono: v => /^\d{10}$/.test(limpiarTelefono(v))
      ? "" : "El teléfono debe tener 10 dígitos.",
    correo: v => CORREO_VALIDO.test(v.trim())
      ? "" : "Escribe un correo válido, por ejemplo nombre@correo.com.",
    contrasena: v => v.length >= 8
      ? "" : "La contraseña debe tener al menos 8 caracteres.",
    // En el acceso se acepta correo o teléfono en el mismo campo
    usuario: v => {
      const texto = v.trim();
      if (!texto) return "Escribe tu correo o tu teléfono.";
      return texto.includes("@") ? REGLAS.correo(texto) : REGLAS.telefono(texto);
    }
  };

  /* --- Estructura del modal ------------------------------------ */
  // Campo de contraseña con su botón para mostrarla
  function campoContrasena(id, autocompletar, ayuda) {
    const idAyuda = ayuda ? ` ${id}-ayuda` : "";
    return `
      <div class="campo">
        <label for="${id}">Contraseña</label>
        <div class="acceso__clave">
          <input type="password" id="${id}" name="contrasena"
                 autocomplete="${autocompletar}" data-regla="contrasena"
                 aria-describedby="${id}-error${idAyuda}">
          <button class="acceso__ver" type="button" aria-controls="${id}">Mostrar</button>
        </div>
        ${ayuda ? `<div class="acceso__ayuda" id="${id}-ayuda">${ayuda}</div>` : ""}
        <div class="campo__error" id="${id}-error"></div>
      </div>`;
  }

  // Campo de texto genérico
  function campoTexto(id, etiqueta, tipo, autocompletar, regla, extra) {
    return `
      <div class="campo">
        <label for="${id}">${etiqueta}</label>
        <input type="${tipo}" id="${id}" name="${regla}"
               autocomplete="${autocompletar}" data-regla="${regla}"
               aria-describedby="${id}-error" ${extra || ""}>
        <div class="campo__error" id="${id}-error"></div>
      </div>`;
  }

  // El cerrar va al final para que el Tab empiece por los campos;
  // visualmente queda arriba a la derecha.
  const PLANTILLA = `
    <dialog class="acceso" id="acceso" aria-labelledby="acceso-titulo">
      <div class="acceso__cuerpo">
        <h2 class="acceso__titulo" id="acceso-titulo">Tu cuenta Nails Express</h2>

        <div class="acceso__pestanas" role="tablist" aria-label="Opciones de acceso">
          <button type="button" role="tab" id="pestana-entrar" data-pestana="entrar"
                  aria-controls="panel-entrar" aria-selected="true">Iniciar sesión</button>
          <button type="button" role="tab" id="pestana-registro" data-pestana="registro"
                  aria-controls="panel-registro" aria-selected="false" tabindex="-1">Crear cuenta</button>
        </div>

        <!-- Pestaña: iniciar sesión -->
        <form class="acceso__panel" id="panel-entrar" role="tabpanel"
              aria-labelledby="pestana-entrar" novalidate>
          ${campoTexto("entrar-usuario", "Correo o teléfono", "text", "username", "usuario",
                       'autocapitalize="none" spellcheck="false"')}
          ${campoContrasena("entrar-contrasena", "current-password")}
          <a class="acceso__olvido" href="#" id="acceso-olvido">¿Olvidaste tu contraseña?</a>
          <div class="acceso__aviso" aria-live="polite"></div>
          <button class="boton boton--principal acceso__enviar" type="submit">Entrar</button>
        </form>

        <!-- Pestaña: crear cuenta (siempre crea clientes) -->
        <form class="acceso__panel" id="panel-registro" role="tabpanel"
              aria-labelledby="pestana-registro" novalidate hidden>
          ${campoTexto("registro-nombre", "Nombre completo", "text", "name", "nombre")}
          ${campoTexto("registro-telefono", "Teléfono", "tel", "tel-national", "telefono",
                       'inputmode="tel" placeholder="81 0000 0000"')}
          ${campoTexto("registro-correo", "Correo", "email", "email", "correo",
                       'autocapitalize="none" spellcheck="false" placeholder="nombre@correo.com"')}
          ${campoContrasena("registro-contrasena", "new-password", "Mínimo 8 caracteres.")}
          <div class="acceso__aviso" aria-live="polite"></div>
          <button class="boton boton--principal acceso__enviar" type="submit">Crear cuenta</button>
        </form>

        <p class="acceso__nota">
          ¿Solo quieres apartar tu lugar? <a href="agendar.html">Puedes agendar sin tener cuenta</a>.
        </p>
      </div>
      <button class="acceso__cerrar" type="button" aria-label="Cerrar">&times;</button>
    </dialog>`;

  document.body.insertAdjacentHTML("beforeend", PLANTILLA);

  const modal          = document.getElementById("acceso");
  const formEntrar     = document.getElementById("panel-entrar");
  const formRegistro   = document.getElementById("panel-registro");
  const pestanas       = modal.querySelectorAll('[role="tab"]');
  const enlacesSesion  = document.querySelectorAll(".barra__sesion");

  /* --- Abrir y cerrar ------------------------------------------ */
  function abrirAcceso() {
    cambiarPestana("entrar");
    modal.showModal();
    // el foco va al primer campo, no al botón de cerrar
    document.getElementById("entrar-usuario").focus();
  }

  modal.querySelector(".acceso__cerrar").addEventListener("click", () => modal.close());

  // Cerrar al hacer clic en el fondo. Se revisa también dónde empezó
  // el clic: si alguien arrastra al seleccionar texto de un campo y
  // suelta afuera, el modal no debe cerrarse.
  let clicEmpezoEnFondo = false;
  modal.addEventListener("mousedown", e => { clicEmpezoEnFondo = e.target === modal; });
  modal.addEventListener("click", e => {
    if (clicEmpezoEnFondo && e.target === modal) modal.close();
  });

  // Escape ya lo resuelve <dialog>. Al cerrar por cualquier vía
  // se limpian los formularios para la próxima vez.
  modal.addEventListener("close", () => {
    [formEntrar, formRegistro].forEach(limpiarFormulario);
  });

  function limpiarFormulario(form) {
    form.reset();
    form.querySelectorAll(".campo").forEach(campo => marcar(campo.querySelector("input"), ""));
    form.querySelectorAll(".acceso__ver").forEach(boton => alternarContrasena(boton, false));
    avisar(form, "");
  }

  /* --- Pestañas ------------------------------------------------ */
  function cambiarPestana(nombre, enfocar) {
    pestanas.forEach(pestana => {
      const activa = pestana.dataset.pestana === nombre;
      pestana.setAttribute("aria-selected", activa);
      pestana.tabIndex = activa ? 0 : -1;
      document.getElementById(pestana.getAttribute("aria-controls")).hidden = !activa;
      if (activa && enfocar) pestana.focus();
    });
  }

  pestanas.forEach(pestana => {
    pestana.addEventListener("click", () => cambiarPestana(pestana.dataset.pestana));

    // Flechas, Inicio y Fin mueven entre pestañas, como pide ARIA
    pestana.addEventListener("keydown", e => {
      const lista = Array.from(pestanas);
      const i = lista.indexOf(pestana);
      let destino = null;
      if (e.key === "ArrowRight") destino = lista[(i + 1) % lista.length];
      if (e.key === "ArrowLeft")  destino = lista[(i - 1 + lista.length) % lista.length];
      if (e.key === "Home")       destino = lista[0];
      if (e.key === "End")        destino = lista[lista.length - 1];
      if (destino) {
        e.preventDefault();
        cambiarPestana(destino.dataset.pestana, true);
      }
    });
  });

  /* --- Mostrar u ocultar contraseña ---------------------------- */
  function alternarContrasena(boton, mostrar) {
    const campo = document.getElementById(boton.getAttribute("aria-controls"));
    campo.type = mostrar ? "text" : "password";
    boton.textContent = mostrar ? "Ocultar" : "Mostrar";
  }

  modal.querySelectorAll(".acceso__ver").forEach(boton => {
    boton.addEventListener("click", () => {
      const campo = document.getElementById(boton.getAttribute("aria-controls"));
      alternarContrasena(boton, campo.type === "password");
    });
  });

  /* --- Validación ---------------------------------------------- */
  // Marca o limpia el error de un campo con las clases de estilos.css
  function marcar(input, mensaje) {
    const campo = input.closest(".campo");
    campo.classList.toggle("campo--invalido", Boolean(mensaje));
    campo.querySelector(".campo__error").textContent = mensaje;
    if (mensaje) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  function validarCampo(input) {
    const mensaje = REGLAS[input.dataset.regla](input.value);
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

  // Mensaje general del formulario (credenciales, avisos)
  function avisar(form, mensaje, esInformativo) {
    const aviso = form.querySelector(".acceso__aviso");
    aviso.textContent = mensaje;
    aviso.classList.toggle("acceso__aviso--info", Boolean(esInformativo));
  }

  // Una vez marcado un error, se revisa de nuevo mientras se corrige
  [formEntrar, formRegistro].forEach(form => {
    form.addEventListener("input", e => {
      const input = e.target;
      if (input.closest(".campo--invalido")) validarCampo(input);
      avisar(form, "");
    });
  });

  /* --- Iniciar sesión ------------------------------------------ */
    formEntrar.addEventListener("submit", async e => {
    e.preventDefault();
    avisar(formEntrar, "");

    if (!validarFormulario(formEntrar)) return;

    const usuario = document
      .getElementById("entrar-usuario").value.trim();

    const campoContrasena = document
      .getElementById("entrar-contrasena");

    const boton = formEntrar.querySelector('[type="submit"]');

    // Evita enviar varias solicitudes mientras PHP responde.
    boton.disabled = true;

    try {
      // PHP busca la cuenta en MySQL y verifica su contraseña.
      const datos = await ApiSesion.iniciar(
        usuario,
        campoContrasena.value
      );

      if (!datos.autenticada || !datos.usuario) {
        throw new Error("No se pudo confirmar el inicio de sesión.");
      }

      campoContrasena.value = "";

      // Conserva los datos públicos recibidos del servidor.
      usuarioAutenticado = datos.usuario;

      // Cierra el formulario y actualiza el nombre y menú de la barra.
      modal.close();
      pintarBarra();

    } catch (error) {
      avisar(formEntrar, error.message);
    } finally {
      // Habilita el botón tanto si hubo éxito como si ocurrió un error.
      boton.disabled = false;
    }
  });

  document.getElementById("acceso-olvido").addEventListener("click", e => {
    e.preventDefault();
    avisar(formEntrar,
      "Por ahora la contraseña se restablece en sucursal. Pídelo en recepción o por WhatsApp al +52 81 4621 0094.",
      true);
  });

  /* --- Crear cuenta -------------------------------------------- */
  formRegistro.addEventListener("submit", e => {
    e.preventDefault();
    avisar(formRegistro, "");
    if (!validarFormulario(formRegistro)) return;

    const campoTelefono = document.getElementById("registro-telefono");
    const campoCorreo   = document.getElementById("registro-correo");
    const telefono = limpiarTelefono(campoTelefono.value);
    const correo   = campoCorreo.value.trim().toLowerCase();

    // No se permiten dos cuentas con el mismo correo o teléfono
    const cuentas = todasLasCuentas();
    if (cuentas.some(c => c.correo.toLowerCase() === correo)) {
      marcar(campoCorreo, "Ya hay una cuenta con este correo. Inicia sesión con él.");
      campoCorreo.focus();
      return;
    }
    if (cuentas.some(c => limpiarTelefono(c.telefono) === telefono)) {
      marcar(campoTelefono, "Ya hay una cuenta con este teléfono. Inicia sesión con él.");
      campoTelefono.focus();
      return;
    }

    // El registro público siempre crea clientes
    const nueva = {
      id:         Date.now(),
      nombre:     document.getElementById("registro-nombre").value.trim(),
      correo:     correo,
      telefono:   telefono,
      contrasena: document.getElementById("registro-contrasena").value,
      rol:        "cliente"
    };
    guardarRegistro(CLAVE_CUENTAS, nueva, "id");

    iniciarSesion(nueva);
  });

  /* --- Sesión -------------------------------------------------- */
  function iniciarSesion(cuenta) {
    // La contraseña nunca se guarda en la sesión
    guardar(CLAVE_SESION, datosDeSesion(cuenta));

    // Empleada y administradora van a su panel
    const destino = DESTINOS[cuenta.rol];
    if (destino) {
      location.href = destino;
      return;
    }

    // La clienta se queda donde estaba
    modal.close();
    pintarBarra();
    const boton = document.querySelector(".usuario__boton");
    if (boton) boton.focus();
  }

  async function cerrarSesion() {
    try {
      // Pide a PHP que elimine la sesión del servidor y su cookie.
      await ApiSesion.cerrar();

      // Quita también la cuenta que mostramos en esta página.
      usuarioAutenticado = null;

      // Limpia cualquier sesión que quede del funcionamiento anterior.
      borrar(CLAVE_SESION);

      pintarBarra();

      if (enlacesSesion[0]) {
        enlacesSesion[0].focus();
      }
    } catch (error) {
      // Si PHP no confirma el cierre, informamos del problema.
      window.alert("No se pudo cerrar la sesión: " + error.message);
    }
  }

  /* --- Barra superior ------------------------------------------ */
  // Con sesión: se oculta "Iniciar sesión" y aparece el bloque del
  // usuario. Sin sesión: la barra vuelve a su estado original.
  function pintarBarra() {
    const sesion = sesionActual();
    document.querySelectorAll(".usuario").forEach(bloque => bloque.remove());

    enlacesSesion.forEach(enlace => {
      enlace.classList.toggle("oculto", Boolean(sesion));
      if (sesion) enlace.after(crearBloqueUsuario(sesion));
    });

    // El personal no agenda citas: con esta clase, estilos.css oculta
    // todo enlace a agendar.html, y en la barra pública el botón
    // "Agendar" se cambia por uno que lleva a su panel.
    const esPersonal = esRolPersonal(sesion);
    document.body.classList.toggle("sesion-personal", esPersonal);
    document.querySelectorAll(".barra__panel").forEach(boton => boton.remove());
    if (esPersonal) {
      document.querySelectorAll(".barra__acciones").forEach(acciones => {
        const boton = document.createElement("a");
        boton.className = "boton boton--principal barra__panel";
        boton.href = MENUS[sesion.rol][0].href;
        boton.textContent = "Mi panel";
        acciones.appendChild(boton);
      });
    }

    // Aviso para que cada página se actualice (por ejemplo, el panel)
    document.dispatchEvent(new CustomEvent("sesion:cambio", { detail: sesion }));
  }

  function crearBloqueUsuario(sesion) {
    const bloque = document.createElement("div");
    bloque.className = "usuario";
    // Las opciones vienen de MENUS (texto fijo, no del usuario)
    const opciones = (MENUS[sesion.rol] || MENUS.cliente)
      .map(o => `<li><a href="${o.href}">${o.texto}</a></li>`).join("");

    bloque.innerHTML = `
      <button class="usuario__boton" type="button" aria-expanded="false" aria-controls="usuario-menu">
        <span class="usuario__inicial" aria-hidden="true"></span>
        <span class="usuario__texto">
          <span class="usuario__nombre"></span>
          <span class="usuario__rol">${ETIQUETAS_ROL[sesion.rol] || ""}</span>
        </span>
      </button>
      <ul class="usuario__menu" id="usuario-menu" hidden>
        ${opciones}
        <li><button class="usuario__salir" type="button">Cerrar sesión</button></li>
      </ul>`;

    // El nombre lo escribe el usuario: se inserta como texto, nunca como HTML.
    // El personal ve su nombre completo, como en el wireframe del panel.
    const nombre = sesion.nombre.trim();
    bloque.querySelector(".usuario__inicial").textContent = nombre.charAt(0).toUpperCase();
    bloque.querySelector(".usuario__nombre").textContent =
      sesion.rol === "cliente" ? nombre.split(/\s+/)[0] : nombre;

    const boton = bloque.querySelector(".usuario__boton");
    const menu  = bloque.querySelector(".usuario__menu");

    // Marca la opción de la página donde está el usuario
    const paginaActual = location.pathname.split("/").pop();
    menu.querySelectorAll("a").forEach(enlace => {
      if (enlace.getAttribute("href") === paginaActual) enlace.setAttribute("aria-current", "page");
    });

    boton.addEventListener("click", () => abrirMenuUsuario(menu.hidden));

    // Escape cierra el menú y regresa el foco al botón
    bloque.addEventListener("keydown", e => {
      if (e.key === "Escape" && !menu.hidden) {
        abrirMenuUsuario(false);
        boton.focus();
      }
    });

    // Si el foco sale del bloque con Tab, el menú se cierra
    bloque.addEventListener("focusout", e => {
      if (e.relatedTarget && !bloque.contains(e.relatedTarget)) abrirMenuUsuario(false);
    });

    bloque.querySelector(".usuario__salir").addEventListener("click", cerrarSesion);

    return bloque;
  }

  // Abre o cierra el menú del usuario que esté en la barra
  function abrirMenuUsuario(abrir) {
    const boton = document.querySelector(".usuario__boton");
    const menu  = document.querySelector(".usuario__menu");
    if (!boton || !menu) return;
    menu.hidden = !abrir;
    boton.setAttribute("aria-expanded", abrir);
  }

  // Un clic fuera del bloque del usuario cierra su menú
  document.addEventListener("click", e => {
    const bloque = document.querySelector(".usuario");
    if (bloque && !bloque.contains(e.target)) abrirMenuUsuario(false);
  });

  /* --- Eventos generales --------------------------------------- */
  enlacesSesion.forEach(enlace => {
    enlace.setAttribute("aria-haspopup", "dialog");
    enlace.addEventListener("click", e => {
      e.preventDefault();
      abrirAcceso();
    });
  });

  // Si la sesión cambia en otra pestaña del navegador, se refleja aquí
  window.addEventListener("storage", e => {
    if (e.key === CLAVE_SESION) pintarBarra();
    if (e.key === null || [CLAVE_CITAS, CLAVE_CUENTAS, CLAVE_DISPONIBILIDAD,
      CLAVE_SOLICITUDES_DISPONIBILIDAD, CLAVE_CATALOGO].includes(e.key)) {
      if (e.key === null || e.key === CLAVE_CATALOGO) aplicarCatalogo();
      document.dispatchEvent(new CustomEvent("agenda:cambio"));
    }
  });

  /* --- Funciones para las demás páginas ------------------------ */
  // Lo único que sesion.js comparte hacia afuera. Lo usan el panel
  // de la clienta, el panel de la empleada y el flujo de agendado.
  window.Sesion = {
    actual:       sesionActual,
    esPersonal:   () => esRolPersonal(sesionActual()),
    // a dónde mandar al personal cuando entra a algo que no le toca
    panelPropio:  () => { const s = sesionActual(); return esRolPersonal(s) ? MENUS[s.rol][0].href : "index.html"; },
    abrirAcceso:  abrirAcceso,
    cerrar:       cerrarSesion,
    reglas:       REGLAS,
    limpiarTelefono: limpiarTelefono,

    // Cuenta completa del usuario con sesión (incluye la contraseña
    // solo porque es una demostración; en el servidor no saldría)
    cuentaActual() {
      const sesion = sesionActual();
      return sesion ? todasLasCuentas().find(c => c.id === sesion.id) || null : null;
    },

    // ¿Hay otra cuenta con este correo o teléfono?
    existeOtraCuenta(campo, valor, idPropio) {
      const normalizar = campo === "telefono"
        ? v => limpiarTelefono(v)
        : v => v.trim().toLowerCase();
      return todasLasCuentas().some(c =>
        c.id !== idPropio && normalizar(c[campo]) === normalizar(valor));
    },

    // Guarda cambios de la cuenta y actualiza la sesión y la barra
    guardarCuenta(cuenta) {
      guardarRegistro(CLAVE_CUENTAS, cuenta, "id");
      const sesion = sesionActual();
      if (sesion && sesion.id === cuenta.id) guardar(CLAVE_SESION, datosDeSesion(cuenta));
      pintarBarra();
    },

    // Empleadas activas: las que se ofrecen a la clienta al agendar
    empleadas: empleadasActivas,

    empleadasPara(servicioId, sucursalId) {
      return AgendaCitas.empleadasPara({ empleadas: empleadasActivas(), servicios: SERVICIOS,
        servicioId, sucursalId });
    },

    // Cualquier empleada por id, aunque ya no esté activa (para el
    // historial de citas). Devuelve null si no existe.
    buscarEmpleada(id) {
      const cuenta = todasLasCuentas().find(c => c.id === id && c.rol === "empleada");
      return cuenta ? datosDeEmpleada(cuenta) : null;
    },

    // Para la administradora: todas las cuentas de empleada, activas o no,
    // con sus datos de contacto (nunca la contraseña)
    cuentasDeEmpleadas() {
      return todasLasCuentas()
        .filter(c => c.rol === "empleada")
        .map(c => ({ ...datosDeEmpleada(c), correo: c.correo, telefono: c.telefono }));
    },

    // Cuenta completa por id (para editarla y volver a guardarla)
    cuenta(id) {
      return todasLasCuentas().find(c => c.id === id) || null;
    },

    // Guarda un cambio del catálogo y lo aplica en esta página al momento
    guardarCatalogo(seccion, id, campos) {
      const cambios = leer(CLAVE_CATALOGO, {});
      cambios[seccion] = cambios[seccion] || {};
      cambios[seccion][id] = { ...cambios[seccion][id], ...campos };
      guardar(CLAVE_CATALOGO, cambios);
      const item = LISTAS_CATALOGO[seccion].find(x => x.id === id);
      if (item) Object.assign(item, campos);
    },

    citas: todasLasCitas,

    citasDe(idCliente) {
      return todasLasCitas().filter(c => c.clienteId === idCliente);
    },

    guardarCita(cita) {
      return guardarRegistro(CLAVE_CITAS, cita, "folio");
    },

    // El buscador es informativo; encontrar una cita no concede permiso para editarla.
    puedeGestionarCita(cita) {
      const sesion = sesionActual();
      const empleada = sesion?.rol === "empleada" ? this.buscarEmpleada(sesion.id) : null;
      return Boolean(cita && empleada?.activa && cita.empleadaId === empleada.id &&
        cita.sucursalId === empleada.sucursal);
    },

    reprogramarCitaEmpleada(original, { fecha, hora, empleadaId }) {
      const error = mensaje => ({ valida: false, codigo: "gestion", mensaje });
      const actual = todasLasCitas().find(c => c.folio === original.folio);
      if (!this.puedeGestionarCita(actual)) {
        return error("Esta cita ya no está asignada a tu cuenta. Solo puedes gestionar tus propias citas.");
      }
      if (JSON.stringify(actual) !== JSON.stringify(original)) {
        return error("La cita cambió. Cierra el formulario y revisa los datos actuales antes de reprogramar.");
      }
      if (actual.estado !== "activa" || new Date(actual.fecha + "T" + actual.hora) <= new Date()) {
        return error("Solo puedes reprogramar tus citas activas que aún no han comenzado.");
      }
      if (empleadaId !== actual.empleadaId) {
        return error("Solo la administradora puede cambiar la empleada asignada desde los paneles del personal.");
      }
      // Se admiten únicamente fecha y hora; la asignación se toma del registro vigente.
      const nueva = { ...actual, fecha, hora, reprogramaciones: (actual.reprogramaciones || 0) + 1 };
      return this.reservarCita(nueva, { ignorarFolio: actual.folio });
    },

    // Completa una cita existente sin recalcular importes ni marcarla atendida.
    // El formulario manda su copia original para detectar cambios en otra pestaña.
    completarCita(folio, { empleadaId, colorId }, original) {
      const error = mensaje => ({ guardada: false, mensaje });
      if (sesionActual()?.rol !== "administradora") {
        return error("Solo la administradora puede completar los datos de una cita.");
      }
      const actual = todasLasCitas().find(c => c.folio === folio);
      // Revisa el estado vigente, incluso si la atención se registró con el formulario abierto.
      if (!actual || actual.estado !== "activa") {
        return error("Solo puedes modificar empleada y tono de citas activas pendientes de atención. Cierra el formulario y revisa la agenda.");
      }
      if (!original || JSON.stringify(actual) !== JSON.stringify(original)) {
        return error("La cita cambió mientras la editabas. Cierra y vuelve a abrir el formulario para revisar los datos actuales.");
      }
      if (!Number.isInteger(empleadaId) || empleadaId < 0) {
        return error("Selecciona una empleada válida.");
      }
      const cambiaEmpleada = empleadaId !== actual.empleadaId;
      if (cambiaEmpleada && empleadaId && !this.empleadasPara(actual.servicioId, actual.sucursalId)
        .some(e => e.id === empleadaId)) {
        return error("Elige una empleada activa de esta sucursal que realice el servicio.");
      }
      if (colorId !== null && (!Number.isInteger(colorId) || !COLORES.some(c =>
        c.id === colorId && (c.disponible || colorId === actual.colorId)))) {
        return error("Elige un tono disponible o conserva el tono que ya estaba registrado.");
      }

      // Solo aceptamos estos dos campos; el resto se toma del registro actual.
      const actualizada = { ...actual, empleadaId, colorId };
      if (cambiaEmpleada) {
        // Deshacer la atención no debe borrar una asignación explícita de la admin.
        actualizada.asignadaAlAtender = false;
        // También se puede asignar al llegar al local, cuando ya pasó la hora.
        // Se conserva la revisión de duración, cierres y reservas sin preferencia.
        const revision = AgendaCitas.validar({ ...contextoAgenda(), cita: actualizada,
          ignorarFolio: folio, permitirPasado: true });
        if (!revision.valida) return error(revision.mensaje);
      }
      if (!guardarRegistro(CLAVE_CITAS, actualizada, "folio")) {
        return error("No pudimos guardar los cambios en este navegador. Revisa el almacenamiento e inténtalo de nuevo.");
      }
      notificarCambioAgenda();
      return { guardada: true, mensaje: "Guardamos la empleada y el tono de la cita." };
    },

    duracionCita(cita) {
      return AgendaCitas.duracionDe(cita, SERVICIOS, DISENOS);
    },

    validarCita(cita, { ignorarFolio } = {}) {
      return AgendaCitas.validar({ ...contextoAgenda(), cita, ignorarFolio });
    },

    // Crear y reprogramar pasan por la misma revisión justo antes de guardar.
    // guardarCita se conserva para cambios de estado e historial.
    reservarCita(cita, opciones) {
      const resultado = this.validarCita(cita, opciones);
      if (!resultado.valida) return resultado;
      if (!this.guardarCita(cita)) {
        return { valida: false, codigo: "almacenamiento",
          mensaje: "No pudimos guardar tu cita en este navegador. Revisa que permita guardar datos e inténtalo de nuevo." };
      }
      return resultado;
    },

    /* --- Folio: con él se identifica la clienta en el salón ---- */
    // "NE-" y 6 caracteres fáciles de dictar o leer de una captura:
    // sin 0/O, 1/I/L. Se revisa que no exista ya en ninguna cita.
    // (31 caracteres ^ 6 ≈ 887 millones de combinaciones)
    nuevoFolio() {
      const letras = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      const usados = new Set(todasLasCitas().map(c => c.folio));
      let folio;
      do {
        const azar = new Uint32Array(6);
        crypto.getRandomValues(azar);
        folio = "NE-" + Array.from(azar, n => letras[n % letras.length]).join("");
      } while (usados.has(folio));
      return folio;
    },

    // Teléfono de contacto: el que dejó al agendar o, si no, el de su cuenta
    telefonoDeCita(cita) {
      if (cita.telefono) return limpiarTelefono(cita.telefono);
      const cuenta = cita.clienteId ? todasLasCuentas().find(c => c.id === cita.clienteId) : null;
      return cuenta ? limpiarTelefono(cuenta.telefono) : "";
    },

    // Busca citas por folio (con o sin "NE-", sin importar mayúsculas)
    // o por teléfono (10 dígitos, o al menos los últimos 4).
    buscarCitas(texto) {
      const consulta = texto.trim().toUpperCase().replace(/\s+/g, "");
      if (!consulta) return [];
      const digitos = consulta.replace(/\D/g, "");
      const esTelefono = /^[\d-]+$/.test(consulta) && digitos.length >= 4;
      const folio = consulta.startsWith("NE-") ? consulta : "NE-" + consulta;

      return todasLasCitas().filter(c => esTelefono
        ? this.telefonoDeCita(c).endsWith(digitos) || c.folio === folio
        : c.folio === folio);
    },

    // Disponibilidad: por empleada, las horas CERRADAS de cada fecha.
    // Lo que no aparece está disponible. Forma: { "AAAA-MM-DD": ["18:30"] }
    disponibilidadDe(idEmpleada) {
      return disponibilidadCompleta()[idEmpleada] || {};
    },

    cerradosDe(idEmpleada, fecha) {
      return this.disponibilidadDe(idEmpleada)[fecha] || [];
    },

    solicitudesDisponibilidad(idEmpleada) {
      const solicitudes = solicitudesDisponibilidad();
      return idEmpleada == null
        ? solicitudes
        : solicitudes.filter(s => s.empleadaId === idEmpleada);
    },

    solicitarCierreDisponibilidad(idEmpleada, cierres) {
      const sesion = sesionActual();
      const empleada = this.buscarEmpleada(idEmpleada);
      if (!sesion || sesion.rol !== "empleada" || sesion.id !== idEmpleada ||
          !empleada || !empleada.activa) {
        return { guardada: false, mensaje: "No pudimos comprobar tu cuenta de empleada." };
      }
      if (!Array.isArray(cierres) || !cierres.length) {
        return { guardada: false, mensaje: "Selecciona al menos un horario para solicitar el cierre." };
      }

      const ahora = new Date();
      const reservados = this.bloquesReservados(idEmpleada);
      const actuales = this.disponibilidadDe(idEmpleada);
      const pendientes = solicitudesDisponibilidad()
        .filter(s => s.empleadaId === idEmpleada && s.estado === "pendiente");
      const solicitados = [];
      const fechas = new Set();
      for (const cierre of cierres) {
        if (!cierre || typeof cierre.fecha !== "string") {
          return { guardada: false, mensaje: "La fecha o los horarios seleccionados no son válidos." };
        }
        const dia = new Date(cierre.fecha + "T00:00:00");
        const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(cierre.fecha) &&
          Number.isFinite(dia.getTime()) &&
          `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}` === cierre.fecha;
        if (!fechaValida || !Array.isArray(cierre.horas) || !cierre.horas.length ||
            fechas.has(cierre.fecha)) {
          return { guardada: false, mensaje: "La fecha o los horarios seleccionados no son válidos." };
        }
        fechas.add(cierre.fecha);
        const horas = Array.from(new Set(cierre.horas));
        if (horas.some(hora => !HORARIOS.includes(hora) ||
            new Date(cierre.fecha + "T" + hora) <= ahora ||
            reservados.has(cierre.fecha + "|" + hora) ||
            (actuales[cierre.fecha] || []).includes(hora) ||
            pendientes.some(s => s.fecha === cierre.fecha && s.horas.includes(hora)))) {
          return { guardada: false,
            mensaje: "Algún horario ya pasó, tiene una cita, está cerrado o tiene una solicitud pendiente. Actualiza la disponibilidad e inténtalo de nuevo." };
        }
        solicitados.push({ fecha: cierre.fecha, horas });
      }

      const existentes = solicitudesDisponibilidad();
      const nuevos = solicitados.map(cierre => {
        const azar = new Uint32Array(2);
        crypto.getRandomValues(azar);
        return {
          id: `${Date.now()}-${azar[0]}-${azar[1]}`,
          empleadaId: idEmpleada,
          fecha: cierre.fecha,
          horas: cierre.horas,
          estado: "pendiente",
          creadaEn: new Date().toISOString()
        };
      });
      if (!guardar(CLAVE_SOLICITUDES_DISPONIBILIDAD, existentes.concat(nuevos))) {
        return { guardada: false,
          mensaje: "No pudimos guardar la solicitud en este navegador. Revisa el almacenamiento e inténtalo de nuevo." };
      }
      notificarCambioAgenda();
      return { guardada: true, mensaje: "Enviamos tu solicitud a la administradora." };
    },

    resolverSolicitudDisponibilidad(idSolicitud, decision) {
      const sesion = sesionActual();
      if (!sesion || sesion.rol !== "administradora") {
        return { resuelta: false, mensaje: "Solo la administradora puede resolver solicitudes." };
      }
      if (!["aceptada", "rechazada"].includes(decision)) {
        return { resuelta: false, mensaje: "La decisión seleccionada no es válida." };
      }
      const solicitudes = solicitudesDisponibilidad();
      const solicitud = solicitudes.find(s => s.id === idSolicitud);
      if (!solicitud || solicitud.estado !== "pendiente") {
        return { resuelta: false, mensaje: "La solicitud ya fue atendida o no existe." };
      }

      if (decision === "aceptada") {
        const empleada = this.buscarEmpleada(solicitud.empleadaId);
        if (!empleada || !empleada.activa) {
          return { resuelta: false, mensaje: "La empleada ya no está activa; rechaza esta solicitud." };
        }
        const ahora = new Date();
        const reservados = this.bloquesReservados(solicitud.empleadaId);
        const cerrados = this.disponibilidadDe(solicitud.empleadaId)[solicitud.fecha] || [];
        if (solicitud.horas.some(hora => new Date(solicitud.fecha + "T" + hora) <= ahora)) {
          return { resuelta: false, mensaje: "La fecha de esta solicitud ya pasó." };
        }
        if (solicitud.horas.some(hora => reservados.has(solicitud.fecha + "|" + hora))) {
          return { resuelta: false,
            mensaje: "No se puede aceptar: uno o más horarios ya tienen citas reservadas." };
        }
        if (solicitud.horas.some(hora => cerrados.includes(hora))) {
          return { resuelta: false,
            mensaje: "No se puede aceptar: uno o más horarios ya están cerrados por otra solicitud." };
        }

        const contexto = contextoAgenda();
        contexto.cerrados[solicitud.empleadaId] = contexto.cerrados[solicitud.empleadaId] || {};
        contexto.cerrados[solicitud.empleadaId][solicitud.fecha] = [
          ...cerrados, ...solicitud.horas
        ];
        const sinAsignar = contexto.citas.filter(c => c.fecha === solicitud.fecha &&
          c.sucursalId === empleada.sucursal && c.empleadaId === 0 && c.estado !== "cancelada");
        if (sinAsignar.some(c => !AgendaCitas.validar({
          ...contexto, cita: c, ignorarFolio: c.folio
        }).valida)) {
          return { resuelta: false,
            mensaje: "No se puede aceptar: el cierre dejaría una cita sin preferencia sin capacidad para atenderse." };
        }
      }

      const actualizadas = solicitudes.map(s => s.id === idSolicitud
        ? { ...s, estado: decision, resueltaEn: new Date().toISOString(), resueltaPor: sesion.id }
        : s);
      if (!guardar(CLAVE_SOLICITUDES_DISPONIBILIDAD, actualizadas)) {
        return { resuelta: false,
          mensaje: "No pudimos guardar la decisión en este navegador. Revisa el almacenamiento e inténtalo de nuevo." };
      }
      notificarCambioAgenda();
      return { resuelta: true,
        mensaje: decision === "aceptada" ? "Aceptamos la solicitud y cerramos esos horarios." : "Rechazamos la solicitud." };
    },

    /* Incluye servicio, duración completa y reservas sin asignar.
       ignorarFolio excluye la propia cita cuando se reprograma. */
    horasNoDisponibles({ ignorarFolio, ...cita }) {
      const contexto = contextoAgenda();
      return new Set(HORARIOS.filter(hora => !AgendaCitas.validar({
        ...contexto, cita: { ...cita, hora }, ignorarFolio
      }).valida));
    },

    bloquesReservados(empleadaId) {
      return AgendaCitas.bloquesReservados({ ...contextoAgenda(), empleadaId });
    }
  };

  /* --- Migración de datos guardados ---------------------------- */
  // Versión 1 → 2: antes las empleadas tenían su propio arreglo
  // (EMPLEADAS) con ids 1, 2 y 3. Ahora son cuentas de USUARIOS y se
  // identifican con su id de usuario. Lo que este navegador guardó
  // con los ids viejos (citas agendadas o canceladas, disponibilidad)
  // se traduce una sola vez para que no apunte a la persona equivocada.
  function migrarDatos() {
    if (leer(CLAVE_VERSION, 1) >= VERSION_DATOS) return;

    const ID_NUEVO = { 1: 2, 2: 4, 3: 5 };   // id en EMPLEADAS → id en USUARIOS

    // Solo se reescribe lo que ya existía; un navegador nuevo no tiene nada que traducir
    const citas      = leer(CLAVE_CITAS, null);
    const anterior   = leer(CLAVE_DISPONIBILIDAD, null);
    const cuentas    = leer(CLAVE_CUENTAS, null);

    // Citas: solo cambia a quién está asignada (0 = sin preferencia se queda)
    if (citas) {
      guardar(CLAVE_CITAS, citas.map(cita =>
        ID_NUEVO[cita.empleadaId] ? { ...cita, empleadaId: ID_NUEVO[cita.empleadaId] } : cita));
    }

    // Disponibilidad: estaba agrupada por el id viejo de la empleada
    if (anterior) {
      const nueva = {};
      Object.keys(anterior).forEach(id => { nueva[ID_NUEVO[id] || id] = anterior[id]; });
      guardar(CLAVE_DISPONIBILIDAD, nueva);
    }

    // Cuentas editadas: el campo empleadaId ya no se usa
    if (cuentas) {
      guardar(CLAVE_CUENTAS, cuentas.map(cuenta => {
        const { empleadaId, ...resto } = cuenta;
        return resto;
      }));
    }

    guardar(CLAVE_VERSION, VERSION_DATOS);
  }

  /* --- Arranque ------------------------------------------------ */
  migrarDatos();
  aplicarCatalogo();   // antes que inicio.js o agendar.js dibujen precios y tonos
  pintarBarra();

  // Recupera la cuenta de la sesión que PHP conserva en el servidor.
async function recuperarSesion() {
  try {
    const datos = await ApiSesion.consultar();

    usuarioAutenticado = datos.autenticada
      ? datos.usuario
      : null;

    // Actualiza la barra cuando llega la respuesta del servidor.
    pintarBarra();
  } catch (error) {
    console.error("No se pudo consultar la sesión:", error);
  }
}

recuperarSesion();

})();
