<?php

// Copiar como conexion.php y completar los datos locales de MySQL.
// conexion.php está excluido de Git para conservar la contraseña en este equipo.
$servidor = 'localhost';
$puerto = 3306;
$baseDeDatos = 'NOMBRE_DE_TU_BASE';
$usuario = 'root';
$contrasena = 'TU_CONTRASEÑA';

try {
    $conexion = new PDO(
        "mysql:host=$servidor;port=$puerto;dbname=$baseDeDatos;charset=utf8mb4",
        $usuario,
        $contrasena,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $error) {
    error_log($error->getMessage());
    http_response_code(500);
    exit('No se pudo conectar con la base de datos.');
}
