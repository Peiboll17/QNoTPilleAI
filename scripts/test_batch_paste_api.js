// Prueba del lote con nombres de texto pegado (sin extensión de archivo):
// verifica que humanize-batch acepta etiquetas arbitrarias y que export-batch
// genera el ZIP con los nombres derivados de esas etiquetas.
const BASE = "http://localhost:3000";

const t1 = `En la actualidad, la inteligencia artificial ha transformado profundamente la manera en que las organizaciones gestionan la información. Además, es importante destacar que los procesos automatizados permiten optimizar recursos de forma significativa. No solo se trata de reducir costes, sino también de mejorar la calidad del servicio ofrecido a los usuarios finales.`;

const t2 = `It is important to note that machine learning models have revolutionized data analysis. Furthermore, these systems play a crucial role in modern businesses. In conclusion, organizations must adapt to this new technological landscape in order to remain competitive in today's fast-paced digital world.`;

async function main() {
  // 1) iniciar el lote (reglas puras, sin IA, para que sea rápido)
  const post = await fetch(`${BASE}/api/humanize-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: [
        { name: "Texto 1", text: t1 },
        { name: "Capítulo 3: análisis", text: t2 },
      ],
      intensity: "medium",
      tone: "neutral",
      useLLM: false,
      useRules: true,
    }),
  });
  const start = await post.json();
  if (!post.ok) throw new Error("POST falló: " + JSON.stringify(start));
  console.log("POST OK →", { id: start.id, filesTotal: start.filesTotal, omitted: start.omitted });

  // 2) sondear
  let state;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(`${BASE}/api/humanize-batch?id=${encodeURIComponent(start.id)}`);
    state = await res.json();
    if (state.status !== "processing") break;
  }
  if (state.status !== "done") throw new Error("Lote no completado: " + JSON.stringify(state).slice(0, 300));
  console.log("LOTE OK, resultados:", state.results.map((r) => ({ name: r.name, lang: r.lang, antes: r.before.score, despues: r.after.score, modo: r.mode })));
  const nombres = state.results.map((r) => r.name);
  if (!nombres.includes("Texto 1") || !nombres.includes("Capítulo 3: análisis")) {
    throw new Error("Los nombres de los textos pegados no se conservaron: " + nombres.join(", "));
  }

  // 3) exportar ZIP con esas etiquetas
  const zipRes = await fetch(`${BASE}/api/export-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: state.results.map((r) => ({ name: r.name, text: r.text, format: "docx" })),
    }),
  });
  if (!zipRes.ok) throw new Error("export-batch falló: " + (await zipRes.text()).slice(0, 200));
  const buf = Buffer.from(await zipRes.arrayBuffer());
  console.log("ZIP OK:", buf.length, "bytes");
  // comprobar que es un ZIP válido (firma PK)
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error("El archivo no es un ZIP válido");
  console.log("TODO OK");
}

main().catch((e) => {
  console.error("FALLO:", e.message);
  process.exit(1);
});
