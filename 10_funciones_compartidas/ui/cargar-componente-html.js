export async function cargarComponenteHtml(ruta) {
  const res = await fetch(ruta, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`No se pudo cargar componente HTML: ${ruta}`);
  }

  return await res.text();
}
