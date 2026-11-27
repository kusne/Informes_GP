import { supabase, TABLAS_SUPABASE } from "./supabase-client.js";
import { obtenerEstadoOperativoV2, listarEstadosOperativosV2 } from "./operativos-estado-v2-repo.js";
import { dotacionVigenteOperativo } from "./movimientos-recursos-repo.js";
import { planificarTransferencias, validarAltasSinDuplicar } from "../../dominio/compartido/recursos/transferencias-unificadas.js";
import { construirInformeMovimientoUnificado } from "../../dominio/movimientos/unificado/informe.js";
import { modoEnsayoActivo } from "../ensayo/modo-ensayo.js";
export async function listarOperativosMovimiento(){
 const filas=await listarEstadosOperativosV2();
 return filas.filter(x=>["EN_CURSO","EN_PROCEDIMIENTO"].includes(x.estado));
}
export async function guardarMovimientoUnificado({principal,secundario,altas,bajas,intervinientes,transferencias}={}){
 if(modoEnsayoActivo())throw Error("No se permite guardar movimientos en modo ensayo.");
 if(!supabase)throw Error("Sin conexión a Supabase.");
 const cargar=async ref=>{
  if(!ref?.operativo_key||!ref.guardia_fecha||!ref.updated_at)throw Error("Falta identidad o versión del operativo.");
  const row=await obtenerEstadoOperativoV2(ref);
  if(!row||row.estado!=="EN_CURSO"||row.updated_at!==ref.updated_at)throw Error("La dotación cambió. Volvé a abrir el formulario.");
  return row;
 };
 const a=await cargar(principal),b=secundario?await cargar(secundario):null;
 if(b&&a.id===b.id)throw Error("Elegí dos operativos diferentes.");
 const plan=planificarTransferencias({actual:dotacionVigenteOperativo(a),otro:b?dotacionVigenteOperativo(b):null,altas,bajas,intervinientes,transferencias});
 const pares=[[a,plan.principal],...(plan.secundario?[[b,plan.secundario]]:[])];
 const activos=await listarOperativosMovimiento();
 const afectados=new Set(pares.map(([r])=>r.id));
 validarAltasSinDuplicar(pares.map(([,m])=>m),activos.filter(r=>!afectados.has(r.id)).map(dotacionVigenteOperativo));
 const fecha=new Date().toISOString(),hora=new Intl.DateTimeFormat("es-AR",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(fecha));
 const id=globalThis.crypto.randomUUID();
 const payload=pares.map(([r,m],i)=>{
  const relacionado=pares.length>1?pares[1-i][0]:null;
  const evento={...m,movimiento_id:id,fecha_evento:fecha,operativo_relacionado:relacionado?{operativo_key:relacionado.operativo_key,guardia_fecha:relacionado.guardia_fecha}:null};
  evento.texto=construirInformeMovimientoUnificado(evento,r,hora);
  return {id:r.id,expected_updated_at:r.updated_at,movimiento:evento};
 });
 if(payload.length===1){
  const r=a,e=payload[0].movimiento,datos={...(r.datos||{})};
  datos.recursos_vigentes=e.vigente;
  datos.movimientos_recursos=[...(Array.isArray(datos.movimientos_recursos)?datos.movimientos_recursos:[]),e];
  const {data,error}=await supabase.from(TABLAS_SUPABASE.operativosEstado).update({datos,updated_at:fecha}).eq("id",r.id).eq("estado","EN_CURSO").eq("updated_at",r.updated_at).select("id").maybeSingle();
  if(error)throw error;
  if(!data)throw Error("La dotación cambió antes de guardar. No se registró el movimiento.");
 }else{
  const {data,error}=await supabase.rpc("bmzcn_guardar_transferencia_recursos_v1",{p_movimientos:payload});
  if(error)throw Error("No se pudo registrar la transferencia conjunta: "+error.message);
  if(data!==2)throw Error("No se confirmó el guardado conjunto.");
 }
 return {texto:payload.map(p=>p.movimiento.texto).join("\n\n────────────\n\n"),movimientos:payload.map(p=>p.movimiento)};
}
