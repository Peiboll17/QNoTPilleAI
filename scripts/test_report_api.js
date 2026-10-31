// Prueba del informe comparativo: DOCX y PDF válidos y con contenido razonable.
const BASE = "http://localhost:3000";

const items = [
  {
    name: "Primer ensayo",
    lang: "es",
    beforeScore: 78,
    beforeLevel: "Probablemente generado por IA",
    afterScore: 76,
    afterLevel: "Probablemente generado por IA",
    mode: "rules",
    changes: 3,
    warnings: [],
    originalExcerpt:
      "En la actualidad, la inteligencia artificial ha transformado profundamente la manera en que las organizaciones gestionan la información. Además, es importante destacar que los procesos automatizados permiten optimizar recursos de forma significativa.",
    humanizedExcerpt:
      "Hoy, la inteligencia artificial ha cambiado a fondo cómo las organizaciones gestionan la información. Conviene decir que los procesos automatizados permiten optimizar recursos de forma notable.",
  },
  {
    name: "Capítulo 3: análisis",
    lang: "fr",
    beforeScore: 76,
    beforeLevel: "Probablemente generado por IA (texto en francés)",
    afterScore: 70,
    afterLevel: "Probablemente generado por IA (texto en francés)",
    mode: "mixed",
    changes: 14,
    warnings: ["1 fragmento(s) se han procesado solo con las reglas de limpieza."],
    originalExcerpt:
      "De nos jours, l'intelligence artificielle a transformé la gestion de l'information dans les organisations. En outre, il est important de noter que les processus automatisés permettent d'optimiser les ressources.",
    humanizedExcerpt:
      "Ces derniers temps, l'intelligence artificielle a transformé la gestion de l'information dans les organisations. En outre, à noter que les processus automatisés permettent d'optimiser les ressources.",
  },
];

async function main() {
  for (const format of ["docx", "pdf"]) {
    const res = await fetch(`${BASE}/api/export-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        options: "intensidad media · tono neutro · reescritura con IA desactivada · limpieza activada",
        items,
      }),
    });
    if (!res.ok) throw new Error(`${format}: HTTP ${res.status} → ${(await res.text()).slice(0, 200)}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const isDocx = buf[0] === 0x50 && buf[1] === 0x4b; // firma PK (zip)
    const isPdf = buf.slice(0, 4).toString() === "%PDF";
    const valid = format === "docx" ? isDocx : isPdf;
    console.log(`${format}: ${buf.length} bytes · firma ${valid ? "válida" : "INVÁLIDA"}`);
    if (!valid || buf.length < 2000) throw new Error(`El ${format} generado no es válido`);
  }
  // comprobación de validación: items vacíos → 400
  const bad = await fetch(`${BASE}/api/export-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format: "docx", items: [] }),
  });
  console.log("items vacíos →", bad.status, bad.status === 400 ? "OK (rechazado)" : "FALLO");
  if (bad.status !== 400) throw new Error("La validación de items vacíos no funciona");
  console.log("TODO OK");
}

main().catch((e) => {
  console.error("FALLO:", e.message);
  process.exit(1);
});
