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
