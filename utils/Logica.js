export function calcularCriticidad(valor) {
  if (valor < 150) return "BAJA";
  if (valor <= 200) return "MEDIA";
  return "ALTA";
}

export function evaluarCaso({ valor, reportes }) {
  const ahora = new Date();
  const hace15min = new Date(ahora.getTime() - 15 * 60000);

  const recientes = reportes.filter(r =>
    new Date(r.marca_tiempo) >= hace15min
  );

  const reportesBaja = recientes.filter(r => r.tipo === "baja_presion");

  let estado = "EN_VALIDACION";

  // Regla 1
  if (valor !== null && valor < 150 && reportesBaja.length >= 1) {
    estado = "ABIERTO";
  }

  // Regla 2
  if (recientes.length >= 2) {
    estado = "ABIERTO";
  }

  let criticidad = valor !== null ? calcularCriticidad(valor) : "MEDIA";

  return {
    estado,
    criticidad,
    conteo: recientes.length
  };
}