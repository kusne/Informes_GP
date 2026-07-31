# Informes_GP

Aplicación WSP para generar informes operativos que luego ingresan a BMZCN.

## Ejecución

```powershell
npm start
```

Abrir `http://localhost:5174`.

## Separación obligatoria

- `frontend/`: HTML, CSS, componentes visuales, controladores de pantalla y adaptadores del DOM.
- `backend/`: reglas, validaciones, formateadores, estado, operativos, persistencia Supabase y servidor.
- El backend no importa archivos del frontend.
- Los cambios visuales deben realizarse dentro de `frontend/` sin modificar reglas de `backend/`.

La carpeta `frontend/compatibilidad/` conserva de forma aislada los parches activos recibidos. No contiene reglas nuevas y se retirará cuando sus funciones hayan sido absorbidas por los módulos definitivos.
