import { permiteElementosVaciosFinaliza } from "../compartido/tipos/operativos-elementos-controlados-opcionales.js";

export function validarFinalizadoBase(finalizado) {
  const errores = [];

  if (!finalizado?.operativo_key) errores.push("Debe seleccionar un operativo iniciado.");
  if (!finalizado?.guardia_fecha) errores.push("No se pudo resolver la guardia_fecha.");
  if (!finalizado?.lugar) errores.push("El operativo seleccionado no tiene lugar.");
  if (!finalizado?.hora_inicio || !finalizado?.hora_fin) errores.push("El operativo seleccionado no tiene horario completo.");

  const f = finalizado?.formulario || {};

  const numericos = [
    "actas", "personas", "vehiculos", "test_alometro", "test_alcoholimetro",
    "positiva_sancionable", "positiva_no_sancionable", "requisas", "qrz", "dominio", "remision", "retencion",
    "prohibicion_circulacion", "cesion_conduccion"
  ];

  for (const campo of numericos) {
    const valor = Number(f[campo] || 0);
    if (!Number.isFinite(valor) || valor < 0) errores.push(`El campo ${campo} debe ser un número válido.`);
  }

  if (!texto(f.personal)) {
    errores.push(f.mismo_personal
      ? "El INICIA guardado no tiene personal policial. Destilde “Mismo personal” y seleccione el personal del FINALIZADO."
      : "Debe seleccionar el personal policial del FINALIZADO o tildar “Mismo personal”.");
  }

  if (!texto(f.moviles_motos)) {
    errores.push(f.mismo_moviles
      ? "El INICIA guardado no tiene móvil ni moto. Destilde “Mismo móvil/es” y seleccione la movilidad del FINALIZADO."
      : "Debe seleccionar móvil o moto del FINALIZADO o tildar “Mismo móvil/es”.");
  }

  const elementosVaciosPermitidos = permiteElementosVaciosFinaliza(finalizado?.operativo || {}, finalizado?.tipo_operativo);
  if (!elementosVaciosPermitidos && f.mismos_elementos && !texto(f.elementos)) {
    errores.push("El INICIA guardado no tiene elementos. Destilde “Mismos Elementos” para cargarlos manualmente.");
  }

  if (numero(f.actas) > 0 && numero(f.vehiculos) <= 0) {
    errores.push('Si "Actas Labradas" es mayor a cero, "Vehículos Fiscalizados" debe ser mayor a cero.');
  }

  if (numero(f.actas) > 0 && numero(f.personas) <= 0) {
    errores.push('Si "Actas Labradas" es mayor a cero, "Personas Identificadas" debe ser mayor a cero.');
  }

  const totalAlcohol = numero(f.test_alcoholimetro);
  const san = numero(f.positiva_sancionable);
  const noSan = numero(f.positiva_no_sancionable);
  if (san + noSan > totalAlcohol) errores.push("La suma de positivas sancionables y no sancionables no puede superar los Test de Alcoholímetro.");
  validarGraduaciones(errores, "Positiva Sancionable", san, f.graduaciones_sancionable);
  validarGraduaciones(errores, "Positiva no Sancionable", noSan, f.graduaciones_no_sancionable);
  validarListaCantidad(errores, "Qrz", numero(f.qrz), f.qrz_documentos);
  validarListaCantidad(errores, "Dominio", numero(f.dominio), f.dominio_items);

  return errores;
}

function texto(valor) { return String(valor || "").trim(); }
function numero(valor) { const n = Number(valor || 0); return Number.isFinite(n) ? n : 0; }

function validarGraduaciones(errores, etiqueta, cantidad, valores) {
  const lista = array(valores);
  if (cantidad <= 0) return;
  if (lista.length !== cantidad || lista.some((v) => !v)) { errores.push(`Complete todas las graduaciones de ${etiqueta}.`); return; }
  if (lista.some((v) => !/^\d+[.,]\d{2}$/.test(v))) errores.push(`Las graduaciones de ${etiqueta} deben tener formato 0,85 o 0.85.`);
}
function validarListaCantidad(errores, etiqueta, cantidad, valores) {
  const lista = array(valores);
  if (cantidad > 0 && (lista.length !== cantidad || lista.some((v) => !v))) errores.push(`Complete los ${cantidad} datos de ${etiqueta}.`);
}
function array(valor) {
  if (Array.isArray(valor)) return valor.map((v) => String(v || "").trim());
  try { const p = JSON.parse(String(valor || "[]")); return Array.isArray(p) ? p.map((v) => String(v || "").trim()) : []; } catch { return []; }
}
