/* ============================================================
   reprogramar.js — Ventana para mover una cita
   La usan la clienta (mis-citas.html) y la empleada
   (panel-empleada.html, cuando la clienta llama para cambiarla).
   Se puede cambiar día, hora y empleada de la misma sucursal.
   Servicio, diseño y sucursal se quedan: para cambiarlos, se
   cancela y se agenda de nuevo.
   Equivale a Cita.reprogramar() del diagrama de clases.
   Se enlaza después de panel.js.
   ============================================================ */

const Reprogramar = (function () {

  const DIAS_PARA_REPROGRAMAR = 60;   // hasta cuándo se puede mover una cita

  // La ventana se inserta desde aquí para no repetirla en cada página.
  // Reusa los estilos del modal de acceso (.acceso), en versión ancha.
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="acceso acceso--ancha" id="reprogramar" aria-labelledby="reprogramar-titulo"
            aria-describedby="reprogramar-actual">
      <div class="acceso__cuerpo">
        <h2 class="acceso__titulo" id="reprogramar-titulo">Reprogramar cita</h2>
        <p class="reprogramar__actual" id="reprogramar-actual"></p>

        <form class="formulario" id="form-reprogramar" novalidate>
          <fieldset class="reprogramar__grupo">
            <legend>¿Con quién?</legend>
            <div class="opciones opciones--compactas" id="reprogramar-empleadas"></div>
          </fieldset>

          <div class="campo reprogramar__fecha">
            <label for="reprogramar-fecha">Nuevo día</label>
            <input type="date" id="reprogramar-fecha">
          </div>

          <fieldset class="reprogramar__grupo">
            <legend>Horarios disponibles</legend>
            <div class="horas" id="reprogramar-horas"></div>
            <p class="pasos__texto" id="reprogramar-ayuda">Los horarios apagados ya están ocupados.</p>
          </fieldset>

          <div class="aviso" role="status"></div>
          <button class="boton boton--principal acceso__enviar" type="submit">Confirmar cambio</button>
        </form>
      </div>
      <button class="acceso__cerrar" type="button" id="reprogramar-cerrar" aria-label="Cerrar">&times;</button>
    </dialog>`);

  const ventana    = document.getElementById("reprogramar");
  const formMover  = document.getElementById("form-reprogramar");
  const campoFecha = document.getElementById("reprogramar-fecha");
  const aviso      = formMover.querySelector(".aviso");

  let moviendo  = null;   // { cita, empleadaId, fecha, hora } mientras la ventana está abierta
  let alGuardar = null;   // qué hace la página después de guardar

  /* --- Abrir ------------------------------------------------- */
  // opciones.deClienta: true si la abre la propia clienta ("Tu cita…")
  // opciones.alGuardar(citaNueva): para que la página se actualice
  function abrir(cita, opciones) {
    const servicio = SERVICIOS.find(s => s.id === cita.servicioId);
    const nombreServicio = servicio ? servicio.nombre.toLowerCase() : "cita";
    moviendo  = { cita, empleadaId: cita.empleadaId, fecha: cita.fecha, hora: cita.hora };
    alGuardar = opciones.alGuardar;

    const quien = opciones.deClienta ? `Tu ${nombreServicio}` : `El ${nombreServicio} de ${cita.nombre || "la clienta"}`;
    document.getElementById("reprogramar-actual").textContent =
      `${quien} en ${nombreSucursal(cita.sucursalId)} está para el ${fechaLarga(cita.fecha)} a las ${cita.hora}.`;

    campoFecha.min   = fechaISO();
    campoFecha.max   = fechaRelativa(DIAS_PARA_REPROGRAMAR);
    campoFecha.value = cita.fecha;
    aviso.textContent = "";

    pintar();
    ventana.showModal();
    // el foco va a la primera decisión: con quién
    ventana.querySelector('#reprogramar-empleadas [aria-pressed="true"]').focus();
  }

  /* --- Dibujo ------------------------------------------------ */
  function pintar() {
    const { cita } = moviendo;

    // Solo ofrecer empleadas activas que realizan el servicio de la cita.
    const especialistas = Sesion.empleadasPara(cita.servicioId, cita.sucursalId);
    const opciones = especialistas.concat(SIN_PREFERENCIA);
    if (!opciones.some(e => e.id === moviendo.empleadaId)) moviendo.empleadaId = 0;

    document.getElementById("reprogramar-empleadas").innerHTML = opciones.map(e => `
      <button class="opcion" type="button" data-empleada="${e.id}" aria-pressed="${e.id === moviendo.empleadaId}">
        <strong>${escaparHTML(e.nombre)}</strong>
        <span>${e.especialidades.length ? escaparHTML(e.especialidades.join(" · ")) : "La primera que se desocupe"}</span>
      </button>`).join("");

    // Horas libres ese día para esa empleada (sin contar esta misma cita)
    const ocupadas = moviendo.fecha
      ? Sesion.horasNoDisponibles({
          empleadaId:   moviendo.empleadaId,
          sucursalId:   cita.sucursalId,
          servicioId:   cita.servicioId,
          disenoId:     cita.disenoId,
          duracion:     Sesion.duracionCita(cita),
          fecha:        moviendo.fecha,
          ignorarFolio: cita.folio
        })
      : new Set(HORARIOS);
    if (moviendo.hora && ocupadas.has(moviendo.hora)) moviendo.hora = "";

    document.getElementById("reprogramar-horas").innerHTML = HORARIOS.map(h => `
      <button class="hora" type="button" data-hora="${h}" aria-pressed="${moviendo.hora === h}"
              ${ocupadas.has(h) ? "disabled" : ""}>${h}</button>`).join("");

    document.getElementById("reprogramar-ayuda").textContent = !especialistas.length
      ? "No hay empleadas que realicen este servicio en esta sucursal. Contacta a la sucursal para cambiar tu cita."
      : !moviendo.fecha
      ? "Elige primero el día."
      : ocupadas.size === HORARIOS.length
        ? "No hay horarios válidos para el servicio completo ese día. Prueba otra fecha o empleada."
        : "Los horarios consideran duración, reservas y disponibilidad de la empleada.";
  }

  /* --- Eventos ----------------------------------------------- */
  // Elegir empleada u hora; el foco se queda en el botón elegido
  formMover.addEventListener("click", e => {
    const empleada = e.target.closest("[data-empleada]");
    const hora     = e.target.closest("[data-hora]");
    if (!empleada && !hora) return;

    if (empleada) moviendo.empleadaId = Number(empleada.dataset.empleada);
    if (hora)     moviendo.hora = hora.dataset.hora;
    aviso.textContent = "";
    pintar();

    const selector = empleada ? `[data-empleada="${empleada.dataset.empleada}"]` : `[data-hora="${hora.dataset.hora}"]`;
    const elegido = formMover.querySelector(selector);
    if (elegido && !elegido.disabled) elegido.focus();
  });

  campoFecha.addEventListener("change", () => {
    moviendo.fecha = campoFecha.value;
    aviso.textContent = "";
    pintar();
  });

  formMover.addEventListener("submit", e => {
    e.preventDefault();
    const { cita, empleadaId, fecha, hora } = moviendo;

    // Validación: sin alert(), el mensaje va en la ventana
    let error = "";
    if (!fecha || fecha < campoFecha.min || fecha > campoFecha.max) {
      error = `Elige un día entre hoy y los próximos ${DIAS_PARA_REPROGRAMAR} días.`;
    } else if (!hora) {
      error = "Elige uno de los horarios disponibles.";
    } else if (fecha === cita.fecha && hora === cita.hora && empleadaId === cita.empleadaId) {
      error = "Es el mismo horario que ya tiene. Elige otro o cierra esta ventana.";
    }
    if (error) {
      aviso.textContent = error;
      (fecha && !hora ? formMover.querySelector(".hora:not([disabled])") || campoFecha : campoFecha).focus();
      return;
    }

    const nueva = { ...cita, fecha, hora, empleadaId,
                    reprogramaciones: (cita.reprogramaciones || 0) + 1 };
    const resultado = Sesion.reservarCita(nueva, { ignorarFolio: cita.folio });
    if (!resultado.valida) {
      aviso.textContent = resultado.mensaje;
      pintar();
      aviso.focus();
      return;
    }
    const despues = alGuardar;
    ventana.close();
    if (despues) despues(nueva);
  });

  // Cerrar: botón, Escape (lo hace <dialog>) o clic en el fondo
  document.getElementById("reprogramar-cerrar").addEventListener("click", () => ventana.close());
  let clicEmpezoEnFondo = false;
  ventana.addEventListener("mousedown", e => { clicEmpezoEnFondo = e.target === ventana; });
  ventana.addEventListener("click", e => {
    if (clicEmpezoEnFondo && e.target === ventana) ventana.close();
  });
  ventana.addEventListener("close", () => { moviendo = null; alGuardar = null; });

  return { abrir };
})();
