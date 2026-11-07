const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const root = path.join(__dirname, '..', 'nails-express');
const source = name => fs.readFileSync(path.join(root, 'js', name), 'utf8');
const fecha = '2030-01-15';
class Reloj extends Date {
  constructor(...args) { super(...(args.length ? args : [2030, 0, 1, 8])); }
  static now() { return new Reloj().getTime(); }
}
function reserva(extra = {}) {
  return { folio: 'EXISTENTE', fecha, hora: '11:00', duracion: 90,
    servicioId: 2, disenoId: 0, sucursalId: 2, empleadaId: 2, estado: 'activa', ...extra };
}
function motor() {
  const ctx = vm.createContext({ Date: Reloj });
  vm.runInContext(source('datos.js') + '\n' + source('agenda-citas.js'), ctx);
  // Equipo fijo para los escenarios de capacidad, independiente de nuevas demos.
  const datos = vm.runInContext(`({ servicios: SERVICIOS, disenos: DISENOS,
    sucursales: SUCURSALES, horarios: HORARIOS,
    empleadas: USUARIOS.filter(e => e.rol === 'empleada' && [2, 4, 5].includes(e.id)) })`, ctx);
  const agenda = vm.runInContext('AgendaCitas', ctx);
  return { agenda, datos, validar: (cita = {}, extra = {}) => agenda.validar({
    ...datos, citas: [], cerrados: {}, cita: reserva(cita), ...extra }) };
}

