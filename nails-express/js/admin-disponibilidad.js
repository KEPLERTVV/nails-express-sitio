function pintarSolicitudesAdministradora() {
  const solicitudes = Sesion.solicitudesDisponibilidad()
    .slice()
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
  const pendientes = solicitudes.filter(s => s.estado === "pendiente");
  const historial = solicitudes.filter(s => s.estado !== "pendiente");

  document.getElementById("solicitudes-pendientes").innerHTML = pendientes.length
    ? pendientes.map(filaSolicitud).join("")
    : `<li class="citas__vacio"><p>No hay solicitudes pendientes.</p></li>`;
  document.getElementById("solicitudes-historial").innerHTML = historial.length
    ? historial.map(filaSolicitud).join("")
    : `<li class="citas__vacio"><p>Aún no hay solicitudes resueltas.</p></li>`;
}

function filaSolicitud(solicitud) {
  const empleada = Sesion.buscarEmpleada(solicitud.empleadaId);
  const nombre = empleada ? empleada.nombre : "Empleada no disponible";
  const sucursal = empleada ? nombreSucursal(empleada.sucursal) : "Sin sucursal";
  const pendiente = solicitud.estado === "pendiente";
  const estado = pendiente ? "Pendiente de revisión" :
    solicitud.estado === "aceptada" ? "Aceptada" : "Rechazada";
  const clase = pendiente ? "pendiente" :
    solicitud.estado === "aceptada" ? "confirmada" : "cancelada";
  const acciones = pendiente ? `
    <div class="agenda__acciones">
      <button class="boton boton--principal" type="button" data-decision="aceptada"
              data-solicitud="${escaparHTML(solicitud.id)}">Aceptar</button>
      <button class="boton boton--secundario" type="button" data-decision="rechazada"
              data-solicitud="${escaparHTML(solicitud.id)}">Rechazar</button>
    </div>` : "";

  return `<li class="agenda__bloque solicitud-disponibilidad">
    <div class="agenda__quien">
      <strong>${escaparHTML(nombre)} · ${escaparHTML(sucursal)}</strong>
      <span>${escaparHTML(fechaLarga(solicitud.fecha))}</span>
      <span>Horarios: ${solicitud.horas.map(escaparHTML).join(" · ")}</span>
    </div>
    <span class="estado estado--${clase}">${estado}</span>
    ${acciones}
  </li>`;
}

document.getElementById("solicitudes-pendientes").addEventListener("click", e => {
  const boton = e.target.closest("button[data-decision]");
  if (!boton) return;
  const resultado = Sesion.resolverSolicitudDisponibilidad(
    boton.dataset.solicitud, boton.dataset.decision
  );
  const aviso = document.getElementById("solicitudes-aviso");
  aviso.textContent = resultado.mensaje;
  aviso.classList.toggle("aviso--exito", resultado.resuelta);
  if (resultado.resuelta) pintarSolicitudesAdministradora();
  aviso.focus();
});

document.addEventListener("agenda:cambio", pintarSolicitudesAdministradora);
iniciarPanel(pintarSolicitudesAdministradora, "administradora");
