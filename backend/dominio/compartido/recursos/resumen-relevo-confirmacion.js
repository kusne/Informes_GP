import { calcularMovimientoRecursos } from "./movimientos-recursos.js";

const lista = valores => (Array.isArray(valores) && valores.length ? valores.join(", ") : "Ninguno");

export function prepararConfirmacionMovimiento({modo,actual={},seleccion={}}={}) {
  const movimiento=calcularMovimientoRecursos({modo,actual,seleccion});
  const retira=movimiento.retirados;
  const queda=movimiento.vigente;
  const entra=movimiento.incorporados;
  const lineas=[
    "RESUMEN DEL "+movimiento.modo+" — Revisá antes de confirmar:",
    "",
    "PERSONAL QUE SE RETIRA: "+lista(retira.personal),
    "PERSONAL QUE QUEDA AL FINAL: "+lista(queda.personal),
    "PERSONAL QUE INGRESA: "+lista(entra.personal),
    "",
    "MÓVILES QUE SE RETIRAN: "+lista([...(retira.moviles||[]),...(retira.motos||[])]),
    "MÓVILES QUE QUEDAN: "+lista([...(queda.moviles||[]),...(queda.motos||[])])
  ];
  const noHayBajasConCambio=movimiento.modo==="RELEVO"
    && actual.personal?.length>0
    && retira.personal.length===0
    && (entra.personal.length>0
      || retira.moviles.length>0 || retira.motos.length>0);
  if(noHayBajasConCambio)lineas.push(
    "",
    "ATENCIÓN: NO se retira ningún policía. Todos los efectivos anteriores SEGUIRÁN figurando en el FINALIZADO.",
    "Si alguno se fue, cancelá y destildalo en el RELEVO."
  );
  lineas.push("","¿Confirmás que esta es la dotación vigente?");
  return {movimiento,advertenciaSinBajas:noHayBajasConCambio,texto:lineas.join("\n")};
}