test('impide empalmes con una cita que empezó antes', () => {
  assert.equal(motor().validar({ hora: '12:15', duracion: 60 }, { citas: [reserva()] }).codigo, 'capacidad');
});
test('impide que un servicio invada la siguiente cita', () => {
  assert.equal(motor().validar({}, { citas: [reserva({ hora: '12:15' })] }).valida, false);
});
test('permite empezar exactamente cuando termina la cita anterior', () => {
  assert.equal(motor().validar({ hora: '12:15' }, { citas: [reserva({ duracion: 75 })] }).valida, true);
});
test('las citas canceladas y las de otra sucursal no consumen capacidad', () => {
  assert.equal(motor().validar({}, { citas: [reserva({ estado: 'cancelada' }), reserva({ sucursalId: 1 })] }).valida, true);
});
test('rechaza terminar después del cierre y permite terminar exactamente al cierre', () => {
  const m = motor();
  assert.equal(m.validar({ hora: '19:45' }).codigo, 'cierre');
  assert.equal(m.validar({ hora: '19:45', servicioId: 1, disenoId: 1, duracion: 75 }).valida, true);
});
test('incluye la duración extra del diseño si no hay duración guardada', () => {
  assert.equal(motor().validar({ hora: '19:45', servicioId: 1, disenoId: 5, duracion: undefined }).codigo, 'cierre');
});
test('respeta apertura, fechas válidas, horas futuras y duración positiva', () => {
  const m = motor();
  m.datos.sucursales[1].apertura = '12:00';
  assert.equal(m.validar().codigo, 'cierre');
  assert.equal(m.validar({ fecha: '2030-02-30' }).codigo, 'fecha');
  assert.equal(m.validar({ fecha: '2029-12-31' }).codigo, 'pasado');
  assert.equal(m.validar({ hora: '11:30' }).codigo, 'hora');
  assert.equal(m.validar({ duracion: 0 }).codigo, 'duracion');
});
test('solo ofrece empleadas activas de la sucursal y especialidad', () => {
  const { agenda, datos, validar } = motor();
  assert.deepEqual(Array.from(agenda.empleadasPara({ ...datos, servicioId: 1, sucursalId: 2 }), e => e.id), [2]);
  assert.equal(validar({ servicioId: 1, empleadaId: 5 }).codigo, 'especialidad');
  assert.equal(validar({ sucursalId: 1, empleadaId: 4 }).codigo, 'especialidad');
  datos.empleadas.find(e => e.id === 2).activa = false;
  assert.equal(validar({ empleadaId: 2 }).codigo, 'especialidad');
});
test('sin preferencia no admite un servicio que nadie realiza en la sucursal', () => {
  assert.equal(motor().validar({ sucursalId: 1, empleadaId: 0 }).codigo, 'especialidad');
});
test('sin preferencia no cuenta como libre a una empleada sin la especialidad', () => {
  assert.equal(motor().validar({ servicioId: 1, empleadaId: 0 }, { citas: [reserva()] }).valida, false);
});
test('sin preferencia cuenta reservas que empezaron en otro horario', () => {
  const citas = [reserva({ empleadaId: 0 }), reserva({ folio: 'OTRA', empleadaId: 0 })];
  assert.equal(motor().validar({ hora: '12:15', empleadaId: 0 }, { citas }).valida, false);
});
test('sin preferencia conserva capacidad para las reservas especializadas', () => {
  const m = motor();
  const citas = [reserva({ empleadaId: 0, servicioId: 1, duracion: 60 })];
  assert.equal(m.validar({ empleadaId: 2 }, { citas }).valida, false);
  assert.equal(m.validar({ empleadaId: 0 }, { citas }).valida, true);
});
test('exige una empleada disponible durante todo el servicio', () => {
  const extra = { citas: [reserva({ hora: '12:15' })], cerrados: { 5: { [fecha]: ['11:00'] } } };
  assert.equal(motor().validar({ empleadaId: 0 }, extra).valida, false);
});
test('considera cadenas de empalmes entre reservas sin asignar', () => {
  const m = motor();
  const citas = [reserva({ empleadaId: 0, hora: '12:15' }),
    reserva({ folio: 'GELISH', empleadaId: 0, servicioId: 1, hora: '13:30', duracion: 60 })];
  // Sofía tiene cerrado 12:15: la primera reserva necesita a Ana y
  // se empalma con Gelish, que también necesita a Ana.
  assert.equal(m.validar({ empleadaId: 5 }, { citas, cerrados: { 5: { [fecha]: ['12:15'] } } }).valida, false);
});
test('una reserva imposible en otro horario no bloquea todo el día', () => {
  assert.equal(motor().validar({}, { citas: [reserva({ empleadaId: 0, servicioId: 3, hora: '17:15' })] }).valida, true);
});
test('validar sin preferencia no modifica ni asigna las reservas', () => {
  const { agenda, datos } = motor();
  const cita = Object.freeze(reserva({ empleadaId: 0 }));
  const otra = Object.freeze(reserva({ folio: 'OTRA', empleadaId: 0, hora: '12:15' }));
  assert.equal(agenda.validar({ ...datos, cita, citas: [otra], cerrados: {} }).valida, true);
  assert.equal(cita.empleadaId, 0);
  assert.equal(otra.empleadaId, 0);
});
test('respeta todo el bloque cerrado, incluido el último hasta el cierre', () => {
  const m = motor();
  assert.equal(m.validar({}, { cerrados: { 2: { [fecha]: ['12:15'] } } }).valida, false);
  assert.equal(m.validar({ hora: '19:45', duracion: 60 }, { cerrados: { 2: { [fecha]: ['19:45'] } } }).valida, false);
});
test('al reprogramar excluye la propia cita y conserva la duración contratada', () => {
  const m = motor();
  const cita = reserva();
  assert.equal(m.validar({}, { citas: [cita], ignorarFolio: cita.folio }).valida, true);
  m.datos.servicios[1].duracion = 300;
  assert.equal(m.agenda.duracionDe(cita, m.datos.servicios, m.datos.disenos), 90);
});
test('la rejilla de disponibilidad protege todos los bloques de la reserva', () => {
  const { agenda, datos } = motor();
  const bloques = agenda.bloquesReservados({ ...datos, citas: [reserva()], empleadaId: 2 });
  assert.equal(bloques.has(fecha + '|11:00'), true);
  assert.equal(bloques.has(fecha + '|12:15'), true);
  assert.equal(bloques.has(fecha + '|13:30'), false);
});

test('una empleada envía cierres pendientes y solo se aplican al aprobarlos', () => {
  const e = entorno();
  e.localStorage.setItem('nailsExpress.sesion', JSON.stringify({
    id: 2, nombre: 'Ana Torres', rol: 'empleada'
  }));
  const solicitud = e.run(`Sesion.solicitarCierreDisponibilidad(2, [
    { fecha: '${fecha}', horas: ['11:00', '12:15'] }
  ])`);
  assert.equal(solicitud.guardada, true);
  assert.equal(e.run('Sesion.cerradosDe(2, "' + fecha + '").length'), 0);
  const id = e.run('Sesion.solicitudesDisponibilidad(2)[0].id');
  e.localStorage.setItem('nailsExpress.sesion', JSON.stringify({
    id: 3, nombre: 'Laura Treviño', rol: 'administradora'
  }));
  assert.equal(e.run(`Sesion.resolverSolicitudDisponibilidad("${id}", "aceptada").resuelta`), true);
  assert.deepEqual(Array.from(e.run(`Sesion.cerradosDe(2, "${fecha}")`)), ['11:00', '12:15']);
  assert.equal(e.run(`Sesion.validarCita({
    fecha: '${fecha}', hora: '11:00', servicioId: 2, disenoId: 0,
    duracion: 90, sucursalId: 2, empleadaId: 2
  }).codigo`), 'capacidad');
});

