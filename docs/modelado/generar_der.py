"""Genera el DER documentado; no crea tablas ni cambia el prototipo.

Fuente: Unidad2_RA_BD.pdf y commit 890067a, rama pendiente-semana-10.
Ejecutar desde cualquier directorio: python docs/modelado/generar_der.py
Requiere reportlab. Las reglas entre tablas se documentan, no se ejecutan.
"""
from pathlib import Path
import json
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.utils import simpleSplit

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)

# Cada campo define nombre, tipo, llaves y nulabilidad explícita.
def field(name, typ, keys='', nullable=False):
    return dict(name=name, type=typ, keys=keys, nullable=nullable)

F = field
T = {
 'Usuarios': [F('Id_usuario','INT','PK'), F('Nombre_usuario','VARCHAR(100)'), F('Correo_usuario','VARCHAR(120)','UQ'), F('Telefono_usuario','CHAR(10)','UQ'), F('Contrasena_usuario','VARCHAR(255)'), F('Rol_usuario','VARCHAR(20)'), F('Fecha_registro_usuario','DATETIME'), F('Estado_usuario','BOOLEAN')],
 'Sucursales': [F('Id_sucursal','INT','PK'), F('Nombre_sucursal','VARCHAR(80)'), F('Direccion_sucursal','VARCHAR(150)'), F('Apertura_sucursal','TIME'), F('Cierre_sucursal','TIME'), F('Activa_sucursal','BOOLEAN')],
 'Servicios': [F('Id_servicio','INT','PK'), F('Nombre_servicio','VARCHAR(80)'), F('Descripcion_servicio','VARCHAR(255)',nullable=True), F('Precio_servicio','DECIMAL(8,2)'), F('Duracion_servicio','SMALLINT'), F('Requiere_especialista_servicio','BOOLEAN')],
 'Disenos': [F('Id_diseno','INT','PK'), F('Nombre_diseno','VARCHAR(80)'), F('Costo_extra_diseno','DECIMAL(8,2)'), F('Duracion_extra_diseno','SMALLINT'), F('Activo_diseno','BOOLEAN')],
 'Familias_color': [F('Id_familia_color','VARCHAR(30)','PK'), F('Nombre_familia_color','VARCHAR(60)','UQ'), F('Activa_familia_color','BOOLEAN')],
 'Colores': [F('Id_color','INT','PK'), F('Nombre_color','VARCHAR(80)'), F('Familia_id_color','VARCHAR(30)','FK'), F('Hex_color','CHAR(7)'), F('Marca_color','VARCHAR(60)',nullable=True), F('Disponible_color','BOOLEAN')],
 'Empleadas': [F('Id_empleada','INT','PK'), F('Usuario_id_empleada','INT','FK,UQ'), F('Sucursal_id_empleada','INT','FK'), F('Comision_empleada','DECIMAL(5,2)'), F('Activa_empleada','BOOLEAN')],
 'Especialidades_empleada': [F('Id_especialidad_empleada','INT','PK'), F('Empleada_id_especialidad','INT','FK'), F('Servicio_id_especialidad','INT','FK')],
 'Horarios': [F('Id_horario','INT','PK'), F('Hora_inicio_horario','TIME','UQ'), F('Orden_horario','SMALLINT'), F('Activo_horario','BOOLEAN')],
 'Disponibilidad_empleada': [F('Id_disponibilidad','INT','PK'), F('Empleada_id_disponibilidad','INT','FK'), F('Horario_id_disponibilidad','INT','FK'), F('Fecha_disponibilidad','DATE'), F('Estado_disponibilidad','VARCHAR(20)'), F('Motivo_disponibilidad','VARCHAR(150)',nullable=True)],
 'Citas': [F('Folio_cita','VARCHAR(12)','PK'), F('Cliente_id_cita','INT','FK',True), F('Nombre_cliente_cita','VARCHAR(100)'), F('Telefono_cliente_cita','CHAR(10)'), F('Servicio_id_cita','INT','FK'), F('Diseno_id_cita','INT','FK'), F('Color_id_cita','INT','FK',True), F('Sucursal_id_cita','INT','FK'), F('Empleada_id_cita','INT','FK',True), F('Fecha_cita','DATE'), F('Horario_id_cita','INT','FK'), F('Total_cita','DECIMAL(8,2)'), F('Duracion_cita','SMALLINT'), F('Pago_cita','VARCHAR(20)'), F('Estado_cita','VARCHAR(20)'), F('Fecha_creacion_cita','DATETIME'), F('Reprogramaciones_cita','SMALLINT'), F('Cancelada_por_cita','VARCHAR(20)',nullable=True), F('Asignada_al_atender_cita','BOOLEAN')],
 # La cabecera contiene una sola fecha; horas[] se normaliza en el detalle.
 'Solicitudes_disponibilidad': [F('Id_solicitud_disponibilidad','INT','PK'), F('Empleada_id_solicitud','INT','FK'), F('Fecha_cierre_solicitud','DATE'), F('Estado_solicitud','VARCHAR(20)'), F('Fecha_creacion_solicitud','DATETIME'), F('Usuario_resuelve_id_solicitud','INT','FK',True), F('Fecha_resolucion_solicitud','DATETIME',nullable=True)],
 'Detalle_solicitud_disponibilidad': [F('Id_detalle_solicitud','INT','PK'), F('Solicitud_id_detalle','INT','FK'), F('Horario_id_detalle','INT','FK')],
}

