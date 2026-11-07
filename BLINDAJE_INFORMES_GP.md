# Blindaje contractual de Informes GP

Regla: no modificar el formato, frontend, validación, procesamiento, persistencia ni numerales de ningún informe salvo pedido expreso del propietario.

## Arquitectura
Los siete informes especiales tienen frontend exclusivo y backend separado por modelo en backend/dominio/informes/modelos. Las fachadas públicas anteriores conservan sus firmas. Inicio, finalizado, relevo, acople y retiro conservan sus implementaciones existentes, protegidas por contrato; presencia activa comparte el flujo de inicio/finalizado. Los repositorios Supabase, procesos comunes y API son infraestructura compartida y exigen autorización global para modificar su comportamiento.

## Actualizar un informe
1. Identificar únicamente el informe pedido.
2. Declarar en el cuerpo del pull request: INFORMES_AUTORIZADOS: <slug> (o TODOS, sólo si el propietario autorizó cambios transversales).
3. Agregar pruebas específicas de formato, datos y persistencia.
4. Actualizar sólo las huellas correspondientes al módulo cambiado en protecciones/contratos-informes.json, explicando cada cambio. Nunca regenerar todo el manifiesto para una corrección puntual.
5. Ejecutar npm run check:todo y revisar todos los tests de GitHub antes de fusionar.
6. Configurar en GitHub la protección de main, exigir revisión y que el job regression sea obligatorio.

Los hashes impiden cambios accidentales, no sustituyen los permisos GitHub ni impiden que un usuario con escritura altere el manifiesto. Los módulos genéricos siguen requiriendo pruebas de compatibilidad. No se alteran tablas ni datos de producción.

