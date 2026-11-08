<?php

// La respuesta contiene datos JSON, no una página HTML.
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

try {
    $sql = 'SELECT Id_servicio, Nombre_servicio,
                   Descripcion_servicio, Precio_servicio,
                   Duracion_servicio, Requiere_especialista_servicio
            FROM Servicios
            ORDER BY Id_servicio ASC';

    $consulta = $conexion->query($sql);
    $filas = $consulta->fetchAll(PDO::FETCH_ASSOC);

    $servicios = [];

    foreach ($filas as $fila) {
        // Usamos los mismos nombres de campos que espera la página.
        // Las conversiones mantienen números y booleanos en el JSON.
        $servicios[] = [
            'id' => (int) $fila['Id_servicio'],
            'nombre' => $fila['Nombre_servicio'],
            'descripcion' => $fila['Descripcion_servicio'] ?? '',
            'precio' => (float) $fila['Precio_servicio'],
            'duracion' => (int) $fila['Duracion_servicio'],
            'requiereEspecialista' =>
                (bool) $fila['Requiere_especialista_servicio']
        ];
    }

    // Convierte el arreglo de PHP a JSON y conserva los acentos.
    echo json_encode(
        $servicios,
        JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
    );

} catch (PDOException $error) {
    error_log($error->getMessage());
    http_response_code(500);

    echo json_encode([
        'error' => 'No se pudieron consultar los servicios.'
    ], JSON_UNESCAPED_UNICODE);
}
