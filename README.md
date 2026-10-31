QnoTPillenAI

Humaniza Textos | Elimina Rastro de IA | Análisis Documental

Licencia: MITNext.js

QnoTPillenAI es una aplicación web que transforma contenido generado por inteligencia artificial en prosa natural e indetectable, estima si un texto parece escrito por IA y permite exportar los resultados como documentos con metadatos limpios.
Características

    Humanización de textos: reescritura con tres niveles de intensidad (ligera, media y profunda) y ocho tonos (neutro, profesional, académico, cercano, divulgativo, marketing, técnico y jurídico).
    Detección de rastro de IA: análisis heurístico con desglose por señales (frases hechas, conectores formulaicos, variabilidad del ritmo, uniformidad estructural, marcas de voz humana, puntuación...) y capa opcional de análisis semántico con un modelo de lenguaje.
    Multiidioma: español, inglés, francés, italiano, portugués y alemán, con detección automática o selección manual del idioma del texto.
    Tres modos de entrada: subida de archivos (PDF, DOC, DOCX, TXT y MD), texto pegado directamente y procesado por lotes (hasta 12 elementos mezclando archivos y texto).
    Exportación: DOCX, PDF y TXT con metadatos limpios, descarga del lote en ZIP e informe comparativo (antes/después por elemento).
    Privacidad: los textos se procesan en memoria y no se almacenan.

Cómo funciona

El flujo tiene tres pasos: primero añades tu texto (archivo o pegado), después lo analizas para ver la probabilidad estimada de que parezca generado por IA, y por último lo humanizas y comparas el resultado antes y después, con opción de descarga.

Las operaciones largas se ejecutan como trabajos en segundo plano con sondeo (patrón job + polling), de modo que la interfaz muestra el progreso en tiempo real sin bloquear el navegador ni agotar tiempos de espera del servidor.
Requisitos

    Node.js 20 o superior (o Bun 1.3+)
    npm, pnpm o bun como gestor de paquetes

Puesta en marcha

# 1. Instalar dependenciasbun install        # o npm install# 2. Arrancar en desarrollobun run dev        # o npm run dev# 3. Build de producciónbun run buildbun run start

La aplicación queda disponible en http://localhost:3000.
Despliegue en Vercel

    Importa este repositorio desde el panel de Vercel (Add New → Project → Import).
    No se necesita configuración adicional: el build y los límites de ejecución (maxDuration) ya están preparados.
    Pulsa Deploy.

Modo IA opcional

Por defecto, la reescritura con modelo de lenguaje y el análisis semántico operan en modo degradado (solo reglas heurísticas) y la interfaz lo indica con un aviso. Para activar el modo IA completo, define estas variables de entorno en tu despliegue:
Variable	Descripción
ZAI_API_KEY	Clave de API de un servicio compatible
ZAI_BASE_URL	URL base del servicio (p. ej. https://api.ejemplo.com/v1)

En plataformas serverless como Vercel, define también HOME=/tmp para que la aplicación pueda escribir el archivo de configuración del SDK. Sin estas variables, la aplicación sigue siendo totalmente funcional con la humanización basada en reglas.
Estructura del proyecto

src/  app/            # Interfaz (Next.js App Router) y rutas API    api/          # humanize, humanize-batch, detect, extract, export...  components/     # Componentes de interfaz (shadcn/ui)  lib/            # Lógica: detector, humanizador, trabajos, exportadoresscripts/          # Utilidades y scripts de prueba

Aviso de uso responsable

El análisis de detección es una estimación que combina heurísticas de estilo (ritmo, muletillas, estructura) y, si se activa, un análisis semántico con un modelo de lenguaje. No equivale al veredicto de ningún detector comercial: los detectores discrepan entre sí y producen falsos positivos. Usa esta herramienta para mejorar la naturalidad de tus textos y respeta siempre las normas de tu centro, empresa o plataforma.
Licencia

Distribuido bajo la Licencia MIT.

Importante al pegar el README: pégalo en modo edición de código (botón Code del editor de GitHub, no Preview), para que no se pierdan los bloques de código. En cuanto guardes ambos, GitHub mostrará el badge MIT en la sección About y el README renderizado en la portada del repo.
