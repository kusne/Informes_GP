export function construirTransicionProcedimiento(estado, payload, informe){
  const anterior=estado?.datos||{};
  const previos=Array.isArray(anterior.procedimientos_eventos)
    ? anterior.procedimientos_eventos:[];
  const evento={informe_key:payload.informe_key,informe_id:informe.id,
    fecha_evento:payload.fecha_evento,hecho:String(payload.datos?.hecho||""),
    texto:payload.texto_salida,lugar:payload.lugar};
  const repetido=previos.some(e=>e.informe_key===payload.informe_key);
  const eventos=repetido
    ? previos.map(e=>e.informe_key===payload.informe_key?evento:e)
    : [...previos,evento];
  return {
    estado:"EN_PROCEDIMIENTO",tipo_evento:"PROCEDIMIENTO",
    datos:{...anterior,procedimientos_eventos:eventos},
    updated_at:new Date().toISOString()
  };
}