test('la administradora no puede aprobar un cierre que ya tiene una cita', () => {
  const e = entorno();
  e.localStorage.setItem('nailsExpress.sesion', JSON.stringify({
    id: 2, nombre: 'Ana Torres', rol: 'empleada'
  }));
  e.run(`Sesion.solicitarCierreDisponibilidad(2, [
    { fecha: '${fecha}', horas: ['11:00'] }
  ])`);
  const id = e.run('Sesion.solicitudesDisponibilidad(2)[0].id');
  e.run(`Sesion.guardarCita(${JSON.stringify(reserva({ duracion: 60 }))})`);
  e.localStorage.setItem('nailsExpress.sesion', JSON.stringify({
    id: 3, nombre: 'Laura Treviño', rol: 'administradora'
  }));
  const resultado = e.run(`Sesion.resolverSolicitudDisponibilidad("${id}", "aceptada")`);
  assert.equal(resultado.resuelta, false);
  assert.match(resultado.mensaje, /ya tienen citas reservadas/);
  assert.equal(e.run('Sesion.solicitudesDisponibilidad(2)[0].estado'), 'pendiente');
  assert.deepEqual(Array.from(e.run(`Sesion.cerradosDe(2, "${fecha}")`)), []);
});

test('la aprobación protege citas sin preferencia que dependen de la empleada', () => {
  const e = entorno();
  e.localStorage.setItem('nailsExpress.sesion', JSON.stringify({
    id: 2, nombre: 'Ana Torres', rol: 'empleada'
  }));
  e.run(`Sesion.solicitarCierreDisponibilidad(2, [
    { fecha: '${fecha}', horas: ['11:00'] }
  ])`);
  const id = e.run('Sesion.solicitudesDisponibilidad(2)[0].id');
  e.run(`Sesion.guardarCita(${JSON.stringify(reserva({
    folio: 'SIN-PREFERENCIA', duracion: 60, servicioId: 1, empleadaId: 0
  }))})`);
  e.localStorage.setItem('nailsExpress.sesion', JSON.stringify({
    id: 3, nombre: 'Laura Treviño', rol: 'administradora'
  }));
  const resultado = e.run(`Sesion.resolverSolicitudDisponibilidad("${id}", "aceptada")`);
  assert.equal(resultado.resuelta, false);
  assert.match(resultado.mensaje, /cita sin preferencia/);
  assert.equal(e.run('Sesion.solicitudesDisponibilidad(2)[0].estado'), 'pendiente');
});

test('rechazar una solicitud la conserva en el historial sin cerrar horarios', () => {
  const e = entorno();
  e.localStorage.setItem('nailsExpress.sesion', JSON.stringify({
    id: 2, nombre: 'Ana Torres', rol: 'empleada'
  }));
  e.run(`Sesion.solicitarCierreDisponibilidad(2, [
    { fecha: '${fecha}', horas: ['11:00'] }
  ])`);
  const id = e.run('Sesion.solicitudesDisponibilidad(2)[0].id');
  e.localStorage.setItem('nailsExpress.sesion', JSON.stringify({
    id: 3, nombre: 'Laura Treviño', rol: 'administradora'
  }));
  assert.equal(e.run(`Sesion.resolverSolicitudDisponibilidad("${id}", "rechazada").resuelta`), true);
  assert.equal(e.run('Sesion.solicitudesDisponibilidad(2)[0].estado'), 'rechazada');
  assert.deepEqual(Array.from(e.run(`Sesion.cerradosDe(2, "${fecha}")`)), []);
});

