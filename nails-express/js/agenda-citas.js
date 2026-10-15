/* Reglas compartidas de reservas. No asignan empleadas ni guardan datos. */
const AgendaCitas = (function () {
  function minutos(hora) {
    if (typeof hora !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return NaN;
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
  }

  function duracionDe(cita, servicios, disenos) {
    if (cita.duracion != null) return Number(cita.duracion);
    const servicio = servicios.find(s => s.id === cita.servicioId);
    const diseno = disenos.find(d => d.id === cita.disenoId);
    return servicio ? servicio.duracion + (diseno ? diseno.duracionExtra : 0) : NaN;
  }

  function intervaloDe(cita, servicios, disenos) {
    const inicio = minutos(cita.hora);
    const duracion = duracionDe(cita, servicios, disenos);
    return Number.isFinite(inicio) && Number.isFinite(duracion) && duracion > 0
      ? { inicio, fin: inicio + duracion } : null;
  }

  // Intervalos semiabiertos: terminar a las 12:15 permite empezar a las 12:15.
  function seEmpalman(a, b) {
    return a.inicio < b.fin && b.inicio < a.fin;
  }

  function bloqueDe(hora, horarios, sucursal) {
    const inicio = minutos(hora);
    const siguiente = horarios.map(minutos).find(h => h > inicio);
    return { inicio, fin: siguiente == null ? minutos(sucursal.cierre) : siguiente };
  }

  function empleadasPara({ empleadas, servicios, servicioId, sucursalId }) {
    const servicio = servicios.find(s => s.id === servicioId);
    return servicio ? empleadas.filter(e => e.activa !== false && e.sucursal === sucursalId &&
      e.especialidades.includes(servicio.nombre)) : [];
  }

  // Comprueba también grupos de servicios que compiten por pocas especialistas.
  function hayCupoSimultaneo(trabajos) {
    return [...new Set(trabajos.map(t => t.inicio))].every(instante => {
      const simultaneos = trabajos.filter(t => t.inicio <= instante && instante < t.fin);
      const asignadas = new Map();
      function encontrar(trabajo, visitadas) {
        return trabajo.opciones.some(id => {
          if (visitadas.has(id)) return false;
          visitadas.add(id);
          if (!asignadas.has(id) || encontrar(asignadas.get(id), visitadas)) {
            asignadas.set(id, trabajo);
            return true;
          }
          return false;
        });
      }
      return simultaneos.every(t => encontrar(t, new Set()));
    });
  }

  function sePuedenAtender(trabajos) {
    if (!hayCupoSimultaneo(trabajos)) return false;
    const agendas = new Map();
    function repartir(pendientes) {
      if (!pendientes.length) return true;
      let elegido, opciones;
      for (const trabajo of pendientes) {
        const libres = trabajo.opciones.filter(id =>
          !(agendas.get(id) || []).some(otro => seEmpalman(trabajo, otro)));
        if (!libres.length) return false;
        if (!opciones || libres.length < opciones.length) {
          elegido = trabajo;
          opciones = libres;
        }
      }
      const resto = pendientes.filter(t => t !== elegido);
      return opciones.some(id => {
        const agenda = agendas.get(id) || [];
        agendas.set(id, agenda);
        agenda.push(elegido);
        const posible = repartir(resto);
        agenda.pop();
        return posible;
      });
    }
    return repartir(trabajos);
  }

  function validar({ cita, citas, empleadas, servicios, disenos, sucursales,
                     horarios, cerrados, ignorarFolio, ahora = new Date() }) {
    const error = (codigo, mensaje) => ({ valida: false, codigo, mensaje });
    const sucursal = sucursales.find(s => s.id === cita.sucursalId);
    const servicio = servicios.find(s => s.id === cita.servicioId);
    if (!sucursal || !servicio) return error("seleccion", "Elige un servicio y una sucursal válidos.");
    const dia = new Date(cita.fecha + "T00:00:00");
    const fechaLocal = Number.isFinite(dia.getTime()) &&
      `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cita.fecha) || fechaLocal !== cita.fecha) {
      return error("fecha", "Elige un día válido para tu cita.");
    }
    if (!horarios.includes(cita.hora)) return error("hora", "Elige uno de los horarios disponibles.");
    if (new Date(cita.fecha + "T" + cita.hora) <= ahora) {
      return error("pasado", "Ese horario ya pasó. Elige un horario futuro.");
    }
    const intervalo = intervaloDe(cita, servicios, disenos);
    if (!intervalo) return error("duracion", "No pudimos comprobar la duración del servicio. Vuelve a seleccionarlo.");
    if (intervalo.inicio < minutos(sucursal.apertura) || intervalo.fin > minutos(sucursal.cierre)) {
      return error("cierre", `El servicio completo debe realizarse entre las ${sucursal.apertura} y las ${sucursal.cierre}. Elige otro horario.`);
    }
    if (!Number.isInteger(cita.empleadaId) || cita.empleadaId < 0) {
      return error("empleada", "Elige una empleada o la opción Sin preferencia.");
    }
    const aptas = empleadasPara({ empleadas, servicios, servicioId: cita.servicioId, sucursalId: cita.sucursalId });
    if (!aptas.length) return error("especialidad", "No hay empleadas que realicen este servicio en esta sucursal. Elige otra sucursal o servicio.");
    if (cita.empleadaId && !aptas.some(e => e.id === cita.empleadaId)) {
      return error("especialidad", "La empleada elegida no está disponible para este servicio en esta sucursal. Elige otra opción.");
    }

    const delDia = citas.filter(c => c.fecha === cita.fecha && c.sucursalId === cita.sucursalId &&
      c.estado !== "cancelada" && c.folio !== ignorarFolio);
    const ocupadas = new Map();
    for (const empleada of empleadas.filter(e => e.activa !== false && e.sucursal === cita.sucursalId)) {
      const bloques = ((cerrados[empleada.id] || {})[cita.fecha] || [])
        .map(h => bloqueDe(h, horarios, sucursal));
      const reservas = delDia.filter(c => c.empleadaId === empleada.id)
        .map(c => intervaloDe(c, servicios, disenos));
      if (reservas.some(r => !r)) return error("datos", "No pudimos comprobar las reservas de ese día. Contacta a la sucursal.");
      ocupadas.set(empleada.id, bloques.concat(reservas));
    }

    function trabajoDe(reserva) {
      const periodo = intervaloDe(reserva, servicios, disenos);
      if (!periodo) return null;
      const candidatas = empleadasPara({ empleadas, servicios,
        servicioId: reserva.servicioId, sucursalId: reserva.sucursalId });
      return { ...periodo, opciones: candidatas.filter(e =>
        (!reserva.empleadaId || reserva.empleadaId === e.id) &&
        !(ocupadas.get(e.id) || []).some(b => seEmpalman(periodo, b))).map(e => e.id) };
    }

    // Solo las reservas sin asignar conectadas por empalmes con la nueva
    // pueden cambiar su capacidad. Incluye conexiones indirectas.
    const trabajos = [trabajoDe(cita)];
    const pendientes = delDia.filter(c => c.empleadaId === 0).map(trabajoDe);
    if (pendientes.some(t => !t)) return error("datos", "No pudimos comprobar las reservas de ese día. Contacta a la sucursal.");
    let agregadas;
    do {
      agregadas = false;
      for (let i = pendientes.length - 1; i >= 0; i--) {
        if (trabajos.some(t => seEmpalman(t, pendientes[i]))) {
          trabajos.push(pendientes.splice(i, 1)[0]);
          agregadas = true;
        }
      }
    } while (agregadas);

    if (!sePuedenAtender(trabajos)) {
      return error("capacidad", "Ese horario no tiene capacidad para atender el servicio completo. Elige otra hora, día o empleada.");
    }
    // La distribución anterior es temporal: nunca se asigna una empleada aquí.
    return { valida: true, codigo: "", mensaje: "" };
  }

  function bloquesReservados({ citas, empleadaId, servicios, disenos, sucursales, horarios }) {
    const reservados = new Set();
    citas.filter(c => c.empleadaId === empleadaId && c.estado !== "cancelada").forEach(c => {
      const sucursal = sucursales.find(s => s.id === c.sucursalId);
      const periodo = intervaloDe(c, servicios, disenos);
      if (!sucursal || !periodo) return;
      horarios.forEach(h => {
        if (seEmpalman(periodo, bloqueDe(h, horarios, sucursal))) reservados.add(c.fecha + "|" + h);
      });
    });
    return reservados;
  }

  return { validar, empleadasPara, duracionDe, bloquesReservados };
})();
