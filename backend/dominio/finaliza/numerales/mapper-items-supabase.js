export function mapearNumeralesParaSupabase({ finalizado, items = [] }) {
  if (!finalizado || !Array.isArray(items)) return [];

  return items.map((item) => ({
    operativo_key: finalizado.operativo_key || null,
    guardia_fecha: finalizado.guardia_fecha || null,
    tipo_evento: "FINALIZADO",
    codigo: item.codigo || null,
    descripcion: item.descripcion || item.detalle || "",
    categoria: item.categoria || "OTROS",
    cantidad: Number(item.cantidad || 0),
    detalle: item.detalle || "",
    origen: item.origenes?.join(" | ") || item.origen || ""
  }));
}
