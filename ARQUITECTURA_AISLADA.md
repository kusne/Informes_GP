# Arquitectura aislada de Informes_GP

## Regla de dependencias

```text
frontend/  ->  api/  ->  backend/
```

- `frontend/`: HTML, CSS, DOM, formularios, navegación y eventos visuales.
- `api/`: frontera pública y adaptadores del navegador. Es el único lugar por el que el frontend accede a lógica, estado o persistencia.
- `backend/aplicacion/`: estado, coordinación, casos de uso y procesamiento de formularios.
- `backend/dominio/`: validaciones, normalización, reglas y generación de datos/textos.
- `backend/infraestructura/`: Supabase, persistencia, Realtime y ensayo.

## Reglas obligatorias

1. `frontend/` no importa archivos de `backend/`.
2. `frontend/` no crea clientes Supabase ni conoce URL/tablas/repositorios de infraestructura.
3. `backend/` no importa `frontend/` ni `api/`.
4. `backend/` no usa `window`, `document`, `localStorage`, `sessionStorage`, `navigator` ni `CustomEvent`.
5. Configuración dependiente del navegador, eventos UI y almacenamiento local se adaptan únicamente en `api/`.
6. Los builders del frontend solo leen formularios; normalización, validación, generación de texto y payload de persistencia se ejecutan en casos de uso de `backend/aplicacion/procesamiento/`.
7. El shell público (`index.html`) no carga backend ni conoce directamente la URL de Supabase.
8. El Service Worker no precachea módulos internos de backend; JS/HTML se obtienen con `no-store`.

## Frontera pública

- `api/app-api.js`: estado, casos de uso y servicios de aplicación/dominio consumidos por la UI.
- `api/persistencia-api.js`: persistencia, Supabase, Realtime y adaptación de ensayo para el navegador.

## Controles automáticos

```powershell
npm run check:arquitectura
npm run check:modulos
npm run check:todo
```

`check:arquitectura` falla ante una dependencia prohibida o un acceso directo del frontend a Supabase.
`check:modulos` enlaza todos los módulos frontend/API y detecta imports, rutas o exports inválidos.

## Importante sobre GitHub Pages

Este aislamiento es **arquitectónico/lógico**: permite modificar la interfaz sin que el backend dependa de ella y obliga a pasar por una API estable.

GitHub Pages es hosting estático. Por esa razón los módulos JavaScript de `api/` y `backend/` siguen descargándose al navegador y no constituyen un servidor privado. Si se necesitara aislamiento **físico/de despliegue** (backend ejecutándose fuera del navegador y no descargable por el cliente), habría que desplegar un servidor/API independiente y hacer que GitHub Pages consuma esa API HTTP.
