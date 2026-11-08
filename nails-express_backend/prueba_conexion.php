<?php

header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/conexion.php';

$baseDatos = $conexion->query("SELECT DATABASE()")
->fetchColumn();

echo 'conectado a la base de datos: ' . $baseDatos;
