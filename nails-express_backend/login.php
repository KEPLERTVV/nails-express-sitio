<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Centraliza el envío de respuestas y termina la ejecución.
function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

// Las credenciales se recibirán mediante POST, no en la dirección URL.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    responder(405, [
        'error' => 'Utiliza el formulario para iniciar sesión.'
    ]);
}

// Usamos nombres distintos a los de conexion.php: require comparte las variables de ese archivo.
$identificadorIngresado = $_POST['usuario'] ?? '';
$contrasenaIngresada = $_POST['contrasena'] ?? '';

// Comprobamos que ambos valores sean texto.
if (!is_string($identificadorIngresado) || !is_string($contrasenaIngresada)) {
    responder(400, ['error' => 'Los datos enviados no son válidos.']);
}

$identificadorIngresado = trim($identificadorIngresado);

// La contraseña no se recorta: sus espacios pueden formar parte de ella.
if ($identificadorIngresado === '' || $contrasenaIngresada === '') {
    responder(400, [
        'error' => 'Escribe tu correo o teléfono y tu contraseña.'
    ]);
}

try {
    require_once __DIR__ . '/conexion.php';

    // Buscamos la cuenta y, si es empleada, su estado laboral.
    $sql = 'SELECT u.Id_usuario, u.Nombre_usuario,
                   u.Correo_usuario, u.Telefono_usuario,
                   u.Contrasena_usuario, u.Rol_usuario,
                   u.Estado_usuario, e.Activa_empleada
            FROM Usuarios u
            LEFT JOIN Empleadas e
                ON e.Usuario_id_empleada = u.Id_usuario
            WHERE u.Correo_usuario = :correo
               OR u.Telefono_usuario = :telefono
            LIMIT 1';

    // Los valores se envían separados del SQL mediante parámetros.
    $consulta = $conexion->prepare($sql);

    $consulta->execute([
        'correo' => $identificadorIngresado,
        'telefono' => preg_replace('/[\s-]+/', '', $identificadorIngresado)
    ]);

    $cuenta = $consulta->fetch(PDO::FETCH_ASSOC);

    // password_verify compara la contraseña escrita con el hash guardado.
    if (
        !$cuenta ||
        !password_verify($contrasenaIngresada, $cuenta['Contrasena_usuario']) ||
        !(bool) $cuenta['Estado_usuario']
    ) {
        responder(401, [
            'error' => 'No fue posible iniciar sesión. Revisa tus datos.'
        ]);
    }

    // Una cuenta de empleada también debe tener su registro laboral activo.
    if (
        $cuenta['Rol_usuario'] === 'empleada' &&
        !(bool) $cuenta['Activa_empleada']
    ) {
        responder(401, [
            'error' => 'No fue posible iniciar sesión. Revisa tus datos.'
        ]);
    }

    session_start();

    // Renueva el identificador de sesión después de autenticar.
    session_regenerate_id(true);

    // Guardamos únicamente datos públicos, nunca la contraseña ni su hash.
    $_SESSION['usuario'] = [
        'id' => (int) $cuenta['Id_usuario'],
        'nombre' => $cuenta['Nombre_usuario'],
        'correo' => $cuenta['Correo_usuario'],
        'telefono' => $cuenta['Telefono_usuario'],
        'rol' => $cuenta['Rol_usuario']
    ];

    responder(200, [
        'autenticada' => true,
        'usuario' => $_SESSION['usuario']
    ]);

} catch (PDOException $error) {
    error_log($error->getMessage());

    responder(500, [
        'error' => 'No se pudo procesar el inicio de sesión.'
    ]);
}