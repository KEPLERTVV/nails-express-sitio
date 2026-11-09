<?php

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    responder(405, ['error' => 'Utiliza una consulta GET.']);
}

// La cuenta se identifica desde la sesión del servidor.
$cuentaSesion = $_SESSION['usuario'] ?? null;

if (!$cuentaSesion) {
    responder(401, ['error' => 'Debes iniciar sesión.']);
}

if ($cuentaSesion['rol'] !== 'empleada') {
    responder(403, ['error' => 'Esta consulta es solo para empleadas.']);
}

try {
    require_once __DIR__ . '/conexion.php';

    // Obtiene el ID laboral y comprueba que la cuenta siga activa.
    $consultaEmpleada = $conexion->prepare(
        'SELECT e.Id_empleada
         FROM Empleadas e
         INNER JOIN Usuarios u
             ON u.Id_usuario = e.Usuario_id_empleada
         WHERE e.Usuario_id_empleada = :usuario_id
           AND u.Rol_usuario = :rol
           AND u.Estado_usuario = 1
           AND e.Activa_empleada = 1'
    );

    $consultaEmpleada->execute([
        'usuario_id' => $cuentaSesion['id'],
        'rol' => 'empleada'
    ]);

    $empleada = $consultaEmpleada->fetch(PDO::FETCH_ASSOC);

    if (!$empleada) {
        responder(403, [
            'error' => 'No tienes un registro de empleada activo.'
        ]);
    }

    // Consulta únicamente las citas asignadas a esta empleada.
    // JOIN permite obtener la hora a partir del ID de horario.
    $consultaCitas = $conexion->prepare(
        "SELECT c.Folio_cita,
                c.Nombre_cliente_cita,
                c.Fecha_cita,
                TIME_FORMAT(h.Hora_inicio_horario, '%H:%i') AS Hora,
                c.Duracion_cita,
                c.Total_cita,
                c.Pago_cita,
                c.Estado_cita
         FROM Citas c
         INNER JOIN Horarios h
             ON h.Id_horario = c.Horario_id_cita
         WHERE c.Empleada_id_cita = :empleada_id
         ORDER BY c.Fecha_cita ASC,
                  h.Hora_inicio_horario ASC,
                  c.Folio_cita ASC"
    );

    $consultaCitas->execute([
        'empleada_id' => $empleada['Id_empleada']
    ]);

    $citas = [];

    // Da nombres sencillos a los campos que recibirá JavaScript.
    while ($fila = $consultaCitas->fetch(PDO::FETCH_ASSOC)) {
        $citas[] = [
            'folio' => $fila['Folio_cita'],
            'nombre' => $fila['Nombre_cliente_cita'],
            'fecha' => $fila['Fecha_cita'],
            'hora' => $fila['Hora'],
            'duracion' => (int) $fila['Duracion_cita'],
            'total' => (float) $fila['Total_cita'],
            'pago' => $fila['Pago_cita'],
            'estado' => $fila['Estado_cita']
        ];
    }

    responder(200, ['citas' => $citas]);

} catch (PDOException $error) {
    error_log($error->getMessage());

    responder(500, [
        'error' => 'No se pudieron consultar las citas.'
    ]);
}