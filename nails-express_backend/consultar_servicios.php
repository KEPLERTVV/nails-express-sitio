<?php

header ('content-type: text/plain; charset=utf-8');

require_once __DIR__ . '/conexion.php';

try {
    $sql = 'Select Id_servicio, Nombre_servicio, Precio_servicio, Duracion_servicio
    from Servicios
    Order by Id_servicio ASC';

    $consulta = $conexion->query($sql);

    $servicios = $consulta->fetchAll(PDO::FETCH_ASSOC); // Obtener todos los resultados como un array asociativo

    if (!$servicios) {
        echo 'No se encontraron servicios en la base de datos.';
    }else{

    foreach ($servicios as $servicio) {
        echo 'servicio: ' . $servicio['Nombre_servicio'] . "\n";
        echo 'precio: ' . $servicio['Precio_servicio'] . "\n";
        echo 'duracion: ' . $servicio['Duracion_servicio'] . "\n";
        echo '------------------------' . "\n";
        }
    }

}catch (PDOException $e) {
    error_log($e->getMessage()); // Registrar el error en el log de errores

    http_response_code(500); // Establecer el código de respuesta HTTP a 500 (Error interno del servidor)
    exit('Error al consultar los servicios.'); // Mostrar un mensaje de error genérico al usuario
}
