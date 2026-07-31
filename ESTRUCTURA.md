# Arquitectura de Informes_GP

```text
Informes_GP/
├── frontend/
│   ├── app/
│   ├── assets/
│   ├── configuracion/tipos-operativo/
│   ├── pantallas/
│   │   ├── pantalla-principal/
│   │   ├── inicia/
│   │   ├── finaliza/
│   │   ├── informes/
│   │   └── control-moviles/
│   ├── servicios/
│   │   ├── ui/
│   │   ├── fotos/
│   │   └── whatsapp/
│   └── compatibilidad/
├── backend/
│   ├── aplicacion/
│   │   ├── estado/
│   │   └── operativos/
│   ├── dominio/
│   │   ├── inicia/
│   │   ├── finaliza/
│   │   ├── informes/
│   │   ├── whatsapp/
│   │   └── compartido/
│   ├── infraestructura/supabase/
│   └── servidor/
├── index.html
├── package.json
└── README.md
```

## Regla de dependencia

```text
frontend  ─────► backend
backend   ──X──► frontend
```

### Dónde cambiar la visual

Modificar únicamente HTML/CSS y componentes dentro de `frontend/pantallas/`. Los constructores de texto, validaciones, mapeos y repositorios permanecen en `backend/`.

### Dónde cambiar el funcionamiento

- Reglas de INICIA: `backend/dominio/inicia/`
- Reglas de FINALIZA: `backend/dominio/finaliza/`
- Numerales: `backend/dominio/finaliza/numerales/`
- Informes especiales: `backend/dominio/informes/`
- Operativos: `backend/aplicacion/operativos/`
- Supabase: `backend/infraestructura/supabase/`