# Padre, PK referenciada, hija, FK, cardinalidad del padre, de la hija, etiqueta.
R = [
 ('Usuarios','Id_usuario','Empleadas','Usuario_id_empleada','1','0..1','cuenta laboral'),
 ('Sucursales','Id_sucursal','Empleadas','Sucursal_id_empleada','1','0..N','emplea'),
 ('Empleadas','Id_empleada','Especialidades_empleada','Empleada_id_especialidad','1','0..N','tiene'),
 ('Servicios','Id_servicio','Especialidades_empleada','Servicio_id_especialidad','1','0..N','autoriza'),
 ('Familias_color','Id_familia_color','Colores','Familia_id_color','1','0..N','agrupa'),
 ('Empleadas','Id_empleada','Disponibilidad_empleada','Empleada_id_disponibilidad','1','0..N','registra excepciones'),
 ('Horarios','Id_horario','Disponibilidad_empleada','Horario_id_disponibilidad','1','0..N','define bloque'),
 ('Usuarios','Id_usuario','Citas','Cliente_id_cita','0..1','0..N','reserva'),
 ('Servicios','Id_servicio','Citas','Servicio_id_cita','1','0..N','se reserva'),
 ('Disenos','Id_diseno','Citas','Diseno_id_cita','1','0..N','complementa'),
 ('Colores','Id_color','Citas','Color_id_cita','0..1','0..N','se elige'),
 ('Sucursales','Id_sucursal','Citas','Sucursal_id_cita','1','0..N','recibe'),
 ('Empleadas','Id_empleada','Citas','Empleada_id_cita','0..1','0..N','atiende'),
 ('Horarios','Id_horario','Citas','Horario_id_cita','1','0..N','marca inicio'),
 ('Empleadas','Id_empleada','Solicitudes_disponibilidad','Empleada_id_solicitud','1','0..N','solicita'),
 ('Usuarios','Id_usuario','Solicitudes_disponibilidad','Usuario_resuelve_id_solicitud','0..1','0..N','resuelve como administradora'),
 ('Solicitudes_disponibilidad','Id_solicitud_disponibilidad','Detalle_solicitud_disponibilidad','Solicitud_id_detalle','1','1..N','incluye'),
 ('Horarios','Id_horario','Detalle_solicitud_disponibilidad','Horario_id_detalle','1','0..N','identifica bloque'),
]
UNIQUE = {
 'Especialidades_empleada': ['Empleada_id_especialidad','Servicio_id_especialidad'],
 'Disponibilidad_empleada': ['Empleada_id_disponibilidad','Horario_id_disponibilidad','Fecha_disponibilidad'],
 'Detalle_solicitud_disponibilidad': ['Solicitud_id_detalle','Horario_id_detalle'],
}

def validate():
    assert len(T) == 13 and len(R) == 18
    actual_fk = {(t,f['name']) for t,fs in T.items() for f in fs if 'FK' in f['keys']}
    assert actual_fk == {(r[2],r[3]) for r in R}
    for parent, pk, child, fk, pc, cc, _ in R:
        pf = next(f for f in T[parent] if f['name']==pk)
        cf = next(f for f in T[child] if f['name']==fk)
        assert 'PK' in pf['keys'] and pf['type']==cf['type']
        assert cf['nullable'] == (pc == '0..1')
    for t,fs in T.items():
        assert len({f['name'] for f in fs}) == len(fs)
        assert sum('PK' in f['keys'] for f in fs)==1

