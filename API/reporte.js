let reportes = [];

const canales = ["whatsapp", "call_center", "app"];
const tipos = ["baja_presion", "sin_servicio", "fuga"];

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const data = req.body;

  // VALIDACIONES
  if (!data.canal || !data.tipo || !data.descripcion || !data.marca_tiempo) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  if (!canales.includes(data.canal)) {
    return res.status(400).json({ error: "Canal inválido" });
  }

  if (!tipos.includes(data.tipo)) {
    return res.status(400).json({ error: "Tipo inválido" });
  }

  if (!data.ubicacion?.id_sector || !data.ubicacion?.id_activo) {
    return res.status(400).json({ error: "Ubicación incompleta" });
  }

  reportes.push(data);

  return res.status(200).json({
    ok: true,
    mensaje: "Reporte recibido",
    total_reportes: reportes.length
  });
}