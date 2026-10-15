/* ============================================================
   admin-ingresos.js — Ingresos y comisiones por mes
   Equivale a Administrador.consultarIngresos() y
   Administrador.calcularComisiones() del diagrama de clases.
   ============================================================ */

const MESES_ATRAS = 6;          // cuántos meses se pueden consultar
let sucursalFiltro = "todas";   // "todas" o el id de una sucursal
const selectorMes = document.getElementById("reporte-mes");

/* --- Selector de mes ----------------------------------------- */
// Opciones "octubre 2026", "septiembre 2026"…, con valor "2026-10"
function llenarMeses() {
  const hoy = new Date();
  const opciones = [];
  for (let i = 0; i < MESES_ATRAS; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const valor = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    const texto = capitalizar(d.toLocaleDateString("es-MX", { month: "long", year: "numeric" }));
    opciones.push(`<option value="${valor}">${texto}${i === 0 ? " (en curso)" : ""}</option>`);
  }
  selectorMes.innerHTML = opciones.join("");
}

/* --- Cálculos ------------------------------------------------ */
// Una cita cuenta solo si la empleada la marcó como atendida en el salón
function realizada(cita) {
  return cita.estado === "atendida";
}

// Todas las citas del mes en la sucursal elegida (cualquier estado)
function delMes(mes) {
  return Sesion.citas().filter(c =>
    c.fecha.startsWith(mes) && (sucursalFiltro === "todas" || c.sucursalId === sucursalFiltro));
}

function citasDelMes(mes) {
  return delMes(mes).filter(realizada);
}

// Debajo de las métricas: cuántas no llegaron y cuántas faltan por marcar
function pintarPendientes(mes) {
  const todas = delMes(mes);
  const noLlegaron = todas.filter(c => c.estado === "no-asistio").length;
  const sinMarcar  = todas.filter(c => c.estado === "activa" && yaEmpezo(c)).length;
  const partes = [`${noLlegaron} ${noLlegaron === 1 ? "clienta no llegó" : "clientas no llegaron"}`];
  if (sinMarcar) {
    partes.push(`${sinMarcar} ${sinMarcar === 1 ? "cita ya pasó y falta" : "citas ya pasaron y faltan"} por marcar ` +
                `(no cuentan hasta que la empleada las marque)`);
  }
  document.getElementById("reporte-pendientes").textContent = partes.join(" · ") + ".";
}

// Comisión de una cita, redondeada a pesos. Se redondea cita por cita
// para que el total por empleada y el total por sucursal cuadren.
function comisionDe(cita) {
  const empleada = cita.empleadaId ? Sesion.buscarEmpleada(cita.empleadaId) : null;
  return Math.round(cita.total * (empleada ? empleada.porcentajeComision : 0) / 100);
}

// Suma citas, ingresos y comisiones de un grupo de citas
function resumir(citas) {
  return {
    citas:    citas.length,
    ingresos: citas.reduce((suma, c) => suma + c.total, 0),
    comision: citas.reduce((suma, c) => suma + comisionDe(c), 0)
  };
}

/* --- Dibujo -------------------------------------------------- */
function pintarIngresos() {
  pintarFiltroSucursal("filtro-sucursal", sucursalFiltro, valor => {
    sucursalFiltro = valor;
    pintarIngresos();
  });

  const citas = citasDelMes(selectorMes.value);
  pintarPendientes(selectorMes.value);

  // Por empleada: todas las que tuvieron citas, aunque hoy estén inactivas
  const ids = Array.from(new Set(citas.map(c => c.empleadaId)));
  const filas = ids.map(id => {
    const empleada = id ? Sesion.buscarEmpleada(id) : null;
    const propias  = citas.filter(c => c.empleadaId === id);
    return {
      nombre:     empleada ? empleada.nombre : "Sin asignar",
      inactiva:   empleada ? !empleada.activa : false,
      sucursal:   empleada ? nombreSucursal(empleada.sucursal) : "—",
      porcentaje: empleada ? empleada.porcentajeComision : 0,
      ...resumir(propias)
    };
  }).sort((a, b) => b.ingresos - a.ingresos);

  const total = filas.reduce((t, f) => ({
    citas: t.citas + f.citas, ingresos: t.ingresos + f.ingresos, comision: t.comision + f.comision
  }), { citas: 0, ingresos: 0, comision: 0 });

  // Métricas de arriba
  document.getElementById("metrica-citas").textContent      = total.citas;
  document.getElementById("metrica-ingresos").textContent   = pesos(total.ingresos);
  document.getElementById("metrica-comisiones").textContent = pesos(total.comision);
  document.getElementById("metrica-salon").textContent      = pesos(total.ingresos - total.comision);

  document.getElementById("tabla-empleadas").innerHTML = filas.length
    ? filas.map(f => `
        <tr>
          <th scope="row">${escaparHTML(f.nombre)}${f.inactiva ? ' <span class="estado estado--cancelada">Inactiva</span>' : ""}</th>
          <td>${escaparHTML(f.sucursal)}</td>
          <td class="tabla__numero">${f.citas}</td>
          <td class="tabla__numero">${pesos(f.ingresos)}</td>
          <td class="tabla__numero">${f.porcentaje}%</td>
          <td class="tabla__numero">${pesos(f.comision)}</td>
        </tr>`).join("")
    : `<tr><td colspan="6" class="tabla__vacia">No hay citas realizadas en este periodo.</td></tr>`;

  document.getElementById("tabla-empleadas-total").innerHTML = filas.length ? `
    <tr>
      <th scope="row" colspan="2">Total</th>
      <td class="tabla__numero">${total.citas}</td>
      <td class="tabla__numero">${pesos(total.ingresos)}</td>
      <td></td>
      <td class="tabla__numero">${pesos(total.comision)}</td>
    </tr>` : "";

  // Por sucursal: solo tiene sentido al ver ambas
  const seccion = document.getElementById("seccion-sucursales");
  seccion.classList.toggle("oculto", sucursalFiltro !== "todas");
  if (sucursalFiltro === "todas") {
    document.getElementById("tabla-sucursales").innerHTML = SUCURSALES.map(s => {
      // cada cita usa el porcentaje de quien la atendió
      const r = resumir(citas.filter(c => c.sucursalId === s.id));
      return `
        <tr>
          <th scope="row">${escaparHTML(s.nombre)}</th>
          <td class="tabla__numero">${r.citas}</td>
          <td class="tabla__numero">${pesos(r.ingresos)}</td>
          <td class="tabla__numero">${pesos(r.comision)}</td>
          <td class="tabla__numero">${pesos(r.ingresos - r.comision)}</td>
        </tr>`;
    }).join("");
  }
}

/* --- Eventos ------------------------------------------------- */
selectorMes.addEventListener("change", pintarIngresos);

/* --- Arranque ------------------------------------------------ */
llenarMeses();
iniciarPanel(pintarIngresos, "administradora");
