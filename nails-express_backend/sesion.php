<?php

// Recupera la sesión asociada al navegador.
// Si todavía no existe, PHP inicia una nueva.
session_start();

header('Content-Type: application/json; charset=utf-8');

// Evita almacenar en caché una respuesta que depende de la sesión.
header('Cache-Control: no-store');

$usuario = $_SESSION['usuario'] ?? null;

// Solo devolvemos los datos públicos necesarios.
// La contraseña y su hash nunca deben enviarse al navegador.
$datosPublicos = null;

if ($usuario !== null) {
    $datosPublicos = [
        'id' => $usuario['id'],
        'nombre' => $usuario['nombre'],
        'correo' => $usuario['correo'],
        'rol' => $usuario['rol']
    ];
}

echo json_encode([
    'autenticada' => $datosPublicos !== null,
    'usuario' => $datosPublicos
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);