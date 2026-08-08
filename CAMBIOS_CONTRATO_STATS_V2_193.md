# Informes_GP 0.1.3 — contrato BMZCN V2 para STATS

Correcciones del 08/08/2026:

- INICIO y FINALIZADO conservan `tipo_nombre` exacto del operativo publicado.
- Conservan `ordenes_origen` de `bmzcn_operativos_programados_v2`.
- Los textos generados anexan las órdenes oficiales al título del operativo.
- El INICIO guarda un `inicio_snapshot` dentro de `datos` para permitir reversión exacta desde STATS.
- El FINALIZADO conserva resultados, graduaciones, documentos QRZ, dominios, Assal y Control de Armas en `datos`.
- Al finalizar un estado antiguo, se vuelve a enriquecer con la programación V2 para recuperar tipo exacto y órdenes.
- No se agregan tablas puente ni polling.
