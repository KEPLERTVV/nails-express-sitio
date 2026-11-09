<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

try {
    // Solo ofrecemos como filtros las familias activas.
    $sql = 'SELECT Id_familia_color, Nombre_familia_color
            FROM Familias_color
            WHERE Activa_familia_color = 1
            ORDER BY Nombre_familia_color ASC';

    $consulta = $conexion->query($sql);
    $filas = $consulta->fetchAll(PDO::FETCH_ASSOC);

    $familias = [];

    foreach ($filas as $fila) {
        $familias[] = [
            // Este identificador es texto: "rojos", "nudes", etc.
            'id' => $fila['Id_familia_color'],
            'nombre' => $fila['Nombre_familia_color']
        ];
    }

    echo json_encode(
        $familias,
        JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
    );

} catch (PDOException $error) {
    error_log($error->getMessage());
    http_response_code(500);

    echo json_encode([
        'error' => 'No se pudieron consultar las familias de colores.'
    ], JSON_UNESCAPED_UNICODE);
}