<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

try {
    // Incluimos los agotados para mostrarlos como no disponibles.
    $sql = 'SELECT Id_color, Nombre_color, Familia_id_color,
                   Hex_color, Marca_color, Disponible_color
            FROM Colores
            ORDER BY Id_color ASC';

    $consulta = $conexion->query($sql);
    $filas = $consulta->fetchAll(PDO::FETCH_ASSOC);

    $colores = [];

    foreach ($filas as $fila) {
        // Convertimos las columnas al formato que utiliza JavaScript.
        $colores[] = [
            'id' => (int) $fila['Id_color'],
            'nombre' => $fila['Nombre_color'],
            'familia' => $fila['Familia_id_color'],
            'hex' => $fila['Hex_color'],
            'marca' => $fila['Marca_color'] ?? '',
            'disponible' => (bool) $fila['Disponible_color']
        ];
    }

    echo json_encode(
        $colores,
        JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
    );

} catch (PDOException $error) {
    error_log($error->getMessage());
    http_response_code(500);

    echo json_encode([
        'error' => 'No se pudieron consultar los colores.'
    ], JSON_UNESCAPED_UNICODE);
}