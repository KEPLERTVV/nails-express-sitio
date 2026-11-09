const ApiSesion = (() => {
  // Ruta del backend respecto a las páginas HTML.
  const ruta = "../nails-express_backend/";

  async function solicitar(archivo, opciones = {}) {
    const respuesta = await fetch(ruta + archivo, {
      credentials: "same-origin",
      cache: "no-store",
      ...opciones
    });

    const datos = await respuesta.json();

    // Convierte los errores enviados por PHP en errores de JavaScript.
    if (!respuesta.ok) {
      throw new Error(datos.error || "No se pudo completar la solicitud.");
    }

    return datos;
  }

  return {
    iniciar(usuario, contrasena) {
      // Estos nombres coinciden con los campos que recibe login.php.
      const formulario = new URLSearchParams({
        usuario,
        contrasena
      });

      return solicitar("login.php", {
        method: "POST",
        body: formulario
      });
    },

    consultar() {
      return solicitar("sesion.php");
    },

    // Obtiene el registro laboral de la empleada autenticada.
    consultarEmpleada() {
    return solicitar("mi_empleada.php");
    },

    cerrar() {
      return solicitar("logout.php", {
        method: "POST"
      });
    }
  };
})();