// DOM mínimo para ejecutar los scripts completos, sus eventos y almacenamiento.
// Estas comprobaciones no sustituyen una prueba visual en navegador.
function entorno() {
  function eventos(obj = {}) {
    const listeners = new Map();
    obj.addEventListener = (tipo, callback) => {
      if (!listeners.has(tipo)) listeners.set(tipo, []);
      listeners.get(tipo).push(callback);
    };
    obj.dispatchEvent = e => { for (const fn of listeners.get(e.type) || []) fn(e); };
    return obj;
  }
  function elemento() {
    const clases = new Set();
    const hijos = new Map();
    const el = eventos({ value: '', innerHTML: '', textContent: '', open: false,
      classList: { add: c => clases.add(c), remove: c => clases.delete(c), contains: c => clases.has(c),
        toggle(c, on = !clases.has(c)) { if (on) clases.add(c); else clases.delete(c); } },
      querySelectorAll: () => [], querySelector(selector) {
        if (!hijos.has(selector)) hijos.set(selector, elemento());
        return hijos.get(selector);
      }, insertAdjacentHTML() {}, setAttribute() {}, focus() {},
      showModal() { el.open = true; }, close() { el.open = false; el.dispatchEvent({ type: 'close' }); } });
    return el;
  }
  const elementos = new Map();
  const document = eventos({ body: elemento(), querySelectorAll: () => [], createElement: elemento,
    getElementById(id) { if (!elementos.has(id)) elementos.set(id, elemento()); return elementos.get(id); } });
  document.getElementById('vista-lista').classList.add('oculto');
  const almacen = new Map([['nailsExpress.version', '2']]);
  const localStorage = { getItem: k => almacen.get(k) || null, setItem: (k, v) => almacen.set(k, v), removeItem: k => almacen.delete(k) };
  const sandbox = eventos({ document, localStorage, Date: Reloj, crypto: webcrypto, URLSearchParams,
    location: { search: '', pathname: '/agendar.html' }, scrollTo() {},
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    escaparHTML: s => String(s), nombreSucursal: () => 'Sucursal', fechaLarga: s => s });
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const archivo of ['datos.js', 'agenda-citas.js', 'sesion.js']) vm.runInContext(source(archivo), ctx);
  vm.runInContext(`CITAS.length = 0;
    USUARIOS.splice(0, USUARIOS.length, ...USUARIOS.filter(c => c.rol !== 'empleada' || [2, 4, 5].includes(c.id)))`, ctx);
  return { ctx, document, almacen, localStorage, run: code => vm.runInContext(code, ctx),
    cargar: name => vm.runInContext(source(name), ctx), evento: tipo => document.dispatchEvent({ type: tipo }) };
}
const seleccion = `Object.assign(cita, { servicio: SERVICIOS[1], diseno: DISENOS[0], sucursal: SUCURSALES[1],
  empleada: SIN_PREFERENCIA, fecha: '${fecha}', hora: '11:00', nombre: 'Prueba', telefono: '8111111111' }); paso = 3;`;

// Edición administrativa: se ejercita la misma operación que usa el formulario.
function edicionAdmin(extra = {}) {
  const e = entorno();
  const original = reserva({ empleadaId: 0, colorId: null, total: 590, pago: 'anticipo', ...extra });
  e.localStorage.setItem('nailsExpress.sesion', JSON.stringify({ id: 3, nombre: 'Laura', rol: 'administradora' }));
  e.run(`Sesion.guardarCita(${JSON.stringify(original)})`);
  return { ...e, original,
    editar: (campos = { empleadaId: 5, colorId: 1 }) => e.run(
      `Sesion.completarCita('EXISTENTE', ${JSON.stringify(campos)}, ${JSON.stringify(original)})`),
    leer: () => JSON.parse(JSON.stringify(e.run(`Sesion.citas().find(c => c.folio === 'EXISTENTE')`))) };
}

test('admin asigna empleada y tono sin cambiar servicio, diseño, pago, total ni estado', () => {
  const e = edicionAdmin();
  assert.equal(e.editar({ empleadaId: 5, colorId: 1, total: 1, estado: 'atendida' }).guardada, true);
  assert.deepEqual(e.leer(), { ...e.original, empleadaId: 5, colorId: 1, asignadaAlAtender: false });
});

test('completar cita exige sesión administrativa y una cita activa', () => {
  for (const rol of ['cliente', 'empleada', null]) {
    const e = edicionAdmin();
    e.localStorage.setItem('nailsExpress.sesion', JSON.stringify(rol ? { nombre: 'Otra', rol } : null));
    assert.equal(e.editar().guardada, false);
    assert.deepEqual(e.leer(), e.original);
  }
  for (const estado of ['atendida', 'cancelada', 'no-asistio']) {
    assert.equal(edicionAdmin({ estado }).editar().guardada, false);
  }
  const e = edicionAdmin();
  e.localStorage.setItem('nailsExpress.citas', '[]');
  assert.equal(e.editar().guardada, false);
});

test('admin solo puede asignar empleadas activas de la sucursal y especialidad', () => {
  assert.equal(edicionAdmin().editar({ empleadaId: 4, colorId: null }).guardada, false);
  assert.equal(edicionAdmin({ servicioId: 1 }).editar().guardada, false);
  const e = edicionAdmin();
  e.run('USUARIOS.find(e => e.id === 5).activa = false');
  assert.equal(e.editar().guardada, false);
});

