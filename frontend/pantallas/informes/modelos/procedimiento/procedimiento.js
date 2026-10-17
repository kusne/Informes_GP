export async function iniciarModeloInformeUI({ form } = {}) {
  if (!form) return;
  const identificador=form.querySelector('[name="procedimiento_id"]');
  if(identificador && !identificador.value) identificador.value=
    typeof crypto!=='undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'p-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  const fecha=form.querySelector('[name="fecha_hecho"]');
  const hora=form.querySelector('[name="hora_hecho"]');
  // Fecha/hora del HECHO y no del inicio del operativo seleccionado.
  const ahora=new Date();
  if(fecha)fecha.value=`${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;
  if(hora)hora.value=`${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
}
