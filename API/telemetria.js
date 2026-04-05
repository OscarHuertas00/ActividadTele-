import { evaluarCaso } from "../utils/Logica.js";

let reportes = [];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const data = req.body;

  const resultado = evaluarCaso({
    valor: data.valor,
    reportes: reportes
  });

  const incidente = {
    incidente_id: "INC-" + Date.now(),
    timestamp_creacion: new Date().toISOString(),
    id_sector: data.ubicacion.id_sector,
    id_activo: data.ubicacion.id_activo,
    origen: "telemetria",
    criticidad: resultado.criticidad,
    estado: resultado.estado,
    conteo_reportes_15m: resultado.conteo,
    timestamp_cierre: null,
    evidencia_url: null
  };

  // 🔗 ENVÍO A MAKE (CAMBIA ESTO)
  await fetch("https://hook.make.com/TU_WEBHOOK", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(incidente)
  });

  return res.status(200).json({
    ok: true,
    incidente
  });
}