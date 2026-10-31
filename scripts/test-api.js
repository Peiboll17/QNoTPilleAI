/**
 * Prueba end-to-end de la API:
 * 1. Genera un DOCX de prueba con texto típico de IA
 * 2. /api/extract  -> extrae el texto
 * 3. /api/detect   -> analiza
 * 4. /api/humanize -> reescribe
 * 5. /api/export   -> genera docx/pdf/txt
 */
const { Document, Packer, Paragraph, TextRun } = require("docx");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "tmp-test");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const AI_TEXT = `En el mundo actual, la inteligencia artificial juega un papel crucial en la transformación de la sociedad. Es importante destacar que estas tecnologías han demostrado ser herramientas fundamentales para el desarrollo económico y social.

En primer lugar, cabe señalar que la automatización de procesos permite a las empresas optimizar sus recursos de manera significativa. Asimismo, el análisis de grandes volúmenes de datos facilita la toma de decisiones estratégicas. Por otro lado, no obstante, existen desafíos éticos que no pueden ser ignorados.

En el panorama actual de la educación, las plataformas digitales desempeñan un papel fundamental en la democratización del conocimiento. Es fundamental destacar que los estudiantes pueden acceder a una amplia gama de recursos educativos sin importar su ubicación geográfica. Sin duda alguna, esto representa un avance notable hacia la equidad educativa.

Además, es relevante mencionar que el aprendizaje personalizado, impulsado por algoritmos adaptativos, ha demostrado ser una herramienta eficaz para mejorar el rendimiento académico. No solo se adapta al ritmo de cada estudiante, sino también a sus estilos de aprendizaje preferidos.

En conclusión, la inteligencia artificial ofrece infinitas posibilidades para transformar nuestra sociedad. Es importante tener en cuenta que el futuro es prometedor, siempre que se aborden de manera responsable los retos éticos y sociales que surgen en este sentido. La clave está en encontrar un equilibrio entre la innovación tecnológica y la preservación de los valores humanos fundamentales.`;

async function main() {
  // 1. Generar DOCX de prueba
  const doc = new Document({
    creator: "TestBot",
    title: "Prueba IA",
    sections: [
      {
        children: AI_TEXT.split(/\n\n/).map(
          (p) => new Paragraph({ children: [new TextRun({ text: p, size: 24 })], spacing: { after: 200 } })
        ),
      },
    ],
  });
  const buf = await Packer.toBuffer(doc);
  const docxPath = path.join(OUT, "prueba-ia.docx");
  fs.writeFileSync(docxPath, buf);
  console.log("[1] DOCX de prueba creado:", docxPath, buf.length, "bytes");

  // 2. Extraer
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "prueba-ia.docx");
  let res = await fetch(`${BASE}/api/extract`, { method: "POST", body: fd });
  const extracted = await res.json();
  if (!res.ok) throw new Error("extract: " + JSON.stringify(extracted));
  console.log("[2] extract OK — palabras:", extracted.meta.words, "| chars:", extracted.meta.chars);

  // 3. Detectar
  res = await fetch(`${BASE}/api/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: extracted.text }),
  });
  const detection = await res.json();
  if (!res.ok) throw new Error("detect: " + JSON.stringify(detection));
  console.log(`[3] detect OK — puntuación IA: ${detection.score}% (${detection.level})`);
  console.log("    indicadores:", detection.indicators.map((i) => `${i.label}=${i.score}`).join(" | "));
  console.log("    frases hechas top:", detection.clichesFound.slice(0, 5).map((c) => `${c.phrase}×${c.count}`).join(", "));

  // 4. Humanizar (LLM + reglas)
  console.log("[4] humanizando (esto puede tardar)…");
  const t0 = Date.now();
  res = await fetch(`${BASE}/api/humanize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: extracted.text, intensity: "medium", tone: "neutral", useLLM: true, useRules: true }),
  });
  const humanized = await res.json();
  if (!res.ok) throw new Error("humanize: " + JSON.stringify(humanized));
  console.log(`[4] humanize OK en ${((Date.now() - t0) / 1000).toFixed(1)}s — modo: ${humanized.mode}, cambios: ${humanized.changes}`);
  console.log(`    puntuación después: ${humanized.after.score}% (${humanized.after.level})`);
  console.log("    avisos:", humanized.warnings.length ? humanized.warnings.join(" || ") : "(ninguno)");
  fs.writeFileSync(path.join(OUT, "humanizado.txt"), humanized.text, "utf8");
  console.log("    muestra:", humanized.text.slice(0, 220).replace(/\n/g, " ⏎ "));

  // 5. Exportar en los 3 formatos
  for (const fmt of ["docx", "pdf", "txt"]) {
    const r = await fetch(`${BASE}/api/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: humanized.text, format: fmt, fileName: "prueba-ia" }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(`export ${fmt}: ${JSON.stringify(err)}`);
    }
    const blob = Buffer.from(await r.arrayBuffer());
    const p = path.join(OUT, `salida.${fmt}`);
    fs.writeFileSync(p, blob);
    console.log(`[5] export ${fmt} OK — ${blob.length} bytes -> ${p}`);
  }

  console.log("\n✅ TODAS LAS PRUEBAS PASARON");
}

main().catch((e) => {
  console.error("❌ ERROR:", e.message);
  process.exit(1);
});