validate()
(ROOT/'esquema_der_13_tablas.json').write_bytes(json.dumps(dict(tables=T,relationships=R,unique=UNIQUE),ensure_ascii=False,indent=2).encode('utf-8'))
ids = {t: ''.join([t.split('_')[0].lower()]+[p.title() for p in t.split('_')[1:]]) for t in T}
lines = ['erDiagram','    direction LR', '    %% Modelo propuesto; no es una migracion ejecutada.', '    %% NULL se indica; los demas campos son NOT NULL.', '    %% PK INT: AUTO_INCREMENT. Claves compuestas: ver comentarios finales.']
for t,fs in T.items():
    lines.append(f'    {ids[t]}["{t}"] {{')
    for f in fs:
        keys=f['keys'].replace('UQ','UK').replace(',',', ')
        lines.append(f'        {f["type"]} {f["name"]}'+(' '+keys if keys else '')+(' "NULL"' if f['nullable'] else ''))
    lines.append('    }')
for p,pk,ch,fk,pc,cc,label in R:
    # Las FK no forman parte de las PK hijas: relaciones no identificadoras.
    a={'1':'||','0..1':'|o'}[pc]
    b={'0..1':'o|','0..N':'o{','1..N':'|{'}[cc]
    lines.append(f'    {ids[p]} {a}..{b} {ids[ch]} : "{label}"')
for t,cols in UNIQUE.items():
    lines.append(f'    %% UNIQUE {t} ({", ".join(cols)})')
lines += ['    %% Una solicitud contiene al menos un detalle: validar al guardar la cabecera y sus detalles juntos.', '    %% Estado_solicitud: pendiente -> aceptada o rechazada; resolucion de todos los detalles.', '    %% Cierres efectivos: excepciones cerradas UNION detalles de solicitudes aceptadas.', '    %% No duplicar cierres aceptados en Disponibilidad_empleada. No hay FK directa entre ambas.']
(ROOT/'DER_Nails_Express_13_tablas.mmd').write_bytes(('\n'.join(lines)+'\n').encode('utf-8'))

W,H=landscape(A3)
C=canvas.Canvas(str(OUT/'DER_Nails_Express_13_tablas.pdf'),pagesize=(W,H))
C.setTitle('Nails Express | DER actualizado de 13 tablas')
C.setAuthor('Nails Express')
INK='#183448'; MUTED='#526775'; LINE='#638494'; ACCENT='#197F78'; NEW='#97603D'; LIGHT='#F1F6F8'
def text(x,y,s,size=11,bold=False,color=INK):
    C.setFillColor(HexColor(color)); C.setFont('Helvetica-Bold' if bold else 'Helvetica',size)
    C.drawString(x,H-y,s)
def paragraph(x,y,s,width,size=11,leading=16,bold=False,color=INK):
    for line in simpleSplit(s,'Helvetica-Bold' if bold else 'Helvetica',size,width):
        text(x,y,line,size,bold,color); y+=leading
    return y
def rect(x,y,w,h,fill,stroke=None):
    C.setFillColor(HexColor(fill)); C.setStrokeColor(HexColor(stroke or fill)); C.rect(x,H-y-h,w,h,stroke=bool(stroke),fill=1)
def header(n,title,subtitle):
    rect(0,0,W,10,ACCENT)
    text(42,44,'NAILS EXPRESS / MODELO DE DATOS',11,True,ACCENT)
    text(42,80,title,25,True)
    text(42,103,subtitle,11,color=MUTED)
    text(42,H-44,'PK = primaria  |  FK = foránea  |  UQ = único  |  NULL = opcional; los demás campos son obligatorios.',10,color=MUTED)
    text(42,H-27,'Modelo propuesto · Base: pendiente-semana-10 / 890067a · Integración BD y cierre: S11 · Exposición: S12',9,color=MUTED)
    text(W-92,H-27,f'{n} / 5',10,True,ACCENT)
