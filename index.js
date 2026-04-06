const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 URL DE MAKE (REEMPLAZA)
const MAKE_WEBHOOK = "https://hook.us2.make.com/e7k25gzoxymresu9dtcdnmtw2gotopog";

// ===== "BASE DE DATOS" EN MEMORIA =====
let telemetria = [];
let reportes = [];

// ===== CONFIGURACIONES =====
const canales = ["whatsapp", "call_center", "app"];
const tipos = ["baja_presion", "sin_servicio", "fuga"];
  
// ===== FUNCIONES =====

// Criticidad
function calcularCriticidad(valor) {
  if (valor < 150) return "BAJA";
  if (valor <= 200) return "MEDIA";
  return "ALTA";
}

// Enviar a Make
async function enviarAMake(data) {
  try {
    await axios.post(MAKE_WEBHOOK, data);
    console.log("📡 Enviado a Make");
  } catch (error) {
    console.error("❌ Error enviando a Make:", error.message);
  }
}

// Lógica de negocio (15 minutos)
function evaluarCaso(id_sector, valor = null) {
  const ahora = new Date();
  const hace15min = new Date(ahora.getTime() - 15 * 60000);

  const reportesSector = reportes.filter(r =>
    r.ubicacion.id_sector === id_sector &&
    new Date(r.marca_tiempo) >= hace15min
  );

  const reportesBaja = reportesSector.filter(r => r.tipo === "baja_presion");

  let estado = "EN_VALIDACION";

  if (valor !== null && valor < 150 && reportesBaja.length >= 1) {
    estado = "ABIERTO";
  }

  if (reportesSector.length >= 2) {
    estado = "ABIERTO";
  }

  let criticidad = valor !== null ? calcularCriticidad(valor) : "MEDIA";

  return {
    estado,
    criticidad,
    conteo: reportesSector.length
  };
}

// ===== ENDPOINT TELEMETRÍA =====
app.post("/api/v1/telemetria", async (req, res) => {
  const data = req.body;

  // VALIDACIÓN BÁSICA
  if (!data.valor || !data.ubicacion?.id_sector || !data.ubicacion?.id_activo) {
    return res.status(400).json({ error: "Datos incompletos en telemetría" });
  }

  telemetria.push(data);

  const resultado = evaluarCaso(
    data.ubicacion.id_sector,
    data.valor
  );

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

  console.log("📡 Telemetría:", data);
  console.log("🚨 Incidente:", incidente);

  await enviarAMake(incidente);

  res.json({ ok: true, incidente });
});

// ===== ENDPOINT REPORTE =====
app.post("/api/v1/reporte", async (req, res) => {
  const data = req.body;

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

  const resultado = evaluarCaso(data.ubicacion.id_sector);

  const incidente = {
    incidente_id: "INC-" + Date.now(),
    timestamp_creacion: new Date().toISOString(),
    id_sector: data.ubicacion.id_sector,
    id_activo: data.ubicacion.id_activo,
    origen: "reporte",
    criticidad: resultado.criticidad,
    estado: resultado.estado,
    conteo_reportes_15m: resultado.conteo,
    timestamp_cierre: null,
    evidencia_url: null
  };

  console.log("📢 Reporte:", data);
  console.log("🚨 Incidente:", incidente);

  await enviarAMake(incidente);

  res.json({ ok: true, incidente });
});

// ===== SERVIDOR =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor corriendo en puerto", PORT);
});