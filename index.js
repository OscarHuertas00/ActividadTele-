const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

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

  // Regla 1: presión baja + 1 reporte baja_presion
  if (valor !== null && valor < 150 && reportesBaja.length >= 1) {
    estado = "ABIERTO";
  }

  // Regla 2: 2 o más reportes
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
app.post("/api/v1/telemetria", (req, res) => {
  const data = req.body;

  // Guardar telemetría
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

  console.log("📡 Telemetría recibida:", data);
  console.log("🚨 Incidente generado:", incidente);

  res.json({
    ok: true,
    incidente
  });
});

// ===== ENDPOINT REPORTE =====
app.post("/api/v1/reporte", (req, res) => {
  const data = req.body;

  // ===== VALIDACIONES =====
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

  // Guardar reporte
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

  console.log("📢 Reporte recibido:", data);
  console.log("🚨 Incidente generado:", incidente);

  res.json({
    ok: true,
    incidente
  });
});

// ===== SERVIDOR =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor corriendo en puerto", PORT);
});