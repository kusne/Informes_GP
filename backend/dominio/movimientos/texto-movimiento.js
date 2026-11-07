// Fachada pura de lectura: cada tipo posee una salida documental completamente independiente.
import { construirInformeRELEVO } from "./relevo/informe.js";
import { construirInformeACOPLE } from "./acople/informe.js";
import { construirInformeRETIRO } from "./retiro/informe.js";
const INFORMES=Object.freeze({RELEVO:construirInformeRELEVO,ACOPLE:construirInformeACOPLE,RETIRO:construirInformeRETIRO});
export function textoMovimiento(m,operativo,hora){
 const crear=INFORMES[m?.modo];
 if(!crear)throw Error("Tipo de movimiento no soportado.");
 return crear(m,operativo,hora);
}