test('asignar revisa la duración completa, cierres y capacidad para citas sin preferencia', () => {
  const e = edicionAdmin();
  e.run(`Sesion.guardarCita(${JSON.stringify(reserva({ folio: 'OTRA', empleadaId: 5, hora: '12:15' }))})`);
  assert.equal(e.editar().guardada, false);
  assert.deepEqual(e.leer(), e.original);
  const cerrado = edicionAdmin();
  cerrado.localStorage.setItem('nailsExpress.disponibilidad', JSON.stringify({ 5: { [fecha]: ['12:15'] } }));
  assert.equal(cerrado.editar().guardada, false);
  const capacidad = edicionAdmin();
  capacidad.run(`Sesion.guardarCita(${JSON.stringify(reserva({ folio: 'GELISH', empleadaId: 0, servicioId: 1, duracion: 60 }))})`);
  assert.equal(capacidad.editar({ empleadaId: 2, colorId: null }).guardada, false);
  assert.equal(capacidad.editar().guardada, true);
});

test('se puede asignar al llegar aunque ya haya comenzado la hora, conservando validación de empalmes', () => {
  const e = edicionAdmin({ fecha: '2029-12-31' });
  assert.equal(e.editar().guardada, true);
  const ocupado = edicionAdmin({ fecha: '2029-12-31' });
  ocupado.run(`Sesion.guardarCita(${JSON.stringify(reserva({ folio: 'OTRA', fecha: '2029-12-31', empleadaId: 5 }))})`);
  assert.equal(ocupado.editar().guardada, false);
});

test('una cita atendida conserva empleada y tono aunque la admin intente modificarlos', () => {
  const e = edicionAdmin({ fecha: '2029-12-31', estado: 'atendida', empleadaId: 2, asignadaAlAtender: true });
  assert.equal(e.editar({ empleadaId: 0, colorId: null }).guardada, false);
  assert.equal(e.editar().guardada, false);
  assert.equal(e.editar({ empleadaId: 2, colorId: 1 }).guardada, false);
  assert.deepEqual(e.leer(), e.original);
});

test('completar rechaza una cita que pasó a atendida mientras el formulario estaba abierto', () => {
  const e = edicionAdmin({ empleadaId: 2, colorId: 1 });
  e.run(`Sesion.guardarCita(${JSON.stringify({ ...e.original, estado: 'atendida' })})`);
  assert.equal(e.editar({ empleadaId: 5, colorId: 2 }).guardada, false);
  assert.deepEqual(e.leer(), { ...e.original, estado: 'atendida' });
});

test('admin muestra el botón y abre la edición solo para citas activas', () => {
  const e = edicionAdmin();
  e.cargar('panel.js');
  e.cargar('panel-admin.js');
  for (const estado of ['atendida', 'no-asistio', 'cancelada']) {
    e.run(`Sesion.guardarCita(${JSON.stringify({ ...e.original, estado })})`);
    assert.doesNotMatch(e.run('filaCitaGeneral(Sesion.citas()[0], true)'), /data-completar=/);
    e.run('abrirCompletarCita("EXISTENTE")');
    assert.equal(e.document.getElementById('completar-cita').open, false);
  }
  e.run(`Sesion.guardarCita(${JSON.stringify(e.original)})`);
  assert.match(e.run('filaCitaGeneral(Sesion.citas()[0], true)'), /data-completar=/);
  e.run('abrirCompletarCita("EXISTENTE")');
  assert.equal(e.document.getElementById('completar-cita').open, true);
});

test('tono admite Por elegir y conserva un tono agotado; rechaza nuevos tonos agotados o inexistentes', () => {
  for (const colorId of [4, 999, 0, '1']) {
    const e = edicionAdmin();
    assert.equal(e.editar({ empleadaId: 0, colorId }).guardada, false);
  }
  const e = edicionAdmin({ empleadaId: 2, colorId: 4 });
  assert.equal(e.editar({ empleadaId: 2, colorId: 4 }).guardada, true);
  assert.equal(e.editar({ empleadaId: 2, colorId: null }).guardada, true);
  assert.equal(e.leer().colorId, null);
});

test('completar solo el tono conserva asignación histórica aunque la empleada esté inactiva', () => {
  const e = edicionAdmin({ empleadaId: 2, asignadaAlAtender: true });
  e.run('USUARIOS.find(e => e.id === 2).activa = false');
  assert.equal(e.editar({ empleadaId: 2, colorId: 1 }).guardada, true);
  assert.equal(e.leer().asignadaAlAtender, true);
});