def card(t,x,y,w,ref=False,new=False):
    fs=T[t][:1] if ref else T[t]
    h=38+len(fs)*21
    rect(x,y,w,h,'#FFFFFF','#BDD0D8');rect(x,y,w,30,NEW if new else INK)
    title=t+(' (ref.)' if ref else '')
    size=13
    while C.stringWidth(title,'Helvetica-Bold',size)>w-24: size-=0.25
    text(x+12,y+20,title,size,True,'#FFFFFF')
    for i,f in enumerate(fs):
        yy=y+30+i*21
        if i%2==0: rect(x+1,yy+1,w-2,21,LIGHT)
        # Se ajustan nombres largos sin truncarlos; la columna de tipos es fija.
        name=f['name']; sz=10
        while C.stringWidth(name,'Helvetica',sz)>w-160: sz-=.2
        text(x+10,yy+15,name,sz)
        text(x+w-145,yy+15,f['type'],8.8,color=MUTED)
        flags=f['keys']+(' NULL' if f['nullable'] else '')
        text(x+w-62,yy+15,flags.strip(),7.8,True,ACCENT)
    return (x,y,w,h)
def badge(x,y,s):
    wid=C.stringWidth(s,'Helvetica-Bold',10)+10
    rect(x-5,y-11,wid,15,'#FFFFFF')
    text(x,y,s,10,True,ACCENT)
def edge(points,first,last):
    C.setStrokeColor(HexColor(LINE));C.setLineWidth(1.15)
    path=C.beginPath();path.moveTo(points[0][0],H-points[0][1])
    for x,y in points[1:]:path.lineTo(x,H-y)
    C.drawPath(path)
    badge(first[0],first[1],first[2]);badge(last[0],last[1],last[2])
def note(x,y,w,title,body):
    h=42+len(simpleSplit(body,'Helvetica',11,w-28))*16
    rect(x,y,w,h,LIGHT);rect(x,y,4,h,ACCENT)
    text(x+14,y+22,title,12,True,ACCENT)
    paragraph(x+14,y+43,body,w-28)
def finish(): C.showPage()

# Lámina 1: se separan dominios para mantener todas las columnas legibles.
header(1,'01 / Cuentas, sucursales y especialidades','Cinco tablas originales. Las cardinalidades junto a cada extremo pertenecen a esa entidad.')
card('Usuarios',42,140,350);card('Sucursales',420,140,350);card('Servicios',798,140,350)
card('Empleadas',220,440,365);card('Especialidades_empleada',720,465,428)
edge([(217,346),(217,388),(310,388),(310,440)],(226,365,'1'),(319,424,'0..1'))
edge([(595,304),(595,388),(505,388),(505,440)],(604,325,'1'),(514,424,'0..N'))
edge([(585,510),(650,510),(650,520),(720,520)],(599,498,'1'),(672,507,'0..N'))
edge([(973,304),(973,465)],(982,326,'1'),(982,450,'0..N'))
note(42,648,535,'Relación laboral','Cada empleada tiene una cuenta y una sucursal. Una sucursal puede tener varias empleadas. Usuario_id_empleada es único y la cuenta debe tener rol empleada.')
note(610,648,538,'Especialidades sin duplicados','UNIQUE (Empleada_id_especialidad, Servicio_id_especialidad). Para ofrecer una empleada al reservar, debe estar activa y tener la especialidad del servicio.')
finish()

header(2,'02 / Citas y sus referencias','Citas: 16 campos originales y 3 operativos. Las otras cajas repiten solo la PK de tablas descritas en las demás láminas.')
card('Citas',355,145,480)
for t,x,y in [('Usuarios',42,145),('Servicios',42,270),('Disenos',42,395),('Colores',905,145),('Sucursales',905,270),('Empleadas',905,395),('Horarios',905,520)]:
    card(t,x,y,243,True)
