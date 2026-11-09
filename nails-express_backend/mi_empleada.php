<?php

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

// Este archivo solo consulta información.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    responder(405, ['error' => 'Utiliza una consulta GET.']);
}

// La identidad viene de la sesión, no de un ID enviado por el navegador.
$cuentaSesion = $_SESSION['usuario'] ?? null;

if (!$cuentaSesion) {
    responder(401, ['error' => 'Debes iniciar sesión.']);
}

if ($cuentaSesion['rol'] !== 'empleada') {
    responder(403, ['error' => 'Esta consulta es solo para empleadas.']);
}

try {
    require_once __DIR__ . '/conexion.php';

    // Relaciona la cuenta de acceso con su registro laboral.
    // También comprueba que la cuenta y la empleada sigan activas.
    $sql = 'SELECT e.Id_empleada,
                   e.Usuario_id_empleada,
                   e.Sucursal_id_empleada,
                   e.Activa_empleada,
                   u.Nombre_usuario,
                   s.Nombre_sucursal
            FROM Empleadas e
            INNER JOIN Usuarios u
                ON u.Id_usuario = e.Usuario_id_empleada
            INNER JOIN Sucursales s
                ON s.Id_sucursal = e.Sucursal_id_empleada
            WHERE e.Usuario_id_empleada = :usuario_id
              AND u.Rol_usuario = :rol
              AND u.Estado_usuario = 1
              AND e.Activa_empleada = 1';

    $consulta = $conexion->prepare($sql);
    $consulta->execute([
        'usuario_id' => $cuentaSesion['id'],
        'rol' => 'empleada'
    ]);

    $empleada = $consulta->fetch(PDO::FETCH_ASSOC);

    if (!$empleada) {
        responder(403, [
            'error' => 'No tienes un registro de empleada activo con sucursal asignada.'
        ]);
    }

    // Devuelve solo los datos necesarios para esta parte del panel.
    responder(200, [
        'empleada' => [
            'id' => (int) $empleada['Id_empleada'],
            'usuarioId' => (int) $empleada['Usuario_id_empleada'],
            'nombre' => $empleada['Nombre_usuario'],
            'sucursalId' => (int) $empleada['Sucursal_id_empleada'],
            'sucursalNombre' => $empleada['Nombre_sucursal'],
            'activa' => (bool) $empleada['Activa_empleada']
        ]
    ]);

} catch (PDOException $error) {
    error_log($error->getMessage());

    responder(500, [
        'error' => 'No se pudieron consultar los datos de la empleada.'
    ]);
}