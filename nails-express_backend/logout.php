<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// El cierre se solicita mediante un formulario POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');

    echo json_encode([
        'error' => 'Utiliza el botón para cerrar sesión.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Recupera la sesión actual para poder eliminarla.
session_start();

// Vacía los datos guardados, incluida la cuenta autenticada.
$_SESSION = [];

// Elimina la cookie que identifica la sesión en el navegador.
if (ini_get('session.use_cookies')) {
    $parametros = session_get_cookie_params();

    setcookie(session_name(), '', [
        'expires' => time() - 3600,
        'path' => $parametros['path'],
        'domain' => $parametros['domain'],
        'secure' => $parametros['secure'],
        'httponly' => $parametros['httponly'],
        'samesite' => $parametros['samesite']
    ]);
}

// Elimina la sesión almacenada en el servidor.
session_destroy();

echo json_encode([
    'mensaje' => 'Sesión cerrada correctamente.'
], JSON_UNESCAPED_UNICODE);