// Exclusión pura de recursos del propio operativo. Solo ACOPLE; no altera
// las opciones de RELEVO ni RETIRO, ni modifica el padrón de la guardia.
import { presentarPersonalOperativo } from "./catalogo-recursos-operativos.js";

const lista = valores => (Array.isArray(valores) ? valores : [])
 .map(valor => String(valor ?? "").trim()).filter(Boolean);
const clave = valor => String(valor ?? "").trim().normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "").replace(/\./g, "")
 .replace(/\s+/g, " ").toUpperCase();
const clavePersonal = valor => clave(presentarPersonalOperativo(valor).valor);
const sinVigentes = (candidatos, vigentes, normalizar = clave) => {
 const ocupados = new Set(lista(vigentes).map(normalizar));
 return [...new Map(lista(candidatos).filter(v => !ocupados.has(normalizar(v)))
  .map(v => [normalizar(v), v])).values()];
};

export function filtrarCatalogoRecursosAcople(catalogo = {}, vigentes = {}) {
 const elementos = (catalogo.elementos || []).map(grupo => ({
  ...grupo,
  items: sinVigentes(grupo.items, vigentes.elementos?.[grupo.clave])
 }));
 // Los móviles no deben ofrecerse como motos, ni viceversa, cuando ya están
 // incorporados al operativo: son la misma unidad física.
 const movilidadVigente = [...lista(vigentes.moviles), ...lista(vigentes.motos)];
 return {
  ...catalogo,
  personal: sinVigentes(catalogo.personal, vigentes.personal, clavePersonal),
  moviles: sinVigentes(catalogo.moviles, movilidadVigente),
  motos: sinVigentes(catalogo.motos, movilidadVigente),
  elementos
 };
}