test('editar no sobrescribe una cita que cambió en otra pestaña', () => {
  const e = edicionAdmin();
  e.run(`Sesion.guardarCita(${JSON.stringify({ ...e.original, hora: '16:00' })})`);
  assert.equal(e.editar().guardada, false);
  assert.equal(e.leer().hora, '16:00');
  assert.equal(e.leer().empleadaId, 0);
});

test('completar avisa errores de almacenamiento y notifica la agenda solo si guarda', () => {
  const e = edicionAdmin();
  let cambios = 0;
  e.document.addEventListener('agenda:cambio', () => cambios++);
  const guardar = e.localStorage.setItem;
  e.localStorage.setItem = () => { throw new Error('Sin espacio'); };
  assert.equal(e.editar().guardada, false);
  assert.equal(cambios, 0);
  assert.deepEqual(e.leer(), e.original);
  e.localStorage.setItem = guardar;
  assert.equal(e.editar().guardada, true);
  assert.equal(cambios, 1);
});
test('la agenda de empleada actualiza asignaciones y búsqueda al cambiar datos en otra pestaña', () => {
  const e = entorno();
  e.localStorage.setItem('nailsExpress.sesion', JSON.stringify({ id: 2, nombre: 'Ana', rol: 'empleada' }));
  e.cargar('panel.js');
  e.cargar('panel-empleada.js');
  e.run(`Sesion.guardarCita(${JSON.stringify(reserva({ folio: 'NE-EXISTENTE', fecha: '2030-01-01' }))});
    ultimaBusqueda = 'EXISTENTE';`);
  // El DOM mínimo no serializa textContent como HTML; se sustituye solo esa ayuda.
  e.run('escaparHTML = texto => String(texto);');
  e.evento('agenda:cambio');
  assert.match(e.document.getElementById('agenda-lista').innerHTML, /data-fila="NE-EXISTENTE"/);
  e.run(`Sesion.guardarCita(${JSON.stringify(reserva({ folio: 'NE-EXISTENTE', fecha: '2030-01-01', empleadaId: 5 }))});`);
  e.evento('agenda:cambio');
  assert.doesNotMatch(e.document.getElementById('agenda-lista').innerHTML, /data-fila="NE-EXISTENTE"/);
  assert.match(e.document.getElementById('buscar-resultados').innerHTML, /Sofía Luna/);
  assert.equal(e.document.getElementById('metrica-citas').textContent, 0);
  assert.doesNotMatch(e.document.getElementById('buscar-resultados').innerHTML, /data-accion=/);
  e.run(`Sesion.guardarCita(${JSON.stringify(reserva({ folio: 'NE-EXISTENTE', fecha: '2030-01-01' }))});
    window.dispatchEvent({ type: 'focus' });`);
  assert.match(e.document.getElementById('agenda-lista').innerHTML, /data-fila="NE-EXISTENTE"/);
  assert.equal(e.document.getElementById('metrica-citas').textContent, 1);
});

function reprogramacionEmpleada(extra = {}) {
  const e = entorno();
  e.localStorage.setItem('nailsExpress.sesion', JSON.stringify({ id: 2, nombre: 'Ana', rol: 'empleada' }));
  const original = reserva(extra);
  e.run(`Sesion.guardarCita(${JSON.stringify(original)})`);
  return { ...e, original, mover: (cambios = { fecha, hora: '16:00', empleadaId: 2 }) =>
    e.run(`Sesion.reprogramarCitaEmpleada(${JSON.stringify(original)}, ${JSON.stringify(cambios)})`) };
}

test('empleada reprograma fecha y hora de su propia cita sin transferirla', () => {
  const e = reprogramacionEmpleada();
  assert.equal(e.mover({ fecha, hora: '16:00', empleadaId: 5 }).valida, false);
  assert.equal(e.run('Sesion.citas()[0].empleadaId'), 2);
  assert.equal(e.mover().valida, true);
  assert.equal(e.run('Sesion.citas()[0].hora'), '16:00');
  assert.equal(e.run('Sesion.citas()[0].empleadaId'), 2);
});

