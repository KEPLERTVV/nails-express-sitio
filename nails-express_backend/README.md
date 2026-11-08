# Backend PHP en desarrollo

## Versiones

- `pendiente-semana-10`: cierre del frontend en `a4c8fb2`, previo a la carga del catálogo desde PHP.
- `con-base-de-datos`: integración de PHP/MySQL en desarrollo. Conserva la lectura de servicios y diseños y las pruebas realizadas.

## Ubicaciones actuales

El backend que ejecuta Apache sigue en:

```text
C:\xampp\htdocs\xampp\nails-express_backend
```

Esta carpeta del repositorio contiene una copia versionada de esos archivos,
excepto `conexion.php`. Mientras se mantengan ambas ubicaciones, los cambios
hechos en XAMPP deben copiarse aquí antes de crear un commit. Cambiar de rama
no cambia automáticamente el backend activo de XAMPP.

La página se sirve desde el enlace de carpeta existente:

```text
C:\xampp\htdocs\xampp\nails-express
  → C:\Users\Medel\Desktop\nails-express-sitio\nails-express
```

Por eso, cambiar de rama sí cambia el frontend servido por Apache.

## Recuperar este backend en otra instalación

1. Copiar los archivos PHP y HTML a la carpeta del backend bajo Apache.
2. Copiar `conexion.ejemplo.php` como `conexion.php` y completar los datos locales.
3. Usar la base MySQL con las tablas y registros del proyecto.
4. Abrir `prueba_conexion.php` y después `prueba_servicios.html` mediante localhost.

La configuración real con contraseña queda fuera de Git. No reemplazar la
conexión local existente por la plantilla al actualizar los otros archivos.

## Alcance del respaldo

Git conserva el código. No respalda los registros del servidor MySQL; esos
requieren una exportación independiente desde Workbench.

Los servicios y diseños de la portada ya se leen desde PHP. El agendado y los
paneles aún usan datos de demostración/localStorage. La portada conserva una
correspondencia temporal de IDs de diseños para enviar la selección al agendado.
