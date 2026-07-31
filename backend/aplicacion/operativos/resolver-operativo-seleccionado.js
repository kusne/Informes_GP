export function resolverOperativoSeleccionadoPorKey(operativos, operativoKey) {
  if (!Array.isArray(operativos) || !operativoKey) return null;

  return operativos.find((op) => {
    return String(op?.operativo_key || "") === String(operativoKey);
  }) || null;
}

export function operativoTieneKeyValida(operativo) {
  return Boolean(String(operativo?.operativo_key || "").trim());
}
