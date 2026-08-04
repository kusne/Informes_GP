# Reestructuración Frontend / Backend

## Objetivo aplicado

Separar la presentación de la lógica funcional para que los cambios de HTML y CSS no obliguen a modificar validaciones, constructores de texto, mapeos ni repositorios.

## Resultado

- `frontend/` contiene la interfaz, componentes, controladores del DOM, rutas visuales y servicios de navegador.
- `backend/` contiene estado, operativos, reglas, validaciones, textos, numerales, persistencia Supabase y servidor.
- Se agregó `npm run check:arquitectura` para impedir dependencias desde backend hacia frontend.
- Se corrigieron todas las rutas después de la migración.
- Se agregó el resolver de rutas que el contenedor ya intentaba cargar y que faltaba en la base recibida.
- Se mantuvo el comportamiento actual de los parches de Control de Móviles y Pantalla Principal dentro de `frontend/compatibilidad/`.

## Elementos retirados de la aplicación activa

- Carpeta `.git` incluida accidentalmente dentro del ZIP.
- Respaldos `_backup_*`.
- Copias duplicadas y placeholders de Control de Móviles.
- Archivo raíz `flujo-informes-modelos.js`, que no era cargado por `index.html` ni importado por los módulos activos.
- Carpetas antiguas numeradas en la raíz.

## Regla para los próximos cambios

### Cambios visuales

Trabajar en:

- `frontend/pantallas/`
- `frontend/app/app.css`
- `frontend/assets/`

### Cambios funcionales

Trabajar en:

- `backend/dominio/`
- `backend/aplicacion/`
- `backend/infraestructura/supabase/`

No agregar validaciones, conteos, normalizaciones ni consultas Supabase dentro de archivos HTML/CSS o componentes visuales.

## Corrección de lectura de operativos y desplegables — 31/07/2026

- Corregida la diferencia de ID entre el HTML y el controlador del selector contextual. El desplegable ahora recibe las opciones que ya estaban contabilizadas.
- La lectura operativa apunta al circuito de Supabase actualmente utilizado por WSP:
  - `operativos_publicados` para operativos pendientes de INICIA.
  - `operativos_estado` para operativos EN CURSO de FINALIZA.
  - `operativos_eventos` para excluir FINALIZADOS al construir pendientes.
- Las filas del esquema actual se traducen dentro del backend al contrato interno de `Informes_GP`; el frontend no conoce columnas ni consultas de Supabase.
- Se eliminó el fallback automático que mostraba 5 INICIA y 2 FINALIZA de demostración. Los datos demo solo se habilitan de forma explícita con `?demo=1`.
- Realtime quedó vinculado a `operativos_publicados` y `operativos_estado` para refrescar los selectores.

## Modo de ensayo funcional

- Se agregó `?ensayo=1` para cargar operativos locales representativos.
- El modo ensayo se resuelve en backend y no consulta Realtime.
- En ensayo no se escribe en Supabase ni se suben fotos.
- La URL normal conserva exclusivamente el circuito real.


## Corrección modo ensayo y arranque predeterminado

- INICIA queda seleccionado al abrir la aplicación.
- El contador y el selector de operativos se cargan sin interacción previa.
- Los formularios INICIA/FINALIZA usan elementos `<form>` reales.
- Los builders toleran componentes antiguos que todavía no sean `<form>`.
- Se elimina el error `Failed to construct FormData`.

## Pantalla INICIA continua — referencia visual WSP

- INICIA ahora se muestra desde el arranque, aun sin un operativo seleccionado.
- El contador de operativos se carga por defecto y el título visual es `OPERATIVOS`.
- Se retiró el formulario dinámico por tipo para INICIA.
- Elegir un operativo vincula su horario, lugar y tipo al mismo formulario continuo.
- La pantalla quedó separada en componentes de frontend:
  - personal policial;
  - movilidad;
  - elementos;
  - observaciones;
  - fotos del inicio.
- El catálogo de personal, móviles, motos y elementos se encuentra en el backend de dominio.
- El informe de inicio conserva validación, mapeo Supabase, fotografías y salida WhatsApp.
- El modo ensayo continúa sin guardar ni modificar datos de Supabase.

## 2026-08-01 — FINALIZA: contador y selector sincronizados con operativos iniciados

- FINALIZA toma exclusivamente operativos en estado EN_CURSO / INICIADO / ACTIVO o con evento de inicio vigente.
- Se excluyen explícitamente registros FINALIZADO / CERRADO y los que ya tienen finalizado_evento_id.
- El mismo arreglo filtrado alimenta simultáneamente el contador y el desplegable, evitando diferencias entre el numeral mostrado y las opciones seleccionables.
- El modo ensayo conserva 6 operativos EN_CURSO para validar el flujo de FINALIZA sin tocar Supabase.

## 2026-08-01 — Modo ensayo con ciclo real pendiente → iniciado → finalizado

- Se eliminaron los seis operativos FINALIZA prefabricados del ensayo.
- El ensayo arranca con seis operativos PROGRAMADOS y cero EN_CURSO.
- Un envío válido de INICIA mueve únicamente ese operativo a EN_CURSO.
- FINALIZA cuenta y lista exclusivamente los operativos iniciados realmente durante el ensayo.
- Un envío válido de FINALIZA mueve ese operativo a FINALIZADO y deja de ofrecerlo para finalizar.
- El estado de ensayo se conserva en `localStorage` y nunca se escribe en Supabase.
- Si cambia la guardia operativa, el estado de ensayo se reinicia para no arrastrar pruebas de otra guardia.

## FINALIZA continuo según interfaz de referencia
- FINALIZA deja de abrir formularios separados por tipo y usa una única pantalla continua.
- Al seleccionar un operativo iniciado, `Mismo personal`, `Mismo móvil/es` y `Mismos Elementos` aparecen tildados por defecto.
- Con esos checks activos, Personal, Movilidad y Elementos permanecen ocultos y se reutilizan los datos del INICIA del mismo operativo.
- Al destildar cualquiera de los tres, se muestra únicamente el bloque correspondiente para carga manual.
- Se incorporan Resultados, Medidas Cautelares, Detalles, Observaciones, `Ver items` y cuatro fotos del finalizado.
- Las validaciones no reinician el formulario ni borran selecciones.
- Se mantiene la separación estricta: interfaz en `frontend`, reglas y normalización en `backend`.

## 2026-08-01 — Regla Presencia Activa / Puente Carretero

- INICIA: Elementos queda oculto por defecto y se habilita con `Agregar Elementos`.
- Sin `Agregar Elementos`, el bloque Elementos se imprime completo con `/`.
- FINALIZA: Resultados/Detalles quedan ocultos por defecto y se habilitan con `Agregar Controlados`.
- Sin `Agregar Controlados`, o con todos los controlados en cero, no se imprime el bloque Resultados/Detalles.
- La regla se limita a operativos detectados como Presencia Activa + Puente Carretero.
- FINALIZA permite reutilizar un INICIA sin elementos para este tipo específico.