def cy(i): return 145+30+i*21+10
edge([(285,185),(315,185),(315,cy(1)),(355,cy(1))],(290,174,'0..1'),(320,cy(1)+18,'0..N'))
edge([(285,310),(305,310),(305,cy(4)),(355,cy(4))],(287,299,'1'),(320,cy(4)-8,'0..N'))
edge([(285,435),(325,435),(325,cy(5)),(355,cy(5))],(287,424,'1'),(320,cy(5)-8,'0..N'))
edge([(905,185),(880,185),(880,cy(6)),(835,cy(6))],(866,174,'0..1'),(840,cy(6)-6,'0..N'))
edge([(905,310),(893,310),(893,cy(7)),(835,cy(7))],(899,cy(7)-8,'1'),(840,cy(7)-6,'0..N'))
edge([(905,435),(880,435),(880,cy(8)),(835,cy(8))],(863,452,'0..1'),(840,cy(8)-6,'0..N'))
edge([(905,560),(865,560),(865,cy(10)),(835,cy(10))],(890,578,'1'),(839,cy(10)+18,'0..N'))
note(42,648,535,'Referencias opcionales','Cliente_id_cita puede ser NULL para una reserva sin cuenta; Empleada_id_cita, para una cita sin preferencia; Color_id_cita, cuando no se elige tono. No se crean registros ficticios con ID 0.')
note(610,648,538,'Datos que conserva la reservación','Nombre, teléfono, total y duración guardan los valores acordados. Sin diseño es un registro real del catálogo. Pago_cita indica modalidad, no acredita un cobro.')
finish()

header(3,'03 / Catálogos y excepciones de disponibilidad','Cinco tablas originales y una referencia a Empleadas. La ausencia de una excepción no garantiza un espacio libre.')
card('Familias_color',42,145,350);card('Colores',42,355,350)
card('Disenos',420,145,350);card('Horarios',798,145,350)
card('Empleadas',42,580,350,True);card('Disponibilidad_empleada',660,420,488)
edge([(217,246),(217,355)],(226,270,'1'),(226,340,'0..N'))
edge([(973,267),(973,420)],(982,290,'1'),(982,403,'0..N'))
edge([(392,620),(530,620),(530,480),(660,480)],(405,608,'1'),(610,468,'0..N'))
note(420,335,350,'Disenos','Su relación con Citas se muestra en la lámina 2. Se conserva el campo Activo_diseno.')
note(42,689,535,'Unicidad por bloque y fecha','Disponibilidad_empleada: UNIQUE (Empleada_id_disponibilidad, Horario_id_disponibilidad, Fecha_disponibilidad). Estados conservados: disponible y cerrado.')
note(610,625,538,'Compatibilidad con los cierres anteriores','Disponibilidad_empleada conserva las excepciones previas. Los nuevos cierres provienen de solicitudes aceptadas (lámina 4). Un registro disponible no anula un cierre aceptado. Motivo_disponibilidad sigue opcional; no añade un formulario de motivos.')
finish()

header(4,'04 / Solicitudes de cierre de la empleada','Dos tablas nuevas. Una solicitud corresponde a una empleada, una fecha y uno o varios horarios.')
card('Usuarios',42,145,350,True);card('Empleadas',420,145,350,True);card('Horarios',798,145,350,True)
card('Solicitudes_disponibilidad',42,355,540,new=True)
card('Detalle_solicitud_disponibilidad',705,418,443,new=True)
edge([(217,204),(217,355)],(226,226,'0..1'),(226,339,'0..N'))
text(52,278,'Solo rol administradora al resolver',10,color=MUTED)
edge([(595,204),(595,310),(475,310),(475,355)],(604,226,'1'),(484,339,'0..N'))
text(453,278,'Empleada que solicita',10,color=MUTED)
edge([(973,204),(973,418)],(982,226,'1'),(982,402,'0..N'))
edge([(582,471),(705,471)],(595,459,'1'),(660,459,'1..N'))
text(615,492,'incluye',10,color=MUTED)
note(42,637,540,'Cabecera: petición y decisión','Estado_solicitud: pendiente, aceptada o rechazada. Fecha_cierre_solicitud es el día solicitado; Fecha_creacion_solicitud registra el envío. Usuario_resuelve_id_solicitud y Fecha_resolucion_solicitud son NULL mientras esté pendiente.')
note(610,580,538,'Detalle: un registro por horario','UNIQUE (Solicitud_id_detalle, Horario_id_detalle). No se repite un horario dentro de la misma solicitud. La fecha y la empleada se obtienen de la cabecera. No hay un estado por detalle: la decisión es completa.')
note(610,698,538,'Sin una tabla adicional de administradoras','La resolución referencia Usuarios y exige rol administradora. Las entidades marcadas como ref. son las mismas tablas, no duplicados.')
finish()