test('empleada no puede gestionar citas ajenas, sin asignar, de otra sucursal o con cuenta inactiva', () => {
  for (const extra of [{ empleadaId: 5 }, { empleadaId: 0 }, { sucursalId: 1 }]) {
    const e = reprogramacionEmpleada(extra);
    assert.equal(e.run('Sesion.puedeGestionarCita(Sesion.citas()[0])'), false);
    assert.equal(e.mover().valida, false);
  }
  const e = reprogramacionEmpleada();
  e.run('USUARIOS.find(c => c.id === 2).activa = false');
  assert.equal(e.mover().valida, false);
});

test('reprogramación de empleada rechaza citas cambiadas, canceladas, atendidas o ya comenzadas', () => {
  for (const extra of [{ estado: 'cancelada' }, { estado: 'atendida' }, { fecha: '2029-12-31' }]) {
    assert.equal(reprogramacionEmpleada(extra).mover().valida, false);
  }
  const e = reprogramacionEmpleada();
  e.run(`Sesion.guardarCita(${JSON.stringify({ ...e.original, colorId: 1 })})`);
  assert.equal(e.mover().valida, false);
  assert.equal(e.run('Sesion.citas()[0].colorId'), 1);
});

test('modal de empleada oculta selector y se cierra si la cita es reasignada mientras está abierto', () => {
  const e = reprogramacionEmpleada();
  e.cargar('reprogramar.js');
  e.run('Reprogramar.abrir(Sesion.citas()[0], { deClienta: false });');
  assert.equal(e.document.getElementById('reprogramar').open, true);
  assert.doesNotMatch(e.document.getElementById('reprogramar-empleadas').innerHTML, /data-empleada=/);
  e.run(`Sesion.guardarCita(${JSON.stringify({ ...e.original, empleadaId: 5 })})`);
  e.evento('agenda:cambio');
  assert.equal(e.document.getElementById('reprogramar').open, false);
  assert.equal(e.mover().valida, false);
  e.run('Reprogramar.abrir(Sesion.citas()[0], { deClienta: false });');
  assert.equal(e.document.getElementById('reprogramar').open, false);
});

test('la empleada puede seleccionar todos los bloques del día como solicitud', () => {
  const e = entorno();
  e.localStorage.setItem('nailsExpress.sesion', JSON.stringify({
    id: 2, nombre: 'Ana Torres', rol: 'empleada'
  }));
  e.cargar('panel.js');
  e.cargar('disponibilidad.js');
  assert.match(e.document.getElementById('rejilla-dias').innerHTML, /Todo el día/);
  e.run(`seleccionarTodoElDia('2030-01-02')`);
  assert.equal(e.run(`seleccionCierres['2030-01-02'].length`), 8);
  assert.equal(e.document.getElementById('disponibilidad-enviar').disabled, false);
});

