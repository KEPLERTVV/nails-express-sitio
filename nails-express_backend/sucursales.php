<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

try {
    // Consultamos únicamente las sucursales activas.
    // TIME_FORMAT entrega las horas como HH:MM, igual que la página.
    $sql = "SELECT Id_sucursal, Nombre_sucursal, Direccion_sucursal,
                   TIME_FORMAT(Apertura_sucursal, '%H:%i') AS apertura,
                   TIME_FORMAT(Cierre_sucursal, '%H:%i') AS cierre
            FROM Sucursales
            WHERE Activa_sucursal = 1
            ORDER BY Id_sucursal ASC";

    $consulta = $conexion->query($sql);
    $filas = $consulta->fetchAll(PDO::FETCH_ASSOC);

    $sucursales = [];

    foreach ($filas as $fila) {
        $sucursales[] = [
            'id' => (int) $fila['Id_sucursal'],
            'nombre' => $fila['Nombre_sucursal'],
            'direccion' => $fila['Direccion_sucursal'],
            'apertura' => $fila['apertura'],
            'cierre' => $fila['cierre']
        ];
    }

    echo json_encode(
        $sucursales,
        JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
    );

} catch (PDOException $error) {
    error_log($error->getMessage());
    http_response_code(500);

    echo json_encode([
        'error' => 'No se pudieron consultar las sucursales.'
    ], JSON_UNESCAPED_UNICODE);
}