header(5,'05 / Reglas y alcance de la actualización','Conexión a la base de datos, correcciones y pruebas terminadas en semana 11. Semana 12: solo exposición.')
def rule(x,y,num,title,body,width=530):
    text(x,y,f'{num:02d}',15,True,ACCENT)
    text(x+34,y,title,12,True)
    end=paragraph(x+34,y+22,body,width-34,11,16)
    return end+21
y=148
y=rule(42,y,1,'Solicitud completa al guardar','Una cabecera debe tener al menos un detalle. Guardar cabecera y detalles como una unidad. No imponer UNIQUE por empleada y fecha: puede haber solicitudes distintas para horarios diferentes del mismo día.')
y=rule(42,y,2,'Estado y datos de resolución','Al crear: estado pendiente. Pendiente exige responsable y fecha de resolución NULL. Aceptada o rechazada exige ambos datos y un usuario con rol administradora. La resolución no debe preceder a la creación. Solo se resuelve desde pendiente.')
y=rule(42,y,3,'Revalidar antes de aceptar','Comprobar empleada activa, bloques futuros, horario de sucursal, citas con su duración completa, cierres existentes y capacidad para citas sin preferencia. Una aprobación aplica todos los detalles o ninguno.')
y=rule(42,y,4,'Disponibilidad efectiva sin duplicados','Los cierres se obtienen de las excepciones con estado cerrado UNIDOS a los detalles cuya solicitud esté aceptada, por empleada, fecha y horario. No copiar estos detalles a Disponibilidad_empleada. Pendiente y rechazada no cierran bloques.')
y=rule(42,y,5,'Validaciones que una FK no resuelve','Impedir solicitudes pendientes superpuestas para la misma empleada, fecha y horario. La regla atraviesa cabecera y detalle; no basta el UNIQUE del detalle. Al integrar SQL, resolución y reservas deben coordinarse para evitar conflictos simultáneos.')
y=rule(42,y,6,'Conservar procedencia e historial','Los cierres antiguos no se presentan como solicitudes aprobadas sin evidencia. Conservar referencias históricas; preferir desactivar cuentas, empleadas y catálogos. El modelo no contempla eliminar decisiones ni reabrir horarios en esta entrega.')
y=148
y=rule(620,y,7,'Identificadores y fechas','Las PK INT son autoincrementales propuestas. El ID textual de la solicitud del navegador requerirá un mapeo al migrar. Empleadas.Id_empleada y Usuarios.Id_usuario son identidades distintas. Fecha de cierre y horarios son locales; creación y resolución deben usar una convención temporal única.')
y=rule(620,y,8,'Ajustes de las once tablas originales','Se corrige Sucursales 1 a Empleadas 0..N; se uniforma Id_empleada; se muestra Color_id_cita; se elimina el campo de especialización repetido; se incluye Activo_horario y debe añadirse al diccionario con DEFAULT 1. El resto de las once tablas conserva el modelo base.')
y=rule(620,y,9,'Límite de esta entrega','Solo pendiente, aceptada y rechazada. Retiro de solicitudes, reapertura, motivos/respuestas, aprobación parcial y filtros quedan para Integradora 2. Motivo_disponibilidad procede del modelo anterior y no representa una nueva función implementada.')
y=rule(620,y,10,'Cierre del trabajo por semanas','Semana 10: integrar la base de datos y corregir pendientes. Semana 11: terminar la conexión, las correcciones, las pruebas con persistencia real y la documentación; cerrar la versión funcional. Semana 12: solo exposición del proyecto acabado. Fecha indicada: 26 de noviembre.')
y=rule(620,y,11,'Correspondencia con el prototipo','empleadaId y fecha pasan a la cabecera; horas[] se convierte en detalles que referencian Horarios. estado, creadaEn, resueltaEn y resueltaPor corresponden al estado, creación, resolución y usuario que decide. No se cambia el almacenamiento local con esta documentación.')
y=rule(620,y,12,'Datos operativos de Citas incorporados','Citas añade Reprogramaciones_cita (entero, DEFAULT 0), Cancelada_por_cita (cliente/salon o NULL) y Asignada_al_atender_cita (booleano, DEFAULT 0). NULL conserva la ausencia de información sobre quién canceló. PHP deberá registrar el origen en las nuevas cancelaciones; el prototipo solo lo marca para salon.')
finish()
C.save()
print(f'Validado: {len(T)} tablas, {len(R)} relaciones; PDF y fuente Mermaid generados en {ROOT}')
