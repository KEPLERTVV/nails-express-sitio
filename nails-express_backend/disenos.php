<?php

header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/conexion.php';

try {
$sql = 'SELECT Id_diseno, Nombre_diseno,
                   Costo_extra_diseno, Duracion_extra_diseno
            FROM Disenos
            WHERE Activo_diseno = 1
            ORDER BY Id_diseno ASC';

    $consulta = $conexion->query($sql);
    $filas = $consulta->fetchAll(PDO::FETCH_ASSOC);

    $disenos = [];

    foreach ($filas as $fila) {
        // Estos nombres coinciden con los utilizados en datos.js.
        $disenos[] = [
            'id' => (int) $fila['Id_diseno'],
            'nombre' => $fila['Nombre_diseno'],
            'costoExtra' => (float) $fila['Costo_extra_diseno'],
            'duracionExtra' => (int) $fila['Duracion_extra_diseno'],

            'sinDiseno' => (int) $fila['Id_diseno'] === 1
        ];
    }

    echo json_encode(
        $disenos,
        JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
    );

} catch (PDOException $error) {
    error_log($error->getMessage());
    http_response_code(500);

    echo json_encode([
        'error' => 'No se pudieron consultar los diseños.'
    ], JSON_UNESCAPED_UNICODE);
}