test('al confirmar rechaza un horario ocupado después de seleccionarlo', () => {
  const e = entorno(); e.cargar('agendar.js'); e.run(seleccion);
  e.run(`Sesion.guardarCita(${JSON.stringify(reserva({ empleadaId: 2 }))});
    Sesion.guardarCita(${JSON.stringify(reserva({ folio: 'OTRA', empleadaId: 5 }))}); confirmar();`);
  assert.equal(e.run('Sesion.citas().length'), 2);
  assert.equal(e.document.getElementById('vista-lista').classList.contains('oculto'), true);
  assert.equal(e.run('cita.hora'), '');
});
test('una reserva válida se guarda sin asignar y después muestra éxito', () => {
  const e = entorno(); e.cargar('agendar.js'); e.run(seleccion + 'confirmar();');
  assert.equal(e.run('Sesion.citas()[0].empleadaId'), 0);
  assert.equal(e.document.getElementById('vista-lista').classList.contains('oculto'), false);
});
test('un error de almacenamiento no muestra una confirmación falsa', () => {
  const e = entorno(); e.cargar('agendar.js'); e.run(seleccion);
  e.localStorage.setItem = () => { throw new Error('Sin espacio'); };
  e.run('confirmar()');
  assert.equal(e.run('Sesion.citas().length'), 0);
  assert.equal(e.document.getElementById('vista-lista').classList.contains('oculto'), true);
  assert.match(e.document.getElementById('agendar-aviso').textContent, /No pudimos guardar/);
});
test('borrar la fecha limpia la hora y deshabilita todos los horarios', () => {
  const e = entorno(); e.cargar('agendar.js'); e.run(seleccion + 'cita.fecha = ""; pintarHoras();');
  assert.equal(e.run('cita.hora'), '');
  assert.equal((e.document.getElementById('op-horas').innerHTML.match(/disabled/g) || []).length, 8);
});
test('otra pestaña invalida una selección cuando se agota la capacidad', () => {
  const e = entorno(); e.cargar('agendar.js'); e.run(seleccion);
  e.run(`Sesion.guardarCita(${JSON.stringify(reserva())});
    Sesion.guardarCita(${JSON.stringify(reserva({ folio: 'OTRA', empleadaId: 5 }))});`);
  e.evento('agenda:cambio');
  assert.equal(e.run('cita.hora'), '');
  assert.equal(e.run('paso'), 2);
});
test('la reprogramación vuelve a validar al guardar sin cambiar la cita si falla', () => {
  const e = entorno(); e.cargar('reprogramar.js');
  const original = reserva({ folio: 'MOVER', fecha: '2030-01-16' });
  e.run(`Sesion.guardarCita(${JSON.stringify(original)}); Reprogramar.abrir(Sesion.citas()[0], { alGuardar() {} });`);
  const campo = e.document.getElementById('reprogramar-fecha');
  campo.value = fecha; campo.dispatchEvent({ type: 'change' });
  e.run(`Sesion.guardarCita(${JSON.stringify(reserva())});`);
  e.document.getElementById('form-reprogramar').dispatchEvent({ type: 'submit', preventDefault() {} });
  assert.equal(e.run('Sesion.citas().find(c => c.folio === "MOVER").fecha'), '2030-01-16');
  assert.equal(e.document.getElementById('reprogramar').open, true);
});
test('reprogramar sin especialistas no ofrece Sin preferencia', () => {
  const e = entorno(); e.cargar('reprogramar.js');
  e.run(`Reprogramar.abrir(${JSON.stringify(reserva({ sucursalId: 1 }))}, { alGuardar() {} });`);
  assert.doesNotMatch(e.document.getElementById('reprogramar-empleadas').innerHTML, /data-empleada/);
  assert.match(e.document.getElementById('reprogramar-ayuda').textContent, /No se puede reprogramar/);
});
test('reprogramar una cita válida conserva Sin preferencia y guarda antes del callback', () => {
  const e = entorno(); e.cargar('reprogramar.js');
  e.run(`Sesion.guardarCita(${JSON.stringify(reserva({ folio: 'MOVER', fecha: '2030-01-16', empleadaId: 0 }))});
    globalThis.fechaGuardada = null;
    Reprogramar.abrir(Sesion.citas()[0], { alGuardar(nueva) {
      fechaGuardada = Sesion.citas().find(c => c.folio === nueva.folio).fecha;
    } });`);
  const campo = e.document.getElementById('reprogramar-fecha');
  campo.value = fecha; campo.dispatchEvent({ type: 'change' });
  e.document.getElementById('form-reprogramar').dispatchEvent({ type: 'submit', preventDefault() {} });
  assert.equal(e.run('fechaGuardada'), fecha);
  assert.equal(e.run('Sesion.citas()[0].empleadaId'), 0);
  assert.equal(e.run('Sesion.citas()[0].reprogramaciones'), 1);
  assert.equal(e.document.getElementById('reprogramar').open, false);
});
test('la reprogramación limpia la selección si cambian las reservas de otra pestaña', () => {
  const e = entorno(); e.cargar('reprogramar.js');
  e.run(`Reprogramar.abrir(${JSON.stringify(reserva({ folio: 'MOVER', fecha: '2030-01-16' }))}, { alGuardar() {} });`);
  const campo = e.document.getElementById('reprogramar-fecha');
  campo.value = fecha; campo.dispatchEvent({ type: 'change' });
  e.run(`Sesion.guardarCita(${JSON.stringify(reserva())});`);
  e.evento('agenda:cambio');
  assert.doesNotMatch(e.document.getElementById('reprogramar-horas').innerHTML, /aria-pressed="true"/);
  assert.match(e.document.getElementById('form-reprogramar').querySelector('.aviso').textContent, /dejó de estar disponible/);
});
test('el aviso al confirmar permanece fuera de los pasos que se ocultan', () => {
  const html = fs.readFileSync(path.join(root, 'agendar.html'), 'utf8');
  const aviso = html.indexOf('id="agendar-aviso"');
  assert.ok(aviso > html.indexOf('<aside class="resumen">'));
  assert.ok(aviso < html.indexOf('</aside>'));
});
test('todas las páginas cargan el motor antes que la sesión', () => {
  for (const archivo of fs.readdirSync(root).filter(n => n.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, archivo), 'utf8');
    assert.ok(html.indexOf('js/agenda-citas.js') > html.indexOf('js/datos.js'), archivo);
    assert.ok(html.indexOf('js/sesion.js') > html.indexOf('js/agenda-citas.js'), archivo);
  }
});
